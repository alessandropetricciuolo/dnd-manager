"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { Json } from "@/types/database.types";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import { generateAiImage, HuggingFaceInferenceError } from "@/lib/ai/huggingface-client";

const CAMPAIGN_ASSETS_BUCKET = "campaign-assets";

const STANDARD_VISUAL_NEGATIVES =
  "NO modern clothing, NO jeans, NO wristwatches, NO cars, NO text, NO watermarks, NO bad anatomy, NO deformed hands, NO cartoon style";

export type GenerateContextualPortraitResult =
  | { success: true; publicUrl: string }
  | { success: false; message: string };

function bufferImageKind(buf: Buffer): { ext: string; contentType: string } {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ext: "png", contentType: "image/png" };
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (buf.length >= 6 && buf.toString("ascii", 0, 6) === "GIF87a") {
    return { ext: "gif", contentType: "image/gif" };
  }
  if (buf.length >= 6 && buf.toString("ascii", 0, 6) === "GIF89a") {
    return { ext: "gif", contentType: "image/gif" };
  }
  return { ext: "png", contentType: "image/png" };
}

/**
 * Ritratto / illustrazione coerente con i paletti visivi della campagna (Fase 3).
 * Carica su Storage pubblico `campaign-assets/campaigns/{id}/portraits/`.
 */
export async function generateContextualPortraitAction(
  campaignId: string,
  charDescription: string,
  entityType: "npc" | "location"
): Promise<GenerateContextualPortraitResult> {
  const trimmed = charDescription.trim();
  if (!trimmed) {
    return { success: false, message: "Inserisci una descrizione per generare l’immagine." };
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
      return { success: false, message: "Solo GM e Admin possono generare immagini AI." };
    }

    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("ai_context")
      .eq("id", campaignId)
      .single();

    if (campError || !campaign) {
      return { success: false, message: "Campagna non trovata o accesso negato." };
    }

    const ctx = parseCampaignAiContextFromDb((campaign.ai_context as Json | null) ?? null);
    const visualPositive = ctx?.visual_positive?.trim() || "cinematic fantasy, cohesive party tone";
    const visualNegative = ctx?.visual_negative?.trim() || "";

    const technicalForced =
      entityType === "npc"
        ? "portrait, close-up, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy art style"
        : "environmental wide shot, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy location art, architectural and atmosphere focus";

    const subjectLine = `Subject: ${trimmed}`;
    const styleLine = `Campaign visual style: ${visualPositive}`;

    const positivePrompt = [subjectLine, technicalForced, styleLine].join(". ");

    const negativeCombined = [visualNegative, STANDARD_VISUAL_NEGATIVES]
      .filter(Boolean)
      .join(", ");

    let buffer: Buffer;
    try {
      buffer = await generateAiImage(positivePrompt, negativeCombined);
    } catch (e) {
      const msg =
        e instanceof HuggingFaceInferenceError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Errore durante la generazione dell’immagine.";
      return { success: false, message: msg };
    }

    const { ext, contentType } = bufferImageKind(buffer);
    const fileName = `${randomUUID()}.${ext}`;
    const storagePath = `campaigns/${campaignId}/portraits/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(CAMPAIGN_ASSETS_BUCKET)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[generateContextualPortraitAction] upload", uploadError);
      return {
        success: false,
        message: uploadError.message ?? "Errore nel caricamento su Storage. Verifica il bucket campaign-assets.",
      };
    }

    const { data: pub } = supabase.storage.from(CAMPAIGN_ASSETS_BUCKET).getPublicUrl(storagePath);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      return { success: false, message: "Impossibile ottenere l’URL pubblico dell’immagine." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, publicUrl };
  } catch (err) {
    console.error("[generateContextualPortraitAction]", err);
    return { success: false, message: "Si è verificato un errore imprevisto. Riprova." };
  }
}
