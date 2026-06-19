import type { Json } from "@/types/database.types";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import { buildCampaignVisualContextBlock } from "@/lib/ai/generator";
import {
  buildEntityReferencesPromptBlock,
  buildEntityReferenceSkipReason,
  resolveImagePromptEntityReferences,
} from "@/lib/ai/image-prompt-entity-memory";
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
    matchedEntityNames: string[];
    matchedEntityReferences: string[];
    memorySourceCounts: { wiki: number; maps: number; characters: number };
    userDescription: string;
    descriptionAnchored: string;
  };
  totals: {
    positive: PromptTokenStats;
    negative: PromptTokenStats;
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

function augmentSpeciesAnchorsForCreatureImage(description: string, kind: "npc" | "monster"): string {
  const d = description.trim();
  if (!d) return d;
  const anchors: string[] = [];
  if (/\bcobold\w*|\bkobold\w*/i.test(d)) {
    anchors.push(
      "KOBOLD (D&D): small reptilian draconic humanoid, scaled skin, snouted reptile face, yellow or amber eyes possible — NOT an elf, NOT a human, NOT a dwarf."
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
  const framingLabel = kind === "monster" ? "full-body creature" : "character portrait";
  return `${d}\nSpecies anchors (${framingLabel}): ${anchors.join(" | ")}`;
}

function normalizeNegativeKey(fragment: string): string {
  return fragment
    .trim()
    .toLowerCase()
    .replace(/^no\s+/i, "")
    .replace(/\s+/g, " ");
}

/** Unisce frammenti negative evitando duplicati (es. «jeans» vs «NO jeans»). */
export function dedupeNegativePromptFragments(...parts: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    for (const raw of part.split(",")) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = normalizeNegativeKey(trimmed);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out.join(", ");
}

function section(id: string, label: string, text: string): ImagePromptSection {
  return { id, label, text, stats: estimatePromptTokens(text) };
}

function buildTechnicalStyleLine(entityType: WikiImageEntityKind): string {
  if (entityType === "location") {
    return "environmental wide shot, high detail, photorealistic, cinematic lighting, fantasy location art";
  }
  if (entityType === "monster") {
    return "full-body fantasy creature illustration, entire figure visible, photorealistic, cinematic lighting";
  }
  return "portrait, close-up, high detail, photorealistic, cinematic lighting, professional fantasy art";
}

function buildEntitySearchHaystack(description: string, entityTitle?: string | null): string {
  const parts = [description.trim()];
  const title = typeof entityTitle === "string" ? entityTitle.trim() : "";
  if (title) parts.push(title);
  return parts.filter(Boolean).join("\n");
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
  const campaignType =
    typeof campaign.type === "string" ? String(campaign.type).trim() : "";

  const searchHaystack = buildEntitySearchHaystack(trimmed, params.entityTitle);
  let loreBlock = "";
  let loreSkipReason: string | null = null;
  let matchedEntityNames: string[] = [];
  let matchedEntityReferences: string[] = [];
  let memorySourceCounts = { wiki: 0, maps: 0, characters: 0 };

  if (campaignType !== "long") {
    loreSkipReason = "Campagna non long — memoria wiki non inclusa.";
  } else {
    const diagnostics = await resolveImagePromptEntityReferences(admin, params.campaignId, {
      searchText: searchHaystack,
      excludeEntityId: params.excludeWikiEntityId?.trim() || undefined,
    });
    matchedEntityNames = diagnostics.references.map((r) => r.name);
    matchedEntityReferences = diagnostics.references.map((r) => r.referenceLine);
    memorySourceCounts = {
      wiki: diagnostics.wikiMemoryCount,
      maps: diagnostics.mapCount,
      characters: diagnostics.characterCount,
    };
    loreBlock = buildEntityReferencesPromptBlock(diagnostics.references);
    if (!loreBlock) {
      loreSkipReason = buildEntityReferenceSkipReason(diagnostics);
    }
  }

  const descriptionAnchored =
    entityType === "npc" || entityType === "monster"
      ? augmentSpeciesAnchorsForCreatureImage(trimmed, entityType === "monster" ? "monster" : "npc")
      : trimmed;

  const subjectBlock = descriptionAnchored;
  const campaignVisualBlock = buildCampaignVisualContextBlock(ctx);

  const technicalLine = buildTechnicalStyleLine(entityType);
  const styleTail = styleTemplate
    ? `${styleTemplate}. ${technicalLine}. Photorealistic fantasy, non-anime, non-cartoon.`
    : `${technicalLine}. Photorealistic fantasy, non-anime, non-cartoon.`;

  const positivePrompt = [subjectBlock, campaignVisualBlock, loreBlock, styleTail]
    .filter((block) => typeof block === "string" && block.trim().length > 0)
    .join("\n\n");

  const negativeCombined = dedupeNegativePromptFragments(
    styleNegativeTemplate,
    visualNegative,
    STANDARD_VISUAL_NEGATIVES,
    entityType === "monster" ? MONSTER_FULL_BODY_NEGATIVE_HINT : ""
  );
  const strictNegativePrompt = negativeCombined ? `STRICTLY FORBIDDEN: ${negativeCombined}` : "";

  const sections: ImagePromptSection[] = [
    section("subject", "Soggetto (descrizione wiki)", subjectBlock),
    section("paletti", "Contesto visivo campagna", campaignVisualBlock),
  ];

  if (loreBlock) {
    sections.push(section("memory", "Memoria IA (entità citate)", loreBlock));
  } else if (loreSkipReason) {
    sections.push(section("memory-skipped", "Memoria IA (nessun match)", loreSkipReason));
  }

  sections.push(
    section("style", "Stile tecnico", styleTail),
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
      matchedEntityNames,
      matchedEntityReferences,
      memorySourceCounts,
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
