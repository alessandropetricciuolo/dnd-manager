import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rectangleAreaPolygon } from "../scene-schema";
import { segmentKey, unionBoundarySegments } from "../scene-editor/union-boundary-edges";

describe("unionBoundarySegments", () => {
  it("returns 4 edges for a single rectangle", () => {
    const poly = rectangleAreaPolygon(0, 0, 100, 100);
    const segs = unionBoundarySegments([poly]);
    assert.equal(segs.length, 4);
  });

  it("merges overlapping rectangles to outer perimeter only", () => {
    const a = rectangleAreaPolygon(0, 0, 100, 100);
    const b = rectangleAreaPolygon(50, 50, 100, 100);
    const segs = unionBoundarySegments([a, b]);
    assert.ok(segs.length >= 6);
    assert.ok(!segs.some((s) => segmentKey(s.x1, s.y1, s.x2, s.y2) === segmentKey(100, 50, 100, 100)));
    assert.ok(!segs.some((s) => segmentKey(s.x1, s.y1, s.x2, s.y2) === segmentKey(50, 100, 100, 100)));
  });

  it("merges adjacent rectangles into one outer rectangle", () => {
    const left = rectangleAreaPolygon(0, 0, 100, 100);
    const right = rectangleAreaPolygon(100, 0, 100, 100);
    const segs = unionBoundarySegments([left, right]);
    assert.equal(segs.length, 4);
    assert.ok(!segs.some((s) => segmentKey(s.x1, s.y1, s.x2, s.y2) === segmentKey(100, 0, 100, 100)));
  });
});
