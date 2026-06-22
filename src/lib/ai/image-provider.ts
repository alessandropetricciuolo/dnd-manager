/**
 * Generazione immagini del sito via OpenRouter.
 * Modello di default: `openai/gpt-5-image-mini` (override con env `AI_IMAGE_MODEL`).
 */

import type { WikiImageEntityKind } from "@/lib/ai/image-prompt-builder";
import {
  buildOpenRouterImageUserContent,
  getDefaultImageAspectRatioForEntity,
  getSiteImageModel,
} from "@/lib/ai/openrouter-image-preview";
import {
  generateImageWithOpenRouter,
  openRouterImageOutputToBuffer,
} from "@/lib/image-benchmark/providers/openrouter-provider";

export async function generateSiteImage(
  positivePrompt: string,
  negativePrompt: string,
  options?: { aspectRatio?: string; model?: string }
): Promise<Buffer> {
  const prompt = buildOpenRouterImageUserContent(positivePrompt, negativePrompt);
  const result = await generateImageWithOpenRouter({
    model: options?.model ?? getSiteImageModel(),
    prompt,
    aspectRatio: options?.aspectRatio ?? "1:1",
  });
  return openRouterImageOutputToBuffer(result);
}

export async function generateSiteImageForEntity(
  positivePrompt: string,
  negativePrompt: string,
  entityType: WikiImageEntityKind
): Promise<Buffer> {
  return generateSiteImage(positivePrompt, negativePrompt, {
    aspectRatio: getDefaultImageAspectRatioForEntity(entityType),
  });
}

export async function generateSiteImageRefinement(
  instructionText: string,
  referenceImageDataUrl: string,
  entityType: WikiImageEntityKind,
  options?: { model?: string }
): Promise<Buffer> {
  const result = await generateImageWithOpenRouter({
    model: options?.model ?? getSiteImageModel(),
    prompt: instructionText,
    aspectRatio: getDefaultImageAspectRatioForEntity(entityType),
    multimodalContent: [
      { type: "image_url", image_url: { url: referenceImageDataUrl } },
      { type: "text", text: instructionText },
    ],
  });
  return openRouterImageOutputToBuffer(result);
}
