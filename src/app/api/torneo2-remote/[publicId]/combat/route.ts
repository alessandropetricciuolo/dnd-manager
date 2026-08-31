import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";
import { sanitizeTorneo2CombatState } from "@/lib/torneo2/combat-state";
import { getTorneo2LiveStationForMatch } from "@/lib/torneo2/live-stations";

type RouteContext = { params: Promise<{ publicId: string }> };

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
  const origin = isRecord(body) && typeof body.origin === "string" ? body.origin.trim() : "remote";
  const rawState = isRecord(body) ? body.state : null;
  if (token.length < 16 || !matchId || rawState == null) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  if (!gmRemoteRateLimit(`t2-combat:${publicId}`, 240, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const v = await validateGmRemoteSession(publicId, token);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 401 });
  }

  const admin = createSupabaseAdminClient() as unknown as SupabaseClient;
  const { data: live, error: liveErr } = await admin
    .from("torneo2_live_sessions")
    .select("station1_match_id, station2_match_id")
    .eq("campaign_id", v.session.campaign_id)
    .eq("status", "live")
    .maybeSingle();
  if (liveErr) {
    return NextResponse.json({ ok: false, error: liveErr.message }, { status: 500 });
  }
  if (!getTorneo2LiveStationForMatch(live, matchId)) {
    return NextResponse.json({ ok: false, error: "match_not_live" }, { status: 404 });
  }

  const { data: current } = await admin
    .from("torneo2_matches")
    .select("combat_seq")
    .eq("id", matchId)
    .eq("campaign_id", v.session.campaign_id)
    .maybeSingle();

  if (!current) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const nextSeq = (Number(current.combat_seq ?? 0) || 0) + 1;
  const clean = sanitizeTorneo2CombatState(rawState);
  const updatedAt = new Date().toISOString();

  const { error } = await admin
    .from("torneo2_matches")
    .update({
      combat_state: clean as unknown as Record<string, unknown>,
      combat_seq: nextSeq,
      combat_origin: origin,
      combat_updated_at: updatedAt,
    })
    .eq("id", matchId)
    .eq("campaign_id", v.session.campaign_id);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, seq: nextSeq });
}
