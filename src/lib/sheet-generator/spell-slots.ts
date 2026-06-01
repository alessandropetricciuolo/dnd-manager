import { classByLabel, type ClassCatalogEntry } from "@/lib/character-build-catalog";
import type { SpellSlotEntry } from "@/lib/character-rules-snapshot";
import type { AbilityKey } from "@/lib/sheet-generator/types";
import {
  detectThirdCasterSubclass,
  detectWildMagicBarbarianPath,
  getThirdCasterWizardSpellcasting,
  spellSlotsRecordFromThirdCasterTiers,
} from "@/lib/sheet-generator/third-caster-subclass";

export type SpellSlotsRecord = Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>;

export const SPELLCASTING_ABILITY_BY_CLASS: Record<string, AbilityKey | null> = {
  Barbaro: null,
  Bardo: "cha",
  Chierico: "wis",
  Druido: "wis",
  Guerriero: null,
  Ladro: null,
  Mago: "int",
  Monaco: null,
  Paladino: "cha",
  Ranger: "wis",
  Stregone: "cha",
  Warlock: "cha",
  Artefice: "int",
};

const CANTRIPS_BY_CLASS_LEVEL: Partial<Record<string, number[]>> = {
  Bardo: [2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Chierico: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Druido: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Mago: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  Stregone: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  Warlock: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  Artefice: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
};

export function cantripsKnownForClass(classLabel: string, level: number): number {
  const table = CANTRIPS_BY_CLASS_LEVEL[classLabel];
  if (!table) return 0;
  const idx = Math.min(table.length - 1, Math.max(0, Math.max(1, level) - 1));
  return table[idx] ?? table[table.length - 1] ?? 0;
}

export function slotsForClassLevel(classDef: ClassCatalogEntry | null, level: number): SpellSlotsRecord {
  const out: SpellSlotsRecord = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  if (!classDef?.spellList) return out;
  const lvl = Math.max(1, Math.min(20, level));
  const full: Array<[number, number, number, number, number, number, number, number, number]> = [
    [2, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 0, 0, 0, 0, 0, 0, 0, 0],
    [4, 2, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 0, 0, 0, 0, 0, 0, 0],
    [4, 3, 2, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 0, 0, 0, 0, 0, 0],
    [4, 3, 3, 1, 0, 0, 0, 0, 0],
    [4, 3, 3, 2, 0, 0, 0, 0, 0],
    [4, 3, 3, 3, 1, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 0, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 0, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 0, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 0],
    [4, 3, 3, 3, 2, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 2, 1, 1],
  ];
  const row = full[lvl - 1] ?? full[full.length - 1];
  if (classDef.spellProgression === "full") {
    row.forEach((v, i) => {
      out[(i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9] = v;
    });
    return out;
  }
  const half: Array<[number, number, number, number, number]> = [
    [0, 0, 0, 0, 0],
    [2, 0, 0, 0, 0],
    [3, 0, 0, 0, 0],
    [3, 0, 0, 0, 0],
    [4, 2, 0, 0, 0],
    [4, 2, 0, 0, 0],
    [4, 3, 0, 0, 0],
    [4, 3, 0, 0, 0],
    [4, 3, 2, 0, 0],
    [4, 3, 2, 0, 0],
    [4, 3, 3, 0, 0],
    [4, 3, 3, 0, 0],
    [4, 3, 3, 1, 0],
    [4, 3, 3, 1, 0],
    [4, 3, 3, 2, 0],
    [4, 3, 3, 2, 0],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2],
  ];
  const halfUp: Array<[number, number, number, number, number]> = [
    [2, 0, 0, 0, 0],
    [2, 0, 0, 0, 0],
    [3, 0, 0, 0, 0],
    [3, 0, 0, 0, 0],
    [4, 2, 0, 0, 0],
    [4, 2, 0, 0, 0],
    [4, 3, 0, 0, 0],
    [4, 3, 0, 0, 0],
    [4, 3, 2, 0, 0],
    [4, 3, 2, 0, 0],
    [4, 3, 3, 0, 0],
    [4, 3, 3, 0, 0],
    [4, 3, 3, 1, 0],
    [4, 3, 3, 1, 0],
    [4, 3, 3, 2, 0],
    [4, 3, 3, 2, 0],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2],
    [4, 3, 3, 3, 2],
  ];
  const pactSlots = [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4];
  const pactSlotLevel = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
  if (classDef.spellProgression === "half") {
    const r = half[lvl - 1];
    if (r) r.forEach((v, i) => (out[(i + 1) as 1 | 2 | 3 | 4 | 5] = v));
    return out;
  }
  if (classDef.spellProgression === "half_up") {
    const r = halfUp[lvl - 1];
    if (r) r.forEach((v, i) => (out[(i + 1) as 1 | 2 | 3 | 4 | 5] = v));
    return out;
  }
  if (classDef.spellProgression === "pact") {
    const slots = pactSlots[lvl - 1] ?? 0;
    const slotLevel = pactSlotLevel[lvl - 1] ?? 1;
    out[slotLevel as 1 | 2 | 3 | 4 | 5] = slots;
    return out;
  }
  return out;
}

