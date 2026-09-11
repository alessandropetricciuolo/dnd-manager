import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { McpAuthContext } from "@/lib/mcp-api/auth";
import { executeContent } from "@/lib/mcp-api/service";

const campaignId = z.string().uuid();
const entityId = z.string().uuid();
const revision = z.number().int().positive();
const adminOnly = z.boolean().optional();
const create = {
  campaign_id: campaignId,
  name: z.string().trim().min(1).max(200),
  body: z.string().max(100_000),
  attributes: z.record(z.unknown()).optional(),
  admin_only: adminOnly,
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
  register("create_lore", "Create private draft lore; use admin_only for protected Admin content.", create, false);
  register("create_npc", "Create a private draft NPC.", create, false);
  register("create_location", "Create a private draft location.", create, false);
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
  register("set_status", "Set editorial status using the entity's current revision.", {
    campaign_id: campaignId,
    entity_id: entityId,
    revision,
    status: z.enum(["draft", "proposed", "canonical", "deprecated"]),
  }, false);

  return server;
}
