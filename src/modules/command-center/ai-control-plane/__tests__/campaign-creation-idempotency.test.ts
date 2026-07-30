import test from "node:test";
import assert from "node:assert/strict";

import {
  getCreatedCampaignId,
  setCreatedCampaignId,
} from "../campaign-creation-idempotency";
import type { ChatPendingProposalPayload } from "../draft-assistant.types";

const basePending: ChatPendingProposalPayload = {
  action_name: "campaign.create",
  input: { title: "Test" },
  rationale: null,
  preview_payload: {},
  campaignMeta: {
    userPrompt: "crea campagna",
    draft: { title: "Test", description: "Desc", type: "oneshot" },
    chatMessages: [],
  },
};

test("getCreatedCampaignId returns stored id", () => {
  const pending = setCreatedCampaignId(basePending, "camp-123");
  assert.equal(getCreatedCampaignId(pending), "camp-123");
});

test("getCreatedCampaignId returns null when missing", () => {
  assert.equal(getCreatedCampaignId(basePending), null);
});

test("setCreatedCampaignId preserves other campaign meta fields", () => {
  const pending = setCreatedCampaignId(basePending, "camp-456");
  assert.equal(pending.campaignMeta?.userPrompt, "crea campagna");
  assert.equal(pending.campaignMeta?.createdCampaignId, "camp-456");
});

test("setCreatedCampaignId is no-op without campaignMeta", () => {
  const pending: ChatPendingProposalPayload = {
    action_name: "campaign.create",
    input: {},
    rationale: null,
    preview_payload: {},
  };
  assert.deepEqual(setCreatedCampaignId(pending, "camp-789"), pending);
});
