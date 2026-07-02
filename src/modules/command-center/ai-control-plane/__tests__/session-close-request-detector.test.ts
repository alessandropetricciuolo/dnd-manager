import test from "node:test";
import assert from "node:assert/strict";

import { detectSessionCloseRequest } from "../session-close-request-detector";

test("detectSessionCloseRequest rileva chiusura sessione esplicita", () => {
  const r = detectSessionCloseRequest("Chiudi la sessione di ieri, tutti presenti, 300 XP");
  assert.ok(r);
  assert.equal(r!.sessionDateHint, "yesterday");
});

test("detectSessionCloseRequest rileva debrief con data", () => {
  const r = detectSessionCloseRequest("Debrief sessione del 15 marzo 2026");
  assert.ok(r);
  assert.equal(r!.sessionDateHint, "2026-03-15");
});

test("detectSessionCloseRequest ignora messaggi non correlati", () => {
  assert.equal(detectSessionCloseRequest("Crea un NPC"), null);
  assert.equal(detectSessionCloseRequest("ok"), null);
});

test("detectSessionCloseRequest rileva fine sessione", () => {
  const r = detectSessionCloseRequest("Concludi la sessione, Gambly è morto");
  assert.ok(r);
});
