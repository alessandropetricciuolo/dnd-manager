/**
 * Router di generazione immagini: consente di scegliere a runtime quale provider
 * utilizzare (Hugging Face/Flux o Google Gemini). Il default viene dalla env
 * `AI_IMAGE_PROVIDER`, ma la UI può passare un override per singola richiesta.
 *
 * Mantiene `generateAiImage` (HF) come fallback di retrocompatibilità.
 */

import { generateAiImage, HuggingFaceInferenceError } from "@/lib/ai/huggingface-client";
import {
  generateGeminiImage,
  isGeminiImageConfigured,
  getGeminiImageModel,
  GeminiImageError,
} from "@/lib/ai/gemini-image-client";

export const IMAGE_PROVIDER_IDS = ["huggingface", "gemini"] as const;
export type ImageProviderId = (typeof IMAGE_PROVIDER_IDS)[number];

export type ImageProviderDescriptor = {
  id: ImageProviderId;
  label: string;
  /** Se false, il server non ha la chiave configurata: la UI dovrebbe disabilitare l'opzione. */
  available: boolean;
  /** Modello effettivamente usato (informativo, mostrato in UI). */
  model: string;
};

export function isImageProviderId(value: unknown): value is ImageProviderId {
  return typeof value === "string" && (IMAGE_PROVIDER_IDS as readonly string[]).includes(value);
}

export function getDefaultImageProvider(): ImageProviderId {
  const raw = process.env.AI_IMAGE_PROVIDER?.trim().toLowerCase();
  if (isImageProviderId(raw)) return raw;
  return "huggingface";
}

function isHuggingFaceImageConfigured(): boolean {
  return Boolean(
    process.env.HUGGINGFACE_API_KEY?.trim() ||
      process.env.HF_TOKEN?.trim() ||
      process.env.HUGGINGFACE_TOKEN?.trim()
  );
}

/**
 * Stato dei provider per la UI: {@link ImageProviderDescriptor}.
 * Non espone mai le chiavi, solo la loro presenza.
 */
export function listImageProviders(): ImageProviderDescriptor[] {
  return [
    {
      id: "huggingface",
      label: "Hugging Face (FLUX.1 schnell)",
      available: isHuggingFaceImageConfigured(),
      model: "black-forest-labs/FLUX.1-schnell",
    },
    {
      id: "gemini",
      label: "Google Gemini",
      available: isGeminiImageConfigured(),
      model: getGeminiImageModel(),
    },
  ];
}

/**
 * Normalizza una richiesta al provider scelto dall'utente (se fornito e valido),
 * altrimenti usa il default configurato lato server.
 */
export function resolveImageProvider(requested?: string | null): ImageProviderId {
  if (requested && isImageProviderId(requested)) return requested;
  return getDefaultImageProvider();
}

/**
 * Genera un'immagine utilizzando il provider scelto. Ritorna un `Buffer` PNG/JPEG.
 * Gli errori provider-specifici vengono ri-wrappati in `Error` con messaggio leggibile.
 */
export async function generateAiImageWithProvider(
  provider: ImageProviderId,
  positivePrompt: string,
  negativePrompt: string
): Promise<Buffer> {
  if (provider === "gemini") {
    try {
      return await generateGeminiImage(positivePrompt, negativePrompt);
    } catch (e) {
      if (e instanceof GeminiImageError) throw new Error(e.message);
      throw e;
    }
  }

  try {
    return await generateAiImage(positivePrompt, negativePrompt);
  } catch (e) {
    if (e instanceof HuggingFaceInferenceError) throw new Error(e.message);
    throw e;
  }
}
