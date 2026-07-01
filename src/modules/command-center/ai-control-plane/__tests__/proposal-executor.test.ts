import assert from "node:assert/strict";
import test from "node:test";
import {
  CURRENT_MAX_AUTONOMY,
  assertCanExecuteWithApproval,
  assertCanProposeDrafts,
  canExecuteWithApproval,
  canProposeDrafts,
} from "@/modules/command-center/ai-control-plane/autonomy";
import { getProposalExecutionBlockReason } from "@/modules/command-center/ai-control-plane/proposal-executor";

test("autonomy level 2 allows confirmed execution", () => {
  assert.equal(CURRENT_MAX_AUTONOMY, 2);
  assert.equal(canProposeDrafts(), true);
  assert.equal(canExecuteWithApproval(), true);
  assert.doesNotThrow(() => assertCanProposeDrafts());
  assert.doesNotThrow(() => assertCanExecuteWithApproval());
});

test("getProposalExecutionBlockReason blocks invalid preview", () => {
  const reason = getProposalExecutionBlockReason({
    status: "proposed",
    action_name: "workspace.task.create",
    preview_payload: { error: "Titolo obbligatorio." },
  });
  assert.match(reason ?? "", /Anteprima non valida/);
});

test("getProposalExecutionBlockReason blocks unknown actions", () => {
  const reason = getProposalExecutionBlockReason({
    status: "proposed",
    action_name: "session.create",
    preview_payload: {},
  });
  assert.match(reason ?? "", /non consentita/);
});

test("getProposalExecutionBlockReason allows valid proposal", () => {
  const reason = getProposalExecutionBlockReason({
    status: "proposed",
    action_name: "workspace.page.create",
    preview_payload: { title: "Test" },
  });
  assert.equal(reason, null);
});
