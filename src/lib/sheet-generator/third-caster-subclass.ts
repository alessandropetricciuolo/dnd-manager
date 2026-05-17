/**
 * Sottoclassi che ottengono incantesimi da mago dal 3° livello (PHB IT).
 */

export type ThirdCasterSubclassKind = "eldritch-knight" | "arcane-trickster";

function normalizeSubclassLabel(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** Livello della classe → slot 1°, 2°, 3°, 4° (PHB: tabella Cavaliere Mistico / Mistificatore Arcano). */
const THIRD_CASTER_SLOT_TIERS: Record<number, [number, number, number, number]> = {
  1: [0, 0, 0, 0],
  2: [0, 0, 0, 0],
  3: [2, 0, 0, 0],
  4: [3, 0, 0, 0],
  5: [3, 0, 0, 0],
  6: [3, 0, 0, 0],
  7: [4, 2, 0, 0],
  8: [4, 2, 0, 0],
  9: [4, 2, 0, 0],
  10: [4, 3, 0, 0],
  11: [4, 3, 0, 0],
  12: [4, 3, 0, 0],
  13: [4, 3, 2, 0],
  14: [4, 3, 2, 0],
  15: [4, 3, 2, 0],
  16: [4, 3, 3, 0],
  17: [4, 3, 3, 0],
  18: [4, 3, 3, 0],
  19: [4, 3, 3, 1],
  20: [4, 3, 3, 1],
};

const THIRD_CASTER_SPELLS_KNOWN: Record<number, number> = {
  1: 0,
  2: 0,
  3: 3,
  4: 4,
  5: 4,
  6: 4,
  7: 5,
  8: 6,
  9: 6,
  10: 7,
  11: 8,
  12: 8,
  13: 9,
  14: 10,
  15: 10,
  16: 11,
  17: 11,
  18: 11,
  19: 12,
  20: 13,
};

function thirdCasterCantripsKnown(kind: ThirdCasterSubclassKind, level: number): number {
  if (level < 3) return 0;
  if (kind === "eldritch-knight") return level < 10 ? 2 : 3;
  return level < 10 ? 3 : 4;
}

function maxSpellLevelFromSlots([s1, s2, s3, s4]: [number, number, number, number]): number {
  if (s4 > 0) return 4;
  if (s3 > 0) return 3;
  if (s2 > 0) return 2;
  if (s1 > 0) return 1;
  return 0;
}

export function detectThirdCasterSubclass(
  classLabel: string,
  subclassLabel: string | null | undefined
): ThirdCasterSubclassKind | null {
  const sub = normalizeSubclassLabel(subclassLabel ?? "");
  if (!sub) return null;
  if (classLabel === "Guerriero") {
    if (sub.includes("cavaliere mistico") || sub.includes("eldritch knight")) return "eldritch-knight";
  }
  if (classLabel === "Ladro") {
    if (sub.includes("mistificatore")) return "arcane-trickster";
  }
  return null;
}

/** Barbaro Tasha: effetti della Magia selvaggia usano CD con Costituzione (non lista incantesimi da mago). */
export function detectWildMagicBarbarianPath(
  classLabel: string,
  subclassLabel: string | null | undefined
): boolean {
  if (classLabel !== "Barbaro") return false;
  const sub = normalizeSubclassLabel(subclassLabel ?? "");
  return sub.includes("magia selvaggia") || sub.includes("wild magic");
}

export type ThirdCasterWizardPayload = {
  kind: ThirdCasterSubclassKind;
  cantripsKnown: number;
  spellsKnown: number;
  slotsTiers: [number, number, number, number];
  maxSpellLevelOnList: number;
};

export function getThirdCasterWizardSpellcasting(
  kind: ThirdCasterSubclassKind | null,
  classLevel: number
): ThirdCasterWizardPayload | null {
  if (!kind) return null;
  const lvl = Math.max(1, Math.min(20, classLevel));
  if (lvl < 3) return null;
  const slotsTiers = THIRD_CASTER_SLOT_TIERS[lvl] ?? THIRD_CASTER_SLOT_TIERS[20];
  return {
    kind,
    cantripsKnown: thirdCasterCantripsKnown(kind, lvl),
    spellsKnown: THIRD_CASTER_SPELLS_KNOWN[lvl] ?? 0,
    slotsTiers,
    maxSpellLevelOnList: maxSpellLevelFromSlots(slotsTiers),
  };
}

export function spellSlotsRecordFromThirdCasterTiers(
  tiers: [number, number, number, number]
): Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number> {
  const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const [a, b, c, d] = tiers;
  out[1] = a;
  out[2] = b;
  out[3] = c;
  out[4] = d;
  return out;
}
