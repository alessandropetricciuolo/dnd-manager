"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { uploadToTelegram } from "@/lib/telegram-storage";
import { syncEntityPermissions, parseAllowedUserIds } from "@/lib/entity-permissions";

const ENTITY_TYPES = ["npc", "location", "monster", "item", "lore"] as const;
const VISIBILITY_VALUES = ["public", "secret", "selective"] as const;
type Visibility = (typeof VISIBILITY_VALUES)[number];

export type CreateEntityResult = {
  success: boolean;
  message: string;
};

function parseAttributes(formData: FormData, type: string): Record<string, unknown> {
  const raw = formData.get("attributes") as string | null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      // ignore
    }
  }
  return {};
}

function parseTags(formData: FormData): string[] {
  const raw = formData.get("tags") as string | null;
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean);
    }
  } catch {
    // ignore
  }
  return [];
}

export type RelationFormRow = { targetType: "wiki" | "map"; targetId: string; label: string };

function parseRelations(formData: FormData): RelationFormRow[] {
  const raw = formData.get("relations") as string | null;
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RelationFormRow =>
          r != null &&
          typeof r === "object" &&
          (r.targetType === "wiki" || r.targetType === "map") &&
          typeof r.targetId === "string" &&
          r.targetId.trim() !== "" &&
          typeof r.label === "string"
      )
      .map((r) => ({ targetType: r.targetType, targetId: r.targetId.trim(), label: (r.label ?? "").trim() }));
  } catch {
    return [];
  }
}

export async function createEntity(
  campaignId: string,
  formData: FormData
): Promise<CreateEntityResult> {
  const title = (formData.get("title") as string | null)?.trim();
  const type = (formData.get("type") as string | null)?.trim();
  const content = (formData.get("content") as string | null)?.trim() ?? "";
  const visibilityRaw = (formData.get("visibility") as string | null)?.trim() || "public";
  const visibility: Visibility = VISIBILITY_VALUES.includes(visibilityRaw as Visibility) ? visibilityRaw as Visibility : "public";
  const isSecret = visibility === "secret";
  const allowedUserIds = parseAllowedUserIds(formData, "allowed_user_ids");
  const imageFile = formData.get("image") as File | null;
  let imageUrl = (formData.get("image_url") as string | null)?.trim() || null;
  const attributes = parseAttributes(formData, type ?? "");
  const sortOrderRaw = formData.get("sort_order") as string | null;
  const sortOrder = sortOrderRaw != null && sortOrderRaw !== "" ? parseInt(sortOrderRaw, 10) : null;
  const isCore = formData.get("is_core") === "on" || formData.get("is_core") === "true";
  const xpRaw = (formData.get("xp_value") as string | null)?.trim() ?? "";
  const xpValue = xpRaw ? Math.max(0, parseInt(xpRaw, 10) || 0) : 0;
  const tags = parseTags(formData);
  const relations = parseRelations(formData);

  if (!title) {
    return { success: false, message: "Il titolo è obbligatorio." };
  }
  if (!type || !ENTITY_TYPES.includes(type as (typeof ENTITY_TYPES)[number])) {
    return { success: false, message: "Seleziona un tipo valido." };
  }
  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
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
      return { success: false, message: "Non autorizzato. Solo GM e Admin possono creare entità wiki." };
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
        console.error("[createEntity] Telegram upload", uploadErr);
        return {
          success: false,
          message: uploadErr instanceof Error ? uploadErr.message : "Errore durante il caricamento dell'immagine.",
        };
      }
    }

    const insertPayload: Record<string, unknown> = {
      campaign_id: campaignId,
      name: title,
      type: type as (typeof ENTITY_TYPES)[number],
      content: { body: content },
      is_secret: isSecret,
      visibility,
      image_url: imageUrl,
      attributes: Object.keys(attributes).length ? attributes : {},
      tags: tags.length ? tags : [],
    };
    if (sortOrder != null && !Number.isNaN(sortOrder)) {
      insertPayload.sort_order = sortOrder;
    }
    const { data: camp } = await supabase.from("campaigns").select("type").eq("id", campaignId).single();
    if (camp?.type === "long" && (type === "npc" || type === "monster")) {
      insertPayload.is_core = isCore;
      insertPayload.global_status = "alive";
    }
    if (type === "monster") {
      insertPayload.xp_value = xpValue;
    }

    const { data: inserted, error } = await supabase
      .from("wiki_entities")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error || !inserted) {
      console.error("[createEntity]", error);
      return {
        success: false,
        message: error?.message ?? "Errore durante la creazione.",
      };
    }

    if (visibility === "selective" && allowedUserIds.length > 0) {
      const { error: permError } = await syncEntityPermissions(
        supabase,
        campaignId,
        "wiki",
        inserted.id,
        allowedUserIds
      );
      if (permError) console.error("[createEntity] entity_permissions", permError);
    }

    for (const rel of relations) {
      const payload: Record<string, unknown> = {
        campaign_id: campaignId,
        source_id: inserted.id,
        label: rel.label || "—",
      };
      if (rel.targetType === "wiki") {
        if (rel.targetId !== inserted.id) {
          payload.target_id = rel.targetId;
          payload.target_map_id = null;
          const { error: relErr } = await supabase.from("wiki_relationships").insert(payload);
          if (relErr) console.error("[createEntity] relation insert", relErr);
        }
      } else {
        payload.target_id = null;
        payload.target_map_id = rel.targetId;
        const { error: relErr } = await supabase.from("wiki_relationships").insert(payload);
        if (relErr) console.error("[createEntity] relation insert", relErr);
      }
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Entità creata!" };
  } catch (err) {
    console.error("[createEntity]", err);
    return {
      success: false,
      message: "Si è verificato un errore imprevisto. Riprova.",
    };
  }
}

