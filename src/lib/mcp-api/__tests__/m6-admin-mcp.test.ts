import test from "node:test";
import assert from "node:assert/strict";
import { executeContent } from "../service";
import { validate, ApiError } from "../contracts";
import { handleContent } from "../handler";

const campaign = "11111111-1111-4111-8111-111111111111";
const entityId = "22222222-2222-4222-8222-222222222222";
const row = { id: entityId, campaign_id: campaign, type: "lore", name: "Sentinel", content: { body: "private" }, attributes: {}, admin_only: true, mcp_status: "draft", mcp_revision: 2 };

function fakeDb(results: unknown[]) {
  const calls: unknown[][] = [];
  const db: any = {
    from(table: string) {
      calls.push(["from", table]);
      const query: any = {};
      for (const method of ["select", "eq", "or", "order", "range", "insert", "update"]) query[method] = (...args: unknown[]) => { calls.push([method, ...args]); return query; };
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

test("API rejects absent bearer before any content operation", async () => {
  const response = await handleContent(new Request("http://localhost/api/integrations/content", { method: "POST", body: "{}" }));
  assert.equal(response.status, 401);
});
