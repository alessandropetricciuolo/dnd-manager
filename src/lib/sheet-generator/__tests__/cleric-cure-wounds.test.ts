import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { isCureWoundsSpell } from "@/lib/sheet-generator/spell-torneo-combat";

test("isCureWoundsSpell riconosce Cura ferite", () => {
  assert.equal(isCureWoundsSpell("Cura Ferite"), true);
  assert.equal(isCureWoundsSpell("cura ferite"), true);
  assert.equal(isCureWoundsSpell("Benedizione"), false);
});

test("chierico L5 torneo: include sempre Cura ferite", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Cleric",
    raceSlug: "umano",
    classLabel: "Chierico",
    classSubclass: "Dominio della Vita",
    backgroundSlug: "accolito",
    level: 5,
    torneoMode: true,
    powerPlayer: true,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  const leveled = res.sheet.spells.filter((s) => s.level >= 1);
  assert.ok(
    leveled.some((s) => isCureWoundsSpell(s.name)),
    `manca Cura ferite: ${leveled.map((s) => s.name).join(", ")}`
  );
});

test("chierico L3 senza torneo: include sempre Cura ferite", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Cleric",
    raceSlug: "umano",
    classLabel: "Chierico",
    classSubclass: null,
    backgroundSlug: "accolito",
    level: 3,
    torneoMode: false,
    powerPlayer: false,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  const leveled = res.sheet.spells.filter((s) => s.level >= 1);
  assert.ok(leveled.some((s) => isCureWoundsSpell(s.name)));
});
