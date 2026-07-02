import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRefinePromptWithSelection,
  isValidPreviewTextSelection,
  resolveRefineUserMessage,
  shouldTreatAsSelectionRefine,
  truncateSelectionPreview,
} from "../preview-text-selection";

const selection = {
  field: "wiki_description" as const,
  selectedText: "Il drago sputa fuoco.",
  sectionLabel: "Descrizione wiki",
};

test("isValidPreviewTextSelection validates length", () => {
  assert.equal(isValidPreviewTextSelection(selection), true);
  assert.equal(isValidPreviewTextSelection({ ...selection, selectedText: "ab" }), false);
  assert.equal(isValidPreviewTextSelection(null), false);
});

test("buildRefinePromptWithSelection embeds excerpt and instruction", () => {
  const prompt = buildRefinePromptWithSelection("rendilo più minaccioso", selection);
  assert.match(prompt, /MODIFICA MIRATA/);
  assert.match(prompt, /Il drago sputa fuoco\./);
  assert.match(prompt, /rendilo più minaccioso/);
});

test("resolveRefineUserMessage passes through without selection", () => {
  assert.equal(resolveRefineUserMessage("solo testo", null), "solo testo");
});

test("shouldTreatAsSelectionRefine respects intent and phase", () => {
  assert.equal(shouldTreatAsSelectionRefine("new", selection, "text"), true);
  assert.equal(shouldTreatAsSelectionRefine("confirm", selection, "text"), false);
  assert.equal(shouldTreatAsSelectionRefine("new", selection, "awaiting_image"), false);
});

test("truncateSelectionPreview shortens long excerpts", () => {
  const long = "a".repeat(200);
  const truncated = truncateSelectionPreview(long, 50);
  assert.equal(truncated.length, 51);
  assert.ok(truncated.endsWith("…"));
});
