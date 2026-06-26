import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateWallsFromAreas, wallSegmentKey } from "../scene-editor/auto-walls";
import { rectangleAreaPolygon } from "../scene-schema";
import { normalizeSceneFloor } from "../scene-schema/normalize-floor";

describe("generateWallsFromAreas", () => {
  it("creates one wall per polygon edge", () => {
    const poly = rectangleAreaPolygon(100, 100, 200, 150);
    const walls = generateWallsFromAreas([
      { id: "a1", kind: "room", polygon: poly },
    ]);
    assert.equal(walls.length, 4);
  });

  it("dedupes shared edge between two rooms", () => {
    const left = rectangleAreaPolygon(0, 0, 100, 100);
    const right = rectangleAreaPolygon(100, 0, 100, 100);
    const walls = generateWallsFromAreas([
      { id: "a1", kind: "room", polygon: left },
      { id: "a2", kind: "room", polygon: right },
    ]);
    assert.equal(walls.length, 6);
  });

  it("preserves door on matching segment", () => {
    const poly = rectangleAreaPolygon(0, 0, 100, 100);
    const key = wallSegmentKey(0, 0, 100, 0);
    const existing = [
      {
        id: "w1",
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 0,
        door: { width: 30, offset: 0.5 },
      },
    ];
    const walls = generateWallsFromAreas([{ id: "a1", kind: "room", polygon: poly }], existing);
    const top = walls.find((w) => wallSegmentKey(w.x1, w.y1, w.x2, w.y2) === key);
    assert.ok(top?.door);
    assert.equal(top.door?.width, 30);
  });
});

describe("normalizeSceneFloor", () => {
  it("migrates legacy floor without layers", () => {
    const floor = normalizeSceneFloor({
      id: "f1",
      label: "P1",
      sortOrder: 0,
      width: 1000,
      height: 800,
      grid: { kind: "square", cellPx: 100, offsetX: 0, offsetY: 0 },
      areas: [{ id: "a1", kind: "room", polygon: rectangleAreaPolygon(0, 0, 100, 100) }],
      walls: [],
      layers: [],
      activeLayerId: "",
      props: [],
      gmNotes: [],
    });
    assert.equal(floor.layers.length, 1);
    assert.equal(floor.layers[0].areas.length, 1);
    assert.equal(floor.layers[0].walls.length, 4);
    assert.equal(floor.areas.length, 1);
  });
});
