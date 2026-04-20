export {
  MODELS,
  type HuggingFaceModelKey,
  HuggingFaceInferenceError,
  generateAiText,
  generateAiImage,
  generateEmbedding,
  generateRagEmbedding,
} from "./huggingface-client";

export { shouldUseOllamaForAiText, getOllamaModelForAiText } from "./ollama-client";

export { shouldUseOpenRouterForAiText, getOpenRouterModelForAiText } from "./openrouter-client";

export {
  generateGeminiImage,
  shouldUseGeminiForAiImage,
  isGeminiImageConfigured,
  getGeminiImageModel,
  GeminiImageError,
} from "./gemini-image-client";

export {
  IMAGE_PROVIDER_IDS,
  type ImageProviderId,
  type ImageProviderDescriptor,
  isImageProviderId,
  getDefaultImageProvider,
  resolveImageProvider,
  listImageProviders,
  generateAiImageWithProvider,
} from "./image-provider";

export { ARCHITECT_SYSTEM_PROMPT } from "./prompts";

export {
  generateContextualText,
  type WikiGeneratorEntityType,
  type WikiAiTextGeneration,
} from "./generator";

export {
  generateWikiMarkdownAction,
  type WikiMarkdownEntityType,
  type WikiMarkdownExtraParams,
  type GenerateWikiMarkdownResult,
} from "./wiki-text-generator";
