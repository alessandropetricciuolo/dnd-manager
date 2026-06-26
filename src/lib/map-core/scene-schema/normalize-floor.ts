import { generateWallsFromAreas } from "../scene-editor/auto-walls";
import type { SceneDocumentV1, SceneFloorV1, SceneLayerV1 } from "./types";
import type { SceneLayerPresetId } from "./layer-presets";
import { isSceneLayerPresetId } from "./layer-presets";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function defaultLayerFromLegacy(floor: SceneFloorV1): SceneLayerV1 {
  const layerId = newId();
  const areas = floor.areas ?? [];
  const walls = generateWallsFromAreas(areas, floor.walls ?? []);
  return {
    id: layerId,
    label: "Layer 1",
    sortOrder: 0,
    presetId: "classic_hatching",
    opacity: 1,
    visible: true,
    areas,
    walls,
  };
}

/** Migra piani legacy (solo areas/walls) al modello a layer. */
export function normalizeSceneFloor(floor: SceneFloorV1): SceneFloorV1 {
  const props = floor.props ?? [];
  const gmNotes = floor.gmNotes ?? [];

  if (floor.layers && floor.layers.length > 0) {
    const layers = floor.layers.map((layer, i) => ({
      ...layer,
      sortOrder: layer.sortOrder ?? i,
      walls: generateWallsFromAreas(layer.areas ?? [], layer.walls ?? []),
    }));
    const activeLayerId =
      floor.activeLayerId && layers.some((l) => l.id === floor.activeLayerId)
        ? floor.activeLayerId
        : layers[0].id;
    return {
      ...floor,
      props,
      gmNotes,
      layers,
      activeLayerId,
      areas: flattenAreasFromLayers(layers),
      walls: flattenWallsFromLayers(layers),
    };
  }

  const layer = defaultLayerFromLegacy(floor);
  return {
    ...floor,
    props,
    gmNotes,
    layers: [layer],
    activeLayerId: layer.id,
    areas: layer.areas,
    walls: layer.walls,
  };
}

export function normalizeSceneDocument(doc: SceneDocumentV1): SceneDocumentV1 {
  return {
    ...doc,
    floors: doc.floors.map(normalizeSceneFloor),
  };
}

export function flattenAreasFromLayers(layers: SceneLayerV1[]) {
  return layers.filter((l) => l.visible).flatMap((l) => l.areas);
}

export function flattenWallsFromLayers(layers: SceneLayerV1[]) {
  return layers.filter((l) => l.visible).flatMap((l) => l.walls);
}

export function getActiveLayer(floor: SceneFloorV1): SceneLayerV1 {
  const normalized = normalizeSceneFloor(floor);
  const layer =
    normalized.layers.find((l) => l.id === normalized.activeLayerId) ?? normalized.layers[0];
  return layer;
}

export function updateActiveLayer(
  floor: SceneFloorV1,
  updater: (layer: SceneLayerV1) => SceneLayerV1
): SceneFloorV1 {
  const normalized = normalizeSceneFloor(floor);
  const activeId = normalized.activeLayerId;
  const layers = normalized.layers.map((layer) => {
    if (layer.id !== activeId) return layer;
    const next = updater(layer);
    const walls = generateWallsFromAreas(next.areas, next.walls);
    return { ...next, walls };
  });
  return {
    ...normalized,
    layers,
    areas: flattenAreasFromLayers(layers),
    walls: flattenWallsFromLayers(layers),
  };
}

export function prepareFloorForSave(floor: SceneFloorV1): SceneFloorV1 {
  const normalized = normalizeSceneFloor(floor);
  const layers = normalized.layers.map((layer) => ({
    ...layer,
    walls: generateWallsFromAreas(layer.areas, layer.walls),
  }));
  return {
    ...normalized,
    layers,
    areas: flattenAreasFromLayers(layers),
    walls: flattenWallsFromLayers(layers),
  };
}

export function prepareSceneDocumentForSave(doc: SceneDocumentV1): SceneDocumentV1 {
  return {
    ...doc,
    floors: doc.floors.map(prepareFloorForSave),
  };
}

export function createDefaultLayer(
  label = "Layer 1",
  presetId: SceneLayerPresetId = "classic_hatching"
): SceneLayerV1 {
  return {
    id: newId(),
    label,
    sortOrder: 0,
    presetId: isSceneLayerPresetId(presetId) ? presetId : "classic_hatching",
    opacity: 1,
    visible: true,
    areas: [],
    walls: [],
  };
}
