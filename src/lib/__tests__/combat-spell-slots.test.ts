import test from "node:test";
import assert from "node:assert/strict";
import {
  createCombatSpellSlots,
  normalizeCombatSpellSlots,
  resolveMaxSpellSlotsForCharacter,
  restoreCombatSpellSlot,
  spendCombatSpellSlot,
  resetCombatSpellSlots,
} from "@/lib/combat-spell-slots";

test("resolveMaxSpellSlotsForCharacter calcola slot per Mago livello 3", () => {
  const max = resolveMaxSpellSlotsForCharacter({
    character_class: "Mago",
    level: 3,
  });
  assert.ok(max.some((e) => e.level === 1 && e.count >= 4));
  assert.ok(max.some((e) => e.level === 2 && e.count >= 2));
});

test("spend e restore slot", () => {
  const slots = createCombatSpellSlots([
    { level: 1, count: 4 },
    { level: 2, count: 2 },
  ])!;
  const afterSpend = spendCombatSpellSlot(slots, 1);
  assert.ok(afterSpend);
  assert.equal(afterSpend!.remaining.find((e) => e.level === 1)?.count, 3);
  const afterRestore = restoreCombatSpellSlot(afterSpend!, 1);
  assert.ok(afterRestore);
  assert.equal(afterRestore!.remaining.find((e) => e.level === 1)?.count, 4);
});

test("resetCombatSpellSlots ripristina il massimo", () => {
  let slots = createCombatSpellSlots([{ level: 1, count: 2 }])!;
  slots = spendCombatSpellSlot(slots, 1)!;
  slots = spendCombatSpellSlot(slots, 1)!;
  assert.equal(slots.remaining.find((e) => e.level === 1)?.count, undefined);
  const reset = resetCombatSpellSlots(slots);
  assert.deepEqual(reset.remaining, reset.max);
});

test("normalizing a tracker snapshot preserves a fully spent spell slot level", () => {
  const slots = createCombatSpellSlots([{ level: 1, count: 1 }, { level: 2, count: 2 }])!;
  const spent = spendCombatSpellSlot(slots, 1)!;
  const reloaded = normalizeCombatSpellSlots(spent)!;

  assert.deepEqual(reloaded.remaining, [{ level: 1, count: 0 }, { level: 2, count: 2 }]);
  assert.equal(spendCombatSpellSlot(reloaded, 1), null);
  assert.equal(restoreCombatSpellSlot(reloaded, 1)?.remaining[0].count, 1);
});
