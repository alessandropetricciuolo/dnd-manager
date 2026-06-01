import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { raceTraitsForQuickManual } from "@/lib/sheet-generator/sheet-mapper";
import { kiPointsForLevel } from "@/lib/sheet-generator/monk-meta";

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
});
