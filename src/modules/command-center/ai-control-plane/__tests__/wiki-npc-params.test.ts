import test from "node:test";
import assert from "node:assert/strict";

import {
  civilianNpcPromptGuide,
  extractNpcBuildParams,
  formatNpcMechanicsQuestion,
  hasNpcMechanicsParams,
  listMissingNpcMechanics,
  normalizeNpcCivilianClass,
} from "@/lib/ai/wiki-npc-params";

test("listMissingNpcMechanics lists only absent fields", () => {
  assert.deepEqual(listMissingNpcMechanics({ npcRace: "Halfling", npcClass: "Barbaro" }), [
    "livello",
  ]);
});

test("formatNpcMechanicsQuestion mentions missing level", () => {
  const text = formatNpcMechanicsQuestion({ npcRace: "Halfling", npcClass: "Barbaro" });
  assert.match(text, /livello/i);
  assert.match(text, /Halfling/i);
});

test("hasNpcMechanicsParams true when all three present", () => {
  assert.equal(
    hasNpcMechanicsParams({ npcRace: "Halfling", npcClass: "Ladro", npcLevel: "4" }),
    true
  );
});

test("normalizeNpcCivilianClass recognizes DMG NPC classes", () => {
  assert.equal(normalizeNpcCivilianClass("Popolano"), "Popolano");
  assert.equal(normalizeNpcCivilianClass("popolana"), "Popolano");
  assert.equal(normalizeNpcCivilianClass("Esperto"), "Esperto");
  assert.equal(normalizeNpcCivilianClass("Aristocratico"), "Aristocratico");
  assert.equal(normalizeNpcCivilianClass("Adepto"), "Adepto");
  assert.equal(normalizeNpcCivilianClass("Combattente"), "Combattente");
});

test("normalizeNpcCivilianClass null for adventurer classes and free text", () => {
  assert.equal(normalizeNpcCivilianClass("Barbaro"), null);
  assert.equal(normalizeNpcCivilianClass("Mago"), null);
  assert.equal(normalizeNpcCivilianClass(""), null);
  assert.equal(normalizeNpcCivilianClass("Esperto minatore"), null);
});

test("civilianNpcPromptGuide steers statblock and appearance", () => {
  const guide = civilianNpcPromptGuide("Popolano");
  assert.match(guide, /CLASSE DI PNG/i);
  assert.match(guide, /cameriera|contadino/i);
  assert.match(guide, /NIENTE armi da guerra/i);
});

test("extractNpcBuildParams parses civilian NPC classes from chat text", () => {
  assert.equal(extractNpcBuildParams("una popolana halfling livello 1").npcClass, "Popolano");
  assert.equal(extractNpcBuildParams("aristocratico umano di livello 3").npcClass, "Aristocratico");
  assert.equal(extractNpcBuildParams("classe esperto livello 2").npcClass, "Esperto");
  // "esperto" come aggettivo generico non deve scattare
  assert.equal(extractNpcBuildParams("un fabbro esperto nel suo mestiere").npcClass, undefined);
});
