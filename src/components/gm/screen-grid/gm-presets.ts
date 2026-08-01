import type { GmLayoutItem, GmWorkspaceMode } from "./types";

/** Preset Durante sessione ≈ layout Long attuale (initiative+notes | time+missions+XP). */
export function getSessionPreset(): GmLayoutItem[] {
  return [
    { i: "preset-initiative", type: "initiative", x: 0, y: 0, w: 6, h: 10, minW: 4, minH: 6 },
    { i: "preset-notes", type: "notes", x: 0, y: 10, w: 6, h: 6, minW: 3, minH: 4 },
    { i: "preset-time", type: "time", x: 6, y: 0, w: 6, h: 3, minW: 3, minH: 2 },
    { i: "preset-missions", type: "missions", x: 6, y: 3, w: 6, h: 5, minW: 3, minH: 3 },
    { i: "preset-playersXp", type: "playersXp", x: 6, y: 8, w: 6, h: 8, minW: 3, minH: 4 },
  ];
}

/** Preset Chiusura ≈ economy + time + calendar. */
export function getClosurePreset(): GmLayoutItem[] {
  return [
    { i: "preset-economy", type: "economy", x: 0, y: 0, w: 12, h: 7, minW: 4, minH: 4 },
    { i: "preset-time", type: "time", x: 0, y: 7, w: 12, h: 3, minW: 4, minH: 2 },
    { i: "preset-calendar", type: "calendar", x: 0, y: 10, w: 12, h: 6, minW: 4, minH: 4 },
  ];
}

/** Preset Legacy ≈ initiative + notes + PG tracker. */
export function getLegacyPreset(): GmLayoutItem[] {
  return [
    { i: "preset-initiative", type: "initiative", x: 0, y: 0, w: 6, h: 14, minW: 4, minH: 6 },
    { i: "preset-notes", type: "notes", x: 6, y: 0, w: 4, h: 14, minW: 3, minH: 4 },
    { i: "preset-playersXp", type: "playersXp", x: 10, y: 0, w: 2, h: 14, minW: 2, minH: 4 },
  ];
}

export function getPresetForMode(mode: GmWorkspaceMode): GmLayoutItem[] {
  return mode === "closure" ? getClosurePreset() : getSessionPreset();
}