export function spellSlotsRecordToEntries(record: Record<number, number>): SpellSlotEntry[] {
  const out: SpellSlotEntry[] = [];
  for (let lvl = 1; lvl <= 9; lvl += 1) {
    const count = Number(record[lvl] ?? 0);
    if (count > 0) out.push({ level: lvl, count });
  }
  return out;
}

export type CharacterSpellcastingMeta = {
  spellSlots: SpellSlotEntry[];
  cantripsKnown: number;
  spellcastingAbility: AbilityKey | null;
};

/** Slot e trucchetti coerenti con la generazione scheda (classe, sottoclasse, livello). */
export function computeCharacterSpellcastingMeta(input: {
  classLabel: string | null;
  classSubclass: string | null;
  level: number;
}): CharacterSpellcastingMeta | null {
  const classLabel = input.classLabel?.trim();
  if (!classLabel) return null;

  const classDef = classByLabel(classLabel);
  const level = Math.max(1, Math.min(20, Math.floor(input.level || 1)));
  const tcWizard = getThirdCasterWizardSpellcasting(
    detectThirdCasterSubclass(classLabel, input.classSubclass),
    level
  );
  const wmBarbActive =
    detectWildMagicBarbarianPath(classLabel, input.classSubclass) && level >= 3;

  let spellcastingAbility: AbilityKey | null = SPELLCASTING_ABILITY_BY_CLASS[classLabel] ?? null;
  let spellSlotsRecord = slotsForClassLevel(classDef, level);
  let cantripsKnown = cantripsKnownForClass(classLabel, level);

  if (tcWizard) {
    spellcastingAbility = "int";
    spellSlotsRecord = spellSlotsRecordFromThirdCasterTiers(tcWizard.slotsTiers);
    cantripsKnown = tcWizard.cantripsKnown;
  }
  if (!tcWizard && spellcastingAbility === null && wmBarbActive) {
    spellcastingAbility = "con";
  }

  const hasSlots = spellSlotsRecordToEntries(spellSlotsRecord).length > 0;
  if (!hasSlots && cantripsKnown <= 0 && !spellcastingAbility) return null;

  return {
    spellSlots: spellSlotsRecordToEntries(spellSlotsRecord),
    cantripsKnown,
    spellcastingAbility,
  };
}

/** Metadati incantesimi dalla scheda generata (per salvataggio su PG). */
export function spellcastingMetaFromGeneratedSheet(sheet: {
  spellSlots: Record<number, number>;
  cantripsKnown: number;
  spellcastingAbility: AbilityKey | null;
}): CharacterSpellcastingMeta | null {
  const spellSlots = spellSlotsRecordToEntries(sheet.spellSlots);
  if (!spellSlots.length && sheet.cantripsKnown <= 0 && !sheet.spellcastingAbility) return null;
  return {
    spellSlots,
    cantripsKnown: sheet.cantripsKnown,
    spellcastingAbility: sheet.spellcastingAbility,
  };
}
