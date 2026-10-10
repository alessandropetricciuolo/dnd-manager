import test from "node:test";
import assert from "node:assert/strict";
import { executeContent } from "../service";
import { validate, ApiError } from "../contracts";
import { handleContent } from "../handler";

const campaign = "11111111-1111-4111-8111-111111111111";
const entityId = "22222222-2222-4222-8222-222222222222";
const row = { id: entityId, campaign_id: campaign, type: "lore", name: "Sentinel", content: { body: "private" }, attributes: {}, image_url: null, admin_only: true, mcp_status: "draft", mcp_revision: 2 };

function fakeDb(results: unknown[]) {
  const calls: unknown[][] = [];
  const db: any = {
    from(table: string) {
      calls.push(["from", table]);
      const query: any = {};
      for (const method of ["select", "eq", "in", "or", "order", "range", "insert", "update", "ilike", "limit"]) query[method] = (...args: unknown[]) => { calls.push([method, ...args]); return query; };
      const next = () => ({ data: results.shift(), error: null });
      query.maybeSingle = async () => next(); query.single = async () => next();
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(next()).then(resolve);
      return query;
    },
  };
  return { db, calls };
}

const admin = (db: any) => ({ db, userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", isAdmin: true });
const nonAdmin = (db: any) => ({ db, userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", isAdmin: false });

test("M6 contract carries admin_only only on scoped Wiki operations", () => {
  assert.equal(validate({ operation: "search_lore", args: { campaign_id: campaign, query: "secret", admin_only: true } }).args.admin_only, true);
  assert.equal(validate({ operation: "create_lore", args: { campaign_id: campaign, name: "Secret", body: "x", admin_only: true } }).args.admin_only, true);
  assert.throws(() => validate({ operation: "set_status", args: { campaign_id: campaign, entity_id: entityId, revision: 1, status: "draft", admin_only: true } }), ApiError);
});

test("session close contract separates preparation from explicit token-bound confirmation", () => {
  const attendance = { ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]: "attended" };
  const prepared = { campaign_id: campaign, session_id: entityId, attendance, xp_gained: 120, elapsed_hours: 4, summary: "Il gruppo torna al villaggio.", gm_private_notes: "Il messaggero mente." };
  assert.equal(validate({ operation: "prepare_session_close", args: prepared }).operation, "prepare_session_close");
  assert.equal(validate({ operation: "list_sessions", args: { campaign_id: campaign, limit: 10 } }).operation, "list_sessions");
  assert.throws(() => validate({ operation: "close_session", args: { ...prepared, confirm_close: true, proposal_token: "not-a-token" } }), ApiError);
  assert.throws(() => validate({ operation: "close_session", args: { ...prepared, confirm_close: true, proposal_token: "a".repeat(64) } }), ApiError);
  assert.throws(() => validate({ operation: "close_session", args: { ...prepared, confirm_close: false, proposal_token: "a".repeat(64) } }), ApiError);
});

test("session pre-close returns a signed proposal; close rejects stale input and reads back XP and hours", async () => {
  const playerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const characterId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const actorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  process.env.MCP_CAMPAIGN_ID = campaign;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-signing-key";
  const state: any = {
    session: { id: entityId, campaign_id: campaign, title: "Sessione 1", scheduled_at: "2026-09-20T18:00:00Z", status: "scheduled", session_summary: null, gm_private_notes: null, is_pre_closed: false, updated_at: "2026-09-20T18:00:00Z" },
    signups: [{ player_id: playerId, status: "confirmed" }],
    character: { id: characterId, name: "Eroe", assigned_to: playerId, current_xp: 100, time_offset_hours: 10, calendar_anchor_date: null, calendar_anchor_hours: null },
    ledger: [], hourLedger: [], closeCalls: 0, failAtomicClose: false,
  };
  const makeDb = (isAdminDb: boolean): any => ({
    from(table: string) {
      const q: any = { filters: {}, mode: "read", payload: null };
      q.select = () => q;
      q.eq = (key: string, value: any) => { q.filters[key] = value; return q; };
      q.in = (key: string, value: any[]) => { q.filters[key] = value; return q; };
      q.order = () => q;
      q.range = () => q;
      q.update = (payload: any) => { q.mode = "update"; q.payload = payload; return q; };
      const read = () => {
        if (q.mode === "update") {
          if (table === "campaign_characters" && q.filters.id === characterId) Object.assign(state.character, q.payload);
          return { data: null, error: null };
        }
        if (table === "profiles") return q.filters.id === actorId ? { data: { role: "gm" }, error: null } : { data: [{ id: playerId, display_name: "Giocatore" }], error: null };
        if (table === "campaigns") return { data: q.filters.id ? { id: campaign, gm_id: actorId, admin_drafts_enabled: true, long_calendar_config: null, long_calendar_base_date: null } : null, error: null };
        if (table === "sessions") return q.filters.id ? { data: { ...state.session }, error: null } : { data: [state.session], error: null };
        if (table === "session_signups") return { data: state.signups, error: null };
        if (table === "campaign_characters") return q.filters.id ? { data: { ...state.character }, error: null } : { data: [state.character], error: null };
        if (table === "session_xp_awards") return { data: state.ledger, error: null };
        if (table === "session_hour_awards") return { data: state.hourLedger, error: null };
        return { data: [], error: null };
      };
      q.maybeSingle = async () => read(); q.single = async () => read();
      q.then = (resolve: any, reject: any) => Promise.resolve(read()).then(resolve, reject);
      return q;
    },
    async rpc(name: string, args: any) {
      if (name === "save_session_preclose") {
        state.session = { ...state.session, is_pre_closed: true, pre_closed_xp_gained: args.p_xp_gained, pre_closed_xp_awards: args.p_per_player_xp_awards, updated_at: "2026-09-25T10:00:00Z" };
        state.signups = state.signups.map((row: any) => ({ ...row, status: args.p_attendance[row.player_id] }));
        return { data: true, error: null };
      }
      if (name === "close_session_with_xp_and_hours") {
        state.closeCalls++;
        if (state.failAtomicClose) return { data: null, error: { message: "session_character_hours_changed" } };
        state.session = { ...state.session, status: "completed", session_summary: args.p_summary, gm_private_notes: args.p_gm_private_notes, elapsed_hours: args.p_elapsed_hours };
        state.ledger = [{ campaign_id: campaign, player_id: playerId, character_id: characterId, xp_awarded: args.p_per_player_xp_awards[0].xp, xp_after: 175 }];
        state.character.current_xp = 175;
        state.hourLedger = args.p_hour_updates.map((update: any) => ({
          character_id: update.character_id,
          hours_awarded: args.p_elapsed_hours,
          hours_before: update.expected_hours,
          hours_after: update.next_hours,
          calendar_date_after: update.calendar_current_date,
        }));
        state.character.time_offset_hours = args.p_hour_updates[0].next_hours;
        return { data: [{ applied_awards: 1, skipped_awards: 0 }], error: null };
      }
      return { data: null, error: { message: "unexpected rpc" } };
    },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: null } } }) } },
  });
  const authDb = makeDb(false);
  const adminDb = makeDb(true);
  const auth = { db: authDb, userId: actorId, isAdmin: false };
  const draftArgs = { campaign_id: campaign, session_id: entityId, attendance: { [playerId]: "attended" }, xp_gained: 0, per_player_xp_awards: [{ playerId, xp: 75 }], elapsed_hours: 3, summary: "Il gruppo torna al villaggio.", gm_private_notes: "Il messaggero mente." };
  const prepared: any = await executeContent(auth as any, { operation: "prepare_session_close", args: draftArgs } as any, { uploadImage: async () => "", createAdmin: () => adminDb });
  assert.equal(prepared.ready_to_close, true);
  assert.equal(prepared.draft_persisted.is_pre_closed, true);
  const proposal = prepared.proposal;
  const closeArgs = { ...draftArgs, ...proposal, confirm_close: true };
  await assert.rejects(executeContent(auth as any, { operation: "close_session", args: { ...closeArgs, summary: "Testo cambiato" } } as any, { uploadImage: async () => "", createAdmin: () => adminDb }), (error: any) => error.status === 409);
  await assert.rejects(executeContent(auth as any, { operation: "close_session", args: { ...closeArgs, proposal_updated_at: "2026-09-25T10:01:00Z" } } as any, { uploadImage: async () => "", createAdmin: () => adminDb }), (error: any) => error.status === 409);
  state.failAtomicClose = true;
  await assert.rejects(executeContent(auth as any, { operation: "close_session", args: closeArgs } as any, { uploadImage: async () => "", createAdmin: () => adminDb }), (error: any) => error.status === 503);
  assert.equal(state.session.status, "scheduled");
  assert.equal(state.ledger.length, 0);
  assert.equal(state.hourLedger.length, 0);
  state.failAtomicClose = false;
  const closed: any = await executeContent(auth as any, { operation: "close_session", args: closeArgs } as any, { uploadImage: async () => "", createAdmin: () => adminDb });
  assert.equal(closed.success, true);
  assert.equal(closed.session.status, "completed");
  assert.equal(closed.session.elapsed_hours, 3);
  assert.equal(closed.xp_ledger[0].xp_awarded, 75);
  assert.equal(closed.hours.characters[0].hours_after, 13);
  assert.equal(state.closeCalls, 2);
});

