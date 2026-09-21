import test from "node:test";
import assert from "node:assert/strict";
import {
  applyLevelAbilityIncreases,
  buildPointBuy,
  computeCoreSheet,
} from "@/lib/sheet-generator/build-engine";

test("point buy respects 27-budget constraints", () => {
  const out = buildPointBuy(["int", "con", "dex", "wis", "cha", "str"]);
  const values = Object.values(out);
  assert.equal(values.length, 6);
  for (const v of values) {
    assert.ok(v >= 8 && v <= 15);
  }
});

test("standard point buy has at most one negative modifier", () => {
  const out = buildPointBuy(["int", "con", "dex"]);
  assert.ok(Object.values(out).filter((score) => score < 10).length <= 1);
});

test("power player point buy keeps the min-max spread", () => {
  const out = buildPointBuy(["int", "con", "dex"], true);
  assert.ok(Object.values(out).filter((score) => score < 10).length > 1);
  assert.equal(out.int, 15);
  assert.equal(out.con, 15);
});

test("balanced bard prioritizes wisdom over strength after class abilities", () => {
  const out = buildPointBuy(["cha", "dex", "con"]);
  assert.deepEqual(out, { str: 8, dex: 14, con: 13, int: 10, wis: 12, cha: 15 });
});

test("bard level 4 splits ASI across odd primary and secondary scores", () => {
  const dwarfBard = { str: 10, dex: 14, con: 15, int: 10, wis: 12, cha: 15 } as const;
  const out = applyLevelAbilityIncreases(dwarfBard, 4, ["cha", "dex", "con"], "Bardo");
  assert.equal(out.cha, 16);
  assert.equal(out.con, 16);
});

test("bard level 8 then raises charisma from 16 to 18", () => {
  const dwarfBard = { str: 10, dex: 14, con: 15, int: 10, wis: 12, cha: 15 } as const;
  const out = applyLevelAbilityIncreases(dwarfBard, 8, ["cha", "dex", "con"], "Bardo");
  assert.equal(out.cha, 18);
  assert.equal(out.con, 16);
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
