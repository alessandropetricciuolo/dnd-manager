import { clampNormPoint } from "./clamp";
import type { NormPoint } from "./types";

export type ObjectContainLayout = {
  scale: number;
  dw: number;
  dh: number;
  ox: number;
  oy: number;
};

/** Layout del bitmap con CSS object-fit: contain dentro un box elemento. */
export function getObjectContainLayout(
  elW: number,
  elH: number,
  naturalW: number,
  naturalH: number
): ObjectContainLayout {
  if (naturalW < 1 || naturalH < 1 || elW < 1 || elH < 1) {
    return { scale: 1, dw: elW, dh: elH, ox: 0, oy: 0 };
  }
  const scale = Math.min(elW / naturalW, elH / naturalH);
  const dw = naturalW * scale;
  const dh = naturalH * scale;
  const ox = (elW - dw) / 2;
  const oy = (elH - dh) / 2;
  return { scale, dw, dh, ox, oy };
}

/**
 * Vertici salvati come frazioni del bitmap (0–1). Con object-fit: contain il bitmap
 * è centrato e ridimensionato dentro il box; questa funzione mappa in pixel CSS
 * rispetto al box dell'elemento (stesso sistema di canvas/SVG sopra l'img).
 */
export function intrinsicNormToElementPx(
  nx: number,
  ny: number,
  elW: number,
  elH: number,
  naturalW: number,
  naturalH: number
): [number, number] {
  const { ox, oy, dw, dh } = getObjectContainLayout(elW, elH, naturalW, naturalH);
  if (naturalW < 1 || naturalH < 1 || elW < 1 || elH < 1) {
    return [nx * elW, ny * elH];
  }
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

/** Inverso di intrinsicNormToElementPx: pixel elemento → coordinate normalizzate bitmap. */
export function elementPxToNorm(
  px: number,
  py: number,
  elW: number,
  elH: number,
  naturalW: number,
  naturalH: number
): NormPoint {
  const { ox, oy, dw, dh } = getObjectContainLayout(elW, elH, naturalW, naturalH);
  if (naturalW < 1 || naturalH < 1 || elW < 1 || elH < 1 || dw < 1e-9 || dh < 1e-9) {
    return clampNormPoint({ x: px / Math.max(elW, 1), y: py / Math.max(elH, 1) });
  }
  const x = (px - ox) / dw;
  const y = (py - oy) / dh;
  return clampNormPoint({ x, y });
}

export type ClientPointToNormInput = {
  clientX: number;
  clientY: number;
  boundingRect: { left: number; top: number; width: number; height: number };
  offsetWidth: number;
  offsetHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  /** Margine fuori dal box prima di scartare il punto (default 12px scalati). */
  slackPx?: number;
};

/** Da coordinate schermo (es. mouse) a NormPoint, allineato a zoom/pan su TransformWrapper. */
export function clientPointToNorm(input: ClientPointToNormInput): NormPoint | null {
  const {
    clientX,
    clientY,
    boundingRect: sr,
    offsetWidth: elW,
    offsetHeight: elH,
    naturalWidth: naturalW,
    naturalHeight: naturalH,
  } = input;
  if (naturalW < 1 || naturalH < 1 || elW < 1 || elH < 1 || sr.width <= 0 || sr.height <= 0) {
    return null;
  }
  const slack = input.slackPx ?? 12 * (elW / Math.max(sr.width, 1e-6));
  const pxRaw = ((clientX - sr.left) / sr.width) * elW;
  const pyRaw = ((clientY - sr.top) / sr.height) * elH;
  if (pxRaw < -slack || pxRaw > elW + slack || pyRaw < -slack || pyRaw > elH + slack) {
    return null;
  }
  const px = Math.min(elW, Math.max(0, pxRaw));
  const py = Math.min(elH, Math.max(0, pyRaw));
  return elementPxToNorm(px, py, elW, elH, naturalW, naturalH);
}

export function normToCssPercentPosition(
  p: NormPoint,
  elW: number,
  elH: number,
  naturalW: number,
  naturalH: number
): { left: string; top: string } {
  if (naturalW > 0 && naturalH > 0 && elW > 0 && elH > 0) {
    const [px, py] = intrinsicNormToElementPx(p.x, p.y, elW, elH, naturalW, naturalH);
    return { left: `${(px / elW) * 100}%`, top: `${(py / elH) * 100}%` };
  }
  return { left: `${p.x * 100}%`, top: `${p.y * 100}%` };
}
