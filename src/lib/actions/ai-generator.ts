"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { Json } from "@/types/database.types";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import { generateAiImage, HuggingFaceInferenceError } from "@/lib/ai/huggingface-client";

const CAMPAIGNS_BUCKET = "campaigns";

const STANDARD_VISUAL_NEGATIVES =
  "NO modern clothing, NO jeans, NO wristwatches, NO cars, NO text, NO watermarks, NO bad anatomy, NO deformed hands, NO cartoon style";

export type GenerateContextualPortraitResult =
  | { success: true; publicUrl: string }
  | { success: false; message: string };

/**
 * Ritratto / illustrazione coerente con i paletti visivi della campagna (Fase 3).
 * Carica su Storage pubblico `campaigns/{campaignId}/portraits/`.
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

    const fileName = `${campaignId}/portraits/${Date.now()}-${entityType}.png`;
    const { error: uploadError } = await supabase.storage
      .from(CAMPAIGNS_BUCKET)
      .upload(fileName, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Errore Supabase Upload: ${uploadError.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(CAMPAIGNS_BUCKET).getPublicUrl(fileName);
    if (!publicUrl) {
      return { success: false, message: "Impossibile ottenere l’URL pubblico dell’immagine." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, publicUrl };
  } catch (err) {
    console.error("[generateContextualPortraitAction]", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Si è verificato un errore imprevisto. Riprova.",
    };
  }
}