export type UpdateEntityResult = { success: boolean; message: string };

export async function updateEntity(
  entityId: string,
  campaignId: string,
  formData: FormData
): Promise<UpdateEntityResult> {
  const title = (formData.get("title") as string | null)?.trim();
  const type = (formData.get("type") as string | null)?.trim();
  const content = (formData.get("content") as string | null)?.trim() ?? "";
  const visibilityRaw = (formData.get("visibility") as string | null)?.trim() || null;
  const visibility: Visibility | null = visibilityRaw && VISIBILITY_VALUES.includes(visibilityRaw as Visibility) ? visibilityRaw as Visibility : null;
  const isSecret = visibility === "secret" || (visibility === null && formData.get("is_secret") === "on");
  const allowedUserIds = parseAllowedUserIds(formData, "allowed_user_ids");
  const imageFile = formData.get("image") as File | null;
  const imageUrlFromForm = (formData.get("image_url") as string | null)?.trim() || null;
  const removeImage = formData.get("remove_image") === "on" || formData.get("remove_image") === "true";
  const attributes = parseAttributes(formData, type ?? "");
  const sortOrderRaw = formData.get("sort_order") as string | null;
  const sortOrder = sortOrderRaw != null && sortOrderRaw !== "" ? parseInt(sortOrderRaw, 10) : null;
  const isCore = formData.get("is_core") === "on" || formData.get("is_core") === "true";
  const xpRaw = (formData.get("xp_value") as string | null)?.trim() ?? "";
  const xpValue = xpRaw ? Math.max(0, parseInt(xpRaw, 10) || 0) : 0;
  const tags = parseTags(formData);
  const relations = parseRelations(formData);

  if (!title) {
    return { success: false, message: "Il titolo è obbligatorio." };
  }
  if (!type || !ENTITY_TYPES.includes(type as (typeof ENTITY_TYPES)[number])) {
    return { success: false, message: "Seleziona un tipo valido." };
  }
  if (!entityId || !campaignId) {
    return { success: false, message: "Entità non valida." };
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
      return { success: false, message: "Solo GM e Admin possono modificare le voci wiki." };
    }

    let imageUrl: string | null | undefined = undefined;
    if (removeImage) {
      imageUrl = null;
    } else if (imageFile && imageFile instanceof File && imageFile.size > 0) {
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
        console.error("[updateEntity] Telegram upload", uploadErr);
        return {
          success: false,
          message: uploadErr instanceof Error ? uploadErr.message : "Errore durante il caricamento dell'immagine.",
        };
      }
    } else if (imageUrlFromForm) {
      imageUrl = imageUrlFromForm;
    }

    const updatePayload: Record<string, unknown> = {
      name: title,
      type: type as (typeof ENTITY_TYPES)[number],
      content: { body: content },
      is_secret: isSecret,
      attributes: Object.keys(attributes).length ? attributes : {},
      tags: tags,
    };
    if (visibility !== null) {
      updatePayload.visibility = visibility;
    }
    if (imageUrl !== undefined) updatePayload.image_url = imageUrl;
    if (sortOrder != null && !Number.isNaN(sortOrder)) {
      updatePayload.sort_order = sortOrder;
    } else {
      updatePayload.sort_order = null;
    }

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("type")
      .eq("id", campaignId)
      .single();
    if (campaign?.type === "long" && (type === "npc" || type === "monster")) {
      updatePayload.is_core = isCore;
      if (!isCore) updatePayload.global_status = "alive";
    }
    if (type === "monster") {
      updatePayload.xp_value = xpValue;
    }

    const { error } = await supabase
      .from("wiki_entities")
      .update(updatePayload)
      .eq("id", entityId)
      .eq("campaign_id", campaignId);

    if (error) {
      console.error("[updateEntity]", error);
      return {
        success: false,
        message: error.message ?? "Errore durante l'aggiornamento.",
      };
    }

    if (visibility !== null) {
      const { error: permError } = await syncEntityPermissions(
        supabase,
        campaignId,
        "wiki",
        entityId,
        visibility === "selective" ? allowedUserIds : []
      );
      if (permError) console.error("[updateEntity] entity_permissions", permError);
    }

    await supabase
      .from("wiki_relationships")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("source_id", entityId);

    for (const rel of relations) {
      const payload: Record<string, unknown> = {
        campaign_id: campaignId,
        source_id: entityId,
        label: rel.label || "—",
      };
      if (rel.targetType === "wiki") {
        if (rel.targetId !== entityId) {
          payload.target_id = rel.targetId;
          payload.target_map_id = null;
          await supabase.from("wiki_relationships").insert(payload);
        }
      } else {
        payload.target_id = null;
        payload.target_map_id = rel.targetId;
        await supabase.from("wiki_relationships").insert(payload);
      }
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/wiki/${entityId}`);
    return { success: true, message: "Voce aggiornata!" };
  } catch (err) {
    console.error("[updateEntity]", err);
    return {
      success: false,
      message: "Si è verificato un errore imprevisto. Riprova.",
    };
  }
}

export type DeleteEntityResult = { success: boolean; message: string };

/** Elimina una voce wiki. Solo GM e Admin. Rimuove prima i record in explorations collegati. */
export async function deleteEntity(
  entityId: string,
  campaignId: string
): Promise<DeleteEntityResult> {
  if (!entityId || !campaignId) {
    return { success: false, message: "Voce o campagna non valida." };
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
      return { success: false, message: "Solo GM e Admin possono eliminare le voci wiki." };
    }

    const { data: existing } = await supabase
      .from("wiki_entities")
      .select("id")
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (!existing) {
      return { success: false, message: "Voce non trovata." };
    }

    await supabase.from("explorations").delete().eq("entity_id", entityId);
    const { error: deleteError } = await supabase
      .from("wiki_entities")
      .delete()
      .eq("id", entityId)
      .eq("campaign_id", campaignId);

    if (deleteError) {
      console.error("[deleteEntity]", deleteError);
      return {
        success: false,
        message: deleteError.message ?? "Errore durante l'eliminazione.",
      };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/wiki/${entityId}`);
    return { success: true, message: "Voce eliminata." };
  } catch (err) {
    console.error("[deleteEntity]", err);
    return {
      success: false,
      message: "Si è verificato un errore imprevisto. Riprova.",
    };
  }
}

