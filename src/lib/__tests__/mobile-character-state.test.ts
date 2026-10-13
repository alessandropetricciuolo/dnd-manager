import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { createMobileCharacterStatePatchHandler } from "../mobile/character-state-http";
import {
  applyMobileCharacterOperation,
  canEditMobileCharacter,
  hasExpectedCharacterRevision,
  isMobileCharacterOperation,
  saveMobileCharacterState,
  type MobileCharacterRecord,
  type MobileCharacterStateDependencies,
} from "../mobile-character-state";

const row = {
  hit_points: 8,
  coins_gp: 2,
  coins_sp: 3,
  coins_cp: 4,
  rules_snapshot: {
    max_hp: 10,
    temp_hp: 2,
    inspiration: false,
    hit_dice: { total: 3, current: 2, die: "1d8" },
    spellSlots: [{ level: 1, count: 2 }],
    usedSpellSlots: { 1: 1 },
    features: [{ id: "f1", usesCurrent: 0, usesMax: 1, resetOn: "shortRest" }],
    privateNotes: "preserve me",
  },
};

test("only the owner, campaign GM, or admin can edit operational state", () => {
  assert.equal(canEditMobileCharacter({ userId: "player" }, "player"), true);
  assert.equal(canEditMobileCharacter({ userId: "gm", campaignGmId: "gm" }, "player"), true);
  assert.equal(canEditMobileCharacter({ userId: "admin", profileRole: "admin" }, "player"), true);
  assert.equal(canEditMobileCharacter({ userId: "other", profileRole: "gm" }, "player"), true);
  assert.equal(canEditMobileCharacter({ userId: "other", profileRole: "player", campaignGmId: "gm" }, "player"), false);
});

test("revision mismatch blocks a write and a matching revision permits compare-and-swap", () => {
  assert.equal(hasExpectedCharacterRevision("v1", "v2"), false);
  assert.equal(hasExpectedCharacterRevision("v1", null), false);
  assert.equal(hasExpectedCharacterRevision("v1", "v1"), true);
});

test("operational changes preserve unrelated snapshot fields and cannot edit maximum HP or XP", () => {
  const changed = applyMobileCharacterOperation(row, { type: "hp", hitPoints: 10 });
  assert.equal(changed.hit_points, 10);
  assert.equal(changed.rules_snapshot?.max_hp, 10);
  assert.equal(changed.rules_snapshot?.privateNotes, "preserve me");
  assert.equal("current_xp" in changed, false);
  assert.throws(() => applyMobileCharacterOperation(row, { type: "hp", hitPoints: 11 }), /invalid_hp/);
  assert.equal(isMobileCharacterOperation({ type: "setMaxHp", value: 999 }), false);
});

test("resource writes respect server-side maxima and invalid saves fail without a partial mutation", () => {
  assert.throws(() => applyMobileCharacterOperation(row, { type: "spellSlot", level: 1, usedCount: 3 }), /invalid_spell_slot/);
  assert.throws(() => applyMobileCharacterOperation(row, { type: "spendHitDie", count: 4 }), /invalid_hit_dice/);
  assert.throws(() => applyMobileCharacterOperation(row, { type: "coins", gp: -1, sp: 0, cp: 0 }), /invalid_coins/);
  assert.equal(row.hit_points, 8);
  assert.equal(row.rules_snapshot?.usedSpellSlots?.[1], 1);
});

const serverCharacter: MobileCharacterRecord = {
  id: "character-1", campaign_id: "campaign-1", assigned_to: "player-1", updated_at: "2026-10-13T10:00:00.000Z",
  hit_points: 8, coins_gp: 2, coins_sp: 3, coins_cp: 4,
  rules_snapshot: { max_hp: 10, temp_hp: 0, death_saves: { successes: 0, failures: 0 }, privateNotes: "keep" },
  name: "Hero", current_xp: 100,
};

function deps(overrides: Partial<MobileCharacterStateDependencies> = {}): MobileCharacterStateDependencies {
  return {
    getUser: async () => ({ id: "player-1" }),
    getCharacter: async () => serverCharacter,
    getProfileRole: async () => "player",
    getCampaignGmId: async () => "gm-1",
    compareAndSwap: async (_id, _revision, patch) => ({ ...serverCharacter, ...patch, updated_at: "2026-10-13T10:00:01.000Z" }),
    ...overrides,
  };
}

const patchBody = { expectedUpdatedAt: serverCharacter.updated_at, operation: { type: "hp", hitPoints: 6 } };

