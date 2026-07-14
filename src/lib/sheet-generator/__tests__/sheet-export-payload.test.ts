import test from "node:test";
import assert from "node:assert/strict";
import type { GeneratedCharacterSheet } from "@/lib/sheet-generator/types";
import {
  buildCompiledSheetExportPayload,
  compiledSheetJsonFileName,
} from "@/lib/sheet-generator/sheet-pdf-payload";

const minimalSheet = {
  characterName: "Lyra",
  raceLabel: "Elfo",
  subraceLabel: null,
  classLabel: "Mago",
  classSubclass: null,
  backgroundLabel: "Saggio",
  level: 1,
  alignment: "Neutrale Buono",
  age: "120",
  height: "170 cm",
  weight: "55 kg",
  sex: "F",
  abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 11 },
  abilityMods: { str: -1, dex: 2, con: 1, int: 3, wis: 0, cha: 0 },
  proficiencyBonus: 2,
  savingThrows: {
    str: { value: -1, proficient: false },
    dex: { value: 2, proficient: false },
    con: { value: 1, proficient: false },
    int: { value: 5, proficient: true },
    wis: { value: 0, proficient: false },
    cha: { value: 0, proficient: false },
  },
  skills: {
    acrobatics: { value: 2, proficient: false },
    animal_handling: { value: 0, proficient: false },
    arcana: { value: 5, proficient: true },
    athletics: { value: -1, proficient: false },
    deception: { value: 0, proficient: false },
    history: { value: 5, proficient: true },
    insight: { value: 0, proficient: false },
    intimidation: { value: 0, proficient: false },
    investigation: { value: 5, proficient: true },
    medicine: { value: 0, proficient: false },
    nature: { value: 3, proficient: false },
    perception: { value: 0, proficient: false },
    performance: { value: 0, proficient: false },
    persuasion: { value: 0, proficient: false },
    religion: { value: 3, proficient: false },
    sleight_of_hand: { value: 2, proficient: false },
    stealth: { value: 2, proficient: false },
    survival: { value: 0, proficient: false },
  },
  passivePerception: 10,
  speed: "9 m",
  armorClass: 12,
  initiative: 2,
  hpMax: 7,
  hitDie: "d6",
  hitDiceTotal: 1,
  weaponRows: [],
  inventory: ["Libro", "Bacchetta"],
  languages: ["Comune", "Elfico"],
  proficiencies: [],
  armorProficiencies: [],
  weaponProficiencies: [],
  toolProficiencies: [],
  raceTraitsMd: "Visione nel buio",
  subraceTraitsMd: null,
  classFeaturesMd: "Incantamento",
  subclassFeaturesMd: null,
  backgroundMd: "Eri un erudito.",
  spellcastingClass: "Mago",
  spellcastingAbility: "int",
  spellSaveDc: 13,
  spellAttackBonus: 5,
  spellSlots: { 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
  cantripsKnown: 3,
  spellsPrepared: 4,
  spells: [{ level: 0, name: "Prestidigitazione", summary: "Trucchetto", ritual: false, concentration: false, verbal: true, somatic: true, material: false }],
} as GeneratedCharacterSheet;

test("buildCompiledSheetExportPayload include sheet e payload PDF", () => {
  const payload = buildCompiledSheetExportPayload({
    sheetData: { CharacterName: "Lyra", ClassLevel: "Mago 1" },
    sheet: minimalSheet,
    includeBackgroundStoryInPdf: true,
    characterStory: "Una giovane maga.",
    quickManualSections: [{ title: "Trucchetti", body: "Prestidigitazione" }],
    backgroundPdfSections: [{ title: "Background", body: "Saggio" }],
  });

  assert.equal(payload.sheet.characterName, "Lyra");
  assert.ok(payload.exportedAt);
  const pdf = payload.compiledPdf;
  assert.equal(pdf.fileName, "Lyra-compilata.pdf");
  assert.deepEqual((pdf.fields as Record<string, unknown>).CharacterName, "Lyra");
  assert.equal(pdf.storyText, "Una giovane maga.");
  assert.equal(Array.isArray(pdf.quickManualSections), true);
  assert.equal(Array.isArray(pdf.backgroundPdfSections), true);
});

test("compiledSheetJsonFileName sanitizza il nome", () => {
  assert.equal(compiledSheetJsonFileName(minimalSheet), "Lyra-compilata.json");
  assert.equal(
    compiledSheetJsonFileName({ ...minimalSheet, characterName: "Tharion / Grigio" }),
    "Tharion  Grigio-compilata.json"
  );
});
