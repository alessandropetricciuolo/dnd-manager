import { intrinsicNormToElementPx } from "../coordinates";

export type SquareGridOverlayInput = {
  elementWidth: number;
  elementHeight: number;
  naturalWidth: number;
  naturalHeight: number;
  gridCellPx?: number | null;
  gridCellSourcePxX?: number | null;
  gridOffsetXCells?: number;
  gridOffsetYCells?: number;
};

export type SquareGridOverlayData = {
  leftPct: number;
  topPct: number;
  wPct: number;
  hPct: number;
  vPct: number[];
  hLinesPct: number[];
};

/**
 * Calcola linee griglia quadrata in percentuali viewBox 0–100,
 * allineate al bitmap con object-contain.
 */
export function computeSquareGridOverlay(input: SquareGridOverlayInput): SquareGridOverlayData | null {
  const {
    elementWidth: elW,
    elementHeight: elH,
    naturalWidth: nw,
    naturalHeight: nh,
    gridCellPx = null,
    gridCellSourcePxX = null,
    gridOffsetXCells = 0,
    gridOffsetYCells = 0,
  } = input;

  if (elW <= 0 || elH <= 0 || nw <= 0 || nh <= 0) return null;

  const [leftPx, topPx] = intrinsicNormToElementPx(0, 0, elW, elH, nw, nh);
  const [rightPx, bottomPx] = intrinsicNormToElementPx(1, 1, elW, elH, nw, nh);
  const wPx = Math.max(0, rightPx - leftPx);
  const hPx = Math.max(0, bottomPx - topPx);
  if (wPx < 4 || hPx < 4) return null;

  const stepFromSource =
    gridCellSourcePxX && gridCellSourcePxX > 1 && nw > 0 ? (wPx / nw) * gridCellSourcePxX : null;
  const xStep = stepFromSource ?? gridCellPx ?? 0;
  const yStep = xStep;
  if (!xStep || xStep <= 2 || !yStep || yStep <= 2) return null;

  const mod = (n: number, m: number) => ((n % m) + m) % m;
  const xStart = leftPx + mod(gridOffsetXCells * xStep, xStep);
  const yStart = topPx + mod(gridOffsetYCells * yStep, yStep);

  const vertical: number[] = [];
  for (let x = xStart; x <= leftPx + wPx + 0.5; x += xStep) vertical.push(x);
  for (let x = xStart - xStep; x >= leftPx - 0.5; x -= xStep) vertical.push(x);

  const horizontal: number[] = [];
  for (let y = yStart; y <= topPx + hPx + 0.5; y += yStep) horizontal.push(y);
  for (let y = yStart - yStep; y >= topPx - 0.5; y -= yStep) horizontal.push(y);

  return {
    leftPct: (leftPx / elW) * 100,
    topPct: (topPx / elH) * 100,
    wPct: (wPx / elW) * 100,
    hPct: (hPx / elH) * 100,
    vPct: vertical.map((x) => (x / elW) * 100),
    hLinesPct: horizontal.map((y) => (y / elH) * 100),
  };
}
