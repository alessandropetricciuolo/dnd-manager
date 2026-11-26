/** Shared persisted sheet contract. Optional fields mean the source did not provide them. */
export type CharacterAbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type CharacterSkillKey =
  | "acrobatics" | "animal_handling" | "arcana" | "athletics" | "deception" | "history"
  | "insight" | "intimidation" | "investigation" | "medicine" | "nature" | "perception"
  | "performance" | "persuasion" | "religion" | "sleight_of_hand" | "stealth" | "survival";

export type CharacterSheetWeapon = { name: string; toHit: string; damage: string; type: string; itemId?: string };

const SPELL_ORIGINS = ["class", "subclass", "race", "feat", "item", "pact", "arcanum"] as const;
export type CharacterSheetSpellOrigin = (typeof SPELL_ORIGINS)[number];

export type CharacterSheetSpell = {
  level: number;
  name: string;
  summary: string;
  prepared?: boolean;
  ritual?: boolean;
  concentration?: boolean;
  verbal?: boolean;
  somatic?: boolean;
  material?: boolean;
  /** Testo completo dal manuale per consultazione e stampa. */
  fullTextMd?: string | null;
  origin?: CharacterSheetSpellOrigin;
  /** Fonte leggibile, per esempio "Elfo alto" o "Dominio della Vita". */
  sourceLabel?: string;
  ability?: CharacterAbilityKey;
  /** Non conta nel limite di incantesimi preparati giornalieri. */
  alwaysPrepared?: boolean;
  /** Limite indipendente dagli slot, per esempio "1/riposo lungo". */
  usesPerRest?: string;
  requiresSlot?: boolean;
  /** Livello effettivo di lancio se fissato dalla fonte. */
  castAtLevel?: number;
  castingTimeOverride?: string;
  rangeOverride?: string;
};
export type CharacterSheetCheck = {
  value: number;
  proficient?: boolean;
  expertise?: boolean;
  bonusExtra?: number;
};

export type CharacterSheetPersonality = {
  traits?: string;
  ideals?: string;
  bonds?: string;
  flaws?: string;
};

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
  jackOfAllTrades?: boolean;
  passivePerception?: number;
  passivePerceptionBonus?: number;
  speed?: string;
  armorClass?: number;
  initiative?: number;
  initiativeBonus?: number;
  hpMax?: number;
  hitDie?: string;
  hitDiceTotal?: number;
  manualHitDiceOverride?: boolean;
  weaponRows?: CharacterSheetWeapon[];
  inventory?: string[];
  languages?: string[];
  proficiencies?: string[];
  armorProficiencies?: string[];
  weaponProficiencies?: string[];
  toolProficiencies?: string[];
  senses?: string | null;
  resistances?: string | null;
  attunements?: string[];
  personality?: CharacterSheetPersonality;
  playerNotes?: string | null;
  raceTraitsMd?: string;
  subraceTraitsMd?: string | null;
  classFeaturesMd?: string;
  subclassFeaturesMd?: string | null;
  backgroundMd?: string | null;
  spellcastingClass?: string | null;
  spellcastingAbility?: CharacterAbilityKey | null;
  spellSaveDc?: number | null;
  spellDcBonus?: number;
  spellAttackBonus?: number | null;
  spellAttackBonusExtra?: number;
  spellSlots?: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>>;
  manualSpellSlotsOverride?: boolean;
  cantripsKnown?: number;
  spellsPrepared?: number;
  spells?: CharacterSheetSpell[];
};

export type CharacterRulesSnapshot = Record<string, unknown> & {
  character_sheet?: CharacterSheetV1;
};

