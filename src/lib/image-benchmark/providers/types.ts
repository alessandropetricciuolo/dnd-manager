import type { ImageGenerationInput, ImageGenerationOutput } from "../types";

export type ImageGenerationProviderId = "openrouter";

export interface ImageGenerationProvider {
  readonly id: ImageGenerationProviderId;
  generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput>;
  estimateCost?(model: string, rawResponse: unknown): number | undefined;
}
