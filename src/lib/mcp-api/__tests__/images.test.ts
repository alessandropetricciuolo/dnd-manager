import test from "node:test";
import assert from "node:assert/strict";
import { imageBlock, imageToolResult, isPublicAddress, readSiteImages } from "../images";
import { executeContent } from "../service";
import { validate } from "../contracts";

const campaign = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9WQAAAAASUVORK5CYII=", "base64");
const auth: any = { isAdmin: true, userId: id, db: { from() { throw new Error("Unexpected attachment access"); } } };

test("image contracts require a scoped parent and bounded pagination, never arbitrary URLs", () => {
  assert.equal(validate({ operation: "read_entity_images", args: { campaign_id: campaign, entity_id: id, limit: 3 } }).operation, "read_entity_images");
  for (const extra of [{ limit: 4 }, { offset: -1 }, { url: "https://example.com" }]) assert.throws(() => validate({ operation: "read_entity_images", args: { campaign_id: campaign, entity_id: id, ...extra } }));
  assert.throws(() => validate({ operation: "read_map_image", args: { campaign_id: campaign } }));
});

test("parent authorization happens before any fetch; existing service rejects cross-campaign and non-admin reads", async () => {
  let fetched = false;
  await assert.rejects(readSiteImages(auth, "read_entity_images", { campaign_id: campaign, entity_id: id }, async () => { throw new Error("Forbidden"); }, async () => { fetched = true; return png; }));
  assert.equal(fetched, false);
  process.env.MCP_CAMPAIGN_ID = campaign;
  for (const [actor, scope] of [[{ ...auth, isAdmin: false }, campaign], [auth, id]] as const) {
    await assert.rejects(executeContent(actor, { operation: "read_entity_images", args: { campaign_id: scope, entity_id: id } }, { fetchImage: async () => { fetched = true; return png; } }));
  }
  assert.equal(fetched, false);
});

test("Wiki and Atlas return native image blocks, source context, and no base64 in text", async () => {
  for (const operation of ["read_entity_images", "read_map_image"]) {
    const result = await readSiteImages(auth, operation, { campaign_id: campaign, entity_id: id, map_id: id, admin_only: true }, async (raw: any) => {
      assert.equal(raw.args.admin_only, true);
      return { entity: { id, name: "Rudolf", body: "Lore", image_url: "/api/tg-image/photo" }, assets: [], map: { id, name: "Almaria", image_url: "/api/tg-image/map" } };
    }, async () => png);
    const output = imageToolResult(result);
    assert.equal(output.content[1].type, "image");
    assert.equal(result.images[0].data, png.toString("base64"));
    assert.equal(result.images[0].mimeType, "image/png");
    const text = output.content[0];
    assert.equal(text.type, "text");
    if (text.type === "text") assert.ok(!text.text.includes(png.toString("base64")));
    assert.equal(output.structuredContent.source.id, id);
  }
});

test("missing and failed images are explicit; bad signatures and oversized files are rejected", async () => {
  const read = async () => ({ entity: { id, name: "X", image_url: "https://example.com/x" }, assets: [] });
  const result = await readSiteImages(auth, "read_entity_images", {}, read, async () => Buffer.from("<html>"));
  assert.equal(result.references[0].status, "unavailable");
  assert.equal(imageToolResult(result).isError, true);
  assert.throws(() => imageBlock(Buffer.alloc(3 * 1024 * 1024 + 1)));
  const empty = await readSiteImages(auth, "read_entity_images", {}, async () => ({ entity: { id, name: "X" }, assets: [] }));
  assert.equal(empty.total, 0);
  assert.equal(empty.images.length, 0);
});

test("image attachments are scoped, PDFs excluded, and pagination downloads only the selected image", async () => {
  const calls: unknown[] = [];
  const actor: any = { ...auth, db: { from(table: string) {
    calls.push(table);
    const q: any = {};
    for (const method of ["select", "eq", "in"]) q[method] = (...args: unknown[]) => { calls.push([method, ...args]); return q; };
    q.then = (resolve: any) => Promise.resolve({ data: [{ id, mime_type: "image/png" }, { id: "pdf", mime_type: "application/pdf" }], error: null }).then(resolve);
    q.maybeSingle = async () => ({ data: { data_base64: png.toString("base64") }, error: null });
    return q;
  } } };
  const result = await readSiteImages(actor, "read_entity_images", { campaign_id: campaign, offset: 1 }, async () => ({ entity: { id, name: "X", image_url: "unused" }, assets: [{ asset_id: id }, { asset_id: "pdf" }] }), async () => { throw new Error("Primary must not be downloaded"); });
  assert.equal(result.total, 2);
  assert.equal(result.images.length, 1);
  assert.equal(result.references[0].asset_id, id);
  assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(["eq", "campaign_id", campaign])));
});

test("image fetching blocks private, link-local, multicast and mapped IPv6 addresses", () => {
  for (const ip of ["127.0.0.1", "10.2.3.4", "172.31.1.1", "169.254.169.254", "192.168.1.1", "100.64.0.1", "224.0.0.1", "::1", "::ffff:127.0.0.1", "fc00::1", "2001:db8::1"]) assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("8.8.8.8"), true);
});


test("native MCP server delivers an authorized attached image and hides protected parents by default", async () => {
  const { createBdMcpServer } = await import("../../mcp-server");
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");
  process.env.MCP_CAMPAIGN_ID = campaign;
  const calls: unknown[] = [];
  const db: any = { from(table: string) {
    const filters: Record<string, unknown> = {};
    const q: any = {};
    q.select = () => q;
    q.in = () => q;
    q.eq = (key: string, value: unknown) => { filters[key] = value; calls.push([key, value]); return q; };
    const data = () => table === "campaigns" ? { id: campaign, admin_drafts_enabled: true } :
      table === "wiki_entities" ? (filters.admin_only === false ? null : { id, name: "Rudolf", type: "npc", content: { body: "Lore" }, admin_only: true, mcp_revision: 1 }) :
      table === "mcp_entity_assets" ? [{ asset_id: id }] :
      filters.id ? { data_base64: png.toString("base64") } : [{ id, mime_type: "image/png" }];
    q.maybeSingle = async () => ({ data: data(), error: null });
    q.then = (resolve: any) => Promise.resolve({ data: data(), error: null }).then(resolve);
    return q;
  } };
  const server = createBdMcpServer({ ...auth, db });
  const client = new Client({ name: "native-image-test", version: "1" });
  const [st, ct] = InMemoryTransport.createLinkedPair();
  await server.connect(st); await client.connect(ct);
  try {
    const listed = await client.listTools();
    assert.equal(listed.tools.find(tool => tool.name === "read_entity_images")?.annotations?.readOnlyHint, true);
    const hidden = await client.callTool({ name: "read_entity_images", arguments: { campaign_id: campaign, entity_id: id } });
    assert.equal(hidden.isError, true);
    assert.ok(Array.isArray(hidden.content));
    assert.equal(hidden.content.length, 1);
    const visible = await client.callTool({ name: "read_entity_images", arguments: { campaign_id: campaign, entity_id: id, admin_only: true } });
    assert.ok(Array.isArray(visible.content));
    assert.equal(visible.content[1].type, "image");
    assert.equal((visible.content[1] as any).data, png.toString("base64"));
    assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify(["admin_only", false])));
  } finally { await client.close(); await server.close(); }
});
