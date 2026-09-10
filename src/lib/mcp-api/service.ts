import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, validate, type EntityEnvelope } from "./contracts";
import type { McpAuthContext } from "./auth";

const columns = "id,campaign_id,type,name,content,attributes,admin_only,mcp_status,mcp_revision,updated_at";
const notFound = () => new ApiError(404, "Entity not found");

function envelope(row: Record<string, any> | null): EntityEnvelope {
  if (!row) throw new ApiError(503, "Backend returned no entity");
  return {
    schema_version: 1, id: row.id, campaign_id: row.campaign_id, kind: row.type,
    name: row.name, body: row.content?.body ?? "", attributes: row.attributes ?? {},
    admin_only: row.admin_only === true, status: row.mcp_status, revision: row.mcp_revision,
    source: { domain: "wiki", id: row.id },
  };
}

function checked<T>(result: { data: T; error: unknown }): T {
  if (result.error) throw new ApiError(503, "Backend operation failed");
  return result.data;
}

function assertMcpScope(auth: McpAuthContext, campaignId: string): void {
  // The personal connector is deliberately single-scope. The UUID is config, never caller authority.
  if (!auth.isAdmin || !process.env.MCP_CAMPAIGN_ID || process.env.MCP_CAMPAIGN_ID !== campaignId) throw notFound();
}

async function assertCampaignEnabled(db: SupabaseClient, campaignId: string): Promise<void> {
  const campaign = checked(await db.from("campaigns").select("id,admin_drafts_enabled").eq("id", campaignId).maybeSingle());
  if (!campaign || campaign.admin_drafts_enabled !== true) throw notFound();
}

export async function executeContent(auth: McpAuthContext, raw: unknown) {
  const { operation, args: a } = validate(raw);
  assertMcpScope(auth, a.campaign_id);
  await assertCampaignEnabled(auth.db, a.campaign_id);
  const adminOnlyRequested = a.admin_only === true;

  if (operation === "search_lore") {
    const query = a.query.replace(new RegExp("[^\\p{L}\\p{N}\\s-]", "gu"), " ").trim();
    if (!query) throw new ApiError(400, "Search requires letters or numbers");
    const offset = a.offset ?? 0, limit = a.limit ?? 20;
    let request = auth.db.from("wiki_entities").select(columns).eq("campaign_id", a.campaign_id).or(`name.ilike.%${query}%,content->>body.ilike.%${query}%`);
    // Never trust a requested flag: only a verified Admin may opt into protected rows.
    if (!auth.isAdmin || !adminOnlyRequested) request = request.eq("admin_only", false);
    const rows = checked(await request.order("id").range(offset, offset + limit - 1)) ?? [];
    return { entities: rows.map(envelope), offset, limit, admin_only: auth.isAdmin && adminOnlyRequested };
  }

  if (operation.startsWith("create_")) {
    const row = checked(await auth.db.from("wiki_entities").insert({
      campaign_id: a.campaign_id, type: operation.slice(7), name: a.name.trim(), content: { body: a.body },
      attributes: a.attributes ?? {}, admin_only: adminOnlyRequested, is_secret: true, visibility: "secret", mcp_status: "draft",
    }).select(columns).single());
    return { entity: envelope(row) };
  }

  if (operation === "upload_asset") {
    const asset = checked(await auth.db.from("mcp_assets").insert({ campaign_id: a.campaign_id, filename: a.filename, mime_type: a.mime_type, data_base64: a.data_base64 }).select("id,campaign_id,filename,mime_type,created_at").single());
    return { asset };
  }

  let entityQuery = auth.db.from("wiki_entities").select(columns).eq("id", a.entity_id).eq("campaign_id", a.campaign_id);
  // Status/asset writes are already restricted to the verified personal Admin;
  // read-like get/search calls require an explicit opt-in for protected rows.
  const protectedWrite = operation === "set_status" || operation === "attach_asset";
  if (!auth.isAdmin || (!adminOnlyRequested && !protectedWrite)) entityQuery = entityQuery.eq("admin_only", false);
  const entity = checked(await entityQuery.maybeSingle());
  if (!entity) throw notFound();

  if (operation === "get_entity") {
    const links = checked(await auth.db.from("mcp_entity_assets").select("asset_id").eq("entity_id", a.entity_id).eq("campaign_id", a.campaign_id));
    return { entity: envelope(entity), assets: (links ?? []).map((link: { asset_id: string }) => ({ ...link, download_path: `/api/integrations/content/assets/${link.asset_id}?campaign_id=${a.campaign_id}` })) };
  }
  if (operation === "attach_asset") {
    const asset = checked(await auth.db.from("mcp_assets").select("id").eq("id", a.asset_id).eq("campaign_id", a.campaign_id).maybeSingle());
    if (!asset) throw new ApiError(404, "Asset not found");
    const result = await auth.db.from("mcp_entity_assets").insert({ campaign_id: a.campaign_id, entity_id: a.entity_id, asset_id: a.asset_id }).select("id,entity_id,asset_id").single();
    if ((result.error as { code?: string } | null)?.code === "23505") throw new ApiError(409, "Asset already attached");
    return { attachment: checked(result) };
  }
  if (operation === "set_status") {
    if (entity.mcp_revision !== a.revision) throw new ApiError(409, "Revision conflict: read entity again");
    const updated = checked(await auth.db.from("wiki_entities").update({ mcp_status: a.status }).eq("id", a.entity_id).eq("campaign_id", a.campaign_id).eq("mcp_revision", a.revision).select(columns).maybeSingle());
    if (!updated) throw new ApiError(409, "Revision conflict: read entity again");
    return { entity: envelope(updated) };
  }

  if (entity.mcp_revision !== a.revision) throw new ApiError(409, "Revision conflict: read entity again");
  const patch: Record<string, unknown> = {};
  if (a.name !== undefined) patch.name = a.name.trim();
  if (a.body !== undefined) patch.content = { ...(entity.content ?? {}), body: a.body };
  if (a.attributes !== undefined) patch.attributes = { ...(entity.attributes ?? {}), ...a.attributes };
  if (a.admin_only !== undefined) patch.admin_only = a.admin_only;
  if (a.admin_only === false && entity.admin_only === true) throw new ApiError(400, "Protected content cannot be downgraded by MCP");
  const updated = checked(await auth.db.from("wiki_entities").update(patch).eq("id", a.entity_id).eq("campaign_id", a.campaign_id).eq("mcp_revision", a.revision).select(columns).maybeSingle());
  if (!updated) throw new ApiError(409, "Revision conflict: read entity again");
  return { entity: envelope(updated) };
}
