/**
 * SiliconFlow — generazione immagini tramite endpoint OpenAI-compatible
 * (`POST {base}/v1/images/generations`). Accetta una semplice Bearer API key.
 *
 * ⚠️ SiliconFlow ha due piattaforme separate con chiavi NON intercambiabili:
 * - internazionale: account su https://cloud.siliconflow.com, API https://api.siliconflow.com
 * - cinese:         account su https://cloud.siliconflow.cn,  API https://api.siliconflow.cn
 * Una chiave della piattaforma sbagliata risponde sempre `401 "Api key is invalid"`.
 *
 * Variabili (solo server-side):
 * - `SILICONFLOW_API_KEY` — chiave (vedi note sopra).
 * - `SILICONFLOW_IMAGE_MODEL` — opzionale, default `black-forest-labs/FLUX.1-schnell`
 *   (Kolors e nomi legacy sono provati in catena se il modello non è disponibile.)
 * - `SILICONFLOW_BASE_URL` — opzionale. Default: `https://api.siliconflow.com`
 *   (piattaforma internazionale). Se il tuo account è su `cloud.siliconflow.cn`
 *   imposta `SILICONFLOW_BASE_URL=https://api.siliconflow.cn`.
 *
 * Formato risposta: `{ images: [{ url }], seed, timings }` con URL temporaneo.
 * Il client scarica l'URL e ritorna un `Buffer` PNG/JPEG, coerente con gli altri
 * provider del router.
 */

const DEFAULT_SILICONFLOW_BASE = "https://api.siliconflow.com";
/** Preferenza SiliconFlow aggiornata (documentazione API); Kolors può rispondere 400 «model does not exist». */
const DEFAULT_SILICONFLOW_MODEL = "black-forest-labs/FLUX.1-schnell";

/**
 * Catena di modelli image-out su SiliconFlow. SiliconFlow cambia periodicamente i modelli disponibili;
 * gli HTTP 400/404 «model …» devolvono al tentativo successivo (vedi `isSiliconFlowUnsupportedModelError`).
 */
const SILICONFLOW_IMAGE_MODEL_FALLBACKS: readonly string[] = [
  /** Ripetuto dopo `modelId` solo se diverso (dedup Set): utile se env punta a un modello rimosso. */
  "black-forest-labs/FLUX.1-schnell",
  "black-forest-labs/FLUX.1-dev",
  "black-forest-labs/FLUX-1.1-pro",
  "Kwai-Kolors/Kolors",
  "stabilityai/stable-diffusion-3-5-large",
];

export function shouldUseSiliconFlowForAiImage(): boolean {
  return process.env.AI_IMAGE_PROVIDER?.trim().toLowerCase() === "siliconflow";
}

export function isSiliconFlowImageConfigured(): boolean {
  return Boolean(process.env.SILICONFLOW_API_KEY?.trim());
}

export function getSiliconFlowImageModel(): string {
  const m = process.env.SILICONFLOW_IMAGE_MODEL?.trim();
  return m && m.length > 0 ? m : DEFAULT_SILICONFLOW_MODEL;
}

function getSiliconFlowBaseUrl(): string {
  const raw = process.env.SILICONFLOW_BASE_URL?.trim();
  const base = raw && raw.length > 0 ? raw : DEFAULT_SILICONFLOW_BASE;
  return base.replace(/\/$/, "");
}

