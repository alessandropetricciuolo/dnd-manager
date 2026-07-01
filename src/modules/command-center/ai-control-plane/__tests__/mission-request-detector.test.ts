import test from "node:test";
import assert from "node:assert/strict";

import { detectMissionCreateRequest } from "../mission-request-detector";

test("detectMissionCreateRequest from natural language", () => {
  const msg =
    "aggiungi una missione grado B: Recuperare l'anello dal cimitero, committente gilda dei mercanti, ubicazione cimitero nord, paga 200 mo";
  const detected = detectMissionCreateRequest(msg);
  assert.ok(detected);
  assert.equal(detected!.grade, "B");
  assert.match(detected!.title, /Recuperare l'anello/i);
  assert.match(detected!.committente, /mercanti/i);
});

test("detectMissionCreateRequest returns null for unrelated text", () => {
  assert.equal(detectMissionCreateRequest("ciao"), null);
});
