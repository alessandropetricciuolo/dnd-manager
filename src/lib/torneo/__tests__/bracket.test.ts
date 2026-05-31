import test from "node:test";
import assert from "node:assert/strict";
import {
  BRACKET_ROUND,
  buildEightTeamBracketPlan,
  resolveBracketSlotAfterAdvance,
  semiFeederTeamIndices,
} from "@/lib/torneo/bracket";
import type { TorneoTeamWithMembers } from "@/lib/torneo/types";

function mockTeams(): TorneoTeamWithMembers[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `team-${i}`,
    campaign_id: "camp",
    name: `Squadra ${i + 1}`,
    color: "#f59e0b",
    sort_order: i,
    members: [],
  }));
}

test("placeholder semifinali fuori dai possibili vincitori dei quarti collegati", () => {
  const ordered = mockTeams();
  const plan = buildEightTeamBracketPlan(ordered);

  const semi0 = plan.find((p) => p.round === BRACKET_ROUND.SEMI && p.slot === 0)!;
  const semi1 = plan.find((p) => p.round === BRACKET_ROUND.SEMI && p.slot === 1)!;
  const feeder0 = new Set(semiFeederTeamIndices(0).map((i) => ordered[i]!.id));
  const feeder1 = new Set(semiFeederTeamIndices(1).map((i) => ordered[i]!.id));

  assert.notEqual(semi0.teamAId, semi0.teamBId);
  assert.notEqual(semi1.teamAId, semi1.teamBId);
  assert.equal(feeder0.has(semi0.teamAId!), false);
  assert.equal(feeder0.has(semi0.teamBId!), false);
  assert.equal(feeder1.has(semi1.teamAId!), false);
  assert.equal(feeder1.has(semi1.teamBId!), false);
});

test("resolveBracketSlotAfterAdvance: caso Q3 vince team-1 → SF2", () => {
  const ordered = mockTeams();
  const plan = buildEightTeamBracketPlan(ordered);
  const semi2 = plan.find((p) => p.round === BRACKET_ROUND.SEMI && p.slot === 1)!;

  const winnerQ3 = ordered[1]!.id;
  const fallback = ordered[0]!.id;
  const next = resolveBracketSlotAfterAdvance(
    semi2.teamAId!,
    semi2.teamBId!,
    "a",
    winnerQ3,
    "bracket",
    fallback
  );

  assert.equal(next.teamAId, winnerQ3);
  assert.notEqual(next.teamBId, winnerQ3);
  assert.notEqual(next.teamAId, next.teamBId);
});

const QF_PAIRINGS: Array<[number, number]> = [
  [0, 7],
  [3, 4],
  [1, 6],
  [2, 5],
];

test("semifinali con squadre distinte per tutti i 16 esiti dei quarti", () => {
  const ordered = mockTeams();
  const plan = buildEightTeamBracketPlan(ordered);

  const qfWinnerChoices = QF_PAIRINGS.map(([a, b]) => [ordered[a]!.id, ordered[b]!.id] as const);

  for (let mask = 0; mask < 16; mask += 1) {
    const state = plan.map((p) => ({
      teamA: p.teamAId!,
      teamB: p.teamBId!,
      kind: p.matchKind,
    }));

    for (let q = 0; q < 4; q += 1) {
      const pickB = (mask >> q) & 1;
      const winnerId = qfWinnerChoices[q]![pickB]!;
      const slot = plan[q]!;
      const targetIdx = slot.advancesToMatchIndex!;
      const advSlot = slot.advancesToSlot!;
      const target = state[targetIdx]!;
      const fallback = ordered.find((t) => t.id !== winnerId)!.id;
      const next = resolveBracketSlotAfterAdvance(
        target.teamA,
        target.teamB,
        advSlot,
        winnerId,
        target.kind,
        fallback
      );
      state[targetIdx] = { ...target, teamA: next.teamAId, teamB: next.teamBId };
    }

    assert.notEqual(state[4]!.teamA, state[4]!.teamB, `semi0 mask=${mask}`);
    assert.notEqual(state[5]!.teamA, state[5]!.teamB, `semi1 mask=${mask}`);
  }
});
