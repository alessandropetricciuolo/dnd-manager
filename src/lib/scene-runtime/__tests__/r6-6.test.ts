import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createTacticalScene } from "../index";
import { addManualFow, applyFoundryFow, deleteFowRegion, hitTestFowRegion, makeFowPolygon, moveFowVertex, previewFoundryFow, resetFow, setAllFow, translatePolygon, updateFowRegion } from "../r6-6";

const floor = (id: string) => ({ id, label: id, sortOrder: 0, width: 400, height: 300, asset: { id: `a-${id}`, origin: "upload" as const, storageKey: "/a", mimeType: "image/png", width: 400, height: 300 }, layers: [] });
const scene = () => createTacticalScene({ id: "s", campaignId: "c", name: "s", floors: [floor("f"), { ...floor("other"), sortOrder: 1 }] });
const foundry = { name: "Room", width: 400, height: 300, grid: 100, walls: [
  { c: [0, 0, 400, 0] }, { c: [400, 0, 400, 300] }, { c: [400, 300, 0, 300] }, { c: [0, 300, 0, 0] },
  { c: [100, 0, 100, 100] }, { c: [100, 100, 300, 100] }, { c: [300, 100, 300, 0] },
] };

describe("R6.6 FoW tools", () => {
  it("creates, hit-tests, moves and edits vertices without losing origin", () => {
    const created = addManualFow(scene(), "f", makeFowPolygon("rectangle", { x: .1, y: .1 }, { x: .4, y: .5 }), "imported");
    const region = created.fow.regions[0];
    assert.equal(hitTestFowRegion(created.fow.regions, { x: .2, y: .2 })?.id, region.id);
    const moved = updateFowRegion(created, region.id, translatePolygon(region.polygon, .1, .1));
    const edited = updateFowRegion(moved, region.id, moveFowVertex(moved.fow.regions[0].polygon, 0, { x: .15, y: .16 }));
    assert.deepEqual(edited.fow.regions[0].polygon[0], { x: .15, y: .16 });
    assert.equal(edited.fow.regions[0].origin, "imported");
  });
  it("scopes global reveal and reset to a floor and removes affected patches", () => {
    let value = addManualFow(scene(), "f", makeFowPolygon("rectangle", { x: .1, y: .1 }, { x: .4, y: .5 }));
    value = addManualFow(value, "other", makeFowPolygon("rectangle", { x: .2, y: .2 }, { x: .5, y: .6 }));
    value = setAllFow(value, true, "f");
    assert.deepEqual(value.fow.regions.map((region) => region.revealed), [true, false]);
    value.fow.patches = [{ id: "p1", regionId: value.fow.regions[0].id, operation: "reveal" }];
    assert.equal(resetFow(value, "f").fow.patches.length, 0);
    assert.equal(deleteFowRegion(value, value.fow.regions[0].id).fow.regions.length, 1);
  });
  it("previews without mutation, then merges or replaces only the active floor", () => {
    const base = addManualFow(addManualFow(scene(), "f", makeFowPolygon("rectangle", { x: .1, y: .1 }, { x: .2, y: .2 })), "other", makeFowPolygon("rectangle", { x: .3, y: .3 }, { x: .4, y: .4 }));
    const before = structuredClone(base);
    const preview = previewFoundryFow(foundry);
    assert.deepEqual(base, before);
    const merged = applyFoundryFow(base, "f", preview, "merge");
    assert.ok(merged.fow.regions.filter((region) => region.floorId === "f").length > 1);
    const replaced = applyFoundryFow(base, "f", preview, "replace");
    assert.equal(replaced.fow.regions.filter((region) => region.floorId === "other").length, 1);
    assert.ok(replaced.fow.regions.filter((region) => region.floorId === "f").every((region) => region.origin === "imported"));
    assert.deepEqual(replaced.fow.importedInput?.payload, foundry);
  });
});
