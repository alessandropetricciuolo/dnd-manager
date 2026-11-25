import type {
  CharacterAbilityKey,
  CharacterSheetCheck,
  CharacterSheetV1,
  CharacterSheetWeapon,
  CharacterSkillKey,
} from "./character-sheet";

export const ALL_ABILITY_KEYS: CharacterAbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export const SKILL_ABILITY_MAP: Record<CharacterSkillKey, CharacterAbilityKey> = {
  acrobatics: "dex",
  animal_handling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleight_of_hand: "dex",
  stealth: "dex",
  survival: "wis",
};

export const ALL_CHARACTER_SKILLS: Array<{
  key: CharacterSkillKey;
  label: string;
  ability: CharacterAbilityKey;
  abilityLabel: string;
}> = [
  { key: "acrobatics", label: "Acrobazia", ability: "dex", abilityLabel: "DES" },
  { key: "animal_handling", label: "Addestrare Animali", ability: "wis", abilityLabel: "SAG" },
  { key: "arcana", label: "Arcano", ability: "int", abilityLabel: "INT" },
  { key: "athletics", label: "Atletica", ability: "str", abilityLabel: "FOR" },
  { key: "deception", label: "Inganno", ability: "cha", abilityLabel: "CAR" },
  { key: "history", label: "Storia", ability: "int", abilityLabel: "INT" },
  { key: "insight", label: "Intuizione", ability: "wis", abilityLabel: "SAG" },
  { key: "intimidation", label: "Intimidire", ability: "cha", abilityLabel: "CAR" },
  { key: "investigation", label: "Indagare", ability: "int", abilityLabel: "INT" },
  { key: "medicine", label: "Medicina", ability: "wis", abilityLabel: "SAG" },
  { key: "nature", label: "Natura", ability: "int", abilityLabel: "INT" },
  { key: "perception", label: "Percezione", ability: "wis", abilityLabel: "SAG" },
  { key: "performance", label: "Intrattenere", ability: "cha", abilityLabel: "CAR" },
  { key: "persuasion", label: "Persuasione", ability: "cha", abilityLabel: "CAR" },
  { key: "religion", label: "Religione", ability: "int", abilityLabel: "INT" },
  { key: "sleight_of_hand", label: "Rapidità di mano", ability: "dex", abilityLabel: "DES" },
  { key: "stealth", label: "Furtività", ability: "dex", abilityLabel: "DES" },
  { key: "survival", label: "Sopravvivenza", ability: "wis", abilityLabel: "SAG" },
];

export type ClassSpellProgression = "none" | "full" | "half" | "half_up" | "pact" | "third";

export type ClassRule5e = {
  canonicalLabel: string;
  hitDie: "d6" | "d8" | "d10" | "d12";
  savingThrows: [CharacterAbilityKey, CharacterAbilityKey];
  spellProgression: ClassSpellProgression;
  spellAbility: CharacterAbilityKey | null;
  preparesSpells?: "full" | "half";
  shortRestSlots?: boolean;
  cantripsByLevel?: number[];
};

