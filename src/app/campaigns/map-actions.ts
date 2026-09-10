"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { uploadToTelegram } from "@/lib/telegram-storage";
import { parseSafeExternalUrl } from "@/lib/security/url";
import {
  syncEntityPermissions,
  parseAllowedUserIds,
  parseAllowedPartyIds,
  resolveAllowedUserIdsFromParties,
} from "@/lib/entity-permissions";
import {
  deleteCampaignMemorySource,
  syncMapDescriptionToCampaignMemory,
} from "@/lib/campaign-memory-indexer";
import { assertCanManageAdminContent, isGlobalAdmin, logAdminContentTransition, resolveAdminContentAccess } from "@/lib/admin-content";
import { resolveAdminOnlyTransition } from "@/lib/admin-content/transitions";

const VISIBILITY_VALUES = ["public", "secret", "selective"] as const;
type Visibility = (typeof VISIBILITY_VALUES)[number];

const MAP_TYPES_ALL = ["world", "continent", "city", "dungeon", "district", "building"] as const;

export type UploadMapResult = {
  success: boolean;
  message: string;
  /** Presente solo in caso di successo (per collegare subito un pin, ecc.). */
  mapId?: string;
};

/** Elenco mappe per collegamento gerarchico (campagne long). */
export type MapParentOption = {
  id: string;
  name: string;
  map_type: string;
  parent_map_id: string | null;
};

export type ListMapsForParentPickerResult =
  | { success: true; data: MapParentOption[] }
  | { success: false; message: string };

