import {
  SCENE_DOCUMENT_VERSION,
  type SceneAreaV1,
  type SceneDocumentV1,
  type SceneFloorV1,
  type SceneGmNoteV1,
  type SceneGridV1,
  type ScenePropV1,
  type SceneWallV1,
} from "./types";
import { isScenePropKind } from "./props-catalog";

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function parsePoint(raw: unknown): { x: number; y: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const x = Number((raw as { x?: unknown }).x);
  const y = Number((raw as { y?: unknown }).y);
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
  return { x, y };
}

function parseGrid(raw: unknown): SceneGridV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const kind = (raw as { kind?: unknown }).kind;
  if (kind !== "square") return null;
  const cellPx = Number((raw as { cellPx?: unknown }).cellPx);
  const offsetX = Number((raw as { offsetX?: unknown }).offsetX ?? 0);
  const offsetY = Number((raw as { offsetY?: unknown }).offsetY ?? 0);
  if (!isFiniteNumber(cellPx) || cellPx <= 0) return null;
  if (!isFiniteNumber(offsetX) || !isFiniteNumber(offsetY)) return null;
  return { kind: "square", cellPx, offsetX, offsetY };
}

function parseArea(raw: unknown): SceneAreaV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as { id?: unknown }).id;
  const kind = (raw as { kind?: unknown }).kind;
  if (typeof id !== "string" || !id.trim()) return null;
  if (kind !== "room" && kind !== "corridor") return null;
  const polyRaw = (raw as { polygon?: unknown }).polygon;
  if (!Array.isArray(polyRaw)) return null;
  const polygon = polyRaw.map(parsePoint).filter((p): p is { x: number; y: number } => p !== null);
  if (polygon.length < 3) return null;
  const labelRaw = (raw as { label?: unknown }).label;
  const label = typeof labelRaw === "string" && labelRaw.trim() ? labelRaw.trim() : undefined;
  return { id: id.trim(), kind, polygon, label };
}

function parseProp(raw: unknown): ScenePropV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as { id?: unknown }).id;
  const kindRaw = (raw as { kind?: unknown }).kind;
  if (typeof id !== "string" || !id.trim()) return null;
  if (typeof kindRaw !== "string" || !isScenePropKind(kindRaw)) return null;
  const x = Number((raw as { x?: unknown }).x);
  const y = Number((raw as { y?: unknown }).y);
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
  const rotationRaw = (raw as { rotation?: unknown }).rotation;
  const scaleRaw = (raw as { scale?: unknown }).scale;
  const rotation =
    rotationRaw === undefined ? undefined : isFiniteNumber(Number(rotationRaw)) ? Number(rotationRaw) : undefined;
  const scale =
    scaleRaw === undefined ? undefined : isFiniteNumber(Number(scaleRaw)) && Number(scaleRaw) > 0
      ? Number(scaleRaw)
      : undefined;
  return { id: id.trim(), kind: kindRaw, x, y, rotation, scale };
}

function parseGmNote(raw: unknown): SceneGmNoteV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as { id?: unknown }).id;
  if (typeof id !== "string" || !id.trim()) return null;
  const x = Number((raw as { x?: unknown }).x);
  const y = Number((raw as { y?: unknown }).y);
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
  const textRaw = (raw as { text?: unknown }).text;
  const text = typeof textRaw === "string" ? textRaw : "";
  const widthRaw = (raw as { width?: unknown }).width;
  const width =
    widthRaw === undefined
      ? undefined
      : isFiniteNumber(Number(widthRaw)) && Number(widthRaw) >= 80
        ? Math.min(400, Number(widthRaw))
        : undefined;
  return { id: id.trim(), x, y, text, width };
}

function parseWall(raw: unknown): SceneWallV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as { id?: unknown }).id;
  if (typeof id !== "string" || !id.trim()) return null;
  const x1 = Number((raw as { x1?: unknown }).x1);
  const y1 = Number((raw as { y1?: unknown }).y1);
  const x2 = Number((raw as { x2?: unknown }).x2);
  const y2 = Number((raw as { y2?: unknown }).y2);
  if (![x1, y1, x2, y2].every(isFiniteNumber)) return null;
  const doorRaw = (raw as { door?: unknown }).door;
  let door: SceneWallV1["door"];
  if (doorRaw && typeof doorRaw === "object") {
    const width = Number((doorRaw as { width?: unknown }).width);
    const offset = Number((doorRaw as { offset?: unknown }).offset ?? 0);
    if (isFiniteNumber(width) && width > 0 && isFiniteNumber(offset)) {
      door = { width, offset };
    }
  }
  return { id: id.trim(), x1, y1, x2, y2, door };
}

