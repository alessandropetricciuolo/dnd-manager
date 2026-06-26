import type { SceneFloorV1, SceneWallV1 } from "../scene-schema";
import { drawSceneProp } from "../scene-editor/draw-props";

/** Stile raster minimale (proiezione tavolo / export Fase 2B). */
export type FloorRasterStyle = {
  background: string;
  grid: string;
  roomFill: string;
  corridorFill: string;
  areaStroke: string;
  wallStroke: string;
  wallWidth: number;
};

export const DEFAULT_FLOOR_RASTER_STYLE: FloorRasterStyle = {
  background: "#1c1917",
  grid: "rgba(255,255,255,0.08)",
  roomFill: "rgba(120, 113, 108, 0.35)",
  corridorFill: "rgba(87, 83, 78, 0.3)",
  areaStroke: "rgba(231, 229, 228, 0.55)",
  wallStroke: "rgba(250, 250, 249, 0.85)",
  wallWidth: 3,
};

function drawGrid(ctx: CanvasRenderingContext2D, floor: SceneFloorV1, style: FloorRasterStyle) {
  const { cellPx, offsetX, offsetY } = floor.grid;
  if (cellPx < 4) return;
  ctx.strokeStyle = style.grid;
  ctx.lineWidth = 1;
  for (let x = offsetX; x <= floor.width; x += cellPx) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, floor.height);
    ctx.stroke();
  }
  for (let y = offsetY; y <= floor.height; y += cellPx) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(floor.width, y + 0.5);
    ctx.stroke();
  }
}

function drawWallSegment(
  ctx: CanvasRenderingContext2D,
  wall: SceneWallV1,
  style: FloorRasterStyle
) {
  const { x1, y1, x2, y2, door } = wall;
  ctx.strokeStyle = style.wallStroke;
  ctx.lineWidth = style.wallWidth;
  ctx.lineCap = "square";
  if (!door || door.width <= 0) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    return;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const center = door.offset * len;
  const half = door.width / 2;
  const gapStart = Math.max(0, center - half);
  const gapEnd = Math.min(len, center + half);
  const segments: Array<[number, number, number, number]> = [];
  if (gapStart > 0.5) {
    segments.push([x1, y1, x1 + ux * gapStart, y1 + uy * gapStart]);
  }
  if (len - gapEnd > 0.5) {
    segments.push([x1 + ux * gapEnd, y1 + uy * gapEnd, x2, y2]);
  }
  for (const [a, b, c, d] of segments) {
    ctx.beginPath();
    ctx.moveTo(a, b);
    ctx.lineTo(c, d);
    ctx.stroke();
  }
}

export function renderFloorToCanvas(
  floor: SceneFloorV1,
  style: FloorRasterStyle = DEFAULT_FLOOR_RASTER_STYLE
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(floor.width));
  canvas.height = Math.max(1, Math.floor(floor.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.fillStyle = style.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid(ctx, floor, style);

  for (const area of floor.areas) {
    if (area.polygon.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(area.polygon[0].x, area.polygon[0].y);
    for (let i = 1; i < area.polygon.length; i++) {
      ctx.lineTo(area.polygon[i].x, area.polygon[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = area.kind === "corridor" ? style.corridorFill : style.roomFill;
    ctx.fill();
    ctx.strokeStyle = style.areaStroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const wall of floor.walls) {
    drawWallSegment(ctx, wall, style);
  }

  for (const prop of floor.props ?? []) {
    drawSceneProp(ctx, prop, { forRaster: true });
  }

  return canvas;
}

export async function exportFloorRasterBlob(
  floor: SceneFloorV1,
  style?: FloorRasterStyle
): Promise<Blob> {
  const canvas = renderFloorToCanvas(floor, style);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export raster fallito."))),
      "image/webp",
      0.88
    );
  });
}
