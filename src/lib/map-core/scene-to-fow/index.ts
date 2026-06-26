import type { NormPoint } from "../coordinates";
import { pixelPolygonToNorm, type SceneFloorV1 } from "../scene-schema";

export type FowRegionFromArea = {
  sourceAreaId: string;
  polygon: NormPoint[];
  sortOrder: number;
};

/** Converte le aree di un piano (pixel) in regioni FoW normalizzate. */
export function floorAreasToFowRegions(floor: SceneFloorV1): FowRegionFromArea[] {
  return floor.areas
    .filter((a) => a.polygon.length >= 3)
    .map((area, idx) => ({
      sourceAreaId: area.id,
      polygon: pixelPolygonToNorm(area.polygon, floor.width, floor.height),
      sortOrder: idx + 1,
    }))
    .filter((r) => r.polygon.length >= 3);
}

export function sceneFloorsToFowRegionsByFloorId(
  floors: SceneFloorV1[]
): Map<string, FowRegionFromArea[]> {
  const out = new Map<string, FowRegionFromArea[]>();
  for (const floor of floors) {
    out.set(floor.id, floorAreasToFowRegions(floor));
  }
  return out;
}
