import type { Json } from "@/types/database.types";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import { fetchLongCampaignWikiMemoryPromptBlock } from "@/lib/campaign-wiki-ai-memory";
import { buildCampaignContextBlock } from "@/lib/ai/generator";
import {
  estimatePromptTokens,
  formatHuggingFaceImageInputs,
  mergeStats,
  type PromptTokenStats,
} from "@/lib/ai/prompt-token-estimate";
import type { ImageProviderId } from "@/lib/ai/image-provider";

export const STANDARD_VISUAL_NEGATIVES =
  "NO modern clothing, NO jeans, NO wristwatches, NO cars, NO text, NO watermarks, NO bad anatomy, NO deformed hands, NO cartoon style, NO anime style, NO manga style, NO cel shading, NO chibi";

export const MONSTER_FULL_BODY_NEGATIVE_HINT =
  "cropped torso, bust-only shot, shoulders-up framing, face-only portrait, tight facial close-up, head-and-shoulders only composition";

const MAX_IMAGE_CAMPAIGN_LORE_SNIPPET_CHARS = 3000;
const SKIP_CAMPAIGN_LORE_NPC_MAX_CHARS = 90;

export type WikiImageEntityKind = "npc" | "location" | "monster";

export type ImagePromptSection = {
  id: string;
  label: string;
  text: string;
  stats: PromptTokenStats;
};

export type ImagePromptBuildResult = {
  sections: ImagePromptSection[];
  positivePrompt: string;
  strictNegativePrompt: string;
  negativeCombined: string;
  providerPayloads: {
    huggingface: { inputs: string; stats: PromptTokenStats };
    siliconflow: {
      prompt: string;
      negativePrompt: string;
      stats: PromptTokenStats;
    };
  };
  meta: {
    campaignType: string;
    entityType: WikiImageEntityKind;
    visualPositive: string;
    visualNegative: string;
    styleKey: string | null;
    styleTemplate: string;
    styleNegativeTemplate: string;
    loreIncluded: boolean;
    loreSkipReason: string | null;
    rawLoreMemoryChars: number;
    loreTruncatedToChars: number | null;
    userDescription: string;
    descriptionAnchored: string;
  };
  totals: {
    positive: PromptTokenStats;
    negative: PromptTokenStats;
    /** Output immagine: nessun token testo generato dal modello diffusion. */
    outputTextTokens: 0;
  };
};

type AdminClient = ReturnType<typeof import("@/utils/supabase/admin").createSupabaseAdminClient>;

type CampaignVisualRow = {
  ai_context: Json | null;
  image_style_prompt?: string | null;
  ai_image_style_key?: string | null;
  type?: string | null;
};

function truncateImageKnowledgeSnippet(raw: string, maxChars: number): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxChars) return collapsed;
  return `${collapsed.slice(0, maxChars)}…`;
}

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
  const framingLabel = kind === "monster" ? "full-body creature illustration" : "character portrait";
  return `${d}\n\nMandatory species / silhouette for this ${framingLabel} (English keywords — obey strictly; overrides unrelated faces from campaign lore text): ${anchors.join(" | ")}`;
}

function maxLoreCharsForDescription(descriptionLength: number): number {
  if (descriptionLength < 120) return 700;
  if (descriptionLength < 280) return 1400;
  if (descriptionLength < 550) return 2200;
  return MAX_IMAGE_CAMPAIGN_LORE_SNIPPET_CHARS;
}

function section(id: string, label: string, text: string): ImagePromptSection {
  return { id, label, text, stats: estimatePromptTokens(text) };
}

