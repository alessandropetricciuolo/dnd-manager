import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { buildQuickManualSections } from "@/lib/sheet-generator/quick-manual-builder";
import { buildMonkKiManualBody } from "@/lib/sheet-generator/monk-ki-phb";
import { raceTraitsForQuickManual } from "@/lib/sheet-generator/sheet-mapper";
import { kiPointsForLevel } from "@/lib/sheet-generator/monk-meta";
import { preloadPhbMarkdown } from "@/lib/server/phb-spell-excerpt";

test("kiPointsForLevel livello 5", () => {
  assert.equal(kiPointsForLevel(5), 5);
});

test("nano montagne: tratti razza senza nano delle colline", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Thorim Pietrasalda",
    raceSlug: "nano",
    subraceSlug: "nano_montagne",
    classLabel: "Monaco",
    classSubclass: "Via della Mano Aperta",
    backgroundSlug: "eremita",
    level: 5,
    torneoMode: true,
    alignment: "LN",
    age: "120",
    height: "1,35 m",
    weight: "65 kg",
    sex: "M",
  });
  const raceBody = raceTraitsForQuickManual(
    res.sheet.raceTraitsMd,
    res.sheet.subraceTraitsMd ?? ""
  ).toLowerCase();
  assert.ok(raceBody.includes("montagn") || raceBody.includes("armature naniche"));
  assert.ok(!/nano delle colline/i.test(raceBody));
  assert.ok(!/robustezza nanica/i.test(raceBody));
});

test("monaco livello 5: privilegi classe indicano punti ki", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Thorim Pietrasalda",
    raceSlug: "nano",
    subraceSlug: "nano_montagne",
    classLabel: "Monaco",
    classSubclass: "Via della Mano Aperta",
    backgroundSlug: "eremita",
    level: 5,
    torneoMode: true,
    alignment: "LN",
    age: "120",
    height: "1,35 m",
    weight: "65 kg",
    sex: "M",
  });
  const cls = res.sheet.classFeaturesMd.toLowerCase();
  assert.match(cls, /punti ki.*\b5\b/);
  assert.match(cls, /difesa paziente/);
  assert.match(cls, /passo del vento/);
  assert.match(cls, /raffica di colpi/);
  assert.match(cls, /colpo stordente/);
});

test("monaco L5: manuale rapido con sezione privilegi del ki", async () => {
  await preloadPhbMarkdown(null);
  const kiBody = buildMonkKiManualBody(5);
  assert.ok(kiBody && kiBody.length > 400);
  assert.match(kiBody.toLowerCase(), /difesa paziente/);
  assert.match(kiBody.toLowerCase(), /colpo stordente/);

  const res = await buildGeneratedCharacterSheet({
    characterName: "Urgath Stonefist",
    raceSlug: "nano",
    subraceSlug: "nano_montagne",
    classLabel: "Monaco",
    classSubclass: "Via della Mano Aperta",
    backgroundSlug: "soldato",
    level: 5,
    torneoMode: true,
  });
  const sections = await buildQuickManualSections(res.sheet);
  const kiSec = sections.find((s) => s.title === "Privilegi del Ki");
  assert.ok(kiSec, "sezione ki nel manuale rapido");
  assert.match(kiSec.body.toLowerCase(), /difesa paziente/);
  assert.match(kiSec.body.toLowerCase(), /raffica di colpi/);
  const classSec = sections.find((s) => s.title.includes("Privilegi di classe"));
  const kiCount = (classSec?.body.match(/punti ki disponibili/gi) ?? []).length;
  assert.ok(kiCount <= 1, "riga punti ki non duplicata nei privilegi di classe");
});
