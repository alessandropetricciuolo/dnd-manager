import {
  buildOpenRouterHeaders,
  getOpenRouterApiKey,
} from "@/lib/ai/openrouter-client";
import {
  aspectRatioFallbackChain,
  clampOpenRouterImagePrompt,
  extractReferenceUrlsFromMultimodal,
  extractUnifiedImageFromResponse,
  isOpenRouterClientError,
} from "@/lib/ai/openrouter-image-request";
import type { ImageGenerationInput, ImageGenerationOutput } from "../types";
import type { ImageGenerationProvider } from "./types";

const DEFAULT_OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const OPENROUTER_CHAT_PATH = "/chat/completions";
const OPENROUTER_IMAGES_PATH = "/images";
const IMAGE_TIMEOUT_MS = 180_000;

function getOpenRouterBaseUrl(): string {
  const raw = process.env.OPENROUTER_BASE_URL?.trim();
  const base = raw && raw.length > 0 ? raw : DEFAULT_OPENROUTER_BASE;
  return base.replace(/\/$/, "");
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractUrlFromUnknown(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:image")) {
      return trimmed;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.url === "string") return obj.url;
  if (obj.image_url && typeof obj.image_url === "object") {
    const nested = (obj.image_url as { url?: unknown }).url;
    if (typeof nested === "string") return nested;
  }
  if (typeof obj.b64_json === "string") {
    return `data:image/png;base64,${obj.b64_json}`;
  }
  return null;
}

function extractImageFromOpenRouterResponse(data: unknown): { imageUrl?: string; imageBase64?: string } {
  if (!data || typeof data !== "object") {
    throw new Error("Risposta OpenRouter in formato non riconosciuto.");
  }

  const root = data as Record<string, unknown>;
  const err = root.error;
  if (err && typeof err === "object") {
    const msg = (err as { message?: unknown }).message;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(err));
  }

  const choices = root.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Risposta OpenRouter senza choices.");
  }

  const message = (choices[0] as { message?: unknown })?.message;
  if (!message || typeof message !== "object") {
    throw new Error("Risposta OpenRouter senza message.");
  }

  const msg = message as Record<string, unknown>;

  const images = msg.images;
  if (Array.isArray(images)) {
    for (const item of images) {
      const url = extractUrlFromUnknown(item);
      if (url) {
        return url.startsWith("data:image") ? { imageBase64: url } : { imageUrl: url };
      }
    }
  }

  const content = msg.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const p = part as Record<string, unknown>;
      if (p.type === "image_url" || p.type === "output_image") {
        const url = extractUrlFromUnknown(p.image_url ?? p.image ?? p);
        if (url) {
          return url.startsWith("data:image") ? { imageBase64: url } : { imageUrl: url };
        }
      }
      const inline = extractUrlFromUnknown(p);
      if (inline) {
        return inline.startsWith("data:image") ? { imageBase64: inline } : { imageUrl: inline };
      }
    }
  }

  if (typeof content === "string") {
    const dataUrlMatch = content.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/);
    if (dataUrlMatch) return { imageBase64: dataUrlMatch[0] };
    const httpMatch = content.match(/https?:\/\/[^\s"'<>]+/);
    if (httpMatch) return { imageUrl: httpMatch[0] };
  }

  throw new Error("Nessuna immagine trovata nella risposta OpenRouter.");
}

