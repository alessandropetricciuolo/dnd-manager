import test from "node:test";
import assert from "node:assert/strict";

import { detectCharacterCreateRequest } from "../character-request-detector";

test("detectCharacterCreateRequest distinguishes PG from NPC", () => {
  const pg =
    "crea il personaggio giocatore Marco, ladro mezzelfo livello 3";
  const detected = detectCharacterCreateRequest(pg);
  assert.ok(detected);
  assert.equal(detected!.name, "Marco");
  assert.equal(detected!.characterClass, "Ladro");
  assert.equal(detected!.level, 3);
  assert.equal(detectCharacterCreateRequest("crea npc Gambly halfling"), null);
});

test("detectCharacterCreateRequest returns null for short text", () => {
  assert.equal(detectCharacterCreateRequest("ciao"), null);
});
