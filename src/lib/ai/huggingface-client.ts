/**
 * Client Hugging Face via **router OpenAI-compatible** (Inference Providers).
 * Usare da Server Actions / Route Handlers (mai esporre la API key al client).
 *
 * Variabili (in `generateAiText` si usano **solo** queste due):
 * - HUGGINGFACE_API_KEY (consigliata)
 * - HF_TOKEN (come nella CLI Hugging Face)
 *
 * La chiave va letta **solo** dentro `generateAiText` (runtime server), mai a top-level del modulo.
 *
 * Su Vercel: Settings → Environment Variables → nome esatto, ambienti (Production/Preview)
 * selezionati, poi **Redeploy** del progetto.
 *
 * Endpoint: `POST https://router.huggingface.co/v1/chat/completions` con body tipo OpenAI
 * (`model`, `messages`, `max_tokens`, `temperature`).
 */

const HF_CHAT_COMPLETIONS_URL = "https://router.huggingface.co/v1/chat/completions";

/** Modelli di default (testo / immagine). Sostituibili passando un `modelId` esplicito. */
export const MODELS = {
  // fallback: 'mistralai/Mistral-Nemo-Instruct-2407'
  text: "Qwen/Qwen2.5-72B-Instruct",
  image: "stabilityai/stable-diffusion-xl-base-1.0",
} as const;

export type HuggingFaceModelKey = keyof typeof MODELS;

export class HuggingFaceInferenceError extends Error {
  readonly status?: number;
  readonly estimatedTime?: number;

  constructor(
    message: string,
    options?: { status?: number; estimatedTime?: number; cause?: unknown }
  ) {
    super(message, { cause: options?.cause });
    this.name = "HuggingFaceInferenceError";
    this.status = options?.status;
    this.estimatedTime = options?.estimatedTime;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function normalizeModelId(modelId: string): string {
  const trimmed = modelId.trim();
  if (!trimmed) {
    throw new HuggingFaceInferenceError("modelId non può essere vuoto.", { status: 400 });
  }
  return trimmed;
}

function extractChatCompletionContent(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw new HuggingFaceInferenceError(
      "Risposta del modello in formato non riconosciuto (chat completions).",
      { status: 502 }
    );
  }
  const o = data as Record<string, unknown>;
  const choices = o.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new HuggingFaceInferenceError(
      "Risposta senza choices dal router Hugging Face.",
      { status: 502 }
    );
  }
  const first = choices[0];
  if (!first || typeof first !== "object") {
    throw new HuggingFaceInferenceError("choices[0] non valido.", { status: 502 });
  }
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    throw new HuggingFaceInferenceError("Risposta senza message.", { status: 502 });
  }
  const content = (message as { content?: unknown }).content;
  /** Formato OpenAI-compatible: `choices[0].message.content` */
  if (typeof content !== "string") {
    throw new HuggingFaceInferenceError("message.content non è una stringa.", { status: 502 });
  }
  return content.trim();
}

/**
 * Genera testo con un modello Hugging Face (router `/v1/chat/completions`).
 *
 * @param prompt Testo utente (messaggio `role: user`).
 * @param modelId ID modello nel body (default: {@link MODELS.text}).
 * @returns Testo generato (assistant `content`), trim.
 * @throws Error se manca la chiave API a runtime.
 * @throws Error se la risposta HTTP non è OK (corpo in chiaro in messaggio, log in console).
 * @throws HuggingFaceInferenceError per errori di rete, JSON non valido o formato risposta inatteso.
 */
export async function generateAiText(
  prompt: string,
  modelId: string = MODELS.text
): Promise<string> {
  const rawKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  const apiKey = typeof rawKey === "string" ? rawKey.trim() : "";

  if (!apiKey) {
    throw new Error("Errore Critico Server: HUGGINGFACE_API_KEY non trovata a runtime.");
  }

  const model = normalizeModelId(modelId);
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new HuggingFaceInferenceError("Il prompt non può essere vuoto.", { status: 400 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch(HF_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: trimmedPrompt }],
        max_tokens: 1500,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof Error && e.name === "AbortError") {
      throw new HuggingFaceInferenceError(
        "Timeout della richiesta al modello (oltre 120s). Il servizio potrebbe essere sovraccarico.",
        { status: 504, cause: e }
      );
    }
    throw new HuggingFaceInferenceError("Errore di rete durante la chiamata a Hugging Face.", {
      cause: e,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("API Error:", errorText);
    throw new Error(`Errore API Hugging Face: ${response.status} - ${errorText}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new HuggingFaceInferenceError("Risposta non JSON da Hugging Face.", { status: 502 });
  }

  const generatedText = extractChatCompletionContent(data);
  if (!generatedText) {
    throw new HuggingFaceInferenceError("Il modello ha restituito un output vuoto.", {
      status: 502,
    });
  }

  return generatedText;
}
