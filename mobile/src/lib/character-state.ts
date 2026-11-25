import {
  createCharacterSheetV1,
  isCharacterSheetV1,
  resolveCharacterMaxHp,
  type CharacterSheetPersonality,
  type CharacterSheetSpell,
  type CharacterSheetV1,
  type CharacterSheetWeapon,
} from "./character-sheet";
import { isShortRestPactCaster } from "./character-rules-calc";

export type MobileCharacterOperation =
  | { type: "hp"; hitPoints: number; tempHp?: number }
  | { type: "toggleInspiration" }
  | { type: "spendHitDie"; count: number }
  | { type: "useFeature"; featureId: string }
  | { type: "restoreFeature"; featureId: string }
  | { type: "shortRest" }
  | { type: "shortRestHitDie"; hitPoints: number }
  | { type: "spellSlot"; level: number; usedCount: number }
  | { type: "coins"; gp: number; sp: number; cp: number }
  | { type: "deathSaves"; successes: number; failures: number }
  | { type: "exhaustion"; level: number }
  | { type: "longRest" }
  | { type: "upsertWeapon"; index?: number; weapon: CharacterSheetWeapon }
  | { type: "removeWeapon"; index: number }
  | { type: "upsertSpell"; index?: number; spell: CharacterSheetSpell }
  | { type: "removeSpell"; index: number }
  | { type: "toggleSpellPrepared"; index: number }
  | { type: "updateInventory"; items: string[] }
  | {
      type: "updateBioNotes";
      personality?: CharacterSheetPersonality;
      playerNotes?: string | null;
    };

const LONG_CAMPAIGN_ONLY_OPERATIONS = new Set<MobileCharacterOperation["type"]>([
  "upsertWeapon",
  "removeWeapon",
  "upsertSpell",
  "removeSpell",
  "toggleSpellPrepared",
  "updateInventory",
  "updateBioNotes",
]);

export function isLongOnlyCharacterOperation(operation: MobileCharacterOperation): boolean {
  return LONG_CAMPAIGN_ONLY_OPERATIONS.has(operation.type);
}

type Snapshot = Record<string, any>;
export type MobileCharacterState = {
  hit_points: number | null;
  rules_snapshot: Snapshot | null;
  coins_gp: number | null;
  coins_sp: number | null;
  coins_cp: number | null;
  character_class?: string | null;
};

export function canEditMobileCharacter(
  identity: { userId: string; profileRole?: string | null; campaignGmId?: string | null },
  assignedTo: string | null,
): boolean {
  return (
    assignedTo === identity.userId ||
    identity.profileRole === "admin" ||
    identity.profileRole === "gm" ||
    identity.campaignGmId === identity.userId
  );
}

export function hasExpectedCharacterRevision(expected: string, current: string | null): boolean {
  return Boolean(current) && expected === current;
}

const boundedInt = (value: unknown, min: number, max: number, label: string) => {
  if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
    throw new Error(`invalid_${label}`);
  }
  return value as number;
};

const exactKeys = (value: Record<string, unknown>, allowed: string[]) =>
  Object.keys(value).length === allowed.length && Object.keys(value).every((key) => allowed.includes(key));

const subsetKeys = (value: Record<string, unknown>, required: string[], optional: string[]) => {
  const keys = Object.keys(value);
  return (
    required.every((k) => keys.includes(k)) &&
    keys.every((k) => required.includes(k) || optional.includes(k))
  );
};

/** Prefer the persisted character-sheet contract; legacy runtime fields are a fallback. */
function maxHpFor(snapshot: Snapshot): number | null {
  return resolveCharacterMaxHp(snapshot);
}

function hitDiceFor(snapshot: Snapshot) {
  const runtime = snapshot.hit_dice && typeof snapshot.hit_dice === "object" ? snapshot.hit_dice : {};
  const sheet = snapshot.character_sheet && typeof snapshot.character_sheet === "object" ? snapshot.character_sheet : {};
  const freshSheetRuntime = !snapshot.hit_dice && (sheet.source === "generator" || sheet.source === "manual");
  return {
    ...runtime,
    ...(Number.isInteger(runtime.total) ? {} : Number.isInteger(sheet.hitDiceTotal) ? { total: sheet.hitDiceTotal } : {}),
    ...(typeof runtime.die === "string" ? {} : typeof sheet.hitDie === "string" ? { die: sheet.hitDie } : {}),
    ...(runtime.current === undefined && freshSheetRuntime && Number.isInteger(sheet.hitDiceTotal)
      ? { current: sheet.hitDiceTotal }
      : {}),
  };
}

