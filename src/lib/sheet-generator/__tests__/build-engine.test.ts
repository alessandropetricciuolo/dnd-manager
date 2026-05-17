import test from "node:test";
import assert from "node:assert/strict";
import { buildPointBuy, computeCoreSheet } from "@/lib/sheet-generator/build-engine";

test("point buy respects 27-budget constraints", () => {
  const out = buildPointBuy(["int", "con", "dex", "wis", "cha", "str"]);
  const values = Object.values(out);
  assert.equal(values.length, 6);
  for (const v of values) {
    assert.ok(v >= 8 && v <= 15);
  }
});

test("compute core sheet includes coherent derived stats", () => {
  const core = computeCoreSheet("Guerriero", 3);
  assert.equal(core.proficiencyBonus, 2);
  assert.ok(core.hpMax >= 3);
  assert.ok(typeof core.armorClass === "number");
  assert.ok(core.skills.athletics.proficient);
  assert.equal(core.hitDiceTotal, 3);
});

test("inventario da background (PDF breve)", () => {
  const soldato = computeCoreSheet("Guerriero", 1, "soldato");
  assert.ok(soldato.inventory.some((s) => /distintivo/i.test(s)));
  const accredito = computeCoreSheet("Guerriero", 1, "accolito");
  assert.ok(accredito.inventory.some((s) => /simbolo/i.test(s)));
  const anon = computeCoreSheet("Guerriero", 1, "");
  assert.ok(anon.inventory.some((s) => /zaino/i.test(s)));
});

test("PF = livello × (dado vita + mod CON) con dado al massimo ogni livello", () => {
  const core = computeCoreSheet("Ranger", 7);
  const conMod = core.abilityMods.con;
  assert.equal(core.hpMax, 7 * (10 + conMod));
});
