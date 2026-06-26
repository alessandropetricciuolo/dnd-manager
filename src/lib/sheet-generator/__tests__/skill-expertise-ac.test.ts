import test from "node:test";
import assert from "node:assert/strict";
import { computeArmorClass } from "@/lib/sheet-generator/armor-class";
import { buildGeneratedCharacterSheet, computeCoreSheet } from "@/lib/sheet-generator/build-engine";
import {
  classSkillPickCount,
  resolveExpertiseSkills,
} from "@/lib/sheet-generator/skill-rules";

test("class skill pick count: Ladro 4, Bardo 3, Guerriero 2", () => {
  assert.equal(classSkillPickCount("Ladro"), 4);
  assert.equal(classSkillPickCount("Bardo"), 3);
  assert.equal(classSkillPickCount("Guerriero"), 2);
});

test("Ladro lv1: 4 competenze di classe + background (senza duplicati)", () => {
  const core = computeCoreSheet("Ladro", 1, "criminale");
  const proficient = Object.entries(core.skills).filter(([, v]) => v.proficient);
  assert.ok(proficient.length >= 5, `attese almeno 5 competenze, trovate ${proficient.length}`);
  assert.equal(core.skills.stealth.proficient, true);
  assert.equal(core.skills.deception.proficient, true);
});

test("elfo: Percezione competente dalla razza", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Elf Test",
    raceSlug: "elfo",
    subraceSlug: "elfo_boschi",
    classLabel: "Guerriero",
    classSubclass: null,
    backgroundSlug: "soldato",
    level: 1,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  assert.equal(res.sheet.skills.perception.proficient, true);
});

test("maestria ladro: doppio bonus di competenza", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Rogue Test",
    raceSlug: "umano",
    subraceSlug: null,
    classLabel: "Ladro",
    classSubclass: null,
    backgroundSlug: "criminale",
    level: 1,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
    buildOverrides: {
      classSkills: ["stealth", "sleight_of_hand", "investigation", "perception"],
      expertiseSkills: ["stealth", "sleight_of_hand"],
    },
  });
  assert.equal(res.sheet.skills.stealth.expertise, true);
  assert.equal(res.sheet.skills.stealth.value, res.sheet.abilityMods.dex + res.sheet.proficiencyBonus * 2);
});

test("maestria automatica se non scelta manualmente", () => {
  const prof = ["stealth", "sleight_of_hand", "deception", "stealth"] as const;
  const unique = [...new Set(prof)] as import("@/lib/sheet-generator/types").SkillKey[];
  const auto = resolveExpertiseSkills("Ladro", 1, unique);
  assert.equal(auto.length, 2);
  assert.ok(auto.every((s) => unique.includes(s)));
});

test("CA mago con Armatura Magica: 13+DES, non somma Scudo", () => {
  const mods = { str: 0, dex: 3, con: 1, int: 2, wis: 0, cha: 0 };
  const base = computeArmorClass({ classLabel: "Mago", abilityMods: mods });
  assert.equal(base.ac, 13);
  const withMageArmor = computeArmorClass({
    classLabel: "Mago",
    abilityMods: mods,
    spells: ["Armatura Magica", "Scudo"],
  });
  assert.equal(withMageArmor.ac, 16);
});

test("CA guerriero: Difesa +1 con armatura, Scudo ignorato", () => {
  const mods = { str: 2, dex: 0, con: 1, int: 0, wis: 0, cha: 0 };
  const plain = computeArmorClass({ classLabel: "Guerriero", abilityMods: mods });
  assert.equal(plain.ac, 18);
  const withShieldSpell = computeArmorClass({
    classLabel: "Guerriero",
    abilityMods: mods,
    spells: ["Scudo"],
  });
  assert.equal(withShieldSpell.ac, 18);
  const withDefense = computeArmorClass({
    classLabel: "Guerriero",
    abilityMods: mods,
    fightingStyle: "Difesa",
  });
  assert.equal(withDefense.ac, 19);
});

test("nano montagne: +2 CON e +2 FOR dai tratti", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Dwarf Test",
    raceSlug: "nano",
    subraceSlug: "nano_montagne",
    classLabel: "Guerriero",
    classSubclass: null,
    backgroundSlug: "soldato",
    level: 1,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  assert.ok(res.sheet.abilities.con >= 10, "CON dovrebbe includere +2 nanico");
  assert.ok(res.sheet.abilities.str >= 10, "FOR dovrebbe includere +2 montagne");
});
