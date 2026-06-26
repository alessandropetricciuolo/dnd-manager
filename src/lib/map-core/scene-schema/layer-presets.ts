/** Preset stile layer (ispirato a Dungeon Scrawl). */

export const SCENE_LAYER_PRESET_IDS = [
  "classic_hatching",
  "old_school",
  "rough_cavern",
  "clean_stone",
] as const;

export type SceneLayerPresetId = (typeof SCENE_LAYER_PRESET_IDS)[number];

export type SceneLayerPreset = {
  id: SceneLayerPresetId;
  label: string;
  background: string;
  gridColor: string;
  floorFill: string;
  corridorFill: string;
  wallColor: string;
  wallWidth: number;
  hatchOutside: boolean;
  hatchColor: string;
  hatchSpacing: number;
  hatchDepth: number;
};

export const SCENE_LAYER_PRESETS: Record<SceneLayerPresetId, SceneLayerPreset> = {
  classic_hatching: {
    id: "classic_hatching",
    label: "Classic Hatching",
    background: "#ebe8e0",
    gridColor: "rgba(0,0,0,0.12)",
    floorFill: "#f8f6f0",
    corridorFill: "#f0ede6",
    wallColor: "#141414",
    wallWidth: 7,
    hatchOutside: true,
    hatchColor: "#2a2a2a",
    hatchSpacing: 6,
    hatchDepth: 14,
  },
  old_school: {
    id: "old_school",
    label: "Old School Module",
    background: "#e5e0d4",
    gridColor: "rgba(0,0,0,0.1)",
    floorFill: "#faf8f2",
    corridorFill: "#ede9df",
    wallColor: "#0f0f0f",
    wallWidth: 8,
    hatchOutside: true,
    hatchColor: "#1f1f1f",
    hatchSpacing: 5,
    hatchDepth: 16,
  },
  rough_cavern: {
    id: "rough_cavern",
    label: "Rough Cavern",
    background: "#d8d2c8",
    gridColor: "rgba(0,0,0,0.08)",
    floorFill: "#e8e4dc",
    corridorFill: "#ddd8ce",
    wallColor: "#1a1816",
    wallWidth: 9,
    hatchOutside: true,
    hatchColor: "#33302c",
    hatchSpacing: 7,
    hatchDepth: 18,
  },
  clean_stone: {
    id: "clean_stone",
    label: "Clean Stone",
    background: "#f2f2f2",
    gridColor: "rgba(0,0,0,0.14)",
    floorFill: "#ffffff",
    corridorFill: "#f5f5f5",
    wallColor: "#222222",
    wallWidth: 5,
    hatchOutside: false,
    hatchColor: "#444444",
    hatchSpacing: 8,
    hatchDepth: 0,
  },
};

export function isSceneLayerPresetId(value: string): value is SceneLayerPresetId {
  return (SCENE_LAYER_PRESET_IDS as readonly string[]).includes(value);
}

export function sceneLayerPreset(id: SceneLayerPresetId): SceneLayerPreset {
  return SCENE_LAYER_PRESETS[id];
}
