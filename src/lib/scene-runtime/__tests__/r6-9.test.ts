import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyTacticalActionError, classifyTacticalRealtimeStatus, isTacticalWorkspaceEnabled, planLegacyBackfill } from "../r6-9";

describe("R6.9 rollout safety", () => {
  it("requires an explicit campaign flag and preserves legacy read-only mode", () => {
    assert.equal(isTacticalWorkspaceEnabled(undefined, "c1"), false);
    assert.equal(isTacticalWorkspaceEnabled({ campaignId: "c1", enabled: true, legacyReadOnly: true }, "c1"), true);
    assert.equal(isTacticalWorkspaceEnabled({ campaignId: "c2", enabled: true, legacyReadOnly: true }, "c1"), false);
  });

  it("requires reload after a realtime failure", () => {
    assert.deepEqual(classifyTacticalRealtimeStatus("SUBSCRIBED").reloadRequired, false);
    assert.deepEqual(classifyTacticalRealtimeStatus("CHANNEL_ERROR").reloadRequired, true);
    assert.deepEqual(classifyTacticalRealtimeStatus("TIMED_OUT").status, "reconnecting");
  });

  it("classifies conflict and authorization errors for recovery UI", () => {
    assert.equal(classifyTacticalActionError("tactical_scene_revision_conflict"), "conflict");
    assert.equal(classifyTacticalActionError("Solo GM e Admin possono gestire"), "forbidden");
    assert.equal(classifyTacticalActionError("network timeout"), "network");
  });

  it("plans idempotent legacy conversion and reports blocked/orphan records", () => {
    const doc = { id: "legacy-1", campaign_id: "c1", name: "Legacy", linked_mission_id: null, document_version: 1, document: { version: 99 } } as never;
    const plan = planLegacyBackfill({ sceneDocuments: [doc], explorationMaps: [], fowRegions: [] });
    assert.equal(plan.items.length, 1);
    assert.equal(plan.items[0]?.state, "blocked");
    assert.ok(plan.items[0]?.checksum);
    assert.deepEqual(planLegacyBackfill({ sceneDocuments: [doc], explorationMaps: [], fowRegions: [] }).items[0]?.checksum, plan.items[0]?.checksum);
  });
});
