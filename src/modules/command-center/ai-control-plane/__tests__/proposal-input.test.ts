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

test("normalizeProposalInput keeps proposal campaign when sessionId is scoped elsewhere", () => {
  const input = normalizeProposalInput(
    "session.close",
    {
      campaignId: "campaign-a",
      sessionId: "session-from-a",
      summary: "Riassunto",
      attendance: { "player-1": "attended" },
    },
    "campaign-b"
  );
  assert.equal(input.campaignId, "campaign-a");
  assert.equal(input.sessionId, "session-from-a");
});

test("normalizeProposalInput keeps proposal campaign for wiki relationships", () => {
  const input = normalizeProposalInput(
    "wiki.relationship.create",
    {
      campaignId: "campaign-a",
      sourceId: "entity-a",
      targetId: "entity-b",
      label: "alleato",
    },
    "campaign-b"
  );
  assert.equal(input.campaignId, "campaign-a");
});

test("normalizeProposalInput still applies filter for session.create without resolved IDs", () => {
  const input = normalizeProposalInput(
    "session.create",
    { campaignId: "campaign-a", date: "2026-07-06" },
    "campaign-b"
  );
  assert.equal(input.campaignId, "campaign-b");
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
