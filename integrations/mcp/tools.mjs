import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const campaign_id = z.string().uuid();
const entity_id = z.string().uuid();
const revision = z.number().int().positive();
const admin_only = z.boolean().optional();
const create = { campaign_id, name: z.string().trim().min(1).max(200), body: z.string().max(100000), attributes: z.record(z.unknown()).optional(), admin_only };

export const definitions = {
  search_lore: { description: "Search the scoped campaign Wiki. Admin-only rows require the verified personal Admin scope.", schema: { campaign_id, query: z.string().min(1).max(200), limit: z.number().int().min(1).max(50).optional(), offset: z.number().int().min(0).max(10000).optional(), admin_only }, read: true },
  get_entity: { description: "Read a scoped Wiki entity and its revision. Admin-only rows require the verified personal Admin scope.", schema: { campaign_id, entity_id, admin_only }, read: true },
  create_lore: { description: "Create scoped private draft lore; set admin_only only for protected Admin content.", schema: create },
  create_npc: { description: "Create a scoped private draft NPC.", schema: create },
  create_location: { description: "Create a scoped private draft location.", schema: create },
  update_entity: { description: "Patch a scoped entity using its current revision. Revision conflicts must be reread.", schema: { campaign_id, entity_id, revision, name: create.name.optional(), body: create.body.optional(), attributes: create.attributes, admin_only } },
  upload_asset: { description: "Store a scoped private PNG/JPEG/WebP/PDF supplied as base64; no remote URL fetching.", schema: { campaign_id, filename: z.string().min(1).max(120), mime_type: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]), data_base64: z.string().max(699052) } },
  attach_asset: { description: "Attach a scoped uploaded asset to a Wiki entity.", schema: { campaign_id, entity_id, asset_id: z.string().uuid() } },
  set_status: { description: "Set editorial status on a scoped entity with its current revision.", schema: { campaign_id, entity_id, revision, status: z.enum(["draft", "proposed", "canonical", "deprecated"]) } },
};

export function createServer(callBackend) {
  const server = new McpServer({ name: "barber-and-dragons", version: "0.1.0" });
  for (const [name, def] of Object.entries(definitions)) server.registerTool(name, {
    description: def.description,
    inputSchema: z.object(def.schema).strict(),
    annotations: { readOnlyHint: !!def.read, destructiveHint: !def.read, idempotentHint: !!def.read, openWorldHint: false },
  }, async (args) => {
    try {
      const data = await callBackend(name, args);
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: error.message || "Backend request failed" }] };
    }
  });
  return server;
}

/** The transport can only call the Next API; it never imports or connects to Supabase. */
export function backendClient(baseUrl, token, fetcher = fetch) {
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new Error("Backend requires HTTPS or localhost");
  if (url.username || url.password) throw new Error("Credentials in URL forbidden");
  return async (operation, args) => {
    const response = await fetcher(new URL("/api/integrations/content", url), {
      method: "POST", redirect: "error", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ operation, args }), signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`B&D API ${response.status}: ${(await response.json().catch(() => ({}))).error ?? "Request failed"}`);
    return response.json();
  };
}
