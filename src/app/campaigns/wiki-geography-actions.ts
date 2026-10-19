"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getWikiContentBody, getWikiContentDescription } from "@/lib/wiki/content";
import type { GeographySelection, WikiGeographyData } from "@/lib/wiki/geography";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_SIZE = 500;

async function authorize(campaignId: string) {
  if (!UUID.test(campaignId)) throw new Error("Campagna non valida.");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Non autenticato.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") throw new Error("Questa pagina è riservata a GM e Admin.");
  const { data: campaign } = await supabase.from("campaigns").select("id, name").eq("id", campaignId).single();
  if (!campaign) throw new Error("Campagna non accessibile.");
  return { supabase, isAdmin: profile.role === "admin", campaign };
}

type PageResult<T> = { data: T[] | null; error: { message: string } | null };
async function allRows<T>(load: (from: number, to: number) => PromiseLike<PageResult<T>>): Promise<T[]> {
  const result: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await load(from, from + PAGE_SIZE - 1);
    if (page.error) throw new Error("Impossibile caricare tutti i collegamenti. Riprova.");
    result.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < PAGE_SIZE) return result;
  }
}

export async function getWikiGeographyData(campaignId: string): Promise<{ success: true; data: WikiGeographyData } | { success: false; error: string }> {
  try {
    const { supabase, isAdmin, campaign } = await authorize(campaignId);
    const [entities, maps, relationships] = await Promise.all([
      allRows((from, to) => {
        let query = supabase.from("wiki_entities").select("id, name, type, image_url, telegram_fallback_id, admin_only, mcp_status")
          .eq("campaign_id", campaignId).eq("is_campaign_document", false).is("archived_at", null).order("id").range(from, to);
        if (!isAdmin) query = query.eq("admin_only", false);
        return query;
      }),
      allRows((from, to) => {
        let query = supabase.from("maps").select("id, name, map_type, parent_map_id, wiki_entity_id, image_url, admin_only")
          .eq("campaign_id", campaignId).order("id").range(from, to);
        if (!isAdmin) query = query.eq("admin_only", false);
        return query;
      }),
      allRows((from, to) => supabase.from("wiki_relationships").select("id, source_id, target_id, target_map_id, label")
        .eq("campaign_id", campaignId).order("id").range(from, to)),
    ]);
    const entityIds = new Set(entities.map(entity => entity.id));
    const mapIds = new Set(maps.map(map => map.id));
    return { success: true, data: {
      campaignName: campaign.name,
      entities: entities.map(entity => ({ id: entity.id, name: entity.name, type: entity.type, imageUrl: entity.image_url, telegramFallbackId: entity.telegram_fallback_id, adminOnly: Boolean(entity.admin_only), status: entity.mcp_status ?? undefined })),
      maps: maps.map(map => ({ id: map.id, name: map.name, mapType: map.map_type, parentId: map.parent_map_id, wikiEntityId: entityIds.has(map.wiki_entity_id) ? map.wiki_entity_id : null, imageUrl: map.image_url, adminOnly: Boolean(map.admin_only) })),
      relationships: relationships.filter(relationship => entityIds.has(relationship.source_id) && (relationship.target_id ? entityIds.has(relationship.target_id) : relationship.target_map_id ? mapIds.has(relationship.target_map_id) : false))
        .map(relationship => ({ id: relationship.id, sourceId: relationship.source_id, targetId: relationship.target_id, targetMapId: relationship.target_map_id, label: relationship.label ?? "" })),
    } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Impossibile caricare la Wiki geografica." };
  }
}

export type WikiGeographyDetail = {
  body: string;
  description: string;
  attributes: Record<string, unknown>;
  imageUrl: string | null;
  telegramFallbackId: string | null;
};

/** Rechecks role, campaign and protected endpoints for every on-demand read. */
export async function getWikiGeographyDetail(campaignId: string, selection: GeographySelection): Promise<{ success: true; data: WikiGeographyDetail } | { success: false; error: string }> {
  try {
    if (!selection || !UUID.test(selection.id) || !["wiki", "map"].includes(selection.kind)) throw new Error("Voce non valida.");
    const { supabase, isAdmin } = await authorize(campaignId);
    if (selection.kind === "map") {
      let query = supabase.from("maps").select("description, image_url").eq("campaign_id", campaignId).eq("id", selection.id);
      if (!isAdmin) query = query.eq("admin_only", false);
      const { data, error } = await query.single();
      if (error || !data) throw new Error("Mappa non disponibile.");
      return { success: true, data: { body: data.description ?? "", description: "", attributes: {}, imageUrl: data.image_url, telegramFallbackId: null } };
    }
    let query = supabase.from("wiki_entities").select("content, attributes, image_url, telegram_fallback_id")
      .eq("campaign_id", campaignId).eq("id", selection.id).eq("is_campaign_document", false).is("archived_at", null);
    if (!isAdmin) query = query.eq("admin_only", false);
    const { data, error } = await query.single();
    if (error || !data) throw new Error("Voce non disponibile. Potrebbe essere stata modificata o archiviata: aggiorna la vista.");
    return { success: true, data: { body: getWikiContentBody(data.content), description: getWikiContentDescription(data.content), attributes: (data.attributes ?? {}) as Record<string, unknown>, imageUrl: data.image_url, telegramFallbackId: data.telegram_fallback_id } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Impossibile aprire la voce." };
  }
}
