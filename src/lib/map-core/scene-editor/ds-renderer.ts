import { pointInPolygon } from "../coordinates";
import type { SceneAreaV1, SceneFloorV1, SceneLayerV1, SceneWallV1 } from "../scene-schema";
import { sceneLayerPreset, type SceneLayerPreset } from "../scene-schema/layer-presets";
import { normalizeSceneFloor } from "../scene-schema/normalize-floor";
import type { EditorDrawOptions } from "./draw-floor";
import { previewCorridorPolygon } from "./corridor-geometry";
import { drawSceneGmNote, drawScenePropSvg } from "./draw-props-svg";

export type DsPaintOptions = EditorDrawOptions;

const hatchPatternCache = new Map<string, CanvasPattern | null>();

function getHatchPattern(
  ctx: CanvasRenderingContext2D,
  preset: SceneLayerPreset
): CanvasPattern | null {
  const key = `${preset.hatchColor}-${preset.hatchSpacing}`;
  if (hatchPatternCache.has(key)) return hatchPatternCache.get(key) ?? null;
  if (typeof document === "undefined") return null;
  const size = Math.max(4, preset.hatchSpacing);
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext("2d");
  if (!tctx) return null;
  tctx.strokeStyle = preset.hatchColor;
  tctx.lineWidth = 1;
  tctx.beginPath();
  tctx.moveTo(0, size);
  tctx.lineTo(size, 0);
  tctx.stroke();
  const pattern = ctx.createPattern(tile, "repeat");
  hatchPatternCache.set(key, pattern);
  return pattern;
}

function polygonNorm(
  polygon: Array<{ x: number; y: number }>,
  w: number,
  h: number
) {
  return polygon.map((p) => ({ x: p.x / w, y: p.y / h }));
}

function isInsideAnyArea(
  x: number,
  y: number,
  areas: SceneAreaV1[],
  floorW: number,
  floorH: number
): boolean {
  const nx = x / floorW;
  const ny = y / floorH;
  for (const a of areas) {
    if (a.polygon.length < 3) continue;
    if (pointInPolygon(nx, ny, polygonNorm(a.polygon, floorW, floorH))) return true;
  }
  return false;
}

