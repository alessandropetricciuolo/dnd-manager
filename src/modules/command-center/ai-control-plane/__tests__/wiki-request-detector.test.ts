import test from "node:test";
import assert from "node:assert/strict";

import {
  detectWikiCreateRequest,
  detectWikiVisibilityFromPrompt,
  extractNpcBuildParams,
  hasNpcMechanicsParams,
  resolveWikiVisibilityForAssistant,
} from "../wiki-request-detector";

test("detectWikiCreateRequest from generami gambly prompt", () => {
  const msg =
    "generami gambly, è il pescivendolo di portico. è un halfling barbaro. Un tipo estremamente rumoroso";
  const detected = detectWikiCreateRequest(msg);
  assert.ok(detected);
  assert.equal(detected!.title, "Gambly");
  assert.equal(detected!.entityType, "npc");
  assert.equal(detected!.extraParams.npcRace, "Halfling");
  assert.equal(detected!.extraParams.npcClass, "Barbaro");
});

test("extractNpcBuildParams from trait-only message", () => {
  const params = extractNpcBuildParams("halfling piedelesto barbaro");
  assert.equal(params.npcRace, "Halfling");
  assert.equal(params.npcClass, "Barbaro");
  assert.equal(hasNpcMechanicsParams(params), false);
});

test("detectWikiCreateRequest returns null for short unrelated text", () => {
  assert.equal(detectWikiCreateRequest("ciao"), null);
});

test("resolveWikiVisibilityForAssistant defaults to secret", () => {
  assert.equal(resolveWikiVisibilityForAssistant("generami gambly halfling", "generami gambly"), "secret");
});

test("detectWikiVisibilityFromPrompt recognizes public and secret hints", () => {
  assert.equal(detectWikiVisibilityFromPrompt("rendilo pubblico per i giocatori"), "public");
  assert.equal(detectWikiVisibilityFromPrompt("visibilità segreta solo gm"), "secret");
  assert.equal(detectWikiVisibilityFromPrompt("generami un npc"), null);
});
