import type { Torneo2Match, Torneo2Team } from "@/lib/torneo2/types";

/** Squadre che hanno vinto almeno un incontro di tipo squadra completato. */
export function winningTeamIds(matches: Torneo2Match[]): string[] {
  const out: string[] = [];
  for (const m of matches) {
    if (m.kind !== "team") continue;
    if (m.status !== "completed") continue;
    if (!m.winnerTeamId) continue;
    if (!out.includes(m.winnerTeamId)) out.push(m.winnerTeamId);
  }
  return out;
}

/**
 * Id dei PG che accedono alla finale free-for-all: tutti i membri delle squadre
 * vincitrici degli incontri di fase 1.
 */
export function finalistCharacterIds(matches: Torneo2Match[], teams: Torneo2Team[]): string[] {
  const winners = new Set(winningTeamIds(matches));
  const out: string[] = [];
  for (const team of teams) {
    if (!winners.has(team.id)) continue;
    for (const member of team.members) {
      if (!out.includes(member.characterId)) out.push(member.characterId);
    }
  }
  return out;
}

/** Riepilogo classifica per squadra: vittorie, sconfitte, danni inflitti/subiti. */
export type Torneo2TeamStanding = {
  teamId: string;
  teamName: string;
  teamColor: string;
  wins: number;
  losses: number;
  played: number;
};

export function computeTeamStandings(matches: Torneo2Match[], teams: Torneo2Team[]): Torneo2TeamStanding[] {
  const byId = new Map<string, Torneo2TeamStanding>();
  for (const t of teams) {
    byId.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      teamColor: t.color,
      wins: 0,
      losses: 0,
      played: 0,
    });
  }

  for (const m of matches) {
    if (m.kind !== "team" || m.status !== "completed") continue;
    if (!m.teamAId || !m.teamBId || !m.winnerTeamId) continue;
    const a = byId.get(m.teamAId);
    const b = byId.get(m.teamBId);
    if (a) a.played += 1;
    if (b) b.played += 1;
    const winner = byId.get(m.winnerTeamId);
    const loserId = m.winnerTeamId === m.teamAId ? m.teamBId : m.teamAId;
    const loser = byId.get(loserId);
    if (winner) winner.wins += 1;
    if (loser) loser.losses += 1;
  }

  return [...byId.values()].sort((x, y) => {
    if (y.wins !== x.wins) return y.wins - x.wins;
    if (x.losses !== y.losses) return x.losses - y.losses;
    return x.teamName.localeCompare(y.teamName);
  });
}
