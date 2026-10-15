import test from "node:test";
import assert from "node:assert/strict";
import { applyMobileCharacterOperation, isMobileCharacterOperation } from "../character-state";

test("short rest with hit die commits healing, die use, and short-rest resets together", () => {
  const before = {
    hit_points: 4,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      max_hp: 20,
      hit_dice: { total: 3, current: 1, die: "1d8" },
      features: [
        { id: "second-wind", usesCurrent: 0, usesMax: 1, resetOn: "shortRest" },
        { id: "daily", usesCurrent: 0, usesMax: 1, resetOn: "longRest" },
      ],
      usedSpellSlots: { 1: 1 },
      character_sheet: { version: 1, source: "manual" },
    },
  };

  const operation = { type: "shortRestHitDie", hitPoints: 9 } as const;
  assert.equal(isMobileCharacterOperation(operation), true);
  const after = applyMobileCharacterOperation(before, operation);

  assert.equal(after.hit_points, 9);
  assert.deepEqual(after.rules_snapshot?.hit_dice, { total: 3, current: 0, die: "1d8" });
  assert.equal(after.rules_snapshot?.features[0].usesCurrent, 1);
  assert.equal(after.rules_snapshot?.features[1].usesCurrent, 0);
  assert.deepEqual(after.rules_snapshot?.usedSpellSlots, { 1: 1 });
  assert.deepEqual(after.rules_snapshot?.character_sheet, { version: 1, source: "manual" });
});

test("short rest with hit die refuses when no die is available", () => {
  assert.throws(() => applyMobileCharacterOperation({
    hit_points: 4,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: { max_hp: 20, hit_dice: { total: 2, current: 0, die: "1d8" } },
}, { type: "shortRestHitDie", hitPoints: 9 }), /hit_dice_unavailable/);
});

test("long rest does not invent hit dice when the source did not save them", () => {
  const after = applyMobileCharacterOperation({
    hit_points: 4,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: { max_hp: 20 },
  }, { type: "longRest" });
  assert.equal("hit_dice" in (after.rules_snapshot ?? {}), false);
});

test("recovered sheet HP is the canonical cap when legacy max_hp is absent", () => {
  const row = {
    hit_points: 12,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      character_sheet: { version: 1, source: "recovered", hpMax: 22 },
    },
  };
  const after = applyMobileCharacterOperation(row, { type: "hp", hitPoints: 21 });
  assert.equal(after.hit_points, 21);
  assert.deepEqual(after.rules_snapshot?.character_sheet, { version: 1, source: "recovered", hpMax: 22 });
  assert.throws(() => applyMobileCharacterOperation(row, { type: "hp", hitPoints: 23 }), /invalid_hp/);
});

test("short rest uses nested HP and hit-die totals when runtime totals are missing", () => {
  const row = {
    hit_points: 4,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      character_sheet: { version: 1, source: "recovered", hpMax: 22, hitDiceTotal: 4, hitDie: "1d8" },
      hit_dice: { current: 1 },
    },
  };
  const after = applyMobileCharacterOperation(row, { type: "shortRestHitDie", hitPoints: 21 });
  assert.equal(after.hit_points, 21);
  assert.deepEqual(after.rules_snapshot?.hit_dice, { current: 0, total: 4, die: "1d8" });
  assert.throws(() => applyMobileCharacterOperation(row, { type: "shortRestHitDie", hitPoints: 23 }), /invalid_hp/);
});

test("spell-slot use falls back to counts saved in the character sheet", () => {
  const after = applyMobileCharacterOperation({
    hit_points: 4,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: { character_sheet: { version: 1, source: "recovered", spellSlots: { 1: 2 } } },
  }, { type: "spellSlot", level: 1, usedCount: 2 });
  assert.deepEqual(after.rules_snapshot?.usedSpellSlots, { 1: 2 });
  assert.throws(() => applyMobileCharacterOperation({
    hit_points: 4,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: { character_sheet: { version: 1, source: "recovered", spellSlots: { 1: 2 } } },
  }, { type: "spellSlot", level: 1, usedCount: 3 }), /invalid_spell_slot/);
});

test("a generated sheet initializes fresh hit-die resources from saved totals", () => {
  const after = applyMobileCharacterOperation({
    hit_points: 4,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      character_sheet: { version: 1, source: "generator", hpMax: 22, hitDiceTotal: 4, hitDie: "1d8" },
    },
  }, { type: "shortRestHitDie", hitPoints: 9 });
  assert.deepEqual(after.rules_snapshot?.hit_dice, { total: 4, current: 3, die: "1d8" });
});

test("a recovered sheet does not imply unrecorded hit dice are unused", () => {
  assert.throws(() => applyMobileCharacterOperation({
    hit_points: 4,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      character_sheet: { version: 1, source: "recovered", hpMax: 22, hitDiceTotal: 4, hitDie: "1d8" },
    },
  }, { type: "shortRestHitDie", hitPoints: 9 }), /hit_dice_unavailable/);
});
