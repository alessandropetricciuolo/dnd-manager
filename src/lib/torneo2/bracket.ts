import type { Torneo2Match } from "@/lib/torneo2/types";

export function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && (n & (n - 1)) === 0;
}

/** Etichetta del round in base al numero di incontri che lo compongono. */
export function roundLabelForMatchCount(matchCount: number): string {
  switch (matchCount) {
    case 1:
      return "Finale";
    case 2:
      return "Semifinale";
    case 4:
      return "Quarti";
    case 8:
      return "Ottavi";
    case 16:
      return "Sedicesimi";
    default:
      return "Turno";
  }
}

export type BracketMatchPlan = {
  round: number;
  position: number;
  label: string;
  teamAId: string | null;
  teamBId: string | null;
  /** Dove avanza il vincitore (coordinate nel piano, risolte poi in id reali). */
  feedsTo: { round: number; position: number; slot: "a" | "b" } | null;
};

export type BracketMatchWithId = BracketMatchPlan & {
  id: string;
  feedsMatchId: string | null;
  feedsSlot: "a" | "b" | null;
};

export function assignBracketMatchIds(
  plan: BracketMatchPlan[],
  makeId: () => string,
  trielloId: string | null = null
): BracketMatchWithId[] {
  const idGrid = new Map<string, string>();
  for (const match of plan) {
    idGrid.set(`${match.round}:${match.position}`, makeId());
  }

  return plan.map((match) => {
    const feedsMatchId = match.feedsTo
      ? idGrid.get(`${match.feedsTo.round}:${match.feedsTo.position}`) ?? null
      : trielloId;

    return {
      ...match,
      id: idGrid.get(`${match.round}:${match.position}`) as string,
      feedsMatchId,
      feedsSlot: match.feedsTo?.slot ?? null,
    };
  });
}

/**
 * Costruisce il piano di un tabellone a eliminazione diretta.
 * `teamIds` deve avere lunghezza potenza di due (>= 2); l'ordine è il seeding.
 */
export function buildBracketPlan(teamIds: string[]): BracketMatchPlan[] {
  if (!isPowerOfTwo(teamIds.length) || teamIds.length < 2) return [];

  const rounds: BracketMatchPlan[][] = [];
  let count = teamIds.length / 2;
  let r = 0;
  while (count >= 1) {
    const roundMatches: BracketMatchPlan[] = [];
    for (let p = 0; p < count; p += 1) {
      roundMatches.push({
        round: r,
        position: p,
        label: roundLabelForMatchCount(count),
        teamAId: r === 0 ? teamIds[p * 2] ?? null : null,
        teamBId: r === 0 ? teamIds[p * 2 + 1] ?? null : null,
        feedsTo: null,
      });
    }
    rounds.push(roundMatches);
    if (count === 1) break;
    count /= 2;
    r += 1;
  }

  for (let ri = 0; ri < rounds.length - 1; ri += 1) {
    for (const m of rounds[ri]) {
      m.feedsTo = {
        round: ri + 1,
        position: Math.floor(m.position / 2),
        slot: m.position % 2 === 0 ? "a" : "b",
      };
    }
  }

  return rounds.flat();
}

export type Torneo2BracketRound = {
  round: number;
  label: string;
  matches: Torneo2Match[];
};

/** Raggruppa gli incontri del bracket per round, ordinati. */
export function groupBracketRounds(matches: Torneo2Match[]): Torneo2BracketRound[] {
  const byRound = new Map<number, Torneo2Match[]>();
  for (const m of matches) {
    if (m.bracketRound === null || m.bracketRound === undefined) continue;
    const list = byRound.get(m.bracketRound) ?? [];
    list.push(m);
    byRound.set(m.bracketRound, list);
  }
  return [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, ms]) => {
      const sorted = [...ms].sort((x, y) => x.bracketPosition - y.bracketPosition);
      const teamMatches = sorted.filter((m) => m.kind === "team").length;
      const label =
        sorted.find((m) => m.roundLabel)?.roundLabel ??
        (sorted.some((m) => m.kind === "final_ffa") && sorted.length === 1
          ? "Triello"
          : roundLabelForMatchCount(teamMatches || sorted.length));
      return { round, label, matches: sorted };
    });
}