export class SiliconFlowImageError extends Error {
  readonly status?: number;
  constructor(message: string, options?: { status?: number; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "SiliconFlowImageError";
    this.status = options?.status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type SiliconFlowImageItem = { url?: string; b64_json?: string };
type SiliconFlowImageResponse = {
  images?: SiliconFlowImageItem[];
  /** Alcuni modelli usano `data` come in OpenAI. */
  data?: SiliconFlowImageItem[];
  error?: { message?: string; type?: string; code?: string };
  message?: string;
};

function pickFirstImagePayload(data: SiliconFlowImageResponse): SiliconFlowImageItem | null {
  const items = Array.isArray(data.images)
    ? data.images
    : Array.isArray(data.data)
      ? data.data
      : [];
  for (const it of items) {
    if (it && (it.url || it.b64_json)) return it;
  }
  return null;
}

function isSiliconFlowUnsupportedModelError(status: number, bodyText: string): boolean {
  if (status === 404) return true;
  const lower = bodyText.toLowerCase();
  /** SiliconFlow risponde spesso HTTP 400 con messaggi tipo «Model does not exist». */
  if (status === 400) {
    if (
      lower.includes("model does not exist") ||
      lower.includes("model_not_found") ||
      lower.includes("model not exist") ||
      lower.includes("unknown model") ||
      lower.includes("invalid model") ||
      lower.includes("unsupported model") ||
      /** Alcuni messaggi inglesi lunghi: contiene sia «model» sia «does not exist» */
      (lower.includes("does not exist") && lower.includes("model"))
    ) {
      return true;
    }
  }
  return (
    lower.includes("model not found") ||
    lower.includes("not available") ||
    lower.includes("unsupported model") ||
    lower.includes("invalid model")
  );
}

function isSiliconFlowInvalidKeyError(status: number, bodyText: string): boolean {
  if (status !== 401 && status !== 403) return false;
  const lower = bodyText.toLowerCase();
  return (
    lower.includes("api key is invalid") ||
    lower.includes("invalid api key") ||
    lower.includes("unauthorized") ||
    lower.includes("authentication")
  );
}

function buildInvalidKeyMessage(): string {
  const base = getSiliconFlowBaseUrl();
  const usingCn = /siliconflow\.cn/i.test(base);
  const otherPlatform = usingCn
    ? "se l'hai generata su https://cloud.siliconflow.com imposta SILICONFLOW_BASE_URL=https://api.siliconflow.com"
    : "se l'hai generata su https://cloud.siliconflow.cn imposta SILICONFLOW_BASE_URL=https://api.siliconflow.cn";
  return (
    `SiliconFlow: la chiave API è stata rifiutata (401 "Api key is invalid"). ` +
    `Stai chiamando ${base}. ` +
    `SiliconFlow ha due piattaforme separate (.com internazionale e .cn cinese) e le chiavi NON sono intercambiabili: ${otherPlatform}. ` +
    `Verifica anche di non avere spazi o virgolette extra attorno a SILICONFLOW_API_KEY e di aver riavviato il server dopo averla impostata.`
  );
}

async function downloadImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new SiliconFlowImageError(
      `Download immagine SiliconFlow fallito: HTTP ${res.status}`,
      { status: res.status }
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 16) {
    throw new SiliconFlowImageError("Download immagine SiliconFlow vuoto.", { status: 502 });
  }
  return buf;
}

async function callSiliconFlowImages(
  apiKey: string,
  model: string,
  prompt: string,
  negativePrompt: string,
  signal: AbortSignal
): Promise<{ res: Response; bodyText: string; data: SiliconFlowImageResponse | null }> {
  const base = getSiliconFlowBaseUrl();
  const url = `${base}/v1/images/generations`;

  const body: Record<string, unknown> = {
    model,
    prompt,
    image_size: "1024x1024",
    batch_size: 1,
    num_inference_steps: 20,
    guidance_scale: 7.5,
  };
  if (negativePrompt) {
    /** Campo supportato da Kolors/SD3.5; FLUX lo ignora senza errori. */
    body.negative_prompt = negativePrompt;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal,
  });

  const bodyText = await res.text();
  let data: SiliconFlowImageResponse | null = null;
  try {
    data = JSON.parse(bodyText) as SiliconFlowImageResponse;
  } catch {
    data = null;
  }
  return { res, bodyText, data };
}

/**
 * Genera un'immagine con SiliconFlow. Il `negativePrompt` viene passato come
 * campo dedicato (ignorato dai modelli che non lo supportano).
 *
 * Applica una piccola catena di fallback se il modello richiesto risponde 404
 * / "model not found", per non bloccare l'utente su un alias.
 */
export async function generateSiliconFlowImage(
  positivePrompt: string,
  negativePrompt: string,
  modelId: string = getSiliconFlowImageModel()
): Promise<Buffer> {
  const apiKey = process.env.SILICONFLOW_API_KEY?.trim();
  if (!apiKey) {
    throw new SiliconFlowImageError(
      "SILICONFLOW_API_KEY non configurata. Crea una chiave da https://cloud.siliconflow.cn/account/ak e imposta la env var.",
      { status: 401 }
    );
  }

  const pos = positivePrompt.trim();
  if (!pos) {
    throw new SiliconFlowImageError("Il prompt positivo non può essere vuoto.", { status: 400 });
  }
  const neg = negativePrompt.trim();

  const candidates = Array.from(new Set([modelId, ...SILICONFLOW_IMAGE_MODEL_FALLBACKS]));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 180_000);

