"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { uploadToTelegram } from "@/lib/telegram-storage";
import { parseSafeExternalUrl } from "@/lib/security/url";
import {
  syncEntityPermissions,
  parseAllowedUserIds,
  parseAllowedPartyIds,
  resolveAllowedUserIdsFromParties,
} from "@/lib/entity-permissions";

const VISIBILITY_VALUES = ["public", "secret", "selective"] as const;
type Visibility = (typeof VISIBILITY_VALUES)[number];

const MAP_TYPES_ALL = ["world", "continent", "city", "dungeon", "district", "building"] as const;

export type UploadMapResult = {
  success: boolean;
  message: string;
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
    const { data, error } = await supabase
      .from("maps")
      .select("id, name, map_type, parent_map_id")
      .eq("campaign_id", campaignId)
      .order("name", { ascending: true });
    if (error) {
      if (error.message?.includes("parent_map_id")) {
        const { data: fallback, error: err2 } = await supabase
          .from("maps")
          .select("id, name, map_type")
          .eq("campaign_id", campaignId)
          .order("name", { ascending: true });
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
      visibility,
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

    if (visibility === "selective") {
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

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Mappa caricata!" };
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
    map_type?: string;
    visibility?: Visibility;
    parent_map_id?: string | null;
    allowed_user_ids?: string[];
    allowed_party_ids?: string[];
  }
): Promise<UpdateMapResult> {
  if (!mapId || !campaignId) {
    return { success: false, message: "Mappa non valida." };
  }
  const name = payload.name?.trim();
  const mapType = payload.map_type?.trim();
  const visibility = payload.visibility && VISIBILITY_VALUES.includes(payload.visibility) ? payload.visibility : undefined;
  const parentMapId =
    payload.parent_map_id === undefined
      ? undefined
      : payload.parent_map_id === null || payload.parent_map_id === ""
        ? null
        : payload.parent_map_id.trim();
  const allowedUserIds = payload.allowed_user_ids ?? [];
  const allowedPartyIds = payload.allowed_party_ids ?? [];

  if (!name && !mapType && visibility === undefined && parentMapId === undefined) {
    return { success: false, message: "Inserisci nome, categoria, genitore o visibilità da aggiornare." };
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
      return { success: false, message: "Solo GM e Admin possono modificare le mappe." };
    }
    const updates: {
      name?: string;
      map_type?: string;
      visibility?: Visibility;
      parent_map_id?: string | null;
    } = {};
    if (name) updates.name = name;
    if (mapType && MAP_TYPES.includes(mapType as (typeof MAP_TYPES)[number])) {
      updates.map_type = mapType;
    }
    if (visibility !== undefined) {
      updates.visibility = visibility;
    }
    if (parentMapId !== undefined) {
      updates.parent_map_id = parentMapId;
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

/** x, y in 0-1 (frazione sull'immagine). linked_map_id opzionale. */
export async function addPin(
  mapId: string,
  campaignId: string,
  formData: FormData
): Promise<AddPinResult> {
  const xStr = (formData.get("x") as string | null)?.trim();
  const yStr = (formData.get("y") as string | null)?.trim();
  const label = (formData.get("label") as string | null)?.trim() ?? "";
  const linkedMapId = (formData.get("linked_map_id") as string | null)?.trim() || null;

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

    const { error } = await supabase.from("map_pins").insert({
      map_id: mapId,
      x: Math.round(x * 10000) / 10000,
      y: Math.round(y * 10000) / 10000,
      label: label || null,
      link_map_id: linkedMapId || null,
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
