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

export type SceneLayer = {
  id: string;
  label: string;
  sortOrder: number;
  visible: boolean;
  opacity: number;
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
  | { id: string; type: "image" | "gif"; x: number; y: number; width: number; height: number; assetId: string; opacity?: number; rotation?: number }
  | { id: string; type: "area"; polygon: NormPolygon; color: string; opacity: number }
  | { id: string; type: "text"; x: number; y: number; text: string; color?: string; size?: number }
  | { id: string; type: "marker"; x: number; y: number; label?: string; color?: string }
  | { id: string; type: "circle" | "measure"; x: number; y: number; radius: number; color?: string }
  | { id: string; type: "timer"; x: number; y: number; seconds: number; label?: string; color?: string };

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
};

export type SceneValidationResult = { ok: true; scene: TacticalScene } | { ok: false; errors: string[] };