/** Imposta lo stato globale (alive/dead) di un NPC/Mostro core. Solo campagne Long, solo entità con is_core = true. */
export async function setWikiEntityGlobalStatus(
  entityId: string,
  campaignId: string,
  status: "alive" | "dead"
): Promise<{ success: boolean; message: string }> {
  if (!entityId || !campaignId) {
    return { success: false, message: "Entità o campagna non valida." };
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
      return { success: false, message: "Solo il Master può modificare lo stato." };
    }
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("type")
      .eq("id", campaignId)
      .single();
    if (campaign?.type !== "long") {
      return { success: true, message: "Ignorato (solo campagne Long)." };
    }
    const { data: entity } = await supabase
      .from("wiki_entities")
      .select("id, is_core, type")
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .single();
    if (!entity || !(entity as { is_core?: boolean }).is_core) {
      return { success: false, message: "Solo gli NPC/Mostri contrassegnati come Core hanno stato globale." };
    }
    const { error } = await supabase
      .from("wiki_entities")
      .update({ global_status: status })
      .eq("id", entityId)
      .eq("campaign_id", campaignId);
    if (error) {
      console.error("[setWikiEntityGlobalStatus]", error);
      return { success: false, message: error.message ?? "Errore nell'aggiornamento." };
    }
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/wiki/${entityId}`);
    return { success: true, message: status === "dead" ? "Segnato come morto." : "Segnato come vivo." };
  } catch (err) {
    console.error("[setWikiEntityGlobalStatus]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}

export type WikiEntity = {
  id: string;
  campaign_id: string;
  name: string;
  type: string;
  content: { body?: string } | null;
  image_url: string | null;
  /** file_id Telegram usato come fallback se image_url (Drive) fallisce. */
  telegram_fallback_id?: string | null;
  is_secret: boolean;
  visibility?: string;
  attributes: Record<string, unknown> | null;
  sort_order: number | null;
  is_core?: boolean;
  global_status?: "alive" | "dead";
  xp_value?: number | null;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
};

/** Chiavi negli attributes che i Player non devono mai ricevere (né in UI né in risposta di rete). */
const SENSITIVE_ATTRIBUTE_KEYS = ["loot", "combat_stats", "relationships", "gm_notes"] as const;

function sanitizeEntityForPlayer(entity: WikiEntity): WikiEntity {
  const raw = entity.attributes ?? {};
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (SENSITIVE_ATTRIBUTE_KEYS.includes(k as (typeof SENSITIVE_ATTRIBUTE_KEYS)[number])) continue;
    sanitized[k] = v;
  }
  return {
    ...entity,
    attributes: Object.keys(sanitized).length ? sanitized : {},
  };
}

/** Recupera un'entità. Player: visibile se is_secret = false oppure sbloccata in explorations; i dati sensibili (loot, stats, relazioni, gm_notes) vengono rimossi. GM/Admin vedono tutto. */
export async function getEntity(
  entityId: string,
  campaignId: string
): Promise<WikiEntity | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";

    const { data: entity, error } = await supabase
      .from("wiki_entities")
      .select("id, campaign_id, name, type, content, image_url, telegram_fallback_id, is_secret, visibility, attributes, sort_order, is_core, global_status, xp_value, tags, created_at, updated_at")
      .eq("id", entityId)
      .eq("campaign_id", campaignId)
      .single();

    if (error || !entity) return null;

    const wikiEntity = entity as WikiEntity;

    if (isGmOrAdmin) return wikiEntity;
    if (!wikiEntity.is_secret) return sanitizeEntityForPlayer(wikiEntity);

    const { data: exploration } = await supabase
      .from("explorations")
      .select("id")
      .eq("player_id", user.id)
      .eq("entity_id", entityId)
      .limit(1)
      .maybeSingle();

    return exploration ? sanitizeEntityForPlayer(wikiEntity) : null;
  } catch {
    return null;
  }
}

/** Per GM Screen Initiative Tracker: lista mostri della campagna con nome e HP (da combat_stats). Solo GM/Admin. Restituisce anche is_core e global_status per campagne Long. */
export async function getMonstersForInitiative(
  campaignId: string
): Promise<
  | { success: true; data: { id: string; name: string; hp: number; is_core?: boolean; global_status?: "alive" | "dead" }[] }
  | { success: false; error: string }
> {
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
    if (!isGmOrAdmin) return { success: false, error: "Solo il Master può usare questa funzione." };

    const { data: rows, error } = await supabase
      .from("wiki_entities")
      .select("id, name, attributes, is_core, global_status")
      .eq("campaign_id", campaignId)
      .eq("type", "monster")
      .order("name");

    if (error) {
      console.error("[getMonstersForInitiative]", error);
      return { success: false, error: error.message ?? "Errore nel caricamento." };
    }

    const list = (rows ?? []).map((r: { id: string; name: string; attributes: unknown; is_core?: boolean; global_status?: string }) => {
      const attrs = (r.attributes as { combat_stats?: { hp?: string } } | null) ?? {};
      const hpStr = attrs.combat_stats?.hp;
      const hp = hpStr != null && hpStr !== "" ? parseInt(String(hpStr), 10) : 0;
      return {
        id: r.id,
        name: r.name,
        hp: Number.isNaN(hp) ? 0 : hp,
        ...(r.is_core != null && { is_core: r.is_core }),
        ...(r.global_status === "alive" || r.global_status === "dead" ? { global_status: r.global_status as "alive" | "dead" } : {}),
      };
    });
    return { success: true, data: list };
  } catch (err) {
    console.error("[getMonstersForInitiative]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}

/** Restituisce PE (xp_value) per una lista di mostri (wiki_entities) dato l'elenco di id. Solo GM/Admin. */
export async function getMonstersXpForIds(
  campaignId: string,
  entityIds: string[]
): Promise<
  | { success: true; data: { id: string; xp_value: number }[] }
  | { success: false; error: string }
> {
  if (!entityIds.length) {
    return { success: true, data: [] };
  }

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
    if (!isGmOrAdmin) return { success: false, error: "Solo il Master può usare questa funzione." };

    const { data: rows, error } = await supabase
      .from("wiki_entities")
      .select("id, xp_value")
      .eq("campaign_id", campaignId)
      .eq("type", "monster")
      .in("id", entityIds);

    if (error) {
      console.error("[getMonstersXpForIds]", error);
      return { success: false, error: error.message ?? "Errore nel caricamento." };
    }

    const list =
      (rows ?? []).map((r: { id: string; xp_value?: number | null }) => ({
        id: r.id,
        xp_value: typeof r.xp_value === "number" && Number.isFinite(r.xp_value) ? Math.max(0, Math.floor(r.xp_value)) : 0,
      })) ?? [];

    return { success: true, data: list };
  } catch (err) {
    console.error("[getMonstersXpForIds]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}

export type GmGalleryItem = {
  id: string;
  title: string;
  category: "pg" | "npc" | "monster" | "location" | "item" | "lore";
  image_url: string | null;
  telegram_fallback_id?: string | null;
};

/** Galleria multimediale GM Screen: immagini da Wiki (tutte le categorie) + personaggi della campagna. Solo GM/Admin. */
export async function getGmGalleryItems(
  campaignId: string
): Promise<
  | { success: true; data: GmGalleryItem[] }
  | { success: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Non autenticato." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
    if (!isGmOrAdmin) {
      return { success: false, error: "Solo il Master può usare la galleria." };
    }

    // Wiki entities con immagine
    const { data: wikiRows, error: wikiErr } = await supabase
      .from("wiki_entities")
      .select("id, name, type, image_url, telegram_fallback_id")
      .eq("campaign_id", campaignId)
      .not("image_url", "is", null);

    if (wikiErr) {
      console.error("[getGmGalleryItems] wiki", wikiErr);
      return {
        success: false,
        error: wikiErr.message ?? "Errore nel caricamento dal wiki.",
      };
    }

    const wikiItems: GmGalleryItem[] = (wikiRows ?? []).map(
      (r: {
        id: string;
        name: string;
        type: string;
        image_url: string | null;
        telegram_fallback_id?: string | null;
      }) => {
        const t = r.type as
          | "npc"
          | "monster"
          | "location"
          | "item"
          | "lore";
        const safeType: GmGalleryItem["category"] =
          t === "npc" ||
          t === "monster" ||
          t === "location" ||
          t === "item" ||
          t === "lore"
            ? t
            : "lore";
        return {
          id: r.id,
          title: r.name,
          category: safeType,
          image_url: r.image_url ?? null,
          telegram_fallback_id: r.telegram_fallback_id ?? null,
        };
      }
    );

    // Personaggi della campagna con immagine
    const { data: charRows, error: charErr } = await supabase
      .from("campaign_characters")
      .select("id, name, image_url")
      .eq("campaign_id", campaignId)
      .not("image_url", "is", null);

    if (charErr) {
      console.error("[getGmGalleryItems] characters", charErr);
      return {
        success: false,
        error: charErr.message ?? "Errore nel caricamento dei personaggi.",
      };
    }

    const charItems: GmGalleryItem[] = (charRows ?? []).map(
      (r: { id: string; name: string; image_url: string | null }) => ({
        id: `pg-${r.id}`,
        title: r.name,
        category: "pg",
        image_url: r.image_url ?? null,
        telegram_fallback_id: null,
      })
    );

    const items = [...wikiItems, ...charItems];
    return { success: true, data: items };
  } catch (err) {
    console.error("[getGmGalleryItems]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}
