import test from "node:test";
import assert from "node:assert/strict";
import { appendCampaignCoverDirection, buildCampaignAssistantRoute } from "../campaign-onboarding";

test("R5 handoff route carries both campaign and newly created thread", () => {
  const route = buildCampaignAssistantRoute("campaign-1", "thread-9");
  assert.equal(route, "/command-center?view=assistant&campaignId=campaign-1&threadId=thread-9");
});

test("R5 cover retry preserves the draft and adds an explicit GM direction", () => {
  assert.equal(
    appendCampaignCoverDirection("Una città di frontiera.", "rifai la copertina più cupa"),
    "Una città di frontiera.\nDirezione del GM per la copertina: rifai la copertina più cupa",
  );
  assert.equal(appendCampaignCoverDirection("Una città di frontiera.", "genera la copertina"), "Una città di frontiera.");
});
