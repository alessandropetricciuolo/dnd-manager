import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";
import { computeMatchDamageTotals, type MatchDamageTotals } from "@/lib/torneo/compute-match-damage";
import type { TorneoMatchWithTeams } from "@/lib/torneo/types";

type CompletionDamageInput = {
  teamADamageTotal: number;
  teamBDamageTotal: number;
};

function normalizeDamage(value: number): number {
  return Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
}

export function resolveTorneoCompletionDamageTotals(
  payload: CompletionDamageInput,
  match: Pick<TorneoMatchWithTeams, "team_a_id" | "team_b_id">,
  initiativeSnapshot: InitiativeTrackerState | null | undefined
): MatchDamageTotals {
  const fromPayload = {
    teamA: normalizeDamage(payload.teamADamageTotal),
    teamB: normalizeDamage(payload.teamBDamageTotal),
  };

  if (fromPayload.teamA > 0 || fromPayload.teamB > 0 || !initiativeSnapshot?.entries.length) {
    return fromPayload;
  }

  const fromSnapshot = computeMatchDamageTotals(initiativeSnapshot.entries, match);
  if (fromSnapshot.teamA > 0 || fromSnapshot.teamB > 0) {
    return fromSnapshot;
  }

  return fromPayload;
}
