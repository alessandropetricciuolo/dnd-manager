import type { CharacterRulesSnapshotV1 } from "@/lib/character-rules-snapshot";
import { deriveCharacterSheetRules } from "@/lib/character-rules-calc";
import {
  isCharacterSheetV1,
  mergeCharacterSheetIntoSnapshot,
  syncCharacterSheetWithRegistry,
  type CharacterSheetV1,
} from "@/lib/character-sheet";

const RUNTIME_SNAPSHOT_KEYS = [
  "inspiration",
  "temp_hp",
  "hit_dice",
  "features",
  "usedSpellSlots",
  "death_saves",
  "exhaustion",
  "personality",
] as const;

export function nextMonotonicTimestamp(previousIso: string): string {
  const prevMs = Date.parse(previousIso);
  return new Date(Math.max(Date.now(), Number.isFinite(prevMs) ? prevMs + 1 : Date.now())).toISOString();
}

/** Recomputing derived rules must not erase the sheet or the player's live resources. */
export function mergeRecomputedSnapshot(
  computed: CharacterRulesSnapshotV1,
  previous: unknown,
): CharacterRulesSnapshotV1 & Record<string, unknown> {
  const prior = previous && typeof previous === "object" && !Array.isArray(previous)
    ? (previous as Record<string, unknown>)
    : {};
  const merged: Record<string, unknown> = { ...prior, ...computed };
  for (const key of RUNTIME_SNAPSHOT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(prior, key)) merged[key] = prior[key];
  }
  if (Object.prototype.hasOwnProperty.call(prior, "max_hp")) merged.max_hp = prior.max_hp;
  if (Object.prototype.hasOwnProperty.call(prior, "character_sheet")) merged.character_sheet = prior.character_sheet;
  return merged as CharacterRulesSnapshotV1 & Record<string, unknown>;
}

export function spellSlotsForRulesSnapshot(
  sheet: CharacterSheetV1,
): Array<{ level: number; count: number }> | undefined {
  if (!sheet.spellSlots) return undefined;
  return Object.entries(sheet.spellSlots)
    .flatMap(([levelRaw, count]) => {
      const level = Number(levelRaw);
      return Number.isInteger(level) && level >= 1 && level <= 9 && typeof count === "number" && Number.isInteger(count) && count >= 0
        ? [{ level, count }]
        : [];
    })
    .sort((a, b) => a.level - b.level);
}

export function validateCharacterLevelAndSubclass(params: {
  isLong: boolean;
  isCreate: boolean;
  prevLevel: number;
  levelRaw: string;
  classSubclass: string | null;
}): { ok: true; level: number } | { ok: false; error: string } {
  const { isLong, isCreate, prevLevel, levelRaw, classSubclass } = params;
  let nextLevel = isCreate ? 1 : prevLevel;
  if (levelRaw !== "") {
    const parsed = Number.parseInt(levelRaw, 10);
    if (!/^\d+$/.test(levelRaw) || Number.isNaN(parsed) || parsed < 1 || parsed > 20) {
      return { ok: false, error: "Livello non valido (consentito: 1-20)." };
    }
    if (!isCreate && !isLong && parsed < prevLevel) {
      return { ok: false, error: "Puoi solo aumentare manualmente il livello del personaggio." };
    }
    nextLevel = parsed;
  }
  if (!isLong && nextLevel >= 3 && !classSubclass?.trim()) {
    return { ok: false, error: "Dal livello 3 in poi seleziona una sottoclasse." };
  }
  return { ok: true, level: nextLevel };
}

export type GmDefinedFeatureInput = {
  id: string;
  name: string;
  source: "class" | "subclass" | "race" | "feat" | "background";
  description: string;
  usesMax: number;
  resetOn: "shortRest" | "longRest";
};

export type SaveLongCharacterSheetIdentity = {
  name: string;
  character_class?: string | null;
  class_subclass?: string | null;
  level?: number;
  armor_class?: number | null;
  max_hp?: number | null;
  background?: string | null;
};

