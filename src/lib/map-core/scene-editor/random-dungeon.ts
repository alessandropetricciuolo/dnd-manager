import type { SceneAreaV1, ScenePropV1, SceneWallV1 } from "../scene-schema/types";
import { rectangleAreaPolygon } from "../scene-schema/types";
import type { ScenePropKindV1 } from "../scene-schema/props-catalog";
import { DOOR_WALL_ID_PREFIX } from "./auto-walls";

/** Rettangolo in celle di griglia (unità: celle, non pixel). */
type CellRect = { x: number; y: number; w: number; h: number };

export type RandomDungeonRoomSize = "small" | "medium" | "large";

export type RandomDungeonPropTheme = "dungeon" | "taverna" | "caverna";

export type RandomDungeonOptions = {
  /** Numero stanze desiderato (2–14). */
  roomCount: number;
  /** Dimensioni piano in celle. */
  cols: number;
  rows: number;
  /** Lato cella in pixel. */
  cellPx: number;
  /** Offset griglia in pixel. */
  offsetX?: number;
  offsetY?: number;
  withDoors?: boolean;
  withProps?: boolean;
  roomSize?: RandomDungeonRoomSize;
  propTheme?: RandomDungeonPropTheme;
  /** Seed numerico o stringa (hash) per generazione riproducibile. */
  seed?: number | string | null;
  /** RNG iniettabile per test deterministici (ha priorità su seed). */
  random?: () => number;
  /** Prefisso etichette stanza (es. "Stanza 3" se si aggiunge a contenuto esistente). */
  roomLabelStart?: number;
};

export type RandomDungeonResult = {
  areas: SceneAreaV1[];
  /** Muri-porta dedicati da passare a generateWallsFromAreas come existingWalls. */
  doorWalls: SceneWallV1[];
  props: ScenePropV1[];
  roomsPlaced: number;
  /** Seed effettivamente usato (se la generazione era seeded). */
  seedUsed: number | null;
};

export const RANDOM_DUNGEON_MIN_ROOMS = 2;
export const RANDOM_DUNGEON_MAX_ROOMS = 14;

export const RANDOM_DUNGEON_ROOM_SIZE_OPTIONS: {
  value: RandomDungeonRoomSize;
  label: string;
}[] = [
  { value: "small", label: "Piccole (2–4 celle)" },
  { value: "medium", label: "Medie (3–6 celle)" },
  { value: "large", label: "Grandi (5–9 celle)" },
];

export const RANDOM_DUNGEON_PROP_THEME_OPTIONS: {
  value: RandomDungeonPropTheme;
  label: string;
}[] = [
  { value: "dungeon", label: "Dungeon classico" },
  { value: "taverna", label: "Taverna / interni" },
  { value: "caverna", label: "Caverna / rovine" },
];

export const ROOM_SIZE_PROFILES: Record<
  RandomDungeonRoomSize,
  { minW: number; minH: number; maxW: number; maxH: number }
> = {
  small: { minW: 2, minH: 2, maxW: 4, maxH: 3 },
  medium: { minW: 3, minH: 3, maxW: 6, maxH: 5 },
  large: { minW: 5, minH: 4, maxW: 9, maxH: 7 },
};

const PROP_THEME_CONFIG: Record<
  RandomDungeonPropTheme,
  { pool: ScenePropKindV1[]; firstRoomKind: ScenePropKindV1 }
> = {
  dungeon: {
    pool: ["barrel", "crate", "table", "chair", "torch", "coffin", "altar", "pillar"],
    firstRoomKind: "stairs",
  },
  taverna: {
    pool: ["table", "chair", "barrel", "crate", "torch", "campfire"],
    firstRoomKind: "table",
  },
  caverna: {
    pool: ["boulder", "campfire", "torch", "coffin", "pillar", "statue", "crate"],
    firstRoomKind: "stairs",
  },
};

const PLACEMENT_ATTEMPTS = 80;

