import type { SceneFloorV1 } from "../scene-schema";
import { normalizeSceneFloor } from "../scene-schema/normalize-floor";
import { paintSceneFloorDs } from "../scene-editor/ds-renderer";

export function renderFloorToCanvas(floor: SceneFloorV1): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const normalized = normalizeSceneFloor(floor);
  canvas.width = Math.max(1, Math.floor(normalized.width));
  canvas.height = Math.max(1, Math.floor(normalized.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  paintSceneFloorDs(ctx, normalized);
  return canvas;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

export async function exportFloorRasterBlob(floor: SceneFloorV1): Promise<Blob> {
  const canvas = renderFloorToCanvas(floor);
  const png = await canvasToBlob(canvas, "image/png");
  if (png) return png;
  const webp = await canvasToBlob(canvas, "image/webp", 0.9);
  if (webp) return webp;
  throw new Error("Export raster fallito.");
}