export async function listMapsForParentPickerAction(
  campaignId: string
): Promise<ListMapsForParentPickerResult> {
  if (!campaignId?.trim()) return { success: false, message: "Campagna non valida." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, message: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Non autorizzato." };
    }
    let parentMapsQuery = supabase
      .from("maps")
      .select("id, name, map_type, parent_map_id, admin_only")
      .eq("campaign_id", campaignId)
      .order("name", { ascending: true });
    if (profile.role !== "admin") parentMapsQuery = parentMapsQuery.eq("admin_only", false);
    const { data, error } = await parentMapsQuery;
    if (error) {
      if (error.message?.includes("parent_map_id")) {
        let fallbackQuery = supabase
          .from("maps")
          .select("id, name, map_type, admin_only")
          .eq("campaign_id", campaignId)
          .order("name", { ascending: true });
        if (profile.role !== "admin") fallbackQuery = fallbackQuery.eq("admin_only", false);
        const { data: fallback, error: err2 } = await fallbackQuery;
        if (err2) return { success: false, message: err2.message };
        return {
          success: true,
          data: ((fallback ?? []) as Array<{ id: string; name: string; map_type?: string }>).map((m) => ({
            id: m.id,
            name: m.name,
            map_type: m.map_type ?? "city",
            parent_map_id: null,
          })),
        };
      }
      return { success: false, message: error.message };
    }
    return {
      success: true,
      data: (data ?? []) as MapParentOption[],
    };
  } catch (err) {
    console.error("[listMapsForParentPickerAction]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}

function mapPgMapError(err: { message?: string; code?: string } | null): string | null {
  const msg = err?.message ?? "";
  const code = err?.code ?? "";
  if (code === "23505" && (msg.includes("maps_one_world") || msg.includes("one_world"))) {
    return "Esiste già una mappa del mondo per questa campagna. Ne è consentita una sola.";
  }
  if (/per campagne lunghe|La mappa del mondo|genitore|continente|regione|città/i.test(msg)) {
    return msg.replace(/^ERROR:\s*/i, "").trim() || "Gerarchia mappe non valida per campagna lunga.";
  }
  return null;
}

export async function uploadMap(
  formData: FormData
): Promise<UploadMapResult> {
  const campaignId = (formData.get("campaign_id") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const mapTypeRaw = (formData.get("map_type") as string | null)?.trim() || "city";
  const allowedMapTypes = MAP_TYPES_ALL;
  const mapType = allowedMapTypes.includes(mapTypeRaw as (typeof allowedMapTypes)[number])
    ? mapTypeRaw
    : "city";
  const parentMapIdRaw = (formData.get("parent_map_id") as string | null)?.trim() || "";
  const parentMapId = parentMapIdRaw || null;
  const imageFile = formData.get("image") as File | null;
  const imageUrlRaw = (formData.get("image_url") as string | null)?.trim() || null;
  let imageUrl =
    imageUrlRaw && imageUrlRaw.startsWith("http")
      ? parseSafeExternalUrl(imageUrlRaw)
      : imageUrlRaw;
  const imageUrlOverrideRaw = (formData.get("image_url_override") as string | null)?.trim() || null;
  const imageUrlOverride = imageUrlOverrideRaw ? parseSafeExternalUrl(imageUrlOverrideRaw) : null;
  const visibilityRaw = (formData.get("visibility") as string | null)?.trim() || "public";
  const visibility: Visibility = VISIBILITY_VALUES.includes(visibilityRaw as Visibility) ? visibilityRaw as Visibility : "public";
  const allowedUserIds = parseAllowedUserIds(formData, "allowed_user_ids");
  const allowedPartyIds = parseAllowedPartyIds(formData, "allowed_party_ids");
  const adminOnlyRequested = formData.get("admin_only") === "on" || formData.get("admin_only") === "true";

  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
  }
  if (!name) {
    return { success: false, message: "Il nome della mappa è obbligatorio." };
  }

  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(imageFile.type)) {
      return {
        success: false,
        message: "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF.",
      };
    }
    try {
      const fileId = await uploadToTelegram(imageFile);
      imageUrl = `/api/tg-image/${fileId}`;
    } catch (uploadErr) {
      console.error("[uploadMap] Telegram upload", uploadErr);
      return {
        success: false,
        message: uploadErr instanceof Error ? uploadErr.message : "Errore durante il caricamento dell'immagine.",
      };
    }
  }
  if (imageUrlRaw && imageUrlRaw.startsWith("http") && !imageUrl) {
    return { success: false, message: "URL immagine non valido o non consentito." };
  }

  const finalImageUrl = imageUrlOverride || imageUrl;
  if (imageUrlOverrideRaw && !imageUrlOverride) {
    return { success: false, message: "URL esterno non valido o non consentito." };
  }
  if (!finalImageUrl) {
    return { success: false, message: "Carica un'immagine, incolla un URL o un link (es. Google Drive)." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const accessResult = await resolveAdminContentAccess(supabase as never);
    if (!accessResult.ok) return { success: false, message: "Autorizzazione non verificabile." };
    if (adminOnlyRequested) {
      try { await assertCanManageAdminContent(accessResult.access, campaignId, supabase as never); }
      catch { return { success: false, message: "Solo un Admin può creare mappe Solo Admin in una campagna abilitata." }; }
    }
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Non autorizzato. Solo GM e Admin possono caricare mappe." };
    }

    const insertPayload: Record<string, unknown> = {
      campaign_id: campaignId,
      name,
      description,
      map_type: mapType,
      image_url: finalImageUrl,
      visibility: adminOnlyRequested ? "secret" : visibility,
      admin_only: adminOnlyRequested,
    };
    if (parentMapId) {
      insertPayload.parent_map_id = parentMapId;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("maps")
      .insert(insertPayload as never)
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[uploadMap] insert", insertError);
      const friendly = mapPgMapError(insertError);
      return {
        success: false,
        message: friendly ?? insertError?.message ?? "Errore nel salvataggio della mappa.",
      };
    }
    if (adminOnlyRequested) logAdminContentTransition({ action: "create", access: accessResult.access, campaignId, entityType: "map", entityId: inserted.id });

    if (!adminOnlyRequested && visibility === "selective") {
      const partyUserIds = await resolveAllowedUserIdsFromParties(supabase, campaignId, allowedPartyIds);
      const mergedUserIds = [...new Set([...allowedUserIds, ...partyUserIds])];
      const { error: permError } = await syncEntityPermissions(
        supabase,
        campaignId,
        "map",
        inserted.id,
        mergedUserIds
      );
      if (permError) {
        console.error("[uploadMap] entity_permissions", permError);
      }
    }

    try {
      const admin = createSupabaseAdminClient();
      await syncMapDescriptionToCampaignMemory(admin, inserted.id, { campaignId });
    } catch (memoryErr) {
      console.error("[uploadMap] campaign memory sync", memoryErr);
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Mappa caricata!", mapId: inserted.id };
  } catch (err) {
    console.error("[uploadMap]", err);
    return {
      success: false,
      message: "Si è verificato un errore imprevisto. Riprova.",
    };
  }
}

export type UpdateMapResult = { success: boolean; message: string };

const MAP_TYPES = MAP_TYPES_ALL;

export async function updateMap(
  mapId: string,
  campaignId: string,
  payload: {
    name?: string;
    description?: string | null;
    map_type?: string;
    visibility?: Visibility;
    parent_map_id?: string | null;
    wiki_entity_id?: string | null;
    allowed_user_ids?: string[];
    allowed_party_ids?: string[];
    admin_only?: boolean;
    release_admin_only?: boolean;
  }
): Promise<UpdateMapResult> {
  if (!mapId || !campaignId) {
    return { success: false, message: "Mappa non valida." };
  }
  const name = payload.name?.trim();
  const description =
    payload.description === undefined ? undefined : payload.description?.trim() ? payload.description.trim() : null;
  const mapType = payload.map_type?.trim();
  const visibility = payload.visibility && VISIBILITY_VALUES.includes(payload.visibility) ? payload.visibility : undefined;
  const parentMapId =
    payload.parent_map_id === undefined
      ? undefined
      : payload.parent_map_id === null || payload.parent_map_id === ""
        ? null
        : payload.parent_map_id.trim();
  const wikiEntityId =
    payload.wiki_entity_id === undefined
      ? undefined
      : payload.wiki_entity_id === null || payload.wiki_entity_id === ""
        ? null
        : payload.wiki_entity_id.trim();
  const allowedUserIds = payload.allowed_user_ids ?? [];
  const allowedPartyIds = payload.allowed_party_ids ?? [];
  const adminOnlyRequested = payload.admin_only === true;
  const releaseAdminOnly = payload.release_admin_only === true;
  if (adminOnlyRequested && releaseAdminOnly) return { success: false, message: "Intenti Solo Admin conflittuali." };

  if (
    !name &&
    description === undefined &&
    !mapType &&
    visibility === undefined &&
    parentMapId === undefined &&
    wikiEntityId === undefined
  ) {
    return { success: false, message: "Inserisci nome, descrizione, categoria, genitore, luogo wiki o visibilità da aggiornare." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const accessResult = await resolveAdminContentAccess(supabase as never);
    if (!accessResult.ok) return { success: false, message: "Autorizzazione non verificabile." };
    if (adminOnlyRequested) {
      try { await assertCanManageAdminContent(accessResult.access, campaignId, supabase as never); }
      catch { return { success: false, message: "Solo un Admin può cambiare lo stato Solo Admin in una campagna abilitata." }; }
    }
    if (releaseAdminOnly && !isGlobalAdmin(accessResult.access)) return { success: false, message: "Solo un Admin può rilasciare questo contenuto." };
    const { data: currentMapState, error: currentMapError } = await supabase.from("maps").select("admin_only").eq("id", mapId).eq("campaign_id", campaignId).maybeSingle();
    if (currentMapError || !currentMapState) return { success: false, message: "Impossibile verificare lo stato della mappa." };
    const transition = resolveAdminOnlyTransition({ currentAdminOnly: Boolean((currentMapState as { admin_only?: boolean } | null)?.admin_only), protect: adminOnlyRequested, release: releaseAdminOnly });
    if (!transition.ok) return { success: false, message: transition.reason === "release_requires_protected" ? "La mappa non è Solo Admin: nessun rilascio eseguito." : "Intenti Solo Admin conflittuali." };
    const { data: linkedState, error: linkedStateError } = await supabase.from("maps").select("wiki_entity_id").eq("id", mapId).eq("campaign_id", campaignId).maybeSingle();
    if (linkedStateError || !linkedState) return { success: false, message: "Impossibile verificare il collegamento Wiki-mappa." };
    const nextWikiId = wikiEntityId === undefined ? (linkedState as { wiki_entity_id?: string | null } | null)?.wiki_entity_id : wikiEntityId;
    if (nextWikiId && transition.intent !== "none") {
      const { data: linkedWiki, error: linkedWikiError } = await supabase.from("wiki_entities").select("admin_only").eq("id", nextWikiId).eq("campaign_id", campaignId).maybeSingle();
      if (linkedWikiError) return { success: false, message: "Impossibile verificare il confine del collegamento Wiki-mappa." };
      if (!linkedWiki || Boolean((linkedWiki as { admin_only?: boolean }).admin_only) !== transition.nextAdminOnly) return { success: false, message: "La transizione lascerebbe il collegamento Wiki-mappa attraverso il confine Solo Admin." };
    }
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Solo GM e Admin possono modificare le mappe." };
    }
    const updates: {
      name?: string;
      description?: string | null;
      map_type?: string;
      visibility?: Visibility;
      parent_map_id?: string | null;
      wiki_entity_id?: string | null;
      admin_only?: boolean;
    } = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (mapType && MAP_TYPES.includes(mapType as (typeof MAP_TYPES)[number])) {
      updates.map_type = mapType;
    }
    if (visibility !== undefined) {
      updates.visibility = visibility;
    }
    if (transition.intent !== "none") {
      if (adminOnlyRequested) {
        const { data: children, error: childrenError } = await supabase.from("maps").select("id, name, admin_only").eq("parent_map_id", mapId).eq("admin_only", false);
        if (childrenError) return { success: false, message: "Impossibile verificare i figli della mappa: ritiro negato." };
        if ((children ?? []).length > 0) {
          return { success: false, message: `Impossibile ritirare questa mappa: contiene ${(children ?? []).length} figli non Solo Admin. Proteggili prima, senza cascata automatica.` };
        }
      }
      updates.admin_only = transition.nextAdminOnly;
      if (adminOnlyRequested) updates.visibility = "secret";
    }
    if (parentMapId !== undefined) {
      updates.parent_map_id = parentMapId;
    }
    if (wikiEntityId !== undefined) {
      if (wikiEntityId) {
        const { data: entityRow, error: entityErr } = await supabase
          .from("wiki_entities")
          .select("id, type, campaign_id, admin_only")
          .eq("id", wikiEntityId)
          .eq("campaign_id", campaignId)
          .maybeSingle();
        if (entityErr || !entityRow) {
          return { success: false, message: "Luogo wiki non trovato in questa campagna." };
        }
        if ((entityRow as { type?: string }).type !== "location") {
          return { success: false, message: "Puoi collegare solo schede di tipo Luogo." };
        }
      if (transition.intent === "none") {
          const { data: currentMap } = await supabase.from("maps").select("admin_only").eq("id", mapId).single();
          if (Boolean((currentMap as { admin_only?: boolean } | null)?.admin_only) !== Boolean((entityRow as { admin_only?: boolean }).admin_only)) {
            return { success: false, message: "Il collegamento Wiki-mappa attraverserebbe il confine Solo Admin." };
          }
        }
        await supabase
          .from("maps")
          .update({ wiki_entity_id: null })
          .eq("campaign_id", campaignId)
          .eq("wiki_entity_id", wikiEntityId)
          .neq("id", mapId);
      }
      updates.wiki_entity_id = wikiEntityId;
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("maps")
        .update(updates)
        .eq("id", mapId)
        .eq("campaign_id", campaignId);
      if (error) {
        console.error("[updateMap]", error);
        const friendly = mapPgMapError(error);
        return { success: false, message: friendly ?? error.message ?? "Errore durante l'aggiornamento." };
      }
      if (transition.intent !== "none") logAdminContentTransition({ action: transition.intent, access: accessResult.access, campaignId, entityType: "map", entityId: mapId });
    }
    if (visibility !== undefined) {
      const partyUserIds =
        visibility === "selective"
          ? await resolveAllowedUserIdsFromParties(supabase, campaignId, allowedPartyIds)
          : [];
      const mergedUserIds = [...new Set([...allowedUserIds, ...partyUserIds])];
      const { error: permError } = await syncEntityPermissions(
        supabase,
        campaignId,
        "map",
        mapId,
        visibility === "selective" ? mergedUserIds : []
      );
      if (permError) console.error("[updateMap] entity_permissions", permError);
    }
    try {
      const admin = createSupabaseAdminClient();
      await syncMapDescriptionToCampaignMemory(admin, mapId, { campaignId });
    } catch (memoryErr) {
      console.error("[updateMap] campaign memory sync", memoryErr);
    }
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/maps/${mapId}`);
    return { success: true, message: "Mappa aggiornata." };
  } catch (err) {
    console.error("[updateMap]", err);
    return { success: false, message: "Si è verificato un errore. Riprova." };
  }
}

export type DeleteMapResult = { success: boolean; message: string };

export async function deleteMap(mapId: string, campaignId: string): Promise<DeleteMapResult> {
  if (!mapId || !campaignId) {
    return { success: false, message: "Mappa non valida." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Solo GM e Admin possono eliminare mappe." };
    }

    const { error } = await supabase.from("maps").delete().eq("id", mapId).eq("campaign_id", campaignId);

    if (error) {
      console.error("[deleteMap]", error);
      return { success: false, message: error.message ?? "Errore durante l'eliminazione." };
    }

    try {
      const admin = createSupabaseAdminClient();
      await deleteCampaignMemorySource(admin, campaignId, "map_description", mapId);
    } catch (memoryErr) {
      console.error("[deleteMap] campaign memory delete", memoryErr);
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Mappa eliminata." };
  } catch (err) {
    console.error("[deleteMap]", err);
    return { success: false, message: "Si è verificato un errore. Riprova." };
  }
}

export type AddPinResult = {
  success: boolean;
  message: string;
};

/** x, y in 0-1 (frazione sull'immagine). linked_map_id o linked_entity_id opzionali (mutuamente esclusivi). */
export async function addPin(
  mapId: string,
  campaignId: string,
  formData: FormData
): Promise<AddPinResult> {
  const xStr = (formData.get("x") as string | null)?.trim();
  const yStr = (formData.get("y") as string | null)?.trim();
  const label = (formData.get("label") as string | null)?.trim() ?? "";
  const linkedMapId = (formData.get("linked_map_id") as string | null)?.trim() || null;
  const linkedEntityId = (formData.get("linked_entity_id") as string | null)?.trim() || null;

  const x = xStr != null ? parseFloat(xStr) : NaN;
  const y = yStr != null ? parseFloat(yStr) : NaN;

  if (!mapId || !campaignId) {
    return { success: false, message: "Mappa non valida." };
  }
  if (Number.isNaN(x) || Number.isNaN(y) || x < 0 || x > 1 || y < 0 || y > 1) {
    return { success: false, message: "Coordinate non valide." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Non autorizzato. Solo GM e Admin possono aggiungere pin." };
    }
    const isAdmin = profile.role === "admin";
    const [{ data: sourceMap }, { data: targetMap }, { data: targetWiki }] = await Promise.all([
      supabase.from("maps").select("admin_only").eq("id", mapId).eq("campaign_id", campaignId).maybeSingle(),
      linkedMapId ? supabase.from("maps").select("admin_only").eq("id", linkedMapId).eq("campaign_id", campaignId).maybeSingle() : Promise.resolve({ data: null }),
      linkedEntityId ? supabase.from("wiki_entities").select("admin_only").eq("id", linkedEntityId).eq("campaign_id", campaignId).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    if (!sourceMap || !isAdmin && (sourceMap.admin_only || (targetMap && targetMap.admin_only) || (targetWiki && targetWiki.admin_only))) {
      return { success: false, message: "Non puoi creare un pin che attraversa contenuti Solo Admin." };
    }

    const { error } = await supabase.from("map_pins").insert({
      map_id: mapId,
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y * 10000) / 10000,
      label: label || null,
      link_map_id: linkedEntityId ? null : linkedMapId || null,
      link_entity_id: linkedEntityId || null,
    });

    if (error) {
      console.error("[addPin]", error);
      return {
        success: false,
        message: error.message ?? "Errore nel salvataggio del pin.",
      };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/maps/${mapId}`);
    return { success: true, message: "Pin aggiunto!" };
  } catch (err) {
    console.error("[addPin]", err);
    return {
      success: false,
      message: "Si è verificato un errore imprevisto. Riprova.",
    };
  }
}