export type SaveLongCharacterSheetInput = {
  expectedUpdatedAt: string;
  character_sheet: CharacterSheetV1;
  identity: SaveLongCharacterSheetIdentity;
  trackedFeatures?: GmDefinedFeatureInput[];
};

export type ExistingLongCharacterRecord = {
  name: string;
  character_class: string | null;
  class_subclass?: string | null;
  level: number;
  armor_class?: number | null;
  background: string | null;
  rules_snapshot?: unknown;
  updated_at: string;
};

function sanitizeGmFeatures(
  inputs: GmDefinedFeatureInput[],
  existingFeatures: unknown,
): Array<Record<string, unknown>> | null {
  if (!Array.isArray(inputs) || inputs.length > 80) return null;
  const existingById = new Map<string, Record<string, unknown>>();
  if (Array.isArray(existingFeatures)) {
    for (const f of existingFeatures) {
      if (f && typeof f === "object" && typeof (f as Record<string, unknown>).id === "string") {
        existingById.set((f as Record<string, unknown>).id as string, f as Record<string, unknown>);
      }
    }
  }
  const allowedSources = new Set(["class", "subclass", "race", "feat", "background"]);
  const allowedResets = new Set(["shortRest", "longRest"]);
  const out: Array<Record<string, unknown>> = [];

  for (let i = 0; i < inputs.length; i += 1) {
    const raw = inputs[i];
    if (!raw || typeof raw !== "object") return null;
    const name = typeof raw.name === "string" ? raw.name.trim() : "";
    if (!name || name.length > 160) return null;
    const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim().slice(0, 120) : `feat-${i + 1}`;
    const source = allowedSources.has(raw.source) ? raw.source : "class";
    const description = typeof raw.description === "string" ? raw.description.trim().slice(0, 4000) : "";
    const usesMax = raw.usesMax;
    if (!Number.isInteger(usesMax) || usesMax < 1 || usesMax > 999) return null;
    const resetOn = allowedResets.has(raw.resetOn) ? raw.resetOn : "longRest";

    const prior = existingById.get(id);
    const priorCurrent = prior && typeof prior.usesCurrent === "number" && Number.isInteger(prior.usesCurrent)
      ? Math.max(0, Math.min(usesMax, prior.usesCurrent))
      : usesMax;

    out.push({
      id,
      name,
      source,
      description,
      usesMax,
      usesCurrent: priorCurrent,
      resetOn,
    });
  }
  return out;
}