/** RNG deterministico mulberry32 (stesso algoritmo dei test). */
export function createSeededRandom(seed: number): () => number {
  let a = (Math.abs(Math.floor(seed)) || 1) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Converte seed numerico o stringa in intero positivo per il PRNG. */
export function parseDungeonSeed(input: number | string | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    const n = Math.floor(Math.abs(input));
    return n === 0 ? 1 : n;
  }
  const t = input.trim();
  if (!t) return null;
  const asNum = Number(t);
  if (Number.isFinite(asNum)) {
    const n = Math.floor(Math.abs(asNum));
    return n === 0 ? 1 : n;
  }
  let h = 0;
  for (let i = 0; i < t.length; i++) {
    h = (Math.imul(31, h) + t.charCodeAt(i)) | 0;
  }
  const n = Math.abs(h);
  return n === 0 ? 1 : n;
}

/** Griglia consigliata (celle) per far respirare N stanze. */
export function recommendedDungeonGrid(
  roomCount: number,
  roomSize: RandomDungeonRoomSize = "medium"
): { cols: number; rows: number } {
  const clamped = clampRoomCount(roomCount);
  const profile = ROOM_SIZE_PROFILES[roomSize];
  const avgW = (profile.minW + profile.maxW) / 2 + 2;
  const avgH = (profile.minH + profile.maxH) / 2 + 2;
  const areaCells = clamped * avgW * avgH;
  const cols = Math.ceil(Math.sqrt((areaCells * 4) / 3));
  const rows = Math.ceil(areaCells / cols);
  return { cols: Math.max(14, cols), rows: Math.max(10, rows) };
}

export function clampRoomCount(roomCount: number): number {
  if (!Number.isFinite(roomCount)) return RANDOM_DUNGEON_MIN_ROOMS;
  return Math.min(RANDOM_DUNGEON_MAX_ROOMS, Math.max(RANDOM_DUNGEON_MIN_ROOMS, Math.round(roomCount)));
}

function randInt(random: () => number, min: number, max: number): number {
  if (max <= min) return min;
  return min + Math.floor(random() * (max - min + 1));
}

function rectsOverlapWithGap(a: CellRect, b: CellRect, gap: number): boolean {
  return (
    a.x - gap < b.x + b.w &&
    a.x + a.w + gap > b.x &&
    a.y - gap < b.y + b.h &&
    a.y + a.h + gap > b.y
  );
}

function centerCell(r: CellRect): { x: number; y: number } {
  return { x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) };
}

function placeRooms(
  roomCount: number,
  cols: number,
  rows: number,
  roomSize: RandomDungeonRoomSize,
  random: () => number
): CellRect[] {
  const profile = ROOM_SIZE_PROFILES[roomSize];
  const rooms: CellRect[] = [];
  const maxW = Math.min(profile.maxW, Math.max(profile.minW, cols - 2));
  const maxH = Math.min(profile.maxH, Math.max(profile.minH, rows - 2));
  for (let i = 0; i < roomCount; i++) {
    for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
      const w = randInt(random, profile.minW, maxW);
      const h = randInt(random, profile.minH, maxH);
      if (cols - w - 2 < 1 || rows - h - 2 < 1) continue;
      const x = randInt(random, 1, cols - w - 1);
      const y = randInt(random, 1, rows - h - 1);
      const candidate: CellRect = { x, y, w, h };
      if (rooms.some((r) => rectsOverlapWithGap(candidate, r, 1))) continue;
      rooms.push(candidate);
      break;
    }
  }
  return rooms;
}

/** MST di Prim sulle distanze Manhattan tra i centri stanza. */
function spanningTreeEdges(rooms: CellRect[]): Array<[number, number]> {
  if (rooms.length < 2) return [];
  const centers = rooms.map(centerCell);
  const inTree = new Set<number>([0]);
  const edges: Array<[number, number]> = [];
  while (inTree.size < rooms.length) {
    let best: { from: number; to: number; dist: number } | null = null;
    for (const from of inTree) {
      for (let to = 0; to < rooms.length; to++) {
        if (inTree.has(to)) continue;
        const dist =
          Math.abs(centers[from].x - centers[to].x) + Math.abs(centers[from].y - centers[to].y);
        if (!best || dist < best.dist) best = { from, to, dist };
      }
    }
    if (!best) break;
    inTree.add(best.to);
    edges.push([best.from, best.to]);
  }
  return edges;
}