export async function openRouterImageOutputToBuffer(output: ImageGenerationOutput): Promise<Buffer> {
  if (!output.success) {
    throw new Error(output.errorMessage ?? "Generazione immagine OpenRouter fallita.");
  }
  if (output.imageBase64) {
    const raw = output.imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    return Buffer.from(raw, "base64");
  }
  if (output.imageUrl) {
    const res = await fetch(output.imageUrl);
    if (!res.ok) {
      throw new Error(`Download immagine fallito (HTTP ${res.status}).`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  throw new Error("Nessuna immagine nella risposta OpenRouter.");
}

function extractEstimatedCost(data: unknown): number | undefined {
  if (!data || typeof data !== "object") return undefined;
  const usage = (data as { usage?: { cost?: unknown; total_cost?: unknown } }).usage;
  if (!usage) return undefined;
  const cost = usage.cost ?? usage.total_cost;
  return typeof cost === "number" && Number.isFinite(cost) ? cost : undefined;
}

async function postOpenRouterJson(
  path: string,
  apiKey: string,
  body: Record<string, unknown>
): Promise<{ data: unknown; durationMs: number }> {
  const url = `${getOpenRouterBaseUrl()}${path}`;
  const started = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildOpenRouterHeaders(apiKey),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const bodyText = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(bodyText) as unknown;
    } catch {
      throw new Error(`OpenRouter: risposta non JSON (HTTP ${res.status}). ${bodyText.slice(0, 400)}`);
    }

    if (!res.ok) {
      const errObj = data && typeof data === "object" ? (data as { error?: { message?: string } }).error : null;
      const msg = errObj?.message ?? bodyText.slice(0, 500);
      throw new Error(`OpenRouter HTTP ${res.status}: ${msg}`);
    }

    return { data, durationMs: Date.now() - started };
  } finally {
    clearTimeout(timeoutId);
  }
}

type ImageAttempt = {
  label: string;
  path: string;
  body: Record<string, unknown>;
  parse: (data: unknown) => { imageUrl?: string; imageBase64?: string };
};

function buildImageAttempts(input: ImageGenerationInput): ImageAttempt[] {
  const prompt = clampOpenRouterImagePrompt(input.prompt);
  const hasMultimodal = Array.isArray(input.multimodalContent) && input.multimodalContent.length > 0;
  const referenceUrls = extractReferenceUrlsFromMultimodal(input.multimodalContent);
  const aspectRatios = aspectRatioFallbackChain(input.aspectRatio);
  const attempts: ImageAttempt[] = [];

  for (const aspectRatio of aspectRatios) {
    const unifiedBody: Record<string, unknown> = {
      model: input.model,
      prompt,
      aspect_ratio: aspectRatio,
      output_format: "png",
      n: 1,
    };
    if (referenceUrls.length > 0) {
      unifiedBody.input_references = referenceUrls.map((url) => ({ image_url: { url } }));
    }
    attempts.push({
      label: `unified:${aspectRatio}`,
      path: OPENROUTER_IMAGES_PATH,
      body: unifiedBody,
      parse: extractUnifiedImageFromResponse,
    });
  }

  const messageContent = hasMultimodal ? input.multimodalContent! : prompt;
  const chatVariants: Array<Record<string, unknown>> = [
    { modalities: ["image"], image_config: { aspect_ratio: aspectRatios[0] } },
    { modalities: ["image"] },
    { modalities: ["image", "text"], image_config: { aspect_ratio: aspectRatios[0] } },
    { modalities: ["image", "text"] },
    {},
  ];

  for (const variant of chatVariants) {
    attempts.push({
      label: `chat:${JSON.stringify(variant)}`,
      path: OPENROUTER_CHAT_PATH,
      body: {
        model: input.model,
        messages: [{ role: "user", content: messageContent }],
        stream: false,
        ...variant,
      },
      parse: extractImageFromOpenRouterResponse,
    });
  }

  return attempts;
}

export async function generateImageWithOpenRouter(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
  const apiKey = getOpenRouterApiKey();
  const prompt = input.prompt.trim();
  const hasMultimodal = Array.isArray(input.multimodalContent) && input.multimodalContent.length > 0;
  if (!prompt && !hasMultimodal) {
    return {
      success: false,
      rawResponse: null,
      durationMs: 0,
      errorMessage: "Il prompt non può essere vuoto.",
    };
  }

  const attempts = buildImageAttempts(input);
  let lastError: Error | null = null;

  for (const attempt of attempts) {
    for (let retry = 1; retry <= 2; retry++) {
      try {
        const { data, durationMs } = await postOpenRouterJson(attempt.path, apiKey, attempt.body);
        const extracted = attempt.parse(data);
        return {
          success: true,
          ...extracted,
          rawResponse: data,
          durationMs,
          estimatedCostUsd: extractEstimatedCost(data),
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error("Timeout generazione immagine OpenRouter (180s).");
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }

        const retryable =
          (lastError.message.includes("HTTP 5") && retry < 2) ||
          (isOpenRouterClientError(lastError.message) && retry < 2);

        if (retryable) {
          await sleep(400 * retry);
          continue;
        }
        break;
      }
    }
  }

  const friendly = lastError?.message ?? "Errore sconosciuto OpenRouter.";
  const hint = isOpenRouterClientError(friendly)
    ? " Parametri immagine non accettati dal modello — riprova con una descrizione più breve o senza riferimento visivo."
    : "";

  return {
    success: false,
    rawResponse: null,
    durationMs: 0,
    errorMessage: `${friendly}${hint}`,
  };
}

export class OpenRouterImageProvider implements ImageGenerationProvider {
  readonly id = "openrouter" as const;

  generateImage(input: ImageGenerationInput): Promise<ImageGenerationOutput> {
    return generateImageWithOpenRouter(input);
  }

  estimateCost(_model: string, rawResponse: unknown): number | undefined {
    return extractEstimatedCost(rawResponse);
  }
}

export const openRouterImageProvider = new OpenRouterImageProvider();
