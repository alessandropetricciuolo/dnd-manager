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
 * Per la memoria campagna interrogabile usiamo anche `/v1/embeddings` di OpenRouter
 * con output forzato a 384 dimensioni, così resta compatibile con pgvector.
 */

const DEFAULT_OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const OPENROUTER_CHAT_PATH = "/chat/completions";
const OPENROUTER_EMBEDDINGS_PATH = "/embeddings";

export function shouldUseOpenRouterForAiText(): boolean {
  return process.env.AI_TEXT_PROVIDER?.trim().toLowerCase() === "openrouter";
}

function getOpenRouterBaseUrl(): string {
  const raw = process.env.OPENROUTER_BASE_URL?.trim();
  const base = raw && raw.length > 0 ? raw : DEFAULT_OPENROUTER_BASE;
  return base.replace(/\/$/, "");
}

export function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY non configurata. Aggiungi la chiave da openrouter.ai/keys."
    );
  }
  return apiKey;
}

export function buildOpenRouterHeaders(apiKey: string): Record<string, string> {
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://localhost";
  const title = process.env.OPENROUTER_APP_TITLE?.trim() || "Barber And Dragons";

  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "HTTP-Referer": referer,
    "X-Title": title,
  };
}

export function getOpenRouterModelForAiText(): string {
  const m = process.env.OPENROUTER_MODEL?.trim();
  return m && m.length > 0 ? m : "openai/gpt-4o-mini";
}

/** Modello OpenRouter per generazione testo wiki (bacchetta IA, assist wiki). */
export const SITE_WIKI_TEXT_MODEL = "google/gemma-4-31b-it:free";

export function getSiteWikiTextModel(): string {
  const env = process.env.WIKI_TEXT_MODEL?.trim();
  return env || SITE_WIKI_TEXT_MODEL;
}

/** Fallback wiki quando il modello primario è in rate limit (es. `:free`). */
export function getSiteWikiTextFallbackModel(): string {
  const env = process.env.WIKI_TEXT_FALLBACK_MODEL?.trim();
  if (env) return env;
  return getOpenRouterModelForAiText();
}

export function getOpenRouterModelForEmbeddings(): string {
  const m = process.env.OPENROUTER_EMBEDDING_MODEL?.trim();
  return m && m.length > 0 ? m : "openai/text-embedding-3-small";
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

export type OpenRouterWikiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterEmbeddingOptions = {
  model?: string;
  dimensions?: number;
};

function isTransientOpenRouterStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isRateLimitStatus(status: number, message: string): boolean {
  if (status === 429) return true;
  const lower = message.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("rate_limit") ||
    lower.includes("too many requests") ||
    lower.includes("provider returned error")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(attempt: number, status: number, res?: Response): number {
  const retryAfter = res?.headers.get("retry-after")?.trim();
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1000, 60_000);
    }
  }
  if (status === 429) {
    return Math.min(2000 * 2 ** (attempt - 1), 15_000);
  }
  return 500 * attempt;
}

function getOpenRouterHeaders(apiKey: string): Record<string, string> {
  return buildOpenRouterHeaders(apiKey);
}

type OpenRouterWikiChatAttemptResult =
  | { ok: true; content: string }
  | { ok: false; rateLimited: boolean; error: Error };

