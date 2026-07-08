import test from "node:test";
import assert from "node:assert/strict";

import {
  attachCreatedCampaignId,
  pendingAfterPartialCampaignCreation,
  resolveExistingCreatedCampaignId,
} from "../campaign-creation-idempotency";
import type { ChatPendingProposalPayload } from "../draft-assistant.types";

const basePending: ChatPendingProposalPayload = {
  action_name: "campaign.create",
  input: { title: "Test" },
  rationale: null,
  preview_payload: {},
  campaignMeta: {
    userPrompt: "crea campagna",
    draft: { title: "Test", description: "Desc", type: "long" },
    chatMessages: [],
  },
};

test("resolveExistingCreatedCampaignId returns stored id", () => {
  assert.equal(
    resolveExistingCreatedCampaignId({ ...basePending.campaignMeta!, createdCampaignId: "abc-123" }),
    "abc-123"
  );
  assert.equal(resolveExistingCreatedCampaignId(basePending.campaignMeta), null);
});

test("attachCreatedCampaignId stores campaign id on meta", () => {
  const next = attachCreatedCampaignId(basePending, "camp-99");
  assert.equal(next.campaignMeta?.createdCampaignId, "camp-99");
});

test("pendingAfterPartialCampaignCreation preserves id after architect failure", () => {
  const next = pendingAfterPartialCampaignCreation(basePending, {
    success: false,
    error: "Architect failed",
    campaignId: "camp-42",
  });
  assert.equal(next.campaignMeta?.createdCampaignId, "camp-42");
});
