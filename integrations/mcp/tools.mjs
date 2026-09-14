import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const campaign_id = z.string().uuid();
const entity_id = z.string().uuid();
const revision = z.number().int().positive();
const admin_only = z.boolean().optional();
const create = { campaign_id, name: z.string().trim().min(1).max(200), body: z.string().max(100000), attributes: z.record(z.unknown()).optional(), admin_only };
const createMonster = { ...create, xp_value: z.number().int().min(0).optional(), is_core: z.boolean().optional() };

export const definitions = {
  search_lore: { description: "Search the scoped campaign Wiki. Admin-only rows require the verified personal Admin scope.", schema: { campaign_id, query: z.string().min(1).max(200), limit: z.number().int().min(1).max(50).optional(), offset: z.number().int().min(0).max(10000).optional(), admin_only }, read: true },
  get_entity: { description: "Read a scoped Wiki entity and its revision. Admin-only rows require the verified personal Admin scope.", schema: { campaign_id, entity_id, admin_only }, read: true },
  search_maps: { description: "List or search scoped Atlas maps before creation to resolve parent IDs and prevent duplicates.", schema: { campaign_id, query: z.string().trim().min(1).max(200).optional(), map_type: z.enum(["world", "continent", "city", "dungeon", "district", "building"]).optional(), limit: z.number().int().min(1).max(100).optional(), offset: z.number().int().min(0).max(10000).optional(), admin_only }, read: true },
  get_map: { description: "Read a scoped Atlas map by ID after search or creation.", schema: { campaign_id, map_id: entity_id, admin_only }, read: true },
  create_lore: { description: "Create scoped private draft lore; set admin_only only for protected Admin content.", schema: create },
  create_npc: { description: "Create a scoped private draft NPC.", schema: create },
  create_location: { description: "Create a scoped private draft location.", schema: create },
  create_item: { description: "Create a scoped private draft item.", schema: create },
  create_monster: { description: "Create a scoped private draft monster, including combat attributes and XP.", schema: createMonster },
  update_entity: { description: "Patch a scoped entity using its current revision. Revision conflicts must be reread.", schema: { campaign_id, entity_id, revision, name: create.name.optional(), body: create.body.optional(), attributes: create.attributes, admin_only } },
  upload_asset: { description: "Store a scoped private PNG/JPEG/WebP/PDF supplied as base64; no remote URL fetching.", schema: { campaign_id, filename: z.string().min(1).max(120), mime_type: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]), data_base64: z.string().max(699052) } },
  attach_asset: { description: "Attach a scoped uploaded asset to a Wiki entity.", schema: { campaign_id, entity_id, asset_id: z.string().uuid() } },
  upload_entity_image: { description: "Upload and set the primary image of a scoped Wiki entity using its current revision. Supports PNG/JPEG/WebP up to 3 MiB.", schema: { campaign_id, entity_id, revision, filename: z.string().min(1).max(120), mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]), data_base64: z.string().max(4194304) } },
  upload_map: { description: "Create a scoped Atlas map from an HTTPS image URL or upload a PNG/JPEG/WebP up to 3 MiB. Defaults to secret.", schema: { campaign_id, name: z.string().trim().min(1).max(200), description: z.string().max(10000).optional(), map_type: z.enum(["world", "continent", "city", "dungeon", "district", "building"]).optional(), visibility: z.enum(["secret", "public"]).optional(), parent_map_id: entity_id.optional(), admin_only, image_url: z.string().url().optional(), filename: z.string().min(1).max(120).optional(), mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]).optional(), data_base64: z.string().max(4194304).optional() } },
  set_status: { description: "Set editorial status on a scoped entity with its current revision.", schema: { campaign_id, entity_id, revision, status: z.enum(["draft", "proposed", "canonical", "deprecated"]) } },
  search_missions: { description: "List or search the real campaign mission board.", schema: { campaign_id, query: z.string().max(200).optional(), status: z.enum(["open", "in_progress", "completed"]).optional(), limit: z.number().int().min(1).max(50).optional(), offset: z.number().int().min(0).max(10000).optional() }, read: true },
  get_mission: { description: "Read one mission and its updated_at concurrency token.", schema: { campaign_id, mission_id: entity_id }, read: true },
  create_mission: { description: "Create a real open mission after duplicate validation.", schema: { campaign_id, grade: z.string().trim().min(1).max(20), title: z.string().trim().min(1).max(200), committente: z.string().trim().min(1).max(500), ubicazione: z.string().trim().min(1).max(500), paga: z.string().trim().min(1).max(500), urgenza: z.string().trim().min(1).max(500), description: z.string().trim().min(1).max(100000), points_reward: z.number().int().min(0).optional() } },
  update_mission: { description: "Patch a mission using expected_updated_at.", schema: { campaign_id, mission_id: entity_id, expected_updated_at: z.string().min(1), grade: z.string().trim().min(1).max(20).optional(), title: z.string().trim().min(1).max(200).optional(), committente: z.string().trim().min(1).max(500).optional(), ubicazione: z.string().trim().min(1).max(500).optional(), paga: z.string().trim().min(1).max(500).optional(), urgenza: z.string().trim().min(1).max(500).optional(), description: z.string().trim().min(1).max(100000).optional(), points_reward: z.number().int().min(0).optional() } },
  set_mission_status: { description: "Set an unfinished mission to open or in progress.", schema: { campaign_id, mission_id: entity_id, expected_updated_at: z.string().min(1), status: z.enum(["open", "in_progress"]) } },
  complete_mission: { description: "Complete a mission and assign guild and treasure.", schema: { campaign_id, mission_id: entity_id, expected_updated_at: z.string().min(1), guild_id: entity_id.optional(), treasure_gp: z.number().int().min(0).optional(), treasure_sp: z.number().int().min(0).optional(), treasure_cp: z.number().int().min(0).optional() } },
  reopen_mission: { description: "Reopen a completed mission.", schema: { campaign_id, mission_id: entity_id, expected_updated_at: z.string().min(1) } },
  delete_mission: { description: "Permanently delete a mission using its concurrency token.", schema: { campaign_id, mission_id: entity_id, expected_updated_at: z.string().min(1) } },
  list_mission_encounters: { description: "List mission encounters.", schema: { campaign_id, mission_id: entity_id.optional() }, read: true },
  create_mission_encounter: { description: "Create a mission encounter.", schema: { campaign_id, mission_id: entity_id, name: z.string().trim().min(1).max(200), notes: z.string().max(10000).nullable().optional() } },
  update_mission_encounter: { description: "Update a mission encounter.", schema: { campaign_id, encounter_id: entity_id, name: z.string().trim().min(1).max(200), notes: z.string().max(10000).nullable().optional() } },
  delete_mission_encounter: { description: "Permanently delete a mission encounter.", schema: { campaign_id, encounter_id: entity_id } },
  replace_encounter_monsters: { description: "Replace an encounter monster lineup.", schema: { campaign_id, encounter_id: entity_id, monsters: z.array(z.object({ wiki_entity_id: entity_id, quantity: z.number().int().min(1) }).strict()).max(100) } },
  link_mission_resource: { description: "Link a Wiki entity, exploration map, or scene to a mission.", schema: { campaign_id, mission_id: entity_id, resource_type: z.enum(["wiki", "exploration_map", "scene"]), resource_id: entity_id } },
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
