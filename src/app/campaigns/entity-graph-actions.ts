"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type WikiEntityForGraph = {
  id: string;
  name: string;
  type: string;
};

export type MapForGraph = {
  id: string;
  name: string;
};

export type WikiRelationshipRow = {
  id: string;
  source_id: string;
  target_id: string | null;
  target_map_id: string | null;
  label: string;
};

export type GetGraphDataResult = {
  success: boolean;
  entities?: WikiEntityForGraph[];
  maps?: MapForGraph[];
  relationships?: WikiRelationshipRow[];
  error?: string;
};

export async function getEntityGraphData(campaignId: string): Promise<GetGraphDataResult> {
  if (!campaignId) return { success: false, error: "Campagna non valida." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
    if (!isGmOrAdmin) return { success: false, error: "Solo GM e Admin possono vedere il grafo." };

    const [entitiesRes, mapsRes, relsRes] = await Promise.all([
      supabase
        .from("wiki_entities")
        .select("id, name, type")
        .eq("campaign_id", campaignId)
        .order("name"),
      supabase
        .from("maps")
        .select("id, name")
        .eq("campaign_id", campaignId)
        .order("name"),
      supabase
        .from("wiki_relationships")
        .select("id, source_id, target_id, target_map_id, label")
        .eq("campaign_id", campaignId),
    ]);

    if (entitiesRes.error) return { success: false, error: entitiesRes.error.message };
    if (mapsRes.error) return { success: false, error: mapsRes.error.message };
    if (relsRes.error) return { success: false, error: relsRes.error.message };

    return {
      success: true,
      entities: (entitiesRes.data ?? []) as WikiEntityForGraph[],
      maps: (mapsRes.data ?? []) as MapForGraph[],
      relationships: (relsRes.data ?? []) as WikiRelationshipRow[],
    };
  } catch (err) {
    console.error("[getEntityGraphData]", err);
    return { success: false, error: "Errore nel caricamento." };
  }
}

export type CreateRelationshipResult = { success: boolean; error?: string };

