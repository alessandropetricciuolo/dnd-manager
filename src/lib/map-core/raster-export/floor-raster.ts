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

export async function exportFloorRasterBlob(floor: SceneFloorV1): Promise<Blob> {
  const canvas = renderFloorToCanvas(floor);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export raster fallito."))),
      "image/webp",
      0.9
    );
  });
}
