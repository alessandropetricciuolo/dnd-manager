"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const ENTITY_TYPES = ["npc", "location", "monster", "item", "lore"] as const;

/** Stesso bucket delle mappe, sottocartella wiki per immagini entità (NPC, luoghi, ecc.). */
const WIKI_IMAGES_BUCKET = "campaign_maps";

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

export async function createEntity(
  campaignId: string,
  formData: FormData
): Promise<CreateEntityResult> {
  const title = (formData.get("title") as string | null)?.trim();
  const type = (formData.get("type") as string | null)?.trim();
  const content = (formData.get("content") as string | null)?.trim() ?? "";
  const isSecret = formData.get("is_secret") === "on" || formData.get("is_secret") === "true";
  const imageFile = formData.get("image") as File | null;
  let imageUrl = (formData.get("image_url") as string | null)?.trim() || null;
  const attributes = parseAttributes(formData, type ?? "");
  const sortOrderRaw = formData.get("sort_order") as string | null;
  const sortOrder = sortOrderRaw != null && sortOrderRaw !== "" ? parseInt(sortOrderRaw, 10) : null;

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
      const ext = imageFile.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${campaignId}/wiki/${randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(WIKI_IMAGES_BUCKET)
        .upload(path, imageFile, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        console.error("[createEntity] storage", uploadError);
        return {
          success: false,
          message: uploadError.message ?? "Errore durante il caricamento dell'immagine.",
        };
      }
      const { data: urlData } = supabase.storage.from(WIKI_IMAGES_BUCKET).getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const insertPayload: Record<string, unknown> = {
      campaign_id: campaignId,
      name: title,
      type: type as (typeof ENTITY_TYPES)[number],
      content: { body: content },
      is_secret: isSecret,
      image_url: imageUrl,
      attributes: Object.keys(attributes).length ? attributes : {},
    };
    if (sortOrder != null && !Number.isNaN(sortOrder)) {
      insertPayload.sort_order = sortOrder;
    }

    const { error } = await supabase.from("wiki_entities").insert(insertPayload);

    if (error) {
      console.error("[createEntity]", error);
      return {
        success: false,
        message: error.message ?? "Errore durante la creazione.",
      };
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
  const isSecret = formData.get("is_secret") === "on" || formData.get("is_secret") === "true";
  const imageFile = formData.get("image") as File | null;
  const imageUrlFromForm = (formData.get("image_url") as string | null)?.trim() || null;
  const removeImage = formData.get("remove_image") === "on" || formData.get("remove_image") === "true";
  const attributes = parseAttributes(formData, type ?? "");
  const sortOrderRaw = formData.get("sort_order") as string | null;
  const sortOrder = sortOrderRaw != null && sortOrderRaw !== "" ? parseInt(sortOrderRaw, 10) : null;

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
      const ext = imageFile.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${campaignId}/wiki/${randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(WIKI_IMAGES_BUCKET)
        .upload(path, imageFile, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        console.error("[updateEntity] storage", uploadError);
        return {
          success: false,
          message: uploadError.message ?? "Errore durante il caricamento dell'immagine.",
        };
      }
      const { data: urlData } = supabase.storage.from(WIKI_IMAGES_BUCKET).getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    } else if (imageUrlFromForm) {
      imageUrl = imageUrlFromForm;
    }

    const updatePayload: Record<string, unknown> = {
      name: title,
      type: type as (typeof ENTITY_TYPES)[number],
      content: { body: content },
      is_secret: isSecret,
      attributes: Object.keys(attributes).length ? attributes : {},
    };
    if (imageUrl !== undefined) updatePayload.image_url = imageUrl;
    if (sortOrder != null && !Number.isNaN(sortOrder)) {
      updatePayload.sort_order = sortOrder;
    } else {
      updatePayload.sort_order = null;
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

export type WikiEntity = {
  id: string;
  campaign_id: string;
  name: string;
  type: string;
  content: { body?: string } | null;
  image_url: string | null;
  is_secret: boolean;
  attributes: Record<string, unknown> | null;
  sort_order: number | null;
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
      .select("id, campaign_id, name, type, content, image_url, is_secret, attributes, sort_order, created_at, updated_at")
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
