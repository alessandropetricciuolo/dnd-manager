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

/**
 * Vertici salvati come frazioni del bitmap (0–1). Con CSS object-fit: contain il bitmap
 * è centrato e ridimensionato dentro il box dell'<img>; questa funzione mappa quei punti
 * in pixel CSS rispetto al box dell'elemento (stesso sistema di coordinate del canvas/SVG sopra l'img).
 */
export function intrinsicNormToElementPx(
  nx: number,
  ny: number,
  elW: number,
  elH: number,
  naturalW: number,
  naturalH: number
): [number, number] {
  if (naturalW < 1 || naturalH < 1 || elW < 1 || elH < 1) {
    return [nx * elW, ny * elH];
  }
  const scale = Math.min(elW / naturalW, elH / naturalH);
  const dw = naturalW * scale;
  const dh = naturalH * scale;
  const ox = (elW - dw) / 2;
  const oy = (elH - dh) / 2;
  return [ox + nx * dw, oy + ny * dh];
}

/** Coordinate SVG in viewBox 0–100 (percentuali del box elemento). */
export function intrinsicNormToSvgUserUnits(
  nx: number,
  ny: number,
  elW: number,
  elH: number,
  naturalW: number,
  naturalH: number
): [number, number] {
  const [px, py] = intrinsicNormToElementPx(nx, ny, elW, elH, naturalW, naturalH);
  return [(px / elW) * 100, (py / elH) * 100];
}