const SPELL_FLAG_FIELDS = [
  "prepared", "ritual", "concentration", "verbal", "somatic", "material", "alwaysPrepared", "requiresSlot",
] as const;
const SPELL_TEXT_FIELDS = ["sourceLabel", "usesPerRest", "castingTimeOverride", "rangeOverride"] as const;
const SPELL_FIELDS = new Set<string>([
  "level", "name", "summary", "fullTextMd", "origin", "ability", "castAtLevel", ...SPELL_FLAG_FIELDS, ...SPELL_TEXT_FIELDS,
]);

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
  const textFields = [
    "characterName", "raceLabel", "subraceLabel", "classLabel", "classSubclass", "backgroundLabel",
    "alignment", "age", "height", "weight", "sex", "speed", "hitDie", "senses", "resistances", "playerNotes",
    "raceTraitsMd", "subraceTraitsMd", "classFeaturesMd", "subclassFeaturesMd", "backgroundMd", "spellcastingClass",
  ];
  for (const key of textFields) {
    const item = sheet[key];
    if (item !== undefined && item !== null && (typeof item !== "string" || item.length > 40_000)) return false;
  }
  for (const boolKey of ["jackOfAllTrades", "manualHitDiceOverride", "manualSpellSlotsOverride"]) {
    if (sheet[boolKey] !== undefined && typeof sheet[boolKey] !== "boolean") return false;
  }
  const bounded = (key: string, min: number, max: number) => sheet[key] === undefined || sheet[key] === null ||
    (typeof sheet[key] === "number" && Number.isFinite(sheet[key]) && Number(sheet[key]) >= min && Number(sheet[key]) <= max);
  for (const key of ["level", "hitDiceTotal", "proficiencyBonus", "passivePerception", "cantripsKnown", "spellsPrepared"]) {
    if (!bounded(key, 0, 200)) return false;
  }
  for (const bonusKey of ["passivePerceptionBonus", "initiativeBonus", "spellDcBonus", "spellAttackBonusExtra"]) {
    if (!bounded(bonusKey, -100, 100)) return false;
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
      return item !== null && typeof item === "object" && Number.isFinite(item.value) &&
        (item.proficient === undefined || typeof item.proficient === "boolean") &&
        (item.expertise === undefined || typeof item.expertise === "boolean") &&
        (item.bonusExtra === undefined || (typeof item.bonusExtra === "number" && Number.isFinite(item.bonusExtra) && item.bonusExtra >= -100 && item.bonusExtra <= 100)) &&
        Object.keys(item).every((field) => ["value", "proficient", "expertise", "bonusExtra"].includes(field)) &&
        (key !== "savingThrows" || abilityKeys.includes(name));
    });
  };
  if (!checks("savingThrows") || !checks("skills")) return false;
  for (const key of ["inventory", "languages", "proficiencies", "armorProficiencies", "weaponProficiencies", "toolProficiencies", "attunements"]) {
    if (sheet[key] !== undefined && (!Array.isArray(sheet[key]) || (sheet[key] as unknown[]).length > 500 || !(sheet[key] as unknown[]).every((entry) => typeof entry === "string" && entry.length <= 2000))) return false;
  }
  if (sheet.personality !== undefined) {
    const p = sheet.personality;
    if (!p || typeof p !== "object" || Array.isArray(p) ||
        Object.entries(p as Record<string, unknown>).some(([k, v]) => !["traits", "ideals", "bonds", "flaws"].includes(k) || (v !== undefined && (typeof v !== "string" || v.length > 10_000)))) {
      return false;
    }
  }
  if (sheet.weaponRows !== undefined && (!Array.isArray(sheet.weaponRows) || (sheet.weaponRows as unknown[]).length > 100 || !(sheet.weaponRows as unknown[]).every((row) => {
    if (!row || typeof row !== "object") return false;
    const item = row as Record<string, unknown>;
    const requiredFields = ["name", "toHit", "damage", "type"];
    return requiredFields.every((key) => typeof item[key] === "string" && (item[key] as string).length <= 1000) &&
      (item.itemId === undefined || (typeof item.itemId === "string" && item.itemId.length <= 1000)) &&
      Object.keys(item).every((key) => requiredFields.includes(key) || key === "itemId");
  }))) return false;
  if (sheet.spells !== undefined && (!Array.isArray(sheet.spells) || (sheet.spells as unknown[]).length > 500 || !(sheet.spells as unknown[]).every((spell) => {
    if (!spell || typeof spell !== "object") return false;
    const item = spell as Record<string, unknown>;
    return Number.isInteger(item.level) && Number(item.level) >= 0 && Number(item.level) <= 9 &&
      typeof item.name === "string" && item.name.length <= 300 && typeof item.summary === "string" && item.summary.length <= 5000 &&
      SPELL_FLAG_FIELDS.every((key) => item[key] === undefined || typeof item[key] === "boolean") &&
      SPELL_TEXT_FIELDS.every((key) => item[key] === undefined || (typeof item[key] === "string" && item[key].length <= 1000)) &&
      (item.origin === undefined || SPELL_ORIGINS.some((origin) => origin === item.origin)) &&
      (item.ability === undefined || abilityKeys.some((ability) => ability === item.ability)) &&
      (item.castAtLevel === undefined || (Number.isInteger(item.castAtLevel) && Number(item.castAtLevel) >= 0 && Number(item.castAtLevel) <= 9)) &&
      (item.fullTextMd === undefined || item.fullTextMd === null || (typeof item.fullTextMd === "string" && item.fullTextMd.length <= 40_000)) &&
      Object.keys(item).every((key) => SPELL_FIELDS.has(key));
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

export function readCharacterSheetSnapshot(raw: unknown): Record<string, unknown> {
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? { ...(parsed as Record<string, unknown>) }
        : {};
    } catch {
      return {};
    }
  }
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {};
}

export function readCharacterSheetV1(rawSnapshot: unknown): CharacterSheetV1 | null {
  const snapshot = readCharacterSheetSnapshot(rawSnapshot);
  return isCharacterSheetV1(snapshot.character_sheet) ? snapshot.character_sheet : null;
}

/** Canonical Max HP: character_sheet.hpMax prevails over legacy rules_snapshot.max_hp. */
export function resolveCharacterMaxHp(rawSnapshot: unknown): number | null {
  const snapshot = readCharacterSheetSnapshot(rawSnapshot);
  const sheet = isCharacterSheetV1(snapshot.character_sheet) ? snapshot.character_sheet : null;
  if (typeof sheet?.hpMax === "number" && Number.isInteger(sheet.hpMax) && sheet.hpMax >= 0) {
    return sheet.hpMax;
  }
  if (typeof snapshot.max_hp === "number" && Number.isInteger(snapshot.max_hp) && snapshot.max_hp >= 0) {
    return snapshot.max_hp;
  }
  return null;
}

export function resolveCharacterHitDice(rawSnapshot: unknown): {
  total: number;
  current: number;
  die: string;
} | undefined {
  const snapshot = readCharacterSheetSnapshot(rawSnapshot);
  const runtime = snapshot.hit_dice && typeof snapshot.hit_dice === "object" && !Array.isArray(snapshot.hit_dice)
    ? (snapshot.hit_dice as Record<string, unknown>)
    : null;
  const sheet = isCharacterSheetV1(snapshot.character_sheet) ? snapshot.character_sheet : null;
  const total = typeof runtime?.total === "number" && Number.isInteger(runtime.total) && runtime.total >= 0
    ? runtime.total
    : typeof sheet?.hitDiceTotal === "number" && Number.isInteger(sheet.hitDiceTotal) && sheet.hitDiceTotal >= 0
      ? sheet.hitDiceTotal
      : undefined;
  const die = typeof runtime?.die === "string" && runtime.die.trim()
    ? runtime.die.trim()
    : typeof sheet?.hitDie === "string" && sheet.hitDie.trim()
      ? sheet.hitDie.trim()
      : undefined;
  if (total === undefined || !die) return undefined;
  if (typeof runtime?.current === "number" && Number.isInteger(runtime.current) && runtime.current >= 0) {
    return { total, current: Math.min(total, runtime.current), die };
  }
  if (!runtime && (sheet?.source === "generator" || sheet?.source === "manual")) {
    return { total, current: total, die };
  }
  return undefined;
}

export function resolveCharacterSpellSlots(
  rawSnapshot: unknown,
): Array<{ level: number; count: number }> {
  const snapshot = readCharacterSheetSnapshot(rawSnapshot);
  const sheet = isCharacterSheetV1(snapshot.character_sheet) ? snapshot.character_sheet : null;
  if (sheet?.spellSlots !== undefined) {
    return Object.entries(sheet.spellSlots)
      .flatMap(([levelRaw, countRaw]) => {
        const level = Number(levelRaw);
        return Number.isInteger(level) && level >= 1 && level <= 9 && typeof countRaw === "number" && Number.isInteger(countRaw) && countRaw >= 0
          ? [{ level, count: countRaw }]
          : [];
      })
      .sort((a, b) => a.level - b.level);
  }
  if (Array.isArray(snapshot.spellSlots)) {
    return snapshot.spellSlots
      .flatMap((slot) => {
        if (!slot || typeof slot !== "object") return [];
        const item = slot as Record<string, unknown>;
        const level = item.level;
        const count = item.count;
        return typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 9 &&
          typeof count === "number" && Number.isInteger(count) && count >= 0
          ? [{ level, count }]
          : [];
      })
      .sort((a, b) => a.level - b.level);
  }
  return [];
}

export type EffectiveCharacterFields = {
  name: string;
  characterClass: string | null;
  classSubclass: string | null;
  level: number | null;
  recoveredPdfLevel: number | null;
  hasRecoveredLevelMismatch: boolean;
  armorClass: number | null;
  hitPoints: number | null;
  maxHp: number | null;
  sheet: CharacterSheetV1 | null;
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boundedIntOrNull(value: unknown, min: number, max: number): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max
    ? value
    : null;
}

/**
 * Shared source-of-truth resolution across Web, iOS, Android, and server validation:
 * - Registry columns (name, character_class, class_subclass, armor_class, level) prevail,
 *   falling back to character_sheet when absent/null.
 * - character_sheet.hpMax prevails for max HP, falling back to rules_snapshot.max_hp.
 * - Unverified recovered PDF level discrepancies remain explicit and inspectable.
 */
export function resolveEffectiveCharacterFields(row: {
  name?: string | null;
  character_class?: string | null;
  class_subclass?: string | null;
  level?: number | null;
  armor_class?: number | null;
  hit_points?: number | null;
  rules_snapshot?: unknown;
}): EffectiveCharacterFields {
  const sheet = readCharacterSheetV1(row.rules_snapshot);
  const registryLevel = boundedIntOrNull(row.level, 1, 20);
  const sheetLevel = boundedIntOrNull(sheet?.level, 1, 20);
  const recoveredPdfLevel = sheet?.source === "recovered" ? sheetLevel : null;
  const hasRecoveredLevelMismatch =
    sheet?.source === "recovered" &&
    sheetLevel !== null &&
    registryLevel !== null &&
    sheetLevel !== registryLevel;

  return {
    name: nonEmptyString(row.name) ?? nonEmptyString(sheet?.characterName) ?? "",
    characterClass: nonEmptyString(row.character_class) ?? nonEmptyString(sheet?.classLabel) ?? null,
    classSubclass: nonEmptyString(row.class_subclass) ?? nonEmptyString(sheet?.classSubclass) ?? null,
    level: registryLevel ?? sheetLevel ?? null,
    recoveredPdfLevel,
    hasRecoveredLevelMismatch,
    armorClass: boundedIntOrNull(row.armor_class, 0, 1000) ?? boundedIntOrNull(sheet?.armorClass, 0, 1000) ?? null,
    hitPoints: boundedIntOrNull(row.hit_points, 0, 100000),
    maxHp: resolveCharacterMaxHp(row.rules_snapshot),
    sheet,
  };
}

/**
 * Keeps character_sheet identity/combat fields aligned when the GM updates the character
 * via "Modifica personaggio", while preserving unverified recovered PDF level.
 */
export function syncCharacterSheetWithRegistry(
  sheet: CharacterSheetV1,
  registry: {
    name: string;
    character_class: string | null;
    class_subclass: string | null;
    armor_class: number | null;
    level: number;
  },
): CharacterSheetV1 {
  const next: CharacterSheetV1 = {
    ...sheet,
    characterName: registry.name.trim(),
  };
  const cls = nonEmptyString(registry.character_class);
  if (cls) next.classLabel = cls;
  else delete next.classLabel;

  const sub = nonEmptyString(registry.class_subclass);
  if (sub) next.classSubclass = sub;
  else delete next.classSubclass;

  if (registry.armor_class !== null && Number.isInteger(registry.armor_class) && registry.armor_class >= 0) {
    next.armorClass = registry.armor_class;
  } else {
    delete next.armorClass;
  }

  if (sheet.source !== "recovered") {
    next.level = registry.level;
  }
  return next;
}
