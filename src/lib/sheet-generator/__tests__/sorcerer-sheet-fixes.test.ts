import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";
import { sorceryPointsForLevel } from "@/lib/sheet-generator/sorcerer-meta";

test("sorceryPointsForLevel livello 5", () => {
  assert.equal(sorceryPointsForLevel(5), 5);
});

test("stregone umano discendenza draconica: sottoclasse senza capitolo gnomo", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Edric Valemont",
    raceSlug: "umano",
    subraceSlug: null,
    classLabel: "Stregone",
    classSubclass: "Discendenza draconica",
    backgroundSlug: "sapiente",
    level: 5,
    torneoMode: true,
    powerPlayer: true,
    alignment: "N",
    age: "35",
    height: "1,80 m",
    weight: "70 kg",
    sex: "M",
  });
  assert.ok(res.sheet);
  const sub = (res.sheet.subclassFeaturesMd ?? "").toLowerCase();
  assert.ok(sub.includes("resilienza draconica") || sub.includes("antenato draconico"));
  assert.ok(!/tratti degli gnomi/i.test(sub));
  assert.ok(!/\bgnomo delle foreste\b/i.test(sub));
  assert.ok(!/mezzelfo/i.test(sub));
});

test("stregone livello 5: privilegi classe indicano punti stregoneria", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Sorcerer",
    raceSlug: "umano",
    classLabel: "Stregone",
    classSubclass: "Discendenza draconica",
    backgroundSlug: "sapiente",
    level: 5,
    torneoMode: true,
    alignment: "N",
    age: "30",
    height: "1,70 m",
    weight: "70 kg",
    sex: "M",
  });
  const cls = res.sheet.classFeaturesMd.toLowerCase();
  assert.match(cls, /punti stregoneria.*\b5\b/);
});

test("stregone livello 5: almeno 2 incantesimi di 1° livello", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Edric Valemont",
    raceSlug: "umano",
    subraceSlug: null,
    classLabel: "Stregone",
    classSubclass: "Discendenza draconica",
    backgroundSlug: "sapiente",
    level: 5,
    torneoMode: true,
    powerPlayer: true,
    alignment: "N",
    age: "35",
    height: "1,80 m",
    weight: "70 kg",
    sex: "M",
  });
  const leveled = res.sheet.spells.filter((s) => s.level >= 1);
  const level1 = leveled.filter((s) => s.level === 1);
  assert.equal(leveled.length, res.sheet.spellsPrepared);
  assert.ok(level1.length >= 2, `attesi almeno 2 incantesimi L1, trovati ${level1.length}: ${leveled.map((s) => `${s.name} L${s.level}`).join(", ")}`);
});
