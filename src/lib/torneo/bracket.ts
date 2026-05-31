import type { TorneoTeamWithMembers } from "@/lib/torneo/types";

/** 1=quarti, 2=semifinali, 3=finale, 4=triello */
export const BRACKET_ROUND = {
  QUARTER: 1,
  SEMI: 2,
  FINAL: 3,
  TRIO: 4,
} as const;

export type BracketSeedSlot = {
  round: number;
  slot: number;
  label: string;
  matchKind: "bracket" | "triello";
  teamAId: string | null;
  teamBId: string | null;
  advancesToMatchIndex: number | null;
  advancesToSlot: "a" | "b" | null;
};

/** Coppie quarti: 1v8, 4v5, 2v7, 3v6 (indici su array squadre ordinate). */
const QF_PAIRINGS: Array<[number, number]> = [
  [0, 7],
  [3, 4],
  [1, 6],
  [2, 5],
];

/** Indici squadre che possono qualificarsi alla semifinale `semiIndex` dai quarti collegati. */
export function semiFeederTeamIndices(semiIndex: number): number[] {
  if (semiIndex === 0) return [0, 7, 3, 4];
  return [1, 6, 2, 5];
}

/** Dopo l'avanzamento di un vincitore, garantisce team_a_id ≠ team_b_id (tranne triello). */
export function resolveBracketSlotAfterAdvance(
  currentTeamA: string,
  currentTeamB: string,
  slot: "a" | "b",
  winnerTeamId: string,
  matchKind: "bracket" | "triello",
  distinctFallbackTeamId: string
): { teamAId: string; teamBId: string } {
  let teamAId = currentTeamA;
  let teamBId = currentTeamB;
  if (slot === "a") teamAId = winnerTeamId;
  else teamBId = winnerTeamId;

  if (matchKind !== "triello" && teamAId === teamBId) {
    if (slot === "a") teamBId = distinctFallbackTeamId;
    else teamAId = distinctFallbackTeamId;
  }

  return { teamAId, teamBId };
}

function pickPlaceholderPair(
  ordered: TorneoTeamWithMembers[],
  excludeIndices: number[]
): [string, string] {
  const exclude = new Set(excludeIndices);
  const candidates = ordered.filter((_, idx) => !exclude.has(idx));
  if (candidates.length >= 2) {
    return [candidates[0]!.id, candidates[1]!.id];
  }
  return [ordered[0]!.id, ordered[1]!.id];
}

/**
 * Genera 7 incontri bracket + 1 triello (shell senza squadre fino all'avanzamento per SF/F/Triello).
 * `teams` deve avere esattamente 8 elementi (sort_order).
 */
export function buildEightTeamBracketPlan(teams: TorneoTeamWithMembers[]): BracketSeedSlot[] {
  if (teams.length !== 8) {
    throw new Error("Il tabellone richiede esattamente 8 squadre.");
  }
  const ordered = [...teams].sort((a, b) => a.sort_order - b.sort_order);

  const plan: BracketSeedSlot[] = [];

  for (let i = 0; i < 4; i += 1) {
    const [ai, bi] = QF_PAIRINGS[i]!;
    plan.push({
      round: BRACKET_ROUND.QUARTER,
      slot: i,
      label: `Quarto ${i + 1}`,
      matchKind: "bracket",
      teamAId: ordered[ai]!.id,
      teamBId: ordered[bi]!.id,
      advancesToMatchIndex: 4 + Math.floor(i / 2),
      advancesToSlot: i % 2 === 0 ? "a" : "b",
    });
  }

  for (let i = 0; i < 2; i += 1) {
    const [phA, phB] = pickPlaceholderPair(ordered, semiFeederTeamIndices(i));
    plan.push({
      round: BRACKET_ROUND.SEMI,
      slot: i,
      label: `Semifinale ${i + 1}`,
      matchKind: "bracket",
      teamAId: phA,
      teamBId: phB,
      advancesToMatchIndex: 6,
      advancesToSlot: i === 0 ? "a" : "b",
    });
  }

  const [finalPhA, finalPhB] = pickPlaceholderPair(ordered, []);
  plan.push({
    round: BRACKET_ROUND.FINAL,
    slot: 0,
    label: "Finale",
    matchKind: "bracket",
    teamAId: finalPhA,
    teamBId: finalPhB,
    advancesToMatchIndex: 7,
    advancesToSlot: "a",
  });

  plan.push({
    round: BRACKET_ROUND.TRIO,
    slot: 0,
    label: "Triello · campione squadra",
    matchKind: "triello",
    teamAId: ordered[0]!.id,
    teamBId: ordered[0]!.id,
    advancesToMatchIndex: null,
    advancesToSlot: null,
  });

  return plan;
}

export function roundLabel(round: number | null): string {
  switch (round) {
    case BRACKET_ROUND.QUARTER:
      return "Quarti";
    case BRACKET_ROUND.SEMI:
      return "Semifinali";
    case BRACKET_ROUND.FINAL:
      return "Finale";
    case BRACKET_ROUND.TRIO:
      return "Triello";
    default:
      return "Incontro";
  }
}
