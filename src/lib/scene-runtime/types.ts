import type { ProjectionEffects } from "./r6-8";

export const TACTICAL_SCENE_SCHEMA_VERSION = 1 as const;

export type SceneLifecycle = "draft" | "ready" | "live" | "archived";
export type SceneAssetOrigin = "upload" | "generated" | "rendered";
export type FeatureKind = "area" | "wall" | "door" | "prop" | "note";
export type FowOrigin = "manual" | "imported" | "derived";

export type NormPoint = { x: number; y: number };
export type NormPolygon = NormPoint[];

export type SceneGrid = {
  visible: boolean;
  kind: "square";
  cellSize: number;
  offsetX: number;
  offsetY: number;
};

export type SceneAsset = {
  id: string;
  origin: SceneAssetOrigin;
  storageKey: string;
  mimeType: string;
  width: number;
  height: number;
  checksum?: string;
};

export type SceneFeature = {
  id: string;
  kind: FeatureKind;
  geometry: NormPolygon;
  label?: string;
  layerId?: string;
  visible: boolean;
};

export type SceneProp = {
  id: string;
  kind: string;
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
  label?: string;
};

/** GM-only annotation; never included in a publication projection. */
export type SceneGmNote = {
  id: string;
  x: number;
  y: number;
  text: string;
  width?: number;
};

export type SceneLayer = {
  id: string;
  label: string;
  sortOrder: number;
  visible: boolean;
  opacity: number;
  style?: string;
  features: SceneFeature[];
};

export type SceneFloor = {
  id: string;
  label: string;
  sortOrder: number;
  width: number;
  height: number;
  asset: SceneAsset;
  grid?: SceneGrid;
  layers: SceneLayer[];
  /** Point props and private notes are kept outside the published feature layers. */
  props?: SceneProp[];
  gmNotes?: SceneGmNote[];
  /** Deterministic local preview derived from this revision; never replaces the source asset. */
  previewAsset?: SceneAsset;
};

export type FowRegion = {
  id: string;
  floorId: string;
  polygon: NormPolygon;
  revealed: boolean;
  origin: FowOrigin;
  sourceFeatureId?: string;
  sourceRevisionNo?: number;
};

export type FowPatch = {
  id: string;
  regionId: string;
  operation: "reveal" | "hide";
  polygon?: NormPolygon;
};

export type SceneFow = {
  regions: FowRegion[];
  patches: FowPatch[];
  importedInput?: { format: "foundry-json"; version: string; payload: unknown };
};

export type SceneOverlayItem =
  | { id: string; type: "image" | "gif"; x: number; y: number; width: number; height: number; assetId: string; src?: string; opacity?: number; rotation?: number; visible?: boolean }
  | { id: string; type: "area"; polygon: NormPolygon; color: string; opacity: number; visible?: boolean }
  | { id: string; type: "text"; x: number; y: number; text: string; color?: string; size?: number; visible?: boolean }
  | { id: string; type: "marker"; x: number; y: number; label?: string; color?: string; visible?: boolean }
  | { id: string; type: "circle" | "measure"; x: number; y: number; radius: number; color?: string; visible?: boolean }
  | { id: string; type: "timer"; x: number; y: number; seconds: number; label?: string; color?: string; visible?: boolean };

export type SceneOverlay = { draft: SceneOverlayItem[]; published: SceneOverlayItem[] | null };


export type TacticalScene = {
  schemaVersion: typeof TACTICAL_SCENE_SCHEMA_VERSION;
  id: string;
  campaignId: string;
  name: string;
  linkedMissionId?: string | null;
  lifecycle: SceneLifecycle;
  revisionId: string;
  revisionNo: number;
  parentRevisionId?: string | null;
  floors: SceneFloor[];
  fow: SceneFow;
  overlay: SceneOverlay;
  /** Durable media referenced by image/GIF overlays. */
  assets?: SceneAsset[];
  effects?: ProjectionEffects;
};

export type SceneValidationResult = { ok: true; scene: TacticalScene } | { ok: false; errors: string[] };
