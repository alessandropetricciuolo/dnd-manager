import type { NormPoint } from "./types";

export function clampNormPoint(p: NormPoint): NormPoint {
  return {
    x: Math.min(1, Math.max(0, p.x)),
    y: Math.min(1, Math.max(0, p.y)),
  };
}
