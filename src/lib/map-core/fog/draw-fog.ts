import { intrinsicNormToElementPx } from "../coordinates";
import type { NormPoint } from "../coordinates";

export function getDevicePixelRatio(): number {
  return typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
}

/** Allinea dimensioni canvas al box elemento (CSS px + backing store DPR). */
export function sizeCanvasToElement(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  dpr = getDevicePixelRatio()
): void {
  canvas.width = Math.max(1, Math.floor(w * dpr));
  canvas.height = Math.max(1, Math.floor(h * dpr));
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
}

export function tracePolygonPathPx(
  ctx: CanvasRenderingContext2D,
  poly: NormPoint[],
  w: number,
  h: number,
  naturalW: number,
  naturalH: number
): void {
  if (poly.length < 3) return;
  const [x0, y0] = intrinsicNormToElementPx(poly[0].x, poly[0].y, w, h, naturalW, naturalH);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  for (let i = 1; i < poly.length; i++) {
    const [xi, yi] = intrinsicNormToElementPx(poly[i].x, poly[i].y, w, h, naturalW, naturalH);
    ctx.lineTo(xi, yi);
  }
  ctx.closePath();
}

export type DrawFogOptions = {
  elementWidth: number;
  elementHeight: number;
  revealedPolygons: NormPoint[][];
  fogFill: string;
  naturalWidth: number;
  naturalHeight: number;
  devicePixelRatio?: number;
};

/**
 * Disegna nebbia piena e ritaglia le aree rivelate (destination-out).
 * Coordinate poligoni: normalizzate 0–1 rispetto al bitmap intrinseco.
 */
export function drawFogOnCanvas(canvas: HTMLCanvasElement, options: DrawFogOptions): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const {
    elementWidth: w,
    elementHeight: h,
    revealedPolygons: revealed,
    fogFill,
    naturalWidth: naturalW,
    naturalHeight: naturalH,
  } = options;
  const dpr = options.devicePixelRatio ?? getDevicePixelRatio();

  sizeCanvasToElement(canvas, w, h, dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = fogFill;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "destination-out";
  for (const poly of revealed) {
    if (poly.length < 3) continue;
    tracePolygonPathPx(ctx, poly, w, h, naturalW, naturalH);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over";
}
