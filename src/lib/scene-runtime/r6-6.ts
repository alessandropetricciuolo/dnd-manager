import { importTrainSceneToFow } from "@/lib/exploration/train-scene-import";
import { ellipseToNormPolygon, rectangleToNormPolygon, scalePolygonFromCenter, sprayBlobToNormPolygon, translatePolygon } from "@/lib/exploration/fow-shape-tools";
import type { FowOrigin, FowRegion, NormPoint, TacticalScene } from "./types";

export { scalePolygonFromCenter, translatePolygon };
export type FowTool = "vertex" | "rectangle" | "circle" | "spray" | "polygon";
export type FowImportMode = "merge" | "replace";
export type FowImportPreview = { raw: unknown; sceneName: string; width: number; height: number; grid: number; regions: { polygon: NormPoint[]; cellCount: number }[] };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function makeFowPolygon(tool: FowTool, start: NormPoint, end: NormPoint): NormPoint[] {
  if (tool === "circle") return ellipseToNormPolygon(start, end);
  if (tool === "spray") return sprayBlobToNormPolygon(start, end);
  return rectangleToNormPolygon(start, end);
}
export function pointInPolygon(point: NormPoint, polygon: NormPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export function hitTestFowRegion(regions: FowRegion[], point: NormPoint): FowRegion | undefined { return [...regions].reverse().find((region) => pointInPolygon(point, region.polygon)); }
export function nearestVertexIndex(polygon: NormPoint[], point: NormPoint, tolerance = 0.035): number {
  let best = -1, distance = tolerance;
  polygon.forEach((vertex, index) => { const candidate = Math.hypot(vertex.x - point.x, vertex.y - point.y); if (candidate <= distance) { best = index; distance = candidate; } });
  return best;
}
export function moveFowVertex(polygon: NormPoint[], index: number, point: NormPoint): NormPoint[] { return polygon.map((vertex, candidate) => candidate === index ? { x: clamp(point.x), y: clamp(point.y) } : vertex); }
export function addManualFow(scene: TacticalScene, floorId: string, polygon: NormPoint[], origin: FowOrigin = "manual"): TacticalScene { const region: FowRegion = { id: `fow-${crypto.randomUUID()}`, floorId, polygon, revealed: false, origin }; return { ...scene, fow: { ...scene.fow, regions: [...scene.fow.regions, region] } }; }
export function updateFowRegion(scene: TacticalScene, id: string, polygon: NormPoint[]): TacticalScene { return { ...scene, fow: { ...scene.fow, regions: scene.fow.regions.map((region) => region.id === id ? { ...region, polygon } : region) } }; }
export function deleteFowRegion(scene: TacticalScene, id: string): TacticalScene { return { ...scene, fow: { ...scene.fow, regions: scene.fow.regions.filter((region) => region.id !== id), patches: scene.fow.patches.filter((patch) => patch.regionId !== id) } }; }
export function setAllFow(scene: TacticalScene, revealed: boolean, floorId?: string): TacticalScene { return { ...scene, fow: { ...scene.fow, regions: scene.fow.regions.map((region) => !floorId || region.floorId === floorId ? { ...region, revealed } : region) } }; }
export function resetFow(scene: TacticalScene, floorId?: string): TacticalScene {
  const affected = new Set(scene.fow.regions.filter((region) => !floorId || region.floorId === floorId).map((region) => region.id));
  const reset = setAllFow(scene, false, floorId);
  return { ...reset, fow: { ...reset.fow, patches: scene.fow.patches.filter((patch) => !affected.has(patch.regionId)) } };
}
export function hideAllFow(scene: TacticalScene, floorId?: string): TacticalScene { return setAllFow(scene, false, floorId); }
export function toggleRegion(scene: TacticalScene, id: string, revealed: boolean): TacticalScene { return { ...scene, fow: { ...scene.fow, regions: scene.fow.regions.map((region) => region.id === id ? { ...region, revealed } : region) } }; }
export function previewFoundryFow(raw: unknown): FowImportPreview {
  const imported = importTrainSceneToFow(raw);
  return { raw, sceneName: imported.scene.name, width: imported.scene.width, height: imported.scene.height, grid: imported.scene.grid, regions: imported.regions.map(({ polygon, cellCount }) => ({ polygon, cellCount })) };
}
export function applyFoundryFow(scene: TacticalScene, floorId: string, preview: FowImportPreview, mode: FowImportMode): TacticalScene {
  const imported = preview.regions.map((region) => ({ id: `fow-${crypto.randomUUID()}`, floorId, polygon: region.polygon, revealed: false, origin: "imported" as const }));
  const replacedIds = new Set(scene.fow.regions.filter((region) => mode === "replace" && region.floorId === floorId).map((region) => region.id));
  const retained = mode === "replace" ? scene.fow.regions.filter((region) => region.floorId !== floorId) : scene.fow.regions;
  return { ...scene, fow: { ...scene.fow, regions: [...retained, ...imported], patches: scene.fow.patches.filter((patch) => !replacedIds.has(patch.regionId)), importedInput: { format: "foundry-json", version: "1", payload: preview.raw } } };
}
export function importFoundryFow(scene: TacticalScene, floorId: string, raw: unknown): TacticalScene { return applyFoundryFow(scene, floorId, previewFoundryFow(raw), "replace"); }
