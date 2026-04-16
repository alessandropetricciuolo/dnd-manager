/**
 * Client Ollama per generazione testuale in locale (es. Mac con `ollama serve`).
 *
 * Variabili (solo server-side, tipicamente in `.env.local`):
 * - `AI_TEXT_PROVIDER=ollama` — abilita Ollama per `generateAiText` / JSON scheda (vedi huggingface-client).
 * - `OLLAMA_BASE_URL` — default `http://127.0.0.1:11434`
 * - `OLLAMA_MODEL` — default `llama3` (deve essere già scaricato: `ollama pull llama3`)
 *
 * RAG / embedding: restano su Hugging Face (`generateRagEmbedding`) per compatibilità con i vettori in DB.
 */

export function shouldUseOllamaForAiText(): boolean {
  const v = process.env.AI_TEXT_PROVIDER?.trim().toLowerCase();
  return v === "ollama" || v === "local";
}

function getOllamaBaseUrl(): string {
  const raw = process.env.OLLAMA_BASE_URL?.trim();
  const base = raw && raw.length > 0 ? raw : "http://127.0.0.1:11434";
  return base.replace(/\/$/, "");
}

export function getOllamaModelForAiText(): string {
  const m = process.env.OLLAMA_MODEL?.trim();
  return m && m.length > 0 ? m : "llama3";
}

type OllamaChatOptions = {
  temperature?: number;
  numPredict?: number;
};

/**
 * POST /api/chat (stream: false).
 */
export async function generateOllamaChat(
  userContent: string,
  options: OllamaChatOptions = {}
): Promise<string> {
  const base = getOllamaBaseUrl();
  const model = getOllamaModelForAiText();
  const url = `${base}/api/chat`;

  const trimmed = userContent.trim();
  if (!trimmed) {
    throw new Error("Il prompt non può essere vuoto.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: trimmed }],
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.numPredict ?? 1500,
        },
      }),
      signal: controller.signal,
    });

    const bodyText = await res.text();
    if (!res.ok) {
      let detail = bodyText.slice(0, 500);
      try {
        const j = JSON.parse(bodyText) as { error?: string };
        if (typeof j?.error === "string" && j.error) detail = j.error;
      } catch {
        // use raw detail
      }
      throw new Error(
        `Ollama ha risposto con errore (${res.status}): ${detail}. ` +
          `Verifica che il servizio sia attivo e che il modello "${model}" esista (\`ollama list\`, \`ollama pull ${model}\`).`
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(bodyText);
    } catch {
      throw new Error("Risposta non JSON da Ollama (api/chat).");
    }

    const o = data as { message?: { content?: unknown } };
    const content = o.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Ollama ha restituito un messaggio vuoto.");
    }
    return content.trim();
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Timeout della richiesta a Ollama (oltre 120s). Il modello potrebbe essere lento o sovraccarico.");
    }
    if (e instanceof TypeError) {
      throw new Error(
        `Impossibile contattare Ollama su ${base}. Avvia l'app Ollama sul Mac o imposta OLLAMA_BASE_URL se usi un host diverso. (${e.message})`
      );
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}
