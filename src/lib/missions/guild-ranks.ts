/** Ordine crescente per ordinamento (D basso → S alto). */
export const GUILD_RANK_LETTERS = ["D", "C", "B", "A", "S"] as const;

export type GuildRankLetter = (typeof GUILD_RANK_LETTERS)[number];

export function parseGuildRank(value: string): GuildRankLetter {
  const u = value.trim().toUpperCase();
  if (GUILD_RANK_LETTERS.includes(u as GuildRankLetter)) return u as GuildRankLetter;
  return "D";
}

/** Ordine numerico per sort (S più alto). */
export function guildRankOrder(rank: string): number {
  const idx = GUILD_RANK_LETTERS.indexOf(parseGuildRank(rank));
  return idx === -1 ? 0 : idx;
}

/**
 * Soglie punti → rango (modificabile qui per la campagna globale).
 * Il GM può impostare rango/punti a mano; con auto_rank i completamenti applicano solo punti + questo ricalcolo.
 */
export function rankFromPoints(points: number): GuildRankLetter {
  const p = Math.max(0, Math.trunc(points));
  if (p >= 800) return "S";
  if (p >= 500) return "A";
  if (p >= 250) return "B";
  if (p >= 50) return "C";
  return "D";
}
