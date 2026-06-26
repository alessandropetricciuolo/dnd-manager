import type { SceneAreaV1, SceneWallDoorV1, SceneWallV1 } from "../scene-schema";

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Chiave canonica per segmento (indipendente da direzione). */
export function wallSegmentKey(x1: number, y1: number, x2: number, y2: number): string {
  const a = `${roundCoord(x1)},${roundCoord(y1)}`;
  const b = `${roundCoord(x2)},${roundCoord(y2)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function edgesFromPolygon(polygon: Array<{ x: number; y: number }>): Array<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}> {
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    edges.push({
      x1: polygon[i].x,
      y1: polygon[i].y,
      x2: polygon[j].x,
      y2: polygon[j].y,
    });
  }
  return edges;
}

/**
 * Genera muri dai bordi delle aree; preserva porte su segmenti coincidenti.
 */
export function generateWallsFromAreas(
  areas: SceneAreaV1[],
  existingWalls: SceneWallV1[] = [],
  options?: { preserveWallIds?: boolean }
): SceneWallV1[] {
  const preserveWallIds = options?.preserveWallIds !== false;
  const doorsByKey = new Map<string, SceneWallDoorV1>();
  const idsByKey = new Map<string, string>();

  for (const w of existingWalls) {
    const key = wallSegmentKey(w.x1, w.y1, w.x2, w.y2);
    if (preserveWallIds) idsByKey.set(key, w.id);
    if (w.door) doorsByKey.set(key, w.door);
  }

  const edgeKeys = new Map<
    string,
    { x1: number; y1: number; x2: number; y2: number }
  >();
  const edgeUseCount = new Map<string, number>();

  for (const area of areas) {
    if (area.polygon.length < 3) continue;
    for (const e of edgesFromPolygon(area.polygon)) {
      const key = wallSegmentKey(e.x1, e.y1, e.x2, e.y2);
      edgeUseCount.set(key, (edgeUseCount.get(key) ?? 0) + 1);
      if (!edgeKeys.has(key)) edgeKeys.set(key, e);
    }
  }

  const walls: SceneWallV1[] = [];
  for (const [key, e] of edgeKeys) {
    if ((edgeUseCount.get(key) ?? 0) > 1) continue;
    walls.push({
      id: idsByKey.get(key) ?? `wall-${key.replace(/[^a-z0-9]/gi, "").slice(0, 24)}`,
      x1: e.x1,
      y1: e.y1,
      x2: e.x2,
      y2: e.y2,
      door: doorsByKey.get(key),
    });
  }
  return walls;
}