function spellSlotFor(snapshot: Snapshot, level: number): Snapshot | null {
  const nestedSlots = snapshot.character_sheet?.spellSlots;
  const count = nestedSlots?.[level];
  if (Number.isInteger(count) && count >= 0) return { level, count };
  const runtime = Array.isArray(snapshot.spellSlots)
    ? snapshot.spellSlots.find((item: Snapshot) => item?.level === level)
    : undefined;
  return runtime ?? null;
}

function ensureEditableSheet(snapshot: Snapshot): CharacterSheetV1 {
  if (isCharacterSheetV1(snapshot.character_sheet)) {
    return { ...snapshot.character_sheet };
  }
  return createCharacterSheetV1("manual", {});
}

function shouldResetSpellSlotsOnShortRest(row: MobileCharacterState, snapshot: Snapshot): boolean {
  const sheet = isCharacterSheetV1(snapshot.character_sheet) ? snapshot.character_sheet : null;
  return isShortRestPactCaster(
    row.character_class ?? sheet?.classLabel ?? snapshot.classLabel,
    sheet?.spellcastingClass,
  );
}

export function applyMobileCharacterOperation(
  row: MobileCharacterState,
  operation: MobileCharacterOperation,
): MobileCharacterState {
  const snapshot: Snapshot = { ...(row.rules_snapshot ?? {}) };
  let hit_points: number | null =
    typeof row.hit_points === "number" && Number.isInteger(row.hit_points) ? row.hit_points : null;
  let coins_gp: number | null =
    typeof row.coins_gp === "number" && Number.isInteger(row.coins_gp) ? row.coins_gp : null;
  let coins_sp: number | null =
    typeof row.coins_sp === "number" && Number.isInteger(row.coins_sp) ? row.coins_sp : null;
  let coins_cp: number | null =
    typeof row.coins_cp === "number" && Number.isInteger(row.coins_cp) ? row.coins_cp : null;

  switch (operation.type) {
    case "hp": {
      const maxHp = maxHpFor(snapshot);
      if (maxHp === null) throw new Error("max_hp_unavailable");
      hit_points = boundedInt(operation.hitPoints, 0, maxHp, "hp");
      if (operation.tempHp !== undefined) snapshot.temp_hp = boundedInt(operation.tempHp, 0, 1000000, "temp_hp");
      if (hit_points > 0) snapshot.death_saves = { successes: 0, failures: 0 };
      break;
    }
    case "toggleInspiration":
      snapshot.inspiration = !Boolean(snapshot.inspiration);
      break;
    case "spendHitDie": {
      const dice = hitDiceFor(snapshot);
      const total = Number.isInteger(dice.total) ? dice.total : 0;
      const current = Number.isInteger(dice.current) ? dice.current : 0;
      if (total < 1) throw new Error("hit_dice_unavailable");
      const count = boundedInt(operation.count, 1, total, "hit_dice");
      if (current < count) throw new Error("hit_dice_unavailable");
      snapshot.hit_dice = { ...dice, current: Math.max(0, current - count) };
      break;
    }
    case "useFeature": {
      if (!operation.featureId || operation.featureId.length > 120) throw new Error("invalid_feature");
      let found = false;
      snapshot.features = (Array.isArray(snapshot.features) ? snapshot.features : []).map((feature: Snapshot) => {
        if (feature?.id !== operation.featureId || feature.usesMax === undefined) return feature;
        found = true;
        const max = Number.isInteger(feature.usesMax) ? feature.usesMax : 0;
        const current = Number.isInteger(feature.usesCurrent) ? feature.usesCurrent : max;
        return { ...feature, usesCurrent: Math.max(0, current - 1) };
      });
      if (!found) throw new Error("feature_unavailable");
      break;
    }
    case "restoreFeature": {
      if (!operation.featureId || operation.featureId.length > 120) throw new Error("invalid_feature");
      let found = false;
      snapshot.features = (Array.isArray(snapshot.features) ? snapshot.features : []).map((feature: Snapshot) => {
        if (feature?.id !== operation.featureId || !Number.isInteger(feature.usesMax)) return feature;
        found = true;
        const current = Number.isInteger(feature.usesCurrent) ? feature.usesCurrent : 0;
        return { ...feature, usesCurrent: Math.min(feature.usesMax, current + 1) };
      });
      if (!found) throw new Error("feature_unavailable");
      break;
    }
    case "shortRest":
      snapshot.features = (Array.isArray(snapshot.features) ? snapshot.features : []).map((feature: Snapshot) =>
        feature?.resetOn === "shortRest" && Number.isInteger(feature.usesMax)
          ? { ...feature, usesCurrent: Math.max(0, feature.usesMax) }
          : feature,
      );
      if (shouldResetSpellSlotsOnShortRest(row, snapshot)) {
        snapshot.usedSpellSlots = {};
      }
      break;
    case "shortRestHitDie": {
      const maxHp = maxHpFor(snapshot);
      if (maxHp === null) throw new Error("max_hp_unavailable");
      const dice = hitDiceFor(snapshot);
      const total = Number.isInteger(dice.total) ? dice.total : 0;
      const current = Number.isInteger(dice.current) ? dice.current : 0;
      if (current < 1 || total < 1 || current > total) throw new Error("hit_dice_unavailable");
      hit_points = boundedInt(operation.hitPoints, 0, maxHp, "hp");
      snapshot.hit_dice = { ...dice, current: current - 1 };
      snapshot.features = (Array.isArray(snapshot.features) ? snapshot.features : []).map((feature: Snapshot) =>
        feature?.resetOn === "shortRest" && Number.isInteger(feature.usesMax)
          ? { ...feature, usesCurrent: Math.max(0, feature.usesMax) }
          : feature,
      );
      if (shouldResetSpellSlotsOnShortRest(row, snapshot)) {
        snapshot.usedSpellSlots = {};
      }
      if (hit_points > 0) snapshot.death_saves = { successes: 0, failures: 0 };
      break;
    }
    case "spellSlot": {
      const level = boundedInt(operation.level, 1, 9, "spell_level");
      const slot = spellSlotFor(snapshot, level);
      if (!slot) throw new Error("spell_slot_unavailable");
      const used = boundedInt(operation.usedCount, 0, Number.isInteger(slot.count) ? slot.count : 0, "spell_slot");
      snapshot.usedSpellSlots = { ...(snapshot.usedSpellSlots ?? {}), [level]: used };
      break;
    }
    case "coins":
      coins_gp = boundedInt(operation.gp, 0, 100000000, "coins");
      coins_sp = boundedInt(operation.sp, 0, 100000000, "coins");
      coins_cp = boundedInt(operation.cp, 0, 100000000, "coins");
      break;
    case "deathSaves":
      snapshot.death_saves = {
        successes: boundedInt(operation.successes, 0, 3, "death_saves"),
        failures: boundedInt(operation.failures, 0, 3, "death_saves"),
      };
      break;
    case "exhaustion":
      snapshot.exhaustion = boundedInt(operation.level, 0, 6, "exhaustion");
      break;
    case "longRest": {
      const maxHp = maxHpFor(snapshot);
      if (maxHp === null) throw new Error("max_hp_unavailable");
      hit_points = maxHp;
      snapshot.temp_hp = 0;
      snapshot.death_saves = { successes: 0, failures: 0 };
      snapshot.usedSpellSlots = {};
      if (Number.isInteger(snapshot.exhaustion) && snapshot.exhaustion > 0) {
        snapshot.exhaustion = snapshot.exhaustion - 1;
      }
      const dice = hitDiceFor(snapshot);
      if (
        Number.isInteger(dice.total) &&
        Number.isInteger(dice.current) &&
        dice.total >= 0 &&
        dice.current >= 0 &&
        dice.current <= dice.total
      ) {
        snapshot.hit_dice = {
          ...dice,
          current: Math.min(dice.total, dice.current + Math.max(1, Math.floor(dice.total / 2))),
        };
      }
      snapshot.features = (Array.isArray(snapshot.features) ? snapshot.features : []).map((feature: Snapshot) =>
        Number.isInteger(feature?.usesMax) ? { ...feature, usesCurrent: Math.max(0, feature.usesMax) } : feature,
      );
      break;
    }
    case "upsertWeapon": {
      const sheet = ensureEditableSheet(snapshot);
      const w = operation.weapon;
      const clean: CharacterSheetWeapon = {
        name: w.name.trim(),
        toHit: w.toHit.trim(),
        damage: w.damage.trim(),
        type: w.type.trim(),
      };
      if (!clean.name || clean.name.length > 200 || clean.toHit.length > 100 || clean.damage.length > 200 || clean.type.length > 100) {
        throw new Error("invalid_weapon");
      }
      const rows = [...(sheet.weaponRows ?? [])];
      if (operation.index !== undefined) {
        const idx = boundedInt(operation.index, 0, Math.max(0, rows.length - 1), "weapon_index");
        if (rows.length === 0) throw new Error("invalid_weapon_index");
        rows[idx] = clean;
      } else {
        if (rows.length >= 100) throw new Error("weapons_limit_reached");
        rows.push(clean);
      }
      sheet.weaponRows = rows;
      if (!isCharacterSheetV1(sheet)) throw new Error("invalid_weapon");
      snapshot.character_sheet = sheet;
      break;
    }
    case "removeWeapon": {
      const sheet = ensureEditableSheet(snapshot);
      const rows = [...(sheet.weaponRows ?? [])];
      if (rows.length === 0) throw new Error("invalid_weapon_index");
      const idx = boundedInt(operation.index, 0, rows.length - 1, "weapon_index");
      rows.splice(idx, 1);
      if (rows.length > 0) sheet.weaponRows = rows;
      else delete sheet.weaponRows;
      snapshot.character_sheet = sheet;
      break;
    }
    case "upsertSpell": {
      const sheet = ensureEditableSheet(snapshot);
      const sp = operation.spell;
      const lvl = boundedInt(sp.level, 0, 9, "spell_level");
      const name = sp.name.trim();
      const summary = sp.summary.trim();
      if (!name || name.length > 300 || summary.length > 5000) throw new Error("invalid_spell");
      if (sp.fullTextMd !== undefined && sp.fullTextMd !== null && sp.fullTextMd.length > 40_000) {
        throw new Error("invalid_spell");
      }
      const cleanSpell: CharacterSheetSpell = {
        level: lvl,
        name,
        summary,
        ...(sp.prepared === undefined ? {} : { prepared: Boolean(sp.prepared) }),
        ...(sp.ritual === undefined ? {} : { ritual: Boolean(sp.ritual) }),
        ...(sp.concentration === undefined ? {} : { concentration: Boolean(sp.concentration) }),
        ...(sp.verbal === undefined ? {} : { verbal: Boolean(sp.verbal) }),
        ...(sp.somatic === undefined ? {} : { somatic: Boolean(sp.somatic) }),
        ...(sp.material === undefined ? {} : { material: Boolean(sp.material) }),
        ...(sp.fullTextMd === undefined ? {} : { fullTextMd: sp.fullTextMd }),
      };
      const spells = [...(sheet.spells ?? [])];
      if (operation.index !== undefined) {
        if (spells.length === 0) throw new Error("invalid_spell_index");
        const idx = boundedInt(operation.index, 0, spells.length - 1, "spell_index");
        spells[idx] = cleanSpell;
      } else {
        if (spells.length >= 500) throw new Error("spells_limit_reached");
        spells.push(cleanSpell);
        spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "it"));
      }
      sheet.spells = spells;
      if (!isCharacterSheetV1(sheet)) throw new Error("invalid_spell");
      snapshot.character_sheet = sheet;
      break;
    }
    case "removeSpell": {
      const sheet = ensureEditableSheet(snapshot);
      const spells = [...(sheet.spells ?? [])];
      if (spells.length === 0) throw new Error("invalid_spell_index");
      const idx = boundedInt(operation.index, 0, spells.length - 1, "spell_index");
      spells.splice(idx, 1);
      if (spells.length > 0) sheet.spells = spells;
      else delete sheet.spells;
      snapshot.character_sheet = sheet;
      break;
    }
    case "toggleSpellPrepared": {
      const sheet = ensureEditableSheet(snapshot);
      const spells = [...(sheet.spells ?? [])];
      if (spells.length === 0) throw new Error("invalid_spell_index");
      const idx = boundedInt(operation.index, 0, spells.length - 1, "spell_index");
      const target = spells[idx]!;
      spells[idx] = { ...target, prepared: !Boolean(target.prepared) };
      sheet.spells = spells;
      snapshot.character_sheet = sheet;
      break;
    }
    case "updateInventory": {
      const sheet = ensureEditableSheet(snapshot);
      if (!Array.isArray(operation.items) || operation.items.length > 500) {
        throw new Error("invalid_inventory");
      }
      const cleaned = operation.items
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
      if (cleaned.some((item) => item.length > 2000)) throw new Error("invalid_inventory");
      if (cleaned.length > 0) sheet.inventory = cleaned;
      else delete sheet.inventory;
      if (!isCharacterSheetV1(sheet)) throw new Error("invalid_inventory");
      snapshot.character_sheet = sheet;
      break;
    }
    case "updateBioNotes": {
      const sheet = ensureEditableSheet(snapshot);
      if (operation.personality !== undefined) {
        const p = operation.personality;
        const nextP: CharacterSheetPersonality = {};
        for (const k of ["traits", "ideals", "bonds", "flaws"] as const) {
          const v = p[k]?.trim();
          if (v) {
            if (v.length > 10_000) throw new Error("invalid_bio_notes");
            nextP[k] = v;
          }
        }
        if (Object.keys(nextP).length > 0) {
          sheet.personality = nextP;
          snapshot.personality = nextP;
        } else {
          delete sheet.personality;
          delete snapshot.personality;
        }
      }
      if (operation.playerNotes !== undefined) {
        const notes = operation.playerNotes?.trim() ?? "";
        if (notes.length > 40_000) throw new Error("invalid_bio_notes");
        if (notes) sheet.playerNotes = notes;
        else delete sheet.playerNotes;
      }
      if (!isCharacterSheetV1(sheet)) throw new Error("invalid_bio_notes");
      snapshot.character_sheet = sheet;
      break;
    }
    default: {
      const exhaustive: never = operation;
      throw new Error(`unsupported_operation:${String(exhaustive)}`);
    }
  }

  return { hit_points, rules_snapshot: snapshot, coins_gp, coins_sp, coins_cp };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isMobileCharacterOperation(value: unknown): value is MobileCharacterOperation {
  if (!isPlainRecord(value)) return false;
  const operation = value;
  const number = (key: string) => typeof operation[key] === "number" && Number.isFinite(operation[key]);
  switch (operation.type) {
    case "hp":
      return (
        exactKeys(operation, operation.tempHp === undefined ? ["type", "hitPoints"] : ["type", "hitPoints", "tempHp"]) &&
        number("hitPoints") &&
        (operation.tempHp === undefined || number("tempHp"))
      );
    case "toggleInspiration":
    case "shortRest":
    case "longRest":
      return exactKeys(operation, ["type"]);
    case "shortRestHitDie":
      return exactKeys(operation, ["type", "hitPoints"]) && number("hitPoints");
    case "spendHitDie":
      return exactKeys(operation, ["type", "count"]) && number("count");
    case "useFeature":
    case "restoreFeature":
      return exactKeys(operation, ["type", "featureId"]) && typeof operation.featureId === "string";
    case "spellSlot":
      return exactKeys(operation, ["type", "level", "usedCount"]) && number("level") && number("usedCount");
    case "coins":
      return exactKeys(operation, ["type", "gp", "sp", "cp"]) && number("gp") && number("sp") && number("cp");
    case "deathSaves":
      return exactKeys(operation, ["type", "successes", "failures"]) && number("successes") && number("failures");
    case "exhaustion":
      return (
        exactKeys(operation, ["type", "level"]) &&
        number("level") &&
        (operation.level as number) >= 0 &&
        (operation.level as number) <= 6
      );
    case "upsertWeapon": {
      if (!subsetKeys(operation, ["type", "weapon"], ["index"])) return false;
      if (operation.index !== undefined && !number("index")) return false;
      if (!isPlainRecord(operation.weapon)) return false;
      const w = operation.weapon;
      return (
        exactKeys(w, ["name", "toHit", "damage", "type"]) &&
        ["name", "toHit", "damage", "type"].every((k) => typeof w[k] === "string")
      );
    }
    case "removeWeapon":
    case "removeSpell":
    case "toggleSpellPrepared":
      return exactKeys(operation, ["type", "index"]) && number("index");
    case "upsertSpell": {
      if (!subsetKeys(operation, ["type", "spell"], ["index"])) return false;
      if (operation.index !== undefined && !number("index")) return false;
      if (!isPlainRecord(operation.spell)) return false;
      const s = operation.spell;
      if (
        !subsetKeys(
          s,
          ["level", "name", "summary"],
          ["prepared", "ritual", "concentration", "verbal", "somatic", "material", "fullTextMd"],
        )
      ) {
        return false;
      }
      if (typeof s.level !== "number" || !Number.isInteger(s.level) || typeof s.name !== "string" || typeof s.summary !== "string") {
        return false;
      }
      if (
        ["prepared", "ritual", "concentration", "verbal", "somatic", "material"].some(
          (k) => s[k] !== undefined && typeof s[k] !== "boolean",
        )
      ) {
        return false;
      }
      return s.fullTextMd === undefined || s.fullTextMd === null || typeof s.fullTextMd === "string";
    }
    case "updateInventory":
      return (
        exactKeys(operation, ["type", "items"]) &&
        Array.isArray(operation.items) &&
        operation.items.every((item) => typeof item === "string")
      );
    case "updateBioNotes": {
      if (!subsetKeys(operation, ["type"], ["personality", "playerNotes"])) return false;
      if (operation.playerNotes !== undefined && operation.playerNotes !== null && typeof operation.playerNotes !== "string") {
        return false;
      }
      if (operation.personality !== undefined) {
        if (!isPlainRecord(operation.personality)) return false;
        const p = operation.personality;
        if (
          Object.entries(p).some(
            ([k, v]) => !["traits", "ideals", "bonds", "flaws"].includes(k) || (v !== undefined && typeof v !== "string"),
          )
        ) {
          return false;
        }
      }
      return true;
    }
    default:
      return false;
  }
}

