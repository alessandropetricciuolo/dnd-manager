import test from "node:test";
import assert from "node:assert/strict";
import { deriveAssistantThreadTitle } from "../thread-title";

test("titolo automatico normalizza e tronca il primo messaggio", () => {
  assert.equal(deriveAssistantThreadTitle("  Crea   un NPC\nper Eldaria "), "Crea un NPC per Eldaria");
  assert.equal(deriveAssistantThreadTitle("x".repeat(200)).length, 120);
  assert.equal(deriveAssistantThreadTitle("   "), "Nuova conversazione");
});
