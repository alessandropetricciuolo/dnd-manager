import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";
import { parseTorneoInitiativeSnapshot } from "@/lib/torneo/initiative-snapshot";
import { toInitiativeRemoteSnapshot } from "@/lib/gm-remote/initiative-commands";
import { computeMatchDamageTotals } from "@/lib/torneo/compute-match-damage";
import { loadTorneoSetupAdmin } from "@/lib/torneo/load-setup-admin";

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
  if (token.length < 16 || !matchId) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  if (!gmRemoteRateLimit(`match-state:${publicId}`, 90, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const v = await validateGmRemoteSession(publicId, token);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: row, error } = await admin
    .from("torneo_matches")
    .select(
      "id, initiative_snapshot, timer_round_label, timer_duration_sec, timer_started_at, timer_paused_at, team_a_id, team_b_id, match_kind"
    )
    .eq("id", matchId)
    .eq("campaign_id", v.session.campaign_id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const matchRow = row as {
    initiative_snapshot: unknown;
    timer_round_label: string | null;
    timer_duration_sec: number | null;
    timer_started_at: string | null;
    timer_paused_at: string | null;
  };

  const setup = await loadTorneoSetupAdmin(admin, v.session.campaign_id);
  const match = setup?.matches.find((m) => m.id === matchId) ?? null;

  const state = parseTorneoInitiativeSnapshot(matchRow.initiative_snapshot);
  let snapshot = state
    ? toInitiativeRemoteSnapshot(
        state,
        match
          ? (() => {
              const totals = computeMatchDamageTotals(state.entries, match);
              return {
                teamA: {
                  id: match.team_a_id,
                  name: match.team_a.name,
                  color: match.team_a.color,
                  damageTotal: totals.teamA,
                },
                teamB: {
                  id: match.team_b_id,
                  name: match.team_b.name,
                  color: match.team_b.color,
                  damageTotal: totals.teamB,
                },
              };
            })()
          : undefined,
        matchId
      )
    : null;

  return NextResponse.json({
    ok: true,
    snapshot,
    timer: {
      timer_round_label: matchRow.timer_round_label,
      timer_duration_sec: matchRow.timer_duration_sec,
      timer_started_at: matchRow.timer_started_at,
      timer_paused_at: matchRow.timer_paused_at,
    },
  });
}
