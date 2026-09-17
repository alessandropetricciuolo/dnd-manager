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

  const protectedEndpoint = fakeDb([{ id: campaign, admin_drafts_enabled: true }, { ...source, admin_only: true }, target]);
  await assert.rejects(executeContent(admin(protectedEndpoint.db), { operation: "upsert_wiki_relationship", args: { campaign_id: campaign, source_id: entityId, target_id: targetId, label: "contiene" } }), (error: any) => error.status === 404);
  assert(!protectedEndpoint.calls.some((call) => call[0] === "insert"));
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
