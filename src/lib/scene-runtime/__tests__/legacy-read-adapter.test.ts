import assert from "node:assert/strict";
import { test } from "node:test";
import { adaptLegacyToTacticalScene, type LegacyReadAdapterInput } from "../legacy-read-adapter";

const document = {
  version: 1,
  name: "Cripta legacy",
  linkedMissionId: "mission-1",
  floors: [
    {
      id: "floor-a", label: "Piano A", sortOrder: 0, width: 1000, height: 800,
      grid: { kind: "square", cellPx: 50, offsetX: 0, offsetY: 0 }, activeLayerId: "layer-a",
      areas: [{ id: "area-a", kind: "room", polygon: [{ x: 100, y: 100 }, { x: 900, y: 100 }, { x: 900, y: 700 }, { x: 100, y: 700 }] }],
      walls: [{ id: "wall-a", x1: 100, y1: 100, x2: 900, y2: 100 }], props: [], gmNotes: [],
      layers: [
        { id: "layer-a", label: "Struttura", sortOrder: 0, presetId: "classic_hatching", opacity: 0.8, visible: true, areas: [{ id: "area-a", kind: "room", polygon: [{ x: 100, y: 100 }, { x: 900, y: 100 }, { x: 900, y: 700 }, { x: 100, y: 700 }] }], walls: [{ id: "wall-a", x1: 100, y1: 100, x2: 900, y2: 100 }] },
        { id: "layer-effects", label: "Effetti", sortOrder: 1, presetId: "classic_hatching", opacity: 0.5, visible: false, areas: [], walls: [] },
      ],
    },
    {
      id: "floor-b", label: "Piano B", sortOrder: 1, width: 1200, height: 900,
      grid: { kind: "square", cellPx: 60, offsetX: 0, offsetY: 0 }, activeLayerId: "layer-b",
      areas: [{ id: "area-b", kind: "corridor", polygon: [{ x: 0, y: 0 }, { x: 1200, y: 0 }, { x: 1200, y: 900 }, { x: 0, y: 900 }] }],
      walls: [], props: [], gmNotes: [],
      layers: [{ id: "layer-b", label: "Struttura", sortOrder: 0, presetId: "classic_hatching", opacity: 1, visible: true, areas: [{ id: "area-b", kind: "corridor", polygon: [{ x: 0, y: 0 }, { x: 1200, y: 0 }, { x: 1200, y: 900 }, { x: 0, y: 900 }] }], walls: [] }],
    },
  ],
};

function input(): LegacyReadAdapterInput {
  return {
    sceneDocument: { id: "scene-1", campaign_id: "camp-1", name: "Cripta legacy", linked_mission_id: "mission-1", document, document_version: 1 },
    explorationMaps: [
      { id: "map-a", campaign_id: "camp-1", linked_mission_id: "mission-1", floor_label: "Piano A", sort_order: 0, image_path: "camp-1/a.webp", source_type: "uploaded_image", scene_document_id: "scene-1", scene_floor_id: "floor-a", grid_kind: "square" },
      { id: "map-b", campaign_id: "camp-1", linked_mission_id: "mission-1", floor_label: "Piano B", sort_order: 1, image_path: "camp-1/b.webp", source_type: "generated_scene", scene_document_id: "scene-1", scene_floor_id: "floor-b", grid_kind: "square" },
    ],
    fowRegions: [
      { id: "fow-a", map_id: "map-a", polygon: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }], is_revealed: true, sort_order: 0, source_area_id: "area-a" },
      { id: "fow-b", map_id: "map-b", polygon: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], is_revealed: false, sort_order: 0, source_area_id: null, origin: "manual" },
    ],
    overlays: [{ map_id: "map-a", exploration_map_id: "map-a", overlay_draft: [{ id: "marker-1", kind: "symbol", symbolId: "star", x: 0.5, y: 0.5, color: "#e8c97a" }], overlay_items: [{ id: "text-1", kind: "text", text: "Ingresso", x: 0.2, y: 0.2, fontRel: 0.03, color: "#fff" }] }],
    wikiMaps: [{ id: "wiki-map-1" }],
  };
}