export function prepareLongCharacterSheetPatch(
  existing: ExistingLongCharacterRecord,
  payload: SaveLongCharacterSheetInput,
): { ok: true; patch: Record<string, unknown> } | { ok: false; error: string } {
  if (
    !payload ||
    typeof payload !== "object" ||
    !payload.identity ||
    !isCharacterSheetV1(payload.character_sheet) ||
    !["manual", "recovered"].includes(payload.character_sheet.source)
  ) {
    return { ok: false, error: "Dati della scheda manuale non validi." };
  }
  const { expectedUpdatedAt, identity } = payload;
  if (
    typeof expectedUpdatedAt !== "string" ||
    !Number.isFinite(Date.parse(expectedUpdatedAt)) ||
    typeof identity.name !== "string" ||
    !identity.name.trim()
  ) {
    return { ok: false, error: "Nome o revisione della scheda non validi." };
  }
  if (existing.updated_at !== expectedUpdatedAt) {
    return {
      ok: false,
      error: "La scheda è stata aggiornata su un altro dispositivo. Ricaricala prima di salvare.",
    };
  }

  const nextLevel = identity.level ?? existing.level;
  if (!Number.isInteger(nextLevel) || nextLevel < 1 || nextLevel > 20) {
    return { ok: false, error: "Livello non valido (1–20)." };
  }

  const nextAc =
    identity.armor_class !== undefined
      ? identity.armor_class
      : (payload.character_sheet.armorClass ?? existing.armor_class ?? null);
  const nextMaxHp =
    identity.max_hp !== undefined
      ? identity.max_hp
      : (payload.character_sheet.hpMax ?? null);

  if (nextAc !== null && (!Number.isInteger(nextAc) || nextAc < 0 || nextAc > 1000)) {
    return { ok: false, error: "CA non valida." };
  }
  if (nextMaxHp !== null && (!Number.isInteger(nextMaxHp) || nextMaxHp < 0 || nextMaxHp > 100000)) {
    return { ok: false, error: "PF massimi non validi." };
  }

  const existingSnapshot =
    existing.rules_snapshot && typeof existing.rules_snapshot === "object" && !Array.isArray(existing.rules_snapshot)
      ? (existing.rules_snapshot as Record<string, unknown>)
      : {};
  const previousSheet = isCharacterSheetV1(existingSnapshot.character_sheet)
    ? existingSnapshot.character_sheet
    : null;

  if (payload.character_sheet.source === "recovered" && previousSheet?.source !== "recovered") {
    return { ok: false, error: "La provenienza recuperata non corrisponde alla scheda attuale." };
  }
  if (previousSheet?.source === "recovered" && payload.character_sheet.source !== "recovered") {
    return {
      ok: false,
      error: "La scheda proviene da un PDF recuperato. Conferma prima la corrispondenza dei dati.",
    };
  }

  const nextClass =
    identity.character_class === undefined
      ? existing.character_class
      : (identity.character_class?.trim() || null);
  const nextSubclass =
    identity.class_subclass === undefined
      ? (existing.class_subclass ?? null)
      : (identity.class_subclass?.trim() || null);

  let nextSheet: CharacterSheetV1 = syncCharacterSheetWithRegistry(
    { ...payload.character_sheet },
    {
      name: identity.name.trim(),
      character_class: nextClass,
      class_subclass: nextSubclass,
      armor_class: nextAc,
      level: nextLevel,
    },
  );
  if (nextSheet.source === "manual") {
    nextSheet = deriveCharacterSheetRules(nextSheet, {
      characterClass: nextClass,
      classSubclass: nextSubclass,
      level: nextLevel,
    });
  }
  if (nextMaxHp !== null) {
    nextSheet = { ...nextSheet, hpMax: nextMaxHp };
  } else {
    const copy = { ...nextSheet };
    delete copy.hpMax;
    nextSheet = copy;
  }

  const nextSnapshot = mergeCharacterSheetIntoSnapshot(existingSnapshot, nextSheet);
  if (nextMaxHp !== null) {
    nextSnapshot.max_hp = nextMaxHp;
  } else {
    delete nextSnapshot.max_hp;
  }

  if (nextSheet.personality && Object.keys(nextSheet.personality).length > 0) {
    nextSnapshot.personality = nextSheet.personality;
  }

  // Synchronize runtime hit_dice when GM specifies/derives hitDie + hitDiceTotal
  if (nextSheet.hitDie && typeof nextSheet.hitDiceTotal === "number" && Number.isInteger(nextSheet.hitDiceTotal)) {
    const prevHd =
      existingSnapshot.hit_dice && typeof existingSnapshot.hit_dice === "object" && !Array.isArray(existingSnapshot.hit_dice)
        ? (existingSnapshot.hit_dice as Record<string, unknown>)
        : null;
    const prevSpent =
      prevHd && typeof prevHd.total === "number" && typeof prevHd.current === "number"
        ? Math.max(0, prevHd.total - prevHd.current)
        : 0;
    nextSnapshot.hit_dice = {
      die: nextSheet.hitDie,
      total: nextSheet.hitDiceTotal,
      current: Math.max(0, nextSheet.hitDiceTotal - prevSpent),
    };
  }

  if (payload.trackedFeatures !== undefined) {
    const sanitizedFeatures = sanitizeGmFeatures(payload.trackedFeatures, existingSnapshot.features);
    if (!sanitizedFeatures) {
      return { ok: false, error: "Capacità a usi non valide." };
    }
    if (sanitizedFeatures.length > 0) {
      nextSnapshot.features = sanitizedFeatures;
    } else {
      delete nextSnapshot.features;
    }
  }

  const spellSlots = spellSlotsForRulesSnapshot(nextSheet);
  if (spellSlots !== undefined && spellSlots.length > 0) {
    nextSnapshot.spellSlots = spellSlots;
  } else if (previousSheet?.spellSlots !== undefined || nextSheet.source === "manual") {
    delete nextSnapshot.spellSlots;
  }

  const patch: Record<string, unknown> = {
    name: identity.name.trim(),
    character_class: nextClass,
    class_subclass: nextSubclass,
    level: nextLevel,
    armor_class: nextAc,
    background: identity.background === undefined ? existing.background : identity.background,
    rules_snapshot: nextSnapshot,
    updated_at: nextMonotonicTimestamp(expectedUpdatedAt),
  };

  return { ok: true, patch };
}

