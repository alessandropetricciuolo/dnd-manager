/**
 * Client Hugging Face via **router OpenAI-compatible** (Inference Providers).
 * Usare da Server Actions / Route Handlers (mai esporre la API key al client).
 *
 * Variabili:
 * - HUGGINGFACE_API_KEY (consigliata) oppure HF_TOKEN / HUGGINGFACE_TOKEN
 * - Opzionale, solo se il principale ha crediti esauriti (402): HUGGINGFACE_API_KEY_FALLBACK o HF_TOKEN_FALLBACK
 *   (stesso router: i crediti sono per account, non “per modello”; il fallback è un secondo token/account).
 *
 * La chiave va letta **solo** dentro `generateAiText` (runtime server), mai a top-level del modulo.
 *
 * Su Vercel: Settings → Environment Variables → nome esatto, ambienti (Production/Preview)
 * selezionati, poi **Redeploy** del progetto.
 *
 * **OpenRouter (testo):** `AI_TEXT_PROVIDER=openrouter`, `OPENROUTER_API_KEY`, opzionale `OPENROUTER_MODEL`
 * (default `openai/gpt-4o-mini`). Vedi `src/lib/ai/openrouter-client.ts`.
 *
 * **Testo in locale (Ollama):** imposta `AI_TEXT_PROVIDER=ollama`, avvia Ollama sul Mac e opzionalmente
 * `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`) e `OLLAMA_MODEL` (default `llama3`).
 * Gli embedding per RAG restano su Hugging Face (`generateRagEmbedding`).
 *
 * Endpoint testo: `POST https://router.huggingface.co/v1/chat/completions` (OpenAI-compatible).
 *
 * Immagini (text-to-image): `POST https://router.huggingface.co/hf-inference/models/{modelId}` con body
 * JSON `{ inputs: string }` (risposta binaria). Per Flux conviene un unico prompt descrittivo; eventuali
 * divieti si integrano nel testo passato a `inputs`.
 */

import {
  generateOpenRouterChat,
  generateOpenRouterEmbedding,
  shouldUseOpenRouterForAiText,
} from "@/lib/ai/openrouter-client";
import { generateOllamaChat, shouldUseOllamaForAiText } from "@/lib/ai/ollama-client";

const HF_CHAT_COMPLETIONS_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_IMAGE_INFERENCE_BASE = "https://router.huggingface.co/hf-inference/models";
const HF_OPENAI_EMBEDDINGS_URL = "https://router.huggingface.co/v1/embeddings";
const HF_CHARACTER_JSON_BASE = "https://router.huggingface.co/hf-inference/models";

/** Modelli di default (testo / immagine). Sostituibili passando un `modelId` esplicito. */
export const MODELS = {
  text: "mistralai/Mistral-Nemo-Instruct-2407",
  image: "black-forest-labs/FLUX.1-schnell",
  embedding: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
} as const;

const IMAGE_MODEL_FALLBACKS: readonly string[] = [
  MODELS.image,
  "stabilityai/stable-diffusion-xl-base-1.0",
  "runwayml/stable-diffusion-v1-5",
];