const CLASS_RULES_BY_KEY: Record<string, ClassRule5e> = {
  barbaro: {
    canonicalLabel: "Barbaro",
    hitDie: "d12",
    savingThrows: ["str", "con"],
    spellProgression: "none",
    spellAbility: null,
  },
  bardo: {
    canonicalLabel: "Bardo",
    hitDie: "d8",
    savingThrows: ["dex", "cha"],
    spellProgression: "full",
    spellAbility: "cha",
    cantripsByLevel: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  },
  chierico: {
    canonicalLabel: "Chierico",
    hitDie: "d8",
    savingThrows: ["wis", "cha"],
    spellProgression: "full",
    spellAbility: "wis",
    preparesSpells: "full",
    cantripsByLevel: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  },
  druido: {
    canonicalLabel: "Druido",
    hitDie: "d8",
    savingThrows: ["int", "wis"],
    spellProgression: "full",
    spellAbility: "wis",
    preparesSpells: "full",
    cantripsByLevel: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  },
  guerriero: {
    canonicalLabel: "Guerriero",
    hitDie: "d10",
    savingThrows: ["str", "con"],
    spellProgression: "none",
    spellAbility: null,
  },
  ladro: {
    canonicalLabel: "Ladro",
    hitDie: "d8",
    savingThrows: ["dex", "int"],
    spellProgression: "none",
    spellAbility: null,
  },
  mago: {
    canonicalLabel: "Mago",
    hitDie: "d6",
    savingThrows: ["int", "wis"],
    spellProgression: "full",
    spellAbility: "int",
    preparesSpells: "full",
    cantripsByLevel: [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
  },
  monaco: {
    canonicalLabel: "Monaco",
    hitDie: "d8",
    savingThrows: ["str", "dex"],
    spellProgression: "none",
    spellAbility: null,
  },
  paladino: {
    canonicalLabel: "Paladino",
    hitDie: "d10",
    savingThrows: ["wis", "cha"],
    spellProgression: "half",
    spellAbility: "cha",
    preparesSpells: "half",
  },
  ranger: {
    canonicalLabel: "Ranger",
    hitDie: "d10",
    savingThrows: ["str", "dex"],
    spellProgression: "half",
    spellAbility: "wis",
  },
  stregone: {
    canonicalLabel: "Stregone",
    hitDie: "d6",
    savingThrows: ["con", "cha"],
    spellProgression: "full",
    spellAbility: "cha",
    cantripsByLevel: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
  },
  warlock: {
    canonicalLabel: "Warlock",
    hitDie: "d8",
    savingThrows: ["wis", "cha"],
    spellProgression: "pact",
    spellAbility: "cha",
    shortRestSlots: true,
    cantripsByLevel: [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
  },
  artefice: {
    canonicalLabel: "Artefice",
    hitDie: "d8",
    savingThrows: ["con", "int"],
    spellProgression: "half_up",
    spellAbility: "int",
    preparesSpells: "half",
    cantripsByLevel: [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4],
  },
};

const FULL_CASTER_SLOTS: Array<[number, number, number, number, number, number, number, number, number]> = [
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

const HALF_CASTER_SLOTS: Array<[number, number, number, number, number]> = [
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

const HALF_UP_CASTER_SLOTS: Array<[number, number, number, number, number]> = [
  [2, 0, 0, 0, 0],
  ...HALF_CASTER_SLOTS.slice(1),
];

const THIRD_CASTER_SLOTS: Array<[number, number, number, number]> = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [2, 0, 0, 0],
  [3, 0, 0, 0],
  [3, 0, 0, 0],
  [3, 0, 0, 0],
  [4, 2, 0, 0],
  [4, 2, 0, 0],
  [4, 2, 0, 0],
  [4, 3, 0, 0],
  [4, 3, 0, 0],
  [4, 3, 0, 0],
  [4, 3, 2, 0],
  [4, 3, 2, 0],
  [4, 3, 2, 0],
  [4, 3, 3, 0],
  [4, 3, 3, 0],
  [4, 3, 3, 0],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
];

const PACT_SLOTS = [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4];
const PACT_LEVEL = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];

export function lookupClassRule5e(
  classLabel: string | null | undefined,
  classSubclass?: string | null,
  level = 1,
): ClassRule5e | null {
  const norm = (classLabel ?? "").trim().toLowerCase();
  if (!norm) return null;
  const base = CLASS_RULES_BY_KEY[norm];
  if (!base) return null;

  const subNorm = (classSubclass ?? "").trim().toLowerCase();
  const clamped = Math.max(1, Math.min(20, Math.trunc(level || 1)));

  // Cavaliere Mistico (Guerriero) / Mistificatore Arcano (Ladro)
  const isEldritchKnight =
    base.canonicalLabel === "Guerriero" &&
    (subNorm.includes("cavaliere mistico") || subNorm.includes("eldritch knight"));
  const isArcaneTrickster =
    base.canonicalLabel === "Ladro" &&
    (subNorm.includes("mistificatore arcano") || subNorm.includes("arcane trickster"));

  if ((isEldritchKnight || isArcaneTrickster) && clamped >= 3) {
    return {
      ...base,
      spellProgression: "third",
      spellAbility: "int",
      cantripsByLevel: isArcaneTrickster
        ? [0, 0, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]
        : [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    };
  }

  // Barbaro Magia Selvaggia
  if (
    base.canonicalLabel === "Barbaro" &&
    (subNorm.includes("magia selvaggia") || subNorm.includes("wild magic")) &&
    clamped >= 3
  ) {
    return { ...base, spellAbility: "con" };
  }

  return base;
}

export function isShortRestPactCaster(
  classLabel: string | null | undefined,
  spellcastingClass?: string | null,
): boolean {
  const a = (classLabel ?? "").trim().toLowerCase();
  const b = (spellcastingClass ?? "").trim().toLowerCase();
  return a === "warlock" || b === "warlock";
}

export function computeProficiencyBonus(level: number): number {
  const clamped = Math.max(1, Math.min(20, Math.trunc(level || 1)));
  return Math.floor((clamped - 1) / 4) + 2;
}

export function computeAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function computeAutoSpellSlots(
  classLabel: string | null | undefined,
  classSubclass: string | null | undefined,
  level: number,
): Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>> | undefined {
  const rule = lookupClassRule5e(classLabel, classSubclass, level);
  if (!rule || rule.spellProgression === "none") return undefined;
  const lvl = Math.max(1, Math.min(20, Math.trunc(level || 1)));
  const out: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>> = {};

  if (rule.spellProgression === "full") {
    const row = FULL_CASTER_SLOTS[lvl - 1]!;
    row.forEach((count, i) => {
      if (count > 0) out[(i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9] = count;
    });
  } else if (rule.spellProgression === "half") {
    const row = HALF_CASTER_SLOTS[lvl - 1]!;
    row.forEach((count, i) => {
      if (count > 0) out[(i + 1) as 1 | 2 | 3 | 4 | 5] = count;
    });
  } else if (rule.spellProgression === "half_up") {
    const row = HALF_UP_CASTER_SLOTS[lvl - 1]!;
    row.forEach((count, i) => {
      if (count > 0) out[(i + 1) as 1 | 2 | 3 | 4 | 5] = count;
    });
  } else if (rule.spellProgression === "third") {
    const row = THIRD_CASTER_SLOTS[lvl - 1]!;
    row.forEach((count, i) => {
      if (count > 0) out[(i + 1) as 1 | 2 | 3 | 4] = count;
    });
  } else if (rule.spellProgression === "pact") {
    const slots = PACT_SLOTS[lvl - 1] ?? 1;
    const slotLvl = (PACT_LEVEL[lvl - 1] ?? 1) as 1 | 2 | 3 | 4 | 5;
    out[slotLvl] = slots;
  }

  return Object.keys(out).length > 0 ? out : undefined;
}

export function computeAutoCantripsKnown(
  classLabel: string | null | undefined,
  classSubclass: string | null | undefined,
  level: number,
): number | undefined {
  const rule = lookupClassRule5e(classLabel, classSubclass, level);
  if (!rule?.cantripsByLevel) return undefined;
  const idx = Math.max(0, Math.min(19, Math.trunc(level || 1) - 1));
  const val = rule.cantripsByLevel[idx] ?? 0;
  return val > 0 ? val : undefined;
}

export function defaultSpeedForRace(
  raceSlugOrLabel?: string | null,
  subraceSlugOrLabel?: string | null,
): string {
  const r = (raceSlugOrLabel ?? "").toLowerCase();
  const s = (subraceSlugOrLabel ?? "").toLowerCase();
  if (s.includes("boschi")) return "10,5 m";
  if (r.includes("centauro")) return "12 m";
  if (r.includes("satiro")) return "10,5 m";
  if (r.includes("nano") || r.includes("duergar") || r.includes("halfling") || r.includes("gnomo")) {
    return "7,5 m";
  }
  return "9 m";
}

export type DeriveCharacterSheetOptions = {
  characterClass?: string | null;
  classSubclass?: string | null;
  raceSlugOrLabel?: string | null;
  subraceSlugOrLabel?: string | null;
  level: number;
  /** When true, pre-checks the class's default proficient saving throws if savingThrows[key] is absent. */
  applyClassSaveDefaults?: boolean;
};

/**
 * Pure D&D 5e derivation engine for Long campaign sheets and level-up:
 * computes proficiencyBonus, abilityMods, savingThrows, all 18 skills, passivePerception,
 * initiative, hitDie, hitDiceTotal, spellSlots, cantripsKnown, spellcastingAbility,
 * spellSaveDc, spellAttackBonus, and spellsPrepared while honoring explicit bonuses/overrides.
 */
export function deriveCharacterSheetRules(
  sheet: CharacterSheetV1,
  options: DeriveCharacterSheetOptions,
): CharacterSheetV1 {
  const level = Math.max(1, Math.min(20, Math.trunc(options.level || sheet.level || 1)));
  const classLabel = options.characterClass ?? sheet.classLabel ?? null;
  const classSubclass = options.classSubclass ?? sheet.classSubclass ?? null;
  const classRule = lookupClassRule5e(classLabel, classSubclass, level);
  const pb = computeProficiencyBonus(level);

  const next: CharacterSheetV1 = {
    ...sheet,
    proficiencyBonus: pb,
  };

  if (!next.speed && (options.raceSlugOrLabel || next.raceLabel)) {
    next.speed = defaultSpeedForRace(
      options.raceSlugOrLabel ?? next.raceLabel,
      options.subraceSlugOrLabel ?? next.subraceLabel,
    );
  }

  // 1. Ability modifiers from ability scores
  const abilities = next.abilities ?? {};
  const computedMods: Partial<Record<CharacterAbilityKey, number>> = { ...(next.abilityMods ?? {}) };
  for (const key of ALL_ABILITY_KEYS) {
    const score = abilities[key];
    if (typeof score === "number" && Number.isFinite(score)) {
      computedMods[key] = computeAbilityModifier(score);
    } else if (abilities[key] === undefined && sheet.abilities && !(key in sheet.abilities)) {
      delete computedMods[key];
    }
  }
  if (Object.keys(computedMods).length > 0) next.abilityMods = computedMods;
  else delete next.abilityMods;

  const isMonkDiamondSoul = classRule?.canonicalLabel === "Monaco" && level >= 14;
  const isBardJack =
    next.jackOfAllTrades ?? (classRule?.canonicalLabel === "Bardo" && level >= 2);
  if (classRule?.canonicalLabel === "Bardo" && level >= 2 && next.jackOfAllTrades === undefined) {
    next.jackOfAllTrades = true;
  }

  // 2. Saving throws (all 6 when corresponding ability mod is available, preserving explicit checks)
  const prevSaves = next.savingThrows ?? {};
  const nextSaves: Partial<Record<CharacterAbilityKey, CharacterSheetCheck>> = {};
  for (const key of ALL_ABILITY_KEYS) {
    const mod = computedMods[key];
    const existing = prevSaves[key];
    if (mod !== undefined) {
      const defaultProf = Boolean(
        options.applyClassSaveDefaults &&
          (classRule?.savingThrows.includes(key) || isMonkDiamondSoul),
      );
      const proficient = existing?.proficient !== undefined ? existing.proficient : defaultProf;
      const expertise = existing?.expertise;
      const bonusExtra = existing?.bonusExtra;
      const profAdd = expertise ? 2 * pb : proficient ? pb : 0;
      const value = mod + profAdd + (bonusExtra ?? 0);
      nextSaves[key] = {
        value,
        proficient,
        ...(expertise ? { expertise: true } : {}),
        ...(bonusExtra ? { bonusExtra } : {}),
      };
    } else if (existing) {
      nextSaves[key] = existing;
    }
  }
  if (Object.keys(nextSaves).length > 0) next.savingThrows = nextSaves;
  else delete next.savingThrows;

  // 3. All 18 skills
  const prevSkills = next.skills ?? {};
  const nextSkills: Partial<Record<CharacterSkillKey, CharacterSheetCheck>> = {};
  for (const meta of ALL_CHARACTER_SKILLS) {
    const mod = computedMods[meta.ability];
    const existing = prevSkills[meta.key];
    if (mod !== undefined) {
      const proficient = Boolean(existing?.proficient);
      const expertise = Boolean(existing?.expertise);
      const bonusExtra = existing?.bonusExtra;
      const profAdd = expertise
        ? 2 * pb
        : proficient
          ? pb
          : isBardJack
            ? Math.floor(pb / 2)
            : 0;
      const value = mod + profAdd + (bonusExtra ?? 0);
      nextSkills[meta.key] = {
        value,
        proficient,
        ...(expertise ? { expertise: true } : {}),
        ...(bonusExtra ? { bonusExtra } : {}),
      };
    } else if (existing) {
      nextSkills[meta.key] = existing;
    }
  }
  if (Object.keys(nextSkills).length > 0) next.skills = nextSkills;
  else delete next.skills;

  // 4. Passive Perception & Initiative
  const percCheck = nextSkills.perception;
  if (percCheck !== undefined) {
    next.passivePerception = 10 + percCheck.value + (next.passivePerceptionBonus ?? 0);
  }
  if (computedMods.dex !== undefined) {
    next.initiative = computedMods.dex + (next.initiativeBonus ?? 0);
  }

  // 5. Hit Dice (unless manually overridden)
  if (!next.manualHitDiceOverride) {
    if (classRule) next.hitDie = classRule.hitDie;
    next.hitDiceTotal = level;
  }

  // 6. Spellcasting (slots, cantrips, ability, DC, spell attack bonus, prepared count)
  const resolvedSpellAbility = next.spellcastingAbility ?? classRule?.spellAbility ?? null;
  if (resolvedSpellAbility) {
    next.spellcastingAbility = resolvedSpellAbility;
    if (!next.spellcastingClass && classRule) {
      next.spellcastingClass = classRule.canonicalLabel;
    }
    const spellMod = computedMods[resolvedSpellAbility];
    if (spellMod !== undefined) {
      next.spellSaveDc = 8 + pb + spellMod + (next.spellDcBonus ?? 0);
      next.spellAttackBonus = pb + spellMod + (next.spellAttackBonusExtra ?? 0);
      if (classRule?.preparesSpells) {
        const hasCastingYet =
          classRule.preparesSpells === "full" ||
          classRule.canonicalLabel === "Artefice" ||
          level >= 2;
        if (hasCastingYet) {
          const casterLvl =
            classRule.preparesSpells === "half" ? Math.max(1, Math.floor(level / 2)) : level;
          next.spellsPrepared = Math.max(1, casterLvl + spellMod);
        }
      }
    }
  }

  if (!next.manualSpellSlotsOverride && classRule) {
    const autoSlots = computeAutoSpellSlots(classLabel, classSubclass, level);
    if (autoSlots) next.spellSlots = autoSlots;
    else delete next.spellSlots;

    const autoCantrips = computeAutoCantripsKnown(classLabel, classSubclass, level);
    if (autoCantrips !== undefined) next.cantripsKnown = autoCantrips;
    else delete next.cantripsKnown;
  }

  return next;
}

export type QuickWeaponPreset = {
  id: string;
  name: string;
  damageDie: string;
  versatileDie?: string;
  damageType: string;
  mode: "melee" | "ranged" | "finesse";
};

export const QUICK_WEAPONS_5E: QuickWeaponPreset[] = [
  { id: "pugnale", name: "Pugnale", damageDie: "1d4", damageType: "perforanti", mode: "finesse" },
  { id: "spada-corta", name: "Spada corta", damageDie: "1d6", damageType: "perforanti", mode: "finesse" },
  { id: "stocco", name: "Stocco", damageDie: "1d8", damageType: "perforanti", mode: "finesse" },
  { id: "scimitarra", name: "Scimitarra", damageDie: "1d6", damageType: "taglienti", mode: "finesse" },
  { id: "spada-lunga", name: "Spada lunga", damageDie: "1d8", versatileDie: "1d10", damageType: "taglienti", mode: "melee" },
  { id: "spadone", name: "Spadone", damageDie: "2d6", damageType: "taglienti", mode: "melee" },
  { id: "ascia-bipenne", name: "Ascia bipenne", damageDie: "1d12", damageType: "taglienti", mode: "melee" },
  { id: "ascia-da-battaglia", name: "Ascia da battaglia", damageDie: "1d8", versatileDie: "1d10", damageType: "taglienti", mode: "melee" },
  { id: "martello-da-guerra", name: "Martello da guerra", damageDie: "1d8", versatileDie: "1d10", damageType: "contundenti", mode: "melee" },
  { id: "mazza", name: "Mazza", damageDie: "1d6", damageType: "contundenti", mode: "melee" },
  { id: "bastone-ferrato", name: "Bastone ferrato", damageDie: "1d6", versatileDie: "1d8", damageType: "contundenti", mode: "melee" },
  { id: "lancia", name: "Lancia", damageDie: "1d6", versatileDie: "1d8", damageType: "perforanti", mode: "melee" },
  { id: "giavellotto", name: "Giavellotto", damageDie: "1d6", damageType: "perforanti", mode: "melee" },
  { id: "colpo-senz-armi", name: "Colpo senz'armi", damageDie: "1d4", damageType: "contundenti", mode: "melee" },
  { id: "arco-corto", name: "Arco corto", damageDie: "1d6", damageType: "perforanti", mode: "ranged" },
  { id: "arco-lungo", name: "Arco lungo", damageDie: "1d8", damageType: "perforanti", mode: "ranged" },
  { id: "balestra-leggera", name: "Balestra leggera", damageDie: "1d8", damageType: "perforanti", mode: "ranged" },
  { id: "balestra-a-mano", name: "Balestra a mano", damageDie: "1d6", damageType: "perforanti", mode: "ranged" },
  { id: "balestra-pesante", name: "Balestra pesante", damageDie: "1d10", damageType: "perforanti", mode: "ranged" },
];

export function buildCalculatedWeaponRow(params: {
  name: string;
  damageDie: string;
  versatileDie?: string;
  damageType: string;
  mode: "melee" | "ranged" | "finesse";
  proficient: boolean;
  magicBonus?: number;
  abilityMods?: Partial<Record<CharacterAbilityKey, number>>;
  proficiencyBonus?: number;
}): CharacterSheetWeapon {
  const strMod = params.abilityMods?.str ?? 0;
  const dexMod = params.abilityMods?.dex ?? 0;
  const statMod =
    params.mode === "ranged"
      ? dexMod
      : params.mode === "finesse"
        ? Math.max(strMod, dexMod)
        : strMod;
  const pb = params.proficient ? (params.proficiencyBonus ?? 2) : 0;
  const magic = Math.trunc(params.magicBonus ?? 0);
  const hitTotal = statMod + pb + magic;
  const dmgMod = statMod + magic;
  const fmtMod = (n: number) => (n === 0 ? "" : n > 0 ? `+${n}` : `${n}`);
  const primaryDmg = `${params.damageDie}${fmtMod(dmgMod)}`;
  const damage = params.versatileDie
    ? `${primaryDmg} (${params.versatileDie}${fmtMod(dmgMod)})`
    : primaryDmg;

  return {
    name: magic > 0 ? `${params.name} +${magic}` : params.name,
    toHit: hitTotal >= 0 ? `+${hitTotal}` : `${hitTotal}`,
    damage,
    type: params.damageType,
  };
}
