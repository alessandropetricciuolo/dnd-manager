import assert from "node:assert/strict";
import test from "node:test";
import { getReviewCampaignId, isReviewCampaignOwner, prepareLoginCredentials, resolveTrustedProfileRole } from "../../../../mobile/src/auth/access";

test("only a valid trusted profile role grants an app role", () => {
  assert.equal(resolveTrustedProfileRole("player"), "player");
  assert.equal(resolveTrustedProfileRole("gm"), "gm");
  assert.equal(resolveTrustedProfileRole("admin"), "admin");
  assert.equal(resolveTrustedProfileRole(null), null);
  assert.equal(resolveTrustedProfileRole(undefined), null);
  assert.equal(resolveTrustedProfileRole("owner"), null);
  assert.equal(resolveTrustedProfileRole({ role: "admin" }), null);
});

test("login trims the email but preserves password whitespace exactly", () => {
  assert.deepEqual(prepareLoginCredentials("  player@example.com  ", " pass word "), {
    email: "player@example.com",
    password: " pass word ",
  });
  assert.equal(prepareLoginCredentials("  ", "secret").error, "Inserisci il tuo indirizzo email.");
  assert.equal(prepareLoginCredentials("player@example.com", "").error, "Inserisci la tua password.");
});

test("mobile review Regia requires the configured private campaign and its owner", () => {
  const campaignId = "20000000-0000-4000-8000-000000000001";
  const owner = "review-account";
  const demo = { id: campaignId, gm_id: owner, is_public: false };
  const scope = getReviewCampaignId({ review_gm_campaign_id: campaignId });
  assert.equal(scope, campaignId);
  assert.equal(getReviewCampaignId({ review_gm_campaign_id: "all" }), null);
  assert.equal(getReviewCampaignId({ review_gm_campaign_id: [campaignId] }), null);
  assert.equal(isReviewCampaignOwner("player", owner, scope, demo), true);
  assert.equal(isReviewCampaignOwner("player", owner, null, demo), false);
  assert.equal(isReviewCampaignOwner("player", "other-player", scope, demo), false);
  assert.equal(isReviewCampaignOwner("player", owner, scope, { ...demo, is_public: true }), false);
  assert.equal(isReviewCampaignOwner("player", owner, scope, { ...demo, id: "other-campaign" }), false);
  assert.equal(isReviewCampaignOwner("gm", owner, scope, demo), false);
});
