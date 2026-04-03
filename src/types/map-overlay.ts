/** Preset simboli (allineati a Lucide nel layer di rendering). */
export const MAP_OVERLAY_SYMBOL_IDS = [
  "star",
  "flame",
  "skull",
  "castle",
  "tent",
  "swords",
  "door-open",
  "key",
  "anchor",
  "mountain",
] as const;

export type MapOverlaySymbolId = (typeof MAP_OVERLAY_SYMBOL_IDS)[number];

export type MapOverlayItemBase = {
  id: string;
  x: number;
  y: number;
  rotation?: number;
  scale?: number;
};

export type MapOverlayTextItem = MapOverlayItemBase & {
  kind: "text";
  text: string;
  /** ~0.015–0.06 = frazione dell’altezza contenitore per font-size (clamp lato UI). */
  fontRel: number;
  color: string;
};

export type MapOverlaySymbolItem = MapOverlayItemBase & {
  kind: "symbol";
  symbolId: MapOverlaySymbolId;
  color?: string;
};

export type MapOverlayItem = MapOverlayTextItem | MapOverlaySymbolItem;
