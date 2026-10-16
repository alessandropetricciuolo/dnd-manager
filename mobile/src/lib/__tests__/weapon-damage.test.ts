import test from "node:test";
import assert from "node:assert/strict";
import { parseWeaponDamage } from "../weapon-damage";

test("parses a single d8 as one eight-sided die", () => {
  assert.deepEqual(parseWeaponDamage("1d8"), { diceCount: 1, die: "d8", modifier: 0 });
});

test("preserves multi-die count and numeric modifier", () => {
  assert.deepEqual(parseWeaponDamage("2d6 + 3"), { diceCount: 2, die: "d6", modifier: 3 });
});

test("derives a named ability modifier from the persisted score", () => {
  assert.deepEqual(parseWeaponDamage("1d8 + FOR", { str: 16 }), { diceCount: 1, die: "d8", modifier: 3 });
});

test("uses a persisted exact modifier when available", () => {
  assert.deepEqual(parseWeaponDamage("2d6 + DES", { dex: 14 }, { dex: 4 }), { diceCount: 2, die: "d6", modifier: 4 });
});

test("does not invent a missing ability modifier or accept incomplete formulas", () => {
  assert.equal(parseWeaponDamage("1d8 + FOR"), null);
  assert.equal(parseWeaponDamage("1d8 + PB"), null);
  assert.deepEqual(parseWeaponDamage("d8 + 3"), { diceCount: 1, die: "d8", modifier: 3 });
});
