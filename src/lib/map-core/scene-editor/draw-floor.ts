import type { SceneAreaV1, SceneFloorV1, SceneWallV1 } from "../scene-schema";
import { DEFAULT_FLOOR_RASTER_STYLE, type FloorRasterStyle } from "../raster-export/floor-raster";
import { drawSceneGmNote, drawSceneProp } from "./draw-props";

export type EditorDrawOptions = {
  selectedAreaId?: string | null;
  selectedWallId?: string | null;
  selectedPropId?: string | null;
  selectedGmNoteId?: string | null;
  draftRect?: { x: number; y: number; w: number; h: number } | null;
  draftCorridor?: Array<{ x: number; y: number }> | null;
  draftWall?: { x1: number; y1: number; x2: number; y2: number } | null;
};

const EDITOR_STYLE: FloorRasterStyle = {
  ...DEFAULT_FLOOR_RASTER_STYLE,
  roomFill: "rgba(180, 83, 9, 0.22)",
  corridorFill: "rgba(14, 165, 233, 0.18)",
  areaStroke: "rgba(251, 191, 36, 0.7)",
};

function drawGrid(ctx: CanvasRenderingContext2D, floor: SceneFloorV1) {
  const { cellPx, offsetX, offsetY } = floor.grid;
  if (cellPx < 4) return;
  ctx.strokeStyle = EDITOR_STYLE.grid;
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

function drawWall(ctx: CanvasRenderingContext2D, wall: SceneWallV1, selected: boolean) {
  const { x1, y1, x2, y2, door } = wall;
  ctx.lineCap = "square";
  ctx.strokeStyle = selected ? "rgba(251, 191, 36, 1)" : EDITOR_STYLE.wallStroke;
  ctx.lineWidth = selected ? 5 : EDITOR_STYLE.wallWidth;
  if (!door?.width) {
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
  const drawSeg = (ax: number, ay: number, bx: number, by: number) => {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  };
  if (gapStart > 0.5) drawSeg(x1, y1, x1 + ux * gapStart, y1 + uy * gapStart);
  if (len - gapEnd > 0.5) drawSeg(x1 + ux * gapEnd, y1 + uy * gapEnd, x2, y2);
  ctx.fillStyle = "rgba(34, 197, 94, 0.85)";
  const doorX = x1 + ux * center;
  const doorY = y1 + uy * center;
  ctx.fillRect(doorX - 4, doorY - 4, 8, 8);
}

function drawArea(ctx: CanvasRenderingContext2D, area: SceneAreaV1, selected: boolean) {
  if (area.polygon.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(area.polygon[0].x, area.polygon[0].y);
  for (let i = 1; i < area.polygon.length; i++) {
    ctx.lineTo(area.polygon[i].x, area.polygon[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = area.kind === "corridor" ? EDITOR_STYLE.corridorFill : EDITOR_STYLE.roomFill;
  ctx.fill();
  ctx.strokeStyle = selected ? "rgba(251, 191, 36, 1)" : EDITOR_STYLE.areaStroke;
  ctx.lineWidth = selected ? 3 : 2;
  ctx.stroke();
  for (const p of area.polygon) {
    ctx.fillStyle = selected ? "rgba(251, 191, 36, 0.95)" : "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, selected ? 5 : 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function paintSceneFloorEditor(
  ctx: CanvasRenderingContext2D,
  floor: SceneFloorV1,
  options: EditorDrawOptions = {}
) {
  const w = Math.max(1, floor.width);
  const h = Math.max(1, floor.height);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = EDITOR_STYLE.background;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, floor);

  for (const area of floor.areas) {
    drawArea(ctx, area, area.id === options.selectedAreaId);
  }
  for (const wall of floor.walls) {
    drawWall(ctx, wall, wall.id === options.selectedWallId);
  }

  for (const prop of floor.props ?? []) {
    drawSceneProp(ctx, prop, { selected: prop.id === options.selectedPropId });
  }

  for (const note of floor.gmNotes ?? []) {
    drawSceneGmNote(ctx, note, { selected: note.id === options.selectedGmNoteId });
  }

  if (options.draftRect) {
    const { x, y, w: rw, h: rh } = options.draftRect;
    ctx.strokeStyle = "rgba(251, 191, 36, 0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x, y, rw, rh);
    ctx.setLineDash([]);
  }

  if (options.draftCorridor && options.draftCorridor.length > 0) {
    ctx.strokeStyle = "rgba(56, 189, 248, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(options.draftCorridor[0].x, options.draftCorridor[0].y);
    for (let i = 1; i < options.draftCorridor.length; i++) {
      ctx.lineTo(options.draftCorridor[i].x, options.draftCorridor[i].y);
    }
    ctx.stroke();
    for (const p of options.draftCorridor) {
      ctx.fillStyle = "rgba(56, 189, 248, 0.95)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (options.draftWall) {
    ctx.strokeStyle = "rgba(251, 191, 36, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(options.draftWall.x1, options.draftWall.y1);
    ctx.lineTo(options.draftWall.x2, options.draftWall.y2);
    ctx.stroke();
  }
}
