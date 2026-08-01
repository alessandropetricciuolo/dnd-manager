export const GM_PANEL_TYPES = [
  "initiative",
  "notes",
  "playersXp",
  "time",
  "calendar",
  "economy",
  "missions",
  "maps",
  "fow",
  "gallery",
  "whispers",
  "audio",
  "wikiEntity",
  "monsterStat",
  "rulesLookup",
] as const;

export type GmPanelType = (typeof GM_PANEL_TYPES)[number];

export type GmWorkspaceMode = "session" | "closure";

export type GmLayoutItem = {
  i: string;
  type: GmPanelType;
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
  props?: Record<string, unknown>;
  minW?: number;
  minH?: number;
};

export type GmStoredLayout = {
  /** v2 = preset densi / layout persistito dopo densificazione UI */
  version: 2;
  mode: GmWorkspaceMode;
  items: GmLayoutItem[];
};

export type GmPanelDefaultSize = {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

export function isGmPanelType(value: unknown): value is GmPanelType {
  return typeof value === "string" && (GM_PANEL_TYPES as readonly string[]).includes(value);
}
