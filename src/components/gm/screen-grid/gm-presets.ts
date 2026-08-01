import type { GmLayoutItem, GmWorkspaceMode } from "./types";

/**
 * Preset densi: pannelli affiancati, poca altezza morta.
 * Griglia 12 colonne; con rowHeight ~22 e margin 4 ≈ riempie un 1080p.
 */

/** Durante sessione: initiative | notes+time+missions | PG/XP */
export function getSessionPreset(): GmLayoutItem[] {
  return [
    { i: "preset-initiative", type: "initiative", x: 0, y: 0, w: 5, h: 28, minW: 3, minH: 8 },
    { i: "preset-notes", type: "notes", x: 5, y: 0, w: 4, h: 12, minW: 2, minH: 4 },
    { i: "preset-time", type: "time", x: 5, y: 12, w: 4, h: 5, minW: 2, minH: 3 },
    { i: "preset-missions", type: "missions", x: 5, y: 17, w: 4, h: 11, minW: 2, minH: 4 },
    { i: "preset-playersXp", type: "playersXp", x: 9, y: 0, w: 3, h: 28, minW: 2, minH: 8 },
  ];
}

/** Chiusura: economy | time+calendar affiancati */
export function getClosurePreset(): GmLayoutItem[] {
  return [
    { i: "preset-economy", type: "economy", x: 0, y: 0, w: 6, h: 28, minW: 3, minH: 8 },
    { i: "preset-time", type: "time", x: 6, y: 0, w: 6, h: 6, minW: 3, minH: 3 },
    { i: "preset-calendar", type: "calendar", x: 6, y: 6, w: 6, h: 22, minW: 3, minH: 6 },
  ];
}

/** Legacy: initiative | notes | PG affiancati a tutta altezza */
export function getLegacyPreset(): GmLayoutItem[] {
  return [
    { i: "preset-initiative", type: "initiative", x: 0, y: 0, w: 5, h: 28, minW: 3, minH: 8 },
    { i: "preset-notes", type: "notes", x: 5, y: 0, w: 4, h: 28, minW: 2, minH: 6 },
    { i: "preset-playersXp", type: "playersXp", x: 9, y: 0, w: 3, h: 28, minW: 2, minH: 6 },
  ];
}

export function getPresetForMode(mode: GmWorkspaceMode): GmLayoutItem[] {
  return mode === "closure" ? getClosurePreset() : getSessionPreset();
}
