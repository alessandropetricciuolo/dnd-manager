import type { ScenePropKindV1 } from "../scene-schema/props-catalog";
import type { ScenePropV1 } from "../scene-schema/types";
import { scenePropCatalogEntry } from "../scene-schema/props-catalog";
import { drawSceneGmNote } from "./draw-props";

export { drawSceneGmNote };

function drawPropPath(
  ctx: CanvasRenderingContext2D,
  kind: ScenePropKindV1,
  selected: boolean
) {
  ctx.fillStyle = selected ? "#d97706" : "#141414";
  ctx.strokeStyle = "#141414";
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";

  switch (kind) {
    case "crate":
      ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeRect(-10, -10, 20, 20);
      break;
    case "star":
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? 14 : 6;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case "stairs":
      ctx.fillRect(-16, -8, 32, 6);
      ctx.fillRect(-12, -2, 24, 6);
      ctx.fillRect(-8, 4, 16, 6);
      break;
    case "altar":
      ctx.fillRect(-18, -4, 36, 8);
      ctx.fillRect(-12, 4, 24, 10);
      break;
    case "coffin":
      ctx.beginPath();
      ctx.moveTo(-10, -16);
      ctx.lineTo(10, -16);
      ctx.lineTo(12, 16);
      ctx.lineTo(-12, 16);
      ctx.closePath();
      ctx.fill();
      ctx.strokeRect(-8, -12, 16, 4);
      break;
    case "torch":
      ctx.fillRect(-2, 0, 4, 18);
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(8, 2);
      ctx.lineTo(-8, 2);
      ctx.closePath();
      ctx.fill();
      break;
    case "table":
      ctx.fillRect(-20, -6, 40, 8);
      ctx.fillRect(-16, 2, 6, 14);
      ctx.fillRect(10, 2, 6, 14);
      break;
    case "chair":
      ctx.fillRect(-10, 0, 20, 6);
      ctx.fillRect(-8, -14, 16, 14);
      ctx.fillRect(-10, 6, 4, 12);
      ctx.fillRect(6, 6, 4, 12);
      break;
    case "pillar":
      ctx.fillRect(-8, -20, 16, 40);
      ctx.strokeRect(-10, -22, 20, 4);
      ctx.strokeRect(-10, 18, 20, 4);
      break;
    case "statue":
      ctx.beginPath();
      ctx.arc(0, -14, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-7, -6, 14, 22);
      break;
    case "boulder":
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "campfire":
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.lineTo(-10, -4);
      ctx.lineTo(0, -14);
      ctx.lineTo(10, -4);
      ctx.closePath();
      ctx.fill();
      break;
    case "barrel":
    default:
      ctx.beginPath();
      ctx.ellipse(0, -12, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-12, -12, 24, 24);
      ctx.beginPath();
      ctx.ellipse(0, 12, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
  }
}

export function drawScenePropSvg(
  ctx: CanvasRenderingContext2D,
  prop: ScenePropV1,
  options?: { selected?: boolean }
) {
  const entry = scenePropCatalogEntry(prop.kind);
  const scale = (prop.scale ?? 1) * (entry.baseSize / 48);
  ctx.save();
  ctx.translate(prop.x, prop.y);
  if (prop.rotation) ctx.rotate((prop.rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  drawPropPath(ctx, prop.kind, Boolean(options?.selected));
  ctx.restore();
}
