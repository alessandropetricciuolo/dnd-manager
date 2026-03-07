"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { syncEntityPermissions, parseAllowedUserIds } from "@/lib/entity-permissions";

const VISIBILITY_VALUES = ["public", "secret", "selective"] as const;
type Visibility = (typeof VISIBILITY_VALUES)[number];

export type UploadMapResult = {
  success: boolean;
  message: string;
};

export async function uploadMap(
  formData: FormData
): Promise<UploadMapResult> {
  const campaignId = (formData.get("campaign_id") as string | null)?.trim();
  const name = (formData.get("name") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() || null;
  const mapTypeRaw = (formData.get("map_type") as string | null)?.trim() || "region";
  const allowedMapTypes = ["world", "continent", "region", "city", "dungeon", "district", "building"] as const;
  const mapType = allowedMapTypes.includes(mapTypeRaw as (typeof allowedMapTypes)[number])
    ? mapTypeRaw
    : "region";
  const imageUrl = (formData.get("image_url") as string | null)?.trim() || null;
  const imageUrlOverride = (formData.get("image_url_override") as string | null)?.trim() || null;
  const visibilityRaw = (formData.get("visibility") as string | null)?.trim() || "public";
  const visibility: Visibility = VISIBILITY_VALUES.includes(visibilityRaw as Visibility) ? visibilityRaw as Visibility : "public";
  const allowedUserIds = parseAllowedUserIds(formData, "allowed_user_ids");

  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
  }
  if (!name) {
    return { success: false, message: "Il nome della mappa è obbligatorio." };
  }

  const finalImageUrl = imageUrlOverride || imageUrl;
  if (!finalImageUrl) {
    return { success: false, message: "Carica un'immagine, incolla un File ID Telegram o un link (es. Google Drive)." };
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

    const { data: inserted, error: insertError } = await supabase
      .from("maps")
      .insert({
        campaign_id: campaignId,
        name,
        description,
        map_type: mapType,
        image_url: finalImageUrl,
        visibility,
        is_secret: visibility === "secret",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[uploadMap] insert", insertError);
      return {
        success: false,
        message: insertError?.message ?? "Errore nel salvataggio della mappa.",
      };
    }

    if (visibility === "selective" && allowedUserIds.length > 0) {
      const { error: permError } = await syncEntityPermissions(
        supabase,
        campaignId,
        "map",
        inserted.id,
        allowedUserIds
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

const MAP_TYPES = ["world", "continent", "region", "city", "dungeon", "district", "building"] as const;

export async function updateMap(
  mapId: string,
  campaignId: string,
  payload: {
    name?: string;
    map_type?: string;
    visibility?: Visibility;
    allowed_user_ids?: string[];
  }
): Promise<UpdateMapResult> {
  if (!mapId || !campaignId) {
    return { success: false, message: "Mappa non valida." };
  }
  const name = payload.name?.trim();
  const mapType = payload.map_type?.trim();
  const visibility = payload.visibility && VISIBILITY_VALUES.includes(payload.visibility) ? payload.visibility : undefined;
  const allowedUserIds = payload.allowed_user_ids ?? [];

  if (!name && !mapType && visibility === undefined) {
    return { success: false, message: "Inserisci nome, categoria o visibilità da aggiornare." };
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
    const updates: { name?: string; map_type?: string; visibility?: Visibility; is_secret?: boolean } = {};
    if (name) updates.name = name;
    if (mapType && MAP_TYPES.includes(mapType as (typeof MAP_TYPES)[number])) {
      updates.map_type = mapType;
    }
    if (visibility !== undefined) {
      updates.visibility = visibility;
      updates.is_secret = visibility === "secret";
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("maps")
        .update(updates)
        .eq("id", mapId)
        .eq("campaign_id", campaignId);
      if (error) {
        console.error("[updateMap]", error);
        return { success: false, message: error.message ?? "Errore durante l'aggiornamento." };
      }
    }
    if (visibility !== undefined) {
      const { error: permError } = await syncEntityPermissions(
        supabase,
        campaignId,
        "map",
        mapId,
        visibility === "selective" ? allowedUserIds : []
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
