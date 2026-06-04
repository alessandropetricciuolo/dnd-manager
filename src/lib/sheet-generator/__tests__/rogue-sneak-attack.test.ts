import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import {
  sneakAttackClassFeatureLine,
  sneakAttackDiceForLevel,
} from "@/lib/sheet-generator/rogue-meta";
import { mapGeneratedSheetToPdfFields } from "@/lib/sheet-generator/sheet-mapper";

test("sneakAttackDiceForLevel tabella PHB", () => {
  assert.equal(sneakAttackDiceForLevel(1), 1);
  assert.equal(sneakAttackDiceForLevel(2), 1);
  assert.equal(sneakAttackDiceForLevel(3), 2);
  assert.equal(sneakAttackDiceForLevel(5), 3);
  assert.equal(sneakAttackDiceForLevel(11), 6);
  assert.equal(sneakAttackDiceForLevel(20), 10);
});

test("ladro L5: privilegi classe con Attacco Furtivo 3d6", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Shadow",
    raceSlug: "elfo",
    subraceSlug: null,
    classLabel: "Ladro",
    classSubclass: "Ladro Assassino",
    backgroundSlug: "criminale",
    level: 5,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
    torneoMode: true,
  });
  assert.match(res.sheet.classFeaturesMd, /Attacco Furtivo:\s*3d6/i);
  assert.equal(sneakAttackClassFeatureLine(5), "• Attacco Furtivo: 3d6 danni extra (1 volta per turno al livello attuale).");

  const pdf = mapGeneratedSheetToPdfFields(res.sheet);
  const classBlock = String(pdf.Features_Main ?? "");
  assert.match(classBlock, /Attacco Furtivo.*3d6/i);
});
