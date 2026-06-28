import type { NormPoint } from "@/lib/map-core/coordinates";
import { parsePolygonJson } from "@/lib/map-core/coordinates";
import { planSceneFowRegionSync, type ExistingFowRegion, type FowRegionUpsert } from "@/lib/map-core/fog";
import { floorAreasToFowRegions } from "@/lib/map-core/scene-to-fow";
import {
  assertSceneDocumentV1,
  createEmptySceneDocument,
  type SceneDocumentV1,
} from "@/lib/map-core/scene-schema";

export { createEmptySceneDocument, assertSceneDocumentV1 };
export type { SceneDocumentV1 };

/** PNG 1×1 grigio chiaro — segnaposto finché non arriva l'export dal Scene Editor. */
const PLACEHOLDER_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGN4/eIBAAV1ArRqj4a2AAAAAElFTkSuQmCC";

export function getSceneMapPlaceholderPngBuffer(): Buffer {
  return Buffer.from(PLACEHOLDER_PNG_BASE64, "base64");
}

export function parseExistingFowRegionRow(row: {
  id: string;
  source_area_id?: string | null;
  polygon: unknown;
  is_revealed: boolean;
  sort_order: number;
}): ExistingFowRegion {
  return {
    id: row.id,
    sourceAreaId: row.source_area_id ?? null,
    polygon: parsePolygonJson(row.polygon),
    isRevealed: row.is_revealed,
    sortOrder: row.sort_order,
  };
}

export function buildFowUpsertsForFloor(floor: SceneDocumentV1["floors"][number]): FowRegionUpsert[] {
  return floorAreasToFowRegions(floor).map((r) => ({
    sourceAreaId: r.sourceAreaId,
    polygon: r.polygon,
    sortOrder: r.sortOrder,
  }));
}

export function planFloorFowSync(
  floor: SceneDocumentV1["floors"][number],
  existing: ExistingFowRegion[]
) {
  return planSceneFowRegionSync(buildFowUpsertsForFloor(floor), existing);
}

export function gridMetadataFromFloor(floor: SceneDocumentV1["floors"][number]) {
  const cellsW = Math.max(1, Math.round(floor.width / floor.grid.cellPx));
  const cellsH = Math.max(1, Math.round(floor.height / floor.grid.cellPx));
  return {
    grid_cells_w: cellsW,
    grid_cells_h: cellsH,
    grid_offset_x_cells: Math.round(floor.grid.offsetX / floor.grid.cellPx),
    grid_offset_y_cells: Math.round(floor.grid.offsetY / floor.grid.cellPx),
    grid_kind: "square" as const,
    grid_source_cell_px: floor.grid.cellPx,
  };
}

export function documentToPersistPayload(document: SceneDocumentV1) {
  const validated = assertSceneDocumentV1(document);
  return {
    name: validated.name,
    linked_mission_id: validated.linkedMissionId,
    document: validated as unknown as Record<string, unknown>,
    document_version: validated.version,
    updated_at: new Date().toISOString(),
  };
}

export function polygonsEqualForTest(a: NormPoint[], b: NormPoint[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((p, i) => Math.abs(p.x - b[i].x) < 1e-6 && Math.abs(p.y - b[i].y) < 1e-6);
}
