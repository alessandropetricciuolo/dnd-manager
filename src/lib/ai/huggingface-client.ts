/**
 * Client centralizzato per Hugging Face Inference API.
 * Usare da Server Actions / Route Handlers (mai esporre la API key al client).
 *
 * Variabile (una sola basta, in ordine di priorità):
 * - HUGGINGFACE_API_KEY (consigliata in questo progetto)
 * - HF_TOKEN (come nella CLI Hugging Face)
 * - HUGGINGFACE_TOKEN
 *
 * Su Vercel: Settings → Environment Variables → nome esatto, ambienti (Production/Preview)
 * selezionati, poi **Redeploy** del progetto.
 */

const HF_INFERENCE_BASE = "https://api-inference.huggingface.co/models";

/**
 * Nomi env costruiti a runtime (no stringa letterale `process.env.HUGGINGFACE_*`).
 * Il bundler di Next può sostituire in fase di build `process.env.NOME` con il valore
 * disponibile in quel momento: se la var è assente al build, resta `undefined` in
 * produzione. Chiavi costruite dinamicamente vengono lette sul worker Vercel a runtime.
 */
function hfEnvKeyNames(): string[] {
  return [
    ["HUGGINGFACE", "_API_KEY"].join(""),
    ["HF", "_TOKEN"].join(""),
    ["HUGGINGFACE", "_TOKEN"].join(""),
  ];
}

function getHuggingFaceApiKeyFromEnv(): string | undefined {
  const env = process.env as Record<string, string | undefined>;
  for (const name of hfEnvKeyNames()) {
    const t = env[name]?.trim();
    if (t) return t;
  }
  return undefined;
}

/** Solo in caso di chiave mancante: log in runtime server (mai eseguito dal bundle client se import corretto). */
function logMissingHuggingFaceKeyDebug(): void {
  const env = process.env as Record<string, string | undefined>;
  console.log("--- DEBUG API KEY (Hugging Face) ---");
  for (const name of hfEnvKeyNames()) {
    const v = env[name];
    console.log(`${name} esiste?`, !!v);
    console.log(`${name} lunghezza:`, v?.length ?? 0);
  }
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("VERCEL:", process.env.VERCEL);
  console.log("VERCEL_ENV:", process.env.VERCEL_ENV);
  console.log("---------------------");
}

/** Modelli di default (testo / immagine). Sostituibili passando un `modelId` esplicito. */
export const MODELS = {
  text: "mistralai/Mistral-7B-Instruct-v0.2",
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

type HfErrorPayload = {
  error?: string;
  estimated_time?: number;
  message?: string;
};

function parseErrorPayload(json: unknown): HfErrorPayload | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  const error =
    typeof o.error === "string"
      ? o.error
      : typeof o.message === "string"
        ? o.message
        : undefined;
  const estimated_time =
    typeof o.estimated_time === "number" ? o.estimated_time : undefined;
  if (error === undefined && estimated_time === undefined) return null;
  return { error, estimated_time, message: typeof o.message === "string" ? o.message : undefined };
}

/**
 * Estrae il testo dalla risposta dell'Inference API (varie forme a seconda del task/modello).
 */
function extractGeneratedText(raw: unknown, originalPrompt: string): string {
  if (raw == null) return "";

  if (typeof raw === "string") {
    return raw.trim();
  }

  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === "object" && "generated_text" in first) {
      const t = (first as { generated_text?: unknown }).generated_text;
      if (typeof t === "string") return stripPromptPrefix(t, originalPrompt);
    }
    if (typeof first === "string") return first.trim();
    if (first && typeof first === "object" && "summary_text" in first) {
      const t = (first as { summary_text?: unknown }).summary_text;
      if (typeof t === "string") return t.trim();
    }
  }

  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if (typeof o.generated_text === "string") return stripPromptPrefix(o.generated_text, originalPrompt);
    if (typeof o.summary_text === "string") return o.summary_text.trim();
    if (Array.isArray(o.choices) && o.choices[0] && typeof o.choices[0] === "object") {
      const c = o.choices[0] as { text?: unknown };
      if (typeof c.text === "string") return stripPromptPrefix(c.text, originalPrompt);
    }
  }

  throw new HuggingFaceInferenceError(
    "Risposta del modello in formato non riconosciuto. Controlla che il modelId sia adatto al task testuale.",
    { status: 502 }
  );
}

