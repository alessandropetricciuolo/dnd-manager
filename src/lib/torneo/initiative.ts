import {
  sanitizeInitiativeTrackerState,
  type InitiativeEntry,
  type InitiativeTrackerState,
} from "@/components/gm/initiative-tracker";
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
      damageTaken: 0,
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
    };
  });
}

function appendSquadMembers(
  entries: InitiativeEntry[],
  squad: TorneoTeamWithMembers,
  stamp: number
): void {
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
      damageTaken: 0,
      teamId: squad.id,
      teamName: squad.name,
      teamColor: squad.color,
    });
  }
}

/** PG delle squadre già definite nell'incontro (ignora slot ancora placeholder). */
export function buildInitiativeEntriesForMatch(
  match: TorneoMatchWithTeams,
  teams: TorneoTeamWithMembers[]
): InitiativeEntry[] {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const entries: InitiativeEntry[] = [];
  const stamp = Date.now();

  const sides = [
    { teamId: match.team_a_id, isPlaceholder: match.team_a.isPlaceholder },
    { teamId: match.team_b_id, isPlaceholder: match.team_b.isPlaceholder },
  ] as const;

  for (const side of sides) {
    if (!side.teamId || side.isPlaceholder) continue;
    const squad = teamMap.get(side.teamId);
    if (!squad) continue;
    appendSquadMembers(entries, squad, stamp);
  }

  return entries;
}

/** Stato initiative iniziale per un incontro (tutti i PG delle squadre coinvolte). */
export function buildMatchInitiativeState(
  match: TorneoMatchWithTeams,
  teams: TorneoTeamWithMembers[]
): InitiativeTrackerState {
  let entries: InitiativeEntry[] = [];

  if (match.match_kind === "triello") {
    const squad = match.team_a_id && !match.team_a.isPlaceholder
      ? teams.find((t) => t.id === match.team_a_id)
      : null;
    if (squad) entries = buildInitiativeEntriesForTriello(squad);
  } else {
    entries = buildInitiativeEntriesForMatch(match, teams);
  }

  return sanitizeInitiativeTrackerState({ entries });
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
