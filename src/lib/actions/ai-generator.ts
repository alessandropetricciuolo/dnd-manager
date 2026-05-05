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

/** Per mostri wiki: evita crop tipo ritratto. */
const MONSTER_FULL_BODY_NEGATIVE_HINT =
  "cropped torso, bust-only shot, shoulders-up framing, face-only portrait, tight facial close-up, head-and-shoulders only composition";

/** Memoria wiki/ PG molto lunga: per immagini teniamo un estratto compatto così il soggetto resta dominante. */
const MAX_IMAGE_CAMPAIGN_LORE_SNIPPET_CHARS = 3000;

/** Sotto questa lunghezza il lore tende a “rubare” il soggetto ai modelli diffusion — meglio non caricarlo. */
const SKIP_CAMPAIGN_LORE_NPC_MAX_CHARS = 90;

function truncateImageKnowledgeSnippet(raw: string, maxChars: number): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, maxChars)}…`;
}

/**
 * Molti modelli immagine seguono meglio l’inglese sulle specie D&D; il contesto italiano resta nella prima riga.
 */
function augmentSpeciesAnchorsForCreatureImage(description: string, kind: "npc" | "monster"): string {
  const d = description.trim();
  if (!d) return d;
  const anchors: string[] = [];
  if (/\bcobold\w*|\bkobold\w*/i.test(d)) {
    anchors.push(
      "KOBOLD (D&D): small reptilian draconic humanoid, scaled skin, snouted reptile face, yellow or amber eyes possible — NOT an elf, NOT a human, NOT a dwarf, NOT an elderly bard unless the Italian description explicitly says so."
    );
  }
  if (/\bgoblin\b|\bgoblins\b/i.test(d)) {
    anchors.push("GOBLIN (D&D): small humanoid goblinoid — NOT an elf.");
  }
  if (/\borco\b|\borchi\b|\borc\b|\borcs\b/i.test(d)) {
    anchors.push("ORC (D&D): muscular fantasy humanoid with tusks — NOT an elf.");
  }
  if (/\bgnoll\b|\bgnolls\b/i.test(d)) {
    anchors.push("GNOLL (D&D): hyena-like humanoid.");
  }
  if (!anchors.length) return d;
  const framingLabel =
    kind === "monster" ? "full-body creature illustration" : "character portrait";
  return `${d}\n\nMandatory species / silhouette for this ${framingLabel} (English keywords — obey strictly; overrides unrelated faces from campaign lore text): ${anchors.join(" | ")}`;
}

function maxLoreCharsForDescription(descriptionLength: number): number {
  if (descriptionLength < 120) return 700;
  if (descriptionLength < 280) return 1400;
  if (descriptionLength < 550) return 2200;
  return MAX_IMAGE_CAMPAIGN_LORE_SNIPPET_CHARS;
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
export type WikiImageEntityKind = "npc" | "location" | "monster";

export async function generateContextualPortraitAction(
  campaignId: string,
  charDescription: string,
  entityType: WikiImageEntityKind,
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
      entityType === "location"
        ? "environmental wide shot, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy location art, architectural and atmosphere focus"
        : entityType === "monster"
          ? "full-body illustration of ONE fantasy monster or creature, entire figure visible from head to lowest limbs or tail tip inside the frame, wide camera framing pulled back, feet or claws touching visible ground, neutral unobtrusive fantasy backdrop, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy creature art — NOT a portrait crop, NOT bust-only, NOT face-only close-up"
          : "portrait, close-up, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy art style";

    const campaignType =
      typeof (campaign as CampaignVisualRow).type === "string"
        ? String((campaign as CampaignVisualRow).type).trim()
        : "";
    const skipLoreForNpcFocus =
      (entityType === "npc" || entityType === "monster") &&
      trimmed.length <= SKIP_CAMPAIGN_LORE_NPC_MAX_CHARS;

    let loreSnippet = "";
    if (campaignType === "long" && !skipLoreForNpcFocus) {
      const excludeId = options.excludeWikiEntityId?.trim() || undefined;
      const rawMemory = await fetchLongCampaignWikiMemoryPromptBlock(admin, campaignId, {
        excludeEntityId: excludeId,
      });
      if (rawMemory.trim()) {
        const cap = maxLoreCharsForDescription(trimmed.length);
        loreSnippet = truncateImageKnowledgeSnippet(rawMemory, cap);
      }
    }

    const entityTitleLine =
      typeof options.entityTitle === "string" && options.entityTitle.trim().length > 0
        ? `PRIMARY SUBJECT NAME (wiki title): "${options.entityTitle.trim()}". `
        : "";
    const subjectKind =
      entityType === "location"
        ? "single fantasy location / environment"
        : entityType === "monster"
          ? "single fantasy monster / creature (FULL BODY must appear in frame)"
          : "single fantasy character (NPC portrait)";
    const descriptionAnchored =
      entityType === "npc" || entityType === "monster"
        ? augmentSpeciesAnchorsForCreatureImage(trimmed, entityType === "monster" ? "monster" : "npc")
        : trimmed;
    const framingHint =
      entityType === "monster"
        ? "Framing rule — ALWAYS full-length shot: show the whole creature; no cropped torso or portrait framing."
        : null;
    const subjectBlock = [
      `${entityTitleLine}Illustrate exactly ONE ${subjectKind}.`,
      framingHint,
      "The following wiki description is the main visual truth — match species, body shape, outfit, age cues, scars, props and mood closely:",
      descriptionAnchored,
    ]
      .filter(Boolean)
      .join("\n");

    const campaignNarrativeBlock = buildCampaignContextBlock(ctx);
    const loreBlock =
      loreSnippet.length > 0
        ? [
            "Shared campaign lore (facts, factions, places — ONLY mood / era / faction flavor.",
            "Do NOT copy faces or species from lore unless they match the wiki description above.",
            "Never replace the subject with a different character from lore.",
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

    const subjectLockClosing = [
      "---",
      `FINAL CHECK — Exactly one subject. Appearance MUST match this phrase (literal identity): "${trimmed}".`,
      entityType === "monster"
        ? "MONSTER FRAMING — Full body only: head-to-toe (or full silhouette including tail) visible; do not output bust or facial close-up."
        : null,
      "If campaign lore mentions other named characters, IGNORE their faces/species for this image.",
    ]
      .filter(Boolean)
      .join("\n");

    const positivePrompt = [subjectBlock, campaignNarrativeBlock, loreBlock, styleTail, subjectLockClosing]
      .filter((block) => typeof block === "string" && block.trim().length > 0)
      .join("\n\n");

    const negativeCombined = [
      styleNegativeTemplate,
      visualNegative,
      STANDARD_VISUAL_NEGATIVES,
      entityType === "monster" ? MONSTER_FULL_BODY_NEGATIVE_HINT : "",
    ]
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
