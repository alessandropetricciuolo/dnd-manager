import {
  deriveCharacterSheetRules,
  lookupClassRule5e,
} from "@/lib/character-rules-calc";
import {
  readCharacterSheetSnapshot,
  resolveCharacterSpellSlots,
  resolveEffectiveCharacterFields,
  type CharacterAbilityKey,
  type CharacterSheetCheck,
  type CharacterSheetPersonality,
  type CharacterSheetV1,
  type CharacterSkillKey,
} from "@/lib/character-sheet";
import type {
  GmDefinedFeatureInput,
  SaveLongCharacterSheetInput,
} from "@/lib/character-sheet-mutations";

export const LONG_SHEET_LIST_KEYS = [
  "inventory",
  "languages",
  "proficiencies",
  "armorProficiencies",
  "weaponProficiencies",
  "toolProficiencies",
  "attunements",
] as const;

export type LongSheetListKey = (typeof LONG_SHEET_LIST_KEYS)[number];
export type LongSheetListDrafts = Record<LongSheetListKey, string>;

export type LongSheetEditorInitialState = {
  sheet: CharacterSheetV1;
  name: string;
  classLabel: string;
  classSubclass: string;
  level: string;
  armorClass: string;
  hpMax: string;
  background: string;
  listDrafts: LongSheetListDrafts;
  trackedFeatures: GmDefinedFeatureInput[];
};

export function splitMultilineSheetList(raw: string): string[] | undefined {
  const items = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

export function parseOptionalFiniteNumber(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const result = Number(trimmed);
  return Number.isFinite(result) ? result : undefined;
}

export function parseOptionalStrictInt(raw: string): { ok: true; value: number | undefined } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: undefined };
  if (!/^[+-]?\d+$/.test(trimmed)) return { ok: false };
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed)) return { ok: false };
  return { ok: true, value: parsed };
}

function readExistingTrackedFeatures(rawSnapshot: unknown): GmDefinedFeatureInput[] {
  const snapshot = readCharacterSheetSnapshot(rawSnapshot);
  if (!Array.isArray(snapshot.features)) return [];
  return snapshot.features.flatMap((item, idx) => {
    if (!item || typeof item !== "object") return [];
    const f = item as Record<string, unknown>;
    if (typeof f.name !== "string" || !f.name.trim() || typeof f.usesMax !== "number" || !Number.isInteger(f.usesMax)) {
      return [];
    }
    const sourceRaw = String(f.source ?? "class");
    const source = (["class", "subclass", "race", "feat", "background"].includes(sourceRaw)
      ? sourceRaw
      : "class") as GmDefinedFeatureInput["source"];
    const resetOn = f.resetOn === "shortRest" ? "shortRest" : "longRest";
    return [
      {
        id: typeof f.id === "string" && f.id.trim() ? f.id.trim() : `feat-${idx + 1}`,
        name: f.name.trim(),
        source,
        description: typeof f.description === "string" ? f.description : "",
        usesMax: f.usesMax,
        resetOn,
      },
    ];
  });
}

export function createInitialLongEditorState(character: {
  name: string;
  character_class?: string | null;
  class_subclass?: string | null;
  level?: number | null;
  armor_class?: number | null;
  background?: string | null;
  race_slug?: string | null;
  subclass_slug?: string | null;
  rules_snapshot?: unknown;
}): LongSheetEditorInitialState {
  const effective = resolveEffectiveCharacterFields(character);
  const rawSnapshot = readCharacterSheetSnapshot(character.rules_snapshot);
  const previous = effective.sheet;
  const existingSlots = resolveCharacterSpellSlots(character.rules_snapshot);
  const slotRecord: Partial<Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number>> = {};
  for (const entry of existingSlots) {
    if (entry.level >= 1 && entry.level <= 9) {
      slotRecord[entry.level as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9] = entry.count;
    }
  }

  const legacyPersonality =
    rawSnapshot.personality && typeof rawSnapshot.personality === "object" && !Array.isArray(rawSnapshot.personality)
      ? (rawSnapshot.personality as CharacterSheetPersonality)
      : undefined;

  let sheet: CharacterSheetV1 = {
    ...(previous ?? {}),
    version: 1,
    source: previous?.source === "recovered" ? "recovered" : "manual",
    characterName: effective.name || character.name,
    classLabel: effective.characterClass ?? undefined,
    classSubclass: effective.classSubclass ?? undefined,
    level: previous?.source === "recovered" ? previous.level : (effective.level ?? undefined),
    ...(effective.armorClass !== null ? { armorClass: effective.armorClass } : { armorClass: undefined }),
    ...(effective.maxHp !== null ? { hpMax: effective.maxHp } : { hpMax: undefined }),
    ...(Object.keys(slotRecord).length > 0 ? { spellSlots: slotRecord } : {}),
    ...(previous?.personality ?? legacyPersonality ? { personality: previous?.personality ?? legacyPersonality } : {}),
  };

  if (sheet.source === "manual") {
    sheet = deriveCharacterSheetRules(sheet, {
      characterClass: effective.characterClass,
      classSubclass: effective.classSubclass,
      raceSlugOrLabel: character.race_slug ?? sheet.raceLabel,
      subraceSlugOrLabel: character.subclass_slug ?? sheet.subraceLabel,
      level: effective.level ?? 1,
      applyClassSaveDefaults: previous?.savingThrows === undefined,
    });
  }

  const listDrafts: LongSheetListDrafts = {
    inventory: (previous?.inventory ?? []).join("\n"),
    languages: (previous?.languages ?? []).join("\n"),
    proficiencies: (previous?.proficiencies ?? []).join("\n"),
    armorProficiencies: (previous?.armorProficiencies ?? []).join("\n"),
    weaponProficiencies: (previous?.weaponProficiencies ?? []).join("\n"),
    toolProficiencies: (previous?.toolProficiencies ?? []).join("\n"),
    attunements: (previous?.attunements ?? []).join("\n"),
  };

  return {
    sheet,
    name: effective.name || character.name,
    classLabel: effective.characterClass ?? "",
    classSubclass: effective.classSubclass ?? "",
    level: effective.level !== null ? String(effective.level) : "1",
    armorClass: effective.armorClass !== null ? String(effective.armorClass) : "",
    hpMax: effective.maxHp !== null ? String(effective.maxHp) : "",
    background: character.background ?? "",
    listDrafts,
    trackedFeatures: readExistingTrackedFeatures(character.rules_snapshot),
  };
}

