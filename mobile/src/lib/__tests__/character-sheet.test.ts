import test from "node:test";
import assert from "node:assert/strict";
import {
  createCharacterSheetV1,
  isCharacterSheetV1,
  mergeCharacterSheetIntoSnapshot,
} from "../character-sheet";

test("shared sheet contract retains generated values and exact checks without defaults", () => {
  const sheet = createCharacterSheetV1("generator", {
    characterName: "Lyra",
    abilities: { str: 8, dex: 16, con: 14, int: 12, wis: 10, cha: 18 },
    savingThrows: { dex: { value: 7, proficient: true }, int: { value: 1, proficient: false } },
    skills: { perception: { value: 5, proficient: true }, stealth: { value: 8, proficient: true, expertise: true } },
    weaponRows: [{ name: "Arco", toHit: "+7", damage: "1d8+4", type: "perforante" }],
    inventory: ["Pozione"],
    spellSlots: { 1: 2 },
    spells: [{ level: 1, name: "Scudo", summary: "Reazione", ritual: false, concentration: false, verbal: true, somatic: true, material: false }],
    hpMax: 24,
  });
  assert.equal(isCharacterSheetV1(sheet), true);
  assert.equal(sheet.abilities?.dex, 16);
  assert.equal(sheet.skills?.stealth?.value, 8);
  assert.equal(sheet.spellSlots?.[1], 2);
  assert.equal("speed" in sheet, false);
});

test("manual sheets may omit unknown spell properties", () => {
  const sheet = createCharacterSheetV1("manual", {
    spells: [{ level: 2, name: "Nebbia", summary: "Oscura l'area" }],
  });
  assert.equal(isCharacterSheetV1(sheet), true);
  assert.equal("ritual" in (sheet.spells?.[0] ?? {}), false);
});

test("sheet merge preserves runtime resources and unrelated snapshot fields", () => {
  const previous = {
    version: 1,
    max_hp: 24,
    inspiration: true,
    hit_dice: { total: 3, current: 1 },
    usedSpellSlots: { 1: 1 },
    features: [{ id: "rage", usesCurrent: 1 }],
    existingMetadata: { preserved: true },
  };
  const sheet = createCharacterSheetV1("manual", { hpMax: 24 });
  const next = mergeCharacterSheetIntoSnapshot(previous, sheet);
  assert.deepEqual(next.inspiration, true);
  assert.deepEqual(next.hit_dice, previous.hit_dice);
  assert.deepEqual(next.usedSpellSlots, previous.usedSpellSlots);
  assert.deepEqual(next.features, previous.features);
  assert.deepEqual(next.existingMetadata, previous.existingMetadata);
  assert.equal(next.character_sheet?.hpMax, 24);
});

test("server contract rejects oversized or malformed nested data", () => {
  assert.equal(isCharacterSheetV1({ version: 1, source: "manual", weaponRows: [{ name: "A" }] }), false);
  assert.equal(isCharacterSheetV1({ version: 1, source: "manual", spells: [{ level: 1, name: "X", summary: "", verbal: "yes" }] }), false);
  assert.equal(isCharacterSheetV1({ version: 1, source: "manual", classFeaturesMd: "x".repeat(512_001) }), false);
});
