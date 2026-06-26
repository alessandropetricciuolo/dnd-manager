import type { SceneDocumentV1 } from "./types";

function newEntityId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Clona un documento scena con nuovi id (piani, aree, muri, props, note).
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
      return {
        ...floor,
        id: floorId,
        areas: floor.areas.map((a) => ({ ...a, id: newEntityId() })),
        walls: floor.walls.map((w) => ({ ...w, id: newEntityId() })),
        props: (floor.props ?? []).map((p) => ({ ...p, id: newEntityId() })),
        gmNotes: (floor.gmNotes ?? []).map((n) => ({ ...n, id: newEntityId() })),
      };
    }),
  };
}
