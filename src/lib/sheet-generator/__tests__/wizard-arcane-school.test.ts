import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { mapGeneratedSheetToPdfFields } from "@/lib/sheet-generator/sheet-mapper";
import {
  createSpellSchoolLookup,
  parseSpellSchoolKeyFromMarkdown,
  parseWizardArcaneSchoolKey,
  wizardSchoolSpellTargets,
} from "@/lib/sheet-generator/wizard-arcane-school";
import { spellCapPerLevel } from "@/lib/sheet-generator/spell-slot-picker";
import { extractPhbSpellMarkdown, preloadPhbMarkdown } from "@/lib/server/phb-spell-excerpt";

test("quote scuola mago: solo la scuola scelta nel wizard", () => {
  assert.deepEqual(wizardSchoolSpellTargets(8), { school: 8, other: 0 });
  assert.deepEqual(wizardSchoolSpellTargets(5), { school: 5, other: 0 });
  assert.deepEqual(wizardSchoolSpellTargets(1), { school: 1, other: 0 });
});

test("parse scuola da sottoclasse e testo incantesimo", () => {
  assert.equal(parseWizardArcaneSchoolKey("Scuola di Divinazione"), "divinazione");
  assert.equal(parseWizardArcaneSchoolKey("Scuola di Invocazione"), "invocazione");
  assert.equal(parseWizardArcaneSchoolKey("Invocazione"), "invocazione");
  const md = "*Divinazione di 2° livello*\n\n**Tempo di Lancio:** 1 azione";
  assert.equal(parseSpellSchoolKeyFromMarkdown(md), "divinazione");
  const cantripMd = "*Trucchetto di Invocazione*\n\n**Tempo di Lancio:** 1 azione";
  assert.equal(parseSpellSchoolKeyFromMarkdown(cantripMd), "invocazione");
});

test("mago L5 invocazione: solo incantesimi della scuola scelta, max 3 spell L3", async () => {
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
  const spellsWithOtherSchool = res.sheet.spells.filter((s) => getSpellSchool(s.name) !== schoolKey);
  const fullText = res.sheet.spells.map((s) => `${s.name}\n${s.fullTextMd ?? ""}`).join("\n\n");
  const fields = mapGeneratedSheetToPdfFields(res.sheet);
  const featuresMain = String(fields.Features_Main ?? "");

  assert.equal(targetSchool, leveled.length, "tutti gli incantesimi di livello devono essere della scuola scelta");
  assert.equal(targetOther, 0, "non devono esserci incantesimi di altre scuole");
  assert.equal(
    spellsWithOtherSchool.length,
    0,
    `altre scuole trovate: ${spellsWithOtherSchool.map((s) => s.name).join(", ")}`
  );
  assert.match(res.sheet.subclassFeaturesMd ?? "", /scuola di invocazione/i);
  assert.doesNotMatch(res.sheet.subclassFeaturesMd ?? "", /scuola di necromanzia/i);
  assert.doesNotMatch(fullText, /Necromanzia/i);
  assert.match(featuresMain, /invocatore sapiente|plasmare incantesimi/i);
  assert.doesNotMatch(featuresMain, /necromanzia|negromanzia|necromante sapiente|raccolto macabro/i);
});

test("Chiaroveggenza è divinazione nel manuale", async () => {
  await preloadPhbMarkdown(null);
  const md = extractPhbSpellMarkdown("Chiaroveggenza");
  assert.equal(parseSpellSchoolKeyFromMarkdown(md), "divinazione");
});
