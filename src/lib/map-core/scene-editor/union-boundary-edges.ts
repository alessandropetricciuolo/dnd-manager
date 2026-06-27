import polygonClipping from "polygon-clipping";

export type PolyPoint = { x: number; y: number };

export type BoundarySegment = { x1: number; y1: number; x2: number; y2: number };

type Ring = polygonClipping.Ring;
type MultiPolygon = polygonClipping.MultiPolygon;

function closeRing(points: PolyPoint[]): Ring {
  if (points.length === 0) return [];
  const ring: Ring = points.map((p) => [p.x, p.y]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

function ringToSegments(ring: Ring): BoundarySegment[] {
  const segments: BoundarySegment[] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    if (Math.hypot(x2 - x1, y2 - y1) < 0.5) continue;
    segments.push({ x1, y1, x2, y2 });
  }
  return segments;
}

function unionMultiPolygon(polygons: PolyPoint[][]): MultiPolygon {
  let acc: MultiPolygon | null = null;
  for (const poly of polygons) {
    if (poly.length < 3) continue;
    const piece: MultiPolygon = [[closeRing(poly)]];
    acc = acc ? polygonClipping.union(acc, piece) : piece;
  }
  return acc ?? [];
}

/**
 * Bordi visibili = perimetro esterno dell'unione di tutte le aree (sovrapposizioni incluse).
 */
export function unionBoundarySegments(polygons: PolyPoint[][]): BoundarySegment[] {
  const valid = polygons.filter((p) => p.length >= 3);
  if (valid.length === 0) return [];
  if (valid.length === 1) return ringToSegments(closeRing(valid[0]));

  const united = unionMultiPolygon(valid);
  const segments: BoundarySegment[] = [];
  for (const polygon of united) {
    const outer = polygon[0];
    if (!outer || outer.length < 4) continue;
    segments.push(...ringToSegments(outer));
  }
  return dedupeSegments(segments);
}

function dedupeSegments(segments: BoundarySegment[]): BoundarySegment[] {
  const map = new Map<string, BoundarySegment>();
  for (const s of segments) {
    const key = segmentKey(s.x1, s.y1, s.x2, s.y2);
    if (!map.has(key)) map.set(key, s);
  }
  return [...map.values()];
}

export function segmentKey(x1: number, y1: number, x2: number, y2: number): string {
  const round = (n: number) => Math.round(n * 100) / 100;
  const a = `${round(x1)},${round(y1)}`;
  const b = `${round(x2)},${round(y2)}`;
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}
