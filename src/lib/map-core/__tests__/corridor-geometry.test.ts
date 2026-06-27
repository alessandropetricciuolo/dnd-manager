import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  corridorQuadFromSegment,
  corridorPolygonFromCenterline,
  finalizeCorridorPolygon,
} from "../scene-editor/corridor-geometry";

describe("corridorQuadFromSegment", () => {
  it("returns exactly 4 vertices", () => {
    const quad = corridorQuadFromSegment({ x: 0, y: 0 }, { x: 100, y: 0 }, 25);
    assert.ok(quad);
    assert.equal(quad!.length, 4);
  });

  it("has width perpendicular to segment", () => {
    const quad = corridorQuadFromSegment({ x: 0, y: 0 }, { x: 100, y: 0 }, 30)!;
    assert.equal(quad[0].y, 30);
    assert.equal(quad[3].y, -30);
  });
});

describe("corridorPolygonFromCenterline", () => {
  it("straight 2-point path is a quad", () => {
    const poly = corridorPolygonFromCenterline(
      [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
      ],
      40
    );
    assert.ok(poly);
    assert.equal(poly!.length, 4);
  });

  it("curved 3+ points produces closed outline", () => {
    const poly = finalizeCorridorPolygon(
      [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
        { x: 200, y: 0 },
      ],
      30
    );
    assert.ok(poly);
    assert.ok(poly!.length >= 4);
  });
});
