import type { InitiativeEntry } from "@/components/gm/initiative-tracker";
import type { TorneoMatchWithTeams, TorneoTeamWithMembers } from "@/lib/torneo/types";

export type TorneoCharacterTeamInfo = {
  teamId: string;
  teamName: string;
  teamColor: string;
};

export function buildCharacterTeamMap(teams: TorneoTeamWithMembers[]): Record<string, TorneoCharacterTeamInfo> {
  const map: Record<string, TorneoCharacterTeamInfo> = {};
  for (const team of teams) {
    for (const m of team.members) {
      map[m.character_id] = {
        teamId: team.id,
        teamName: team.name,
        teamColor: team.color,
      };
    }
  }
  return map;
}

export function applyTeamToEntry(
  entry: InitiativeEntry,
  teamMap: Record<string, TorneoCharacterTeamInfo>
): InitiativeEntry {
  if (!entry.playerId) return entry;
  const t = teamMap[entry.playerId];
  if (!t) return { ...entry, teamId: undefined, teamName: undefined, teamColor: undefined };
  return { ...entry, teamId: t.teamId, teamName: t.teamName, teamColor: t.teamColor };
}

/** Triello: tutti i PG della squadra vincitrice (FFA). */
export function buildInitiativeEntriesForTriello(team: TorneoTeamWithMembers): InitiativeEntry[] {
  const stamp = Date.now();
  return team.members.map((m) => {
    const hp = Math.max(0, m.hit_points ?? 0);
    return {
      id: `init-${stamp}-${m.character_id}`,
      name: m.name,
      type: "pc" as const,
      characterClass: m.character_class,
      armorClass: Math.max(0, m.armor_class ?? 0),
      hp,
      maxHp: hp,
      initiative: 0,
      playerId: m.character_id,
      damageDealt: 0,
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
    };
  });
}

export function buildInitiativeEntriesForMatch(
  match: TorneoMatchWithTeams,
  teams: TorneoTeamWithMembers[]
): InitiativeEntry[] {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const squadA = teamMap.get(match.team_a_id);
  const squadB = teamMap.get(match.team_b_id);
  if (!squadA || !squadB) return [];

  const entries: InitiativeEntry[] = [];
  const stamp = Date.now();

  for (const squad of [squadA, squadB]) {
    for (const m of squad.members) {
      const hp = Math.max(0, m.hit_points ?? 0);
      entries.push({
        id: `init-${stamp}-${m.character_id}`,
        name: m.name,
        type: "pc",
        characterClass: m.character_class,
        armorClass: Math.max(0, m.armor_class ?? 0),
        hp,
        maxHp: hp,
        initiative: 0,
        playerId: m.character_id,
        damageDealt: 0,
        teamId: squad.id,
        teamName: squad.name,
        teamColor: squad.color,
      });
    }
  }

  return entries;
}

export function sumDamageByTeam(
  entries: InitiativeEntry[],
  teamId: string
): number {
  return entries
    .filter((e) => e.teamId === teamId)
    .reduce((sum, e) => sum + (e.damageDealt ?? 0), 0);
}

export function torneoInitiativeStorageKey(campaignId: string, matchId: string): string {
  return `gm-screen-initiative-${campaignId}-match-${matchId}`;
}

export const TORNEO_ACTIVE_MATCH_KEY_PREFIX = "torneo-active-match-";

export function torneoActiveMatchStorageKey(campaignId: string): string {
  return `${TORNEO_ACTIVE_MATCH_KEY_PREFIX}${campaignId}`;
}
