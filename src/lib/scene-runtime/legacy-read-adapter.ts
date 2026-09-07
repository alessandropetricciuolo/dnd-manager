import { parseSceneDocumentV1, type SceneDocumentV1 } from "../map-core/scene-schema";
import { parseMapOverlayItems } from "../maps/overlay-parse";
import { validateTacticalScene } from "./validate";
import type { NormPolygon, SceneFeature, SceneFloor, SceneLayer, SceneOverlayItem, TacticalScene } from "./types";
import { TACTICAL_SCENE_SCHEMA_VERSION } from "./types";

/** Minimal, read-only shapes returned by the legacy actions. */
export type LegacySceneDocumentRow = {
  id: string;
  campaign_id: string;
  name: string;
  linked_mission_id: string | null;
  document: unknown;
  document_version: number;
};

export type LegacyExplorationMapRow = {
  id: string;
  campaign_id: string;
  linked_mission_id: string | null;
  floor_label: string;
  sort_order: number;
  image_path: string;
  source_type: "uploaded_image" | "generated_scene";
  scene_document_id: string | null;
  scene_floor_id: string | null;
  grid_cell_meters?: number | null;
  grid_source_cell_px?: number | null;
  grid_cells_w?: number | null;
  grid_cells_h?: number | null;
  grid_offset_x_cells?: number;
  grid_offset_y_cells?: number;
  grid_kind?: "square" | "hex";
};

export type LegacyFowRegionRow = {
  id: string;
  map_id: string;
  polygon: unknown;
  is_revealed: boolean;
  sort_order: number;
  source_area_id: string | null;
  /** Optional explicit provenance from an importer; absent in the current table. */
  origin?: "manual" | "imported" | "derived";
  source_revision_no?: number;
};

export type LegacyOverlayRow = {
  map_id: string;
  /** Only exploration-map overlays may enter this adapter. Wiki map overlays are excluded. */
  exploration_map_id?: string;
  overlay_items?: unknown;
  overlay_draft?: unknown;
};

export type LegacyReadAdapterInput = {
  sceneDocument: LegacySceneDocumentRow;
  explorationMaps: LegacyExplorationMapRow[];
  fowRegions: LegacyFowRegionRow[];
  overlays?: LegacyOverlayRow[];
  wikiMaps?: Array<{ id: string }>;
};

export type LegacyReadReportSeverity = "converted" | "warning" | "ambiguity" | "orphan" | "ignored";
export type LegacyReadReportEntry = {
  severity: LegacyReadReportSeverity;
  code: string;
  message: string;
  path?: string;
};
export type LegacyReadReport = { entries: LegacyReadReportEntry[] };
export type LegacyReadAdapterResult = { scene?: TacticalScene; report: LegacyReadReport };

const entry = (report: LegacyReadReport, severity: LegacyReadReportSeverity, code: string, message: string, path?: string) =>
  report.entries.push({ severity, code, message, ...(path ? { path } : {}) });

function polygon(raw: unknown): NormPolygon | null {
  if (!Array.isArray(raw) || raw.length < 3) return null;
  const points = raw.map((point) => {
    if (!point || typeof point !== "object") return null;
    const x = Number((point as { x?: unknown }).x);
    const y = Number((point as { y?: unknown }).y);
    return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null;
  });
  if (points.some((point) => point === null)) return null;
  const result = points as NormPolygon;
  const area = result.reduce((sum, point, index) => {
    const next = result[(index + 1) % result.length]!;
    return sum + point.x * next.y - point.y * next.x;
  }, 0);
  return Math.abs(area) > 0.000001 ? result : null;
}

function inferredMime(path: string): string {
  const lower = path.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/webp";
}

function wallPolygon(wall: { x1: number; y1: number; x2: number; y2: number }, width: number, height: number): NormPolygon | null {
  const x1 = wall.x1 / width; const y1 = wall.y1 / height; const x2 = wall.x2 / width; const y2 = wall.y2 / height;
  const dx = x2 - x1; const dy = y2 - y1; const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length <= 0) return null;
  const thickness = 0.001;
  const nx = (-dy / length) * thickness; const ny = (dx / length) * thickness;
  return polygon([{ x: Math.max(0, Math.min(1, x1 + nx)), y: Math.max(0, Math.min(1, y1 + ny)) }, { x: Math.max(0, Math.min(1, x2 + nx)), y: Math.max(0, Math.min(1, y2 + ny)) }, { x: Math.max(0, Math.min(1, x2 - nx)), y: Math.max(0, Math.min(1, y2 - ny)) }, { x: Math.max(0, Math.min(1, x1 - nx)), y: Math.max(0, Math.min(1, y1 - ny)) }]);
}