/** Segmenti a L (in celle, spessore 1) tra i centri di due stanze. */
function corridorCellRects(a: CellRect, b: CellRect, random: () => number): CellRect[] {
  const ca = centerCell(a);
  const cb = centerCell(b);
  const segments: CellRect[] = [];
  const horizontal = (row: number, x0: number, x1: number) => {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    if (maxX > minX) segments.push({ x: minX, y: row, w: maxX - minX + 1, h: 1 });
  };
  const vertical = (col: number, y0: number, y1: number) => {
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    if (maxY > minY) segments.push({ x: col, y: minY, w: 1, h: maxY - minY + 1 });
  };
  if (ca.x === cb.x) {
    vertical(ca.x, ca.y, cb.y);
  } else if (ca.y === cb.y) {
    horizontal(ca.y, ca.x, cb.x);
  } else if (random() < 0.5) {
    horizontal(ca.y, ca.x, cb.x);
    vertical(cb.x, ca.y, cb.y);
  } else {
    vertical(ca.x, ca.y, cb.y);
    horizontal(cb.y, ca.x, cb.x);
  }
  return segments;
}

function doorWallsForCrossings(
  rooms: CellRect[],
  corridors: CellRect[],
  cellPx: number,
  offsetX: number,
  offsetY: number
): SceneWallV1[] {
  const walls = new Map<string, SceneWallV1>();
  const addDoorWall = (x1: number, y1: number, x2: number, y2: number) => {
    const spanPx = Math.hypot(x2 - x1, y2 - y1);
    if (spanPx < cellPx * 0.5) return;
    const key = `${Math.round(x1)}_${Math.round(y1)}_${Math.round(x2)}_${Math.round(y2)}`;
    if (walls.has(key)) return;
    walls.set(key, {
      id: `${DOOR_WALL_ID_PREFIX}${key}`,
      x1,
      y1,
      x2,
      y2,
      door: { width: Math.min(spanPx * 0.7, cellPx * 0.9), offset: 0.5 },
    });
  };

  for (const room of rooms) {
    const rx0 = room.x;
    const rx1 = room.x + room.w;
    const ry0 = room.y;
    const ry1 = room.y + room.h;
    for (const c of corridors) {
      const cx0 = c.x;
      const cx1 = c.x + c.w;
      const cy0 = c.y;
      const cy1 = c.y + c.h;
      const rowStart = Math.max(cy0, ry0);
      const rowEnd = Math.min(cy1, ry1);
      const colStart = Math.max(cx0, rx0);
      const colEnd = Math.min(cx1, rx1);
      if (rowEnd > rowStart) {
        if (cx0 < rx0 && cx1 > rx0) {
          addDoorWall(
            offsetX + rx0 * cellPx,
            offsetY + rowStart * cellPx,
            offsetX + rx0 * cellPx,
            offsetY + rowEnd * cellPx
          );
        }
        if (cx0 < rx1 && cx1 > rx1) {
          addDoorWall(
            offsetX + rx1 * cellPx,
            offsetY + rowStart * cellPx,
            offsetX + rx1 * cellPx,
            offsetY + rowEnd * cellPx
          );
        }
      }
      if (colEnd > colStart) {
        if (cy0 < ry0 && cy1 > ry0) {
          addDoorWall(
            offsetX + colStart * cellPx,
            offsetY + ry0 * cellPx,
            offsetX + colEnd * cellPx,
            offsetY + ry0 * cellPx
          );
        }
        if (cy0 < ry1 && cy1 > ry1) {
          addDoorWall(
            offsetX + colStart * cellPx,
            offsetY + ry1 * cellPx,
            offsetX + colEnd * cellPx,
            offsetY + ry1 * cellPx
          );
        }
      }
    }
  }
  return [...walls.values()];
}

