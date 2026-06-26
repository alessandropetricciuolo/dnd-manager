import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planSceneFowRegionSync } from "../fog";
import { floorAreasToFowRegions } from "../scene-to-fow";
import {
  parseSceneDocumentV1,
  rectangleAreaPolygon,
  cloneSceneDocument,
  type SceneDocumentV1,
} from "../scene-schema";

describe("parseSceneDocumentV1", () => {
  const validDoc: SceneDocumentV1 = {
    version: 1,
    name: "Dungeon test",
    linkedMissionId: null,
    floors: [
      {
        id: "floor-1",
        label: "Piano 1",
        sortOrder: 0,
        width: 1000,
        height: 800,
        grid: { kind: "square", cellPx: 100, offsetX: 0, offsetY: 0 },
        areas: [
          {
            id: "area-a",
            kind: "room",
            polygon: rectangleAreaPolygon(100, 100, 200, 150),
          },
        ],
        walls: [],
        props: [],
        gmNotes: [],
      },
    ],
  };

  it("accepts valid document", () => {
    const r = parseSceneDocumentV1(validDoc);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.document.name, "Dungeon test");
  });

  it("rejects wrong version", () => {
    const r = parseSceneDocumentV1({ ...validDoc, version: 2 });
    assert.equal(r.ok, false);
  });

  it("rejects empty floors", () => {
    const r = parseSceneDocumentV1({ ...validDoc, floors: [] });
    assert.equal(r.ok, false);
  });
});

describe("floorAreasToFowRegions", () => {
  it("converts pixel rectangle to normalized polygon", () => {
    const floor = {
      id: "f1",
      label: "P1",
      sortOrder: 0,
      width: 1000,
      height: 1000,
      grid: { kind: "square" as const, cellPx: 100, offsetX: 0, offsetY: 0 },
      areas: [
        {
          id: "room-1",
          kind: "room" as const,
          polygon: rectangleAreaPolygon(100, 200, 300, 400),
        },
      ],
      walls: [],
      props: [],
      gmNotes: [],
    };
    const regions = floorAreasToFowRegions(floor);
    assert.equal(regions.length, 1);
    assert.equal(regions[0].sourceAreaId, "room-1");
    assert.deepEqual(regions[0].polygon[0], { x: 0.1, y: 0.2 });
    assert.deepEqual(regions[0].polygon[2], { x: 0.4, y: 0.6 });
  });
});

describe("planSceneFowRegionSync", () => {
  const polyA = [
    { x: 0.1, y: 0.1 },
    { x: 0.4, y: 0.1 },
    { x: 0.4, y: 0.4 },
    { x: 0.1, y: 0.4 },
  ];
  const polyB = [
    { x: 0.5, y: 0.5 },
    { x: 0.8, y: 0.5 },
    { x: 0.8, y: 0.8 },
    { x: 0.5, y: 0.8 },
  ];

  it("inserts new areas", () => {
    const plan = planSceneFowRegionSync(
      [{ sourceAreaId: "a", polygon: polyA, sortOrder: 1 }],
      []
    );
    assert.equal(plan.toInsert.length, 1);
    assert.equal(plan.toUpdate.length, 0);
    assert.equal(plan.toDeleteIds.length, 0);
  });

  it("preserves reveal on polygon update", () => {
    const plan = planSceneFowRegionSync(
      [{ sourceAreaId: "a", polygon: polyB, sortOrder: 1 }],
      [
        {
          id: "reg-1",
          sourceAreaId: "a",
          polygon: polyA,
          isRevealed: true,
          sortOrder: 1,
        },
      ]
    );
    assert.equal(plan.toInsert.length, 0);
    assert.equal(plan.toUpdate.length, 1);
    assert.equal(plan.toUpdate[0].preserveRevealed, true);
    assert.equal(plan.toDeleteIds.length, 0);
  });

  it("deletes removed areas without touching manual regions", () => {
    const plan = planSceneFowRegionSync(
      [],
      [
        {
          id: "reg-scene",
          sourceAreaId: "a",
          polygon: polyA,
          isRevealed: false,
          sortOrder: 1,
        },
        {
          id: "reg-manual",
          sourceAreaId: null,
          polygon: polyB,
          isRevealed: true,
          sortOrder: 2,
        },
      ]
    );
    assert.deepEqual(plan.toDeleteIds, ["reg-scene"]);
  });

  it("no-op when polygons unchanged", () => {
    const plan = planSceneFowRegionSync(
      [{ sourceAreaId: "a", polygon: polyA, sortOrder: 1 }],
      [
        {
          id: "reg-1",
          sourceAreaId: "a",
          polygon: polyA,
          isRevealed: true,
          sortOrder: 1,
        },
      ]
    );
    assert.equal(plan.toInsert.length, 0);
    assert.equal(plan.toUpdate.length, 0);
    assert.equal(plan.toDeleteIds.length, 0);
  });
});

describe("cloneSceneDocument", () => {
  it("regenerates floor and entity ids", () => {
    const doc: SceneDocumentV1 = {
      version: 1,
      name: "Originale",
      linkedMissionId: null,
      floors: [
        {
          id: "floor-1",
          label: "P1",
          sortOrder: 0,
          width: 1000,
          height: 800,
          grid: { kind: "square", cellPx: 100, offsetX: 0, offsetY: 0 },
          areas: [{ id: "area-1", kind: "room", polygon: rectangleAreaPolygon(0, 0, 100, 100) }],
          walls: [{ id: "wall-1", x1: 0, y1: 0, x2: 100, y2: 0 }],
          props: [{ id: "prop-1", kind: "barrel", x: 50, y: 50 }],
          gmNotes: [{ id: "note-1", x: 10, y: 10, text: "Segreto" }],
        },
      ],
    };
    const cloned = cloneSceneDocument(doc);
    assert.notEqual(cloned.floors[0].id, "floor-1");
    assert.notEqual(cloned.floors[0].areas[0].id, "area-1");
    assert.notEqual(cloned.floors[0].walls[0].id, "wall-1");
    assert.notEqual(cloned.floors[0].props[0].id, "prop-1");
    assert.notEqual(cloned.floors[0].gmNotes[0].id, "note-1");
    assert.equal(cloned.floors[0].props[0].kind, "barrel");
    assert.equal(cloned.floors[0].gmNotes[0].text, "Segreto");
    assert.match(cloned.name, /copia/i);
  });
});
