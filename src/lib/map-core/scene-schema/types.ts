import type { NormPoint } from "../coordinates";
import type { ScenePropKindV1 } from "./props-catalog";

export const SCENE_DOCUMENT_VERSION = 1 as const;

export type SceneGridV1 = {
  kind: "square";
  cellPx: number;
  offsetX: number;
  offsetY: number;
};

export type SceneWallDoorV1 = {
  width: number;
  offset: number;
};

export type SceneWallV1 = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  door?: SceneWallDoorV1;
};

export type SceneAreaKindV1 = "room" | "corridor";

/** Vertici in pixel canvas del piano (origine alto-sinistra). */
export type SceneAreaV1 = {
  id: string;
  kind: SceneAreaKindV1;
  polygon: Array<{ x: number; y: number }>;
  label?: string;
};

export type ScenePropV1 = {
  id: string;
  kind: ScenePropKindV1;
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
};

/** Note visibili solo al GM (non in proiezione / raster). */
export type SceneGmNoteV1 = {
  id: string;
  x: number;
  y: number;
  text: string;
  width?: number;
};

export type SceneFloorV1 = {
  id: string;
  label: string;
  sortOrder: number;
  width: number;
  height: number;
  grid: SceneGridV1;
  areas: SceneAreaV1[];
  walls: SceneWallV1[];
  props: ScenePropV1[];
  gmNotes: SceneGmNoteV1[];
};

export type SceneDocumentV1 = {
  version: typeof SCENE_DOCUMENT_VERSION;
  name: string;
  linkedMissionId: string | null;
  floors: SceneFloorV1[];
};

export type SceneDocument = SceneDocumentV1;

export function createEmptySceneDocument(name = "Nuova scena"): SceneDocumentV1 {
  const newId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `floor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const floorId = newId();
  return {
    version: SCENE_DOCUMENT_VERSION,
    name,
    linkedMissionId: null,
    floors: [
      {
        id: floorId,
        label: "Piano 1",
        sortOrder: 0,
        width: 2000,
        height: 1500,
        grid: { kind: "square", cellPx: 100, offsetX: 0, offsetY: 0 },
        areas: [],
        walls: [],
        props: [],
        gmNotes: [],
      },
    ],
  };
}

/** Rettangolo come poligono pixel (helper editor). */
export function rectangleAreaPolygon(
  x: number,
  y: number,
  w: number,
  h: number
): Array<{ x: number; y: number }> {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
}

/** Converte vertici pixel → normalizzati 0–1 per FoW. */
export function pixelPolygonToNorm(
  polygon: Array<{ x: number; y: number }>,
  floorWidth: number,
  floorHeight: number
): NormPoint[] {
  if (floorWidth <= 0 || floorHeight <= 0) return [];
  return polygon.map((p) => ({
    x: Math.min(1, Math.max(0, p.x / floorWidth)),
    y: Math.min(1, Math.max(0, p.y / floorHeight)),
  }));
}
