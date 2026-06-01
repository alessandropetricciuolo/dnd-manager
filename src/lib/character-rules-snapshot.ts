import type { Json } from "@/types/database.types";
import type { AbilityKey } from "@/lib/sheet-generator/types";

export type SpellSlotEntry = { level: number; count: number };

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
  /** Slot incantesimo per livello (es. 2 slot di 1° livello). */
  spellSlots?: SpellSlotEntry[];
  cantripsKnown?: number;
  spellcastingAbility?: AbilityKey | null;
};

export function formatSpellSlotsLabel(entries: SpellSlotEntry[] | undefined | null): string | null {
  if (!entries?.length) return null;
  return entries.map((e) => `${e.count}×${e.level}°`).join(", ");
}

export function mergeSpellcastingIntoSnapshot(
  snap: CharacterRulesSnapshotV1,
  meta: {
    spellSlots: SpellSlotEntry[];
    cantripsKnown: number;
    spellcastingAbility: AbilityKey | null;
  } | null
): CharacterRulesSnapshotV1 {
  if (!meta) {
    const { spellSlots: _s, cantripsKnown: _c, spellcastingAbility: _a, ...rest } = snap;
    return rest;
  }
  return {
    ...snap,
    spellSlots: meta.spellSlots,
    cantripsKnown: meta.cantripsKnown,
    spellcastingAbility: meta.spellcastingAbility,
  };
}

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

export function parseSpellcastingMetaFromJson(raw: string | null | undefined): {
  spellSlots: SpellSlotEntry[];
  cantripsKnown: number;
  spellcastingAbility: AbilityKey | null;
} | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as {
      spellSlots?: unknown;
      cantripsKnown?: unknown;
      spellcastingAbility?: unknown;
    };
    if (!Array.isArray(o.spellSlots)) return null;
    const spellSlots: SpellSlotEntry[] = [];
    for (const item of o.spellSlots) {
      if (item == null || typeof item !== "object") continue;
      const level = Number((item as { level?: unknown }).level);
      const count = Number((item as { count?: unknown }).count);
      if (!Number.isFinite(level) || !Number.isFinite(count) || level < 1 || count < 1) continue;
      spellSlots.push({ level: Math.trunc(level), count: Math.trunc(count) });
    }
    const cantripsKnown =
      typeof o.cantripsKnown === "number" && Number.isFinite(o.cantripsKnown)
        ? Math.max(0, Math.trunc(o.cantripsKnown))
        : 0;
    const ab = o.spellcastingAbility;
    const spellcastingAbility =
      ab === "str" || ab === "dex" || ab === "con" || ab === "int" || ab === "wis" || ab === "cha"
        ? ab
        : null;
    if (!spellSlots.length && cantripsKnown <= 0 && !spellcastingAbility) return null;
    return { spellSlots, cantripsKnown, spellcastingAbility };
  } catch {
    return null;
  }
}
