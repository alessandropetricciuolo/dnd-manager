import { generateRandomDungeon, recommendedDungeonGrid, type RandomDungeonPropTheme, type RandomDungeonRoomSize } from "../map-core/scene-editor/random-dungeon";
import type { NormPoint, SceneFeature, SceneFloor, SceneGmNote, SceneLayer, SceneProp, TacticalScene } from "./types";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function snapScenePoint(point: NormPoint, grid?: { cellSize: number; width: number; height: number }, enabled = true): NormPoint {
  if (!enabled || !grid || grid.cellSize <= 0 || grid.width <= 0 || grid.height <= 0) return { x: clamp(point.x), y: clamp(point.y) };
  const x = Math.round((point.x * grid.width) / grid.cellSize) * grid.cellSize / grid.width;
  const y = Math.round((point.y * grid.height) / grid.cellSize) * grid.cellSize / grid.height;
  return { x: clamp(x), y: clamp(y) };
}

export function reorderSceneLayers(floor: SceneFloor, orderedIds: string[]): SceneFloor {
  if (orderedIds.length !== floor.layers.length || new Set(orderedIds).size !== orderedIds.length || orderedIds.some((id) => !floor.layers.some((layer) => layer.id === id))) throw new Error("Ordine layer non valido.");
  return { ...floor, layers: orderedIds.map((id, sortOrder) => ({ ...floor.layers.find((layer) => layer.id === id)!, sortOrder })) };
}

export function updateSceneLayer(floor: SceneFloor, layerId: string, patch: Partial<Pick<SceneLayer, "label" | "visible" | "opacity" | "style">>): SceneFloor {
  if (!floor.layers.some((layer) => layer.id === layerId)) throw new Error("Layer inesistente.");
  if (patch.opacity !== undefined && (patch.opacity < 0 || patch.opacity > 1 || !Number.isFinite(patch.opacity))) throw new Error("Opacità layer non valida.");
  return { ...floor, layers: floor.layers.map((layer) => layer.id === layerId ? { ...layer, ...patch } : layer) };
}

export function addSceneLayer(floor: SceneFloor, input?: Partial<SceneLayer>): SceneFloor {
  const id = input?.id ?? uid("layer");
  if (floor.layers.some((layer) => layer.id === id)) throw new Error("Layer già presente.");
  return { ...floor, layers: [...floor.layers, { id, label: input?.label?.trim() || `Layer ${floor.layers.length + 1}`, sortOrder: floor.layers.length, visible: input?.visible ?? true, opacity: input?.opacity ?? 1, features: input?.features ?? [] }] };
}

export function addSceneFeature(scene: TacticalScene, floorId: string, feature: Omit<SceneFeature, "id"> & { id?: string }): TacticalScene {
  const floor = scene.floors.find((item) => item.id === floorId); if (!floor) throw new Error("Piano inesistente.");
  const layerId = feature.layerId ?? floor.layers[0]?.id; if (!layerId) throw new Error("Aggiungi un layer prima di creare una feature.");
  if (scene.floors.some((item) => item.layers.some((layer) => layer.features.some((candidate) => candidate.id === feature.id)))) throw new Error("Feature già presente.");
  const next = { ...feature, id: feature.id ?? uid(feature.kind), layerId };
  return { ...scene, floors: scene.floors.map((item) => item.id !== floorId ? item : { ...item, layers: item.layers.map((layer) => layer.id === layerId ? { ...layer, features: [...layer.features, next] } : layer) }) };
}

export function updateSceneFeature(scene: TacticalScene, featureId: string, patch: Partial<Pick<SceneFeature, "geometry" | "label" | "visible">>): TacticalScene {
  let found = false;
  const floors = scene.floors.map((floor) => ({ ...floor, layers: floor.layers.map((layer) => ({ ...layer, features: layer.features.map((feature) => feature.id === featureId ? (found = true, { ...feature, ...patch }) : feature) })) }));
  if (!found) throw new Error("Feature inesistente.");
  return { ...scene, floors };
}

export function removeSceneFeature(scene: TacticalScene, featureId: string): TacticalScene {
  const exists = scene.floors.some((floor) => floor.layers.some((layer) => layer.features.some((feature) => feature.id === featureId)));
  if (!exists) throw new Error("Feature inesistente.");
  return { ...scene, floors: scene.floors.map((floor) => ({ ...floor, layers: floor.layers.map((layer) => ({ ...layer, features: layer.features.filter((feature) => feature.id !== featureId) })) })), fow: { ...scene.fow, regions: scene.fow.regions.filter((region) => region.sourceFeatureId !== featureId) } };
}

export function addSceneProp(scene: TacticalScene, floorId: string, prop: Omit<SceneProp, "id"> & { id?: string }): TacticalScene {
  if (!scene.floors.some((floor) => floor.id === floorId)) throw new Error("Piano inesistente.");
  const next = { ...prop, id: prop.id ?? uid("prop"), x: clamp(prop.x), y: clamp(prop.y), scale: prop.scale ?? 1 };
  return { ...scene, floors: scene.floors.map((floor) => floor.id === floorId ? { ...floor, props: [...(floor.props ?? []), next] } : floor) };
}

export function removeSceneProp(scene: TacticalScene, floorId: string, propId: string): TacticalScene {
  return { ...scene, floors: scene.floors.map((floor) => floor.id === floorId ? { ...floor, props: (floor.props ?? []).filter((prop) => prop.id !== propId) } : floor) };
}

