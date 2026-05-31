import type { InitiativeEntry } from "@/components/gm/initiative-tracker";
import { sumDamageByTeam } from "@/lib/torneo/initiative";
import type { TorneoMatchWithTeams } from "@/lib/torneo/types";

export type MatchDamageTotals = {
  teamA: number;
  teamB: number;
};

export function computeMatchDamageTotals(
  entries: InitiativeEntry[],
  match: Pick<TorneoMatchWithTeams, "team_a_id" | "team_b_id">
): MatchDamageTotals {
  return {
    teamA: match.team_a_id ? sumDamageByTeam(entries, match.team_a_id) : 0,
    teamB: match.team_b_id ? sumDamageByTeam(entries, match.team_b_id) : 0,
  };
}
