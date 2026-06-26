import type { SkillKey, AbilityKey } from "@/lib/sheet-generator/types";

export const ALL_SKILL_KEYS = [
  "acrobatics",
  "animal_handling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleight_of_hand",
  "stealth",
  "survival",
] as const satisfies readonly SkillKey[];

/** Numero di competenze di classe scelte al 1° livello (PHB IT). */
const CLASS_SKILL_PICK_COUNT: Record<string, number> = {
  Ladro: 4,
  Bardo: 3,
  Ranger: 3,
};

export function classSkillPickCount(classLabel: string): number {
  return CLASS_SKILL_PICK_COUNT[classLabel] ?? 2;
}

export const BACKGROUND_FIXED_SKILLS: Record<string, SkillKey[]> = {
  accolito: ["insight", "religion"],
  artigiano_gilda: ["insight", "persuasion"],
  ciarlatano: ["deception", "sleight_of_hand"],
  criminale: ["deception", "stealth"],
  eremita: ["medicine", "religion"],
  eroe_popolare: ["animal_handling", "survival"],
  forestiero: ["athletics", "survival"],
  intrattenitore: ["acrobatics", "performance"],
  nobile: ["history", "persuasion"],
  sapiente: ["arcana", "history"],
  soldato: ["athletics", "intimidation"],
};

/** Background con due competenze a scelta (non fisse). */
export const BACKGROUND_SKILL_POOLS: Record<string, SkillKey[]> = {
  tormentato: ["arcana", "investigation", "religion", "survival"],
  investigatore: ["investigation", "insight", "perception"],
};

const SKILL_ABILITY: Record<SkillKey, AbilityKey> = {
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

const EXPERTISE_AUTO_PRIORITY: Partial<Record<string, SkillKey[]>> = {
  Ladro: ["stealth", "sleight_of_hand", "investigation", "perception", "acrobatics", "deception"],
  Bardo: ["persuasion", "deception", "performance", "insight", "stealth", "perception"],
};

export function expertisePickCount(classLabel: string, level: number): number {
  if (classLabel === "Ladro") {
    return level >= 6 ? 4 : 2;
  }
  if (classLabel === "Bardo") {
    let n = 0;
    if (level >= 3) n += 2;
    if (level >= 10) n += 2;
    return n;
  }
  return 0;
}

export function raceGrantedSkills(raceSlug: string, subraceSlug: string | null | undefined): SkillKey[] {
  const slugs = [raceSlug, subraceSlug].filter(Boolean) as string[];
  const elfLike = slugs.some(
    (s) => s.startsWith("elfo") || s === "eladrin" || s === "shadar_kai" || s === "elfo_mare"
  );
  return elfLike ? ["perception"] : [];
}

function sortSkillsByMod(pool: SkillKey[], abilityMods: Record<AbilityKey, number>): SkillKey[] {
  return [...pool].sort((a, b) => {
    const ad = abilityMods[SKILL_ABILITY[a]];
    const bd = abilityMods[SKILL_ABILITY[b]];
    if (bd !== ad) return bd - ad;
    return a.localeCompare(b);
  });
}

export function pickSkillsFromPool(
  pool: SkillKey[],
  count: number,
  abilityMods: Record<AbilityKey, number>,
  exclude: Set<SkillKey> = new Set()
): SkillKey[] {
  const chosen: SkillKey[] = [];
  for (const s of sortSkillsByMod(pool, abilityMods)) {
    if (chosen.length >= count) break;
    if (exclude.has(s) || chosen.includes(s)) continue;
    chosen.push(s);
  }
  for (const s of sortSkillsByMod(pool, abilityMods)) {
    if (chosen.length >= count) break;
    if (!chosen.includes(s)) chosen.push(s);
  }
  return chosen.slice(0, count);
}

export function pickBackgroundSkills(
  backgroundSlug: string | null | undefined,
  abilityMods: Record<AbilityKey, number>,
  exclude: Set<SkillKey> = new Set()
): SkillKey[] {
  const slug = backgroundSlug?.trim() ?? "";
  const fixed = BACKGROUND_FIXED_SKILLS[slug];
  if (fixed) return fixed.filter((s) => !exclude.has(s));
  const pool = BACKGROUND_SKILL_POOLS[slug];
  if (pool) return pickSkillsFromPool(pool, 2, abilityMods, exclude);
  return [];
}

export function pickDefaultExpertise(
  classLabel: string,
  level: number,
  proficientSkills: SkillKey[]
): SkillKey[] {
  const need = expertisePickCount(classLabel, level);
  if (need <= 0) return [];
  const profSet = new Set(proficientSkills);
  const priority = EXPERTISE_AUTO_PRIORITY[classLabel] ?? proficientSkills;
  const chosen: SkillKey[] = [];
  for (const s of priority) {
    if (chosen.length >= need) break;
    if (profSet.has(s) && !chosen.includes(s)) chosen.push(s);
  }
  for (const s of proficientSkills) {
    if (chosen.length >= need) break;
    if (!chosen.includes(s)) chosen.push(s);
  }
  return chosen.slice(0, need);
}

export function resolveExpertiseSkills(
  classLabel: string,
  level: number,
  proficientSkills: SkillKey[],
  override?: SkillKey[]
): SkillKey[] {
  const need = expertisePickCount(classLabel, level);
  if (need <= 0) return [];
  const profSet = new Set(proficientSkills);
  const manual = (override ?? []).filter((s) => profSet.has(s));
  const uniqueManual = [...new Set(manual)].slice(0, need);
  if (uniqueManual.length >= need) return uniqueManual;
  const auto = pickDefaultExpertise(classLabel, level, proficientSkills);
  const merged = [...uniqueManual];
  for (const s of auto) {
    if (merged.length >= need) break;
    if (!merged.includes(s)) merged.push(s);
  }
  return merged.slice(0, need);
}
