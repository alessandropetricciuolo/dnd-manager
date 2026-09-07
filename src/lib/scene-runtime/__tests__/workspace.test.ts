import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addWorkspaceOverlay, createLocalWorkspaceScene, discardWorkspaceRevision, editWorkspace, publishWorkspace, rollbackWorkspacePublication, setWorkspaceLifecycle, toggleWorkspaceRegion } from "../workspace";

describe("R6.3 local workspace", () => {
  it("keeps draft separate from the published snapshot", () => {
    const initial = createLocalWorkspaceScene("campaign-1");
    const ready = setWorkspaceLifecycle(initial, "ready");
    const published = publishWorkspace(ready);
    const edited = editWorkspace(published, { ...published.draft, name: "Modifica locale" });
    assert.equal(edited.published?.name, "Scena rapida");
    assert.equal(edited.draft.name, "Modifica locale");
  });

  it("publishes materialized FoW and immutable overlay snapshot", () => {
    const state = createLocalWorkspaceScene("campaign-1");
    const withRegion = editWorkspace(state, { ...state.draft, fow: { regions: [{ id: "r1", floorId: "floor-1", polygon: [{ x: .1, y: .1 }, { x: .3, y: .1 }, { x: .3, y: .3 }], revealed: false, origin: "manual" }], patches: [] } });
    assert.equal(withRegion.draft.fow.regions[0]?.revealed, false);
    const revealed = toggleWorkspaceRegion(withRegion, "r1", true);
    const withOverlay = addWorkspaceOverlay(revealed, "marker", "Nemico");
    const ready = setWorkspaceLifecycle(withOverlay, "ready");
    const live = publishWorkspace(ready);
    assert.equal(live.published?.fow.regions[0]?.revealed, true);
    assert.equal(live.published?.overlay.published?.length, 1);
    const edited = addWorkspaceOverlay(live, "text", "Nota nuova");
    assert.equal(edited.published?.overlay.published?.length, 1);
    assert.equal(edited.published?.fow.regions[0]?.revealed, true);
    const rolledBack = rollbackWorkspacePublication(edited);
    assert.equal(rolledBack.published, null);
    assert.equal(rolledBack.draft.lifecycle, "ready");
  });

  it("rejects stale revision writes and supports discard", () => {
    const state = createLocalWorkspaceScene("campaign-1");
    const next = editWorkspace(state, { ...state.draft, name: "Prima modifica" });
    assert.throws(() => setWorkspaceLifecycle(next, "ready", state.draft.revisionNo), /Conflitto revisione/);
    assert.equal(discardWorkspaceRevision(next).draft.name, "Scena rapida");
  });

  it("records region reveal as a local patch", () => {
    const state = createLocalWorkspaceScene("campaign-1");
    const withRegion = editWorkspace(state, { ...state.draft, fow: { regions: [{ id: "r1", floorId: "floor-1", polygon: [{ x: .1, y: .1 }, { x: .3, y: .1 }, { x: .3, y: .3 }], revealed: false, origin: "manual" }], patches: [] } });
    const revealed = toggleWorkspaceRegion(withRegion, "r1", true);
    assert.equal(revealed.draft.fow.patches[0]?.operation, "reveal");
  });
});
