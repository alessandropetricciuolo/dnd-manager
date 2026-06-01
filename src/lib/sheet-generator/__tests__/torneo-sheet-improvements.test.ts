import test from "node:test";
import assert from "node:assert/strict";
import { computeRealisticArmorClass } from "@/lib/sheet-generator/armor-class";
import {
  pickLeveledSpellsSlotAware,
  spellCapPerLevel,
} from "@/lib/sheet-generator/spell-slot-picker";

test("CA Barbaro: 10 + DES + COS senza armatura fissa", () => {
  const r = computeRealisticArmorClass("Barbaro", { str: 2, dex: 2, con: 2, int: 0, wis: 0, cha: 0 });
  assert.equal(r.ac, 14);
});

test("CA Guerriero: cotta di maglia + scudo", () => {
  const r = computeRealisticArmorClass("Guerriero", { str: 2, dex: 0, con: 1, int: 0, wis: 0, cha: 0 });
  assert.equal(r.armorItem, "cotta di maglia");
  assert.equal(r.shieldItem, "scudo");
  assert.equal(r.ac, 18);
});

test("cap incantesimi conosciuti: lv5 con 2 slot L3 → max 2 spell L3", () => {
  const slots = { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const caps = spellCapPerLevel(slots, "Stregone");
  assert.equal(caps.get(3), 2);
});

test("pick slot-aware: stregone lv5 non riempie tutto di L3", () => {
  const entries = [
    { name: "Palla di Fuoco", level: 3 },
    { name: "Fulmine", level: 3 },
    { name: "Velocità", level: 3 },
    { name: "Scudo", level: 1 },
    { name: "Sonno", level: 1 },
    { name: "Armatura Magica", level: 1 },
    { name: "Ragnatela", level: 2 },
    { name: "Invisibilità", level: 2 },
  ];
  const slots = { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const picked = pickLeveledSpellsSlotAware(entries, 6, 3, slots, "Stregone", true);
  const l3 = picked.filter((p) => p.level === 3).length;
  assert.ok(l3 <= 2, `attesi max 2 incantesimi L3, trovati ${l3}`);
  assert.ok(picked.some((p) => p.level === 1));
});