function convertFloor(floor: SceneDocumentV1["floors"][number], report: LegacyReadReport): SceneFloor {
  const usedIds = new Set<string>();
  const convertItems = (layerId: string, layerVisible: boolean, areas: typeof floor.areas, walls: typeof floor.walls): SceneFeature[] => {
    const features: SceneFeature[] = [];
    const add = (feature: SceneFeature) => {
      if (usedIds.has(feature.id)) { entry(report, "ambiguity", "duplicate_feature_across_layers", `Feature presente in più layer; mantenuto il primo layer deterministico: ${feature.id}`, `floors.${floor.id}.layers.${layerId}`); return; }
      usedIds.add(feature.id); features.push(feature);
    };
    for (const area of areas) {
      const geometry = polygon(area.polygon.map((point) => ({ x: point.x / floor.width, y: point.y / floor.height })));
      if (!geometry) { entry(report, "warning", "invalid_area_geometry", `Geometria area non convertibile: ${area.id}`, `floors.${floor.id}.areas.${area.id}`); continue; }
      add({ id: area.id, kind: "area", geometry, label: area.label, layerId, visible: layerVisible });
    }
    for (const wall of walls) {
      const geometry = wallPolygon(wall, floor.width, floor.height);
      if (!geometry) { entry(report, "warning", "invalid_wall_geometry", `Geometria muro non convertibile: ${wall.id}`, `floors.${floor.id}.walls.${wall.id}`); continue; }
      add({ id: wall.id, kind: wall.door ? "door" : "wall", geometry, layerId, visible: layerVisible });
    }
    return features;
  };
  const sortedLayers = [...floor.layers].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
  const layers: SceneLayer[] = sortedLayers.map((legacyLayer) => ({ id: legacyLayer.id, label: legacyLayer.label, sortOrder: legacyLayer.sortOrder, visible: legacyLayer.visible, opacity: legacyLayer.opacity, features: convertItems(legacyLayer.id, legacyLayer.visible, legacyLayer.areas, legacyLayer.walls) }));
  const layerFeatureIds = new Set([...usedIds]);
  const fallbackAreas = floor.areas.filter((area) => !layerFeatureIds.has(area.id));
  const fallbackWalls = floor.walls.filter((wall) => !layerFeatureIds.has(wall.id));
  if (fallbackAreas.length || fallbackWalls.length) {
    entry(report, "warning", "denormalized_features_fallback", "Feature presenti nella denormalizzazione del piano ma non attribuibili a un layer; aggiunte al layer legacy.", `floors.${floor.id}`);
    layers.push({ id: `${floor.id}:legacy-layer`, label: "Legacy non attribuito", sortOrder: Number.MAX_SAFE_INTEGER, visible: true, opacity: 1, features: convertItems(`${floor.id}:legacy-layer`, true, fallbackAreas, fallbackWalls) });
  }
  if (!layers.length) { entry(report, "warning", "missing_scene_layers", "Il piano non contiene layer; nessuna feature attribuibile.", `floors.${floor.id}`); }
  if (floor.props.length) entry(report, "converted", "props_gm_workspace", `${floor.props.length} prop puntuali mantenuti nel workspace GM.`, `floors.${floor.id}.props`);
  if (floor.gmNotes.length) entry(report, "converted", "gm_notes_private", `${floor.gmNotes.length} note GM mantenute private nel workspace.`, `floors.${floor.id}.gmNotes`);
  return {
    id: floor.id, label: floor.label, sortOrder: floor.sortOrder, width: floor.width, height: floor.height,
    asset: { id: `${floor.id}:asset`, origin: "rendered", storageKey: "", mimeType: "image/webp", width: floor.width, height: floor.height },
    grid: floor.grid ? { visible: true, kind: "square", cellSize: floor.grid.cellPx, offsetX: floor.grid.offsetX / floor.width, offsetY: floor.grid.offsetY / floor.height } : undefined,
    layers,
    props: floor.props.map((prop) => ({ id: prop.id, kind: prop.kind, x: prop.x / floor.width, y: prop.y / floor.height, rotation: prop.rotation, scale: prop.scale })),
    gmNotes: floor.gmNotes.map((note) => ({ id: note.id, x: note.x / floor.width, y: note.y / floor.height, text: note.text, width: note.width ? note.width / floor.width : undefined })),
  };
}

