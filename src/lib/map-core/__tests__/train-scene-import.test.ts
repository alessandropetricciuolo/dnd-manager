import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { importTrainSceneToFow } from "@/lib/exploration/train-scene-import";

/** Scena minimale 4×3 celle con perimetro chiuso (stanza interna). */
const MINIMAL_SCENE = {
  name: "Test room",
  width: 400,
  height: 300,
  grid: 100,
  shiftX: 0,
  shiftY: 0,
  walls: [
    { c: [0, 0, 400, 0], move: 1, door: 0 },
    { c: [400, 0, 400, 300], move: 1, door: 0 },
    { c: [400, 300, 0, 300], move: 1, door: 0 },
    { c: [0, 300, 0, 0], move: 1, door: 0 },
    { c: [100, 0, 100, 100], move: 1, door: 0 },
    { c: [100, 100, 300, 100], move: 1, door: 0 },
    { c: [300, 100, 300, 0], move: 1, door: 0 },
  ],
  lights: [],
};

describe("importTrainSceneToFow", () => {
  it("parses grid dimensions from scene", () => {
    const result = importTrainSceneToFow(MINIMAL_SCENE);
    assert.equal(result.gridCellsW, 4);
    assert.equal(result.gridCellsH, 3);
  });

  it("produces at least one normalized rectangular FoW region", () => {
    const result = importTrainSceneToFow(MINIMAL_SCENE);
    assert.ok(result.regions.length >= 1);
    const poly = result.regions[0].polygon;
    assert.equal(poly.length, 4);
    for (const p of poly) {
      assert.ok(p.x >= 0 && p.x <= 1);
      assert.ok(p.y >= 0 && p.y <= 1);
    }
  });

  it("rejects JSON without walls", () => {
    assert.throws(
      () => importTrainSceneToFow({ width: 100, height: 100, grid: 50, walls: [] }),
      /walls/i
    );
  });
});