test("API handler rejects missing and invalid authentication before character access", async () => {
  let reads = 0;
  const d = deps({ getUser: async (token) => token === "valid" ? { id: "player-1" } : null, getCharacter: async () => { reads++; return serverCharacter; } });
  assert.equal((await saveMobileCharacterState(serverCharacter.id, null, patchBody, d)).status, 401);
  assert.equal((await saveMobileCharacterState(serverCharacter.id, "bad", patchBody, d)).status, 401);
  assert.equal(reads, 0);
});

test("API handler denies foreign players, but accepts trusted guild GMs", async () => {
  const foreign = deps({ getUser: async () => ({ id: "stranger" }) });
  assert.equal((await saveMobileCharacterState(serverCharacter.id, "valid", patchBody, foreign)).status, 403);
  const gm = deps({ getUser: async () => ({ id: "gm-2" }), getProfileRole: async () => "gm" });
  assert.equal((await saveMobileCharacterState(serverCharacter.id, "valid", patchBody, gm)).status, 200);
});

test("API handler reports stale revision and skips compare-and-swap", async () => {
  let writes = 0;
  const d = deps({ getCharacter: async () => ({ ...serverCharacter, updated_at: "2026-10-13T10:00:02.000Z" }), compareAndSwap: async () => { writes++; return null; } });
  const result = await saveMobileCharacterState(serverCharacter.id, "valid", patchBody, d);
  assert.equal(result.status, 409);
  assert.equal(writes, 0);
});

test("API handler maps database failures to 500 and returns the persisted readback", async () => {
  const failed = deps({ getCharacter: async () => { throw new Error("db unavailable"); } });
  assert.equal((await saveMobileCharacterState(serverCharacter.id, "valid", patchBody, failed)).status, 500);

  const saved = { ...serverCharacter, hit_points: 6, updated_at: "2026-10-13T10:00:01.000Z" };
  let writtenPatch: any;
  const successful = deps({ compareAndSwap: async (_id, _revision, patch) => { writtenPatch = patch; return saved; } });
  const result = await saveMobileCharacterState(serverCharacter.id, "valid", patchBody, successful);
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.character, saved);
  assert.equal(writtenPatch.rules_snapshot.privateNotes, "keep");
  assert.equal("current_xp" in writtenPatch, false);
});

test("API handler rejects extra input keys and reports unknown HP maximum clearly", async () => {
  const extra = await saveMobileCharacterState(serverCharacter.id, "valid", { ...patchBody, update: { current_xp: 999999 } }, deps());
  assert.equal(extra.status, 400);
  const missingMax = deps({ getCharacter: async () => ({ ...serverCharacter, rules_snapshot: { privateNotes: "keep" } }) });
  const result = await saveMobileCharacterState(serverCharacter.id, "valid", patchBody, missingMax);
  assert.equal(result.status, 422);
  assert.equal(result.body.error, "max_hp_unavailable");
  assert.equal(isMobileCharacterOperation({ type: "hp", hitPoints: 6, unrecognized: true }), false);
});

test("PATCH route enforces HTTP body limits and returns mocked persisted readback", async () => {
  const handler = createMobileCharacterStatePatchHandler(() => deps());
  const tooLarge = new NextRequest("http://localhost/api/mobile/characters/character-1/state", {
    method: "PATCH", headers: { "content-type": "application/json", "content-length": "20000", authorization: "Bearer valid" }, body: "{}",
  });
  assert.equal((await handler(tooLarge, { params: { id: serverCharacter.id } })).status, 413);

  const badJson = new NextRequest("http://localhost/api/mobile/characters/character-1/state", {
    method: "PATCH", headers: { "content-type": "application/json", authorization: "Bearer valid" }, body: "{",
  });
  assert.equal((await handler(badJson, { params: { id: serverCharacter.id } })).status, 400);

  const expected = { ...serverCharacter, hit_points: 6, updated_at: "2026-10-13T10:00:01.000Z" };
  const successHandler = createMobileCharacterStatePatchHandler(() => deps({ compareAndSwap: async () => expected }));
  const request = new NextRequest("http://localhost/api/mobile/characters/character-1/state", {
    method: "PATCH", headers: { "content-type": "application/json", authorization: "Bearer valid" }, body: JSON.stringify(patchBody),
  });
  const response = await successHandler(request, { params: { id: serverCharacter.id } });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).character, expected);
});