/**
 * Updates a saving throw or skill check.
 * Supports toggling proficiency/expertise even before a manual value was typed,
 * setting bonusExtra, clearing explicit values with "", and preserving explicit 0.
 */
export function applySheetCheckUpdate<K extends CharacterAbilityKey | CharacterSkillKey>(
  currentGroup: Partial<Record<K, CharacterSheetCheck>> | undefined,
  key: K,
  field: "value" | "proficient" | "expertise" | "bonusExtra",
  raw: string | boolean,
  baseModifier = 0,
  proficiencyBonus = 2,
): Partial<Record<K, CharacterSheetCheck>> | undefined {
  const current = { ...(currentGroup ?? {}) } as Partial<Record<K, CharacterSheetCheck>>;
  const existing = current[key];

  if (field === "value") {
    const str = String(raw).trim();
    if (str === "") {
      delete current[key];
      return Object.keys(current).length > 0 ? current : undefined;
    }
    const parsed = parseOptionalFiniteNumber(str);
    if (parsed === undefined) {
      return Object.keys(current).length > 0 ? current : undefined;
    }
    current[key] = {
      value: parsed,
      ...(existing?.proficient === undefined ? {} : { proficient: existing.proficient }),
      ...(existing?.expertise === undefined ? {} : { expertise: existing.expertise }),
      ...(existing?.bonusExtra === undefined ? {} : { bonusExtra: existing.bonusExtra }),
    };
    return current;
  }

  const proficient =
    field === "proficient"
      ? Boolean(raw)
      : field === "expertise" && Boolean(raw)
        ? true
        : Boolean(existing?.proficient);
  const expertise =
    field === "expertise"
      ? Boolean(raw)
      : field === "proficient" && !Boolean(raw)
        ? false
        : Boolean(existing?.expertise);
  const bonusExtra =
    field === "bonusExtra" ? parseOptionalFiniteNumber(String(raw)) : existing?.bonusExtra;

  const profPart = expertise ? 2 * proficiencyBonus : proficient ? proficiencyBonus : 0;
  const computedValue = baseModifier + profPart + (bonusExtra ?? 0);

  current[key] = {
    value: computedValue,
    proficient,
    ...(expertise ? { expertise: true } : {}),
    ...(bonusExtra !== undefined && bonusExtra !== 0 ? { bonusExtra } : {}),
  };
  return current;
}

export function applyClassDefaultSavingThrows(
  sheet: CharacterSheetV1,
  nextClassLabel: string,
  level: number,
): CharacterSheetV1 {
  const rule = lookupClassRule5e(nextClassLabel, sheet.classSubclass, level);
  if (!rule) return sheet;
  const saves: Partial<Record<CharacterAbilityKey, CharacterSheetCheck>> = {};
  for (const ab of ["str", "dex", "con", "int", "wis", "cha"] as const) {
    const prev = sheet.savingThrows?.[ab];
    saves[ab] = {
      value: prev?.value ?? 0,
      proficient: rule.savingThrows.includes(ab),
      ...(prev?.expertise ? { expertise: true } : {}),
      ...(prev?.bonusExtra ? { bonusExtra: prev.bonusExtra } : {}),
    };
  }
  return deriveCharacterSheetRules(
    { ...sheet, savingThrows: saves },
    { characterClass: nextClassLabel, classSubclass: sheet.classSubclass, level },
  );
}

