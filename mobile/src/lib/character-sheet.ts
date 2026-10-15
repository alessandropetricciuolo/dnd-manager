/** Shared persisted sheet contract. Optional fields mean the source did not provide them. */
export type CharacterAbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type CharacterSkillKey =
  | "acrobatics" | "animal_handling" | "arcana" | "athletics" | "deception" | "history"
  | "insight" | "intimidation" | "investigation" | "medicine" | "nature" | "perception"
  | "performance" | "persuasion" | "religion" | "sleight_of_hand" | "stealth" | "survival";

export type CharacterSheetWeapon = { name: string; toHit: string; damage: string; type: string };
export type CharacterSheetSpell = {
  level: number;
  name: string;
  summary: string;
  ritual?: boolean;
  concentration?: boolean;
  verbal?: boolean;
  somatic?: boolean;
  material?: boolean;
  fullTextMd?: string | null;
};
export type CharacterSheetCheck = { value: number; proficient?: boolean; expertise?: boolean };

/**
 * Stored at rules_snapshot.character_sheet. It intentionally mirrors the generator's
 * actual output so no generated detail is lost when the PDF is saved. For manual long
 * campaign sheets, leave unknown fields absent instead of manufacturing values.
 */
export type CharacterSheetV1 = {
  version: 1;
  source: "generator" | "manual" | "recovered";
  recovery?: { sourceFile?: string; sha256?: string; recoveredAt?: string };
  characterName?: string;
  raceLabel?: string;
  subraceLabel?: string | null;
  classLabel?: string;
  classSubclass?: string | null;
  backgroundLabel?: string;
  level?: number;
  alignment?: string | null;
  age?: string | null;
  height?: string | null;
  weight?: string | null;
  sex?: string | null;
  abilities?: Partial<Record<CharacterAbilityKey, number>>;
  abilityMods?: Partial<Record<CharacterAbilityKey, number>>;
  proficiencyBonus?: number;
  savingThrows?: Partial<Record<CharacterAbilityKey, CharacterSheetCheck>>;
  skills?: Partial<Record<CharacterSkillKey, CharacterSheetCheck>>;
  passivePerception?: number;
  speed?: string;
  armorClass?: number;
  initiative?: number;
  hpMax?: number;
  hitDie?: string;
  hitDiceTotal?: number;
  weaponRows?: CharacterSheetWeapon[];
  inventory?: string[];
  languages?: string[];
  proficiencies?: string[];
  armorProficiencies?: string[];
  weaponProficiencies?: string[];
  toolProficiencies?: string[];
  raceTraitsMd?: string;
  subraceTraitsMd?: string | null;
  classFeaturesMd?: string;
  subclassFeaturesMd?: string | null;
  backgroundMd?: string | null;
  spellcastingClass?: string | null;
  spellcastingAbility?: CharacterAbilityKey | null;
  spellSaveDc?: number | null;
  spellAttackBonus?: number | null;
  spellSlots?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>>;
  cantripsKnown?: number;
  spellsPrepared?: number;
  spells?: CharacterSheetSpell[];
};

export type CharacterRulesSnapshot = Record<string, unknown> & {
  character_sheet?: CharacterSheetV1;
};

export function createCharacterSheetV1(
  source: CharacterSheetV1["source"],
  fields: Omit<CharacterSheetV1, "version" | "source">,
): CharacterSheetV1 {
  return { ...fields, version: 1, source };
}

