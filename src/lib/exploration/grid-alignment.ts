/**
 * Intrinsic pixels per printed grid cell on the map image, for aligning the overlay
 * to the artwork. Prefers explicit width/height in cells (Roll20-style); falls back
 * to legacy `grid_source_cell_px` from the old 3-point calibration.
 */
export function resolveGridSourceCellPx(params: {
  naturalW: number;
  naturalH: number;
  gridCellsW: number | null | undefined;
  gridCellsH: number | null | undefined;
  legacyGridSourceCellPx: number | null | undefined;
}): number | null {
  const { naturalW, naturalH, gridCellsW, gridCellsH, legacyGridSourceCellPx } = params;
  if (naturalW <= 0 || naturalH <= 0) {
    return legacyGridSourceCellPx != null && legacyGridSourceCellPx > 0 ? legacyGridSourceCellPx : null;
  }
  const cw = gridCellsW != null ? Number(gridCellsW) : NaN;
  const ch = gridCellsH != null ? Number(gridCellsH) : NaN;
  if (Number.isFinite(cw) && cw > 0 && Number.isFinite(ch) && ch > 0) {
    return (naturalW / cw + naturalH / ch) / 2;
  }
  if (legacyGridSourceCellPx != null && legacyGridSourceCellPx > 0) {
    return legacyGridSourceCellPx;
  }
  return null;
}