test("item and monster creation contracts mirror the manual Wiki persistence fields", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  assert.equal(validate({ operation: "create_item", args: { campaign_id: campaign, name: "Lama", body: "Antica" } }).operation, "create_item");
  assert.equal(validate({ operation: "create_monster", args: { campaign_id: campaign, name: "Drago", body: "Feroce", xp_value: 5900, is_core: true } }).args.xp_value, 5900);
  assert.throws(() => validate({ operation: "create_monster", args: { campaign_id: campaign, name: "Drago", body: "Feroce", xp_value: -1 } }), ApiError);

  const monsterRow = { ...row, type: "monster", name: "Drago", xp_value: 5900, is_core: true, global_status: "alive" };
  const create = fakeDb([{ id: campaign, type: "long", admin_drafts_enabled: true }, monsterRow]);
  const result: any = await executeContent(admin(create.db), { operation: "create_monster", args: { campaign_id: campaign, name: "Drago", body: "Feroce", attributes: { combat_stats: { hp: "200", ac: "19", cr: "10", attacks: "Morso" } }, xp_value: 5900, is_core: true } });
  const inserted = create.calls.find((call) => call[0] === "insert")?.[1] as Record<string, unknown>;
  assert.equal(inserted.type, "monster");
  assert.equal(inserted.xp_value, 5900);
  assert.equal(inserted.is_core, true);
  assert.equal(inserted.global_status, "alive");
  assert.equal(result.entity.xp_value, 5900);
  assert.equal(result.entity.global_status, "alive");
});

