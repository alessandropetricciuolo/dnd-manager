import test from "node:test";
import assert from "node:assert/strict";

import type { ChatPendingProposalPayload } from "../draft-assistant.types";
import { isNpcBatchPending, persistActiveBatchItem } from "../wiki-npc-batch-pending";

function simulateFinalizeWikiProposalAfterText(
  pending: ChatPendingProposalPayload,
  enriched: ChatPendingProposalPayload,
  wikiMeta: ChatPendingProposalPayload["wikiMeta"]
): ChatPendingProposalPayload {
  return {
    ...enriched,
    rationale: pending.rationale,
    wikiMeta,
    wikiBatchMeta: pending.wikiBatchMeta,
    input: { ...enriched.input },
    preview_payload: { ...enriched.preview_payload },
  };
}

test("batch pending survives text refine when wikiBatchMeta is preserved", () => {
  const pending: ChatPendingProposalPayload = {
    action_name: "wiki.entity.create",
    input: { campaignId: "camp-1", title: "Padre di Bartolo", type: "npc", content: "old" },
    rationale: "Batch NPC",
    preview_payload: { content: "old" },
    wikiBatchMeta: {
      originalPrompt: "3 npc",
      roles: ["Padre di Bartolo", "Madre di Bartolo", "Maggiordomo di Bartolo"],
      roleSpecs: [],
      locationName: null,
      locationTargetId: null,
      locationTargetKind: null,
      locationExcerpt: null,
      missionName: null,
      linkedEntityName: null,
      items: [
        {
          roleLabel: "Padre di Bartolo",
          status: "ready",
          entityTitle: "Padre di Bartolo",
          wikiMeta: {
            entityType: "npc",
            entityTitle: "Padre di Bartolo",
            userPrompt: "padre",
            markdownDraft: { description: "old", statblock: "" },
            chatMessages: [],
          },
          input: { campaignId: "camp-1", title: "Padre di Bartolo", type: "npc", content: "old" },
          preview_payload: { content: "old" },
        },
        {
          roleLabel: "Madre di Bartolo",
          status: "ready",
          entityTitle: "Madre di Bartolo",
          wikiMeta: {
            entityType: "npc",
            entityTitle: "Madre di Bartolo",
            userPrompt: "madre",
            markdownDraft: { description: "", statblock: "" },
            chatMessages: [],
          },
          input: { campaignId: "camp-1", title: "Madre di Bartolo", type: "npc", content: "" },
          preview_payload: {},
        },
      ],
      activeIndex: 0,
      visibility: "secret",
    },
  };

  const working = persistActiveBatchItem(pending);
  const enriched: ChatPendingProposalPayload = {
    action_name: "wiki.entity.create",
    input: { campaignId: "camp-1", title: "Padre di Bartolo", type: "npc", content: "refined" },
    rationale: null,
    preview_payload: { content: "refined" },
  };
  const wikiMeta = working.wikiMeta;

  const next = simulateFinalizeWikiProposalAfterText(working, enriched, wikiMeta);
  assert.ok(isNpcBatchPending(next));
  assert.equal(next.wikiBatchMeta?.items.length, 2);
  assert.equal(next.input.content, "refined");
});
