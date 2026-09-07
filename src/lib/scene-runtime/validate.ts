import type { FowPatch, FowRegion, NormPoint, NormPolygon, SceneOverlayItem, SceneValidationResult, TacticalScene } from "./types";
import { TACTICAL_SCENE_SCHEMA_VERSION } from "./types";

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const id = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
function point(p: NormPoint) { return finite(p.x) && finite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1; }
function polygon(poly: NormPolygon) {
  return Array.isArray(poly) && poly.length >= 3 && poly.every(point) && Math.abs(poly.reduce((a, p, i) => a + p.x * poly[(i + 1) % poly.length].y - p.y * poly[(i + 1) % poly.length].x, 0)) > 0.000001;
}
function samePolygon(a: NormPolygon, b: NormPolygon) {
  return a.length === b.length && a.every((point, index) => point.x === b[index]?.x && point.y === b[index]?.y);
}
function unique(errors: string[], values: string[], label: string) {
  const seen = new Set<string>();
  values.forEach((value) => { if (seen.has(value)) errors.push(`${label}: id duplicato ${value}`); seen.add(value); });
}
function checkOverlay(item: SceneOverlayItem, errors: string[]) {
  if (!id(item.id)) errors.push("overlay: id mancante");
  if (item.type === "area" && !polygon(item.polygon)) errors.push(`overlay ${item.id}: poligono non valido`);
  if ("x" in item && (!finite(item.x) || item.x < 0 || item.x > 1)) errors.push(`overlay ${item.id}: coordinata x fuori intervallo`);
  if ("y" in item && (!finite(item.y) || item.y < 0 || item.y > 1)) errors.push(`overlay ${item.id}: coordinata y fuori intervallo`);
  if ((item.type === "image" || item.type === "gif") && (!id(item.assetId) || !finite(item.width) || !finite(item.height) || item.width <= 0 || item.width > 1 || item.height <= 0 || item.height > 1)) errors.push(`overlay ${item.id}: asset o dimensioni non validi`);
  if ("opacity" in item && item.opacity !== undefined && (!finite(item.opacity) || item.opacity < 0 || item.opacity > 1)) errors.push(`overlay ${item.id}: opacità non valida`);
  if ("rotation" in item && item.rotation !== undefined && !finite(item.rotation)) errors.push(`overlay ${item.id}: rotazione non valida`);
  if (item.type === "text" && item.size !== undefined && (!finite(item.size) || item.size <= 0)) errors.push(`overlay ${item.id}: dimensione testo non valida`);
  if ((item.type === "circle" || item.type === "measure") && (!finite(item.radius) || item.radius <= 0 || item.radius > 1)) errors.push(`overlay ${item.id}: misura non valida`);
  if (item.type === "timer" && (!Number.isInteger(item.seconds) || item.seconds < 0)) errors.push(`overlay ${item.id}: timer non valido`);
}
export function validateTacticalScene(scene: TacticalScene): SceneValidationResult {
  const errors: string[] = [];
  if (scene.schemaVersion !== TACTICAL_SCENE_SCHEMA_VERSION) errors.push("schemaVersion non supportata");
  if (!id(scene.id) || !id(scene.campaignId) || !id(scene.name) || !id(scene.revisionId)) errors.push("identità scena/revisione incompleta");
  if (!Number.isInteger(scene.revisionNo) || scene.revisionNo < 1) errors.push("revisionNo non valido");
  if (!scene.lifecycle || !["draft", "ready", "live", "archived"].includes(scene.lifecycle)) errors.push("lifecycle non valido");
  const floorIds = scene.floors.map((f) => f.id); unique(errors, floorIds, "floor");
  const featureIds: string[] = []; const layerIds: string[] = [];
  scene.floors.forEach((floor) => {
    if (!id(floor.id) || !id(floor.asset.id) || !id(floor.asset.storageKey) || !id(floor.asset.mimeType) || !["upload", "generated", "rendered"].includes(floor.asset.origin)) errors.push(`floor ${floor.id}: identità/asset incompleto`);
    if (!finite(floor.width) || !finite(floor.height) || floor.width <= 0 || floor.height <= 0 || !finite(floor.asset.width) || !finite(floor.asset.height) || floor.asset.width <= 0 || floor.asset.height <= 0) errors.push(`floor ${floor.id}: dimensioni non valide`);
    if (floor.grid && (!finite(floor.grid.cellSize) || floor.grid.cellSize <= 0 || !finite(floor.grid.offsetX) || !finite(floor.grid.offsetY))) errors.push(`floor ${floor.id}: griglia non valida`);
    floor.layers.forEach((layer) => { layerIds.push(layer.id); if (!id(layer.label) || !Number.isFinite(layer.sortOrder) || !Number.isFinite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1) errors.push(`layer ${layer.id}: ordine/opacità non validi`); layer.features.forEach((feature) => { featureIds.push(feature.id); if (!id(feature.id) || !polygon(feature.geometry)) errors.push(`feature ${feature.id}: geometria non valida`); if (feature.layerId && feature.layerId !== layer.id) errors.push(`feature ${feature.id}: layer incompatibile`); }); });
  });
  unique(errors, layerIds, "layer"); unique(errors, featureIds, "feature");
  const regionIds: string[] = []; scene.fow.regions.forEach((region: FowRegion) => { regionIds.push(region.id); const sourceFloor = scene.floors.find((floor) => floor.id === region.floorId); const sourceFeature = sourceFloor?.layers.flatMap((layer) => layer.features).find((feature) => feature.id === region.sourceFeatureId); if (!id(region.floorId) || !sourceFloor || !polygon(region.polygon)) errors.push(`FoW ${region.id}: regione o piano inesistente`); if (region.sourceFeatureId !== undefined && (!sourceFeature || !polygon(sourceFeature.geometry))) errors.push(`FoW ${region.id}: feature sorgente inesistente sul piano`); if (region.sourceRevisionNo !== undefined && (!Number.isInteger(region.sourceRevisionNo) || region.sourceRevisionNo < 1 || region.sourceRevisionNo > scene.revisionNo)) errors.push(`FoW ${region.id}: revisione sorgente non coerente`); }); unique(errors, regionIds, "FoW");
  const patchIds: string[] = []; scene.fow.patches.forEach((patch: FowPatch) => { patchIds.push(patch.id); const region = scene.fow.regions.find((candidate) => candidate.id === patch.regionId); if (!id(patch.regionId) || !region) errors.push(`patch ${patch.id}: regione inesistente`); if (patch.polygon && (!polygon(patch.polygon) || !samePolygon(patch.polygon, region?.polygon ?? []))) errors.push(`patch ${patch.id}: il poligono deve coincidere con la regione (il core applica patch a regione intera)`); }); unique(errors, patchIds, "patch");
  const availableAssetIds = new Set(scene.floors.map((floor) => floor.asset.id));
  // Draft and published overlays are separate snapshots. The same stable id
  // may intentionally exist in both while a draft is being edited against a
  // published projection; duplicates inside one snapshot remain invalid.
  unique(errors, scene.overlay.draft.map((item) => item.id), "overlay draft");
  unique(errors, (scene.overlay.published ?? []).map((item) => item.id), "overlay published");
  [...scene.overlay.draft, ...(scene.overlay.published ?? [])].forEach((item) => { checkOverlay(item, errors); if ((item.type === "image" || item.type === "gif") && !availableAssetIds.has(item.assetId)) errors.push(`overlay ${item.id}: asset inesistente`); });
  return errors.length ? { ok: false, errors } : { ok: true, scene };
}
export function parseTacticalScene(raw: unknown): SceneValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, errors: ["documento scena non valido"] };
  const result = validateTacticalScene(raw as TacticalScene); return result;
}