function stripPromptPrefix(text: string, prompt: string): string {
  let out = text.trim();
  const p = prompt.trim();
  if (p && out.startsWith(p)) {
    out = out.slice(p.length).trim();
  }
  return out;
}

function buildLoadingMessage(estimated?: number): string {
  if (estimated != null && estimated > 0) {
    return `Il modello Hugging Face è in avvio a freddo (cold start). Riprova tra circa ${Math.ceil(estimated)} secondi.`;
  }
  return "Il modello Hugging Face non è ancora pronto (cold start). Attendi qualche secondo e riprova.";
}

/**
 * Genera testo con un modello Hugging Face (Inference API).
 *
 * @param prompt Testo in ingresso (campo `inputs` dell'API).
 * @param modelId ID del modello (default: {@link MODELS.text}).
 * @returns Testo generato normalizzato (trim; prefisso uguale al prompt rimosso se presente).
 * @throws HuggingFaceInferenceError in caso di errori HTTP, modello in caricamento, rate limit, ecc.
 */
export async function generateAiText(
  prompt: string,
  modelId: string = MODELS.text
): Promise<string> {
  // Risoluzione chiave solo qui (runtime server quando la Server Action invoca questa funzione).
  // Non leggere process.env a livello di modulo: evita valutazione a build time / contesto errato.
  const apiKey = getHuggingFaceApiKeyFromEnv();
  if (!apiKey) {
    logMissingHuggingFaceKeyDebug();
    throw new HuggingFaceInferenceError(
      [
        "Nessun token Hugging Face trovato.",
        "Locale: aggiungi HUGGINGFACE_API_KEY (o HF_TOKEN) in .env.local.",
        "Vercel: Project Settings → Environment Variables → chiave HUGGINGFACE_API_KEY o HF_TOKEN,",
        "seleziona Production (e Preview se serve), salva e fai Redeploy.",
        "Crea il token su huggingface.co/settings/tokens (permessi sufficienti per Inference API).",
      ].join(" "),
      { status: 401 }
    );
  }

  const model = normalizeModelId(modelId);
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new HuggingFaceInferenceError("Il prompt non può essere vuoto.", { status: 400 });
  }

  const url = `${HF_INFERENCE_BASE}/${encodeURIComponent(model)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ inputs: trimmedPrompt }),
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

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new HuggingFaceInferenceError(
      response.ok
        ? "Risposta non JSON da Hugging Face."
        : `Errore Hugging Face (HTTP ${response.status}).`,
      { status: response.status || 502 }
    );
  }

  const errPayload = parseErrorPayload(data);

  if (response.status === 503 || errPayload?.error?.toLowerCase().includes("loading")) {
    throw new HuggingFaceInferenceError(buildLoadingMessage(errPayload?.estimated_time), {
      status: 503,
      estimatedTime: errPayload?.estimated_time,
    });
  }

  if (!response.ok) {
    const detail =
      errPayload?.error ||
      errPayload?.message ||
      (typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail?: unknown }).detail)
        : null);
    const msg =
      response.status === 429
        ? "Rate limit Hugging Face superato. Riprova tra poco."
        : response.status === 401 || response.status === 403
          ? "Token Hugging Face non valido o permessi insufficienti (verifica HUGGINGFACE_API_KEY)."
          : detail
            ? `Hugging Face: ${detail}`
            : `Richiesta fallita (HTTP ${response.status}).`;
    throw new HuggingFaceInferenceError(msg, {
      status: response.status,
      estimatedTime: errPayload?.estimated_time,
    });
  }

  if (errPayload?.error) {
    throw new HuggingFaceInferenceError(`Hugging Face: ${errPayload.error}`, {
      status: response.status || 502,
      estimatedTime: errPayload?.estimated_time,
    });
  }

  const text = extractGeneratedText(data, trimmedPrompt);
  if (!text) {
    throw new HuggingFaceInferenceError("Il modello ha restituito un output vuoto.", {
      status: 502,
    });
  }

  return text;
}
