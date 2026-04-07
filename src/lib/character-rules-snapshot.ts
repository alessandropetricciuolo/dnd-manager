import type { Json } from "@/types/database.types";

export type CharacterRulesSnapshotV1 = {
  version: 1;
  computedAt: string;
  level: number;
  raceSlug: string | null;
  subraceSlug: string | null;
  classLabel: string | null;
  classSubclass: string | null;
  backgroundSlug: string | null;
  raceTraitsMd: string;
  subraceTraitsMd: string | null;
  classPrivilegesMd: string;
  classSubclassMd: string | null;
  spellcastingMd: string | null;
  spellsListMd: string | null;
  spellsDetailsMd: Record<string, string> | null;
  backgroundRulesMd: string | null;
  warnings: string[];
};

export function parseRulesSnapshot(raw: Json | null): CharacterRulesSnapshotV1 | null {
  if (raw === null || raw === undefined) return null;
  let o: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      o = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (typeof raw === "object" && !Array.isArray(raw)) {
    o = raw as Record<string, unknown>;
  } else {
    return null;
  }
  if (o.version !== 1) return null;
  return o as unknown as CharacterRulesSnapshotV1;
}
