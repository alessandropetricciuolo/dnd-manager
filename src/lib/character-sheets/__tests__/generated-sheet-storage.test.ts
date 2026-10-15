import test from "node:test";
import assert from "node:assert/strict";
import { parseStoredGeneratedSheet } from "../generated-sheet-storage";

test("generator localStorage handoff restores the full sheet into character creation", () => {
  const sheet = {
    characterName: "Lyra",
    raceLabel: "Elfa",
    subraceLabel: "Alta",
    classLabel: "Maga",
    classSubclass: "Invocazione",
    backgroundLabel: "Sapiente",
    level: 5,
    alignment: "Neutrale",
    age: "120",
    height: "1,65 m",
    weight: "55 kg",
    sex: "F",
    abilities: { str: 8, dex: 14, con: 13, int: 18, wis: 12, cha: 10 },
    abilityMods: { str: -1, dex: 2, con: 1, int: 4, wis: 1, cha: 0 },
    proficiencyBonus: 3,
    savingThrows: {
      str: { value: -1, proficient: false }, dex: { value: 2, proficient: false },
      con: { value: 1, proficient: false }, int: { value: 7, proficient: true },
      wis: { value: 4, proficient: true }, cha: { value: 0, proficient: false },
    },
    skills: { arcana: { value: 7, proficient: true } },
    passivePerception: 11,
    speed: "9 m",
    armorClass: 15,
    initiative: 2,
    hpMax: 32,
    hitDie: "1d6",
    hitDiceTotal: 5,
    weaponRows: [{ name: "Pugnale", toHit: "+5", damage: "1d4+2", type: "perforante" }],
    inventory: ["Libro degli incantesimi", "Pugnale"],
    languages: ["Comune", "Elfico"],
    proficiencies: ["Armi semplici"],
    armorProficiencies: [],
    weaponProficiencies: ["Armi semplici"],
    toolProficiencies: [],
    raceTraitsMd: "Scurovisione",
    subraceTraitsMd: "Addestramento elfico",
    classFeaturesMd: "Recupero arcano",
    subclassFeaturesMd: "Allievo della scuola",
    backgroundMd: "Ricercatrice",
    spellcastingClass: "Maga",
    spellcastingAbility: "int",
    spellSaveDc: 15,
    spellAttackBonus: 7,
    spellSlots: { 1: 4, 2: 3, 3: 2 },
    cantripsKnown: 4,
    spellsPrepared: 9,
    spells: [{ level: 1, name: "Scudo", summary: "Reazione", ritual: false, concentration: false, verbal: true, somatic: true, material: false }],
  };
  const handoff = parseStoredGeneratedSheet(JSON.stringify({
    pdfBase64: "JVBERi0x",
    fileName: "Lyra.pdf",
    armorClass: 15,
    hitPoints: 32,
    sheet,
  }));
  assert.ok(handoff?.sheet);
  assert.deepEqual(handoff.sheet, sheet);
  assert.equal(handoff.sheet.spells[0].name, "Scudo");
  assert.equal(handoff.sheet.inventory[0], "Libro degli incantesimi");
});

test("older PDF-only generator drafts remain readable without pretending they contain a full sheet", () => {
  const handoff = parseStoredGeneratedSheet(JSON.stringify({
    pdfBase64: "JVBERi0x", fileName: "legacy.pdf", armorClass: 12, hitPoints: 8,
  }));
  assert.ok(handoff);
  assert.equal(handoff.sheet, undefined);
});
