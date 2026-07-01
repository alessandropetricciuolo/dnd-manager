import assert from "node:assert/strict";
import test from "node:test";
import {
  AI_DRAFT_ALLOWED_ACTIONS,
  buildInterpreterActionList,
  isAiDraftAllowedAction,
} from "@/modules/command-center/actions/action-catalog";

test("action catalog includes campaign.create for AI", () => {
  assert.equal(isAiDraftAllowedAction("campaign.create"), true);
  assert.equal(isAiDraftAllowedAction("not.real"), false);
});

test("buildInterpreterActionList documents allowed actions", () => {
  const doc = buildInterpreterActionList();
  assert.match(doc, /campaign\.create/);
  assert.match(doc, /mission\.create/);
  assert.ok(AI_DRAFT_ALLOWED_ACTIONS.length >= 15);
});
