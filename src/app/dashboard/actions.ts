"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { uploadToTelegram } from "@/lib/telegram-storage";

export type CreateCampaignResult = {
  success: boolean;
  message: string;
};

export async function createCampaign(
  formData: FormData
): Promise<CreateCampaignResult> {
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() ?? null;
  const isPublic = formData.get("is_public") === "on" || formData.get("is_public") === "true";
  const typeRaw = (formData.get("type") as string | null)?.trim()?.toLowerCase();
  const type = typeRaw && ["oneshot", "quest", "long"].includes(typeRaw)
    ? (typeRaw as "oneshot" | "quest" | "long")
    : null;
  const isLongCampaign = formData.get("is_long_campaign") === "on" || formData.get("is_long_campaign") === "true";
  const playerPrimer = (formData.get("player_primer") as string | null)?.trim() || null;
  const imageFile = formData.get("image") as File | null;
  const imageUrlFromForm = (formData.get("image_url") as string | null)?.trim() || null;

  if (!title) {
    return { success: false, message: "Il titolo è obbligatorio." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato per creare una campagna." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Solo GM e Admin possono creare campagne." };
    }

    const hasImageFile = imageFile && imageFile instanceof File && imageFile.size > 0;
    if (hasImageFile) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes((imageFile as File).type)) {
        return {
          success: false,
          message: "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF.",
        };
      }
    }

    const insertPayload = {
      gm_id: user.id,
      name: title,
      description: description || null,
      is_public: isPublic,
      ...(type && { type }),
      is_long_campaign: isLongCampaign,
      player_primer: isLongCampaign ? playerPrimer : null,
      image_url: hasImageFile ? null : (imageUrlFromForm || null),
    };

    const { data: newCampaign, error } = await supabase
      .from("campaigns")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      console.error("[createCampaign]", error);
      return {
        success: false,
        message: error.message ?? "Errore durante la creazione della campagna.",
      };
    }

    if (imageFile && imageFile instanceof File && imageFile.size > 0 && newCampaign?.id) {
      try {
        const fileId = await uploadToTelegram(imageFile);
        const proxyUrl = `/api/tg-image/${fileId}`;
        await supabase
          .from("campaigns")
          .update({ image_url: proxyUrl })
          .eq("id", newCampaign.id);
      } catch (uploadErr) {
        console.error("[createCampaign] Telegram upload", uploadErr);
        return {
          success: false,
          message: uploadErr instanceof Error ? uploadErr.message : "Errore durante il caricamento dell'immagine.",
        };
      }
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Campagna creata!" };
  } catch (err) {
    console.error("[createCampaign]", err);
    return {
      success: false,
      message: "Si è verificato un errore imprevisto. Riprova.",
    };
  }
}
