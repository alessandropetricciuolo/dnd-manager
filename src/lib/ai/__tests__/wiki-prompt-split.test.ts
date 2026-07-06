import test from "node:test";
import assert from "node:assert/strict";

import { splitPromptByDash } from "../wiki-text-generator";

test("splitPromptByDash splits on first spaced dash", () => {
  const result = splitPromptByDash("Half-elf - ladro livello 5 - taverna");
  assert.equal(result.retrievalPrompt, "Half-elf");
  assert.equal(result.narrativePrompt, "ladro livello 5 - taverna");
});

test("splitPromptByDash keeps hyphenated single segment intact", () => {
  const result = splitPromptByDash("Half-elf ladro taverna");
  assert.equal(result.retrievalPrompt, "Half-elf ladro taverna");
  assert.equal(result.narrativePrompt, "Half-elf ladro taverna");
});

test("splitPromptByDash handles simple retrieval - narrative pair", () => {
  const result = splitPromptByDash("goblin - boss della caverna");
  assert.equal(result.retrievalPrompt, "goblin");
  assert.equal(result.narrativePrompt, "boss della caverna");
});