export function isCharacterSheetV1(value: unknown): value is CharacterSheetV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const sheet = value as Record<string, unknown>;
  if (sheet.version !== 1 || !["generator", "manual", "recovered"].includes(String(sheet.source))) return false;
  try { if (JSON.stringify(sheet).length > 512_000) return false; } catch { return false; }
  const textFields = ["characterName", "raceLabel", "subraceLabel", "classLabel", "classSubclass", "backgroundLabel", "alignment", "age", "height", "weight", "sex", "speed", "hitDie", "raceTraitsMd", "subraceTraitsMd", "classFeaturesMd", "subclassFeaturesMd", "backgroundMd", "spellcastingClass"];
  for (const key of textFields) {
    const item = sheet[key];
    if (item !== undefined && item !== null && (typeof item !== "string" || item.length > 40_000)) return false;
  }
  const bounded = (key: string, min: number, max: number) => sheet[key] === undefined || sheet[key] === null ||
    (typeof sheet[key] === "number" && Number.isFinite(sheet[key]) && Number(sheet[key]) >= min && Number(sheet[key]) <= max);
  for (const key of ["level", "hitDiceTotal", "proficiencyBonus", "passivePerception", "cantripsKnown", "spellsPrepared"]) {
    if (!bounded(key, 0, 100)) return false;
  }
  if (!bounded("level", 1, 20) || !bounded("hpMax", 0, 100000) || !bounded("armorClass", 0, 1000) ||
      !bounded("initiative", -100, 100) || !bounded("spellSaveDc", 0, 1000) || !bounded("spellAttackBonus", -100, 1000)) return false;
  const abilityKeys = ["str", "dex", "con", "int", "wis", "cha"];
  for (const key of ["abilities", "abilityMods"] as const) {
    const map = sheet[key];
    if (map !== undefined) {
      if (!map || typeof map !== "object" || Array.isArray(map) || Object.keys(map).some((item) => !abilityKeys.includes(item))) return false;
      if (Object.values(map as Record<string, unknown>).some((item) => typeof item !== "number" || !Number.isFinite(item) || item < -100 || item > 100)) return false;
    }
  }
  if (sheet.spellcastingAbility !== undefined && sheet.spellcastingAbility !== null && !abilityKeys.includes(String(sheet.spellcastingAbility))) return false;
  const checks = (key: "savingThrows" | "skills") => {
    const map = sheet[key];
    if (map === undefined) return true;
    if (!map || typeof map !== "object" || Array.isArray(map)) return false;
    return Object.entries(map as Record<string, unknown>).every(([name, raw]) => {
      const item = raw as Record<string, unknown> | null;
      return item !== null && typeof item === "object" && Number.isFinite(item.value) && (item.proficient === undefined || typeof item.proficient === "boolean") &&
        (item.expertise === undefined || typeof item.expertise === "boolean") && Object.keys(item).every((field) => ["value", "proficient", "expertise"].includes(field)) &&
        (key !== "savingThrows" || abilityKeys.includes(name));
    });
  };
  if (!checks("savingThrows") || !checks("skills")) return false;
  for (const key of ["inventory", "languages", "proficiencies", "armorProficiencies", "weaponProficiencies", "toolProficiencies"]) {
    if (sheet[key] !== undefined && (!Array.isArray(sheet[key]) || (sheet[key] as unknown[]).length > 500 || !(sheet[key] as unknown[]).every((entry) => typeof entry === "string" && entry.length <= 2000))) return false;
  }
  if (sheet.weaponRows !== undefined && (!Array.isArray(sheet.weaponRows) || (sheet.weaponRows as unknown[]).length > 100 || !(sheet.weaponRows as unknown[]).every((row) => {
    if (!row || typeof row !== "object") return false;
    const item = row as Record<string, unknown>;
    return ["name", "toHit", "damage", "type"].every((key) => typeof item[key] === "string" && (item[key] as string).length <= 1000) && Object.keys(item).every((key) => ["name", "toHit", "damage", "type"].includes(key));
  }))) return false;
  if (sheet.spells !== undefined && (!Array.isArray(sheet.spells) || (sheet.spells as unknown[]).length > 500 || !(sheet.spells as unknown[]).every((spell) => {
    if (!spell || typeof spell !== "object") return false;
    const item = spell as Record<string, unknown>;
    return Number.isInteger(item.level) && Number(item.level) >= 0 && Number(item.level) <= 9 &&
      typeof item.name === "string" && item.name.length <= 300 && typeof item.summary === "string" && item.summary.length <= 5000 &&
      ["ritual", "concentration", "verbal", "somatic", "material"].every((key) => item[key] === undefined || typeof item[key] === "boolean") &&
      (item.fullTextMd === undefined || item.fullTextMd === null || (typeof item.fullTextMd === "string" && item.fullTextMd.length <= 40_000)) &&
      Object.keys(item).every((key) => ["level", "name", "summary", "ritual", "concentration", "verbal", "somatic", "material", "fullTextMd"].includes(key));
  }))) return false;
  if (sheet.spellSlots !== undefined) {
    const slots = sheet.spellSlots;
    if (!slots || typeof slots !== "object" || Array.isArray(slots) || Object.entries(slots).some(([level, count]) => !/^[1-9]$/.test(level) || !Number.isInteger(count) || Number(count) < 0 || Number(count) > 100)) return false;
  }
  if (sheet.recovery !== undefined) {
    const recovery = sheet.recovery;
    if (!recovery || typeof recovery !== "object" || Array.isArray(recovery) || Object.entries(recovery).some(([key, item]) => !["sourceFile", "sha256", "recoveredAt"].includes(key) || typeof item !== "string" || item.length > 1000)) return false;
  }
  return true;
}

/** Preserves live resources and all unrelated snapshot metadata during sheet edits. */
export function mergeCharacterSheetIntoSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
  sheet: CharacterSheetV1,
): CharacterRulesSnapshot {
  return { ...(snapshot ?? {}), character_sheet: sheet };
}
