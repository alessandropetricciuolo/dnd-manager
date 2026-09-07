import type { SceneFloor, SceneGrid, TacticalScene } from "./types";

export const SUPPORTED_SCENE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type SceneImageType = (typeof SUPPORTED_SCENE_IMAGE_TYPES)[number];

/** Shared adapter boundary for the legacy durable image pipeline. */
export function validateSceneImage(
  type: string,
  bytes: number,
  maxBytes = 4 * 1024 * 1024,
) {
  if (!SUPPORTED_SCENE_IMAGE_TYPES.includes(type as SceneImageType))
    return {
      ok: false as const,
      error: "Formato non supportato (JPG, PNG, WebP, GIF).",
    };
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > maxBytes)
    return {
      ok: false as const,
      error: "File immagine non valido o troppo grande.",
    };
  return { ok: true as const };
}

export function assertPublishableScene(scene: TacticalScene): void {
  if (!scene.floors.length)
    throw new Error("Aggiungi almeno un piano prima di pubblicare.");
  for (const floor of scene.floors) {
    if (
      floor.asset.storageKey.startsWith("local://") ||
      floor.asset.mimeType === "image/svg+xml"
    )
      throw new Error(
        "Non puoi pubblicare una scena senza una mappa caricata.",
      );
  }
}

export function renameScene(scene: TacticalScene, name: string): TacticalScene {
  const value = name.trim();
  if (!value) throw new Error("Il nome della scena è obbligatorio.");
  return { ...scene, name: value };
}
export function linkSceneMission(
  scene: TacticalScene,
  missionId: string | null,
): TacticalScene {
  return { ...scene, linkedMissionId: missionId?.trim() || null };
}
export function addSceneFloor(
  scene: TacticalScene,
  floor: SceneFloor,
): TacticalScene {
  if (scene.floors.some((item) => item.id === floor.id))
    throw new Error("Piano già presente.");
  return {
    ...scene,
    floors: [...scene.floors, { ...floor, sortOrder: scene.floors.length }],
  };
}
export function reorderSceneFloors(
  scene: TacticalScene,
  orderedIds: string[],
): TacticalScene {
  if (
    orderedIds.length !== scene.floors.length ||
    new Set(orderedIds).size !== orderedIds.length ||
    orderedIds.some((id) => !scene.floors.some((floor) => floor.id === id))
  )
    throw new Error("Ordine piani non valido.");
  return {
    ...scene,
    floors: orderedIds.map((id, sortOrder) => ({
      ...scene.floors.find((floor) => floor.id === id)!,
      sortOrder,
    })),
  };
}
export function removeSceneFloor(
  scene: TacticalScene,
  floorId: string,
): TacticalScene {
  if (scene.floors.length <= 1)
    throw new Error("La scena deve conservare almeno un piano.");
  if (!scene.floors.some((floor) => floor.id === floorId))
    throw new Error("Piano inesistente.");
  const floors = scene.floors
    .filter((floor) => floor.id !== floorId)
    .map((floor, sortOrder) => ({ ...floor, sortOrder }));
  const removedRegionIds = new Set(
    scene.fow.regions
      .filter((region) => region.floorId === floorId)
      .map((region) => region.id),
  );
  return {
    ...scene,
    floors,
    fow: {
      ...scene.fow,
      regions: scene.fow.regions.filter((region) => region.floorId !== floorId),
      patches: scene.fow.patches.filter(
        (patch) => !removedRegionIds.has(patch.regionId),
      ),
    },
  };
}
export function updateSceneFloorGrid(
  scene: TacticalScene,
  floorId: string,
  grid: SceneGrid | undefined,
): TacticalScene {
  return {
    ...scene,
    floors: scene.floors.map((floor) =>
      floor.id === floorId ? { ...floor, grid } : floor,
    ),
  };
}