async function requestOpenRouterWikiChatWithModel(
  apiKey: string,
  url: string,
  model: string,
  messages: OpenRouterWikiChatMessage[],
  options: OpenRouterChatOptions
): Promise<OpenRouterWikiChatAttemptResult> {
  const maxAttempts = 3;
  let lastErr: Error | null = null;
  let lastRateLimited = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages,
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
        if (isTransientOpenRouterStatus(res.status) && attempt < maxAttempts) {
          await sleep(getRetryDelayMs(attempt, res.status, res));
          continue;
        }
        return {
          ok: false,
          rateLimited: isRateLimitStatus(res.status, bodyText),
          error: new Error(
            `OpenRouter wiki text: risposta non JSON (HTTP ${res.status}). ${bodyText.slice(0, 400)}`
          ),
        };
      }

      if (!res.ok) {
        const errObj = data && typeof data === "object" ? (data as { error?: { message?: string } }).error : null;
        const msg = errObj?.message ?? bodyText.slice(0, 500);
        const rateLimited = isRateLimitStatus(res.status, msg);
        lastRateLimited = rateLimited;
        if (isTransientOpenRouterStatus(res.status) && attempt < maxAttempts) {
          await sleep(getRetryDelayMs(attempt, res.status, res));
          continue;
        }
        return {
          ok: false,
          rateLimited,
          error: new Error(`OpenRouter wiki text HTTP ${res.status}: ${msg}`),
        };
      }

      const out = extractOpenRouterChatContent(data);
      if (!out) {
        if (attempt < maxAttempts) {
          await sleep(getRetryDelayMs(attempt, 0));
          continue;
        }
        return {
          ok: false,
          rateLimited: false,
          error: new Error("OpenRouter wiki text ha restituito contenuto vuoto."),
        };
      }
      return { ok: true, content: out };
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        lastErr = new Error("Timeout della richiesta wiki text a OpenRouter (oltre 120s).");
      } else {
        lastErr = e instanceof Error ? e : new Error(String(e));
      }
      if (attempt < maxAttempts) {
        await sleep(getRetryDelayMs(attempt, 0));
        continue;
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return {
    ok: false,
    rateLimited: lastRateLimited,
    error: lastErr ?? new Error("OpenRouter wiki text: errore sconosciuto."),
  };
}

async function postOpenRouterWikiChat(
  messages: OpenRouterWikiChatMessage[],
  options: OpenRouterChatOptions = {}
): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  const normalized = messages
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0);
  if (!normalized.length) {
    throw new Error("Serve almeno un messaggio per la chat wiki.");
  }

  const base = getOpenRouterBaseUrl();
  const url = `${base}${OPENROUTER_CHAT_PATH}`;
  const primaryModel = getSiteWikiTextModel();
  const fallbackModel = getSiteWikiTextFallbackModel();
  const models = primaryModel === fallbackModel ? [primaryModel] : [primaryModel, fallbackModel];

  let lastErr: Error | null = null;

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex]!;
    const result = await requestOpenRouterWikiChatWithModel(apiKey, url, model, normalized, options);
    if (result.ok) {
      if (modelIndex > 0) {
        console.warn(
          `[openrouter] Wiki text fallback: ${primaryModel} → ${model} (rate limit sul modello primario).`
        );
      }
      return result.content;
    }

    lastErr = result.error;
    const hasFallback = modelIndex < models.length - 1;
    if (result.rateLimited && hasFallback) {
      console.warn(
        `[openrouter] Wiki text rate limit su ${model}, provo fallback ${models[modelIndex + 1]}.`
      );
      continue;
    }
    if (!hasFallback) break;
  }

  if (lastErr && isRateLimitStatus(429, lastErr.message)) {
    throw new Error(
      "Il servizio AI wiki è temporaneamente sovraccarico (rate limit). Riprova tra qualche minuto oppure imposta WIKI_TEXT_MODEL su un modello a pagamento in Vercel."
    );
  }

  throw lastErr ?? new Error("OpenRouter wiki text: errore sconosciuto.");
}

/**
 * POST /v1/chat/completions
 */
