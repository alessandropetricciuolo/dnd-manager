import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  clientPointToNorm,
  clientPointToRectNorm,
  elementPxToNorm,
  getContainedElementSize,
  intrinsicNormToElementPx,
  pointInPolygon,
} from "../coordinates";
import { computeSquareGridOverlay } from "../viewer/grid";
import { revealedPolygonsFromRegions } from "../viewer";

describe("pointInPolygon", () => {
  const square = [
    { x: 0.2, y: 0.2 },
    { x: 0.8, y: 0.2 },
    { x: 0.8, y: 0.8 },
    { x: 0.2, y: 0.8 },
  ];

  it("detects inside point", () => {
    assert.equal(pointInPolygon(0.5, 0.5, square), true);
  });

  it("detects outside point", () => {
    assert.equal(pointInPolygon(0.1, 0.1, square), false);
  });
});

describe("object-contain coordinate roundtrip", () => {
  const elW = 800;
  const elH = 600;
  const naturalW = 1600;
  const naturalH = 900;

  it("roundtrips norm → px → norm", () => {
    const norm = { x: 0.35, y: 0.62 };
    const [px, py] = intrinsicNormToElementPx(norm.x, norm.y, elW, elH, naturalW, naturalH);
    const back = elementPxToNorm(px, py, elW, elH, naturalW, naturalH);
    assert.ok(Math.abs(back.x - norm.x) < 1e-9);
    assert.ok(Math.abs(back.y - norm.y) < 1e-9);
  });

  it("maps client point through bounding rect", () => {
    const norm = clientPointToNorm({
      clientX: 400,
      clientY: 300,
      boundingRect: { left: 0, top: 0, width: 800, height: 600 },
      offsetWidth: 800,
      offsetHeight: 600,
      naturalWidth: 1600,
      naturalHeight: 900,
    });
    assert.ok(norm);
    assert.ok(norm.x > 0 && norm.x < 1);
    assert.ok(norm.y > 0 && norm.y < 1);
  });

  it("fits square and portrait maps inside the full viewport", () => {
    assert.deepEqual(getContainedElementSize(1000, 600, 1000, 1000), {
      width: 600,
      height: 600,
    });
    assert.deepEqual(getContainedElementSize(1000, 600, 900, 1600), {
      width: 337.5,
      height: 600,
    });
  });

  it("maps clicks against the rendered bitmap rect after zoom and pan", () => {
    const norm = clientPointToRectNorm({
      clientX: 650,
      clientY: 350,
      boundingRect: { left: 50, top: 50, width: 800, height: 400 },
    });
    assert.deepEqual(norm, { x: 0.75, y: 0.75 });
  });

  it("rejects clicks outside the rendered bitmap", () => {
    assert.equal(
      clientPointToRectNorm({
        clientX: 900,
        clientY: 300,
        boundingRect: { left: 100, top: 100, width: 600, height: 400 },
        slackPx: 0,
      }),
      null
    );
  });
});

describe("computeSquareGridOverlay", () => {
  it("returns grid lines when cell size is valid", () => {
    const data = computeSquareGridOverlay({
      elementWidth: 1000,
      elementHeight: 800,
      naturalWidth: 2000,
      naturalHeight: 1600,
      gridCellPx: 50,
      gridOffsetXCells: 0,
      gridOffsetYCells: 0,
    });
    assert.ok(data);
    assert.ok(data.vPct.length > 2);
    assert.ok(data.hLinesPct.length > 2);
  });

  it("returns null when cell size too small", () => {
    const data = computeSquareGridOverlay({
      elementWidth: 100,
      elementHeight: 100,
      naturalWidth: 100,
      naturalHeight: 100,
      gridCellPx: 1,
    });
    assert.equal(data, null);
  });
});

describe("revealedPolygonsFromRegions", () => {
  it("filters only revealed regions", () => {
    const polys = revealedPolygonsFromRegions([
      { id: "a", is_revealed: true, polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] },
      { id: "b", is_revealed: false, polygon: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.1 }, { x: 0.2, y: 0.2 }] },
    ]);
    assert.equal(polys.length, 1);
    assert.equal(polys[0].length, 3);
  });
});