test("upload_map validates HTTPS input and creates a secret scoped Atlas map", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  assert.equal(validate({ operation: "upload_map", args: { campaign_id: campaign, name: "Bosco", image_url: "https://cdn.example.com/map.png" } }).operation, "upload_map");
  assert.throws(() => validate({ operation: "upload_map", args: { campaign_id: campaign, name: "Bosco", image_url: "http://example.com/map.png" } }), ApiError);
  const map = fakeDb([{ id: campaign, type: "long", admin_drafts_enabled: true }, null, { id: entityId, campaign_id: campaign, name: "Bosco", visibility: "secret" }]);
  const result: any = await executeContent(admin(map.db), { operation: "upload_map", args: { campaign_id: campaign, name: "Bosco", image_url: "https://cdn.example.com/map.png" } });
  const inserted = map.calls.find((call) => call[0] === "insert")?.[1] as Record<string, unknown>;
  assert.equal(inserted.visibility, "secret");
  assert.equal(inserted.map_type, "city");
  assert.equal(result.map.name, "Bosco");
});

test("search_maps resolves parent IDs, get_map verifies writes, and upload blocks duplicate names", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  const almaria = { id: entityId, campaign_id: campaign, name: "Almaria", map_type: "world", admin_only: false };
  const search = fakeDb([{ id: campaign, type: "long", admin_drafts_enabled: true }, [almaria]]);
  const found: any = await executeContent(admin(search.db), { operation: "search_maps", args: { campaign_id: campaign, query: "Almaria" } });
  assert.equal(found.maps[0].id, entityId);
  assert(search.calls.some((call) => call[0] === "eq" && call[1] === "admin_only" && call[2] === false));
  const read = fakeDb([{ id: campaign, type: "long", admin_drafts_enabled: true }, almaria]);
  const verified: any = await executeContent(admin(read.db), { operation: "get_map", args: { campaign_id: campaign, map_id: entityId } });
  assert.equal(verified.map.name, "Almaria");
  const duplicate = fakeDb([{ id: campaign, type: "long", admin_drafts_enabled: true }, almaria]);
  await assert.rejects(executeContent(admin(duplicate.db), { operation: "upload_map", args: { campaign_id: campaign, name: "Almaria", image_url: "https://cdn.example.com/map.png" } }), (error: any) => error.status === 409);
  assert(!duplicate.calls.some((call) => call[0] === "insert"));
});