export type LevelUpCharacterRow = {
  id?: string;
  campaign_id: string;
  name?: string;
  level: number | null;
  character_class?: string | null;
  class_subclass?: string | null;
  armor_class?: number | null;
  race_slug?: string | null;
  subclass_slug?: string | null;
  background_slug?: string | null;
  rules_snapshot?: unknown;
  updated_at: string;
};

export type LevelUpCharacterDependencies = {
  getCharacter(id: string): Promise<LevelUpCharacterRow | null>;
  getCampaignType(campaignId: string): Promise<string | null>;
  recomputeSnapshot(input: {
    campaignId: string;
    level: number;
    characterClass: string | null;
    classSubclass: string | null;
    raceSlug: string | null;
    subclassSlug: string | null;
    backgroundSlug: string | null;
  }): Promise<CharacterRulesSnapshotV1>;
  compareAndSwap(
    id: string,
    expectedUpdatedAt: string,
    patch: { level: number; rules_snapshot: Record<string, unknown>; updated_at: string },
  ): Promise<{ id: string } | null>;
};

function hasSameBuildInputs(a: LevelUpCharacterRow, b: LevelUpCharacterRow): boolean {
  return (
    (a.level ?? 1) === (b.level ?? 1) &&
    (a.character_class ?? null) === (b.character_class ?? null) &&
    (a.class_subclass ?? null) === (b.class_subclass ?? null) &&
    (a.race_slug ?? null) === (b.race_slug ?? null) &&
    (a.subclass_slug ?? null) === (b.subclass_slug ?? null) &&
    (a.background_slug ?? null) === (b.background_slug ?? null)
  );
}