function convertOverlay(raw: unknown, report: LegacyReadReport): SceneOverlayItem[] {
  const out: SceneOverlayItem[] = [];
  if (!Array.isArray(raw)) {
    if (raw != null) entry(report, "warning", "overlay_not_array", "Overlay legacy non array, ignorato.");
    return out;
  }
  const seenIds = new Set<string>();
  raw.slice(0, 400).forEach((candidate, index) => {
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) { entry(report, "ignored", "overlay_item_not_object", `Elemento overlay non oggetto ignorato (${index}).`); return; }
    const single = parseMapOverlayItems([candidate]);
    const value = candidate as Record<string, unknown>;
    const kind = typeof value.kind === "string" ? value.kind : "unknown";
    const hasValidCoordinate = (key: "x" | "y") => typeof value[key] === "number" && Number.isFinite(value[key]) && (value[key] as number) >= 0 && (value[key] as number) <= 1;
    if (kind === "text" && (typeof value.id !== "string" || !value.id.trim() || !hasValidCoordinate("x") || !hasValidCoordinate("y") || typeof value.text !== "string" || !value.text.trim())) {
      entry(report, "ignored", "overlay_item_text_invalid", `Elemento overlay testuale non valido ignorato (${index}).`);
      return;
    }
    if (kind === "symbol" && (typeof value.id !== "string" || !value.id.trim() || !hasValidCoordinate("x") || !hasValidCoordinate("y") || typeof value.symbolId !== "string")) {
      entry(report, "ignored", "overlay_item_symbol_invalid", `Elemento overlay simbolo non valido ignorato (${index}).`);
      return;
    }
    if (single.length !== 1) {
      const code = kind !== "text" && kind !== "symbol" ? "overlay_item_type_unsupported" : kind === "text" ? "overlay_item_text_invalid" : "overlay_item_symbol_invalid";
      entry(report, "ignored", code, `Elemento overlay non convertibile ignorato (${index}).`);
      return;
    }
    const parsed = single[0]!;
    if (seenIds.has(parsed.id)) { entry(report, "ambiguity", "duplicate_overlay_id", `Id overlay duplicato ignorato: ${parsed.id}`); return; }
    seenIds.add(parsed.id);
    // The legacy parser clamps/defaults values and discards unknown keys. Do
    // not silently accept a changed representation: only an exact parsed item
    // is safe for a migration adapter.
    const allowedKeys = parsed.kind === "text" ? ["id", "kind", "text", "x", "y", "fontRel", "color", "rotation", "scale"] : ["id", "kind", "symbolId", "x", "y", "color", "rotation", "scale"];
    const parsedFields = parsed as unknown as Record<string, unknown>;
    const exactFields = allowedKeys.every((key) => !Object.prototype.hasOwnProperty.call(value, key) ? parsedFields[key] === undefined : value[key] === parsedFields[key]);
    const noUnknownKeys = Object.keys(value).every((key) => allowedKeys.includes(key));
    if (!exactFields || !noUnknownKeys) {
      entry(report, "warning", "overlay_item_normalized", `Elemento overlay normalizzato dal legacy parser e non convertito (${parsed.id}).`);
      return;
    }
    if (parsed.kind === "text") out.push({ id: parsed.id, type: "text", x: parsed.x, y: parsed.y, text: parsed.text, color: parsed.color, size: Math.max(1, Math.round(parsed.fontRel * 1000)) });
    else out.push({ id: parsed.id, type: "marker", x: parsed.x, y: parsed.y, label: parsed.symbolId, color: parsed.color });
  });
  if (raw.length > 400) entry(report, "warning", "overlay_items_truncated", "Overlay legacy oltre il limite del parser; elementi eccedenti ignorati.");
  return out;
}