export function buildLongSheetSubmission(params: {
  expectedUpdatedAt: string;
  sheet: CharacterSheetV1;
  name: string;
  classLabel: string;
  classSubclass: string;
  level: string;
  armorClass: string;
  hpMax: string;
  background: string;
  listDrafts: LongSheetListDrafts;
  trackedFeatures?: GmDefinedFeatureInput[];
}): { ok: true; payload: SaveLongCharacterSheetInput } | { ok: false; error: string } {
  const trimmedName = params.name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Il nome è obbligatorio." };
  }

  const levelParsed = parseOptionalStrictInt(params.level);
  if (
    !levelParsed.ok ||
    (levelParsed.value !== undefined && (levelParsed.value < 1 || levelParsed.value > 20))
  ) {
    return { ok: false, error: "Inserisci un livello intero da 1 a 20." };
  }

  const acParsed = parseOptionalStrictInt(params.armorClass);
  if (
    !acParsed.ok ||
    (acParsed.value !== undefined && (acParsed.value < 0 || acParsed.value > 1000))
  ) {
    return { ok: false, error: "Inserisci una Classe Armatura intera valida (≥ 0) oppure lascia vuoto." };
  }

  const hpMaxParsed = parseOptionalStrictInt(params.hpMax);
  if (
    !hpMaxParsed.ok ||
    (hpMaxParsed.value !== undefined && (hpMaxParsed.value < 0 || hpMaxParsed.value > 100000))
  ) {
    return { ok: false, error: "Inserisci PF massimi interi validi (≥ 0) oppure lascia vuoto." };
  }

  if (params.trackedFeatures) {
    for (const feat of params.trackedFeatures) {
      if (!feat.name.trim()) {
        return { ok: false, error: "Ogni capacità a usi deve avere un nome." };
      }
      if (!Number.isInteger(feat.usesMax) || feat.usesMax < 1 || feat.usesMax > 999) {
        return { ok: false, error: `Usi massimi non validi per «${feat.name}» (1–999).` };
      }
    }
  }

  let nextSheet: CharacterSheetV1 = {
    ...params.sheet,
    version: 1,
    source: params.sheet.source === "recovered" ? "recovered" : "manual",
    characterName: trimmedName,
  };

  if (params.classLabel.trim()) nextSheet.classLabel = params.classLabel.trim();
  else delete nextSheet.classLabel;

  if (params.classSubclass.trim()) nextSheet.classSubclass = params.classSubclass.trim();
  else delete nextSheet.classSubclass;

  const effectiveLvl = levelParsed.value ?? 1;
  if (nextSheet.source === "recovered") {
    if (params.sheet.level !== undefined) nextSheet.level = params.sheet.level;
    else delete nextSheet.level;
  } else if (levelParsed.value !== undefined) {
    nextSheet.level = levelParsed.value;
  } else {
    delete nextSheet.level;
  }

  for (const listKey of LONG_SHEET_LIST_KEYS) {
    const normalized = splitMultilineSheetList(params.listDrafts[listKey] ?? "");
    if (normalized) nextSheet[listKey] = normalized;
    else delete nextSheet[listKey];
  }

  if (nextSheet.attunements && nextSheet.attunements.length > 3) {
    return { ok: false, error: "In D&D 5e puoi sintonizzare al massimo 3 oggetti magici contemporaneamente." };
  }

  if (nextSheet.personality) {
    const cleanedP: CharacterSheetPersonality = {};
    for (const k of ["traits", "ideals", "bonds", "flaws"] as const) {
      const v = nextSheet.personality[k]?.trim();
      if (v) cleanedP[k] = v;
    }
    if (Object.keys(cleanedP).length > 0) nextSheet.personality = cleanedP;
    else delete nextSheet.personality;
  }

  if (nextSheet.source === "manual") {
    nextSheet = deriveCharacterSheetRules(nextSheet, {
      characterClass: params.classLabel.trim() || null,
      classSubclass: params.classSubclass.trim() || null,
      level: effectiveLvl,
    });
  }

  if (acParsed.value !== undefined) nextSheet.armorClass = acParsed.value;
  else delete nextSheet.armorClass;

  if (hpMaxParsed.value !== undefined) nextSheet.hpMax = hpMaxParsed.value;
  else delete nextSheet.hpMax;

  if (nextSheet.spellSlots && Object.keys(nextSheet.spellSlots).length === 0) {
    delete nextSheet.spellSlots;
  }

  return {
    ok: true,
    payload: {
      expectedUpdatedAt: params.expectedUpdatedAt,
      character_sheet: nextSheet,
      identity: {
        name: trimmedName,
        character_class: params.classLabel.trim() || null,
        class_subclass: params.classSubclass.trim() || null,
        ...(levelParsed.value !== undefined ? { level: levelParsed.value } : {}),
        armor_class: acParsed.value ?? null,
        max_hp: hpMaxParsed.value ?? null,
        background: params.background.trim() || null,
      },
      ...(params.trackedFeatures !== undefined ? { trackedFeatures: params.trackedFeatures } : {}),
    },
  };
}
