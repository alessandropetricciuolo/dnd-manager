import test from "node:test";
import assert from "node:assert/strict";
import {
  detectThirdCasterSubclass,
  detectWildMagicBarbarianPath,
  getThirdCasterWizardSpellcasting,
  spellSlotsRecordFromThirdCasterTiers,
} from "@/lib/sheet-generator/third-caster-subclass";

test("Cavaliere Mistico livello 3: INT, slot e trucchetti", () => {
  const kind = detectThirdCasterSubclass("Guerriero", "Cavaliere Mistico");
  assert.equal(kind, "eldritch-knight");
  const tc = getThirdCasterWizardSpellcasting(kind, 3);
  assert.ok(tc);
  assert.equal(tc!.cantripsKnown, 2);
  assert.equal(tc!.spellsKnown, 3);
  assert.deepEqual(tc!.slotsTiers, [2, 0, 0, 0]);
});

test("Mistificatore livello 10: più trucchetti del Cavaliere", () => {
  const ek = getThirdCasterWizardSpellcasting(
    detectThirdCasterSubclass("Guerriero", "Cavaliere Mistico"),
    10
  );
  const at = getThirdCasterWizardSpellcasting(detectThirdCasterSubclass("Ladro", "Mistificatore Arcano"), 10);
  assert.ok(ek && at);
  assert.equal(ek!.cantripsKnown, 3);
  assert.equal(at!.cantripsKnown, 4);
});

test("livelli 1–2: nessun incantatore terzo", () => {
  assert.equal(getThirdCasterWizardSpellcasting("eldritch-knight", 2), null);
});

test("record slot compatibile con ResolvedRules", () => {
  const rec = spellSlotsRecordFromThirdCasterTiers([4, 3, 2, 0]);
  assert.equal(rec[1], 4);
  assert.equal(rec[3], 2);
  assert.equal(rec[9], 0);
});

test("Cammino della Magia Selvaggia: barbaro", () => {
  assert.ok(detectWildMagicBarbarianPath("Barbaro", "Cammino della Magia Selvaggia"));
  assert.ok(!detectWildMagicBarbarianPath("Guerriero", "Cammino della Magia Selvaggia"));
});
