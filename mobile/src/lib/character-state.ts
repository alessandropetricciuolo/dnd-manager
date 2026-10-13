export type MobileCharacterOperation =
  | { type: "hp"; hitPoints: number; tempHp?: number }
  | { type: "toggleInspiration" }
  | { type: "spendHitDie"; count: number }
  | { type: "useFeature"; featureId: string }
  | { type: "shortRest" }
  | { type: "spellSlot"; level: number; usedCount: number }
  | { type: "coins"; gp: number; sp: number; cp: number }
  | { type: "deathSaves"; successes: number; failures: number }
  | { type: "longRest" };

type Snapshot = Record<string, any>;
export type MobileCharacterState = {
  hit_points: number | null;
  rules_snapshot: Snapshot | null;
  coins_gp: number | null;
  coins_sp: number | null;
  coins_cp: number | null;
};

export function canEditMobileCharacter(
  identity: { userId: string; profileRole?: string | null; campaignGmId?: string | null },
  assignedTo: string | null
): boolean {
  return assignedTo === identity.userId || identity.profileRole === "admin" || identity.profileRole === "gm" || identity.campaignGmId === identity.userId;
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

export function applyMobileCharacterOperation(
  row: MobileCharacterState,
  operation: MobileCharacterOperation
): MobileCharacterState {
  const snapshot: Snapshot = { ...(row.rules_snapshot ?? {}) };
  let hit_points = row.hit_points ?? 0;
  let coins_gp = row.coins_gp ?? 0;
  let coins_sp = row.coins_sp ?? 0;
  let coins_cp = row.coins_cp ?? 0;
  switch (operation.type) {
    case "hp": {
      if (!Number.isInteger(snapshot.max_hp) || snapshot.max_hp < 0) throw new Error("max_hp_unavailable");
      const maxHp = snapshot.max_hp;
      hit_points = boundedInt(operation.hitPoints, 0, maxHp, "hp");
      if (operation.tempHp !== undefined) snapshot.temp_hp = boundedInt(operation.tempHp, 0, 1000000, "temp_hp");
      if (hit_points > 0) snapshot.death_saves = { successes: 0, failures: 0 };
      break;
    }
    case "toggleInspiration":
      snapshot.inspiration = !Boolean(snapshot.inspiration);
      break;
    case "spendHitDie": {
      const dice = snapshot.hit_dice ?? {};
      const total = Number.isInteger(dice.total) ? dice.total : 0;
      const current = Number.isInteger(dice.current) ? dice.current : 0;
      const count = boundedInt(operation.count, 1, total, "hit_dice");
      snapshot.hit_dice = { ...dice, current: Math.max(0, current - count) };
      break;
    }
    case "useFeature": {
      if (!operation.featureId || operation.featureId.length > 120) throw new Error("invalid_feature");
      let found = false;
      snapshot.features = (Array.isArray(snapshot.features) ? snapshot.features : []).map((feature: Snapshot) => {
        if (feature?.id !== operation.featureId || feature.usesCurrent === undefined) return feature;
        found = true;
        const current = Number.isInteger(feature.usesCurrent) ? feature.usesCurrent : 0;
        return { ...feature, usesCurrent: Math.max(0, current - 1) };
      });
      if (!found) throw new Error("feature_unavailable");
      break;
    }
    case "shortRest":
      snapshot.features = (Array.isArray(snapshot.features) ? snapshot.features : []).map((feature: Snapshot) =>
        feature?.resetOn === "shortRest" && Number.isInteger(feature.usesMax)
          ? { ...feature, usesCurrent: Math.max(0, feature.usesMax) }
          : feature
      );
      break;
    case "spellSlot": {
      const level = boundedInt(operation.level, 1, 9, "spell_level");
      const slot = (Array.isArray(snapshot.spellSlots) ? snapshot.spellSlots : []).find((item: Snapshot) => item?.level === level);
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
    case "longRest": {
      if (!Number.isInteger(snapshot.max_hp) || snapshot.max_hp < 0) throw new Error("max_hp_unavailable");
      const maxHp = snapshot.max_hp;
      hit_points = maxHp;
      snapshot.temp_hp = 0;
      snapshot.death_saves = { successes: 0, failures: 0 };
      snapshot.usedSpellSlots = {};
      const dice = snapshot.hit_dice ?? {};
      const total = Number.isInteger(dice.total) ? dice.total : 0;
      const current = Number.isInteger(dice.current) ? dice.current : 0;
      snapshot.hit_dice = { ...dice, current: Math.min(total, current + Math.max(1, Math.floor(total / 2))) };
      snapshot.features = (Array.isArray(snapshot.features) ? snapshot.features : []).map((feature: Snapshot) =>
        Number.isInteger(feature?.usesMax) ? { ...feature, usesCurrent: Math.max(0, feature.usesMax) } : feature
      );
      break;
    }
    default: {
      const exhaustive: never = operation;
      throw new Error(`unsupported_operation:${String(exhaustive)}`);
    }
  }

  return { hit_points, rules_snapshot: snapshot, coins_gp, coins_sp, coins_cp };
}

export function isMobileCharacterOperation(value: unknown): value is MobileCharacterOperation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const operation = value as Record<string, unknown>;
  const number = (key: string) => typeof operation[key] === "number" && Number.isFinite(operation[key]);
  switch (operation.type) {
    case "hp": return exactKeys(operation, operation.tempHp === undefined ? ["type", "hitPoints"] : ["type", "hitPoints", "tempHp"]) && number("hitPoints") && (operation.tempHp === undefined || number("tempHp"));
    case "toggleInspiration": case "shortRest": case "longRest": return exactKeys(operation, ["type"]);
    case "spendHitDie": return exactKeys(operation, ["type", "count"]) && number("count");
    case "useFeature": return exactKeys(operation, ["type", "featureId"]) && typeof operation.featureId === "string";
    case "spellSlot": return exactKeys(operation, ["type", "level", "usedCount"]) && number("level") && number("usedCount");
    case "coins": return exactKeys(operation, ["type", "gp", "sp", "cp"]) && number("gp") && number("sp") && number("cp");
    case "deathSaves": return exactKeys(operation, ["type", "successes", "failures"]) && number("successes") && number("failures");
    default: return false;
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
  compareAndSwap(id: string, expectedUpdatedAt: string, patch: MobileCharacterState): Promise<MobileCharacterRecord | null>;
};

export async function saveMobileCharacterState(
  id: string,
  token: string | null,
  body: unknown,
  deps: MobileCharacterStateDependencies
): Promise<{ status: number; body: Record<string, unknown> }> {
  if (!token) return { status: 401, body: { error: "auth_required" } };
  if (!body || typeof body !== "object" || Array.isArray(body)) return { status: 400, body: { error: "invalid_body" } };
  const input = body as Record<string, unknown>;
  if (!exactKeys(input, ["expectedUpdatedAt", "operation"]) || !isMobileCharacterOperation(input.operation) || typeof input.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(input.expectedUpdatedAt))) {
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
