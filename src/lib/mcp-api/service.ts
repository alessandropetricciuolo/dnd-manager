import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError, validate, type EntityEnvelope } from "./contracts";
import type { McpAuthContext } from "./auth";
import { uploadImageToTelegram } from "@/lib/telegram-storage";
import { executeMissionOperation, isMissionOperation } from "./missions";

const columns = "id,campaign_id,type,name,content,attributes,image_url,admin_only,mcp_status,mcp_revision,xp_value,is_core,global_status,updated_at";
const mapColumns = "id,campaign_id,name,description,map_type,image_url,visibility,parent_map_id,wiki_entity_id,admin_only,created_at,updated_at";
const notFound = () => new ApiError(404, "Entity not found");

function envelope(row: Record<string, any> | null): EntityEnvelope {
  if (!row) throw new ApiError(503, "Backend returned no entity");
  return {
    schema_version: 1, id: row.id, campaign_id: row.campaign_id, kind: row.type,
    name: row.name, body: row.content?.body ?? "", attributes: row.attributes ?? {},
    image_url: row.image_url ?? null, admin_only: row.admin_only === true, status: row.mcp_status, revision: row.mcp_revision,
    xp_value: row.xp_value ?? 0, is_core: row.is_core === true, global_status: row.global_status ?? null,
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

export async function executeContent(auth: McpAuthContext, raw: unknown, deps = { uploadImage: uploadImageToTelegram }) {
  const { operation, args: a } = validate(raw);
  assertMcpScope(auth, a.campaign_id);
  const campaign = await getEnabledCampaign(auth.db, a.campaign_id);
  const adminOnlyRequested = a.admin_only === true;

  if (isMissionOperation(operation)) return executeMissionOperation(auth.db, operation, a);

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

  if (operation === "list_wiki_relationships") {
    const offset = a.offset ?? 0, limit = a.limit ?? 100;
    const relationships = checked(await auth.db.from("wiki_relationships")
      .select("id,campaign_id,source_id,target_id,target_map_id,label,created_at")
      .eq("campaign_id", a.campaign_id).order("created_at").order("id").range(offset, offset + limit - 1)) ?? [];
    const entityIds = [...new Set(relationships.flatMap((relationship: Record<string, any>) => [relationship.source_id, relationship.target_id]).filter(Boolean))];
    const mapIds = [...new Set(relationships.map((relationship: Record<string, any>) => relationship.target_map_id).filter(Boolean))];
    const entities = entityIds.length ? checked(await auth.db.from("wiki_entities").select("id,name,type,admin_only").eq("campaign_id", a.campaign_id).in("id", entityIds)) ?? [] : [];
    const maps = mapIds.length ? checked(await auth.db.from("maps").select("id,name,map_type,admin_only").eq("campaign_id", a.campaign_id).in("id", mapIds)) ?? [] : [];
    const entityById = new Map(entities.map((entity: Record<string, any>) => [entity.id, entity]));
    const mapById = new Map(maps.map((map: Record<string, any>) => [map.id, map]));
    const includeProtected = auth.isAdmin && adminOnlyRequested;
    const visible = relationships.flatMap((relationship: Record<string, any>) => {
      const source = entityById.get(relationship.source_id);
      const target = relationship.target_id ? entityById.get(relationship.target_id) : null;
      const targetMap = relationship.target_map_id ? mapById.get(relationship.target_map_id) : null;
      // Missing endpoints are hidden instead of leaking an otherwise unreadable relationship.
      if (!source || (relationship.target_id && !target) || (relationship.target_map_id && !targetMap)) return [];
      if (!includeProtected && (source.admin_only || target?.admin_only || targetMap?.admin_only)) return [];
      return [{
        id: relationship.id, campaign_id: relationship.campaign_id, source_id: relationship.source_id,
        target_id: relationship.target_id, target_map_id: relationship.target_map_id, label: relationship.label,
        created_at: relationship.created_at,
        source: { id: source.id, name: source.name, type: source.type, admin_only: source.admin_only === true },
        target: target ? { id: target.id, name: target.name, type: target.type, admin_only: target.admin_only === true } : null,
        target_map: targetMap ? { id: targetMap.id, name: targetMap.name, map_type: targetMap.map_type, admin_only: targetMap.admin_only === true } : null,
      }];
    });
    return { relationships: visible, offset, limit, next_offset: relationships.length === limit ? offset + limit : null, admin_only: includeProtected };
  }

  if (operation === "upsert_wiki_relationship") {
    const relationshipColumns = "id,campaign_id,source_id,target_id,target_map_id,label,created_at";
    const source = checked(await auth.db.from("wiki_entities").select("id,name,type,admin_only").eq("id", a.source_id).eq("campaign_id", a.campaign_id).maybeSingle());
    if (!source) throw new ApiError(404, "Source entity not found");
    const target = a.target_id ? checked(await auth.db.from("wiki_entities").select("id,name,type,admin_only").eq("id", a.target_id).eq("campaign_id", a.campaign_id).maybeSingle()) : null;
    const targetMap = a.target_map_id ? checked(await auth.db.from("maps").select("id,name,map_type,admin_only").eq("id", a.target_map_id).eq("campaign_id", a.campaign_id).maybeSingle()) : null;
    if (a.target_id && !target) throw new ApiError(404, "Target entity not found");
    if (a.target_map_id && !targetMap) throw new ApiError(404, "Target map not found");
    if (!adminOnlyRequested && (source.admin_only || target?.admin_only || targetMap?.admin_only)) throw notFound();
    if (!source.admin_only && target?.admin_only) throw new ApiError(400, "Public entities cannot link to Admin-only entities");

    const label = a.label.trim();
    const findExisting = () => {
      let request = auth.db.from("wiki_relationships").select(relationshipColumns)
        .eq("campaign_id", a.campaign_id).eq("source_id", a.source_id);
      request = a.target_id ? request.eq("target_id", a.target_id) : request.eq("target_map_id", a.target_map_id);
      return request.maybeSingle();
    };
    let relationship = checked(await findExisting());
    let created = false;
    if (relationship && relationship.label !== label) {
      relationship = checked(await auth.db.from("wiki_relationships").update({ label }).eq("id", relationship.id).select(relationshipColumns).single());
    } else if (!relationship) {
      const payload = {
        campaign_id: a.campaign_id, source_id: a.source_id,
        target_id: a.target_id ?? null, target_map_id: a.target_map_id ?? null, label,
      };
      const inserted = await auth.db.from("wiki_relationships").insert(payload).select("id").single();
      if (inserted.error && (inserted.error as { code?: string }).code !== "23505") throw new ApiError(503, "Relationship write failed");
      relationship = checked(await findExisting());
      if (!relationship) throw new ApiError(503, "Relationship readback failed");
      created = !inserted.error;
    }
    return {
      relationship: {
        ...relationship,
        source: { id: source.id, name: source.name, type: source.type, admin_only: source.admin_only === true },
        target: target ? { id: target.id, name: target.name, type: target.type, admin_only: target.admin_only === true } : null,
        target_map: targetMap ? { id: targetMap.id, name: targetMap.name, map_type: targetMap.map_type, admin_only: targetMap.admin_only === true } : null,
      },
      created,
    };
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
    const payload: Record<string, unknown> = {
      campaign_id: a.campaign_id, type: operation.slice(7), name: a.name.trim(), content: { body: a.body },
      attributes: a.attributes ?? {}, admin_only: adminOnlyRequested, is_secret: true, visibility: "secret", mcp_status: "draft",
    };
    if (operation === "create_monster") {
      payload.xp_value = a.xp_value ?? 0;
      if (campaign.type === "long") {
        payload.is_core = a.is_core ?? false;
        payload.global_status = "alive";
      }
    }
    const row = checked(await auth.db.from("wiki_entities").insert(payload).select(columns).single());
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
      try { imageUrl = `/api/tg-image/${await deps.uploadImage(file, `Mappa: ${a.name.trim()}`)}`; }
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
  const protectedWrite = operation === "set_status" || operation === "attach_asset" || operation === "upload_entity_image";
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
  if (operation === "upload_entity_image") {
    if (entity.mcp_revision !== a.revision) throw new ApiError(409, "Revision conflict: read entity again");
    const file = new File([Buffer.from(a.data_base64, "base64")], a.filename, { type: a.mime_type });
    let imageUrl: string;
    try { imageUrl = `/api/tg-image/${encodeURIComponent(await deps.uploadImage(file, `Wiki: ${entity.name}`))}`; }
    catch { throw new ApiError(503, "Wiki image upload failed"); }
    const result = await auth.db.from("wiki_entities").update({ image_url: imageUrl }).eq("id", a.entity_id).eq("campaign_id", a.campaign_id).eq("mcp_revision", a.revision).select(columns).maybeSingle();
    if (result.error) throw new ApiError(503, "Wiki image update failed");
    if (!result.data) throw new ApiError(409, "Revision conflict: read entity again");
    return { entity: envelope(result.data) };
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
