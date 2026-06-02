import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import {
  ensureSorcererMinLevel1Spells,
  SORCERER_MIN_LEVEL1_SPELLS,
} from "@/lib/sheet-generator/spell-slot-picker";

test("ensureSorcererMinLevel1Spells aggiunge secondo L1 sostituendo L3", () => {
  const slots = { 1: 4, 2: 3, 3: 2, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const pool = [
    { name: "Scudo", level: 1 },
    { name: "Sonno", level: 1 },
    { name: "Palla di Fuoco", level: 3 },
    { name: "Fulmine", level: 3 },
    { name: "Velocità", level: 3 },
  ];
  const picked = [
    { name: "Palla di Fuoco", level: 3 },
    { name: "Fulmine", level: 3 },
    { name: "Velocità", level: 3 },
    { name: "Scudo", level: 1 },
  ];
  const out = ensureSorcererMinLevel1Spells(picked, pool, 3, slots, 6, true);
  assert.equal(out.filter((s) => s.level === 1).length, SORCERER_MIN_LEVEL1_SPELLS);
  assert.ok(out.some((s) => s.name === "Sonno"));
});

test("stregone L5: almeno 2 incantesimi di 1° livello", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Sorcerer",
    raceSlug: "umano",
    classLabel: "Stregone",
    classSubclass: "Discendenza draconica",
    backgroundSlug: "sapiente",
    level: 5,
    torneoMode: true,
    powerPlayer: true,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  const l1 = res.sheet.spells.filter((s) => s.level === 1);
  assert.ok(
    l1.length >= SORCERER_MIN_LEVEL1_SPELLS,
    `attesi almeno ${SORCERER_MIN_LEVEL1_SPELLS} L1, trovati ${l1.length}: ${res.sheet.spells.map((s) => `${s.name} (L${s.level})`).join(", ")}`
  );
});

test("stregone L2: almeno 2 incantesimi di 1° livello", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Sorcerer",
    raceSlug: "umano",
    classLabel: "Stregone",
    classSubclass: null,
    backgroundSlug: "sapiente",
    level: 2,
    torneoMode: false,
    powerPlayer: false,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  const l1 = res.sheet.spells.filter((s) => s.level === 1);
  assert.ok(l1.length >= SORCERER_MIN_LEVEL1_SPELLS);
});
