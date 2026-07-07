import test from "node:test";
import assert from "node:assert/strict";

import { detectConversationIntent, isWikiImageRequestMessage } from "../conversation-intent";

test("isWikiImageRequestMessage detects portrait commands", () => {
  assert.equal(isWikiImageRequestMessage("immagine"), true);
  assert.equal(isWikiImageRequestMessage("genera immagine"), true);
  assert.equal(isWikiImageRequestMessage("ritratto"), true);
  assert.equal(isWikiImageRequestMessage("rendilo più burbero"), false);
});

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

test("detectConversationIntent image decision phase", () => {
  assert.equal(detectConversationIntent("sì", true, "awaiting_image"), "image_yes");
  assert.equal(detectConversationIntent("genera immagine", true, "awaiting_image"), "image_yes");
  assert.equal(detectConversationIntent("no", true, "awaiting_image"), "image_no");
  assert.equal(detectConversationIntent("senza immagine", true, "awaiting_image"), "image_no");
  assert.equal(detectConversationIntent("annulla", true, "awaiting_image"), "reject");
});

test("detectConversationIntent avatar decision phase", () => {
  assert.equal(detectConversationIntent("sì", true, "awaiting_avatar"), "image_yes");
  assert.equal(detectConversationIntent("no", true, "awaiting_avatar"), "image_no");
  assert.equal(detectConversationIntent("conferma", true, "awaiting_avatar"), "confirm");
});

test("detectConversationIntent architect decision phase", () => {
  assert.equal(detectConversationIntent("sì", true, "awaiting_architect"), "architect_yes");
  assert.equal(detectConversationIntent("no", true, "awaiting_architect"), "architect_no");
  assert.equal(detectConversationIntent("annulla", true, "awaiting_architect"), "reject");
});

test("detectConversationIntent close info phase", () => {
  assert.equal(detectConversationIntent("conferma", true, "awaiting_close_info"), "confirm");
  assert.equal(detectConversationIntent("Marco assente", true, "awaiting_close_info"), "refine");
  assert.equal(detectConversationIntent("annulla", true, "awaiting_close_info"), "reject");
});

test("detectConversationIntent campaign type phase treats messages as refine", () => {
  assert.equal(detectConversationIntent("oneshot", true, "awaiting_campaign_type"), "refine");
  assert.equal(detectConversationIntent("2", true, "awaiting_campaign_type"), "refine");
  assert.equal(detectConversationIntent("annulla", true, "awaiting_campaign_type"), "reject");
});