export async function generateOpenRouterChat(
  userContent: string,
  options: OpenRouterChatOptions = {}
): Promise<string> {
  const apiKey = getOpenRouterApiKey();

  const trimmed = userContent.trim();
  if (!trimmed) {
    throw new Error("Il prompt non può essere vuoto.");
  }

  const base = getOpenRouterBaseUrl();
  const url = `${base}${OPENROUTER_CHAT_PATH}`;
  const model = getOpenRouterModelForAiText();

  let lastErr: Error | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getOpenRouterHeaders(apiKey),
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
        if (isTransientOpenRouterStatus(res.status) && attempt < maxAttempts) {
          await sleep(500 * attempt);
          continue;
        }
        throw new Error(
          `OpenRouter: risposta non JSON (HTTP ${res.status}). ${bodyText.slice(0, 400)}`
        );
      }

      if (!res.ok) {
        const errObj = data && typeof data === "object" ? (data as { error?: { message?: string } }).error : null;
        const msg = errObj?.message ?? bodyText.slice(0, 500);
        if (isTransientOpenRouterStatus(res.status) && attempt < maxAttempts) {
          await sleep(500 * attempt);
          continue;
        }
        throw new Error(`OpenRouter HTTP ${res.status}: ${msg}`);
      }

      const out = extractOpenRouterChatContent(data);
      if (!out) {
        if (attempt < maxAttempts) {
          await sleep(350 * attempt);
          continue;
        }
        throw new Error("OpenRouter ha restituito contenuto vuoto.");
      }
      return out;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        if (attempt < maxAttempts) {
          await sleep(600 * attempt);
          continue;
        }
        lastErr = new Error("Timeout della richiesta a OpenRouter (oltre 120s).");
      } else {
        lastErr = e instanceof Error ? e : new Error(String(e));
      }
      if (attempt < maxAttempts) continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastErr ?? new Error("OpenRouter: errore sconosciuto.");
}

export async function generateOpenRouterWikiText(
  userContent: string,
  options: OpenRouterChatOptions = {}
): Promise<string> {
  const trimmed = userContent.trim();
  if (!trimmed) {
    throw new Error("Il prompt non può essere vuoto.");
  }
  return postOpenRouterWikiChat([{ role: "user", content: trimmed }], options);
}

/** Chat multi-turno wiki (OpenRouter + modello wiki). */
export async function generateOpenRouterWikiTextMessages(
  messages: OpenRouterWikiChatMessage[],
  options: OpenRouterChatOptions = {}
): Promise<string> {
  return postOpenRouterWikiChat(messages, options);
}

/**
 * POST /v1/embeddings
 * Default: `openai/text-embedding-3-small` con `dimensions=384` per compatibilità con
 * gli indici pgvector del progetto dedicati alla memoria campagna.
 */
export async function generateOpenRouterEmbedding(
  text: string,
  options: OpenRouterEmbeddingOptions = {}
): Promise<number[]> {
  const apiKey = getOpenRouterApiKey();

  const input = text.trim();
  if (!input) {
    throw new Error("Il testo per embedding non può essere vuoto.");
  }

  const base = getOpenRouterBaseUrl();
  const url = `${base}${OPENROUTER_EMBEDDINGS_PATH}`;
  const model = options.model?.trim() || getOpenRouterModelForEmbeddings();
  const dimensions = Number.isFinite(options.dimensions) ? Math.max(1, Math.floor(options.dimensions!)) : 384;

  let lastErr: Error | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({
          model,
          input,
          dimensions,
          encoding_format: "float",
        }),
        signal: controller.signal,
      });

      const bodyText = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(bodyText) as unknown;
      } catch {
        if (isTransientOpenRouterStatus(res.status) && attempt < maxAttempts) {
          await sleep(500 * attempt);
          continue;
        }
        throw new Error(`OpenRouter embeddings: risposta non JSON (HTTP ${res.status}). ${bodyText.slice(0, 400)}`);
      }

      if (!res.ok) {
        const errObj = data && typeof data === "object" ? (data as { error?: { message?: string } }).error : null;
        const msg = errObj?.message ?? bodyText.slice(0, 500);
        if (isTransientOpenRouterStatus(res.status) && attempt < maxAttempts) {
          await sleep(500 * attempt);
          continue;
        }
        throw new Error(`OpenRouter embeddings HTTP ${res.status}: ${msg}`);
      }

      const embedding = (data as { data?: Array<{ embedding?: unknown }> } | null)?.data?.[0]?.embedding;
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("OpenRouter embeddings: risposta senza data[0].embedding.");
      }
      if (!embedding.every((value) => typeof value === "number" && Number.isFinite(value))) {
        throw new Error("OpenRouter embeddings: il vettore contiene valori non numerici.");
      }
      return embedding as number[];
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastErr = new Error("Timeout della richiesta embeddings a OpenRouter (oltre 90s).");
      } else {
        lastErr = error instanceof Error ? error : new Error(String(error));
      }
      if (attempt < maxAttempts) continue;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastErr ?? new Error("OpenRouter embeddings: errore sconosciuto.");
}