export type WikiLocationPinOption = {
  id: string;
  name: string;
  boundMapId: string | null;
};

export type ListWikiLocationsForMapResult =
  | { success: true; data: WikiLocationPinOption[] }
  | { success: false; message: string };

/** Luoghi wiki della campagna, con eventuale mappa interattiva collegata. */
export async function listWikiLocationsForMapAction(
  campaignId: string
): Promise<ListWikiLocationsForMapResult> {
  if (!campaignId?.trim()) return { success: false, message: "Campagna non valida." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, message: "Non autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";

    let entitiesQuery = supabase
        .from("wiki_entities")
        .select("id, name, admin_only")
        .eq("campaign_id", campaignId)
        .eq("type", "location")
        .order("name", { ascending: true });
    let boundMapsQuery = supabase
        .from("maps")
        .select("id, wiki_entity_id, admin_only")
        .eq("campaign_id", campaignId)
        .not("wiki_entity_id", "is", null);
    if (!isAdmin) {
      entitiesQuery = entitiesQuery.eq("admin_only", false);
      boundMapsQuery = boundMapsQuery.eq("admin_only", false);
    }
    const [{ data: entities, error: entErr }, { data: boundMaps, error: mapErr }] = await Promise.all([
      entitiesQuery,
      boundMapsQuery,
    ]);
    if (entErr) return { success: false, message: entErr.message };
    if (mapErr && !mapErr.message?.includes("wiki_entity_id")) {
      return { success: false, message: mapErr.message };
    }

    const mapByEntity = new Map<string, string>();
    for (const row of (boundMaps ?? []) as Array<{ id: string; wiki_entity_id: string | null }>) {
      if (row.wiki_entity_id) mapByEntity.set(row.wiki_entity_id, row.id);
    }

    return {
      success: true,
      data: ((entities ?? []) as Array<{ id: string; name: string }>).map((e) => ({
        id: e.id,
        name: e.name,
        boundMapId: mapByEntity.get(e.id) ?? null,
      })),
    };
  } catch (err) {
    console.error("[listWikiLocationsForMapAction]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}

export type CreateMapFromWikiLocationResult =
  | { success: true; message: string; mapId: string }
  | { success: false; message: string };

/** Crea una mappa interattiva collegata 1:1 a un luogo wiki (stesso nome/immagine). */
export async function createMapFromWikiLocationAction(
  campaignId: string,
  wikiEntityId: string,
  options?: { parentMapId?: string | null; mapType?: string }
): Promise<CreateMapFromWikiLocationResult> {
  if (!campaignId?.trim() || !wikiEntityId?.trim()) {
    return { success: false, message: "Parametri non validi." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, message: "Devi essere autenticato." };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Non autorizzato." };
    }
    const isAdmin = profile.role === "admin";

    let linkedEntityQuery = supabase
      .from("wiki_entities")
      .select("id, name, type, image_url, campaign_id, visibility, admin_only")
      .eq("id", wikiEntityId)
      .eq("campaign_id", campaignId);
    if (!isAdmin) linkedEntityQuery = linkedEntityQuery.eq("admin_only", false);
    const { data: entity, error: entErr } = await linkedEntityQuery.maybeSingle();
    if (entErr || !entity) return { success: false, message: "Luogo wiki non trovato." };
    if ((entity as { type?: string }).type !== "location") {
      return { success: false, message: "Solo le schede Luogo possono avere una mappa collegata." };
    }

    const { data: existing } = await supabase
      .from("maps")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("wiki_entity_id", wikiEntityId)
      .maybeSingle();
    if (existing?.id) {
      return { success: false, message: "Questo luogo ha già una mappa collegata." };
    }

    const imageUrl = (entity as { image_url?: string | null }).image_url?.trim();
    if (!imageUrl) {
      return {
        success: false,
        message: "Aggiungi un'immagine al luogo wiki prima di creare la mappa interattiva.",
      };
    }

    const mapTypeRaw = options?.mapType?.trim() || "building";
    const mapType = MAP_TYPES_ALL.includes(mapTypeRaw as (typeof MAP_TYPES_ALL)[number])
      ? mapTypeRaw
      : "building";
    const parentMapId = options?.parentMapId?.trim() || null;
    const visibility = (entity as { visibility?: Visibility }).visibility ?? "public";
    const vis = VISIBILITY_VALUES.includes(visibility as Visibility) ? (visibility as Visibility) : "public";
    if (parentMapId) {
      const { data: parent } = await supabase.from("maps").select("admin_only").eq("id", parentMapId).eq("campaign_id", campaignId).maybeSingle();
      if (!parent || Boolean((parent as { admin_only?: boolean }).admin_only) !== Boolean((entity as { admin_only?: boolean }).admin_only)) {
        return { success: false, message: "La gerarchia non può attraversare il confine Solo Admin." };
      }
    }

    const insertPayload: Record<string, unknown> = {
      campaign_id: campaignId,
      name: (entity as { name: string }).name,
      description: null,
      map_type: mapType,
      image_url: imageUrl,
      visibility: vis,
      wiki_entity_id: wikiEntityId,
      admin_only: Boolean((entity as { admin_only?: boolean }).admin_only),
    };
    if (parentMapId) insertPayload.parent_map_id = parentMapId;

    const { data: inserted, error: insertError } = await supabase
      .from("maps")
      .insert(insertPayload as never)
      .select("id")
      .single();
    if (insertError || !inserted) {
      console.error("[createMapFromWikiLocationAction]", insertError);
      return { success: false, message: insertError?.message ?? "Errore creazione mappa." };
    }

    try {
      const admin = createSupabaseAdminClient();
      await syncMapDescriptionToCampaignMemory(admin, inserted.id, { campaignId });
    } catch (memoryErr) {
      console.error("[createMapFromWikiLocationAction] memory", memoryErr);
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/wiki/${wikiEntityId}`);
    return {
      success: true,
      message: "Mappa interattiva creata e collegata al luogo.",
      mapId: inserted.id,
    };
  } catch (err) {
    console.error("[createMapFromWikiLocationAction]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}
