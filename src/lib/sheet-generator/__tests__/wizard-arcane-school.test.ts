import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import {
  createSpellSchoolLookup,
  parseSpellSchoolKeyFromMarkdown,
  parseWizardArcaneSchoolKey,
  wizardSchoolSpellTargets,
} from "@/lib/sheet-generator/wizard-arcane-school";
import { spellCapPerLevel } from "@/lib/sheet-generator/spell-slot-picker";
import { extractPhbSpellMarkdown, preloadPhbMarkdown } from "@/lib/server/phb-spell-excerpt";

test("quote 60/40: scuola arrotondata per eccesso", () => {
  assert.deepEqual(wizardSchoolSpellTargets(8), { school: 5, other: 3 });
  assert.deepEqual(wizardSchoolSpellTargets(5), { school: 3, other: 2 });
  assert.deepEqual(wizardSchoolSpellTargets(1), { school: 1, other: 0 });
});

test("parse scuola da sottoclasse e testo incantesimo", () => {
  assert.equal(parseWizardArcaneSchoolKey("Scuola di Divinazione"), "divinazione");
  assert.equal(parseWizardArcaneSchoolKey("Scuola di Invocazione"), "invocazione");
  const md = "*Divinazione di 2° livello*\n\n**Tempo di Lancio:** 1 azione";
  assert.equal(parseSpellSchoolKeyFromMarkdown(md), "divinazione");
});

test("mago L5 invocazione: 60% invocazione, max 3 spell L3", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Zariel",
    raceSlug: "elfo",
    subraceSlug: null,
    classLabel: "Mago",
    classSubclass: "Scuola di Invocazione",
    backgroundSlug: "sapiente",
    level: 5,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
    powerPlayer: true,
  });

  const leveled = res.sheet.spells.filter((s) => s.level >= 1);
  assert.equal(
    leveled.length,
    res.sheet.spellsPrepared,
    `attesi ${res.sheet.spellsPrepared} incantesimi di livello in scheda`
  );

  const { school: targetSchool, other: targetOther } = wizardSchoolSpellTargets(leveled.length);
  const slots = res.sheet.spellSlots;
  assert.equal(spellCapPerLevel(slots, "Mago").get(3), 3);

  const l3 = leveled.filter((s) => s.level === 3);
  assert.ok(l3.length <= 3, `troppi L3: ${l3.length}`);

  await preloadPhbMarkdown(null);
  const { getSpellSchool } = createSpellSchoolLookup();
  const schoolKey = "invocazione";
  const schoolCount = leveled.filter((s) => getSpellSchool(s.name) === schoolKey).length;
  const otherCount = leveled.length - schoolCount;

  assert.equal(schoolCount, targetSchool, `attesi ${targetSchool} incantesimi di invocazione`);
  assert.equal(otherCount, targetOther, `attesi ${targetOther} incantesimi di altre scuole`);
  assert.ok(schoolCount >= otherCount, "la scuola scelta deve essere la maggioranza");
});

test("Chiaroveggenza è divinazione nel manuale", async () => {
  await preloadPhbMarkdown(null);
  const md = extractPhbSpellMarkdown("Chiaroveggenza");
  assert.equal(parseSpellSchoolKeyFromMarkdown(md), "divinazione");
});
