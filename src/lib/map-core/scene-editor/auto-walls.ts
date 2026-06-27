import type { SceneAreaV1, SceneWallDoorV1, SceneWallV1 } from "../scene-schema";
import { segmentKey as unionSegmentKey, unionBoundarySegments } from "./union-boundary-edges";

function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Chiave canonica per segmento (indipendente da direzione). */
export function wallSegmentKey(x1: number, y1: number, x2: number, y2: number): string {
  return unionSegmentKey(x1, y1, x2, y2);
}

/**
 * Genera muri dal perimetro esterno dell'unione delle aree; preserva porte su segmenti coincidenti.
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

  const polygons = areas.filter((a) => a.polygon.length >= 3).map((a) => a.polygon);
  const boundary = unionBoundarySegments(polygons);

  const walls: SceneWallV1[] = [];
  for (const e of boundary) {
    const key = wallSegmentKey(e.x1, e.y1, e.x2, e.y2);
    walls.push({
      id: idsByKey.get(key) ?? `wall-${key.replace(/[^a-z0-9]/gi, "").slice(0, 24)}`,
      x1: roundCoord(e.x1),
      y1: roundCoord(e.y1),
      x2: roundCoord(e.x2),
      y2: roundCoord(e.y2),
      door: doorsByKey.get(key),
    });
  }
  return walls;
}