test("adatta una scena multi-piano preservando asset, FoW e overlay", () => {
  const value = input();
  const result = adaptLegacyToTacticalScene(value);
  assert.ok(result.scene);
  assert.equal(result.scene.floors.length, 2);
  assert.equal(result.scene.floors[0]!.asset.origin, "upload");
  assert.equal(result.scene.floors[1]!.asset.origin, "rendered");
  assert.deepEqual(result.scene.floors[0]!.layers.map((layer) => layer.id), ["layer-a", "layer-effects"]);
  assert.equal(result.scene.floors[0]!.layers[0]!.opacity, 0.8);
  assert.equal(result.scene.floors[0]!.layers[0]!.features.length, 2);
  assert.equal(result.scene.fow.regions.length, 2);
  assert.equal(result.scene.fow.regions[0]!.origin, "derived");
  assert.equal(result.scene.fow.regions[1]!.origin, "manual");
  assert.equal(result.scene.overlay.draft.length, 1);
  assert.equal(result.scene.overlay.published?.length, 1);
  assert.ok(result.report.entries.some((item) => item.code === "scene_converted"));
});

test("segnala orfani e ambiguità senza produrre una scena parzialmente valida", () => {
  const value = input();
  value.explorationMaps = value.explorationMaps.filter((map) => map.scene_floor_id !== "floor-b");
  value.fowRegions.push({ id: "orphan", map_id: "missing", polygon: [], is_revealed: false, sort_order: 2, source_area_id: null });
  const result = adaptLegacyToTacticalScene(value);
  assert.equal(result.scene, undefined);
  assert.ok(result.report.entries.some((item) => item.severity === "orphan" && item.code === "floor_without_map"));
  assert.ok(result.report.entries.some((item) => item.severity === "orphan" && item.code === "region_without_scene_floor"));
});

test("esclude esplicitamente overlay delle mappe Wiki", () => {
  const value = input();
  value.overlays = [{ map_id: "wiki-map-1", overlay_items: [{ id: "x", kind: "symbol", symbolId: "star", x: 0.5, y: 0.5 }] }];
  const result = adaptLegacyToTacticalScene(value);
  assert.ok(result.scene);
  assert.equal(result.scene.overlay.draft.length, 0);
  assert.ok(result.report.entries.some((item) => item.code === "wiki_map_overlay_excluded"));
});

test("riporta ogni overlay legacy invalido o sconosciuto senza convertirlo", () => {
  const value = input();
  value.overlays = [{
    map_id: "map-a", exploration_map_id: "map-a",
    overlay_draft: [
      { id: "bad-type", kind: "circle", x: 0.5, y: 0.5 },
      { id: "bad-symbol", kind: "symbol", symbolId: "unknown", x: 0.5, y: 0.5, color: "#e8c97a" },
      { id: "bad-coordinate", kind: "text", text: "x", x: 2, y: 0.5, fontRel: 0.03, color: "#fff" },
      { id: "normalized", kind: "text", text: "x", x: 0.5, y: 0.5, color: "#fff" },
    ],
  }];
  const result = adaptLegacyToTacticalScene(value);
  assert.ok(result.scene);
  assert.equal(result.scene.overlay.draft.length, 0);
  assert.ok(result.report.entries.some((item) => item.code === "overlay_item_type_unsupported"));
  assert.ok(result.report.entries.some((item) => item.code === "overlay_item_symbol_invalid"));
  assert.ok(result.report.entries.some((item) => item.code === "overlay_item_text_invalid"));
  assert.ok(result.report.entries.some((item) => item.code === "overlay_item_normalized"));
});

test("non muta gli input", () => {
  const value = input();
  const before = JSON.stringify(value);
  adaptLegacyToTacticalScene(value);
  assert.equal(JSON.stringify(value), before);
});
