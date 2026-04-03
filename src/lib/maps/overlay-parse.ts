import {
  MAP_OVERLAY_SYMBOL_IDS,
  type MapOverlayItem,
  type MapOverlaySymbolId,
} from "@/types/map-overlay";

const MAX_ITEMS = 400;
const MAX_TEXT = 500;

function isSymbolId(v: unknown): v is MapOverlaySymbolId {
  return typeof v === "string" && (MAP_OVERLAY_SYMBOL_IDS as readonly string[]).includes(v);
}

/** Valida e normalizza JSON da DB → array item. */
export function parseMapOverlayItems(raw: unknown): MapOverlayItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MapOverlayItem[] = [];
  for (const row of raw.slice(0, MAX_ITEMS)) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id.length <= 80 ? o.id : "";
    const x = typeof o.x === "number" && Number.isFinite(o.x) ? Math.min(1, Math.max(0, o.x)) : null;
    const y = typeof o.y === "number" && Number.isFinite(o.y) ? Math.min(1, Math.max(0, o.y)) : null;
    if (!id || x == null || y == null) continue;
    const rotation =
      typeof o.rotation === "number" && Number.isFinite(o.rotation)
        ? Math.min(360, Math.max(-360, o.rotation))
        : undefined;
    const scale =
      typeof o.scale === "number" && Number.isFinite(o.scale)
        ? Math.min(4, Math.max(0.25, o.scale))
        : undefined;

    if (o.kind === "text") {
      const text = typeof o.text === "string" ? o.text.slice(0, MAX_TEXT) : "";
      if (!text.trim()) continue;
      const fontRel =
        typeof o.fontRel === "number" && Number.isFinite(o.fontRel)
          ? Math.min(0.12, Math.max(0.01, o.fontRel))
          : 0.028;
      const color =
        typeof o.color === "string" && /^#[0-9A-Fa-f]{3,8}$/.test(o.color) ? o.color : "#f5e6c8";
      out.push({ kind: "text", id, x, y, text, fontRel, color, rotation, scale });
      continue;
    }
    if (o.kind === "symbol" && isSymbolId(o.symbolId)) {
      const color =
        typeof o.color === "string" && /^#[0-9A-Fa-f]{3,8}$/.test(o.color) ? o.color : "#e8c97a";
      out.push({ kind: "symbol", id, x, y, symbolId: o.symbolId, color, rotation, scale });
    }
  }
  return out;
}
