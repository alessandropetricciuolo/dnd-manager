import assert from "node:assert/strict";
import test from "node:test";
import { missionBatchResults, restoreMissionDrafts } from "../mission-batch";
import type { AiAssistantArtifact } from "../contracts";

const mission = (id: string, proposalId: string, status: AiAssistantArtifact["status"] = "draft", revision = 1): AiAssistantArtifact => ({ id, threadId: "t", campaignId: "c", kind: "narrative", status, revision, parentArtifactId: null, payload: { title: proposalId, actionName: "mission.create", actionInput: { proposalId, originPlanArtifactId: "plan" } }, sourceRefs: [], policyVersion: null, savedEntity: null });

test("R3 ricostruisce e accumula bozze missione non salvate", () => {
  const restored = restoreMissionDrafts([mission("a", "1"), mission("a2", "1", "ready_for_review", 2), mission("b", "3"), mission("saved", "4", "saved")]);
  assert.deepEqual(restored.map((item) => item.id), ["a2", "b"]);
});

test("R3 espone esito per titolo e isola gli errori", () => {
  const result = missionBatchResults([mission("a", "1"), mission("b", "3")], [{ artifactId: "a", ok: true }, { artifactId: "b", ok: false, error: "Campagna non Long" }], new Set(["a"]));
  assert.deepEqual(result, [{ artifactId: "a", title: "1", status: "saved" }, { artifactId: "b", title: "3", status: "error", message: "Campagna non Long" }]);
});
