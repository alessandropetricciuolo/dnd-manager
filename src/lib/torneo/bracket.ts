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

export type BracketReadinessMatch = {
  id: string;
  team_a_id: string;
  team_b_id: string;
  match_kind: "bracket" | "triello";
  bracket_round: number | null;
  advances_to_match_id: string | null;
  advances_to_slot: "a" | "b" | null;
  winner_team_id: string | null;
  status: string;
};

/** Coppie quarti: 1v8, 4v5, 2v7, 3v6 (indici su array squadre ordinate). */
const QF_PAIRINGS: Array<[number, number]> = [
  [0, 7],
  [3, 4],
  [1, 6],
  [2, 5],
];

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
    plan.push({
      round: BRACKET_ROUND.SEMI,
      slot: i,
      label: `Semifinale ${i + 1}`,
      matchKind: "bracket",
      teamAId: ordered[0]!.id,
      teamBId: ordered[1]!.id,
      advancesToMatchIndex: 6,
      advancesToSlot: i === 0 ? "a" : "b",
    });
  }

  plan.push({
    round: BRACKET_ROUND.FINAL,
    slot: 0,
    label: "Finale",
    matchKind: "bracket",
    teamAId: ordered[0]!.id,
    teamBId: ordered[1]!.id,
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

function expectedUpstreamCount(match: BracketReadinessMatch): number {
  if (match.match_kind === "triello") return 1;
  switch (match.bracket_round) {
    case BRACKET_ROUND.SEMI:
    case BRACKET_ROUND.FINAL:
      return 2;
    default:
      return 0;
  }
}

export function getBracketMatchReadiness(
  match: BracketReadinessMatch,
  matches: BracketReadinessMatch[]
): { ready: true } | { ready: false; reason: string } {
  const expected = expectedUpstreamCount(match);
  if (expected === 0) return { ready: true };

  const upstream = matches.filter((m) => m.advances_to_match_id === match.id);
  if (upstream.length < expected) {
    return { ready: false, reason: "Completa prima gli incontri precedenti del tabellone." };
  }

  for (const source of upstream) {
    if (source.status !== "completed" || !source.winner_team_id) {
      return { ready: false, reason: "Completa prima gli incontri precedenti del tabellone." };
    }
    if (source.advances_to_slot === "a" && match.team_a_id !== source.winner_team_id) {
      return { ready: false, reason: "Il tabellone non ha ancora ricevuto il vincitore corretto." };
    }
    if (source.advances_to_slot === "b" && match.team_b_id !== source.winner_team_id) {
      return { ready: false, reason: "Il tabellone non ha ancora ricevuto il vincitore corretto." };
    }
  }

  return { ready: true };
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
