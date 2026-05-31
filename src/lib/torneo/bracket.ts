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
  teamAPlaceholder: string | null;
  teamBPlaceholder: string | null;
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

/** Dopo l'avanzamento di un vincitore, aggiorna lo slot e rimuove il placeholder corrispondente. */
export function resolveBracketSlotAfterAdvance(
  currentTeamA: string | null,
  currentTeamB: string | null,
  currentPlaceholderA: string | null,
  currentPlaceholderB: string | null,
  slot: "a" | "b",
  winnerTeamId: string
): {
  teamAId: string | null;
  teamBId: string | null;
  teamAPlaceholder: string | null;
  teamBPlaceholder: string | null;
} {
  let teamAId = currentTeamA;
  let teamBId = currentTeamB;
  let teamAPlaceholder = currentPlaceholderA;
  let teamBPlaceholder = currentPlaceholderB;

  if (slot === "a") {
    teamAId = winnerTeamId;
    teamAPlaceholder = null;
  } else {
    teamBId = winnerTeamId;
    teamBPlaceholder = null;
  }

  return { teamAId, teamBId, teamAPlaceholder, teamBPlaceholder };
}

/**
 * Genera 7 incontri bracket + 1 triello.
 * Solo i quarti hanno squadre reali; i turni successivi usano placeholder testuali
 * finché i vincitori non avanzano.
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
      teamAPlaceholder: null,
      teamBPlaceholder: null,
      advancesToMatchIndex: 4 + Math.floor(i / 2),
      advancesToSlot: i % 2 === 0 ? "a" : "b",
    });
  }

  plan.push({
    round: BRACKET_ROUND.SEMI,
    slot: 0,
    label: "Semifinale 1",
    matchKind: "bracket",
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: "Vincitore quarto 1",
    teamBPlaceholder: "Vincitore quarto 2",
    advancesToMatchIndex: 6,
    advancesToSlot: "a",
  });

  plan.push({
    round: BRACKET_ROUND.SEMI,
    slot: 1,
    label: "Semifinale 2",
    matchKind: "bracket",
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: "Vincitore quarto 3",
    teamBPlaceholder: "Vincitore quarto 4",
    advancesToMatchIndex: 6,
    advancesToSlot: "b",
  });

  plan.push({
    round: BRACKET_ROUND.FINAL,
    slot: 0,
    label: "Finale",
    matchKind: "bracket",
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: "Vincitore semifinale 1",
    teamBPlaceholder: "Vincitore semifinale 2",
    advancesToMatchIndex: 7,
    advancesToSlot: "a",
  });

  plan.push({
    round: BRACKET_ROUND.TRIO,
    slot: 0,
    label: "Triello · campione squadra",
    matchKind: "triello",
    teamAId: null,
    teamBId: null,
    teamAPlaceholder: "Squadra campione",
    teamBPlaceholder: "Squadra campione",
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
