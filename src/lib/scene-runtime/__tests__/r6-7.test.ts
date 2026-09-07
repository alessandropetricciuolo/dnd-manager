import assert from "node:assert/strict";
import test from "node:test";
import { addSceneFeature, addSceneGmNote, addSceneLayer, addSceneProp, deriveSceneFloorPreview, generateSceneDungeon, reorderSceneLayers, snapScenePoint, updateSceneGmNote, removeSceneGmNote, updateSceneLayer } from "../r6-7";
import { createTacticalScene } from "../index";
import { createWorkspaceState, publishWorkspace } from "../workspace";

const scene = () => createTacticalScene({ id: "s", campaignId: "c", name: "Scene", floors: [{ id: "f", label: "Piano", sortOrder: 0, width: 1000, height: 1000, asset: { id: "a", origin: "upload", storageKey: "/map.png", mimeType: "image/png", width: 1000, height: 1000 }, layers: [{ id: "l", label: "Base", sortOrder: 0, visible: true, opacity: 1, features: [] }] }] });

test("R6.7 gestisce layer, feature, prop e note private", () => {
  let value = scene();
  value = addSceneFeature(value, "f", { kind: "area", geometry: [{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.1 }, { x: 0.4, y: 0.4 }], visible: true });
  value = addSceneProp(value, "f", { kind: "torch", x: 0.5, y: 0.5 });
  value = addSceneGmNote(value, "f", { x: 0.2, y: 0.2, text: "Segreto" });
  assert.equal(value.floors[0]!.layers[0]!.features.length, 1);
  assert.equal(value.floors[0]!.props?.length, 1);
  assert.equal(value.floors[0]!.gmNotes?.length, 1);
});

test("R6.7 layer order/style and dungeon generation are deterministic", () => {
  const base = scene();
  const withLayer = addSceneLayer(base.floors[0]!);
  const styled = updateSceneLayer(withLayer, withLayer.layers[1]!.id, { opacity: 0.5, visible: false });
  assert.equal(styled.layers[1]!.opacity, 0.5);
  assert.equal(reorderSceneLayers(styled, [styled.layers[1]!.id, styled.layers[0]!.id]).layers[0]!.id, styled.layers[1]!.id);
  const a = generateSceneDungeon(base.floors[0]!, { roomCount: 4, seed: "same" });
  const b = generateSceneDungeon(base.floors[0]!, { roomCount: 4, seed: "same" });
  assert.deepEqual(a.layers[0]!.features.map((feature) => feature.geometry), b.layers[0]!.features.map((feature) => feature.geometry));
});

test("R6.7 applica snap opzionale sulla griglia", () => {
  assert.deepEqual(snapScenePoint({ x: 0.24, y: 0.26 }, { cellSize: 100, width: 1000, height: 1000 }), { x: 0.2, y: 0.3 });
  assert.deepEqual(snapScenePoint({ x: 0.24, y: 0.26 }, undefined), { x: 0.24, y: 0.26 });
});

test("le note GM restano private e non entrano nella publication", () => {
  const draft = addSceneGmNote(scene(), "f", { x: 0.2, y: 0.2, text: "Segreto" });
  const ready = { ...draft, lifecycle: "ready" as const };
  const live = publishWorkspace(createWorkspaceState(ready));
  assert.deepEqual(live.published?.floors[0]?.gmNotes, []);
  assert.equal(live.draft.floors[0]?.gmNotes?.length, 1);
});

test("ciclo locale multi-piano con prop, nota e preview derivata", () => {
  const first = addSceneProp(addSceneGmNote(scene(), "f", { x: .1, y: .1, text: "segreto" }), "f", { kind: "torch", x: .2, y: .2 });
  const edited = updateSceneGmNote(first, "f", first.floors[0]!.gmNotes![0]!.id, { text: "segreto modificato", x: .3, y: .3 });
  const preview = deriveSceneFloorPreview(edited.floors[0]!);
  const second = { ...preview, id: "f2", label: "Secondo piano", sortOrder: 1 };
  const multi = { ...edited, floors: [preview, second] };
  const live = publishWorkspace(createWorkspaceState({ ...multi, lifecycle: "ready" }));
  assert.equal(live.published?.floors.length, 2);
  assert.equal(live.published?.floors.every((floor) => (floor.gmNotes ?? []).length === 0), true);
  assert.ok(live.draft.floors[0]?.previewAsset?.storageKey.startsWith("data:image/svg+xml,"));
  const removed = removeSceneGmNote(live.draft, "f", live.draft.floors[0]!.gmNotes![0]!.id);
  assert.equal(removed.floors[0]?.gmNotes?.length, 0);
});
