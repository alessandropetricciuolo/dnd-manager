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
  SITE_IMAGE_MODEL,
  DEFAULT_OPENROUTER_IMAGE_MODEL,
  getSiteImageModel,
  getDefaultImageAspectRatioForEntity,
} from "./openrouter-image-preview";

export { generateSiteImage, generateSiteImageForEntity } from "./image-provider";

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
