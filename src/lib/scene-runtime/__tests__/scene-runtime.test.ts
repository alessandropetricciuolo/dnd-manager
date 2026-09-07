import assert from "node:assert/strict";
import { test } from "node:test";
import { applyFowPatches, createTacticalScene, deriveFowFromFeatures, normalizeTacticalScene, parseTacticalSceneDocument, saveTacticalSceneRevision, serializeTacticalScene, transitionTacticalScene, validateTacticalScene } from "../index";
import type { SceneFloor } from "../types";

const floor: SceneFloor = { id: "floor-1", label: "Sala", sortOrder: 0, width: 1000, height: 800, asset: { id: "asset-1", origin: "upload", storageKey: "scene/map.webp", mimeType: "image/webp", width: 1000, height: 800 }, grid: { visible: false, kind: "square", cellSize: 50, offsetX: 0, offsetY: 0 }, layers: [{ id: "layer-1", label: "Struttura", sortOrder: 0, visible: true, opacity: 1, features: [{ id: "area-1", kind: "area", geometry: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }], visible: true }] }] };

test("crea, serializza e rilegge una scena tattica senza mappe Wiki", () => {
  const scene = createTacticalScene({ id: "scene-1", campaignId: "campaign-1", name: "Cripta", floors: [floor] });
  const parsed = parseTacticalSceneDocument(serializeTacticalScene(scene));
  assert.equal(parsed.ok, true); if (parsed.ok) assert.equal(parsed.scene.floors[0].id, "floor-1");
  assert.equal((scene as Record<string, unknown>).wikiMapId, undefined);
});
test("rifiuta coordinate fuori intervallo, poligoni degeneri e id duplicati", () => {
  const scene = createTacticalScene({ id: "scene-2", campaignId: "campaign-1", name: "Test", floors: [floor] });
  const invalid = { ...scene, floors: [{ ...floor, layers: [{ ...floor.layers[0], features: [{ ...floor.layers[0].features[0], id: "area-1", geometry: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }, { x: 1.2, y: 0 }] }] }] }, { ...floor, id: "floor-1" }] };
  const result = validateTacticalScene(invalid); assert.equal(result.ok, false);
});
test("deriva FoW da feature stabile e applica patch in ordine deterministico", () => {
  const scene = deriveFowFromFeatures(createTacticalScene({ id: "scene-3", campaignId: "campaign-1", name: "Test", floors: [floor] }), "floor-1");
  assert.equal(scene.fow.regions[0].sourceFeatureId, "area-1");
  const patched = applyFowPatches({ ...scene, fow: { ...scene.fow, patches: [{ id: "z", regionId: "fow-area-1", operation: "hide" }, { id: "a", regionId: "fow-area-1", operation: "reveal" }] } });
  assert.equal(patched.fow.regions[0].revealed, false);
});
test("separa stato operativo FoW dalle revisioni strutturali e rileva conflitti", () => {
  const scene = createTacticalScene({ id: "scene-4", campaignId: "campaign-1", name: "Test", floors: [floor] });
  const next = saveTacticalSceneRevision(scene, 1, { ...scene, name: "Test 2", fow: { regions: [], patches: [] } });
  assert.equal(next.revisionNo, 2); assert.throws(() => saveTacticalSceneRevision(scene, 0, { ...scene }));
  assert.throws(() => transitionTacticalScene(scene, "live", 1));
  assert.equal(transitionTacticalScene(transitionTacticalScene(scene, "ready", 1), "live", 2).lifecycle, "live");
});
test("griglia nascosta e normalizzazione preservano gli id", () => {
  const scene = createTacticalScene({ id: "scene-5", campaignId: "campaign-1", name: "Test", floors: [floor] });
  const normalized = normalizeTacticalScene(scene); assert.equal(normalized.floors[0].grid?.visible, false); assert.equal(normalized.floors[0].layers[0].features[0].id, "area-1");
});
test("l'import Foundry resta un input esplicito e non presume una versione", () => {
  const scene = createTacticalScene({ id: "scene-6", campaignId: "campaign-1", name: "Test", floors: [floor] });
  const withImport = { ...scene, fow: { regions: [], patches: [], importedInput: { format: "foundry-json" as const, version: "v10", payload: { walls: [] } } } };
  assert.equal(validateTacticalScene(withImport).ok, true);
});

test("rifiuta riferimenti FoW a piani, feature o revisioni non coerenti", () => {
  const scene = createTacticalScene({ id: "scene-7", campaignId: "campaign-1", name: "Test", floors: [floor] });
  const invalid = { ...scene, fow: { regions: [{ id: "fow-invalid", floorId: "missing", polygon: floor.layers[0].features[0].geometry, revealed: false, origin: "derived" as const, sourceFeatureId: "missing-feature", sourceRevisionNo: 2 }], patches: [] } };
  const result = validateTacticalScene(invalid);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.includes("piano inesistente")) && result.errors.some((error) => error.includes("feature sorgente")) && result.errors.some((error) => error.includes("revisione sorgente")));
});

test("non ignora patch FoW poligonali parziali", () => {
  const scene = deriveFowFromFeatures(createTacticalScene({ id: "scene-8", campaignId: "campaign-1", name: "Test", floors: [floor] }), "floor-1");
  const invalid = { ...scene, fow: { ...scene.fow, patches: [{ id: "partial", regionId: "fow-area-1", operation: "reveal" as const, polygon: [{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.1 }, { x: 0.4, y: 0.4 }, { x: 0.1, y: 0.4 }] }] } };
  const result = validateTacticalScene(invalid);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.includes("coincidere con la regione")));
});

test("valida asset e geometrie overlay nel contratto normalizzato", () => {
  const scene = createTacticalScene({ id: "scene-9", campaignId: "campaign-1", name: "Test", floors: [floor] });
  const invalid = { ...scene, overlay: { draft: [{ id: "bad", type: "image" as const, x: 1.2, y: 0.2, width: 1.1, height: 0.5, assetId: "missing", opacity: 2, rotation: Number.NaN }], published: null } };
  const result = validateTacticalScene(invalid);
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.some((error) => error.includes("x fuori")) && result.errors.some((error) => error.includes("dimensioni")) && result.errors.some((error) => error.includes("opacità")) && result.errors.some((error) => error.includes("asset inesistente")));
});
