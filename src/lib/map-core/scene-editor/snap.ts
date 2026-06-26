import type { SceneFloorV1 } from "../scene-schema";

export function snapPx(value: number, cellPx: number, offset = 0): number {
  if (cellPx <= 0) return value;
  return Math.round((value - offset) / cellPx) * cellPx + offset;
}

export function snapPoint(
  x: number,
  y: number,
  floor: Pick<SceneFloorV1, "grid">
): { x: number; y: number } {
  const { cellPx, offsetX, offsetY } = floor.grid;
  return {
    x: snapPx(x, cellPx, offsetX),
    y: snapPx(y, cellPx, offsetY),
  };
}

export function distancePointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-9) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}
