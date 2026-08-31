import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";
import { canTorneo2RemoteMutateMatch } from "@/lib/torneo2/remote-access";

type RouteContext = { params: Promise<{ publicId: string }> };

const ALLOWED_KEYS = new Set([
  "timer_running",
  "timer_started_at",
  "timer_paused_elapsed_ms",
  "timer_label",
]);

export async function POST(request: Request, context: RouteContext) {
  const { publicId } = await context.params;
  if (!publicId?.trim()) {
    return NextResponse.json({ ok: false, error: "invalid_session" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const token = isRecord(body) && typeof body.token === "string" ? body.token.trim() : "";
  const matchId = isRecord(body) && typeof body.match_id === "string" ? body.match_id.trim() : "";
  const patchRaw = isRecord(body) && isRecord(body.patch) ? body.patch : null;
  if (token.length < 16 || !matchId || !patchRaw) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  if (!gmRemoteRateLimit(`t2-timer:${publicId}`, 120, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const v = await validateGmRemoteSession(publicId, token);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 401 });
  }

  const patch: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(patchRaw)) {
    if (ALLOWED_KEYS.has(k)) patch[k] = val;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "empty_patch" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient() as unknown as SupabaseClient;
  const { data: live, error: liveError } = await admin
    .from("torneo2_live_sessions")
    .select("station1_match_id, station2_match_id")
    .eq("campaign_id", v.session.campaign_id)
    .eq("status", "live")
    .maybeSingle();

  if (liveError) {
    return NextResponse.json({ ok: false, error: liveError.message }, { status: 500 });
  }

  const { data: match, error: matchError } = await admin
    .from("torneo2_matches")
    .select("id, status")
    .eq("id", matchId)
    .eq("campaign_id", v.session.campaign_id)
    .maybeSingle();

  if (matchError) {
    return NextResponse.json({ ok: false, error: matchError.message }, { status: 500 });
  }
  if (!match) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (!canTorneo2RemoteMutateMatch(live, match)) {
    return NextResponse.json({ ok: false, error: "match_not_on_station" }, { status: 403 });
  }

  const { data: updated, error } = await admin
    .from("torneo2_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("campaign_id", v.session.campaign_id)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ ok: false, error: "match_not_active" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