function propsForRooms(
  rooms: CellRect[],
  cellPx: number,
  offsetX: number,
  offsetY: number,
  propTheme: RandomDungeonPropTheme,
  random: () => number,
  idStamp: string
): ScenePropV1[] {
  const theme = PROP_THEME_CONFIG[propTheme];
  const props: ScenePropV1[] = [];
  let counter = 0;
  const nextId = () => `rnd-prop-${idStamp}-${counter++}`;

  rooms.forEach((room, index) => {
    const interior: Array<{ x: number; y: number }> = [];
    const center = centerCell(room);
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) {
      for (let y = room.y + 1; y < room.y + room.h - 1; y++) {
        if (x === center.x && y === center.y) continue;
        interior.push({ x, y });
      }
    }
    const wanted =
      index === 0
        ? 1
        : Math.min(interior.length, 1 + randInt(random, 0, room.w * room.h >= 16 ? 2 : 1));
    for (let k = 0; k < wanted && interior.length > 0; k++) {
      const cellIdx = randInt(random, 0, interior.length - 1);
      const [cell] = interior.splice(cellIdx, 1);
      const kind: ScenePropKindV1 =
        index === 0 && k === 0
          ? theme.firstRoomKind
          : theme.pool[randInt(random, 0, theme.pool.length - 1)];
      props.push({
        id: nextId(),
        kind,
        x: offsetX + (cell.x + 0.5) * cellPx,
        y: offsetY + (cell.y + 0.5) * cellPx,
        rotation: randInt(random, 0, 3) * 90,
      });
    }
  });
  return props;
}

/**
 * Genera un dungeon casuale allineato alla griglia: stanze rettangolari,
 * corridoi a L che le collegano (MST + eventuale anello), muri-porta agli
 * ingressi e prop sparsi nelle stanze.
 */
export function generateRandomDungeon(options: RandomDungeonOptions): RandomDungeonResult {
  const parsedSeed = options.random ? null : parseDungeonSeed(options.seed);
  const seedUsed =
    options.random != null
      ? null
      : (parsedSeed ?? (Math.floor(Math.random() * 1_000_000_000) || 1));
  const random =
    options.random ?? (seedUsed != null ? createSeededRandom(seedUsed) : Math.random);

  const roomCount = clampRoomCount(options.roomCount);
  const roomSize = options.roomSize ?? "medium";
  const propTheme = options.propTheme ?? "dungeon";
  const roomLabelStart = Math.max(1, options.roomLabelStart ?? 1);
  const cols = Math.max(8, Math.floor(options.cols));
  const rows = Math.max(6, Math.floor(options.rows));
  const cellPx = Math.max(1, options.cellPx);
  const offsetX = options.offsetX ?? 0;
  const offsetY = options.offsetY ?? 0;
  const withDoors = options.withDoors !== false;
  const withProps = options.withProps !== false;

  const rooms = placeRooms(roomCount, cols, rows, roomSize, random);
  const edges = spanningTreeEdges(rooms);

  if (rooms.length >= 4 && random() < 0.75) {
    const existing = new Set(edges.map(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`)));
    for (let attempt = 0; attempt < 10; attempt++) {
      const a = randInt(random, 0, rooms.length - 1);
      const b = randInt(random, 0, rooms.length - 1);
      if (a === b) continue;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (existing.has(key)) continue;
      edges.push([a, b]);
      break;
    }
  }

  const corridorRects: CellRect[] = [];
  for (const [a, b] of edges) {
    corridorRects.push(...corridorCellRects(rooms[a], rooms[b], random));
  }

  const stamp = seedUsed != null ? String(seedUsed) : Date.now().toString(36);
  const areas: SceneAreaV1[] = [
    ...rooms.map((r, i) => ({
      id: `rnd-room-${stamp}-${i}`,
      kind: "room" as const,
      polygon: rectangleAreaPolygon(
        offsetX + r.x * cellPx,
        offsetY + r.y * cellPx,
        r.w * cellPx,
        r.h * cellPx
      ),
      label: `Stanza ${roomLabelStart + i}`,
    })),
    ...corridorRects.map((r, i) => ({
      id: `rnd-cor-${stamp}-${i}`,
      kind: "corridor" as const,
      polygon: rectangleAreaPolygon(
        offsetX + r.x * cellPx,
        offsetY + r.y * cellPx,
        r.w * cellPx,
        r.h * cellPx
      ),
    })),
  ];

  const doorWalls = withDoors
    ? doorWallsForCrossings(rooms, corridorRects, cellPx, offsetX, offsetY)
    : [];
  const props = withProps
    ? propsForRooms(rooms, cellPx, offsetX, offsetY, propTheme, random, stamp)
    : [];

  return { areas, doorWalls, props, roomsPlaced: rooms.length, seedUsed };
}
