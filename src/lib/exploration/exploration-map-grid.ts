import { resolveGridSourceCellPx } from "@/lib/exploration/grid-alignment";
import type { ExplorationMapRow } from "@/app/campaigns/exploration-map-actions";

export type ExplorationMapGridOverlayProps = {
  showGrid: boolean;
  gridCellSourcePxX: number | null;
  gridOffsetXCells: number;
  gridOffsetYCells: number;
};

export type ExplorationMapGridInput = Pick<
  ExplorationMapRow,
  | "grid_cells_w"
  | "grid_cells_h"
  | "grid_source_cell_px"
  | "grid_offset_x_cells"
  | "grid_offset_y_cells"
  | "grid_kind"
  | "source_type"
>;

/**
 * Props griglia per ExplorationMapStage.
 * Con `naturalW/H` > 0 usa celle Roll20; altrimenti legacy `grid_source_cell_px`.
 */
export function resolveExplorationMapGridOverlay(
  map: ExplorationMapGridInput,
  naturalW = 0,
  naturalH = 0,
  options?: { enabled?: boolean }
): ExplorationMapGridOverlayProps {
  const enabled = options?.enabled !== false;
  const sourcePx = resolveGridSourceCellPx({
    naturalW,
    naturalH,
    gridCellsW: map.grid_cells_w,
    gridCellsH: map.grid_cells_h,
    legacyGridSourceCellPx: map.grid_source_cell_px,
  });
  const canRender = enabled && map.grid_kind !== "hex" && sourcePx != null && sourcePx > 2;
  return {
    showGrid: canRender,
    gridCellSourcePxX: sourcePx,
    gridOffsetXCells: map.grid_offset_x_cells ?? 0,
    gridOffsetYCells: map.grid_offset_y_cells ?? 0,
  };
}

export function mapSourceLabel(sourceType: ExplorationMapRow["source_type"]): string {
  return sourceType === "generated_scene" ? "Generata" : "Importata";
}

export function hasGridCalibration(map: ExplorationMapGridInput): boolean {
  return Boolean(
    (map.grid_cells_w != null && map.grid_cells_w > 0) ||
      (map.grid_source_cell_px != null && map.grid_source_cell_px > 0)
  );
}
