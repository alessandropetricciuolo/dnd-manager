import test from "node:test";
import assert from "node:assert/strict";
import { createCharacterSheetV1, isCharacterSheetV1 } from "@/lib/character-sheet";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { parseStoredGeneratedSheet } from "../generated-sheet-storage";

test("a generated Life Cleric passes save validation and survives the creation handoff", async () => {
  const { sheet } = await buildGeneratedCharacterSheet({
    characterName: "Aerion",
    raceSlug: "tiefling",
    subraceSlug: null,
    classLabel: "Chierico",
    classSubclass: "Dominio della Vita",
    backgroundSlug: "accolito",
    level: 5,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  assert.ok(sheet.weaponRows.some((weapon) => weapon.itemId));
  assert.ok(sheet.spells.some((spell) => spell.origin === "class"));
  assert.ok(sheet.spells.some((spell) => spell.origin === "race"));

  const persisted = createCharacterSheetV1("generator", sheet);
  assert.equal(isCharacterSheetV1(persisted), true);
  const handoff = parseStoredGeneratedSheet(JSON.stringify({
    pdfBase64: "JVBERi0x",
    fileName: "Aerion-v2.pdf",
    armorClass: sheet.armorClass,
    hitPoints: sheet.hpMax,
    sheet,
    isV2: true,
  }));
  assert.deepEqual(handoff?.sheet, JSON.parse(JSON.stringify(sheet)));
});

test("generated subclass excerpts stop before unrelated manual sections and can be saved", async () => {
  const cases = [
    { classLabel: "Bardo", classSubclass: "Collegio degli Spiriti", lastFeature: /CONNESSIONE MISTICA/i, nextSection: /WARLOCK: IL NON MORTO/i },
    { classLabel: "Warlock", classSubclass: "L'Insondabile", lastFeature: /IMMERSIONE INSONDABILE/i, nextSection: /## TALENTI/i },
  ];
  for (const { classLabel, classSubclass, lastFeature, nextSection } of cases) {
    const { sheet } = await buildGeneratedCharacterSheet({
      characterName: "Verifica",
      raceSlug: "umano",
      subraceSlug: null,
      classLabel,
      classSubclass,
      backgroundSlug: "accolito",
      level: 20,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
    });
    assert.match(sheet.subclassFeaturesMd ?? "", lastFeature);
    assert.doesNotMatch(sheet.subclassFeaturesMd ?? "", nextSection);
    assert.equal(isCharacterSheetV1(createCharacterSheetV1("generator", sheet)), true, classSubclass);
  }
});

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
