import { generateWallsFromAreas } from "../scene-editor/auto-walls";
import { normalizeSceneFloor } from "./normalize-floor";
import type { SceneDocumentV1 } from "./types";

function newEntityId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Clona un documento scena con nuovi id (piani, layer, aree, muri, props, note).
 * Le regioni FoW collegate saranno ricreate con reveal reset.
 */
export function cloneSceneDocument(
  source: SceneDocumentV1,
  options?: { name?: string; linkedMissionId?: string | null }
): SceneDocumentV1 {
  const name =
    options?.name?.trim() ||
    (source.name.trim() ? `${source.name.trim()} (copia)` : "Scena (copia)");

  return {
    version: source.version,
    name,
    linkedMissionId:
      options?.linkedMissionId !== undefined ? options.linkedMissionId : source.linkedMissionId,
    floors: source.floors.map((floor) => {
      const floorId = newEntityId();
      const base = normalizeSceneFloor({ ...floor, id: floorId });
      const layers = base.layers.map((layer) => {
        const layerId = newEntityId();
        const areas = layer.areas.map((a) => ({ ...a, id: newEntityId() }));
        const doorHints = layer.walls.map((w) => ({
          id: w.id,
          x1: w.x1,
          y1: w.y1,
          x2: w.x2,
          y2: w.y2,
          door: w.door,
        }));
        return {
          ...layer,
          id: layerId,
          areas,
          walls: generateWallsFromAreas(areas, doorHints, { preserveWallIds: false }),
        };
      });
      const activeIdx = base.layers.findIndex((l) => l.id === base.activeLayerId);
      const activeLayerId = layers[activeIdx >= 0 ? activeIdx : 0]?.id ?? layers[0]?.id ?? newEntityId();
      const areas = layers.flatMap((l) => l.areas);
      const walls = layers.flatMap((l) => l.walls);
      return {
        ...base,
        id: floorId,
        layers,
        activeLayerId,
        areas,
        walls,
        props: (floor.props ?? []).map((p) => ({ ...p, id: newEntityId() })),
        gmNotes: (floor.gmNotes ?? []).map((n) => ({ ...n, id: newEntityId() })),
      };
    }),
  };
}
