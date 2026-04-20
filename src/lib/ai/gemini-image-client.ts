/**
 * Google Gemini — generazione immagini tramite Generative Language API
 * (endpoint `v1beta/models/{model}:generateContent`).
 *
 * Variabili (solo server-side):
 * - `GEMINI_API_KEY` — chiave da https://aistudio.google.com/apikey
 * - `GEMINI_IMAGE_MODEL` — opzionale, default `gemini-2.5-flash-image-preview`
 *   (altri candidati: `gemini-2.5-flash-image`, `imagen-4.0-generate-001`)
 * - `GEMINI_BASE_URL` — opzionale, default `https://generativelanguage.googleapis.com`
 *
 * Formato risposta (Gemini 2.5 Flash Image): l'immagine arriva come `inlineData.data`
 * (base64) dentro `candidates[0].content.parts[]`. Viene convertita in `Buffer`.
 *
 * Nota: per Gemini non esiste un campo "negative prompt" separato; il vincolo di
 * esclusione viene fuso nel prompt testuale (stessa strategia usata con Flux su HF).
 */

const DEFAULT_GEMINI_BASE = "https://generativelanguage.googleapis.com";
const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image-preview";

export function shouldUseGeminiForAiImage(): boolean {
  return process.env.AI_IMAGE_PROVIDER?.trim().toLowerCase() === "gemini";
}

export function isGeminiImageConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getGeminiImageModel(): string {
  const m = process.env.GEMINI_IMAGE_MODEL?.trim();
  return m && m.length > 0 ? m : DEFAULT_GEMINI_IMAGE_MODEL;
}

function getGeminiBaseUrl(): string {
  const raw = process.env.GEMINI_BASE_URL?.trim();
  const base = raw && raw.length > 0 ? raw : DEFAULT_GEMINI_BASE;
  return base.replace(/\/$/, "");
}

export class GeminiImageError extends Error {
  readonly status?: number;
  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "GeminiImageError";
    this.status = options?.status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type GeminiInlineDataPart = { inlineData?: { mimeType?: string; data?: string } };
type GeminiTextPart = { text?: string };
type GeminiPart = GeminiInlineDataPart & GeminiTextPart;
type GeminiCandidate = { content?: { parts?: GeminiPart[] }; finishReason?: string };
type GeminiResponse = {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string; blockReasonMessage?: string };
  error?: { message?: string; status?: string };
};

function extractInlineImageFromGemini(data: GeminiResponse): Buffer {
  if (data.error?.message) {
    throw new GeminiImageError(`Gemini API: ${data.error.message}`, { status: 502 });
  }
  const blocked = data.promptFeedback?.blockReason;
  if (blocked) {
    const detail = data.promptFeedback?.blockReasonMessage
      ? `${blocked} — ${data.promptFeedback.blockReasonMessage}`
      : blocked;
    throw new GeminiImageError(`Richiesta bloccata da Gemini (${detail}).`, { status: 400 });
  }

  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  for (const cand of candidates) {
    const parts = Array.isArray(cand?.content?.parts) ? cand.content!.parts! : [];
    for (const part of parts) {
      const b64 = part?.inlineData?.data;
      if (typeof b64 === "string" && b64.length > 0) {
        try {
          return Buffer.from(b64, "base64");
        } catch (e) {
          throw new GeminiImageError("Gemini ha restituito dati immagine non decodificabili.", {
            status: 502,
            cause: e,
          });
        }
      }
    }
  }

  /** Se il modello non produce immagine, spesso restituisce solo testo esplicativo (safety, rifiuto, ecc.). */
  const firstText = candidates
    .flatMap((c) => c?.content?.parts ?? [])
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .find((t) => t.trim().length > 0);

  throw new GeminiImageError(
    firstText
      ? `Gemini non ha prodotto un'immagine: ${firstText.slice(0, 300)}`
      : "Gemini non ha prodotto alcuna immagine.",
    { status: 502 }
  );
}

/**
 * Genera un'immagine con Gemini (modello image-generation-capable).
 * `negativePrompt` viene fuso nel prompt per coerenza con gli altri provider.
 */
export async function generateGeminiImage(
  positivePrompt: string,
  negativePrompt: string,
  modelId: string = getGeminiImageModel()
): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiImageError(
      "GEMINI_API_KEY non configurata. Crea una chiave da https://aistudio.google.com/apikey e imposta la env var.",
      { status: 401 }
    );
  }

  const pos = positivePrompt.trim();
  if (!pos) {
    throw new GeminiImageError("Il prompt positivo non può essere vuoto.", { status: 400 });
  }
  const neg = negativePrompt.trim();
  const merged = neg ? `${pos}. Do not show or include: ${neg}` : pos;

  const base = getGeminiBaseUrl();
  const url = `${base}/v1beta/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: merged }] }],
        /**
         * I modelli image-out di Gemini richiedono esplicitamente la modalità IMAGE
         * (e TEXT in lista per compatibilità). Senza `responseModalities` restituiscono testo.
         */
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      throw new GeminiImageError(
        "Timeout della richiesta a Gemini (oltre 180s).",
        { status: 504, cause: e }
      );
    }
    throw new GeminiImageError("Errore di rete durante la chiamata a Gemini.", { cause: e });
  } finally {
    clearTimeout(timeoutId);
  }

  const bodyText = await res.text();
  let data: GeminiResponse;
  try {
    data = JSON.parse(bodyText) as GeminiResponse;
  } catch {
    throw new GeminiImageError(
      `Gemini: risposta non JSON (HTTP ${res.status}). ${bodyText.slice(0, 400)}`,
      { status: 502 }
    );
  }

  if (!res.ok) {
    const msg = data.error?.message ?? bodyText.slice(0, 500);
    throw new GeminiImageError(`Gemini HTTP ${res.status}: ${msg}`, { status: res.status });
  }

  const buf = extractInlineImageFromGemini(data);
  if (buf.length < 16) {
    throw new GeminiImageError("Risposta immagine Gemini vuota o troppo piccola.", { status: 502 });
  }
  return buf;
}
