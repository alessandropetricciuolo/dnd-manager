import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, validate, type EntityEnvelope } from "./contracts";
import type { McpAuthContext } from "./auth";
import { uploadImageToTelegram } from "@/lib/telegram-storage";

const columns = "id,campaign_id,type,name,content,attributes,admin_only,mcp_status,mcp_revision,updated_at";
const mapColumns = "id,campaign_id,name,description,map_type,image_url,visibility,parent_map_id,wiki_entity_id,admin_only,created_at,updated_at";
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

async function getEnabledCampaign(db: SupabaseClient, campaignId: string): Promise<{ id: string; type: string }> {
  const campaign = checked(await db.from("campaigns").select("id,type,admin_drafts_enabled").eq("id", campaignId).maybeSingle());
  if (!campaign || campaign.admin_drafts_enabled !== true) throw notFound();
  return campaign;
}

export async function executeContent(auth: McpAuthContext, raw: unknown) {
  const { operation, args: a } = validate(raw);
  assertMcpScope(auth, a.campaign_id);
  const campaign = await getEnabledCampaign(auth.db, a.campaign_id);
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

  if (operation === "search_maps") {
    const offset = a.offset ?? 0, limit = a.limit ?? 50;
    let request = auth.db.from("maps").select(mapColumns).eq("campaign_id", a.campaign_id);
    if (a.query) {
      const query = a.query.replace(new RegExp("[^\\p{L}\\p{N}\\s-]", "gu"), " ").trim();
      if (!query) throw new ApiError(400, "Search requires letters or numbers");
      request = request.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
    }
    if (a.map_type) request = request.eq("map_type", a.map_type);
    if (!auth.isAdmin || !adminOnlyRequested) request = request.eq("admin_only", false);
    const maps = checked(await request.order("name").range(offset, offset + limit - 1)) ?? [];
    return { maps, offset, limit, admin_only: auth.isAdmin && adminOnlyRequested };
  }

  if (operation === "get_map") {
    let request = auth.db.from("maps").select(mapColumns).eq("id", a.map_id).eq("campaign_id", a.campaign_id);
    if (!auth.isAdmin || !adminOnlyRequested) request = request.eq("admin_only", false);
    const map = checked(await request.maybeSingle());
    if (!map) throw new ApiError(404, "Map not found");
    return { map };
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

  if (operation === "upload_map") {
    const duplicate = checked(await auth.db.from("maps").select("id,name").eq("campaign_id", a.campaign_id).ilike("name", a.name.trim()).limit(1).maybeSingle());
    if (duplicate) throw new ApiError(409, `Map already exists: ${duplicate.name} (${duplicate.id})`);
    let parent: { id: string; map_type: string } | null = null;
    if (a.parent_map_id) {
      parent = checked(await auth.db.from("maps").select("id,map_type").eq("id", a.parent_map_id).eq("campaign_id", a.campaign_id).maybeSingle());
      if (!parent) throw new ApiError(400, "Parent map not found in this campaign");
      if (campaign.type !== "long") throw new ApiError(400, "Map hierarchy requires a long campaign");
    }
    const mapType = a.map_type ?? "city";
    const requiredParent = mapType === "continent" ? "world" : mapType === "city" ? "continent" : null;
    if (parent && mapType === "world") throw new ApiError(400, "A world map cannot have a parent");
    if (parent && requiredParent && parent.map_type !== requiredParent) throw new ApiError(400, `${mapType} requires a ${requiredParent} parent`);
    let imageUrl = a.image_url;
    if (a.data_base64) {
      const file = new File([Buffer.from(a.data_base64, "base64")], a.filename, { type: a.mime_type });
      try { imageUrl = `/api/tg-image/${await uploadImageToTelegram(file, `Mappa: ${a.name.trim()}`)}`; }
      catch { throw new ApiError(503, "Map image upload failed"); }
    }
    const payload: Record<string, unknown> = {
      campaign_id: a.campaign_id, name: a.name.trim(), description: a.description?.trim() || null,
      map_type: mapType, image_url: imageUrl, visibility: a.visibility ?? "secret", admin_only: a.admin_only === true,
    };
    if (a.parent_map_id) payload.parent_map_id = a.parent_map_id;
    const result = await auth.db.from("maps").insert(payload).select(mapColumns).single();
    if ((result.error as { code?: string } | null)?.code === "23505") throw new ApiError(409, "This campaign already has a world map");
    return { map: checked(result) };
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
