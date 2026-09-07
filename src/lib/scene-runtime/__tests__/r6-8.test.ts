import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addProjectionEffect, makeEffectPolygon, publishProjectionEffects, removeProjectionEffect, setProjectionDayNight, updateProjectionEffect } from "../r6-8";
import { createLocalWorkspaceScene } from "../workspace";
import { addWorkspaceOverlay, publishWorkspace } from "../workspace";
import { validateTacticalScene } from "../validate";

describe("R6.8 projection effects", () => {
  it("creates all supported geometries as bounded polygons", () => {
    for (const geometry of ["square", "circle", "spray", "polygon"] as const) {
      const polygon = makeEffectPolygon(geometry, { x: .2, y: .2 }, { x: .8, y: .7 });
      assert.ok(polygon.length >= 3);
      assert.equal(polygon.every((point) => point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1), true);
    }
  });
  it("keeps effects separate from FoW and publishes a snapshot", () => {
    const scene = createLocalWorkspaceScene("campaign").draft;
    const withEffect = addProjectionEffect(scene, "floor-1", "fire", "circle", makeEffectPolygon("circle", { x: .1, y: .1 }, { x: .4, y: .4 }));
    assert.equal(withEffect.fow.regions.length, 0);
    const moved = updateProjectionEffect(withEffect, withEffect.effects!.draft[0]!.id, { scale: 1.5, visible: false });
    const night = setProjectionDayNight(moved, "night");
    const published = publishProjectionEffects(night);
    assert.equal(published.effects?.published?.[0]?.visible, false);
    assert.equal(published.effects?.dayNight, "night");
    assert.equal(removeProjectionEffect(night, withEffect.effects!.draft[0]!.id).effects?.draft.length, 0);
  });
  it("supports every atmospheric kind and validates durable image assets", () => {
    let scene = createLocalWorkspaceScene("campaign").draft;
    for (const kind of ["fire", "poison", "smoke", "mist", "ice", "lightning", "darkness"] as const) scene = addProjectionEffect(scene, "floor-1", kind, "square", makeEffectPolygon("square", { x: .1, y: .1 }, { x: .2, y: .2 }));
    scene = addWorkspaceOverlay({ draft: scene, published: null, history: [], discardedRevisionNos: [] }, "text", "test").draft;
    scene = { ...scene, assets: [{ id: "asset-gif", origin: "upload", storageKey: "/uploads/test.gif", mimeType: "image/gif", width: 100, height: 100 }], overlay: { ...scene.overlay, draft: [...scene.overlay.draft, { id: "gif", type: "gif", x: .5, y: .5, width: .2, height: .2, assetId: "asset-gif", src: "/uploads/test.gif" }] } };
    assert.equal(validateTacticalScene(scene).ok, true);
    const ready = { ...scene, lifecycle: "ready" as const };
    const published = publishWorkspace({ draft: ready, published: null, history: [], discardedRevisionNos: [] }).published;
    assert.equal(published?.effects?.published?.length, 7);
    assert.equal(published?.overlay.published?.some((item) => item.type === "gif"), true);
  });
});
