export {
  SCENE_DOCUMENT_VERSION,
  createEmptySceneDocument,
  pixelPolygonToNorm,
  rectangleAreaPolygon,
  type SceneAreaKindV1,
  type SceneAreaV1,
  type SceneDocument,
  type SceneDocumentV1,
  type SceneFloorV1,
  type SceneGmNoteV1,
  type SceneGridV1,
  type SceneLayerV1,
  type ScenePropV1,
  type SceneWallDoorV1,
  type SceneWallV1,
} from "./types";
export {
  SCENE_PROP_CATALOG,
  SCENE_PROP_KINDS,
  isScenePropKind,
  scenePropCatalogEntry,
  type ScenePropCatalogEntry,
  type ScenePropKindV1,
} from "./props-catalog";
export {
  SCENE_LAYER_PRESET_IDS,
  SCENE_LAYER_PRESETS,
  isSceneLayerPresetId,
  sceneLayerPreset,
  type SceneLayerPreset,
  type SceneLayerPresetId,
} from "./layer-presets";
export {
  normalizeSceneDocument,
  normalizeSceneFloor,
  prepareSceneDocumentForSave,
  prepareFloorForSave,
  getActiveLayer,
  updateActiveLayer,
  flattenAreasFromLayers,
  createDefaultLayer,
} from "./normalize-floor";
export { cloneSceneDocument } from "./clone-document";
export {
  assertSceneDocumentV1,
  parseSceneDocumentV1,
  type ParseSceneDocumentResult,
} from "./validate";
