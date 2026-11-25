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

test("operations unrelated to HP keep null hit_points absent instead of coercing to zero", () => {
  const uncompiledHpRow = {
    hit_points: null,
    coins_gp: 5,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      character_sheet: { version: 1, source: "manual", spellSlots: { 1: 2 } },
    },
  };

  const afterInsp = applyMobileCharacterOperation(uncompiledHpRow, { type: "toggleInspiration" });
  assert.equal(afterInsp.hit_points, null);
  assert.equal(afterInsp.rules_snapshot?.inspiration, true);

  const afterCoins = applyMobileCharacterOperation(afterInsp, { type: "coins", gp: 12, sp: 3, cp: 1 });
  assert.equal(afterCoins.hit_points, null);
  assert.equal(afterCoins.coins_gp, 12);

  const afterSlot = applyMobileCharacterOperation(afterCoins, { type: "spellSlot", level: 1, usedCount: 1 });
  assert.equal(afterSlot.hit_points, null);
  assert.deepEqual(afterSlot.rules_snapshot?.usedSpellSlots, { 1: 1 });
});

test("operations unrelated to HP preserve explicit zero hit_points", () => {
  const zeroHpRow = {
    hit_points: 0,
    coins_gp: 1,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      character_sheet: { version: 1, source: "manual", hpMax: 20, spellSlots: { 1: 2 } },
    },
  };

  const afterInsp = applyMobileCharacterOperation(zeroHpRow, { type: "toggleInspiration" });
  assert.equal(afterInsp.hit_points, 0);

  const afterCoins = applyMobileCharacterOperation(afterInsp, { type: "coins", gp: 10, sp: 0, cp: 0 });
  assert.equal(afterCoins.hit_points, 0);

  const afterSlot = applyMobileCharacterOperation(afterCoins, { type: "spellSlot", level: 1, usedCount: 1 });
  assert.equal(afterSlot.hit_points, 0);
});

test("Warlock Pact Magic resets usedSpellSlots on short rest while full casters keep spent slots", () => {
  const warlock = {
    hit_points: 18,
    character_class: "Warlock",
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      max_hp: 24,
      hit_dice: { total: 3, current: 2, die: "1d8" },
      usedSpellSlots: { 2: 2 },
      character_sheet: { version: 1, source: "manual" as const, classLabel: "Warlock", spellSlots: { 2: 2 } },
    },
  };
  const afterShort = applyMobileCharacterOperation(warlock, { type: "shortRest" });
  assert.deepEqual(afterShort.rules_snapshot?.usedSpellSlots, {});

  const wizard = {
    ...warlock,
    character_class: "Mago",
    rules_snapshot: {
      ...warlock.rules_snapshot,
      character_sheet: { version: 1, source: "manual" as const, classLabel: "Mago", spellSlots: { 1: 4, 2: 2 } },
    },
  };
  const wizardAfterShort = applyMobileCharacterOperation(wizard, { type: "shortRest" });
  assert.deepEqual(wizardAfterShort.rules_snapshot?.usedSpellSlots, { 2: 2 });
});

test("exhaustion clamps 0..6, longRest reduces exhaustion by 1, and restoreFeature increments uses up to usesMax", () => {
  const base = {
    hit_points: 10,
    coins_gp: 0,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      max_hp: 20,
      exhaustion: 2,
      features: [{ id: "ki", name: "Punti Ki", usesCurrent: 1, usesMax: 4, resetOn: "shortRest" }],
    },
  };

  const exh3 = applyMobileCharacterOperation(base, { type: "exhaustion", level: 3 });
  assert.equal(exh3.rules_snapshot?.exhaustion, 3);
  assert.equal(isMobileCharacterOperation({ type: "exhaustion", level: 7 }), false);

  const afterLong = applyMobileCharacterOperation(exh3, { type: "longRest" });
  assert.equal(afterLong.rules_snapshot?.exhaustion, 2);
  assert.equal(afterLong.hit_points, 20);

  const restored = applyMobileCharacterOperation(base, { type: "restoreFeature", featureId: "ki" });
  assert.equal(restored.rules_snapshot?.features[0].usesCurrent, 2);
});

test("Long sheet player operations mutate only allowed weapon, spell, inventory, and bio fields", () => {
  const base = {
    hit_points: null,
    coins_gp: 10,
    coins_sp: 0,
    coins_cp: 0,
    rules_snapshot: {
      character_sheet: {
        version: 1 as const,
        source: "manual" as const,
        abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
        hpMax: 28,
        armorClass: 17,
      },
    },
  };

  const w1 = applyMobileCharacterOperation(base, {
    type: "upsertWeapon",
    weapon: { name: "Spada lunga +1", toHit: "+6", damage: "1d8+4 (1d10+4)", type: "taglienti" },
  });
  assert.equal(w1.hit_points, null);
  assert.equal(w1.rules_snapshot?.character_sheet.weaponRows?.length, 1);
  assert.equal(w1.rules_snapshot?.character_sheet.abilities.str, 16);

  const s1 = applyMobileCharacterOperation(w1, {
    type: "upsertSpell",
    spell: { name: "Benedizione", level: 1, summary: "+1d4 attacchi e TS", concentration: true, prepared: false },
  });
  const s2 = applyMobileCharacterOperation(s1, { type: "toggleSpellPrepared", index: 0 });
  assert.equal(s2.rules_snapshot?.character_sheet.spells?.[0]?.prepared, true);

  const inv = applyMobileCharacterOperation(s2, {
    type: "updateInventory",
    items: ["Corda di canapa 15m", "Pozione di guarigione"],
  });
  assert.deepEqual(inv.rules_snapshot?.character_sheet.inventory, ["Corda di canapa 15m", "Pozione di guarigione"]);

  const bio = applyMobileCharacterOperation(inv, {
    type: "updateBioNotes",
    personality: { traits: "Impavido", flaws: "Testardo" },
    playerNotes: "Incontrato il fabbro di Waterdeep",
  });
  assert.equal(bio.rules_snapshot?.character_sheet.personality?.traits, "Impavido");
  assert.equal(bio.rules_snapshot?.character_sheet.playerNotes, "Incontrato il fabbro di Waterdeep");
});
