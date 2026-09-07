import type { SceneLifecycle, TacticalScene } from "./types";
import { TACTICAL_SCENE_SCHEMA_VERSION } from "./types";
import { parseTacticalScene, validateTacticalScene } from "./validate";
export * from "./types";
export * from "./validate";
export * from "./legacy-read-adapter";
export * from "./access";

export function createTacticalScene(input: Pick<TacticalScene, "id" | "campaignId" | "name" | "floors"> & Partial<Pick<TacticalScene, "linkedMissionId">>): TacticalScene {
  const scene: TacticalScene = { schemaVersion: TACTICAL_SCENE_SCHEMA_VERSION, id: input.id, campaignId: input.campaignId, name: input.name.trim(), linkedMissionId: input.linkedMissionId ?? null, lifecycle: "draft", revisionId: `${input.id}:r1`, revisionNo: 1, parentRevisionId: null, floors: input.floors, fow: { regions: [], patches: [] }, overlay: { draft: [], published: null } };
  const result = validateTacticalScene(scene); if (!result.ok) throw new Error(result.errors.join("; ")); return scene;
}
export function serializeTacticalScene(scene: TacticalScene): string { const result = validateTacticalScene(scene); if (!result.ok) throw new Error(result.errors.join("; ")); return JSON.stringify(scene); }
export function parseTacticalSceneDocument(raw: string): ReturnType<typeof parseTacticalScene> { try { return parseTacticalScene(JSON.parse(raw)); } catch { return { ok: false, errors: ["JSON scena non valido"] }; } }
export function normalizeTacticalScene(scene: TacticalScene): TacticalScene {
  const round = (value: number) => Math.round(value * 1_000_000) / 1_000_000;
  const polygon = (points: { x: number; y: number }[]) => points.map((point) => ({ x: round(point.x), y: round(point.y) }));
  const copy = JSON.parse(JSON.stringify(scene)) as TacticalScene;
  copy.floors.forEach((floor) => floor.layers.forEach((layer) => layer.features.forEach((feature) => { feature.geometry = polygon(feature.geometry); })));
  copy.fow.regions.forEach((region) => { region.polygon = polygon(region.polygon); });
  copy.fow.patches.forEach((patch) => { if (patch.polygon) patch.polygon = polygon(patch.polygon); });
  copy.overlay.draft.forEach((item) => { if (item.type === "area") item.polygon = polygon(item.polygon); });
  copy.overlay.published?.forEach((item) => { if (item.type === "area") item.polygon = polygon(item.polygon); });
  return copy;
}
export function saveTacticalSceneRevision(scene: TacticalScene, expectedRevisionNo: number, next: Omit<TacticalScene, "revisionNo" | "parentRevisionId">): TacticalScene {
  if (scene.revisionNo !== expectedRevisionNo) throw new Error(`Conflitto revisione: attesa ${expectedRevisionNo}, corrente ${scene.revisionNo}`);
  const candidate = { ...next, revisionId: `${scene.id}:r${scene.revisionNo + 1}`, revisionNo: scene.revisionNo + 1, parentRevisionId: scene.revisionId };
  const result = validateTacticalScene(candidate); if (!result.ok) throw new Error(result.errors.join("; ")); return candidate;
}
const transitions: Record<SceneLifecycle, SceneLifecycle[]> = { draft: ["ready", "archived"], ready: ["draft", "live", "archived"], live: ["ready", "archived"], archived: [] };
export function transitionTacticalScene(scene: TacticalScene, nextLifecycle: SceneLifecycle, expectedRevisionNo: number): TacticalScene {
  if (scene.revisionNo !== expectedRevisionNo) throw new Error(`Conflitto revisione: attesa ${expectedRevisionNo}, corrente ${scene.revisionNo}`);
  if (!transitions[scene.lifecycle].includes(nextLifecycle)) throw new Error(`Transizione non consentita: ${scene.lifecycle} -> ${nextLifecycle}`);
  return { ...scene, revisionId: `${scene.id}:r${scene.revisionNo + 1}`, lifecycle: nextLifecycle, revisionNo: scene.revisionNo + 1, parentRevisionId: scene.revisionId };
}
export function deriveFowFromFeatures(scene: TacticalScene, floorId: string, sourceRevisionNo = scene.revisionNo): TacticalScene {
  const floor = scene.floors.find((item) => item.id === floorId); if (!floor) throw new Error(`Piano inesistente: ${floorId}`);
  const regions = floor.layers.flatMap((layer) => layer.visible ? layer.features.filter((feature) => feature.kind === "area" && feature.visible).map((feature) => ({ id: `fow-${feature.id}`, floorId, polygon: feature.geometry, revealed: false, origin: "derived" as const, sourceFeatureId: feature.id, sourceRevisionNo })) : []);
  return { ...scene, fow: { ...scene.fow, regions, patches: [] } };
}
export function applyFowPatches(scene: TacticalScene): TacticalScene {
  const regions = scene.fow.regions.map((region) => ({ ...region }));
  const byId = new Map(regions.map((region) => [region.id, region]));
  // R6.1 supports region-wide operational patches only. A polygon is accepted
  // solely as an explicit assertion of that scope and is validated accordingly.
  [...scene.fow.patches].sort((a, b) => a.id.localeCompare(b.id)).forEach((patch) => {
    const region = byId.get(patch.regionId); if (region) region.revealed = patch.operation === "reveal";
  });
  return { ...scene, fow: { ...scene.fow, regions } };
}