function trimHfKey(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Catena di token: stesso ordine “primario” di prima, poi fallback espliciti (deduplicati).
 * Usata per ritentare con un secondo account quando HF risponde 402 (crediti Inference esauriti).
 */
function getHuggingFaceApiKeyChain(): string[] {
  const primary =
    trimHfKey(process.env.HUGGINGFACE_API_KEY) ||
    trimHfKey(process.env.HF_TOKEN) ||
    trimHfKey(process.env.HUGGINGFACE_TOKEN);
  const fallbacks = [
    trimHfKey(process.env.HUGGINGFACE_API_KEY_FALLBACK),
    trimHfKey(process.env.HF_TOKEN_FALLBACK),
    trimHfKey(process.env.HUGGINGFACE_TOKEN_FALLBACK),
  ].filter((k) => k.length > 0);

  const chain: string[] = [];
  if (primary) chain.push(primary);
  for (const f of fallbacks) {
    if (!chain.includes(f)) chain.push(f);
  }
  return chain;
}

function isHuggingFaceInsufficientCreditsError(status: number, errorText: string): boolean {
  if (status === 402) return true;
  const lower = errorText.toLowerCase();
  return (
    lower.includes("depleted your monthly") ||
    lower.includes("monthly included credits") ||
    lower.includes("pre-paid credits to continue") ||
    (lower.includes("not enough") && lower.includes("credit"))
  );
}

const HF_INSUFFICIENT_CREDITS_USER_MESSAGE_IT =
  "Crediti Hugging Face esauriti per questo account (Inference Providers). " +
  "Con la stessa API key i modelli condividono lo stesso saldo: cambiare solo il modello non risolve. " +
  "Aggiungi crediti o abbonati su huggingface.co, oppure imposta HUGGINGFACE_API_KEY_FALLBACK (o HF_TOKEN_FALLBACK) con un token di un altro account.";

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
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new HuggingFaceInferenceError("Il prompt non può essere vuoto.", { status: 400 });
  }

  if (shouldUseOpenRouterForAiText()) {
    void modelId;
    return generateOpenRouterChat(trimmedPrompt, { temperature: 0.7, maxTokens: 1500 });
  }

  if (shouldUseOllamaForAiText()) {
    void modelId;
    return generateOllamaChat(trimmedPrompt, { temperature: 0.7, numPredict: 1500 });
  }

  const keyChain = getHuggingFaceApiKeyChain();
  if (keyChain.length === 0) {
    throw new Error("Errore Critico Server: HUGGINGFACE_API_KEY non trovata a runtime.");
  }

  const model = normalizeModelId(modelId);
  const modelCandidates = Array.from(
    new Set([
      model,
      "mistralai/Mistral-Nemo-Instruct-2407",
      "Qwen/Qwen2.5-72B-Instruct",
      "meta-llama/Llama-3.1-70B-Instruct",
    ])
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  let response: Response | null = null;
  let lastApiError = "";
  let sawInsufficientCredits = false;
  try {
    keyLoop: for (const apiKey of keyChain) {
      for (const candidate of modelCandidates) {
        response = await fetch(HF_CHAT_COMPLETIONS_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            model: candidate,
            messages: [{ role: "user", content: trimmedPrompt }],
            max_tokens: 1500,
            temperature: 0.7,
          }),
          signal: controller.signal,
        });
        if (response.ok) break keyLoop;
        const errorText = await response.text();
        lastApiError = `model=${candidate} status=${response.status} body=${errorText}`;
        if (isHuggingFaceInsufficientCreditsError(response.status, errorText)) {
          sawInsufficientCredits = true;
          console.warn("[generateAiText] HF credits insufficient for this token; trying next if any.");
          continue keyLoop;
        }
        const lower = errorText.toLowerCase();
        const isUnsupported =
          lower.includes("model_not_supported") ||
          lower.includes("not supported by any provider") ||
          lower.includes("unsupported model");
        if (!isUnsupported) {
          console.error("API Error:", errorText);
          throw new Error(`Errore API Hugging Face: ${response.status} - ${errorText}`);
        }
      }
    }
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

  if (!response || !response.ok) {
    if (sawInsufficientCredits) {
      console.error("[generateAiText] All tokens exhausted HF credits. Last:", lastApiError);
      throw new Error(HF_INSUFFICIENT_CREDITS_USER_MESSAGE_IT);
    }
    throw new Error(
      `Errore API Hugging Face: nessun modello testo supportato dai provider abilitati. ${lastApiError}`
    );
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

/**
 * Genera un'immagine (router hf-inference, risposta binaria).
 * `negativePrompt` viene fuso nel prompt descrittivo per modelli tipo Flux (un solo campo `inputs`).
 */
export async function generateAiImage(
  positivePrompt: string,
  negativePrompt: string,
  modelId: string = MODELS.image
): Promise<Buffer> {
  const keyChain = getHuggingFaceApiKeyChain();
  if (keyChain.length === 0) {
    throw new Error("Errore Critico Server: HUGGINGFACE_API_KEY non trovata a runtime.");
  }

  const model = normalizeModelId(modelId);
  const modelCandidates = Array.from(new Set([model, ...IMAGE_MODEL_FALLBACKS]));
  const pos = positivePrompt.trim();
  if (!pos) {
    throw new HuggingFaceInferenceError("Il prompt positivo non può essere vuoto.", { status: 400 });
  }

  const neg = negativePrompt.trim();
  const inputs = neg ? `${pos}. Do not show or include: ${neg}` : pos;

  let lastApiError = "";
  let buf: Buffer | null = null;
  let finalContentType = "";
  let sawInsufficientCredits = false;

  keyLoop: for (const apiKey of keyChain) {
    for (const candidate of modelCandidates) {
      const url = `${HF_IMAGE_INFERENCE_BASE}/${encodeURIComponent(candidate)}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180_000);
      let response: Response;
      try {
        response = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "image/png",
          },
          body: JSON.stringify({ inputs }),
          signal: controller.signal,
        });
      } catch (e) {
        clearTimeout(timeoutId);
        if (e instanceof Error && e.name === "AbortError") {
          throw new HuggingFaceInferenceError(
            "Timeout della richiesta di generazione immagine (oltre 180s).",
            { status: 504, cause: e }
          );
        }
        throw new HuggingFaceInferenceError("Errore di rete durante la generazione immagine.", {
          cause: e,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorText = await response.text();
        lastApiError = `model=${candidate} status=${response.status} body=${errorText}`;
        if (isHuggingFaceInsufficientCreditsError(response.status, errorText)) {
          sawInsufficientCredits = true;
          console.warn("[generateAiImage] HF credits insufficient for this token; trying next if any.");
          continue keyLoop;
        }
        const lower = errorText.toLowerCase();
        const isRecoverable =
          lower.includes("cuda out of memory") ||
          lower.includes("out of memory") ||
          lower.includes("oom") ||
          lower.includes("model is deprecated") ||
          lower.includes("no longer supported") ||
          lower.includes("model_not_supported") ||
          lower.includes("not supported by provider") ||
          lower.includes("not supported by any provider");
        if (isRecoverable) {
          continue;
        }
        console.error("[generateAiImage] API Error:", errorText);
        throw new Error(`Errore API Hugging Face (immagine): ${response.status} - ${errorText}`);
      }

      finalContentType = response.headers.get("content-type") || "";
      buf = Buffer.from(await response.arrayBuffer());
      break keyLoop;
    }
  }

  if (!buf) {
    if (sawInsufficientCredits) {
      console.error("[generateAiImage] All tokens exhausted HF credits. Last:", lastApiError);
      throw new Error(HF_INSUFFICIENT_CREDITS_USER_MESSAGE_IT);
    }
    throw new Error(
      `Errore API Hugging Face (immagine): nessun modello disponibile per generazione. ${lastApiError}`
    );
  }

  if (buf.length < 16) {
    throw new HuggingFaceInferenceError("Risposta immagine vuota o troppo piccola.", { status: 502 });
  }
  if (buf[0] === 0x7b) {
    throw new HuggingFaceInferenceError(
      `Errore API (JSON al posto dell'immagine): ${buf.toString("utf8").slice(0, 600)}`,
      { status: 502 }
    );
  }

  const contentType = finalContentType;
  const magicPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const magicJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const magicGif = buf.toString("ascii", 0, 4) === "GIF8";
  const looksLikeImage =
    contentType.startsWith("image/") || magicPng || magicJpeg || magicGif;

  if (!looksLikeImage) {
    throw new HuggingFaceInferenceError(
      `Formato risposta non riconosciuto (${contentType || "unknown"}).`,
      { status: 502 }
    );
  }

  return buf;
}

/** Solo varianti router per {@link MODELS.embedding} (MiniLM multilingue). Nessun altro modello: allineato a chunk caricati con SentenceTransformers locale o ingest app. */
const RAG_EMBEDDING_MODEL_CANDIDATES: readonly string[] = [
  `${MODELS.embedding}:hf-inference`,
  MODELS.embedding,
];

/**
 * Embedding via **hf-inference** (`POST .../hf-inference/models/{modelId}` + `{ inputs: string }`).
 * Serve quando `/v1/embeddings` del router risponde 404 (molti sentence-transformers non sono mappati lì).
 */
function parseHfInferenceEmbeddingPayload(data: unknown): number[] | null {
  const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

  function firstNumberVector(node: unknown): number[] | null {
    if (!Array.isArray(node) || node.length === 0) return null;
    if (isNum(node[0])) {
      return node.every(isNum) ? (node as number[]) : null;
    }
    for (const item of node) {
      const v = firstNumberVector(item);
      if (v) return v;
    }
    return null;
  }

  if (Array.isArray(data)) {
    const direct = firstNumberVector(data);
    if (direct) return direct;
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    for (const key of ["embeddings", "data", "last_hidden_state", "sentence_embeddings"] as const) {
      if (key in o) {
        const v = firstNumberVector(o[key]);
        if (v) return v;
      }
    }
  }
  return null;
}

/** ID modello nel path URL (niente suffisso provider tipo `:hf-inference`). */
function hfInferenceModelPathId(model: string): string {
  return model.replace(/:hf-inference$/i, "").trim();
}

/** Cold start hf-inference può superare 1 min; 60s causava AbortError frequente. */
const HF_FEATURE_EXTRACTION_TIMEOUT_MS = 240_000;

function isAbortError(e: unknown): boolean {
  return (
    e instanceof Error &&
    (e.name === "AbortError" || /aborted/i.test(e.message))
  );
}

/**
 * Embedding via hf-inference **feature-extraction** (non il default del modello, che spesso è
 * `SentenceSimilarityPipeline` e richiede `sentences`).
 * @see https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/discussions/115
 */
async function embedWithHfInferenceModel(apiKey: string, model: string, input: string): Promise<number[]> {
  const id = hfInferenceModelPathId(model);
  const url = `${HF_IMAGE_INFERENCE_BASE}/${encodeURIComponent(id)}/pipeline/feature-extraction`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const payloads: Record<string, unknown>[] = [
    { inputs: input, truncate: true },
    { inputs: [input], truncate: true },
  ];

  let lastErr = "";
  for (const body of payloads) {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HF_FEATURE_EXTRACTION_TIMEOUT_MS);
      try {
        response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        break;
      } catch (e) {
        if (isAbortError(e) && attempt === 0) {
          lastErr = `timeout/abort dopo ${HF_FEATURE_EXTRACTION_TIMEOUT_MS}ms, retry…`;
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        throw new Error(
          `hf-inference feature-extraction: ${e instanceof Error ? e.message : String(e)}`
        );
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!response) {
      lastErr = "fetch senza risposta";
      continue;
    }

    if (!response.ok) {
      lastErr = `model=${id} status=${response.status} body=${await response.text()}`;
      continue;
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new HuggingFaceInferenceError("Risposta embeddings hf-inference non JSON.", { status: 502 });
    }

    const vec = parseHfInferenceEmbeddingPayload(data);
    if (!vec || vec.length < 8) {
      lastErr = `formato embedding non valido: ${
        typeof data === "object" ? JSON.stringify(data).slice(0, 400) : String(data).slice(0, 400)
      }`;
      continue;
    }
    return vec;
  }

  throw new Error(`hf-inference feature-extraction: ${lastErr || "nessun payload ha funzionato"}`);
}

async function embedWithOpenAiCompatibleRouter(
  apiKey: string,
  input: string,
  candidateModels: readonly string[]
): Promise<number[]> {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  let lastErrorText = "";
  for (const model of candidateModels) {
    let response = await fetch(HF_OPENAI_EMBEDDINGS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, input }),
    });

    if (!response.ok && (response.status === 400 || response.status === 422)) {
      response = await fetch(HF_OPENAI_EMBEDDINGS_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ model, input: [input] }),
      });
    }

    if (!response.ok) {
      const body = await response.text();
      lastErrorText = `model=${model} status=${response.status} body=${body}`;
      continue;
    }

    const payload = (await response.json()) as {
      data?: Array<{ embedding?: unknown }>;
    };
    const embedding = payload?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) {
      throw new HuggingFaceInferenceError("Risposta embeddings senza data[0].embedding.", {
        status: 502,
      });
    }
    if (!embedding.every((n) => typeof n === "number" && Number.isFinite(n))) {
      throw new HuggingFaceInferenceError("Embedding contiene valori non numerici.", {
        status: 502,
      });
    }

    return embedding as number[];
  }

  throw new Error(
    `Errore API Hugging Face (embedding /v1/embeddings): ${
      lastErrorText || "nessun modello candidato ha risposto OK"
    }`
  );
}

