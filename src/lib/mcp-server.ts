import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { McpAuthContext } from "@/lib/mcp-api/auth";
import { imageToolResult, type readSiteImages } from "@/lib/mcp-api/images";
import { executeContent } from "@/lib/mcp-api/service";

const campaignId = z.string().uuid();
const entityId = z.string().uuid();
const revision = z.number().int().positive();
const adminOnly = z.boolean().optional();
const create = {
  campaign_id: campaignId,
  name: z.string().trim().min(1).max(200),
  body: z.string().max(100_000),
  attributes: z.record(z.string(), z.unknown()).optional(),
  admin_only: adminOnly,
};
const createMonster = {
  ...create,
  xp_value: z.number().int().min(0).optional(),
  is_core: z.boolean().optional(),
};

const oauthSecurity = [{ type: "oauth2", scopes: ["openid", "email", "profile", "offline_access"] }];
type ContentOperation = Parameters<typeof executeContent>[1] & { operation: string };

export function createBdMcpServer(auth: McpAuthContext) {
  const server = new McpServer({ name: "barber-and-dragons", version: "0.1.0" });

  const register = (name: string, description: string, inputSchema: Record<string, z.ZodType>, readOnly: boolean) => {
    server.registerTool(name, {
      title: name.replaceAll("_", " "),
      description,
      inputSchema: z.object(inputSchema).strict(),
      annotations: {
        readOnlyHint: readOnly,
        destructiveHint: !readOnly,
        idempotentHint: readOnly,
        openWorldHint: false,
      },
      _meta: { securitySchemes: oauthSecurity },
    }, async (args) => {
      try {
        const result = await executeContent(auth, { operation: name, args } as ContentOperation);
        if (name === "read_entity_images" || name === "read_map_image") return imageToolResult(result as Awaited<ReturnType<typeof readSiteImages>>);
        return {
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
          structuredContent: result,
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text" as const, text: error instanceof Error ? error.message : "B&D request failed" }],
        };
      }
    });
  };

  register("search_lore", "Search the scoped campaign Wiki. Admin-only rows require explicit opt-in.", {
    campaign_id: campaignId,
    query: z.string().min(1).max(200),
    limit: z.number().int().min(1).max(50).optional(),
    offset: z.number().int().min(0).max(10_000).optional(),
    admin_only: adminOnly,
  }, true);
  register("get_entity", "Read a scoped Wiki entity and its current revision.", {
    campaign_id: campaignId,
    entity_id: entityId,
    admin_only: adminOnly,
  }, true);
  register("read_entity_images", "See actual primary, gallery and attached Wiki images before generating coherent artwork. Returns native image blocks plus source metadata; pass received images as visual references to the image generator. Paginate up to 3 images per call. PDFs are excluded. Admin-only content requires explicit opt-in.", { campaign_id: campaignId, entity_id: entityId, admin_only: adminOnly, offset: z.number().int().min(0).max(10000).optional(), limit: z.number().int().min(1).max(3).optional() }, true);
  register("read_map_image", "See the actual scoped Atlas map as a visual reference for coherent artwork. Admin-only content requires explicit opt-in.", { campaign_id: campaignId, map_id: entityId, admin_only: adminOnly }, true);
  register("list_wiki_relationships", "List real Wiki-to-Wiki and Wiki-to-map relationship rows with endpoint metadata. Admin-only endpoints require explicit opt-in.", {
    campaign_id: campaignId,
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).max(10_000).optional(),
    admin_only: adminOnly,
  }, true);
  register("upsert_wiki_relationship", "Idempotently create one real Wiki-to-Wiki or Wiki-to-map relationship and return its database readback. Call twice for a bidirectional Wiki pair.", {
    campaign_id: campaignId,
    source_id: entityId,
    target_id: entityId.optional(),
    target_map_id: entityId.optional(),
    label: z.string().trim().min(1).max(200),
    admin_only: adminOnly,
  }, false);
  register("search_maps", "List or search scoped Atlas maps before creating one. Use this to resolve parent IDs and prevent duplicates.", {
    campaign_id: campaignId,
    query: z.string().trim().min(1).max(200).optional(),
    map_type: z.enum(["world", "continent", "city", "dungeon", "district", "building"]).optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).max(10_000).optional(),
    admin_only: adminOnly,
  }, true);
  register("get_map", "Read a scoped Atlas map by ID after search or creation, including its parent and image reference.", {
    campaign_id: campaignId,
    map_id: entityId,
    admin_only: adminOnly,
  }, true);
  register("create_lore", "Create private draft lore; use admin_only for protected Admin content.", create, false);
  register("create_npc", "Create a private draft NPC.", create, false);
  register("create_location", "Create a private draft location.", create, false);
  register("create_item", "Create a private draft item.", create, false);
  register("create_monster", "Create a private draft monster, including combat attributes and XP.", createMonster, false);
  register("update_entity", "Patch an entity using its current revision; protected content cannot be downgraded.", {
    campaign_id: campaignId,
    entity_id: entityId,
    revision,
    name: create.name.optional(),
    body: create.body.optional(),
    attributes: create.attributes,
    admin_only: adminOnly,
  }, false);
  register("upload_asset", "Store a private PNG, JPEG, WebP, or PDF supplied as base64.", {
    campaign_id: campaignId,
    filename: z.string().min(1).max(120),
    mime_type: z.enum(["image/png", "image/jpeg", "image/webp", "application/pdf"]),
    data_base64: z.string().max(699_052),
  }, false);
  register("attach_asset", "Attach a scoped uploaded asset to a Wiki entity.", {
    campaign_id: campaignId,
    entity_id: entityId,
    asset_id: entityId,
  }, false);
  register("upload_entity_image", "Upload a Wiki image using its current revision. Use mode gallery to ADD an additional visible image, preserving the cover and all existing gallery images. Mode primary (default for compatibility) REPLACES the cover. For multiple images, upload one at a time using each returned revision. Supports PNG, JPEG, or WebP up to 3 MiB.", {
    campaign_id: campaignId,
    entity_id: entityId,
    revision,
    filename: z.string().min(1).max(120),
    mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]),
    data_base64: z.string().max(4_194_304),
    mode: z.enum(["primary", "gallery"]).optional(),
    title: z.string().max(200).optional(),
  }, false);
  register("upload_map", "Create a scoped Atlas map from an HTTPS image URL or upload a PNG, JPEG, or WebP up to 3 MiB. Maps default to secret.", {
    campaign_id: campaignId,
    name: z.string().trim().min(1).max(200),
    description: z.string().max(10_000).optional(),
    map_type: z.enum(["world", "continent", "city", "dungeon", "district", "building"]).optional(),
    visibility: z.enum(["secret", "public"]).optional(),
    parent_map_id: entityId.optional(),
    admin_only: adminOnly,
    image_url: z.string().url().optional(),
    filename: z.string().min(1).max(120).optional(),
    mime_type: z.enum(["image/png", "image/jpeg", "image/webp"]).optional(),
    data_base64: z.string().max(4_194_304).optional(),
  }, false);
  register("set_status", "Set editorial status using the entity's current revision.", {
    campaign_id: campaignId,
    entity_id: entityId,
    revision,
    status: z.enum(["draft", "proposed", "canonical", "deprecated"]),
  }, false);

  const missionFields = { grade: z.string().trim().min(1).max(20), title: z.string().trim().min(1).max(200), committente: z.string().trim().min(1).max(500), ubicazione: z.string().trim().min(1).max(500), paga: z.string().trim().min(1).max(500), urgenza: z.string().trim().min(1).max(500), description: z.string().trim().min(1).max(100_000), points_reward: z.number().int().min(0).optional() };
  register("search_missions", "List or search the real campaign mission board before creating or editing.", { campaign_id: campaignId, query: z.string().max(200).optional(), status: z.enum(["open", "in_progress", "completed"]).optional(), limit: z.number().int().min(1).max(50).optional(), offset: z.number().int().min(0).max(10_000).optional() }, true);
  register("get_mission", "Read one mission and its updated_at concurrency token.", { campaign_id: campaignId, mission_id: entityId }, true);
  register("create_mission", "Create a real open mission after duplicate-title validation.", { campaign_id: campaignId, ...missionFields }, false);
  register("update_mission", "Patch a mission using expected_updated_at from get_mission.", { campaign_id: campaignId, mission_id: entityId, expected_updated_at: z.string().min(1), ...Object.fromEntries(Object.entries(missionFields).map(([key, value]) => [key, value.optional()])) }, false);
  register("set_mission_status", "Set an unfinished mission to open or in progress.", { campaign_id: campaignId, mission_id: entityId, expected_updated_at: z.string().min(1), status: z.enum(["open", "in_progress"]) }, false);
  register("complete_mission", "Complete a mission and optionally assign guild, points, and treasure.", { campaign_id: campaignId, mission_id: entityId, expected_updated_at: z.string().min(1), guild_id: entityId.optional(), treasure_gp: z.number().int().min(0).optional(), treasure_sp: z.number().int().min(0).optional(), treasure_cp: z.number().int().min(0).optional() }, false);
  register("reopen_mission", "Reopen a completed mission and reverse awarded guild points.", { campaign_id: campaignId, mission_id: entityId, expected_updated_at: z.string().min(1) }, false);
  register("delete_mission", "Permanently delete a mission using its concurrency token.", { campaign_id: campaignId, mission_id: entityId, expected_updated_at: z.string().min(1) }, false);
  register("list_mission_encounters", "List encounters for the campaign or one mission.", { campaign_id: campaignId, mission_id: entityId.optional() }, true);
  register("create_mission_encounter", "Create an encounter for a mission.", { campaign_id: campaignId, mission_id: entityId, name: z.string().trim().min(1).max(200), notes: z.string().max(10_000).nullable().optional() }, false);
  register("update_mission_encounter", "Update an encounter.", { campaign_id: campaignId, encounter_id: entityId, name: z.string().trim().min(1).max(200), notes: z.string().max(10_000).nullable().optional() }, false);
  register("delete_mission_encounter", "Permanently delete an encounter.", { campaign_id: campaignId, encounter_id: entityId }, false);
  register("replace_encounter_monsters", "Replace an encounter monster lineup with campaign monster entities.", { campaign_id: campaignId, encounter_id: entityId, monsters: z.array(z.object({ wiki_entity_id: entityId, quantity: z.number().int().min(1) }).strict()).max(100) }, false);
  register("link_mission_resource", "Link a Wiki entity, exploration map, or scene document to a mission.", { campaign_id: campaignId, mission_id: entityId, resource_type: z.enum(["wiki", "exploration_map", "scene"]), resource_id: entityId }, false);

  const attendance = z.record(entityId, z.enum(["attended", "absent"]));
  const closeFields = {
    campaign_id: campaignId, session_id: entityId, attendance, xp_gained: z.number().int().min(0),
    per_player_xp_awards: z.array(z.object({ playerId: entityId, xp: z.number().int().min(0) }).strict()).max(100).optional(),
    elapsed_hours: z.number().int().min(0).max(10000), summary: z.string().trim().min(1).max(10000),
    gm_private_notes: z.string().max(20000).nullable().optional(),
  };
  register("list_sessions", "List scheduled and completed sessions in the configured campaign, or read one session with its signups and stored close state.", { campaign_id: campaignId, session_id: entityId.optional(), limit: z.number().int().min(1).max(50).optional(), offset: z.number().int().min(0).max(10000).optional() }, true);
  register("prepare_session_close", "Save attendance and XP as a recoverable pre-close draft, and return a reviewable proposal. Public summary and GM notes are supplied by the caller; no text is generated here.", closeFields, false);
  register("close_session", "Close a scheduled session using the token and timestamp returned for the exact reviewed proposal. Applies attendance, XP, public summary, private GM notes, and elapsed hours, then reads persisted state back.", { ...closeFields, confirm_close: z.literal(true), proposal_token: z.string().regex(/^[a-f0-9]{64}$/), proposal_updated_at: z.string().datetime() }, false);

  return server;
}