async function fetchCampaignVisualRow(
  admin: AdminClient,
  campaignId: string
): Promise<{ campaign: CampaignVisualRow | null; error: string | null }> {
  let campaign: CampaignVisualRow | null = null;
  let campError: { message: string } | null = null;

  const primary = await admin
    .from("campaigns")
    .select("ai_context, image_style_prompt, ai_image_style_key, type")
    .eq("id", campaignId)
    .single();
  campaign = (primary.data as CampaignVisualRow | null) ?? null;
  campError = primary.error as { message: string } | null;

  const errMsg = campError?.message?.toLowerCase() ?? "";
  if (errMsg.includes("image_style_prompt") || errMsg.includes("ai_image_style_key")) {
    const fallback = await admin
      .from("campaigns")
      .select("ai_context, image_style_prompt, type")
      .eq("id", campaignId)
      .single();
    campaign = (fallback.data as CampaignVisualRow | null) ?? null;
    campError = fallback.error as { message: string } | null;
  }
  if (campError?.message?.toLowerCase().includes("image_style_prompt")) {
    const fallback = await admin.from("campaigns").select("ai_context, type").eq("id", campaignId).single();
    campaign = (fallback.data as CampaignVisualRow | null) ?? null;
    campError = fallback.error as { message: string } | null;
  }
  if (campError?.message?.toLowerCase().includes("ai_image_style_key")) {
    const fallback = await admin.from("campaigns").select("ai_context, type").eq("id", campaignId).single();
    campaign = (fallback.data as CampaignVisualRow | null) ?? null;
    campError = fallback.error as { message: string } | null;
  }

  if (campError || !campaign) {
    return { campaign: null, error: campError?.message ?? "Campagna non trovata." };
  }
  return { campaign, error: null };
}

export type BuildContextualImagePromptParams = {
  campaignId: string;
  charDescription: string;
  entityType: WikiImageEntityKind;
  entityTitle?: string | null;
  excludeWikiEntityId?: string | null;
  /** Benchmark: include sempre memoria wiki/PG anche con descrizioni brevi. */
  forceIncludeCampaignMemory?: boolean;
};

/**
 * Assembla i prompt immagine esattamente come {@link generateContextualPortraitAction},
 * con breakdown per sezione e stime token.
 */
