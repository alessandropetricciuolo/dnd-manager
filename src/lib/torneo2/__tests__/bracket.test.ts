import test from "node:test";
import assert from "node:assert/strict";
import { buildBracketPlan, isPowerOfTwo, roundLabelForMatchCount } from "@/lib/torneo2/bracket";

test("isPowerOfTwo", () => {
  assert.equal(isPowerOfTwo(1), true);
  assert.equal(isPowerOfTwo(2), true);
  assert.equal(isPowerOfTwo(4), true);
  assert.equal(isPowerOfTwo(8), true);
  assert.equal(isPowerOfTwo(3), false);
  assert.equal(isPowerOfTwo(6), false);
  assert.equal(isPowerOfTwo(0), false);
});

test("roundLabelForMatchCount", () => {
  assert.equal(roundLabelForMatchCount(1), "Finale");
  assert.equal(roundLabelForMatchCount(2), "Semifinale");
  assert.equal(roundLabelForMatchCount(4), "Quarti");
  assert.equal(roundLabelForMatchCount(8), "Ottavi");
});

test("buildBracketPlan rejects non power-of-two", () => {
  assert.equal(buildBracketPlan(["a", "b", "c"]).length, 0);
  assert.equal(buildBracketPlan(["a"]).length, 0);
});

test("buildBracketPlan with 4 teams: 2 quarti? no -> semifinale+finale", () => {
  const plan = buildBracketPlan(["t1", "t2", "t3", "t4"]);
  // 4 squadre => round 0 (2 incontri "Semifinale") + round 1 (1 incontro "Finale")
  assert.equal(plan.length, 3);
  const r0 = plan.filter((m) => m.round === 0);
  const r1 = plan.filter((m) => m.round === 1);
  assert.equal(r0.length, 2);
  assert.equal(r1.length, 1);
  assert.equal(r0[0].label, "Semifinale");
  assert.equal(r1[0].label, "Finale");
  // round 0 ha le squadre assegnate
  assert.deepEqual([r0[0].teamAId, r0[0].teamBId], ["t1", "t2"]);
  assert.deepEqual([r0[1].teamAId, r0[1].teamBId], ["t3", "t4"]);
  // round 1 vuoto
  assert.equal(r1[0].teamAId, null);
  assert.equal(r1[0].teamBId, null);
  // collegamenti: pos0 -> finale slot a, pos1 -> finale slot b
  assert.deepEqual(r0[0].feedsTo, { round: 1, position: 0, slot: "a" });
  assert.deepEqual(r0[1].feedsTo, { round: 1, position: 0, slot: "b" });
  assert.equal(r1[0].feedsTo, null);
});

test("buildBracketPlan with 8 teams: quarti, semifinale, finale", () => {
  const ids = ["1", "2", "3", "4", "5", "6", "7", "8"];
  const plan = buildBracketPlan(ids);
  assert.equal(plan.length, 4 + 2 + 1);
  assert.equal(plan.filter((m) => m.round === 0).length, 4);
  assert.equal(plan.filter((m) => m.round === 0)[0].label, "Quarti");
  assert.equal(plan.filter((m) => m.round === 1).length, 2);
  assert.equal(plan.filter((m) => m.round === 2).length, 1);
  assert.equal(plan.filter((m) => m.round === 2)[0].label, "Finale");
});