/**
 * Embedding per RAG su `manuals_knowledge`: **solo** `paraphrase-multilingual-MiniLM-L12-v2`
 * (stesso spazio vettoriale di ingest locale SentenceTransformers / `ingest-manuals`).
 * Non usa fallback su altri modelli, per evitare retrieval incoerente.
 */
export async function generateRagEmbedding(text: string): Promise<number[]> {
  const input = text.trim();
  if (!input) {
    throw new HuggingFaceInferenceError("Il testo per embedding non può essere vuoto.", { status: 400 });
  }

  const ragModel = process.env.OPENROUTER_RAG_EMBEDDING_MODEL?.trim() || undefined;
  return generateOpenRouterEmbedding(input, { model: ragModel, dimensions: 384 });
}

/** Genera embedding vettoriale via router OpenAI-compatible (/v1/embeddings), con fallback multilingue. */
export async function generateEmbedding(text: string): Promise<number[]> {
  const input = text.trim();
  if (!input) {
    throw new HuggingFaceInferenceError("Il testo per embedding non può essere vuoto.", { status: 400 });
  }

  const model = process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || undefined;
  return generateOpenRouterEmbedding(input, { model, dimensions: 384 });
}

function normalizeCharacterSheetJsonOutput(generatedText: string, lastErrForLog: string): string {
  if (!generatedText.trim()) {
    throw new HuggingFaceInferenceError(
      `Risposta vuota durante generazione JSON scheda. Ultimo errore: ${lastErrForLog || "n/a"}`,
      { status: 502 }
    );
  }

  const noFences = generatedText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  function extractFirstJsonObject(source: string): string | null {
    const start = source.indexOf("{");
    if (start < 0) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = start; i < source.length; i++) {
      const ch = source[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === "\"") {
          inString = false;
        }
        continue;
      }

      if (ch === "\"") {
        inString = true;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") {
        depth--;
        if (depth === 0) {
          return source.slice(start, i + 1).trim();
        }
      }
    }
    return null;
  }

  let jsonCandidate =
    extractFirstJsonObject(noFences) ||
    extractFirstJsonObject(noFences.replace(/\\"/g, "\"").replace(/\\n/g, "\n"));

  if (!jsonCandidate) {
    try {
      const unwrapped = JSON.parse(noFences) as unknown;
      if (unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)) {
        jsonCandidate = JSON.stringify(unwrapped);
      }
    } catch {
      // no-op
    }
  }

  if (!jsonCandidate) {
    console.error("[generateCharacterSheetJSON] raw output", generatedText);
    return "{}";
  }

  return jsonCandidate;
}

