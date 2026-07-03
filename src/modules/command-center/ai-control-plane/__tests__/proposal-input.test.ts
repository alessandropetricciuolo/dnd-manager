import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeProposalInput,
  preparePendingInputForExecute,
} from "../proposal-input";

test("normalizeProposalInput prefers active campaign filter", () => {
  const input = normalizeProposalInput(
    "character.create",
    { campaignId: "old-campaign-id", name: "Lyra" },
    "active-campaign-id"
  );
  assert.equal(input.campaignId, "active-campaign-id");
});

test("preparePendingInputForExecute merges sheet from characterMeta", () => {
  const prepared = preparePendingInputForExecute(
    {
      action_name: "character.create",
      input: { name: "Lyra" },
      rationale: null,
      preview_payload: {},
      characterMeta: {
        userPrompt: "ladro halfling",
        characterName: "Lyra",
        storyDraft: { characterStory: "Storia" },
        generatedSheet: {
          pdfBase64: "JVBERi0=",
          fileName: "lyra.pdf",
          armorClass: 14,
          hitPoints: 22,
          build: {
            race_slug: "halfling",
            subclass_slug: "",
            character_class: "Ladro",
            class_subclass: "",
            background_slug: "criminale",
            level: "3",
          },
          characterName: "Lyra",
        },
        chatMessages: [],
      },
    },
    "campaign-123"
  );

  assert.equal(prepared.campaignId, "campaign-123");
  assert.equal(prepared.generatedSheetPdfBase64, "JVBERi0=");
  assert.equal(prepared.name, "Lyra");
  assert.equal(prepared.characterClass, "Ladro");
});
