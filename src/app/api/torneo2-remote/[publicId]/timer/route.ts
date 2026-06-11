import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";
import { requireTorneo2RemoteStationMatch } from "@/lib/torneo2/remote-session";

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
  const stationCheck = await requireTorneo2RemoteStationMatch(
    admin,
    v.session.campaign_id,
    publicId,
    matchId
  );
  if (!stationCheck.ok) {
    return NextResponse.json(
      { ok: false, error: stationCheck.error },
      { status: stationCheck.status }
    );
  }

  const { error } = await admin
    .from("torneo2_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("campaign_id", v.session.campaign_id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