/**
 * Genera una scheda personaggio in formato JSON puro (nessun testo extra).
 * Usa modello Instruct con prompt [INST] e pulizia output.
 */
export async function generateCharacterSheetJSON(
  promptText: string,
  contextText: string
): Promise<string> {
  const prompt = `[INST] Sei un parser dati. Genera SOLO un oggetto JSON valido. NESSUNA PAROLA PRIMA O DOPO IL JSON.
CONTESTO DAI MANUALI:
${contextText}

RICHIESTA: ${promptText}
[/INST]`;

  if (shouldUseOpenRouterForAiText()) {
    const generatedText = await generateOpenRouterChat(prompt, { temperature: 0.2, maxTokens: 2000 });
    return normalizeCharacterSheetJsonOutput(generatedText, "");
  }

  if (shouldUseOllamaForAiText()) {
    const generatedText = await generateOllamaChat(prompt, { temperature: 0.2, numPredict: 2000 });
    return normalizeCharacterSheetJsonOutput(generatedText, "");
  }

  const rawKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  const apiKey = typeof rawKey === "string" ? rawKey.trim() : "";
  if (!apiKey) {
    throw new Error("Errore Critico Server: HUGGINGFACE_API_KEY non trovata a runtime.");
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const candidateModels = [
    "mistralai/Mistral-7B-Instruct-v0.3:hf-inference",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "mistralai/Mixtral-8x7B-Instruct-v0.1:hf-inference",
    "mistralai/Mixtral-8x7B-Instruct-v0.1",
  ];

  let generatedText = "";
  let lastErr = "";

  for (const model of candidateModels) {
    const url = `${HF_CHARACTER_JSON_BASE}/${encodeURIComponent(model)}`;
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 2000,
          return_full_text: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      lastErr = `model=${model} status=${response.status} body=${errorText}`;
      continue;
    }

    const payload = (await response.json()) as unknown;
    generatedText =
      Array.isArray(payload) &&
      payload[0] &&
      typeof payload[0] === "object" &&
      typeof (payload[0] as { generated_text?: unknown }).generated_text === "string"
        ? ((payload[0] as { generated_text: string }).generated_text ?? "")
        : typeof payload === "string"
          ? payload
          : "";

    if (generatedText.trim()) break;
  }

  // Fallback finale: chat-completions router (gia' stabile nel progetto).
  if (!generatedText.trim()) {
    const response = await fetch(HF_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: MODELS.text,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Errore API Hugging Face (character-json): ${errorText || lastErr || `${response.status} Not Found`}`
      );
    }

    const chat = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    generatedText = chat.choices?.[0]?.message?.content ?? "";
  }

  return normalizeCharacterSheetJsonOutput(generatedText, lastErr);
}