export async function createWikiRelationship(
  campaignId: string,
  sourceId: string,
  targetId: string | null,
  targetMapId: string | null,
  label: string
): Promise<CreateRelationshipResult> {
  if (!campaignId || !sourceId) return { success: false, error: "Dati mancanti." };
  // Estrai sempre UUID puri (il client può inviare node id con prefisso wiki:/map:)
  const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const toUuid = (s: string | null | undefined): string | null => {
    if (s == null || typeof s !== "string") return null;
    const m = s.trim().match(UUID_REGEX);
    return m ? m[0] : null;
  };
  const sourceUuid = toUuid(sourceId) ?? "";
  const targetWikiUuid = toUuid(targetId);
  const targetMapUuid = toUuid(targetMapId);
  if (!sourceUuid) return { success: false, error: "Dati mancanti." };
  const hasWiki = targetWikiUuid != null && targetWikiUuid !== "";
  const hasMap = targetMapUuid != null && targetMapUuid !== "";
  if (!hasWiki && !hasMap) return { success: false, error: "Seleziona un bersaglio (voce wiki o mappa)." };
  if (hasWiki && hasMap) return { success: false, error: "Solo un tipo di bersaglio alla volta." };
  if (hasWiki && sourceUuid === targetWikiUuid) return { success: false, error: "Source e target devono essere diversi." };
  const trimmedLabel = (label ?? "").trim();
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") return { success: false, error: "Non autorizzato." };

    const insertPayload: {
      campaign_id: string;
      source_id: string;
      target_id?: string | null;
      target_map_id?: string | null;
      label: string;
    } = {
      campaign_id: campaignId,
      source_id: sourceUuid,
      label: trimmedLabel || "—",
    };
    if (hasWiki) {
      insertPayload.target_id = targetWikiUuid;
      insertPayload.target_map_id = null;
    } else {
      insertPayload.target_id = null;
      insertPayload.target_map_id = targetMapUuid;
    }

    const { error } = await supabase.from("wiki_relationships").insert(insertPayload);

    if (error) {
      if (error.code === "23505") return { success: false, error: "Questa relazione esiste già." };
      return { success: false, error: error.message };
    }
    revalidatePath(`/campaigns/${campaignId}/gm-only/concept-map`);
    return { success: true };
  } catch (err) {
    console.error("[createWikiRelationship]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}

/** Lista voci wiki (id, name) per dropdown Relazioni. Solo GM/Admin. */
export async function getWikiEntitiesForCampaign(
  campaignId: string
): Promise<{ success: true; data: { id: string; name: string }[] } | { success: false; error: string }> {
  if (!campaignId) return { success: false, error: "Campagna non valida." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "gm" && profile?.role !== "admin") return { success: false, error: "Non autorizzato." };
    const { data, error } = await supabase
      .from("wiki_entities")
      .select("id, name")
      .eq("campaign_id", campaignId)
      .order("name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as { id: string; name: string }[] };
  } catch (err) {
    console.error("[getWikiEntitiesForCampaign]", err);
    return { success: false, error: "Errore nel caricamento." };
  }
}

/** Lista mappe della campagna (id, name) per dropdown Relazioni & Mappe. Solo GM/Admin. */
export async function getMapsForCampaign(
  campaignId: string
): Promise<{ success: true; data: MapForGraph[] } | { success: false; error: string }> {
  if (!campaignId) return { success: false, error: "Campagna non valida." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "gm" && profile?.role !== "admin") return { success: false, error: "Non autorizzato." };
    const { data, error } = await supabase
      .from("maps")
      .select("id, name")
      .eq("campaign_id", campaignId)
      .order("name");
    if (error) return { success: false, error: error.message };
    return { success: true, data: (data ?? []) as MapForGraph[] };
  } catch (err) {
    console.error("[getMapsForCampaign]", err);
    return { success: false, error: "Errore nel caricamento." };
  }
}

export type WikiRelationFormRow = {
  targetType: "wiki" | "map";
  targetId: string;
  label: string;
};

/** Relazioni esistenti per una voce wiki (source_id = entityId). Solo GM/Admin. */
export async function getWikiRelationshipsForEntity(
  campaignId: string,
  entityId: string
): Promise<{ success: true; data: WikiRelationFormRow[] } | { success: false; error: string }> {
  if (!campaignId || !entityId) return { success: false, error: "Dati mancanti." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "gm" && profile?.role !== "admin") return { success: false, error: "Non autorizzato." };
    const { data, error } = await supabase
      .from("wiki_relationships")
      .select("target_id, target_map_id, label")
      .eq("campaign_id", campaignId)
      .eq("source_id", entityId);
    if (error) return { success: false, error: error.message };
    const rows = (data ?? []) as { target_id: string | null; target_map_id: string | null; label: string }[];
    const out: WikiRelationFormRow[] = rows.map((r) => ({
      targetType: r.target_map_id != null ? "map" : "wiki",
      targetId: (r.target_map_id ?? r.target_id) ?? "",
      label: r.label ?? "",
    }));
    return { success: true, data: out };
  } catch (err) {
    console.error("[getWikiRelationshipsForEntity]", err);
    return { success: false, error: "Errore nel caricamento." };
  }
}

export type RelatedEntityLink = {
  relationshipId: string;
  /** "out" = questa voce è la sorgente della relazione, "in" = è il bersaglio. */
  direction: "out" | "in";
  label: string;
  kind: "wiki" | "map";
  id: string;
  name: string;
  /** Tipo wiki (npc/location/...) — null per le mappe. */
  type: string | null;
  image_url: string | null;
  telegram_fallback_id: string | null;
};

type RelatedWikiRow = {
  id: string;
  name: string;
  type: string;
  image_url: string | null;
  telegram_fallback_id: string | null;
  visibility: string | null;
  is_secret: boolean | null;
};

