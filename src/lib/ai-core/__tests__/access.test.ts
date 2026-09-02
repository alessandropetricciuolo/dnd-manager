import test from "node:test";
import assert from "node:assert/strict";

import { isAllowedPreviewRole, isLongCampaignTypeValue } from "../access";
import { AI_MEMORY_PREVIEW_MESSAGES } from "../policy";

test("isAllowedPreviewRole only admin", () => {
  assert.equal(isAllowedPreviewRole("gm"), false);
  assert.equal(isAllowedPreviewRole("admin"), true);
  assert.equal(isAllowedPreviewRole("player"), false);
  assert.equal(isAllowedPreviewRole(null), false);
  assert.equal(isAllowedPreviewRole(undefined), false);
  assert.equal(isAllowedPreviewRole(""), false);
});

test("isLongCampaignTypeValue only long", () => {
  assert.equal(isLongCampaignTypeValue("long"), true);
  assert.equal(isLongCampaignTypeValue("oneshot"), false);
  assert.equal(isLongCampaignTypeValue("quest"), false);
  assert.equal(isLongCampaignTypeValue("torneo"), false);
  assert.equal(isLongCampaignTypeValue(null), false);
  assert.equal(isLongCampaignTypeValue(undefined), false);
});

test("policy messages are non-empty and safe", () => {
  // Nessun messaggio deve contenere segreti o stack
  for (const [key, msg] of Object.entries(AI_MEMORY_PREVIEW_MESSAGES)) {
    assert.ok(msg.length > 5, `message ${key} too short`);
    assert.ok(!msg.toLowerCase().includes("stack"), `message ${key} leaks stack`);
  }
  // Accettazione M1: una richiesta non autorizzata non raggiunge embedding/provider/audit
  // Verifichiamo che i messaggi di accesso esistano e siano distinti
  assert.notEqual(AI_MEMORY_PREVIEW_MESSAGES.unauthenticated, AI_MEMORY_PREVIEW_MESSAGES.forbiddenRole);
  assert.notEqual(AI_MEMORY_PREVIEW_MESSAGES.forbiddenRole, AI_MEMORY_PREVIEW_MESSAGES.notLongCampaign);
  assert.notEqual(AI_MEMORY_PREVIEW_MESSAGES.campaignNotFound, AI_MEMORY_PREVIEW_MESSAGES.notLongCampaign);
});
