import type { Layout } from "react-grid-layout";
import type { GmLayoutItem } from "./types";

/** Grid callbacks can report unchanged geometry. Preserve references in that case. */
export function applyGridLayout(items: GmLayoutItem[], layout: Layout): GmLayoutItem[] {
  const byId = new Map(layout.map((item) => [item.i, item]));
  let changed = false;
  const nextItems = items.map((item) => {
    const next = byId.get(item.i);
    if (!next || (item.x === next.x && item.y === next.y && item.w === next.w && item.h === next.h)) {
      return item;
    }
    changed = true;
    return { ...item, x: next.x, y: next.y, w: next.w, h: next.h };
  });
  return changed ? nextItems : items;
}
