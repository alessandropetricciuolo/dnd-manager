import type { NormPoint } from "../coordinates";
import { intrinsicNormToSvgUserUnits } from "../coordinates";

export type FowRegionViewModel = {
  id: string;
  polygon: NormPoint[];
  is_revealed: boolean;
};

export { computeSquareGridOverlay, type SquareGridOverlayData, type SquareGridOverlayInput } from "./grid";

export function normPointToSvgUserUnits(
  p: NormPoint,
  elW: number,
  elH: number,
  naturalW: number,
  naturalH: number
): [number, number] {
  if (naturalW > 0 && naturalH > 0 && elW > 0 && elH > 0) {
    return intrinsicNormToSvgUserUnits(p.x, p.y, elW, elH, naturalW, naturalH);
  }
  return [p.x * 100, p.y * 100];
}

export function revealedPolygonsFromRegions(regions: FowRegionViewModel[]): NormPoint[][] {
  return regions.filter((r) => r.is_revealed).map((r) => r.polygon);
}

export { sceneGmNotesToOverlay, type GmNoteOverlayVm } from "./gm-notes";
