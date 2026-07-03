import test from "node:test";
import assert from "node:assert/strict";

import {
  extractMarkdownH1,
  isPlaceholderCharacterName,
  isPlaceholderMissionTitle,
  isPlaceholderWikiTitle,
  resolveWikiTitleFromDescription,
  syncMarkdownTitle,
  wikiAutoNameInstruction,
} from "@/lib/ai/contextual-names";

test("isPlaceholderWikiTitle detects generic placeholders", () => {
  assert.equal(isPlaceholderWikiTitle("Nuovo NPC"), true);
  assert.equal(isPlaceholderWikiTitle("Gambly"), false);
});

test("isPlaceholderCharacterName detects generic placeholders", () => {
  assert.equal(isPlaceholderCharacterName("Nuovo personaggio"), true);
  assert.equal(isPlaceholderCharacterName("Lyra"), false);
});

test("isPlaceholderMissionTitle detects generic placeholders", () => {
  assert.equal(isPlaceholderMissionTitle("Nuova missione"), true);
  assert.equal(isPlaceholderMissionTitle("L'anello perduto"), false);
});

test("resolveWikiTitleFromDescription extracts markdown h1", () => {
  const description = "[NARRATIVA]\n# Gambly il Pescivendolo\n\nRumoroso halfling.";
  assert.equal(resolveWikiTitleFromDescription(description, "Nuovo NPC"), "Gambly il Pescivendolo");
});

test("extractMarkdownH1 reads heading after narrativa tag", () => {
  assert.equal(extractMarkdownH1("[NARRATIVA]\n# Porto Antico"), "Porto Antico");
});

test("syncMarkdownTitle updates first heading", () => {
  const updated = syncMarkdownTitle("# Vecchio\n\nTesto", "Gambly");
  assert.match(updated, /^# Gambly/m);
});

test("wikiAutoNameInstruction mentions campaign context", () => {
  assert.match(wikiAutoNameInstruction("npc"), /campagna/i);
});