export function adaptLegacyToTacticalScene(input: LegacyReadAdapterInput): LegacyReadAdapterResult {
  const report: LegacyReadReport = { entries: [] };
  const row = input.sceneDocument;
  const parsed = parseSceneDocumentV1(row.document);
  if (!parsed.ok) { entry(report, "ambiguity", "invalid_scene_document", parsed.error, "sceneDocument.document"); return { report }; }
  if (row.document_version !== parsed.document.version) entry(report, "ambiguity", "document_version_mismatch", "Versione documento e payload non coincidono.", "sceneDocument.document_version");
  const maps = input.explorationMaps.filter((map) => map.scene_document_id === row.id);
  const ids = new Set<string>();
  for (const map of input.explorationMaps) {
    if (ids.has(map.id)) entry(report, "ambiguity", "duplicate_map_id", `Mappa duplicata: ${map.id}`, "explorationMaps");
    ids.add(map.id);
    if (map.scene_document_id && map.scene_document_id !== row.id) entry(report, "ignored", "other_scene_map", `Mappa di un'altra scena esclusa: ${map.id}`);
  }
  const mapByFloor = new Map(maps.map((map) => [map.scene_floor_id, map]));
  const floors: SceneFloor[] = [];
  for (const floor of parsed.document.floors) {
    const map = mapByFloor.get(floor.id);
    if (!map) { entry(report, "orphan", "floor_without_map", `Piano senza mappa raster: ${floor.id}`, `floors.${floor.id}`); continue; }
    if (!map.image_path.trim()) { entry(report, "orphan", "map_without_asset", `Mappa senza asset: ${map.id}`, `maps.${map.id}`); continue; }
    const converted = convertFloor(floor, report);
    converted.asset = { ...converted.asset, origin: map.source_type === "uploaded_image" ? "upload" : "rendered", storageKey: map.image_path, mimeType: inferredMime(map.image_path) };
    if (map.grid_kind === "hex") entry(report, "warning", "hex_grid_not_supported", `Griglia esagonale mantenuta nascosta per il piano ${floor.id}.`);
    floors.push(converted);
    entry(report, "converted", "floor_converted", `Piano convertito: ${floor.id}`);
  }
  const completeFloors = floors.length === parsed.document.floors.length;
  const floorIds = new Set(floors.map((floor) => floor.id));
  const regions = [];
  const regionIds = new Set<string>();
  for (const region of input.fowRegions) {
    const map = input.explorationMaps.find((candidate) => candidate.id === region.map_id);
    if (!map || map.scene_document_id !== row.id || !floorIds.has(map.scene_floor_id ?? "")) { entry(report, "orphan", "region_without_scene_floor", `Regione senza piano scena: ${region.id}`); continue; }
    if (regionIds.has(region.id)) { entry(report, "ambiguity", "duplicate_region_id", `Regione duplicata: ${region.id}`); continue; }
    regionIds.add(region.id);
    const poly = polygon(region.polygon);
    if (!poly) { entry(report, "warning", "invalid_region_polygon", `Poligono FoW non valido: ${region.id}`); continue; }
    const origin = region.origin ?? (region.source_area_id ? "derived" : undefined);
    if (!origin) { entry(report, "ambiguity", "fow_origin_unknown", `Origine FoW non determinabile: ${region.id}`); continue; }
    const sourceFeatureId = origin === "derived" ? region.source_area_id ?? undefined : undefined;
    regions.push({ id: region.id, floorId: map.scene_floor_id!, polygon: poly, revealed: region.is_revealed, origin, sourceFeatureId, sourceRevisionNo: region.source_revision_no });
    entry(report, "converted", "fow_region_converted", `Regione FoW convertita: ${region.id}`);
  }
  const overlaySets = (input.overlays ?? []).map((overlay) => {
    if (input.wikiMaps?.some((map) => map.id === overlay.map_id) && !overlay.exploration_map_id) { entry(report, "ignored", "wiki_map_overlay_excluded", `Overlay Wiki escluso: ${overlay.map_id}`); return []; }
    const mapId = overlay.exploration_map_id ?? overlay.map_id;
    if (!maps.some((map) => map.id === mapId)) { entry(report, "orphan", "overlay_without_exploration_map", `Overlay senza mappa tattica: ${overlay.map_id}`); return []; }
    return [{ draft: convertOverlay(overlay.overlay_draft ?? [], report), published: convertOverlay(overlay.overlay_items ?? [], report) }];
  });
  const overlayDraft = overlaySets.flat().flatMap((set) => set.draft);
  const overlayPublished = overlaySets.flat().flatMap((set) => set.published);
  const scene: TacticalScene = { schemaVersion: TACTICAL_SCENE_SCHEMA_VERSION, id: row.id, campaignId: row.campaign_id, name: parsed.document.name || row.name, linkedMissionId: parsed.document.linkedMissionId, lifecycle: "draft", revisionId: `${row.id}:legacy:${row.document_version}`, revisionNo: row.document_version, parentRevisionId: null, floors, fow: { regions, patches: [] }, overlay: { draft: overlayDraft, published: overlayPublished.length ? overlayPublished : null } };
  const valid = validateTacticalScene(scene);
  if (!completeFloors) return { report };
  if (!valid.ok) { valid.errors.forEach((error) => entry(report, "ambiguity", "converted_scene_invalid", error)); return { report }; }
  entry(report, "converted", "scene_converted", `Scena convertita in sola lettura: ${row.id}`);
  return { scene: valid.scene, report };
}
