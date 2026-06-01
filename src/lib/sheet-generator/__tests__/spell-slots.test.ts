import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCharacterSpellcastingMeta,
  spellSlotsRecordToEntries,
} from "@/lib/sheet-generator/spell-slots";

test("Paladino livello 5: slot mezzi caster", () => {
  const meta = computeCharacterSpellcastingMeta({
    classLabel: "Paladino",
    classSubclass: null,
    level: 5,
  });
  assert.ok(meta);
  assert.deepEqual(meta!.spellSlots, [
    { level: 1, count: 4 },
    { level: 2, count: 2 },
  ]);
});

test("record slot → elenco livello/conteggio", () => {
  assert.deepEqual(spellSlotsRecordToEntries({ 1: 2, 2: 0, 3: 1 }), [
    { level: 1, count: 2 },
    { level: 3, count: 1 },
  ]);
});
