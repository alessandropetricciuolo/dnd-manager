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

/** Mezza larghezza tratto spray in coordinate normalizzate (≈ pennello su mappa). */
export const EFFECT_SPRAY_HALF_WIDTH_NORM = 0.0065;

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

function normPerp(dx: number, dy: number): [number, number] {
  const L = Math.hypot(dx, dy) || 1e-9;
  return [-dy / L, dx / L];
}

/**
 * Converte una pennellata (centrolinea) in poligono chiuso = alone dello spray.
 */
export function thickPolylineToNormPolygon(samples: NormPoint[], halfWidth: number): NormPoint[] {
  const w = Math.max(1e-6, halfWidth);
  if (samples.length === 0) return [];
  if (samples.length === 1) {
    const c = samples[0];
    return ellipseToNormPolygon(
      clampNormPoint({ x: c.x - w, y: c.y - w }),
      clampNormPoint({ x: c.x + w, y: c.y + w })
    );
  }
  const pts: NormPoint[] = [];
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    let tx: number;
    let ty: number;
    if (i === 0) {
      tx = samples[1].x - p.x;
      ty = samples[1].y - p.y;
    } else if (i === samples.length - 1) {
      tx = p.x - samples[i - 1].x;
      ty = p.y - samples[i - 1].y;
    } else {
      tx = samples[i + 1].x - samples[i - 1].x;
      ty = samples[i + 1].y - samples[i - 1].y;
    }
    const [nx, ny] = normPerp(tx, ty);
    pts.push(clampNormPoint({ x: p.x + nx * w, y: p.y + ny * w }));
  }
  for (let i = samples.length - 1; i >= 0; i--) {
    const p = samples[i];
    let tx: number;
    let ty: number;
    if (i === 0) {
      tx = samples[1].x - p.x;
      ty = samples[1].y - p.y;
    } else if (i === samples.length - 1) {
      tx = p.x - samples[i - 1].x;
      ty = p.y - samples[i - 1].y;
    } else {
      tx = samples[i + 1].x - samples[i - 1].x;
      ty = samples[i + 1].y - samples[i - 1].y;
    }
    const [nx, ny] = normPerp(tx, ty);
    pts.push(clampNormPoint({ x: p.x - nx * w, y: p.y - ny * w }));
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