function parseFloor(raw: unknown): SceneFloorV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const id = (raw as { id?: unknown }).id;
  const label = (raw as { label?: unknown }).label;
  if (typeof id !== "string" || !id.trim()) return null;
  const sortOrder = Number((raw as { sortOrder?: unknown }).sortOrder ?? 0);
  const width = Number((raw as { width?: unknown }).width);
  const height = Number((raw as { height?: unknown }).height);
  if (!isFiniteNumber(width) || !isFiniteNumber(height) || width < 64 || height < 64) return null;
  if (width > 32000 || height > 32000) return null;
  if (!isFiniteNumber(sortOrder)) return null;
  const grid = parseGrid((raw as { grid?: unknown }).grid);
  if (!grid) return null;
  const areasRaw = (raw as { areas?: unknown }).areas;
  const wallsRaw = (raw as { walls?: unknown }).walls;
  const propsRaw = (raw as { props?: unknown }).props;
  const gmNotesRaw = (raw as { gmNotes?: unknown }).gmNotes;
  const areas = Array.isArray(areasRaw)
    ? areasRaw.map(parseArea).filter((a): a is SceneAreaV1 => a !== null)
    : [];
  const walls = Array.isArray(wallsRaw)
    ? wallsRaw.map(parseWall).filter((w): w is SceneWallV1 => w !== null)
    : [];
  const props = Array.isArray(propsRaw)
    ? propsRaw.map(parseProp).filter((p): p is ScenePropV1 => p !== null)
    : [];
  const gmNotes = Array.isArray(gmNotesRaw)
    ? gmNotesRaw.map(parseGmNote).filter((n): n is SceneGmNoteV1 => n !== null)
    : [];
  return {
    id: id.trim(),
    label: typeof label === "string" ? label : "",
    sortOrder: Math.floor(sortOrder),
    width: Math.floor(width),
    height: Math.floor(height),
    grid,
    areas,
    walls,
    props,
    gmNotes,
  };
}

export type ParseSceneDocumentResult =
  | { ok: true; document: SceneDocumentV1 }
  | { ok: false; error: string };

export function parseSceneDocumentV1(raw: unknown): ParseSceneDocumentResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Documento scena non valido." };
  }
  const version = Number((raw as { version?: unknown }).version);
  if (version !== SCENE_DOCUMENT_VERSION) {
    return { ok: false, error: `Versione documento non supportata: ${version}.` };
  }
  const nameRaw = (raw as { name?: unknown }).name;
  const name = typeof nameRaw === "string" ? nameRaw.trim() : "";
  const missionRaw = (raw as { linkedMissionId?: unknown }).linkedMissionId;
  const linkedMissionId =
    missionRaw === null || missionRaw === undefined
      ? null
      : typeof missionRaw === "string" && missionRaw.trim()
        ? missionRaw.trim()
        : null;
  if (missionRaw !== null && missionRaw !== undefined && linkedMissionId === null) {
    return { ok: false, error: "linkedMissionId non valido." };
  }
  const floorsRaw = (raw as { floors?: unknown }).floors;
  if (!Array.isArray(floorsRaw) || floorsRaw.length === 0) {
    return { ok: false, error: "Serve almeno un piano." };
  }
  if (floorsRaw.length > 32) {
    return { ok: false, error: "Troppi piani (max 32)." };
  }
  const floors = floorsRaw.map(parseFloor).filter((f): f is SceneFloorV1 => f !== null);
  if (floors.length !== floorsRaw.length) {
    return { ok: false, error: "Uno o più piani non validi." };
  }
  const floorIds = new Set(floors.map((f) => f.id));
  if (floorIds.size !== floors.length) {
    return { ok: false, error: "Id piano duplicati." };
  }
  for (const floor of floors) {
    const areaIds = new Set(floor.areas.map((a) => a.id));
    if (areaIds.size !== floor.areas.length) {
      return { ok: false, error: `Id area duplicati nel piano ${floor.label || floor.id}.` };
    }
    const propIds = new Set(floor.props.map((p) => p.id));
    if (propIds.size !== floor.props.length) {
      return { ok: false, error: `Id prop duplicati nel piano ${floor.label || floor.id}.` };
    }
    const noteIds = new Set(floor.gmNotes.map((n) => n.id));
    if (noteIds.size !== floor.gmNotes.length) {
      return { ok: false, error: `Id note GM duplicati nel piano ${floor.label || floor.id}.` };
    }
  }
  return {
    ok: true,
    document: {
      version: SCENE_DOCUMENT_VERSION,
      name: name || "Scena senza nome",
      linkedMissionId,
      floors,
    },
  };
}

export function assertSceneDocumentV1(raw: unknown): SceneDocumentV1 {
  const parsed = parseSceneDocumentV1(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.document;
}
