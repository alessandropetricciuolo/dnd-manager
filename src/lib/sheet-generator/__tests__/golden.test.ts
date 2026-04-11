import test from "node:test";
import assert from "node:assert/strict";
import { buildGeneratedCharacterSheet } from "@/lib/sheet-generator/build-engine";

test("golden: Chierico 3 Inganno", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Cleric",
    raceSlug: "umano",
    subraceSlug: null,
    classLabel: "Chierico",
    classSubclass: "Dominio dell'Inganno",
    backgroundSlug: "accolito",
    level: 3,
    alignment: "Neutrale Buono",
    age: "30",
    height: "175 cm",
    weight: "70 kg",
    sex: "M",
  });
  assert.equal(res.sheet.classLabel, "Chierico");
  assert.equal(res.sheet.level, 3);
  assert.ok(res.sheet.spellsPrepared >= 1);
  assert.ok(res.sheet.classFeaturesMd.length > 0);
});

test("golden: Bardo 5 Sussurri", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Bard",
    raceSlug: "mezzelfo",
    subraceSlug: null,
    classLabel: "Bardo",
    classSubclass: "Collegio dei Sussurri",
    backgroundSlug: "intrattenitore",
    level: 5,
    alignment: "Caotico Neutrale",
    age: "25",
    height: null,
    weight: null,
    sex: "F",
  });
  assert.equal(res.sheet.classLabel, "Bardo");
  assert.equal(res.sheet.level, 5);
  assert.ok(res.sheet.spells.length > 0);
});

test("golden: Artefice 3", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Artificer",
    raceSlug: "gnomo",
    subraceSlug: "gnomo_rocce",
    classLabel: "Artefice",
    classSubclass: null,
    backgroundSlug: "sapiente",
    level: 3,
    alignment: "Legale Neutrale",
    age: "52",
    height: null,
    weight: null,
    sex: null,
  });
  assert.equal(res.sheet.classLabel, "Artefice");
  assert.equal(res.sheet.level, 3);
  assert.ok(res.sheet.classFeaturesMd.length > 0);
});

test("golden: Ranger 7 Cacciatore", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Ranger",
    raceSlug: "umano",
    subraceSlug: null,
    classLabel: "Ranger",
    classSubclass: "Cacciatore",
    backgroundSlug: "forestiero",
    level: 7,
    alignment: "Neutrale Buono",
    age: "28",
    height: null,
    weight: null,
    sex: "M",
  });
  assert.equal(res.sheet.classLabel, "Ranger");
  const cls = res.sheet.classFeaturesMd.toLowerCase();
  assert.ok(cls.includes("nemico") || cls.includes("esploratore"), "privilegi core ranger");
  assert.ok(cls.includes("stile") || cls.includes("incantesim"), "privilegi classe fino al 7");
  const sub = res.sheet.subclassFeaturesMd ?? "";
  assert.ok(sub.length > 400, "blocco sottoclasse non troncato");
  assert.ok(/preda del cacciatore/i.test(sub));
  assert.ok(/tattiche difensive/i.test(sub));
  assert.ok(!sub.toLowerCase().includes("signore delle bestie"), "fine blocco prima dell'altro archetipo");
});
