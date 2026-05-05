"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import { fetchLongCampaignWikiMemoryPromptBlock } from "@/lib/campaign-wiki-ai-memory";
import { buildCampaignContextBlock } from "@/lib/ai/generator";
import {
  generateAiImageWithProvider,
  resolveImageProvider,
  type ImageProviderId,
} from "@/lib/ai/image-provider";
import { uploadToTelegram } from "@/lib/telegram-storage";

const STANDARD_VISUAL_NEGATIVES =
  "NO modern clothing, NO jeans, NO wristwatches, NO cars, NO text, NO watermarks, NO bad anatomy, NO deformed hands, NO cartoon style, NO anime style, NO manga style, NO cel shading, NO chibi";

/** Memoria wiki/ PG molto lunga: per immagini teniamo un estratto compatto così il soggetto resta dominante. */
const MAX_IMAGE_CAMPAIGN_LORE_SNIPPET_CHARS = 3000;

function truncateImageKnowledgeSnippet(raw: string, maxChars: number): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, maxChars)}…`;
}

export type GenerateContextualPortraitResult =
  | { success: true; publicUrl: string; provider: ImageProviderId }
  | { success: false; message: string };

export type GenerateContextualPortraitOptions = {
  /**
   * Provider immagine da usare per questa singola richiesta. Se omesso o non valido,
   * viene applicato il default configurato via env `AI_IMAGE_PROVIDER`.
   */
  provider?: ImageProviderId | string | null;
  /** Titolo della voce wiki (nome PNG, luogo, ecc.) — ancoraggio forte sul soggetto. */
  entityTitle?: string | null;
  /** In campagne long, esclude questa voce dal blocco memoria (evita duplicati in modifica). */
  excludeWikiEntityId?: string | null;
};

/**
 * Ritratto / illustrazione coerente con i paletti visivi della campagna (Fase 3).
 * Carica su Storage pubblico `campaigns/{campaignId}/portraits/`.
 */
export async function generateContextualPortraitAction(
  campaignId: string,
  charDescription: string,
  entityType: "npc" | "location",
  options: GenerateContextualPortraitOptions = {}
): Promise<GenerateContextualPortraitResult> {
  let step = "input-validation";
  const fail = (message: string, details?: unknown): GenerateContextualPortraitResult => {
    const code = `AI-IMG:${step}`;
    if (details) {
      console.error(`[generateContextualPortraitAction][${code}]`, details);
    }
    return { success: false, message: `${message} (${code})` };
  };

  const trimmed = charDescription.trim();
  if (!trimmed) {
    return fail("Inserisci una descrizione per generare l’immagine.");
  }
  if (!campaignId) {
    return fail("Campagna non valida.");
  }

  try {
    step = "auth";
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return fail("Devi essere autenticato.", userError);
    }

    step = "role-check";
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return fail("Solo GM e Admin possono generare immagini AI.");
    }

    step = "admin-client";
    const admin = createSupabaseAdminClient();

    type CampaignVisualRow = {
      ai_context: Json | null;
      image_style_prompt?: string | null;
      ai_image_style_key?: string | null;
      type?: string | null;
    };
    const campaignsQuery = admin.from("campaigns") as unknown as {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string
        ) => { single: () => Promise<{ data: CampaignVisualRow | null; error: { message: string } | null }> };
      };
    };

    step = "campaign-fetch";
    let { data: campaign, error: campError } = await campaignsQuery
      .select("ai_context, image_style_prompt, ai_image_style_key, type")
      .eq("id", campaignId)
      .single();

    // Compatibilità retroattiva: se la colonna nuova non è ancora stata migrata,
    // continuiamo usando solo ai_context.
    if (
      campError?.message?.toLowerCase().includes("image_style_prompt") ||
      campError?.message?.toLowerCase().includes("ai_image_style_key")
    ) {
      step = "campaign-fetch-fallback-style";
      const fallback = await admin
        .from("campaigns")
        .select("ai_context, image_style_prompt, type")
        .eq("id", campaignId)
        .single();
      campaign = fallback.data as CampaignVisualRow | null;
      campError = fallback.error as { message: string } | null;
    }
    if (campError?.message?.toLowerCase().includes("image_style_prompt")) {
      step = "campaign-fetch-fallback-ai-context";
      const fallback = await admin.from("campaigns").select("ai_context, type").eq("id", campaignId).single();
      campaign = (fallback.data as CampaignVisualRow | null) ?? null;
      campError = fallback.error as { message: string } | null;
    }
    if (campError?.message?.toLowerCase().includes("ai_image_style_key")) {
      step = "campaign-fetch-fallback-ai-context";
      const fallback = await admin.from("campaigns").select("ai_context, type").eq("id", campaignId).single();
      campaign = (fallback.data as CampaignVisualRow | null) ?? null;
      campError = fallback.error as { message: string } | null;
    }

    if (campError || !campaign) {
      return fail("Campagna non trovata o non leggibile.", campError);
    }

    const rawAiContext = (campaign.ai_context as Json | null) ?? null;
    const ctx = parseCampaignAiContextFromDb(rawAiContext);
    const legacyStyleTemplate =
      typeof campaign.image_style_prompt === "string" ? campaign.image_style_prompt.trim() : "";
    const styleKey =
      typeof campaign.ai_image_style_key === "string" ? campaign.ai_image_style_key.trim() : "";

    let styleTemplate = "";
    let styleNegativeTemplate = "";

    if (styleKey) {
      step = "style-fetch";
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

    const rawAiObject =
      rawAiContext && typeof rawAiContext === "object" && !Array.isArray(rawAiContext)
        ? (rawAiContext as Record<string, unknown>)
        : null;
    const visualPositive =
      ctx?.visual_positive?.trim() ||
      (typeof rawAiObject?.visual_positive === "string" ? rawAiObject.visual_positive.trim() : "") ||
      "cinematic fantasy, cohesive party tone";
    const visualNegative =
      ctx?.visual_negative?.trim() ||
      (typeof rawAiObject?.visual_negative === "string" ? rawAiObject.visual_negative.trim() : "") ||
      "";

    const technicalForced =
      entityType === "npc"
        ? "portrait, close-up, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy art style"
        : "environmental wide shot, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy location art, architectural and atmosphere focus";

    const campaignType =
      typeof (campaign as CampaignVisualRow).type === "string"
        ? String((campaign as CampaignVisualRow).type).trim()
        : "";
    let loreSnippet = "";
    if (campaignType === "long") {
      const excludeId = options.excludeWikiEntityId?.trim() || undefined;
      const rawMemory = await fetchLongCampaignWikiMemoryPromptBlock(admin, campaignId, {
        excludeEntityId: excludeId,
      });
      if (rawMemory.trim()) {
        loreSnippet = truncateImageKnowledgeSnippet(rawMemory, MAX_IMAGE_CAMPAIGN_LORE_SNIPPET_CHARS);
      }
    }

    const entityTitleLine =
      typeof options.entityTitle === "string" && options.entityTitle.trim().length > 0
        ? `PRIMARY SUBJECT NAME (wiki title): "${options.entityTitle.trim()}". `
        : "";
    const subjectKind =
      entityType === "location"
        ? "single fantasy location / environment"
        : "single fantasy character (NPC or creature portrait)";
    const subjectBlock = [
      `${entityTitleLine}Illustrate exactly ONE ${subjectKind}.`,
      "The following wiki description is the main visual truth — match outfit, species, age cues, scars, props and mood closely:",
      trimmed,
    ].join("\n");

    const campaignNarrativeBlock = buildCampaignContextBlock(ctx);
    const loreBlock =
      loreSnippet.length > 0
        ? [
            "Shared campaign lore (facts, factions, places from canon wiki/PG backgrounds — use only for coherence;",
            "do not contradict the wiki description above for how THIS entity looks):",
            loreSnippet,
          ].join("\n")
        : "";

    const styleTail = styleTemplate
      ? `${styleTemplate}. Campaign visual palette: ${visualPositive}. Strictly realistic fantasy illustration, non-anime, non-cartoon.`
      : [
          technicalForced,
          `Campaign visual palette: ${visualPositive}`,
          "Strictly realistic fantasy illustration, non-anime, non-cartoon",
        ].join(". ");

    const positivePrompt = [subjectBlock, campaignNarrativeBlock, loreBlock, styleTail]
      .filter((block) => typeof block === "string" && block.trim().length > 0)
      .join("\n\n");

    const negativeCombined = [styleNegativeTemplate, visualNegative, STANDARD_VISUAL_NEGATIVES]
      .filter(Boolean)
      .join(", ");
    const strictNegativePrompt = `STRICTLY FORBIDDEN: ${negativeCombined}`;

    const provider = resolveImageProvider(options.provider ?? null);
    let buffer: Buffer;
    step = `image-generation:${provider}`;
    try {
      buffer = await generateAiImageWithProvider(provider, positivePrompt, strictNegativePrompt);
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Errore durante la generazione dell’immagine.";
      return fail(msg, e);
    }

    step = "telegram-upload";
    const bytes = new Uint8Array(buffer);
    const file = new File([bytes], `${entityType}.png`, { type: "image/png" });
    const fileId = await uploadToTelegram(file, `${campaignId}:${entityType}`, "photo");
    const publicUrl = `/api/tg-image/${encodeURIComponent(fileId)}`;

    step = "revalidate";
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, publicUrl, provider };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Si è verificato un errore imprevisto. Riprova.", err);
  }
}
