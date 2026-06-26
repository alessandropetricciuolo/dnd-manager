import type { ScenePropV1 } from "../scene-schema/types";
import { scenePropCatalogEntry, type ScenePropKindV1 } from "../scene-schema/props-catalog";

function drawPropShape(
  ctx: CanvasRenderingContext2D,
  kind: ScenePropKindV1,
  size: number,
  selected: boolean
) {
  const stroke = selected ? "rgba(251, 191, 36, 1)" : "rgba(231, 229, 228, 0.9)";
  const fill = selected ? "rgba(180, 83, 9, 0.45)" : "rgba(120, 113, 108, 0.55)";
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.lineWidth = selected ? 2.5 : 1.5;

  const h = size * 0.5;
  const w = size * 0.5;

  switch (kind) {
    case "barrel":
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.85, h * 0.95, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "crate":
      ctx.fillRect(-w, -h, w * 2, h * 2);
      ctx.strokeRect(-w, -h, w * 2, h * 2);
      ctx.beginPath();
      ctx.moveTo(-w, 0);
      ctx.lineTo(w, 0);
      ctx.moveTo(0, -h);
      ctx.lineTo(0, h);
      ctx.stroke();
      break;
    case "table":
      ctx.fillRect(-w * 1.1, -h * 0.35, w * 2.2, h * 0.7);
      ctx.strokeRect(-w * 1.1, -h * 0.35, w * 2.2, h * 0.7);
      for (const ox of [-w * 0.75, w * 0.75]) {
        ctx.fillRect(ox - 4, h * 0.35, 8, h * 0.9);
      }
      break;
    case "chair":
      ctx.fillRect(-w * 0.55, -h * 0.45, w * 1.1, h * 0.55);
      ctx.strokeRect(-w * 0.55, -h * 0.45, w * 1.1, h * 0.55);
      ctx.fillRect(-w * 0.45, -h * 1.1, w * 0.9, h * 0.55);
      ctx.strokeRect(-w * 0.45, -h * 1.1, w * 0.9, h * 0.55);
      break;
    case "torch":
      ctx.fillStyle = selected ? "rgba(251, 191, 36, 0.9)" : "rgba(251, 146, 60, 0.85)";
      ctx.beginPath();
      ctx.moveTo(0, -h);
      ctx.lineTo(w * 0.45, h * 0.2);
      ctx.lineTo(-w * 0.45, h * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.2);
      ctx.lineTo(0, h);
      ctx.stroke();
      break;
    case "pillar":
      ctx.fillRect(-w * 0.45, -h, w * 0.9, h * 2);
      ctx.strokeRect(-w * 0.45, -h, w * 0.9, h * 2);
      break;
    case "statue":
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.55, w * 0.55, h * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-w * 0.35, -h * 0.1, w * 0.7, h * 1.1);
      ctx.strokeRect(-w * 0.35, -h * 0.1, w * 0.7, h * 1.1);
      break;
    case "boulder":
      ctx.beginPath();
      ctx.ellipse(0, 0, w, h * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "campfire":
      ctx.fillStyle = selected ? "rgba(251, 191, 36, 0.85)" : "rgba(234, 88, 12, 0.8)";
      for (const a of [-0.4, 0, 0.35]) {
        ctx.beginPath();
        ctx.moveTo(0, h * 0.5);
        ctx.quadraticCurveTo(w * (0.4 + a), -h * 0.2, 0, -h);
        ctx.quadraticCurveTo(-w * (0.4 - a), -h * 0.2, 0, h * 0.5);
        ctx.fill();
      }
      ctx.strokeStyle = stroke;
      ctx.stroke();
      break;
    case "altar":
      ctx.fillRect(-w, -h * 0.25, w * 2, h * 0.5);
      ctx.strokeRect(-w, -h * 0.25, w * 2, h * 0.5);
      ctx.fillRect(-w * 0.75, h * 0.25, w * 1.5, h * 0.75);
      ctx.strokeRect(-w * 0.75, h * 0.25, w * 1.5, h * 0.75);
      break;
    default:
      ctx.fillRect(-w, -h, w * 2, h * 2);
      ctx.strokeRect(-w, -h, w * 2, h * 2);
  }
}

export function drawSceneProp(
  ctx: CanvasRenderingContext2D,
  prop: ScenePropV1,
  options?: { selected?: boolean; forRaster?: boolean }
) {
  const entry = scenePropCatalogEntry(prop.kind);
  const scale = prop.scale ?? 1;
  const size = entry.baseSize * scale;
  ctx.save();
  ctx.translate(prop.x, prop.y);
  ctx.rotate(((prop.rotation ?? 0) * Math.PI) / 180);
  drawPropShape(ctx, prop.kind, size, Boolean(options?.selected && !options?.forRaster));
  ctx.restore();
}

export function drawSceneGmNote(
  ctx: CanvasRenderingContext2D,
  note: { x: number; y: number; text: string; width?: number },
  options?: { selected?: boolean }
) {
  const maxW = note.width ?? 180;
  const lines = note.text.trim() ? note.text.trim().split(/\n/).slice(0, 6) : ["(nota vuota)"];
  const lineH = 14;
  const pad = 6;
  const boxH = lines.length * lineH + pad * 2;
  const boxW = maxW;

  ctx.save();
  ctx.translate(note.x, note.y);
  ctx.fillStyle = options?.selected ? "rgba(251, 191, 36, 0.22)" : "rgba(59, 130, 246, 0.18)";
  ctx.strokeStyle = options?.selected ? "rgba(251, 191, 36, 0.95)" : "rgba(96, 165, 250, 0.85)";
  ctx.lineWidth = options?.selected ? 2 : 1.5;
  ctx.fillRect(0, 0, boxW, boxH);
  ctx.strokeRect(0, 0, boxW, boxH);
  ctx.fillStyle = "rgba(226, 232, 240, 0.95)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textBaseline = "top";
  lines.forEach((line, i) => {
    const clipped = line.length > 28 ? `${line.slice(0, 27)}…` : line;
    ctx.fillText(clipped, pad, pad + i * lineH);
  });
  ctx.restore();
}