export type MobileCharacterRecord = MobileCharacterState & {
  id: string;
  campaign_id: string;
  assigned_to: string | null;
  updated_at: string;
  [key: string]: unknown;
};

export type MobileCharacterStateDependencies = {
  getUser(token: string): Promise<{ id: string } | null>;
  getCharacter(id: string): Promise<MobileCharacterRecord | null>;
  getProfileRole(userId: string): Promise<string | null>;
  getCampaignGmId(campaignId: string): Promise<string | null>;
  getCampaignType?(campaignId: string): Promise<string | null>;
  compareAndSwap(id: string, expectedUpdatedAt: string, patch: MobileCharacterState): Promise<MobileCharacterRecord | null>;
};

export async function saveMobileCharacterState(
  id: string,
  token: string | null,
  body: unknown,
  deps: MobileCharacterStateDependencies,
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!token) return { status: 401, body: { error: "auth_required" } };
  if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400, body: { error: "invalid_body" } };
  const input = body as Record<string, unknown>;
  if (
    !exactKeys(input, ["expectedUpdatedAt", "operation"]) ||
    !isMobileCharacterOperation(input.operation) ||
    typeof input.expectedUpdatedAt !== "string" ||
    !Number.isFinite(Date.parse(input.expectedUpdatedAt))
  ) {
    return { status: 400, body: { error: "invalid_request" } };
  }

  try {
    const user = await deps.getUser(token);
    if (!user) return { status: 401, body: { error: "auth_invalid" } };
    const row = await deps.getCharacter(id);
    if (!row) return { status: 404, body: { error: "character_not_found" } };
    let profileRole: string | null = null;
    let campaignGmId: string | null = null;
    if (row.assigned_to !== user.id) {
      [profileRole, campaignGmId] = await Promise.all([
        deps.getProfileRole(user.id),
        deps.getCampaignGmId(row.campaign_id),
      ]);
    }
    if (!canEditMobileCharacter({ userId: user.id, profileRole, campaignGmId }, row.assigned_to)) {
      return { status: 403, body: { error: "forbidden" } };
    }
    if (isLongOnlyCharacterOperation(input.operation)) {
      const campaignType = deps.getCampaignType ? await deps.getCampaignType(row.campaign_id) : null;
      if (campaignType !== "long") {
        return { status: 403, body: { error: "long_campaign_only" } };
      }
    }
    const expectedUpdatedAt = input.expectedUpdatedAt;
    if (!hasExpectedCharacterRevision(expectedUpdatedAt, row.updated_at)) {
      return { status: 409, body: { error: "revision_conflict", updatedAt: row.updated_at } };
    }
    let next: MobileCharacterState;
    try {
      next = applyMobileCharacterOperation(row, input.operation);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "invalid_operation";
      const status = reason === "max_hp_unavailable" ? 422 : 400;
      return { status, body: { error: reason } };
    }
    const character = await deps.compareAndSwap(id, expectedUpdatedAt, next);
    if (!character) return { status: 409, body: { error: "revision_conflict" } };
    return { status: 200, body: { character } };
  } catch {
    return { status: 500, body: { error: "save_failed" } };
  }
}
