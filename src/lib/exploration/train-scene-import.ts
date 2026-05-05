import type { NormPoint } from "@/lib/exploration/fow-geometry";

type SceneWall = {
  c: [number, number, number, number];
  move?: number;
  sense?: number;
  sound?: number;
  door?: number;
};

type SceneLight = {
  x: number;
  y: number;
  dim?: number;
  bright?: number;
  tintColor?: string;
  tintAlpha?: number;
};

export type ParsedTrainScene = {
  name: string;
  width: number;
  height: number;
  grid: number;
  shiftX: number;
  shiftY: number;
  walls: SceneWall[];
  lights: SceneLight[];
};

export type ImportedFowRegion = {
  polygon: NormPoint[];
  sortOrder: number;
  cellCount: number;
};

export type ImportTrainSceneResult = {
  scene: ParsedTrainScene;
  gridCellsW: number;
  gridCellsH: number;
  gridOffsetXCells: number;
  gridOffsetYCells: number;
  regions: ImportedFowRegion[];
};

function asFinite(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function assertPositiveInt(n: number, msg: string) {
  if (!Number.isFinite(n) || n <= 0 || Math.floor(n) !== n) {
    throw new Error(msg);
  }
}

export function parseTrainSceneJson(raw: unknown): ParsedTrainScene {
  if (!raw || typeof raw !== "object") {
    throw new Error("JSON scena non valido.");
  }
  const obj = raw as Record<string, unknown>;
  const width = asFinite(obj.width);
  const height = asFinite(obj.height);
  const grid = asFinite(obj.grid);
  assertPositiveInt(Math.floor(width), "Larghezza scena non valida.");
  assertPositiveInt(Math.floor(height), "Altezza scena non valida.");
  assertPositiveInt(Math.floor(grid), "Grid scena non valida.");
  if (width > 32000 || height > 32000) {
    throw new Error("Dimensioni scena troppo grandi.");
  }
  const wallsRaw = Array.isArray(obj.walls) ? obj.walls : [];
  if (wallsRaw.length === 0) {
    throw new Error("JSON privo di walls.");
  }
  if (wallsRaw.length > 20000) {
    throw new Error("Troppe walls nel JSON.");
  }
  const walls: SceneWall[] = [];
  for (const w of wallsRaw) {
    if (!w || typeof w !== "object") continue;
    const c = (w as { c?: unknown }).c;
    if (!Array.isArray(c) || c.length !== 4) continue;
    const x1 = asFinite(c[0], NaN);
    const y1 = asFinite(c[1], NaN);
    const x2 = asFinite(c[2], NaN);
    const y2 = asFinite(c[3], NaN);
    if (![x1, y1, x2, y2].every(Number.isFinite)) continue;
    walls.push({
      c: [x1, y1, x2, y2],
      move: asFinite((w as { move?: unknown }).move, 1),
      sense: asFinite((w as { sense?: unknown }).sense, 1),
      sound: asFinite((w as { sound?: unknown }).sound, 1),
      door: asFinite((w as { door?: unknown }).door, 0),
    });
  }
  if (walls.length === 0) {
    throw new Error("Walls non valide nel JSON.");
  }
  const lightsRaw = Array.isArray(obj.lights) ? obj.lights : [];
  const lights: SceneLight[] = lightsRaw
    .filter((l) => l && typeof l === "object")
    .map((l) => ({
      x: asFinite((l as { x?: unknown }).x, 0),
      y: asFinite((l as { y?: unknown }).y, 0),
      dim: asFinite((l as { dim?: unknown }).dim, 0),
      bright: asFinite((l as { bright?: unknown }).bright, 0),
      tintColor: typeof (l as { tintColor?: unknown }).tintColor === "string" ? (l as { tintColor: string }).tintColor : undefined,
      tintAlpha: asFinite((l as { tintAlpha?: unknown }).tintAlpha, 0),
    }));
  return {
    name: typeof obj.name === "string" ? obj.name : "Scena importata",
    width: Math.floor(width),
    height: Math.floor(height),
    grid: Math.floor(grid),
    shiftX: asFinite(obj.shiftX, 0),
    shiftY: asFinite(obj.shiftY, 0),
    walls,
    lights,
  };
}

type Cell = { x: number; y: number };

function buildEdgeKey(a: Cell, b: Cell): string {
  return `${a.x},${a.y}|${b.x},${b.y}`;
}

function buildBlockedEdges(
  scene: ParsedTrainScene,
  originX: number,
  originY: number
): Set<string> {
  const blocked = new Set<string>();
  const tol = Math.max(2, scene.grid * 0.2);
  for (const w of scene.walls) {
    if ((w.move ?? 1) <= 0) continue;
    const [x1, y1, x2, y2] = w.c;
    const dx = Math.abs(x1 - x2);
    const dy = Math.abs(y1 - y2);
    if (dx <= tol) {
      const bx = Math.round(((x1 + x2) / 2 - originX) / scene.grid);
      const yStart = Math.round((Math.min(y1, y2) - originY) / scene.grid);
      const yEnd = Math.round((Math.max(y1, y2) - originY) / scene.grid);
      for (let y = yStart; y < yEnd; y++) {
        const a = { x: bx - 1, y };
        const b = { x: bx, y };
        blocked.add(buildEdgeKey(a, b));
        blocked.add(buildEdgeKey(b, a));
      }
      continue;
    }
    if (dy <= tol) {
      const by = Math.round(((y1 + y2) / 2 - originY) / scene.grid);
      const xStart = Math.round((Math.min(x1, x2) - originX) / scene.grid);
      const xEnd = Math.round((Math.max(x1, x2) - originX) / scene.grid);
      for (let x = xStart; x < xEnd; x++) {
        const a = { x, y: by - 1 };
        const b = { x, y: by };
        blocked.add(buildEdgeKey(a, b));
        blocked.add(buildEdgeKey(b, a));
      }
    }
  }
  return blocked;
}

function neighbors(c: Cell): Cell[] {
  return [
    { x: c.x + 1, y: c.y },
    { x: c.x - 1, y: c.y },
    { x: c.x, y: c.y + 1 },
    { x: c.x, y: c.y - 1 },
  ];
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

export function importTrainSceneToFow(raw: unknown): ImportTrainSceneResult {
  const scene = parseTrainSceneJson(raw);
  const gridCellsW = Math.max(1, Math.round(scene.width / scene.grid));
  const gridCellsH = Math.max(1, Math.round(scene.height / scene.grid));
  // Use the full exported scene coordinate system (0..width / 0..height).
  // Using wall bounds as origin causes visible FoW shifts on many maps.
  const blocked = buildBlockedEdges(scene, 0, 0);
  const outside = new Set<string>();
  const queue: Cell[] = [];
  for (let x = 0; x < gridCellsW; x++) {
    queue.push({ x, y: 0 }, { x, y: gridCellsH - 1 });
  }
  for (let y = 0; y < gridCellsH; y++) {
    queue.push({ x: 0, y }, { x: gridCellsW - 1, y });
  }
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.x < 0 || cur.y < 0 || cur.x >= gridCellsW || cur.y >= gridCellsH) continue;
    const k = key(cur.x, cur.y);
    if (outside.has(k)) continue;
    outside.add(k);
    for (const n of neighbors(cur)) {
      if (n.x < 0 || n.y < 0 || n.x >= gridCellsW || n.y >= gridCellsH) continue;
      if (blocked.has(buildEdgeKey(cur, n))) continue;
      const nk = key(n.x, n.y);
      if (!outside.has(nk)) queue.push(n);
    }
  }

  const visited = new Set<string>();
  const components: Cell[][] = [];
  for (let y = 0; y < gridCellsH; y++) {
    for (let x = 0; x < gridCellsW; x++) {
      const k = key(x, y);
      if (outside.has(k) || visited.has(k)) continue;
      const comp: Cell[] = [];
      const q: Cell[] = [{ x, y }];
      visited.add(k);
      while (q.length > 0) {
        const cur = q.shift()!;
        comp.push(cur);
        for (const n of neighbors(cur)) {
          if (n.x < 0 || n.y < 0 || n.x >= gridCellsW || n.y >= gridCellsH) continue;
          const nk = key(n.x, n.y);
          if (outside.has(nk) || visited.has(nk)) continue;
          if (blocked.has(buildEdgeKey(cur, n))) continue;
          visited.add(nk);
          q.push(n);
        }
      }
      if (comp.length >= 4) components.push(comp);
    }
  }

  let regions: ImportedFowRegion[] = components
    .map((comp, idx) => {
      const xs = comp.map((c) => c.x);
      const ys = comp.map((c) => c.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs) + 1;
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys) + 1;
      const p1 = { x: minX / gridCellsW, y: minY / gridCellsH };
      const p2 = { x: maxX / gridCellsW, y: minY / gridCellsH };
      const p3 = { x: maxX / gridCellsW, y: maxY / gridCellsH };
      const p4 = { x: minX / gridCellsW, y: maxY / gridCellsH };
      return {
        polygon: [p1, p2, p3, p4],
        sortOrder: idx + 1,
        cellCount: comp.length,
      };
    })
    .sort((a, b) => b.cellCount - a.cellCount);

  if (regions.length < 3) {
    regions = buildDoorSliceRegions(scene);
  }

  if (regions.length === 0) {
    throw new Error("Nessuna zona FoW ricostruita dal JSON. Verifica walls/grid.");
  }

  return {
    scene,
    gridCellsW,
    gridCellsH,
    gridOffsetXCells: 0,
    gridOffsetYCells: 0,
    regions: regions.map((r, idx) => ({ ...r, sortOrder: idx + 1 })),
  };
}

