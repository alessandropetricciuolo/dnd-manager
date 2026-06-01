import type { Json } from "@/types/database.types";
import type { SpellSlotEntry } from "@/lib/character-rules-snapshot";
import { parseRulesSnapshot } from "@/lib/character-rules-snapshot";
import { computeCharacterSpellcastingMeta } from "@/lib/sheet-generator/spell-slots";

export type CombatSpellSlots = {
  max: SpellSlotEntry[];
  remaining: SpellSlotEntry[];
};

function cloneEntries(entries: SpellSlotEntry[]): SpellSlotEntry[] {
  return entries.map((e) => ({ level: e.level, count: e.count }));
}

export function resolveMaxSpellSlotsForCharacter(input: {
  rules_snapshot?: Json | null;
  character_class?: string | null;
  class_subclass?: string | null;
  level?: number;
}): SpellSlotEntry[] {
  const snap = parseRulesSnapshot(input.rules_snapshot ?? null);
  if (snap?.spellSlots?.length) return cloneEntries(snap.spellSlots);

  const meta = computeCharacterSpellcastingMeta({
    classLabel: snap?.classLabel ?? input.character_class ?? null,
    classSubclass: snap?.classSubclass ?? input.class_subclass ?? null,
    level: snap?.level ?? input.level ?? 1,
  });
  return meta?.spellSlots?.length ? cloneEntries(meta.spellSlots) : [];
}

export function createCombatSpellSlots(max: SpellSlotEntry[]): CombatSpellSlots | undefined {
  if (!max.length) return undefined;
  return { max: cloneEntries(max), remaining: cloneEntries(max) };
}

export function spellSlotsForCharacter(input: {
  rules_snapshot?: Json | null;
  character_class?: string | null;
  class_subclass?: string | null;
  level?: number;
}): CombatSpellSlots | undefined {
  return createCombatSpellSlots(resolveMaxSpellSlotsForCharacter(input));
}

export function normalizeCombatSpellSlots(
  slots: CombatSpellSlots | undefined
): CombatSpellSlots | undefined {
  if (!slots?.max?.length) return undefined;
  const max = cloneEntries(slots.max)
    .filter((e) => e.level >= 1 && e.level <= 9 && e.count > 0)
    .sort((a, b) => a.level - b.level);
  if (!max.length) return undefined;

  const remainingByLevel = new Map<number, number>();
  for (const e of slots.remaining ?? []) {
    if (e.level < 1 || e.level > 9 || e.count <= 0) continue;
    remainingByLevel.set(e.level, Math.max(0, Math.trunc(e.count)));
  }

  const remaining = max.map((m) => ({
    level: m.level,
    count: Math.min(m.count, remainingByLevel.get(m.level) ?? m.count),
  }));

  return { max, remaining };
}

export function spendCombatSpellSlot(
  slots: CombatSpellSlots,
  level: number
): CombatSpellSlots | null {
  const idx = slots.remaining.findIndex((s) => s.level === level);
  if (idx < 0 || slots.remaining[idx].count <= 0) return null;
  const remaining = slots.remaining
    .map((s, i) => (i === idx ? { ...s, count: s.count - 1 } : { ...s }))
    .filter((s) => s.count > 0);
  return { ...slots, remaining };
}

export function restoreCombatSpellSlot(
  slots: CombatSpellSlots,
  level: number
): CombatSpellSlots | null {
  const maxEntry = slots.max.find((s) => s.level === level);
  if (!maxEntry) return null;
  const current = slots.remaining.find((s) => s.level === level)?.count ?? 0;
  if (current >= maxEntry.count) return null;

  const remaining = [...slots.remaining];
  const idx = remaining.findIndex((s) => s.level === level);
  if (idx >= 0) {
    remaining[idx] = { level, count: current + 1 };
  } else {
    remaining.push({ level, count: 1 });
  }
  remaining.sort((a, b) => a.level - b.level);
  return { ...slots, remaining };
}

export function resetCombatSpellSlots(slots: CombatSpellSlots): CombatSpellSlots {
  return { max: cloneEntries(slots.max), remaining: cloneEntries(slots.max) };
}

export function combatSpellSlotsEqual(
  a: CombatSpellSlots | undefined,
  b: CombatSpellSlots | undefined
): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}
