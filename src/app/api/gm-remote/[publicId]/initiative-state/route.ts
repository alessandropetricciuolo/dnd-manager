import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { gmRemoteRateLimit } from "@/lib/gm-remote/rate-limit";
import { isRecord } from "@/lib/gm-remote/protocol";
import { validateGmRemoteSession } from "@/lib/gm-remote/validate-remote-session";
import { parseInitiativeRemoteSnapshot } from "@/lib/gm-remote/initiative-commands";

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
    return NextResponse.json({ ok: false, error: "invalid_token" }, { status: 401 });
  }

  if (!gmRemoteRateLimit(`init:${publicId}`, 60, 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const v = await validateGmRemoteSession(publicId, token);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("gm_remote_sessions")
    .select("initiative_snapshot, focused_match_id, campaign_id")
    .eq("public_id", publicId)
    .maybeSingle();

  if (error) {
    console.warn("[gm-remote] initiative_state", error.code);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }

  const sess = data as {
    initiative_snapshot?: unknown;
    focused_match_id?: string | null;
    campaign_id?: string;
  } | null;

  const focusedMatchId = sess?.focused_match_id?.trim() || null;
  if (focusedMatchId && sess?.campaign_id) {
    const { data: matchRow } = await admin
      .from("torneo_matches")
      .select("initiative_snapshot")
      .eq("id", focusedMatchId)
      .eq("campaign_id", sess.campaign_id)
      .maybeSingle();

    const { parseTorneoInitiativeSnapshot } = await import("@/lib/torneo/initiative-snapshot");
    const { toInitiativeRemoteSnapshot } = await import("@/lib/gm-remote/initiative-commands");
    const { loadTorneoSetupAdmin } = await import("@/lib/torneo/load-setup-admin");
    const { computeMatchDamageTotals } = await import("@/lib/torneo/compute-match-damage");

    const state = parseTorneoInitiativeSnapshot(
      (matchRow as { initiative_snapshot?: unknown } | null)?.initiative_snapshot ?? null
    );
    if (state) {
      const setup = await loadTorneoSetupAdmin(admin, sess.campaign_id);
      const match = setup?.matches.find((m) => m.id === focusedMatchId) ?? null;
      const snapshot = toInitiativeRemoteSnapshot(
        state,
        match
          ? (() => {
              const totals = computeMatchDamageTotals(state.entries, match);
              return {
                teamA: {
                  id: match.team_a_id ?? "",
                  name: match.team_a.name,
                  color: match.team_a.color,
                  damageTotal: totals.teamA,
                },
                teamB: {
                  id: match.team_b_id ?? "",
                  name: match.team_b.name,
                  color: match.team_b.color,
                  damageTotal: totals.teamB,
                },
              };
            })()
          : undefined,
        focusedMatchId
      );
      return NextResponse.json({ ok: true, snapshot });
    }
  }

  const snapshot = parseInitiativeRemoteSnapshot(sess?.initiative_snapshot ?? null);

  return NextResponse.json({ ok: true, snapshot });
}