function mergeLevelUpIntoRow(
  recomputedSnapshot: CharacterRulesSnapshotV1,
  targetRow: LevelUpCharacterRow,
  newLevel: number,
): Record<string, unknown> {
  const merged = mergeRecomputedSnapshot(recomputedSnapshot, targetRow.rules_snapshot);
  if (isCharacterSheetV1(merged.character_sheet) && merged.character_sheet.source !== "recovered") {
    const prevTotalHd = merged.character_sheet.hitDiceTotal;
    const derivedSheet = deriveCharacterSheetRules(
      { ...merged.character_sheet, level: newLevel },
      {
        characterClass: targetRow.character_class ?? merged.character_sheet.classLabel ?? null,
        classSubclass: targetRow.class_subclass ?? merged.character_sheet.classSubclass ?? null,
        level: newLevel,
      },
    );
    merged.character_sheet = derivedSheet;

    const derivedSlots = spellSlotsForRulesSnapshot(derivedSheet);
    if (derivedSlots !== undefined) {
      merged.spellSlots = derivedSlots;
    }

    if (derivedSheet.hitDie && typeof derivedSheet.hitDiceTotal === "number") {
      const prevHd =
        merged.hit_dice && typeof merged.hit_dice === "object" && !Array.isArray(merged.hit_dice)
          ? (merged.hit_dice as Record<string, unknown>)
          : null;
      const gain = Math.max(0, derivedSheet.hitDiceTotal - (prevTotalHd ?? newLevel - 1));
      const nextCurrent =
        prevHd && typeof prevHd.current === "number" && Number.isInteger(prevHd.current)
          ? Math.min(derivedSheet.hitDiceTotal, prevHd.current + (gain || 1))
          : derivedSheet.hitDiceTotal;
      merged.hit_dice = {
        die: derivedSheet.hitDie,
        total: derivedSheet.hitDiceTotal,
        current: nextCurrent,
      };
    }
  } else if (merged.hit_dice && typeof merged.hit_dice === "object" && !Array.isArray(merged.hit_dice)) {
    const hd = merged.hit_dice as Record<string, unknown>;
    if (typeof hd.total === "number" && typeof hd.current === "number") {
      merged.hit_dice = { ...hd, total: hd.total + 1, current: hd.current + 1 };
    }
  }
  return merged;
}

/**
 * Performs level-up with compare-and-swap on updated_at so concurrent player resource
 * saves during rule recomputation are never silently overwritten.
 */
export async function executeLevelUpCharacterWithCas(
  characterId: string,
  deps: LevelUpCharacterDependencies,
): Promise<
  | { success: true; data: { campaignId: string; newLevel: number } }
  | { success: false; error: string; conflict?: boolean }
> {
  const row = await deps.getCharacter(characterId);
  if (!row) {
    return { success: false, error: "Personaggio non trovato." };
  }

  const currentLevel = typeof row.level === "number" ? row.level : 1;
  if (currentLevel >= 20) {
    return { success: false, error: "Il personaggio è già al livello massimo." };
  }

  const campaignType = await deps.getCampaignType(row.campaign_id);
  const isLong = campaignType === "long";
  const newLevel = currentLevel + 1;
  const classSubclass = row.class_subclass ?? null;
  if (!isLong && newLevel >= 3 && !classSubclass?.trim()) {
    return {
      success: false,
      error:
        "Per passare al livello 3 o superiore devi prima selezionare la sottoclasse nella modifica del personaggio.",
    };
  }

  const recomputedSnapshot = await deps.recomputeSnapshot({
    campaignId: row.campaign_id,
    level: newLevel,
    characterClass: row.character_class ?? null,
    classSubclass,
    raceSlug: row.race_slug ?? null,
    subclassSlug: row.subclass_slug ?? null,
    backgroundSlug: row.background_slug ?? null,
  });

  const firstMerged = mergeLevelUpIntoRow(recomputedSnapshot, row, newLevel);
  const firstSaved = await deps.compareAndSwap(characterId, row.updated_at, {
    level: newLevel,
    rules_snapshot: firstMerged,
    updated_at: nextMonotonicTimestamp(row.updated_at),
  });
  if (firstSaved) {
    return { success: true, data: { campaignId: row.campaign_id, newLevel } };
  }

  const latest = await deps.getCharacter(characterId);
  if (latest && hasSameBuildInputs(row, latest)) {
    const secondMerged = mergeLevelUpIntoRow(recomputedSnapshot, latest, newLevel);
    const secondSaved = await deps.compareAndSwap(characterId, latest.updated_at, {
      level: newLevel,
      rules_snapshot: secondMerged,
      updated_at: nextMonotonicTimestamp(latest.updated_at),
    });
    if (secondSaved) {
      return { success: true, data: { campaignId: row.campaign_id, newLevel } };
    }
  }

  return {
    success: false,
    conflict: true,
    error: "La scheda è cambiata durante il passaggio di livello. Ricarica la pagina e riprova.",
  };
}