test("list_wiki_relationships paginates real rows and protects Admin-only endpoints", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  const publicTarget = "33333333-3333-4333-8333-333333333333";
  const mapId = "44444444-4444-4444-8444-444444444444";
  const relationships = [
    { id: "55555555-5555-4555-8555-555555555555", campaign_id: campaign, source_id: entityId, target_id: publicTarget, target_map_id: null, label: "alleato", created_at: "2026-01-01" },
    { id: "66666666-6666-4666-8666-666666666666", campaign_id: campaign, source_id: publicTarget, target_id: null, target_map_id: mapId, label: "si trova in", created_at: "2026-01-02" },
  ];
  const entities = [
    { id: entityId, name: "Segreto", type: "lore", admin_only: true },
    { id: publicTarget, name: "Pubblico", type: "location", admin_only: false },
  ];
  const maps = [{ id: mapId, name: "Almaria", map_type: "continent", admin_only: false }];
  const publicRead = fakeDb([{ id: campaign, admin_drafts_enabled: true }, relationships, entities, maps]);
  const result: any = await executeContent(admin(publicRead.db), { operation: "list_wiki_relationships", args: { campaign_id: campaign, limit: 2 } });
  assert.equal(result.relationships.length, 1);
  assert.equal(result.relationships[0].target_map.name, "Almaria");
  assert.equal(result.next_offset, 2);
  assert.equal(result.admin_only, false);

  const adminRead = fakeDb([{ id: campaign, admin_drafts_enabled: true }, relationships, entities, maps]);
  const protectedResult: any = await executeContent(admin(adminRead.db), { operation: "list_wiki_relationships", args: { campaign_id: campaign, limit: 2, admin_only: true } });
  assert.equal(protectedResult.relationships.length, 2);
  assert.equal(protectedResult.relationships[0].source.name, "Segreto");
  assert.equal(protectedResult.admin_only, true);
});

test("upsert_wiki_relationship validates endpoints, is idempotent, and reads back the stored row", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  const targetId = "33333333-3333-4333-8333-333333333333";
  const source = { id: entityId, name: "Portico", type: "location", admin_only: false };
  const target = { id: targetId, name: "Taverna", type: "location", admin_only: false };
  const stored = { id: "55555555-5555-4555-8555-555555555555", campaign_id: campaign, source_id: entityId, target_id: targetId, target_map_id: null, label: "contiene", created_at: "2026-01-01" };
  assert.throws(() => validate({ operation: "upsert_wiki_relationship", args: { campaign_id: campaign, source_id: entityId, target_id: targetId, target_map_id: targetId, label: "x" } }), ApiError);
  assert.throws(() => validate({ operation: "upsert_wiki_relationship", args: { campaign_id: campaign, source_id: entityId, target_id: entityId, label: "x" } }), ApiError);

  const create = fakeDb([{ id: campaign, admin_drafts_enabled: true }, source, target, null, { id: stored.id }, stored]);
  const created: any = await executeContent(admin(create.db), { operation: "upsert_wiki_relationship", args: { campaign_id: campaign, source_id: entityId, target_id: targetId, label: " contiene " } });
  assert.equal(created.created, true);
  assert.equal(created.relationship.id, stored.id);
  assert.equal(created.relationship.target.name, "Taverna");
  const payload = create.calls.find((call) => call[0] === "insert")?.[1] as Record<string, unknown>;
  assert.equal(payload.label, "contiene");

  const existing = fakeDb([{ id: campaign, admin_drafts_enabled: true }, source, target, stored]);
  const repeated: any = await executeContent(admin(existing.db), { operation: "upsert_wiki_relationship", args: { campaign_id: campaign, source_id: entityId, target_id: targetId, label: "contiene" } });
  assert.equal(repeated.created, false);
  assert(!existing.calls.some((call) => call[0] === "insert"));

  const relabelled = { ...stored, label: "ospita" };
  const relabel = fakeDb([{ id: campaign, admin_drafts_enabled: true }, source, target, stored, relabelled]);
  const updated: any = await executeContent(admin(relabel.db), { operation: "upsert_wiki_relationship", args: { campaign_id: campaign, source_id: entityId, target_id: targetId, label: "ospita" } });
  assert.equal(updated.created, false);
  assert.equal(updated.relationship.label, "ospita");
  assert(relabel.calls.some((call) => call[0] === "update"));

  const protectedEndpoint = fakeDb([{ id: campaign, admin_drafts_enabled: true }, { ...source, admin_only: true }, target]);
  await assert.rejects(executeContent(admin(protectedEndpoint.db), { operation: "upsert_wiki_relationship", args: { campaign_id: campaign, source_id: entityId, target_id: targetId, label: "contiene" } }), (error: any) => error.status === 404);
  assert(!protectedEndpoint.calls.some((call) => call[0] === "insert"));

  const publicToProtected = fakeDb([{ id: campaign, admin_drafts_enabled: true }, source, { ...target, admin_only: true }]);
  await assert.rejects(executeContent(admin(publicToProtected.db), { operation: "upsert_wiki_relationship", args: { campaign_id: campaign, source_id: entityId, target_id: targetId, label: "contiene", admin_only: true } }), (error: any) => error.status === 400);
  assert(!publicToProtected.calls.some((call) => call[0] === "insert"));
});