type RelatedMapRow = {
  id: string;
  name: string;
  visibility: string | null;
};

/**
 * Collegamenti (uscenti + entranti) di una voce wiki, con dati dei bersagli risolti.
 * Player: vede solo i collegamenti verso entità/mappe a lui visibili
 * (public sempre; selective con permesso; secret solo se esplorata).
 */
export async function getRelatedEntityLinks(
  campaignId: string,
  entityId: string
): Promise<{ success: true; data: RelatedEntityLink[] } | { success: false; error: string }> {
  if (!campaignId || !entityId) return { success: false, error: "Dati mancanti." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

    const { data: relsRaw, error: relsError } = await supabase
      .from("wiki_relationships")
      .select("id, source_id, target_id, target_map_id, label")
      .eq("campaign_id", campaignId)
      .or(`source_id.eq.${entityId},target_id.eq.${entityId}`);
    if (relsError) return { success: false, error: relsError.message };

    const rels = (relsRaw ?? []) as WikiRelationshipRow[];
    if (rels.length === 0) return { success: true, data: [] };

    const wikiIds = new Set<string>();
    const mapIds = new Set<string>();
    for (const rel of rels) {
      if (rel.source_id === entityId) {
        if (rel.target_id) wikiIds.add(rel.target_id);
        else if (rel.target_map_id) mapIds.add(rel.target_map_id);
      } else if (rel.target_id === entityId) {
        wikiIds.add(rel.source_id);
      }
    }

    const [wikiRes, mapsRes] = await Promise.all([
      wikiIds.size > 0
        ? supabase
            .from("wiki_entities")
            .select("id, name, type, image_url, telegram_fallback_id, visibility, is_secret")
            .eq("campaign_id", campaignId)
            .in("id", Array.from(wikiIds))
        : Promise.resolve({ data: [], error: null }),
      mapIds.size > 0
        ? supabase
            .from("maps")
            .select("id, name, visibility")
            .eq("campaign_id", campaignId)
            .in("id", Array.from(mapIds))
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (wikiRes.error) return { success: false, error: wikiRes.error.message };
    if (mapsRes.error) return { success: false, error: mapsRes.error.message };

    const wikiById = new Map<string, RelatedWikiRow>(
      ((wikiRes.data ?? []) as RelatedWikiRow[]).map((row) => [row.id, row])
    );
    const mapById = new Map<string, RelatedMapRow>(
      ((mapsRes.data ?? []) as RelatedMapRow[]).map((row) => [row.id, row])
    );

    // Player: applica le stesse regole di visibilità di getEntity / pagina mappa.
    let allowedWikiIds: Set<string> | null = null;
    let allowedMapIds: Set<string> | null = null;
    if (!isGmOrAdmin) {
      allowedWikiIds = new Set();
      allowedMapIds = new Set();

      const selectiveWiki: string[] = [];
      const secretWiki: string[] = [];
      for (const row of wikiById.values()) {
        const vis = row.visibility ?? (row.is_secret ? "secret" : "public");
        if (vis === "public") allowedWikiIds.add(row.id);
        else if (vis === "selective") selectiveWiki.push(row.id);
        else secretWiki.push(row.id);
      }
      const selectiveMaps: string[] = [];
      const secretMaps: string[] = [];
      for (const row of mapById.values()) {
        const vis = row.visibility ?? "public";
        if (vis === "public") allowedMapIds.add(row.id);
        else if (vis === "selective") selectiveMaps.push(row.id);
        else secretMaps.push(row.id);
      }

      const [wikiPerms, wikiExpl, mapPerms, mapExpl] = await Promise.all([
        selectiveWiki.length > 0
          ? supabase
              .from("entity_permissions")
              .select("entity_id")
              .eq("campaign_id", campaignId)
              .eq("entity_type", "wiki")
              .eq("user_id", user.id)
              .in("entity_id", selectiveWiki)
          : Promise.resolve({ data: [] }),
        secretWiki.length > 0
          ? supabase
              .from("explorations")
              .select("entity_id")
              .eq("player_id", user.id)
              .in("entity_id", secretWiki)
          : Promise.resolve({ data: [] }),
        selectiveMaps.length > 0
          ? supabase
              .from("entity_permissions")
              .select("entity_id")
              .eq("campaign_id", campaignId)
              .eq("entity_type", "map")
              .eq("user_id", user.id)
              .in("entity_id", selectiveMaps)
          : Promise.resolve({ data: [] }),
        secretMaps.length > 0
          ? supabase
              .from("explorations")
              .select("map_id")
              .eq("player_id", user.id)
              .in("map_id", secretMaps)
          : Promise.resolve({ data: [] }),
      ]);
      for (const row of (wikiPerms.data ?? []) as { entity_id: string }[]) allowedWikiIds.add(row.entity_id);
      for (const row of (wikiExpl.data ?? []) as { entity_id: string | null }[]) {
        if (row.entity_id) allowedWikiIds.add(row.entity_id);
      }
      for (const row of (mapPerms.data ?? []) as { entity_id: string }[]) allowedMapIds.add(row.entity_id);
      for (const row of (mapExpl.data ?? []) as { map_id: string | null }[]) {
        if (row.map_id) allowedMapIds.add(row.map_id);
      }
    }

    const links: RelatedEntityLink[] = [];
    for (const rel of rels) {
      const isOutgoing = rel.source_id === entityId;
      if (isOutgoing && rel.target_map_id) {
        const map = mapById.get(rel.target_map_id);
        if (!map) continue;
        if (allowedMapIds && !allowedMapIds.has(map.id)) continue;
        links.push({
          relationshipId: rel.id,
          direction: "out",
          label: rel.label ?? "",
          kind: "map",
          id: map.id,
          name: map.name,
          type: null,
          image_url: null,
          telegram_fallback_id: null,
        });
        continue;
      }
      const otherId = isOutgoing ? rel.target_id : rel.source_id;
      if (!otherId) continue;
      const entity = wikiById.get(otherId);
      if (!entity) continue;
      if (allowedWikiIds && !allowedWikiIds.has(entity.id)) continue;
      links.push({
        relationshipId: rel.id,
        direction: isOutgoing ? "out" : "in",
        label: rel.label ?? "",
        kind: "wiki",
        id: entity.id,
        name: entity.name,
        type: entity.type,
        image_url: entity.image_url,
        telegram_fallback_id: entity.telegram_fallback_id,
      });
    }

    links.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "wiki" ? -1 : 1;
      return a.name.localeCompare(b.name, "it", { sensitivity: "base" });
    });
    return { success: true, data: links };
  } catch (err) {
    console.error("[getRelatedEntityLinks]", err);
    return { success: false, error: "Errore nel caricamento dei collegamenti." };
  }
}

export type DeleteRelationshipResult = { success: boolean; error?: string };

export async function deleteWikiRelationship(
  relationshipId: string,
  campaignId: string
): Promise<DeleteRelationshipResult> {
  if (!relationshipId || !campaignId) return { success: false, error: "Dati mancanti." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") return { success: false, error: "Non autorizzato." };

    const { error } = await supabase
      .from("wiki_relationships")
      .delete()
      .eq("id", relationshipId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error("[deleteWikiRelationship]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}

export type UpdateRelationshipResult = { success: boolean; error?: string };

/** Aggiorna solo l'etichetta di una relazione. */
export async function updateWikiRelationship(
  relationshipId: string,
  campaignId: string,
  label: string
): Promise<UpdateRelationshipResult> {
  if (!relationshipId || !campaignId) return { success: false, error: "Dati mancanti." };
  const trimmedLabel = (label ?? "").trim();
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") return { success: false, error: "Non autorizzato." };

    const { error } = await supabase
      .from("wiki_relationships")
      .update({ label: trimmedLabel || "—" })
      .eq("id", relationshipId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error("[updateWikiRelationship]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}
