import type { ImagePromptBuildResult, WikiImageEntityKind } from "@/lib/ai/image-prompt-builder";
import { estimatePromptTokens, type PromptTokenStats } from "@/lib/ai/prompt-token-estimate";

/** Modello OpenRouter usato per tutte le generazioni immagine del sito. */
export const SITE_IMAGE_MODEL = "openai/gpt-5-image-mini";

export const DEFAULT_OPENROUTER_IMAGE_MODEL = SITE_IMAGE_MODEL;

export function getSiteImageModel(): string {
  const env = process.env.AI_IMAGE_MODEL?.trim();
  return env || SITE_IMAGE_MODEL;
}

export function getDefaultImageAspectRatioForEntity(entityType: WikiImageEntityKind): string {
  return entityType === "location" ? "16:9" : "1:1";
}

export const OPENROUTER_IMAGE_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4"] as const;

export type OpenRouterImageRequestPayload = {
  model: string;
  messages: Array<{ role: "user"; content: string }>;
  modalities: Array<"image" | "text">;
  image_config: { aspect_ratio: string };
  stream: false;
};

export function buildOpenRouterImageUserContent(
  positivePrompt: string,
  strictNegativePrompt?: string
): string {
  const parts = [positivePrompt.trim()];
  if (strictNegativePrompt?.trim()) {
    parts.push(strictNegativePrompt.trim());
  }
  return parts.join("\n\n");
}

export function buildOpenRouterImageRequestPayload(
  positivePrompt: string,
  strictNegativePrompt: string,
  model: string,
  aspectRatio: string
): OpenRouterImageRequestPayload {
  return {
    model,
    messages: [{ role: "user", content: buildOpenRouterImageUserContent(positivePrompt, strictNegativePrompt) }],
    modalities: ["image"],
    image_config: { aspect_ratio: aspectRatio },
    stream: false,
  };
}

export function getOpenRouterPayloadForPreview(
  result: ImagePromptBuildResult,
  options: { model: string; aspectRatio: string }
): { label: string; text: string; stats: PromptTokenStats; payload: OpenRouterImageRequestPayload } {
  const payload = buildOpenRouterImageRequestPayload(
    result.positivePrompt,
    result.strictNegativePrompt,
    options.model,
    options.aspectRatio
  );
  const text = JSON.stringify(payload, null, 2);
  return {
    label: `OpenRouter POST /v1/chat/completions (${options.model})`,
    text,
    stats: estimatePromptTokens(payload.messages[0]?.content ?? ""),
    payload,
  };
}
