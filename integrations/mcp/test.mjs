import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, backendClient, definitions } from "./tools.mjs";

const campaign = "11111111-1111-4111-8111-111111111111";

test("MCP exposes one personal Admin surface with admin_only contracts", async () => {
  const calls = [];
  const server = createServer(async (name, args) => { calls.push([name, args]); return { ok: true }; });
  const client = new Client({ name: "m6-test", version: "1" });
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport); await client.connect(clientTransport);
  try {
    const listed = await client.listTools();
    assert.equal(listed.tools.length, 9);
    assert.equal(listed.tools.find((tool) => tool.name === "search_lore").inputSchema.properties.admin_only.type, "boolean");
    await client.callTool({ name: "search_lore", arguments: { campaign_id: campaign, query: "secret", admin_only: true } });
    assert.equal(calls[0][1].admin_only, true);
  } finally { await client.close(); await server.close(); }
});

test("bridge forwards only a bearer token to the Next API and rejects unsafe backend URLs", async () => {
  assert.throws(() => backendClient("http://untrusted.test", "token"));
  const bridge = backendClient("https://bd.example", "user-token", async (url, options) => {
    assert.equal(url.href, "https://bd.example/api/integrations/content");
    assert.equal(options.headers.Authorization, "Bearer user-token");
    assert.equal(options.redirect, "error");
    return new Response(JSON.stringify({ entities: [] }), { headers: { "content-type": "application/json" } });
  });
  assert.deepEqual(await bridge("search_lore", { campaign_id: campaign, query: "secret" }), { entities: [] });
});

test("MCP transport contains no database or service-role path", async () => {
  const source = await readFile(new URL("./server.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /supabase|service_role|postgres|database/i);
  assert.match(source, /api\/integrations\/content\/auth/);
  assert.match(source, /sessionIdGenerator:\s*undefined/);
  assert.deepEqual(Object.keys(definitions).sort(), ["attach_asset", "create_location", "create_lore", "create_npc", "get_entity", "search_lore", "set_status", "update_entity", "upload_asset"]);
});
