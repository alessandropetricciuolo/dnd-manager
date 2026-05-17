import test from "node:test";
import assert from "node:assert/strict";
import { getSpellCombatTierScore, normalizeSpellNameForTier } from "@/lib/sheet-generator/spell-combat-tier";

test("normalizza accenti e spazi per lookup tier", () => {
  assert.equal(normalizeSpellNameForTier("  Palla di Fuoco "), normalizeSpellNameForTier("palla di fuoco"));
});

test("tier combattimento: scudo sopra trucchetti deboli", () => {
  assert.ok(getSpellCombatTierScore("Scudo") > getSpellCombatTierScore("Amicizia"));
});

test("incantesimo non in mappa ha priorità bassa ma definita", () => {
  assert.ok(getSpellCombatTierScore("Nome Di Fantasia Inesistente") <= 50);
});
