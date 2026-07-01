import test from "node:test";
import assert from "node:assert/strict";

import { detectConversationIntent } from "../conversation-intent";

test("detectConversationIntent without pending is always new", () => {
  assert.equal(detectConversationIntent("conferma", false), "new");
  assert.equal(detectConversationIntent("crea un npc", false), "new");
});

test("detectConversationIntent confirm patterns", () => {
  assert.equal(detectConversationIntent("conferma", true), "confirm");
  assert.equal(detectConversationIntent("ok vai", true), "confirm");
  assert.equal(detectConversationIntent("applica", true), "confirm");
});

test("detectConversationIntent reject patterns", () => {
  assert.equal(detectConversationIntent("annulla", true), "reject");
  assert.equal(detectConversationIntent("no grazie", true), "reject");
});

test("detectConversationIntent refine for other messages with pending", () => {
  assert.equal(
    detectConversationIntent("rendilo più burbero e aggiungi una cicatrice", true),
    "refine"
  );
});
