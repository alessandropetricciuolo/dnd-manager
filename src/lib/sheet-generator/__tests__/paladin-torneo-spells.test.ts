import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { isTorneoCombatSpell } from "@/lib/sheet-generator/spell-torneo-combat";
import { getSpellCombatTierScore } from "@/lib/sheet-generator/spell-combat-tier";

test("paladino L5 torneo: almeno 5 incantesimi preparati in scheda", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Tharok",
    raceSlug: "nano",
    subraceSlug: null,
    classLabel: "Paladino",
    classSubclass: null,
    backgroundSlug: "soldato",
    level: 5,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
    torneoMode: true,
    powerPlayer: true,
  });
  assert.equal(res.sheet.spellsPrepared, 5);
  const leveled = res.sheet.spells.filter((s) => s.level >= 1);
  assert.ok(
    leveled.length >= 5,
    `attesi 5 incantesimi preparati, trovati ${leveled.length}: ${leveled.map((s) => s.name).join(", ")}`
  );
  assert.ok(leveled.some((s) => s.name.toLowerCase().includes("punizione")));
});

test("incantesimi paladino comuni ammessi in torneo", () => {
  for (const name of [
    "Benedizione",
    "Cura Ferite",
    "Scudo della Fede",
    "Punizione Collerica",
    "Punizione Marchiante",
  ]) {
    assert.equal(
      isTorneoCombatSpell(name),
      true,
      `${name} (tier ${getSpellCombatTierScore(name)}) dovrebbe essere da combattimento`
    );
  }
});
