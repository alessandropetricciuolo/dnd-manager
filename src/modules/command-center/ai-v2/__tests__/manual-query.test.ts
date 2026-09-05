import test from "node:test";
import assert from "node:assert/strict";
import { isExplicitManualQuestion } from "../manual-query";

test("manual retrieval is explicit and does not dilute ordinary Wiki prompts", () => {
  assert.equal(isExplicitManualQuestion("Secondo il Manuale del Giocatore, come funziona la concentrazione?"), true);
  assert.equal(isExplicitManualQuestion("Crea un NPC locandiere con una storia"), false);
  assert.equal(isExplicitManualQuestion("Genera un mostro per la taverna"), false);
});
