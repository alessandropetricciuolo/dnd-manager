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

test("golden: Bardo 7 tiefling — privilegi di classe completi (non solo tabella)", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Bard",
    raceSlug: "tiefling",
    subraceSlug: null,
    classLabel: "Bardo",
    classSubclass: "Collegio della Sapienza",
    backgroundSlug: "intrattenitore",
    level: 7,
    alignment: "Caotico Buono",
    age: "30",
    height: null,
    weight: null,
    sex: "F",
  });
  assert.equal(res.sheet.classLabel, "Bardo");
  const cls = res.sheet.classFeaturesMd.toLowerCase();
  assert.ok(cls.length > 2000, "privilegi non devono fermarsi al # BARDO duplicato");
  assert.ok(/factotum|ispirazione bardica|canto di riposo|controfascino/i.test(cls));
  assert.ok(!/\|\s*1°\s*\|\s*\+2\s*\|/i.test(res.sheet.classFeaturesMd), "niente tabella slot/livelli nei privilegi");
  assert.ok(!/\btrucchetti conosciuti\b/i.test(cls), "no blocco trucchetti in privilegi classe");
  assert.ok(!/parole taglienti/i.test(cls), "il collegio resta nei privilegi sottoclasse");
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

test("golden: Guerriero 1 — un solo stile di combattimento nei privilegi di classe", async () => {
  const input = {
    characterName: "Test Guerriero",
    raceSlug: "umano",
    subraceSlug: null,
    classLabel: "Guerriero",
    classSubclass: null,
    backgroundSlug: "soldato",
    level: 1,
    alignment: "Neutrale Buono",
    age: "22",
    height: null,
    weight: null,
    sex: "M",
  } as const;
  const res = await buildGeneratedCharacterSheet(input);
  assert.equal(res.sheet.classLabel, "Guerriero");
  const cls = res.sheet.classFeaturesMd;
  assert.ok(/stile di combattimento/i.test(cls), "blocco introduzione stile");
  const styleHeadingRe =
    /^### (COMBATTERE CON ARMI POSSENTI|COMBATTERE CON DUE ARMI|DIFESA|DUELLARE|PROTEZIONE|TIRO)\s*$/gim;
  const matches = [...cls.matchAll(styleHeadingRe)];
  assert.equal(matches.length, 1, "una sola opzione di stile (non l’intero elenco PHB)");
  const again = await buildGeneratedCharacterSheet(input);
  assert.equal(again.sheet.classFeaturesMd, cls, "stesso seed ⇒ stesso stile");
});

test("golden: Paladino 3 — un solo stile di combattimento nei privilegi di classe", async () => {
  const input = {
    characterName: "Test Paladino Stile",
    raceSlug: "umano",
    subraceSlug: null,
    classLabel: "Paladino",
    classSubclass: null,
    backgroundSlug: "soldato",
    level: 3,
    alignment: "Legale Buono",
    age: "28",
    height: null,
    weight: null,
    sex: "M",
  } as const;
  const res = await buildGeneratedCharacterSheet(input);
  assert.equal(res.sheet.classLabel, "Paladino");
  const cls = res.sheet.classFeaturesMd;
  assert.ok(/stile di combattimento/i.test(cls));
  const paladinStylesRe =
    /^### (COMBATTERE CON ARMI POSSENTI|DIFESA|DUELLARE|PROTEZIONE)\s*$/gim;
  assert.equal([...cls.matchAll(paladinStylesRe)].length, 1, "solo un’opzione tra quelle PHB del paladino");
  assert.ok(!/^### COMBATTERE CON DUE ARMI\s*$/im.test(cls));
  assert.ok(!/^### TIRO\s*$/im.test(cls));
});

test("golden: Guerriero 8 Cavaliere Mistico — incantesimi da mago dal 3° livello", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test EK",
    raceSlug: "umano",
    subraceSlug: null,
    classLabel: "Guerriero",
    classSubclass: "Cavaliere Mistico",
    backgroundSlug: "soldato",
    level: 8,
    alignment: "Neutrale Buono",
    age: "22",
    height: null,
    weight: null,
    sex: "M",
  });
  assert.equal(res.sheet.spellcastingAbility, "int");
  assert.ok(res.sheet.spells.length >= 5);
  assert.ok(res.sheet.spellSlots[1] >= 4);
  assert.ok(typeof res.sheet.spellSaveDc === "number");
});

test("golden: Paladino 7 Giuramento di Vendetta — sottoclasse senza spillover sul manuale", async () => {
  const res = await buildGeneratedCharacterSheet({
    characterName: "Test Paladin",
    raceSlug: "mezzorco",
    subraceSlug: null,
    classLabel: "Paladino",
    classSubclass: "Giuramento di Vendetta",
    backgroundSlug: "soldato",
    level: 7,
    alignment: "Legale Neutrale",
    age: "32",
    height: null,
    weight: null,
    sex: "M",
  });
  assert.equal(res.sheet.classLabel, "Paladino");
  const sub = res.sheet.subclassFeaturesMd ?? "";
  assert.ok(sub.length > 200, "blocco sottoclasse presente");
  assert.ok(sub.length < 20_000, "non deve includere capitoli successivi (# Ranger, …)");
  assert.ok(/giuramento di vendetta|dettami di vendetta|vendicatore implacabile/i.test(sub));
  assert.ok(!/cacciatori letali|nemico prescelto/i.test(sub), "non deve spillare sulla sezione Ranger");
});
