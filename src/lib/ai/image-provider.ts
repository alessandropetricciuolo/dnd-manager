/**
 * Router di generazione immagini: consente di scegliere a runtime quale provider
 * utilizzare. Il default viene dalla env `AI_IMAGE_PROVIDER`, ma la UI può
 * passare un override per singola richiesta.
 *
 * Provider supportati:
 * - `huggingface` — HF Inference Providers (Flux), cfr. `huggingface-client.ts`
 * - `siliconflow` — SiliconFlow OpenAI-compatible, cfr. `siliconflow-image-client.ts`
 *
 * Gemini è stato dismesso perché i suoi modelli image-out sono usciti dal free
 * tier di Google (richiedono billing attivo). Se in futuro si riabilita, va
 * ripristinato un client dedicato e aggiunto di nuovo a {@link IMAGE_PROVIDER_IDS}.
 */

import { generateAiImage, HuggingFaceInferenceError } from "@/lib/ai/huggingface-client";
import {
  generateSiliconFlowImage,
  isSiliconFlowImageConfigured,
  getSiliconFlowImageModel,
  SiliconFlowImageError,
} from "@/lib/ai/siliconflow-image-client";

export const IMAGE_PROVIDER_IDS = ["huggingface", "siliconflow"] as const;
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
      id: "siliconflow",
      label: "SiliconFlow",
      available: isSiliconFlowImageConfigured(),
      model: getSiliconFlowImageModel(),
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
  if (provider === "siliconflow") {
    try {
      return await generateSiliconFlowImage(positivePrompt, negativePrompt);
    } catch (e) {
      if (e instanceof SiliconFlowImageError) throw new Error(e.message);
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
