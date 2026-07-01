import assert from "node:assert/strict";
import test from "node:test";
import {
  extractJsonObject,
  parseInterpreterJson,
} from "@/modules/command-center/ai-control-plane/interpreter";
import {
  CURRENT_MAX_AUTONOMY,
  assertCanProposeDrafts,
  canExecuteWithoutApproval,
  canProposeDrafts,
} from "@/modules/command-center/ai-control-plane/autonomy";

test("extractJsonObject strips markdown fences", () => {
  const raw = '```json\n{"reply":"ciao","proposals":[]}\n```';
  assert.equal(extractJsonObject(raw), '{"reply":"ciao","proposals":[]}');
});

test("parseInterpreterJson filters unknown actions", () => {
  const result = parseInterpreterJson(
    JSON.stringify({
      reply: "Ok",
      intent_summary: "Task",
      proposals: [
        { action_name: "workspace.task.create", input: { title: "Prep sessione" }, rationale: "Utile" },
        { action_name: "not.a.real.action", input: {}, rationale: "Non consentita" },
      ],
    })
  );
  assert.equal(result.proposals.length, 1);
  assert.equal(result.proposals[0]?.action_name, "workspace.task.create");
});

test("autonomy level 2 allows drafts and confirmed execution", () => {
  assert.equal(CURRENT_MAX_AUTONOMY, 2);
  assert.equal(canProposeDrafts(), true);
  assert.equal(canExecuteWithoutApproval(), false);
  assert.doesNotThrow(() => assertCanProposeDrafts());
});