test("verified Admin can opt into protected search and creates protected rows", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  const search = fakeDb([{ id: campaign, admin_drafts_enabled: true }, [row]]);
  const searchResult: any = await executeContent(admin(search.db), { operation: "search_lore", args: { campaign_id: campaign, query: "secret", admin_only: true } });
  assert.equal(searchResult.entities[0].admin_only, true);
  const create = fakeDb([{ id: campaign, admin_drafts_enabled: true }, { ...row, admin_only: true }]);
  await executeContent(admin(create.db), { operation: "create_lore", args: { campaign_id: campaign, name: "Secret", body: "x", admin_only: true } });
  const inserted = create.calls.find((call) => call[0] === "insert")?.[1] as Record<string, unknown>;
  assert.equal(inserted.admin_only, true);
});

test("default search excludes protected rows and non-Admin is indistinguishable from missing", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  const search = fakeDb([{ id: campaign, admin_drafts_enabled: true }, []]);
  const result: any = await executeContent(admin(search.db), { operation: "search_lore", args: { campaign_id: campaign, query: "secret" } });
  assert.deepEqual(result.entities, []);
  assert(search.calls.some((call) => call[0] === "eq" && call[1] === "admin_only" && call[2] === false));
  const missing = fakeDb([]);
  await assert.rejects(executeContent(nonAdmin(missing.db), { operation: "get_entity", args: { campaign_id: campaign, entity_id: entityId, admin_only: true } }), (error: any) => error.status === 404 && error.message === "Entity not found");
});

test("stale revision returns 409 and does not issue a partial update", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  const stale = fakeDb([{ id: campaign, admin_drafts_enabled: true }, row]);
  await assert.rejects(executeContent(admin(stale.db), { operation: "update_entity", args: { campaign_id: campaign, entity_id: entityId, revision: 1, body: "attempt" } }), (error: any) => error.status === 409);
  assert(!stale.calls.some((call) => call[0] === "update"));
  const concurrent = fakeDb([{ id: campaign, admin_drafts_enabled: true }, { ...row, mcp_revision: 1 }, null]);
  await assert.rejects(executeContent(admin(concurrent.db), { operation: "update_entity", args: { campaign_id: campaign, entity_id: entityId, revision: 1, body: "attempt" } }), (error: any) => error.status === 409);
  assert(concurrent.calls.some((call) => call[0] === "update"));
});

test("upload_entity_image uploads only after revision check and returns a verifiable image URL", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64");
  const stale = fakeDb([{ id: campaign, admin_drafts_enabled: true }, row]);
  let uploads = 0;
  await assert.rejects(executeContent(admin(stale.db), { operation: "upload_entity_image", args: { campaign_id: campaign, entity_id: entityId, revision: 1, filename: "place.png", mime_type: "image/png", data_base64: png } }, { uploadImage: async () => { uploads++; return "unused"; } }), (error: any) => error.status === 409);
  assert.equal(uploads, 0);

  const updatedRow = { ...row, image_url: "/api/tg-image/file%2Fid", mcp_revision: 3 };
  const success = fakeDb([{ id: campaign, admin_drafts_enabled: true }, row, updatedRow]);
  const result: any = await executeContent(admin(success.db), { operation: "upload_entity_image", args: { campaign_id: campaign, entity_id: entityId, revision: 2, filename: "place.png", mime_type: "image/png", data_base64: png } }, { uploadImage: async () => "file/id" });
  assert.equal(result.entity.image_url, "/api/tg-image/file%2Fid");
  const patch = success.calls.find((call) => call[0] === "update")?.[1] as Record<string, unknown>;
  assert.equal(patch.image_url, "/api/tg-image/file%2Fid");
});