export function addSceneGmNote(scene: TacticalScene, floorId: string, note: Omit<SceneGmNote, "id"> & { id?: string }): TacticalScene {
  if (!scene.floors.some((floor) => floor.id === floorId)) throw new Error("Piano inesistente.");
  const next = { ...note, id: note.id ?? uid("gm-note"), x: clamp(note.x), y: clamp(note.y) };
  return { ...scene, floors: scene.floors.map((floor) => floor.id === floorId ? { ...floor, gmNotes: [...(floor.gmNotes ?? []), next] } : floor) };
}

export function removeSceneGmNote(scene: TacticalScene, floorId: string, noteId: string): TacticalScene {
  return { ...scene, floors: scene.floors.map((floor) => floor.id === floorId ? { ...floor, gmNotes: (floor.gmNotes ?? []).filter((note) => note.id !== noteId) } : floor) };
}

export function updateSceneGmNote(scene: TacticalScene, floorId: string, noteId: string, patch: Partial<Pick<SceneGmNote, "x" | "y" | "text" | "width">>): TacticalScene {
  let found = false;
  const floors = scene.floors.map((floor) => floor.id !== floorId ? floor : { ...floor, gmNotes: (floor.gmNotes ?? []).map((note) => note.id === noteId ? (found = true, { ...note, ...patch, x: patch.x === undefined ? note.x : clamp(patch.x), y: patch.y === undefined ? note.y : clamp(patch.y) }) : note) });
  if (!found) throw new Error("Nota GM inesistente.");
  return { ...scene, floors };
}

/** Creates a stable SVG preview from the revision, useful before remote rasterization. */
export function deriveSceneFloorPreview(floor: SceneFloor): SceneFloor {
  const polygons = floor.layers.filter((layer) => layer.visible).flatMap((layer) => layer.features.filter((feature) => feature.visible).map((feature) => `<polygon points="${feature.geometry.map((p) => `${Math.round(p.x * floor.width)},${Math.round(p.y * floor.height)}`).join(" ")}" fill="${feature.kind === "area" ? "#b8894a33" : "none"}" stroke="#e5c07b" stroke-width="3" opacity="${layer.opacity}"/>`)).join("");
  const props = (floor.props ?? []).map((prop) => `<circle cx="${Math.round(prop.x * floor.width)}" cy="${Math.round(prop.y * floor.height)}" r="${Math.max(6, Math.round(10 * (prop.scale ?? 1)))}" fill="#d97706"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${floor.width}" height="${floor.height}" viewBox="0 0 ${floor.width} ${floor.height}"><rect width="100%" height="100%" fill="#211b18"/>${polygons}${props}</svg>`;
  return { ...floor, previewAsset: { id: `${floor.id}:preview:${svg.length}`, origin: "rendered", storageKey: `data:image/svg+xml,${encodeURIComponent(svg)}`, mimeType: "image/svg+xml", width: floor.width, height: floor.height } };
}

/** Deterministic compact dungeon proposal used by the tactical workspace. */
export function generateSceneDungeon(floor: SceneFloor, options: { roomCount: number; seed?: string; append?: boolean; roomSize?: RandomDungeonRoomSize; propTheme?: RandomDungeonPropTheme; withDoors?: boolean; withProps?: boolean }): SceneFloor {
  const count = Math.max(2, Math.min(14, Math.floor(options.roomCount)));
  const layer = floor.layers[0]; if (!layer) throw new Error("Aggiungi un layer prima di generare il dungeon.");
  const roomSize = options.roomSize ?? "medium"; const grid = recommendedDungeonGrid(count, roomSize);
  const result = generateRandomDungeon({ roomCount: count, cols: grid.cols, rows: grid.rows, cellPx: floor.grid?.cellSize ?? 50, offsetX: 0, offsetY: 0, roomSize, propTheme: options.propTheme ?? "dungeon", withDoors: options.withDoors ?? true, withProps: options.withProps ?? true, seed: options.seed ?? "r6.7" });
  const toNorm = (x: number, y: number) => ({ x: clamp(x / floor.width), y: clamp(y / floor.height) });
  const generated: SceneFeature[] = result.areas.map((area) => ({ id: uid("room"), kind: "area", geometry: area.polygon.map((point) => toNorm(point.x, point.y)), label: area.label, layerId: layer.id, visible: true }));
  const doorFeatures: SceneFeature[] = result.doorWalls.map((wall) => ({ id: uid("door"), kind: "door", geometry: [toNorm(wall.x1 - 5, wall.y1 - 5), toNorm(wall.x2 + 5, wall.y2 - 5), toNorm(wall.x2 + 5, wall.y2 + 5), toNorm(wall.x1 - 5, wall.y1 + 5)], layerId: layer.id, visible: true }));
  const props: SceneProp[] = result.props.map((prop) => ({ id: uid("prop"), kind: prop.kind, x: clamp(prop.x / floor.width), y: clamp(prop.y / floor.height), rotation: prop.rotation, scale: prop.scale }));
  const features = options.append ? [...layer.features, ...generated, ...doorFeatures] : [...generated, ...doorFeatures];
  return { ...floor, layers: floor.layers.map((item) => item.id === layer.id ? { ...item, features } : item), props: options.append ? [...(floor.props ?? []), ...props] : props };
}
