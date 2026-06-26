import type { NormPoint } from "../coordinates";

export type FowRegionUpsert = {
  sourceAreaId: string;
  polygon: NormPoint[];
  sortOrder: number;
};

export type ExistingFowRegion = {
  id: string;
  sourceAreaId: string | null;
  polygon: NormPoint[];
  isRevealed: boolean;
  sortOrder: number;
};

export type FowRegionSyncPlan = {
  toInsert: FowRegionUpsert[];
  toUpdate: Array<{
    id: string;
    sourceAreaId: string;
    polygon: NormPoint[];
    sortOrder: number;
    preserveRevealed: boolean;
  }>;
  toDeleteIds: string[];
};

function polygonKey(poly: NormPoint[]): string {
  return poly.map((p) => `${p.x.toFixed(6)},${p.y.toFixed(6)}`).join("|");
}

function polygonsEqual(a: NormPoint[], b: NormPoint[]): boolean {
  return polygonKey(a) === polygonKey(b);
}

/**
 * Pianifica sync regioni FoW derivate da scene document.
 * Solo regioni con `sourceAreaId` sono considerate scene-derived; le FoW manuali restano intatte.
 * Preserva `is_revealed` per `sourceAreaId` stabile (re-edit scena).
 */
export function planSceneFowRegionSync(
  desired: FowRegionUpsert[],
  existing: ExistingFowRegion[]
): FowRegionSyncPlan {
  const sceneDerived = existing.filter((e) => e.sourceAreaId);
  const byAreaId = new Map(sceneDerived.map((e) => [e.sourceAreaId!, e]));
  const desiredAreaIds = new Set(desired.map((d) => d.sourceAreaId));

  const toInsert: FowRegionUpsert[] = [];
  const toUpdate: FowRegionSyncPlan["toUpdate"] = [];

  for (const d of desired) {
    const ex = byAreaId.get(d.sourceAreaId);
    if (!ex) {
      toInsert.push(d);
      continue;
    }
    if (!polygonsEqual(ex.polygon, d.polygon) || ex.sortOrder !== d.sortOrder) {
      toUpdate.push({
        id: ex.id,
        sourceAreaId: d.sourceAreaId,
        polygon: d.polygon,
        sortOrder: d.sortOrder,
        preserveRevealed: ex.isRevealed,
      });
    }
  }

  const toDeleteIds = sceneDerived
    .filter((e) => e.sourceAreaId && !desiredAreaIds.has(e.sourceAreaId))
    .map((e) => e.id);

  return { toInsert, toUpdate, toDeleteIds };
}

export function revealedBySourceAreaId(
  existing: ExistingFowRegion[]
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const e of existing) {
    if (e.sourceAreaId) map.set(e.sourceAreaId, e.isRevealed);
  }
  return map;
}