test("API rejects absent bearer before any content operation", async () => {
  const response = await handleContent(new Request("http://localhost/api/integrations/content", { method: "POST", body: "{}" }));
  assert.equal(response.status, 401);
});


test("gallery upload preserves the cover, existing gallery and unrelated attributes", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  const previous = { id: entityId, url: "/api/tg-image/previous", title: "Previous" };
  const original = { ...row, image_url: "/api/tg-image/cover", attributes: { secret: "keep", images: [previous] } };
  const success = fakeDb([{ id: campaign, admin_drafts_enabled: true }, original, { ...original, mcp_revision: 3 }]);
  const result: any = await executeContent(admin(success.db), { operation: "upload_entity_image", args: { campaign_id: campaign, entity_id: entityId, revision: 2, filename: "extra.png", mime_type: "image/png", data_base64: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64"), mode: "gallery", title: "Extra" } }, { uploadImage: async () => "extra" });
  const patch: any = success.calls.find(call => call[0] === "update")?.[1];
  assert.equal(patch.image_url, undefined);
  assert.equal(patch.attributes.secret, "keep");
  assert.deepEqual(patch.attributes.images[0], previous);
  assert.equal(patch.attributes.images.length, 2);
  assert.deepEqual(patch.attributes.images[1], result.image);
  assert.equal(result.image.url, "/api/tg-image/extra");
  assert.equal(result.image.title, "Extra");
  assert.equal(result.entity.image_url, original.image_url);
  assert.ok(success.calls.some(call => call[0] === "eq" && call[1] === "mcp_revision" && call[2] === 2));
});


test("campaign documents are excluded by default and require explicit protected collection", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  const standard = fakeDb([{ id: campaign, admin_drafts_enabled: true }, []]);
  await executeContent(admin(standard.db), { operation: "search_lore", args: { campaign_id: campaign, query: "Frondargento", admin_only: true } });
  assert(standard.calls.some(call => call[0] === "eq" && call[1] === "is_campaign_document" && call[2] === false));
  const documents = fakeDb([{ id: campaign, admin_drafts_enabled: true }, [{ ...row, is_campaign_document: true }]]);
  const result: any = await executeContent(admin(documents.db), { operation: "search_lore", args: { campaign_id: campaign, query: "Frondargento", collection: "documents", admin_only: true } });
  assert(documents.calls.some(call => call[0] === "eq" && call[1] === "is_campaign_document" && call[2] === true));
  assert.equal(result.entities[0].is_campaign_document, true);
  const unprotected = fakeDb([{ id: campaign, admin_drafts_enabled: true }]);
  await assert.rejects(executeContent(admin(unprotected.db), { operation: "search_lore", args: { campaign_id: campaign, query: "Frondargento", collection: "documents" } }), (error: any) => error.status === 404);
  assert.throws(() => validate({ operation: "search_lore", args: { campaign_id: campaign, query: "x", collection: "gm_notes" } }), ApiError);
});


test("MCP moves campaign documents with revision lock and never releases Admin protection", async () => {
  process.env.MCP_CAMPAIGN_ID = campaign;
  const moved = { ...row, is_campaign_document: true, mcp_revision: 3 };
  const move = fakeDb([{ id: campaign, admin_drafts_enabled: true }, row, moved]);
  const result: any = await executeContent(admin(move.db), { operation: "update_entity", args: { campaign_id: campaign, entity_id: entityId, revision: 2, admin_only: true, is_campaign_document: true } });
  assert.deepEqual(move.calls.find(call => call[0] === "update")?.[1], { admin_only: true, is_campaign_document: true });
  assert.equal(result.entity.is_campaign_document, true);
  const restore = fakeDb([{ id: campaign, admin_drafts_enabled: true }, moved, { ...moved, is_campaign_document: false, mcp_revision: 4 }]);
  await executeContent(admin(restore.db), { operation: "update_entity", args: { campaign_id: campaign, entity_id: entityId, revision: 3, admin_only: true, is_campaign_document: false } });
  assert.deepEqual(restore.calls.find(call => call[0] === "update")?.[1], { admin_only: true, is_campaign_document: false });
  assert.throws(() => validate({ operation: "update_entity", args: { campaign_id: campaign, entity_id: entityId, revision: 2, is_campaign_document: "yes" } }), ApiError);
});
