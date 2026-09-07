import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addSceneFloor,
  assertPublishableScene,
  linkSceneMission,
  removeSceneFloor,
  renameScene,
  reorderSceneFloors,
  updateSceneFloorGrid,
  validateSceneImage,
} from "../r6-5";
import { createTacticalScene } from "../index";

const asset = (id: string) => ({
  id,
  origin: "upload" as const,
  storageKey: `/api/tg-image/${id}`,
  mimeType: "image/png",
  width: 100,
  height: 100,
});
const floor = (id: string) => ({
  id,
  label: id,
  sortOrder: 0,
  width: 100,
  height: 100,
  asset: asset(id),
  layers: [],
});
const scene = () =>
  createTacticalScene({
    id: "s",
    campaignId: "c",
    name: "S",
    floors: [floor("a")],
  });

describe("R6.5 scene flow", () => {
  it("validates supported durable image inputs", () => {
    assert.equal(validateSceneImage("image/gif", 20).ok, true);
    assert.equal(validateSceneImage("image/svg+xml", 20).ok, false);
  });
  it("manages mission and floors deterministically", () => {
    let value = linkSceneMission(scene(), " mission ");
    value = addSceneFloor(value, floor("b"));
    value = reorderSceneFloors(value, ["b", "a"]);
    value = updateSceneFloorGrid(value, "b", {
      visible: true,
      kind: "square",
      cellSize: 10,
      offsetX: 1,
      offsetY: 2,
    });
    assert.equal(renameScene(value, " Nuova ").name, "Nuova");
    assert.equal(value.linkedMissionId, "mission");
    assert.equal(value.floors[0].grid?.visible, true);
    assert.equal(removeSceneFloor(value, "a").floors.length, 1);
  });
  it("rejects publishing placeholder maps", () => {
    const value = scene();
    value.floors[0].asset.storageKey = "local://placeholder";
    assert.throws(() => assertPublishableScene(value), /mappa caricata/);
  });
  it("removes FoW regions and runtime patches owned by a deleted floor", () => {
    let value = addSceneFloor(scene(), floor("b"));
    value.fow.regions = [
      { id: "ra", floorId: "a", polygon: [{ x: 0, y: 0 }, { x: .2, y: 0 }, { x: .2, y: .2 }], revealed: false, origin: "manual" },
      { id: "rb", floorId: "b", polygon: [{ x: .3, y: .3 }, { x: .5, y: .3 }, { x: .5, y: .5 }], revealed: true, origin: "manual" },
    ];
    value.fow.patches = [{ id: "pa", regionId: "ra", operation: "reveal" }, { id: "pb", regionId: "rb", operation: "hide" }];
    const removed = removeSceneFloor(value, "a");
    assert.deepEqual(removed.fow.regions.map((region) => region.id), ["rb"]);
    assert.deepEqual(removed.fow.patches.map((patch) => patch.id), ["pb"]);
  });
});
