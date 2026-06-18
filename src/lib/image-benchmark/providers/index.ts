import type { ImageGenerationProvider, ImageGenerationProviderId } from "./types";
import { openRouterImageProvider } from "./openrouter-provider";

const providers: Record<ImageGenerationProviderId, ImageGenerationProvider> = {
  openrouter: openRouterImageProvider,
};

export function getImageGenerationProvider(id: ImageGenerationProviderId = "openrouter"): ImageGenerationProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Provider immagini non supportato: ${id}`);
  }
  return provider;
}

export { generateImageWithOpenRouter } from "./openrouter-provider";