export async function buildContextualImagePrompts(
  admin: AdminClient,
  params: BuildContextualImagePromptParams
): Promise<ImagePromptBuildResult | { error: string }> {
  const trimmed = params.charDescription.trim();
  if (!trimmed) return { error: "Inserisci una descrizione." };
  if (!params.campaignId) return { error: "Campagna non valida." };

  const { campaign, error: campError } = await fetchCampaignVisualRow(admin, params.campaignId);
  if (!campaign || campError) return { error: campError ?? "Campagna non trovata." };

  const rawAiContext = (campaign.ai_context as Json | null) ?? null;
  const ctx = parseCampaignAiContextFromDb(rawAiContext);
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

  const entityType = params.entityType;
  const technicalForced =
    entityType === "location"
      ? "environmental wide shot, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy location art, architectural and atmosphere focus"
      : entityType === "monster"
        ? "full-body illustration of ONE fantasy monster or creature, entire figure visible from head to lowest limbs or tail tip inside the frame, wide camera framing pulled back, feet or claws touching visible ground, neutral unobtrusive fantasy backdrop, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy creature art — NOT a portrait crop, NOT bust-only, NOT face-only close-up"
        : "portrait, close-up, high detail, photorealistic, cinematic lighting, 8k, masterpiece, professional fantasy art style";

  const campaignType =
    typeof campaign.type === "string" ? String(campaign.type).trim() : "";
  const skipLoreForNpcFocus =
    !params.forceIncludeCampaignMemory &&
    (entityType === "npc" || entityType === "monster") &&
    trimmed.length <= SKIP_CAMPAIGN_LORE_NPC_MAX_CHARS;

  let loreSnippet = "";
  let rawLoreMemory = "";
  let loreTruncatedToChars: number | null = null;
  let loreSkipReason: string | null = null;

  if (campaignType !== "long") {
    loreSkipReason = "Campagna non long — memoria wiki non inclusa.";
  } else if (skipLoreForNpcFocus) {
    loreSkipReason = `Descrizione breve (≤${SKIP_CAMPAIGN_LORE_NPC_MAX_CHARS} car.) — lore escluso per mantenere focus sul soggetto.`;
  } else {
    rawLoreMemory = await fetchLongCampaignWikiMemoryPromptBlock(admin, params.campaignId, {
      excludeEntityId: params.excludeWikiEntityId?.trim() || undefined,
    });
    if (!rawLoreMemory.trim()) {
      loreSkipReason = "Nessuna voce wiki/background PG con memoria IA attiva.";
    } else {
      const cap = maxLoreCharsForDescription(trimmed.length);
      loreSnippet = truncateImageKnowledgeSnippet(rawLoreMemory, cap);
      if (rawLoreMemory.length > cap) {
        loreTruncatedToChars = cap;
      }
    }
  }

  const entityTitleLine =
    typeof params.entityTitle === "string" && params.entityTitle.trim().length > 0
      ? `PRIMARY SUBJECT NAME (wiki title): "${params.entityTitle.trim()}". `
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

  const sections: ImagePromptSection[] = [
    section("user", "Descrizione utente (input)", trimmed),
    section("subject", "Blocco soggetto", subjectBlock),
    section("paletti", "Paletti campagna (Architetto)", campaignNarrativeBlock),
  ];

  if (loreBlock) {
    sections.push(section("memory", "Memoria IA campagna (wiki + PG)", loreBlock));
  } else if (rawLoreMemory && loreSkipReason?.includes("breve")) {
    sections.push(
      section(
        "memory-skipped",
        "Memoria IA (esclusa)",
        `[Esclusa] ${loreSkipReason}\n\nAnteprima memoria non troncata (${rawLoreMemory.length} car.):\n${rawLoreMemory.slice(0, 1200)}${rawLoreMemory.length > 1200 ? "…" : ""}`
      )
    );
  } else if (loreSkipReason) {
    sections.push(section("memory-skipped", "Memoria IA (esclusa)", loreSkipReason));
  }

  sections.push(
    section("style", "Stile visivo + palette", styleTail),
    section("lock", "Verifica finale soggetto", subjectLockClosing),
    section("negative", "Negative prompt", strictNegativePrompt)
  );

  const hfInputs = formatHuggingFaceImageInputs(positivePrompt, strictNegativePrompt);
  const sfStats = mergeStats([
    estimatePromptTokens(positivePrompt),
    estimatePromptTokens(strictNegativePrompt),
  ]);

  return {
    sections,
    positivePrompt,
    strictNegativePrompt,
    negativeCombined,
    providerPayloads: {
      huggingface: { inputs: hfInputs, stats: estimatePromptTokens(hfInputs) },
      siliconflow: {
        prompt: positivePrompt,
        negativePrompt: strictNegativePrompt,
        stats: sfStats,
      },
    },
    meta: {
      campaignType,
      entityType,
      visualPositive,
      visualNegative,
      styleKey: styleKey || null,
      styleTemplate,
      styleNegativeTemplate,
      loreIncluded: loreBlock.length > 0,
      loreSkipReason: loreBlock.length > 0 ? null : loreSkipReason,
      rawLoreMemoryChars: rawLoreMemory.length,
      loreTruncatedToChars,
      userDescription: trimmed,
      descriptionAnchored,
    },
    totals: {
      positive: estimatePromptTokens(positivePrompt),
      negative: estimatePromptTokens(strictNegativePrompt),
      outputTextTokens: 0,
    },
  };
}

export function getProviderPayloadForPreview(
  provider: ImageProviderId,
  result: ImagePromptBuildResult
): { label: string; text: string; stats: PromptTokenStats } {
  if (provider === "siliconflow") {
    const { prompt, negativePrompt, stats } = result.providerPayloads.siliconflow;
    return {
      label: "SiliconFlow (prompt + negative_prompt separati)",
      text: `--- prompt ---\n${prompt}\n\n--- negative_prompt ---\n${negativePrompt}`,
      stats,
    };
  }
  const { inputs, stats } = result.providerPayloads.huggingface;
  return {
    label: "Hugging Face FLUX (inputs unificato)",
    text: inputs,
    stats,
  };
}
