import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";
import { sanitizeTorneo2CombatState } from "@/lib/torneo2/combat-state";
import { loadTorneo2RemoteLiveSession, torneo2StationForMatch } from "@/lib/torneo2/remote-session";

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
  if (token.length < 16) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  if (!gmRemoteRateLimit(`t2-state:${publicId}`, 120, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const v = await validateGmRemoteSession(publicId, token);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 401 });
  }

  const admin = createSupabaseAdminClient() as unknown as SupabaseClient;

  const { live, error: liveError } = await loadTorneo2RemoteLiveSession(
    admin,
    v.session.campaign_id,
    publicId
  );

  if (liveError) {
    return NextResponse.json({ ok: false, error: liveError }, { status: 500 });
  }
  if (!live) {
    return NextResponse.json({ ok: true, matches: [] });
  }

  const stationByMatch = new Map<string, number>();
  for (const matchId of [live.station1_match_id, live.station2_match_id]) {
    if (!matchId) continue;
    const station = torneo2StationForMatch(live, matchId);
    if (station) stationByMatch.set(matchId, station);
  }
  const matchIds = [...stationByMatch.keys()];
  if (matchIds.length === 0) {
    return NextResponse.json({ ok: true, matches: [] });
  }

  const { data: rows } = await admin
    .from("torneo2_matches")
    .select(
      "id, label, kind, status, team_a_id, team_b_id, combat_state, combat_seq, timer_mode, turn_seconds, match_seconds, timer_running, timer_started_at, timer_paused_elapsed_ms, timer_label"
    )
    .in("id", matchIds);

  const { data: teams } = await admin
    .from("torneo2_teams")
    .select("id, name")
    .eq("campaign_id", v.session.campaign_id);
  const teamName = new Map((teams ?? []).map((t) => [t.id, t.name]));

  const matches = (rows ?? []).map((r) => ({
    matchId: r.id as string,
    station: stationByMatch.get(r.id as string) ?? null,
    label:
      (r.label as string | null) ??
      (r.kind === "final_ffa"
        ? "Finale"
        : `${teamName.get(r.team_a_id as string) ?? "?"} vs ${teamName.get(r.team_b_id as string) ?? "?"}`),
    status: r.status as string,
    seq: Number(r.combat_seq ?? 0) || 0,
    combat: r.combat_state != null ? sanitizeTorneo2CombatState(r.combat_state) : sanitizeTorneo2CombatState(null),
    timer: {
      timer_mode: r.timer_mode,
      turn_seconds: r.turn_seconds,
      match_seconds: r.match_seconds,
      timer_running: r.timer_running,
      timer_started_at: r.timer_started_at,
      timer_paused_elapsed_ms: Number(r.timer_paused_elapsed_ms ?? 0) || 0,
      timer_label: r.timer_label,
    },
  }));

  return NextResponse.json({ ok: true, matches });
}