  let lastStatus = 0;
  let lastErrorText = "";
  let picked: { model: string; payload: SiliconFlowImageItem } | null = null;

  try {
    for (const model of candidates) {
      let res: Response;
      let bodyText: string;
      let data: SiliconFlowImageResponse | null;
      try {
        ({ res, bodyText, data } = await callSiliconFlowImages(
          apiKey,
          model,
          pos,
          neg,
          controller.signal
        ));
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          throw new SiliconFlowImageError(
            "Timeout della richiesta a SiliconFlow (oltre 180s).",
            { status: 504, cause: e }
          );
        }
        throw new SiliconFlowImageError("Errore di rete durante la chiamata a SiliconFlow.", {
          cause: e,
        });
      }

      if (res.ok) {
        if (!data) {
          throw new SiliconFlowImageError(
            `SiliconFlow: risposta non JSON (HTTP ${res.status}). ${bodyText.slice(0, 400)}`,
            { status: 502 }
          );
        }
        const first = pickFirstImagePayload(data);
        if (!first) {
          throw new SiliconFlowImageError(
            `SiliconFlow: risposta senza immagini. ${bodyText.slice(0, 400)}`,
            { status: 502 }
          );
        }
        picked = { model, payload: first };
        break;
      }

      lastStatus = res.status;
      lastErrorText = bodyText;

      if (isSiliconFlowUnsupportedModelError(res.status, bodyText)) {
        console.warn(
          `[generateSiliconFlowImage] modello "${model}" non disponibile, provo il successivo.`
        );
        continue;
      }
      if (isSiliconFlowInvalidKeyError(res.status, bodyText)) {
        console.error(
          "[generateSiliconFlowImage] chiave rifiutata:",
          bodyText.slice(0, 300)
        );
        throw new SiliconFlowImageError(buildInvalidKeyMessage(), { status: 401 });
      }
      /** Errori non recuperabili (quota, validation, ecc.): fail immediato. */
      const msg = data?.error?.message ?? data?.message ?? bodyText.slice(0, 500);
      throw new SiliconFlowImageError(`SiliconFlow HTTP ${res.status}: ${msg}`, {
        status: res.status,
      });
    }
  } finally {
    clearTimeout(timeoutId);
  }

  if (!picked) {
    throw new SiliconFlowImageError(
      `SiliconFlow: nessun modello immagine disponibile per questa API key. Ultimo errore (HTTP ${lastStatus}): ${lastErrorText.slice(0, 400) || "nessuna risposta"}.`,
      { status: lastStatus || 502 }
    );
  }

  if (picked.payload.b64_json) {
    try {
      return Buffer.from(picked.payload.b64_json, "base64");
    } catch (e) {
      throw new SiliconFlowImageError(
        "SiliconFlow ha restituito un b64_json non decodificabile.",
        { status: 502, cause: e }
      );
    }
  }
  if (!picked.payload.url) {
    throw new SiliconFlowImageError(
      "SiliconFlow: risposta senza url né b64_json.",
      { status: 502 }
    );
  }
  return downloadImageBuffer(picked.payload.url);
}
