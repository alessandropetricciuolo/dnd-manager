import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { getWikiContentBody, getWikiContentDescription } from "../content";

const campaignId = "d9962add-4d55-42ef-bfd7-96eddfe49969";
type Row = Record<string, unknown>;
type Scenario = { role?: string; authenticated?: boolean; campaign?: boolean; rows?: Record<string, Row[]> };

// Execute the actual server actions with a request-scoped, filtered database double.
// No Supabase connection, credentials, network or production writes are involved.
function actions(scenario: Scenario) {
  const queries: string[] = [];
  const supabase = {
    auth: { getUser: async () => ({ data: { user: scenario.authenticated === false ? null : { id: "user" } }, error: null }) },
    from(table: string) {
      queries.push(table);
      let rows = table === "profiles" ? [{ role: scenario.role ?? "gm" }] : table === "campaigns" ? scenario.campaign === false ? [] : [{ id: campaignId, name: "Test" }] : scenario.rows?.[table] ?? [];
      let from = 0, to = Number.MAX_SAFE_INTEGER;
      const query = {
        select() { return query; },
        eq(column: string, value: unknown) { rows = rows.filter(row => row[column] === value || table === "profiles" && column === "id"); return query; },
        is(column: string, value: unknown) { rows = rows.filter(row => (row[column] ?? null) === value); return query; },
        order() { return query; },
        range(a: number, b: number) { from = a; to = b; return query; },
        async single() { return { data: rows[0] ?? null, error: rows.length ? null : { message: "not found" } }; },
        then(resolve: (value: unknown) => unknown) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }).then(resolve); },
      };
      return query;
    },
  };
  const source = readFileSync(new URL("../../../app/campaigns/wiki-geography-actions.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports: Record<string, (...args: unknown[]) => Promise<any>> = {};
  runInNewContext(compiled, { exports, require: (id: string) => {
    if (id === "@/utils/supabase/server") return { createSupabaseServerClient: async () => supabase };
    if (id === "@/lib/wiki/content") return { getWikiContentBody, getWikiContentDescription };
    throw new Error(`Unexpected import: ${id}`);
  } });
  return { exports, queries };
}

test("anonymous and player requests cannot read geographic Wiki data", async () => {
  for (const scenario of [{ authenticated: false }, { role: "player" }]) {
    const { exports, queries } = actions(scenario);
    assert.equal((await exports.getWikiGeographyData(campaignId)).success, false);
    assert.equal(queries.includes("wiki_entities"), false);
    assert.equal(queries.includes("maps"), false);
  }
});

test("an inaccessible campaign is rejected before loading endpoints", async () => {
  const { exports, queries } = actions({ campaign: false });
  assert.equal((await exports.getWikiGeographyData(campaignId)).success, false);
  assert.equal(queries.includes("wiki_entities"), false);
});

test("GM responses exclude Admin endpoints, documents, archives and cross-campaign links", async () => {
  const rows = {
    wiki_entities: [
      { id: "visible", campaign_id: campaignId, admin_only: false, is_campaign_document: false },
      { id: "admin", campaign_id: campaignId, admin_only: true, is_campaign_document: false },
      { id: "document", campaign_id: campaignId, admin_only: false, is_campaign_document: true },
      { id: "archive", campaign_id: campaignId, admin_only: false, is_campaign_document: false, archived_at: "yesterday" },
      { id: "foreign", campaign_id: "other", admin_only: false, is_campaign_document: false },
    ],
    maps: [
      { id: "map", campaign_id: campaignId, admin_only: false, wiki_entity_id: "admin" },
      { id: "hidden-map", campaign_id: campaignId, admin_only: true },
    ],
    wiki_relationships: [
      { id: "ok", campaign_id: campaignId, source_id: "visible", target_map_id: "map", label: "vive a" },
      { id: "secret", campaign_id: campaignId, source_id: "visible", target_id: "admin" },
      { id: "private-map", campaign_id: campaignId, source_id: "visible", target_map_id: "hidden-map" },
      { id: "foreign", campaign_id: "other", source_id: "visible", target_map_id: "map" },
    ],
  };
  const { exports } = actions({ rows });
  const result = await exports.getWikiGeographyData(campaignId);
  assert.equal(result.success, true);
  assert.deepEqual(Array.from(result.data.entities, (row: any) => row.id), ["visible"]);
  assert.deepEqual(Array.from(result.data.relationships, (row: any) => row.id), ["ok"]);
  assert.equal(result.data.maps[0].wikiEntityId, null);
  const admin = await actions({ role: "admin", rows }).exports.getWikiGeographyData(campaignId);
  assert.deepEqual(Array.from(admin.data.entities, (row: any) => row.id), ["visible", "admin"]);
});

test("pagination retrieves more than the default API row limit", async () => {
  const { exports } = actions({ rows: {
    wiki_entities: [{ id: "npc", campaign_id: campaignId, admin_only: false, is_campaign_document: false }],
    maps: [{ id: "map", campaign_id: campaignId, admin_only: false }],
    wiki_relationships: Array.from({ length: 1205 }, (_, i) => ({ id: `r-${i}`, campaign_id: campaignId, source_id: "npc", target_map_id: "map", label: "vive a" })),
  } });
  const result = await exports.getWikiGeographyData(campaignId);
  assert.equal(result.success, true);
  assert.equal(result.data.relationships.length, 1205);
});

test("on-demand dossier reads enforce role and protected endpoints independently", async () => {
  const entityId = "020b690e-efdf-4e52-9874-2287dfee8192";
  const rows = { wiki_entities: [{ id: entityId, campaign_id: campaignId, admin_only: true, is_campaign_document: false, content: { body: "Private" } }] };
  assert.equal((await actions({ role: "player", rows }).exports.getWikiGeographyDetail(campaignId, { kind: "wiki", id: entityId })).success, false);
  assert.equal((await actions({ role: "gm", rows }).exports.getWikiGeographyDetail(campaignId, { kind: "wiki", id: entityId })).success, false);
  const result = await actions({ role: "admin", rows }).exports.getWikiGeographyDetail(campaignId, { kind: "wiki", id: entityId });
  assert.equal(result.success, true);
  assert.equal(result.data.body, "Private");
});
