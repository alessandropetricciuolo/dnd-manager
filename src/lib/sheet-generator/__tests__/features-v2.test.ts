import test from "node:test";
import assert from "node:assert/strict";
import { buildFeatureSummaryV2 } from "@/lib/sheet-generator/features-v2";
import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";

function sheet(overrides: Partial<GeneratedCharacterSheet> = {}): GeneratedCharacterSheet {
  return {
    characterName: "Test",
    raceLabel: "Umano",
    subraceLabel: null,
    classLabel: "Guerriero",
    classSubclass: null,
    backgroundLabel: "Soldato",
    level: 1,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    abilityMods: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    proficiencyBonus: 2,
    savingThrows: {} as GeneratedCharacterSheet["savingThrows"],
    skills: {} as GeneratedCharacterSheet["skills"],
    passivePerception: 10,
    speed: "9 m",
    armorClass: 10,
    initiative: 0,
    hpMax: 10,
    hitDie: "d10",
    hitDiceTotal: 1,
    weaponRows: [],
    inventory: [],
    languages: [],
    proficiencies: [],
    armorProficiencies: [],
    weaponProficiencies: [],
    toolProficiencies: [],
    raceTraitsMd: "**Taglia.** Sei di taglia Media.\n\n**Velocità.** La tua velocità è 9 metri.",
    subraceTraitsMd: null,
    classFeaturesMd: "## Secondo Vento\nCome azione bonus, puoi recuperare punti ferita.\n\n## Attacco Extra\nA partire dal 5° livello, puoi attaccare due volte.",
    subclassFeaturesMd: null,
    backgroundMd: null,
    spellcastingClass: null,
    spellcastingAbility: null,
    spellSaveDc: null,
    spellAttackBonus: null,
    spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
    cantripsKnown: 0,
    spellsPrepared: 0,
    spells: [],
    ...overrides,
  };
}

test("V2 uses only manual evidence and filters features above character level", () => {
  const result = buildFeatureSummaryV2(sheet());
  assert.match(result.fields.Feat_Racial, /Taglia/);
  assert.match(result.fields.Features_Main, /Secondo Vento/);
  assert.doesNotMatch(result.fields.Features_Main, /Attacco Extra/);
  assert.equal(result.diagnostics.verifiedByManual, true);
  assert.ok(result.evidence.every((item) => item.sourceSnippet.length > 0 && item.manual));
});

test("V2 exposes incomplete sources instead of inventing text", () => {
  const result = buildFeatureSummaryV2(sheet({ raceTraitsMd: "", classFeaturesMd: "" }));
  assert.equal(result.fields.Feat_Racial, "");
  assert.equal(result.fields.Features_Main, "");
  assert.equal(result.diagnostics.verifiedByManual, false);
  assert.ok(result.diagnostics.unresolved.length >= 2);
});

test("V2 keeps the PDF field contract and bounded complete lines", () => {
  const result = buildFeatureSummaryV2(sheet({ level: 20 }));
  assert.deepEqual(Object.keys(result.fields).sort(), ["Feat_Racial", "Features_Main"]);
  for (const value of Object.values(result.fields)) {
    assert.ok(value.length <= 1400);
    assert.ok(!/[,:;…]$/.test(value));
  }
});

