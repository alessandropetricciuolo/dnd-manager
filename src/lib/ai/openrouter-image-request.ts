import { OPENROUTER_IMAGE_ASPECT_RATIOS } from "@/lib/ai/openrouter-image-preview";

/** Prompt troppo lunghi possono causare HTTP 400 su OpenRouter. */
export const MAX_OPENROUTER_IMAGE_PROMPT_CHARS = 8_000;

const SUPPORTED_ASPECT = new Set<string>(OPENROUTER_IMAGE_ASPECT_RATIOS);

export function clampOpenRouterImagePrompt(text: string, max = MAX_OPENROUTER_IMAGE_PROMPT_CHARS): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function normalizeOpenRouterAspectRatio(
  aspectRatio: string | null | undefined,
  fallback: string = "1:1"
): string {
  const raw = typeof aspectRatio === "string" ? aspectRatio.trim() : "";
  if (raw && (SUPPORTED_ASPECT.has(raw) || raw === "auto")) return raw;
  if (SUPPORTED_ASPECT.has(fallback)) return fallback;
  return "1:1";
}

export function aspectRatioFallbackChain(primary: string): string[] {
  const normalized = normalizeOpenRouterAspectRatio(primary);
  const chain = [normalized, "auto", "1:1", "16:9", "4:3"];
  return [...new Set(chain)];
}

export function isOpenRouterClientError(message: string): boolean {
  return /OpenRouter HTTP 400/i.test(message);
}

/** Keep diagnostic fields only: provider payloads can also contain prompts and credentials. */
export function formatOpenRouterImageError(status: number, data: unknown): string {
  const root = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const error = root.error && typeof root.error === "object" ? root.error as Record<string, unknown> : {};
  const metadata = error.metadata && typeof error.metadata === "object" ? error.metadata as Record<string, unknown> : {};
  let raw: unknown = metadata.raw;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { raw = null; }
  }
  const provider = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  const detail = provider.error && typeof provider.error === "object" ? provider.error as Record<string, unknown> : provider;
  const clean = (value: unknown): string => typeof value === "string"
    ? value.replace(/https?:\/\/[^\s"'<>]+/gi, "[URL]")
      .replace(/data:image\/[^\s"'<>]+/gi, "[image]")
      .replace(/Bearer\s+\S+|sk-[A-Za-z0-9_-]+/gi, "[redacted]").slice(0, 600)
    : "";
  const message = clean(error.message) || "Richiesta rifiutata da OpenRouter.";
  const fields = [clean(metadata.provider_name), clean(detail.message), clean(detail.code), clean(detail.param)].filter(Boolean);
  return `OpenRouter HTTP ${status}: ${message}${fields.length ? ` (${fields.join("; ")})` : ""}`;
}

export type UnifiedImageResponseItem = {
  b64_json?: string;
  url?: string;
};

export function extractUnifiedImageFromResponse(data: unknown): { imageUrl?: string; imageBase64?: string } {
  if (!data || typeof data !== "object") {
    throw new Error("Risposta OpenRouter Image API non valida.");
  }

  const root = data as Record<string, unknown>;
  const err = root.error;
  if (err && typeof err === "object") {
    const msg = (err as { message?: unknown }).message;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(err));
  }

  const items = root.data;
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("OpenRouter Image API: nessuna immagine nella risposta.");
  }

  const first = items[0] as UnifiedImageResponseItem;
  if (typeof first.b64_json === "string" && first.b64_json.trim()) {
    return { imageBase64: `data:image/png;base64,${first.b64_json.trim()}` };
  }
  if (typeof first.url === "string" && first.url.trim()) {
    const url = first.url.trim();
    return url.startsWith("data:image") ? { imageBase64: url } : { imageUrl: url };
  }

  throw new Error("OpenRouter Image API: formato immagine non riconosciuto.");
}

export function extractReferenceUrlsFromMultimodal(
  parts: Array<{ type: string; image_url?: { url?: string } }> | undefined
): string[] {
  if (!parts?.length) return [];
  return parts
    .filter((p) => p.type === "image_url" && typeof p.image_url?.url === "string")
    .map((p) => p.image_url!.url!.trim())
    .filter(Boolean);
}
