import test from "node:test";
import assert from "node:assert/strict";

import {
  formatNpcMechanicsQuestion,
  hasNpcMechanicsParams,
  listMissingNpcMechanics,
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
