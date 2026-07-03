import test from "node:test";
import assert from "node:assert/strict";

import { parseCampaignDraftJson } from "@/lib/ai/campaign-text-generator";

test("parseCampaignDraftJson accepts valid campaign JSON", () => {
  const raw = JSON.stringify({
    title: "Ombre su Ravenloft",
    description: "Horror gotico nelle terre nebbiose.",
    type: "long",
    player_primer: "## Cosa sapete\nIl villaggio è maledetto.",
    is_public: false,
  });
  const parsed = parseCampaignDraftJson(raw);
  assert.ok(parsed.ok);
  assert.equal(parsed.data.title, "Ombre su Ravenloft");
  assert.equal(parsed.data.type, "long");
  assert.match(parsed.data.playerPrimer ?? "", /maledetto/i);
});

test("parseCampaignDraftJson accepts JSON with braces inside description", () => {
  const raw =
    '{"title":"La Cripta","description":"I PG esplorano {rovine} sommerse.","type":"oneshot","player_primer":"","is_public":false}';
  const parsed = parseCampaignDraftJson(raw);
  assert.ok(parsed.ok);
  assert.match(parsed.data.description, /rovine/);
});

test("parseCampaignDraftJson rejects missing title", () => {
  const parsed = parseCampaignDraftJson('{"description":"x","type":"oneshot"}');
  assert.equal(parsed.ok, false);
});
