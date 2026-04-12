/** Poligono in coordinate normalizzate 0–1 rispetto all'immagine. */
export type NormPoint = { x: number; y: number };

export function pointInPolygon(px: number, py: number, poly: NormPoint[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function parsePolygonJson(raw: unknown): NormPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: NormPoint[] = [];
  for (const p of raw) {
    if (p && typeof p === "object" && "x" in p && "y" in p) {
      const x = Number((p as NormPoint).x);
      const y = Number((p as NormPoint).y);
      if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y });
    }
  }
  return out;
}

export function clampNormPoint(p: NormPoint): NormPoint {
  return {
    x: Math.min(1, Math.max(0, p.x)),
    y: Math.min(1, Math.max(0, p.y)),
  };
}
