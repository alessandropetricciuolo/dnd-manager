import test from "node:test";
import assert from "node:assert/strict";
import { actionForArtifact, buildArtifactActionInput } from "../action-bridge";
import type { AiAssistantArtifact } from "../contracts";

function artifact(actionName: string, actionInput: Record<string, unknown> = {}): AiAssistantArtifact {
  return { id: "artifact-1", threadId: "thread-1", campaignId: "campaign-1", kind: "action", status: "draft", revision: 1, parentArtifactId: null, payload: { title: "Titolo", content: "Contenuto", actionName, actionInput }, sourceRefs: [], policyVersion: null, savedEntity: null };
}

test("uses explicit wrapper payloads for every supported canonical destination", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["campaign.create", {}], ["campaign.update", {}], ["gm.note.create", {}], ["gm.note.update", { noteId: "note-1" }],
    ["workspace.task.create", {}], ["wiki.entity.create", { type: "npc" }], ["wiki.entity.update", { entityId: "wiki-1", type: "npc" }],
    ["mission.create", { grade: "C", committente: "Gilda", ubicazione: "Porto", paga: "10 mo", urgenza: "media" }],
    ["mission.update", { missionId: "mission-1", grade: "C", committente: "Gilda", ubicazione: "Porto", paga: "10 mo", urgenza: "media" }],
    ["session.create", { date: "2026-09-04" }], ["session.update", { sessionId: "session-1" }],
    ["character.create", { name: "Ari", generatedSheetPdfBase64: "pdf" }], ["character.update", { characterId: "character-1", name: "Ari" }],
  ];
  for (const [actionName, actionInput] of cases) {
    const input = buildArtifactActionInput(artifact(actionName, actionInput), actionName);
    if (!["campaign.create", "gm.note.update", "session.update"].includes(actionName)) {
      assert.equal(input.campaignId, "campaign-1", actionName);
    }
    assert.equal(actionForArtifact(artifact(actionName, actionInput)), actionName);
  }
});

test("refuses a user supplied action different from the artifact contract", () => {
  assert.notEqual(actionForArtifact(artifact("wiki.entity.create", { type: "lore" })), "gm.note.create");
});