function buildDoorSliceRegions(scene: ParsedTrainScene): ImportedFowRegion[] {
  const tol = Math.max(2, scene.grid * 0.2);
  // Align slices to the full scene, not only wall extents.
  const minX = 0;
  const maxX = scene.width;
  const minY = 0;
  const maxY = scene.height;

  const doorBoundaries = scene.walls
    .filter((w) => (w.door ?? 0) === 1)
    .filter((w) => Math.abs(w.c[0] - w.c[2]) <= tol)
    .map((w) => (w.c[0] + w.c[2]) / 2)
    .filter((x) => x > minX + scene.grid && x < maxX - scene.grid)
    .sort((a, b) => a - b);

  const boundaries = [minX, ...doorBoundaries, maxX].filter(
    (v, i, arr) => i === 0 || Math.abs(v - arr[i - 1]) > scene.grid * 0.5
  );

  const regions: ImportedFowRegion[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const left = boundaries[i];
    const right = boundaries[i + 1];
    if (right - left < scene.grid * 2) continue;
    const polygon: NormPoint[] = [
      { x: left / scene.width, y: minY / scene.height },
      { x: right / scene.width, y: minY / scene.height },
      { x: right / scene.width, y: maxY / scene.height },
      { x: left / scene.width, y: maxY / scene.height },
    ];
    regions.push({
      polygon,
      sortOrder: regions.length + 1,
      cellCount: Math.max(1, Math.round(((right - left) * (maxY - minY)) / (scene.grid * scene.grid))),
    });
  }
  return regions;
}
