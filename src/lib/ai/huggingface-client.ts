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
 * Endpoint testo: `POST https://router.huggingface.co/v1/chat/completions` (OpenAI-compatible).
 *
 * Immagini (text-to-image): `POST https://router.huggingface.co/hf-inference/models/{modelId}` con body
 * JSON `{ inputs: string }` (risposta binaria). Per Flux conviene un unico prompt descrittivo; eventuali
 * divieti si integrano nel testo passato a `inputs`.
 */

const HF_CHAT_COMPLETIONS_URL = "https://router.huggingface.co/v1/chat/completions";
const HF_IMAGE_INFERENCE_BASE = "https://router.huggingface.co/hf-inference/models";
const HF_OPENAI_EMBEDDINGS_URL = "https://router.huggingface.co/v1/embeddings";
const HF_CHARACTER_JSON_BASE = "https://router.huggingface.co/hf-inference/models";

/** Modelli di default (testo / immagine). Sostituibili passando un `modelId` esplicito. */
export const MODELS = {
  // fallback: 'mistralai/Mistral-Nemo-Instruct-2407'
  text: "Qwen/Qwen2.5-72B-Instruct",
  image: "black-forest-labs/FLUX.1-schnell",
  embedding: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
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

/**
 * Genera un'immagine (router hf-inference, risposta binaria).
 * `negativePrompt` viene fuso nel prompt descrittivo per modelli tipo Flux (un solo campo `inputs`).
 */
export async function generateAiImage(
  positivePrompt: string,
  negativePrompt: string,
  modelId: string = MODELS.image
): Promise<Buffer> {
  const rawKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  const apiKey = typeof rawKey === "string" ? rawKey.trim() : "";

  if (!apiKey) {
    throw new Error("Errore Critico Server: HUGGINGFACE_API_KEY non trovata a runtime.");
  }

  const model = normalizeModelId(modelId);
  const pos = positivePrompt.trim();
  if (!pos) {
    throw new HuggingFaceInferenceError("Il prompt positivo non può essere vuoto.", { status: 400 });
  }

  const neg = negativePrompt.trim();
  const inputs = neg ? `${pos}. Do not show or include: ${neg}` : pos;

  const url = `${HF_IMAGE_INFERENCE_BASE}/${encodeURIComponent(model)}`;
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
    console.error("[generateAiImage] API Error:", errorText);
    throw new Error(`Errore API Hugging Face (immagine): ${response.status} - ${errorText}`);
  }

  const buf = Buffer.from(await response.arrayBuffer());
  if (buf.length < 16) {
    throw new HuggingFaceInferenceError("Risposta immagine vuota o troppo piccola.", { status: 502 });
  }
  if (buf[0] === 0x7b) {
    throw new HuggingFaceInferenceError(
      `Errore API (JSON al posto dell'immagine): ${buf.toString("utf8").slice(0, 600)}`,
      { status: 502 }
    );
  }

  const contentType = response.headers.get("content-type") || "";
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
    `Errore API Hugging Face (embedding): ${
      lastErrorText || "nessun modello embeddings disponibile su router"
    }`
  );
}

/**
 * Embedding per RAG su `manuals_knowledge`: **solo** `paraphrase-multilingual-MiniLM-L12-v2`
 * (stesso spazio vettoriale di ingest locale SentenceTransformers / `ingest-manuals`).
 * Non usa fallback su altri modelli, per evitare retrieval incoerente.
 */
export async function generateRagEmbedding(text: string): Promise<number[]> {
  const rawKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  const apiKey = typeof rawKey === "string" ? rawKey.trim() : "";
  if (!apiKey) {
    throw new Error("Errore Critico Server: HUGGINGFACE_API_KEY non trovata a runtime.");
  }

  const input = text.trim();
  if (!input) {
    throw new HuggingFaceInferenceError("Il testo per embedding non può essere vuoto.", { status: 400 });
  }

  return embedWithOpenAiCompatibleRouter(apiKey, input, RAG_EMBEDDING_MODEL_CANDIDATES);
}

/** Genera embedding vettoriale via router OpenAI-compatible (/v1/embeddings), con fallback multilingue. */
export async function generateEmbedding(text: string): Promise<number[]> {
  const rawKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  const apiKey = typeof rawKey === "string" ? rawKey.trim() : "";
  if (!apiKey) {
    throw new Error("Errore Critico Server: HUGGINGFACE_API_KEY non trovata a runtime.");
  }

  const input = text.trim();
  if (!input) {
    throw new HuggingFaceInferenceError("Il testo per embedding non può essere vuoto.", { status: 400 });
  }

  const candidateModels = [
    ...RAG_EMBEDDING_MODEL_CANDIDATES,
    "intfloat/multilingual-e5-small:hf-inference",
    "intfloat/multilingual-e5-small",
  ] as const;

  return embedWithOpenAiCompatibleRouter(apiKey, input, candidateModels);
}

/**
 * Genera una scheda personaggio in formato JSON puro (nessun testo extra).
 * Usa modello Instruct con prompt [INST] e pulizia output.
 */
export async function generateCharacterSheetJSON(
  promptText: string,
  contextText: string
): Promise<string> {
  const rawKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  const apiKey = typeof rawKey === "string" ? rawKey.trim() : "";
  if (!apiKey) {
    throw new Error("Errore Critico Server: HUGGINGFACE_API_KEY non trovata a runtime.");
  }

  const prompt = `[INST] Sei un parser dati. Genera SOLO un oggetto JSON valido. NESSUNA PAROLA PRIMA O DOPO IL JSON.
CONTESTO DAI MANUALI:
${contextText}

RICHIESTA: ${promptText}
[/INST]`;

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

  if (!generatedText.trim()) {
    throw new HuggingFaceInferenceError(
      `Risposta vuota durante generazione JSON scheda. Ultimo errore: ${lastErr || "n/a"}`,
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

  // Ultimo fallback: se e' una stringa JSON pura, prova a decodificarla.
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
    // Fallback resiliente: lasciamo che la Server Action faccia merge col template completo.
    return "{}";
  }

  return jsonCandidate;
}
