import type { NormPoint } from "@/lib/exploration/fow-geometry";
import { clampNormPoint, intrinsicNormToElementPx } from "@/lib/exploration/fow-geometry";

export type FowShapeKind = "quadrato" | "cerchio" | "spray" | "poligono-libero";

export type LayoutMetrics = {
  elW: number;
  elH: number;
  naturalW: number;
  naturalH: number;
};

export function normToPx(p: NormPoint, m: LayoutMetrics): NormPoint {
  const [x, y] = intrinsicNormToElementPx(p.x, p.y, m.elW, m.elH, m.naturalW, m.naturalH);
  return { x, y };
}

export function pxToNorm(p: NormPoint, m: LayoutMetrics): NormPoint {
  if (m.naturalW <= 0 || m.naturalH <= 0 || m.elW <= 0 || m.elH <= 0) return clampNormPoint(p);
  const scale = Math.min(m.elW / m.naturalW, m.elH / m.naturalH);
  const drawW = m.naturalW * scale;
  const drawH = m.naturalH * scale;
  const ox = (m.elW - drawW) / 2;
  const oy = (m.elH - drawH) / 2;
  return clampNormPoint({ x: (p.x - ox) / drawW, y: (p.y - oy) / drawH });
}

export function rectangleToNormPolygon(a: NormPoint, b: NormPoint): NormPoint[] {
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ].map(clampNormPoint);
}

export function ellipseToNormPolygon(a: NormPoint, b: NormPoint, segments = 28): NormPoint[] {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const rx = Math.abs(b.x - a.x) / 2;
  const ry = Math.abs(b.y - a.y) / 2;
  const pts: NormPoint[] = [];
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push(clampNormPoint({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry }));
  }
  return pts;
}

export function sprayBlobToNormPolygon(a: NormPoint, b: NormPoint, points = 22): NormPoint[] {
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const rx = Math.abs(b.x - a.x) / 2;
  const ry = Math.abs(b.y - a.y) / 2;
  const pts: NormPoint[] = [];
  for (let i = 0; i < points; i++) {
    const t = (i / points) * Math.PI * 2;
    const jitter = 0.62 + Math.random() * 0.42;
    pts.push(
      clampNormPoint({
        x: cx + Math.cos(t) * rx * jitter,
        y: cy + Math.sin(t) * ry * jitter,
      })
    );
  }
  return pts;
}

export function generateShapePolygon(kind: FowShapeKind, a: NormPoint, b: NormPoint): NormPoint[] {
  if (kind === "cerchio") return ellipseToNormPolygon(a, b);
  if (kind === "spray") return sprayBlobToNormPolygon(a, b);
  return rectangleToNormPolygon(a, b);
}

/** Mezza larghezza del tratto spray in coordinate normalizzate (0–1 sull’immagine). */
export const EFFECT_SPRAY_HALF_WIDTH_NORM = 0.013;

/**
 * Converte una pennellata (sequenza di punti) in un poligono chiuso a “nastro”.
 * Usato per lo spray effetti (non il rettangolo blob).
 */
export function sprayStrokeToNormPolygon(stroke: NormPoint[], halfWidth: number): NormPoint[] {
  if (stroke.length === 0) return [];
  const hw = Math.max(0.004, Math.min(0.06, halfWidth));

  if (stroke.length === 1) {
    const c = stroke[0];
    const seg = 18;
    const out: NormPoint[] = [];
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      out.push(clampNormPoint({ x: c.x + Math.cos(t) * hw * 1.4, y: c.y + Math.sin(t) * hw * 1.4 }));
    }
    return out;
  }

  function strokeTangent(i: number): { dx: number; dy: number } {
    const cur = stroke[i];
    if (stroke.length === 2) {
      const o = stroke[1 - i];
      let dx = cur.x - o.x;
      let dy = cur.y - o.y;
      const L = Math.hypot(dx, dy) || 1e-6;
      return { dx: dx / L, dy: dy / L };
    }
    if (i === 0) {
      const nx = stroke[1].x - cur.x;
      const ny = stroke[1].y - cur.y;
      const L = Math.hypot(nx, ny) || 1e-6;
      return { dx: nx / L, dy: ny / L };
    }
    if (i === stroke.length - 1) {
      const px = cur.x - stroke[i - 1].x;
      const py = cur.y - stroke[i - 1].y;
      const L = Math.hypot(px, py) || 1e-6;
      return { dx: px / L, dy: py / L };
    }
    const t1x = cur.x - stroke[i - 1].x;
    const t1y = cur.y - stroke[i - 1].y;
    const t2x = stroke[i + 1].x - cur.x;
    const t2y = stroke[i + 1].y - cur.y;
    const L1 = Math.hypot(t1x, t1y) || 1e-6;
    const L2 = Math.hypot(t2x, t2y) || 1e-6;
    let dx = t1x / L1 + t2x / L2;
    let dy = t1y / L1 + t2y / L2;
    const L = Math.hypot(dx, dy) || 1e-6;
    return { dx: dx / L, dy: dy / L };
  }

  const left: NormPoint[] = [];
  const right: NormPoint[] = [];
  for (let i = 0; i < stroke.length; i++) {
    const cur = stroke[i];
    const { dx, dy } = strokeTangent(i);
    const px = -dy * hw;
    const py = dx * hw;
    left.push(clampNormPoint({ x: cur.x + px, y: cur.y + py }));
    right.push(clampNormPoint({ x: cur.x - px, y: cur.y - py }));
  }
  return [...left, ...right.slice().reverse()];
}

export function centroid(points: NormPoint[]): NormPoint {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p.x;
    y += p.y;
  }
  const n = points.length || 1;
  return { x: x / n, y: y / n };
}

export function translatePolygon(points: NormPoint[], dx: number, dy: number): NormPoint[] {
  return points.map((p) => clampNormPoint({ x: p.x + dx, y: p.y + dy }));
}

export function scalePolygonFromCenter(points: NormPoint[], scale: number): NormPoint[] {
  const c = centroid(points);
  return points.map((p) =>
    clampNormPoint({
      x: c.x + (p.x - c.x) * scale,
      y: c.y + (p.y - c.y) * scale,
    })
  );
}
