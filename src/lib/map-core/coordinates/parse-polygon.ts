import type { NormPoint } from "./types";

export function parsePolygonJson(raw: unknown): NormPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: NormPoint[] = [];
  for (const p of raw) {
    if (p && typeof p === "object" && "x" in p && "y" in p) {
      const x = Number((p as NormPoint).x);
      const y = Number((p as NormPoint).y);
      if (Number.isFinite(x) && Number.isFinite(y)) out.push({ x, y });
    }
  }
  return out;
}
