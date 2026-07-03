import test from "node:test";
import assert from "node:assert/strict";

import {
  formatCampaignTypeQuestion,
  hasExplicitCampaignType,
  parseCampaignTypeFromUserMessage,
} from "../campaign-type-selection";

test("hasExplicitCampaignType detects oneshot and long hints", () => {
  assert.equal(hasExplicitCampaignType("crea una oneshot horror"), true);
  assert.equal(hasExplicitCampaignType("voglio una campagna lunga"), true);
  assert.equal(hasExplicitCampaignType("crea una nuova campagna"), false);
});

test("parseCampaignTypeFromUserMessage accepts numbers and labels", () => {
  assert.equal(parseCampaignTypeFromUserMessage("1"), "oneshot");
  assert.equal(parseCampaignTypeFromUserMessage("3"), "long");
  assert.equal(parseCampaignTypeFromUserMessage("campagna lunga"), "long");
  assert.equal(parseCampaignTypeFromUserMessage("torneo"), "torneo");
  assert.equal(parseCampaignTypeFromUserMessage("solo fantasy"), null);
});

test("formatCampaignTypeQuestion lists all options", () => {
  assert.match(formatCampaignTypeQuestion(), /Oneshot/i);
  assert.match(formatCampaignTypeQuestion(), /Quest/i);
  assert.match(formatCampaignTypeQuestion(), /Campagna lunga/i);
  assert.match(formatCampaignTypeQuestion(), /Torneo/i);
});
