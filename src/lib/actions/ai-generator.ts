"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
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
    const admin = createSupabaseAdminClient();

    type CampaignVisualRow = {
      ai_context: Json | null;
      image_style_prompt?: string | null;
      ai_image_style_key?: string | null;
    };
    const campaignsQuery = admin.from("campaigns") as unknown as {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string
        ) => { single: () => Promise<{ data: CampaignVisualRow | null; error: { message: string } | null }> };
      };
    };

    let { data: campaign, error: campError } = await campaignsQuery
      .select("ai_context, image_style_prompt, ai_image_style_key")
      .eq("id", campaignId)
      .single();

    // Compatibilità retroattiva: se la colonna nuova non è ancora stata migrata,
    // continuiamo usando solo ai_context.
    if (
      campError?.message?.toLowerCase().includes("image_style_prompt") ||
      campError?.message?.toLowerCase().includes("ai_image_style_key")
    ) {
      const fallback = await admin
        .from("campaigns")
        .select("ai_context, image_style_prompt")
        .eq("id", campaignId)
        .single();
      campaign = fallback.data as CampaignVisualRow | null;
      campError = fallback.error as { message: string } | null;
    }

    if (campError || !campaign) {
      console.error("[generateContextualPortraitAction] campaign fetch", campError);
      return { success: false, message: "Campagna non trovata o accesso negato." };
    }

    const ctx = parseCampaignAiContextFromDb((campaign.ai_context as Json | null) ?? null);
    const legacyStyleTemplate =
      typeof campaign.image_style_prompt === "string" ? campaign.image_style_prompt.trim() : "";
    const styleKey =
      typeof campaign.ai_image_style_key === "string" ? campaign.ai_image_style_key.trim() : "";

    let styleTemplate = "";
    let styleNegativeTemplate = "";

    if (styleKey) {
      const { data: styleRowRaw } = await admin
        .from("ai_image_styles")
        .select("positive_prompt, negative_prompt, is_active")
        .eq("key", styleKey)
        .single();
      const styleRow = styleRowRaw as
        | { positive_prompt: string | null; negative_prompt: string | null; is_active: boolean }
        | null;
      if (styleRow?.is_active) {
        styleTemplate = styleRow.positive_prompt?.trim() ?? "";
        styleNegativeTemplate = styleRow.negative_prompt?.trim() ?? "";
      }
    }

    if (!styleTemplate && legacyStyleTemplate) {
      styleTemplate = legacyStyleTemplate;
    }

    const visualPositive = ctx?.visual_positive?.trim() || "cinematic fantasy, cohesive party tone";
    const visualNegative = ctx?.visual_negative?.trim() || "";

    const technicalForced =
      entityType === "npc"
        ? "portrait, close-up, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy art style"
        : "environmental wide shot, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy location art, architectural and atmosphere focus";

    const positivePrompt = styleTemplate
      ? `${trimmed}. ${styleTemplate}. Campaign constraints: ${visualPositive}`
      : [`Subject: ${trimmed}`, technicalForced, `Campaign visual style: ${visualPositive}`].join(". ");

    const negativeCombined = [styleNegativeTemplate, visualNegative, STANDARD_VISUAL_NEGATIVES]
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
