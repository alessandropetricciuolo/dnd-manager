import test from "node:test";
import assert from "node:assert/strict";
import {
  BRACKET_ROUND,
  buildEightTeamBracketPlan,
  resolveBracketSlotAfterAdvance,
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

test("genera tabellone: quarti con squadre reali, turni successivi con placeholder", () => {
  const plan = buildEightTeamBracketPlan(mockTeams());

  assert.equal(plan.length, 8);

  const quarters = plan.filter((p) => p.round === BRACKET_ROUND.QUARTER);
  assert.equal(quarters.length, 4);
  for (const q of quarters) {
    assert.ok(q.teamAId);
    assert.ok(q.teamBId);
    assert.equal(q.teamAPlaceholder, null);
    assert.equal(q.teamBPlaceholder, null);
  }

  const semi0 = plan.find((p) => p.round === BRACKET_ROUND.SEMI && p.slot === 0)!;
  const semi1 = plan.find((p) => p.round === BRACKET_ROUND.SEMI && p.slot === 1)!;
  const final = plan.find((p) => p.round === BRACKET_ROUND.FINAL)!;
  const triello = plan.find((p) => p.round === BRACKET_ROUND.TRIO)!;

  assert.equal(semi0.teamAId, null);
  assert.equal(semi0.teamBId, null);
  assert.equal(semi0.teamAPlaceholder, "Vincitore quarto 1");
  assert.equal(semi0.teamBPlaceholder, "Vincitore quarto 2");

  assert.equal(semi1.teamAPlaceholder, "Vincitore quarto 3");
  assert.equal(semi1.teamBPlaceholder, "Vincitore quarto 4");

  assert.equal(final.teamAPlaceholder, "Vincitore semifinale 1");
  assert.equal(final.teamBPlaceholder, "Vincitore semifinale 2");

  assert.equal(triello.teamAId, null);
  assert.equal(triello.teamAPlaceholder, "Squadra campione");
});

test("resolveBracketSlotAfterAdvance: vincitore Q1 popola semifinale 1 slot A", () => {
  const winnerQ1 = "team-0";
  const next = resolveBracketSlotAfterAdvance(
    null,
    null,
    "Vincitore quarto 1",
    "Vincitore quarto 2",
    "a",
    winnerQ1
  );

  assert.equal(next.teamAId, winnerQ1);
  assert.equal(next.teamAPlaceholder, null);
  assert.equal(next.teamBId, null);
  assert.equal(next.teamBPlaceholder, "Vincitore quarto 2");
});

test("simulazione avanzamento: tutti i quarti riempiono le semifinali", () => {
  const ordered = mockTeams();
  const plan = buildEightTeamBracketPlan(ordered);
  const qfWinners = ["team-0", "team-3", "team-1", "team-2"];

  type SlotState = {
    teamAId: string | null;
    teamBId: string | null;
    teamAPlaceholder: string | null;
    teamBPlaceholder: string | null;
  };

  const state: SlotState[] = plan.map((p) => ({
    teamAId: p.teamAId,
    teamBId: p.teamBId,
    teamAPlaceholder: p.teamAPlaceholder,
    teamBPlaceholder: p.teamBPlaceholder,
  }));

  for (let q = 0; q < 4; q += 1) {
    const slot = plan[q]!;
    const targetIdx = slot.advancesToMatchIndex!;
    const target = state[targetIdx]!;
    const next = resolveBracketSlotAfterAdvance(
      target.teamAId,
      target.teamBId,
      target.teamAPlaceholder,
      target.teamBPlaceholder,
      slot.advancesToSlot!,
      qfWinners[q]!
    );
    state[targetIdx] = next;
  }

  assert.equal(state[4]!.teamAId, "team-0");
  assert.equal(state[4]!.teamBId, "team-3");
  assert.equal(state[5]!.teamAId, "team-1");
  assert.equal(state[5]!.teamBId, "team-2");
  assert.equal(state[4]!.teamAPlaceholder, null);
  assert.equal(state[5]!.teamBPlaceholder, null);
});
