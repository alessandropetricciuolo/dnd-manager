/**
 * OpenRouter — API compatibile OpenAI (`/v1/chat/completions`).
 * https://openrouter.ai/docs
 *
 * Variabili (solo server-side):
 * - `AI_TEXT_PROVIDER=openrouter`
 * - `OPENROUTER_API_KEY` — chiave da https://openrouter.ai/keys
 * - `OPENROUTER_MODEL` — opzionale, default `openai/gpt-4o-mini` (vedi elenco modelli su openrouter.ai)
 * - `OPENROUTER_HTTP_REFERER` — opzionale, URL del sito (best practice OpenRouter)
 * - `OPENROUTER_APP_TITLE` — opzionale, nome app per header `X-Title`
 *
 * Gli embedding RAG restano su Hugging Face nel progetto attuale.
 */

const DEFAULT_OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const OPENROUTER_CHAT_PATH = "/chat/completions";

export function shouldUseOpenRouterForAiText(): boolean {
  return process.env.AI_TEXT_PROVIDER?.trim().toLowerCase() === "openrouter";
}

function getOpenRouterBaseUrl(): string {
  const raw = process.env.OPENROUTER_BASE_URL?.trim();
  const base = raw && raw.length > 0 ? raw : DEFAULT_OPENROUTER_BASE;
  return base.replace(/\/$/, "");
}

export function getOpenRouterModelForAiText(): string {
  const m = process.env.OPENROUTER_MODEL?.trim();
  return m && m.length > 0 ? m : "openai/gpt-4o-mini";
}

function extractOpenRouterChatContent(data: unknown): string {
  if (!data || typeof data !== "object") {
    throw new Error("Risposta OpenRouter in formato non riconosciuto.");
  }
  const o = data as Record<string, unknown>;
  const err = o.error;
  if (err && typeof err === "object") {
    const msg = (err as { message?: unknown }).message;
    const detail = typeof msg === "string" ? msg : JSON.stringify(err);
    throw new Error(`OpenRouter: ${detail}`);
  }
  const choices = o.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("Risposta OpenRouter senza choices.");
  }
  const first = choices[0];
  if (!first || typeof first !== "object") {
    throw new Error("OpenRouter: choices[0] non valido.");
  }
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    throw new Error("OpenRouter: risposta senza message.");
  }
  const content = (message as { content?: unknown }).content;
  if (typeof content !== "string") {
    throw new Error("OpenRouter: message.content non è una stringa.");
  }
  return content.trim();
}

type OpenRouterChatOptions = {
  temperature?: number;
  maxTokens?: number;
};

/**
 * POST /v1/chat/completions
 */
export async function generateOpenRouterChat(
  userContent: string,
  options: OpenRouterChatOptions = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY non configurata. Aggiungi la chiave da openrouter.ai/keys e imposta AI_TEXT_PROVIDER=openrouter."
    );
  }

  const trimmed = userContent.trim();
  if (!trimmed) {
    throw new Error("Il prompt non può essere vuoto.");
  }

  const base = getOpenRouterBaseUrl();
  const url = `${base}${OPENROUTER_CHAT_PATH}`;
  const model = getOpenRouterModelForAiText();

  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://localhost";
  const title = process.env.OPENROUTER_APP_TITLE?.trim() || "Barber And Dragons";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "HTTP-Referer": referer,
        "X-Title": title,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: trimmed }],
        max_tokens: options.maxTokens ?? 1500,
        temperature: options.temperature ?? 0.7,
      }),
      signal: controller.signal,
    });

    const bodyText = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(bodyText) as unknown;
    } catch {
      throw new Error(
        `OpenRouter: risposta non JSON (HTTP ${res.status}). ${bodyText.slice(0, 400)}`
      );
    }

    if (!res.ok) {
      const errObj = data && typeof data === "object" ? (data as { error?: { message?: string } }).error : null;
      const msg = errObj?.message ?? bodyText.slice(0, 500);
      throw new Error(`OpenRouter HTTP ${res.status}: ${msg}`);
    }

    const out = extractOpenRouterChatContent(data);
    if (!out) {
      throw new Error("OpenRouter ha restituito contenuto vuoto.");
    }
    return out;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Timeout della richiesta a OpenRouter (oltre 120s).");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}