function drawGridDs(ctx: CanvasRenderingContext2D, floor: SceneFloorV1, preset: SceneLayerPreset) {
  const { cellPx, offsetX, offsetY } = floor.grid;
  if (cellPx < 4) return;
  ctx.strokeStyle = preset.gridColor;
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

function drawAreaFill(
  ctx: CanvasRenderingContext2D,
  area: SceneAreaV1,
  preset: SceneLayerPreset,
  selected: boolean
) {
  if (area.polygon.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(area.polygon[0].x, area.polygon[0].y);
  for (let i = 1; i < area.polygon.length; i++) {
    ctx.lineTo(area.polygon[i].x, area.polygon[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = area.kind === "corridor" ? preset.corridorFill : preset.floorFill;
  ctx.fill();
  if (selected) {
    ctx.strokeStyle = "rgba(217, 119, 6, 0.85)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawWallHatchBand(
  ctx: CanvasRenderingContext2D,
  wall: SceneWallV1,
  preset: SceneLayerPreset,
  areas: SceneAreaV1[],
  floorW: number,
  floorH: number
) {
  const { x1, y1, x2, y2 } = wall;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  let nx = -uy;
  let ny = ux;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  if (isInsideAnyArea(mx + nx * 8, my + ny * 8, areas, floorW, floorH)) {
    nx = -nx;
    ny = -ny;
  }
  const depth = preset.hatchDepth;
  const pattern = getHatchPattern(ctx, preset);
  if (!pattern || depth <= 0) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 + nx * depth, y2 + ny * depth);
  ctx.lineTo(x1 + nx * depth, y1 + ny * depth);
  ctx.closePath();
  ctx.fillStyle = pattern;
  ctx.fill();
  ctx.restore();
}

function drawWallDs(
  ctx: CanvasRenderingContext2D,
  wall: SceneWallV1,
  preset: SceneLayerPreset,
  areas: SceneAreaV1[],
  floorW: number,
  floorH: number,
  selected: boolean
) {
  const { x1, y1, x2, y2, door } = wall;
  if (preset.hatchOutside) {
    drawWallHatchBand(ctx, wall, preset, areas, floorW, floorH);
  }
  ctx.strokeStyle = selected ? "#d97706" : preset.wallColor;
  ctx.lineWidth = selected ? preset.wallWidth + 2 : preset.wallWidth;
  ctx.lineCap = "square";

  const drawSeg = (ax: number, ay: number, bx: number, by: number) => {
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  };

  if (!door?.width) {
    drawSeg(x1, y1, x2, y2);
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
  if (gapStart > 0.5) drawSeg(x1, y1, x1 + ux * gapStart, y1 + uy * gapStart);
  if (len - gapEnd > 0.5) drawSeg(x1 + ux * gapEnd, y1 + uy * gapEnd, x2, y2);

  const doorX = x1 + ux * center;
  const doorY = y1 + uy * center;
  ctx.fillStyle = "#f8f6f0";
  ctx.strokeStyle = preset.wallColor;
  ctx.lineWidth = 2;
  const arc = Math.min(half, 20);
  ctx.beginPath();
  ctx.arc(doorX, doorY, arc, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function paintLayer(
  ctx: CanvasRenderingContext2D,
  floor: SceneFloorV1,
  layer: SceneLayerV1,
  options: DsPaintOptions
) {
  if (!layer.visible) return;
  const preset = sceneLayerPreset(layer.presetId);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0.05, layer.opacity));

  for (const area of layer.areas) {
    drawAreaFill(ctx, area, preset, area.id === options.selectedAreaId);
  }
  for (const wall of layer.walls) {
    drawWallDs(
      ctx,
      wall,
      preset,
      layer.areas,
      floor.width,
      floor.height,
      wall.id === options.selectedWallId
    );
  }
  ctx.restore();
}

export function paintSceneFloorDs(
  ctx: CanvasRenderingContext2D,
  floorInput: SceneFloorV1,
  options: DsPaintOptions = {}
) {
  const floor = normalizeSceneFloor(floorInput);
  const w = Math.max(1, floor.width);
  const h = Math.max(1, floor.height);
  const bgPreset = sceneLayerPreset(
    floor.layers.find((l) => l.id === floor.activeLayerId)?.presetId ?? "classic_hatching"
  );

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = bgPreset.background;
  ctx.fillRect(0, 0, w, h);
  drawGridDs(ctx, floor, bgPreset);

  const layers = [...floor.layers].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const layer of layers) paintLayer(ctx, floor, layer, options);

  for (const prop of floor.props ?? []) {
    drawScenePropSvg(ctx, prop, { selected: prop.id === options.selectedPropId });
  }
  for (const note of floor.gmNotes ?? []) {
    drawSceneGmNote(ctx, note, { selected: note.id === options.selectedGmNoteId });
  }

  if (options.draftRect) {
    const { x, y, w: rw, h: rh } = options.draftRect;
    ctx.strokeStyle = "rgba(20,20,20,0.75)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(x, y, rw, rh);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(248,246,240,0.35)";
    ctx.fillRect(x, y, rw, rh);
  }

  if (options.draftCorridor && options.draftCorridor.centerline.length > 0) {
    const { centerline, cursor, halfWidth } = options.draftCorridor;
    const preview = previewCorridorPolygon(centerline, cursor, halfWidth, centerline.length > 1);

    ctx.strokeStyle = "rgba(20,20,20,0.55)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(centerline[0].x, centerline[0].y);
    for (let i = 1; i < centerline.length; i++) {
      ctx.lineTo(centerline[i].x, centerline[i].y);
    }
    if (cursor) ctx.lineTo(cursor.x, cursor.y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (preview && preview.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(preview[0].x, preview[0].y);
      for (let i = 1; i < preview.length; i++) {
        ctx.lineTo(preview[i].x, preview[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(248,246,240,0.4)";
      ctx.fill();
      ctx.strokeStyle = "rgba(20,20,20,0.75)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    for (const p of centerline) {
      ctx.fillStyle = "#141414";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
