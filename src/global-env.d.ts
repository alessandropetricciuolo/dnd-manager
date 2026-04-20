declare namespace NodeJS {
  interface ProcessEnv {
    /** Token Hugging Face (Inference API). Solo server-side. */
    HUGGINGFACE_API_KEY?: string;
    /** Alternativa riconosciuta dalla CLI Hugging Face. */
    HF_TOKEN?: string;
    HUGGINGFACE_TOKEN?: string;
    /**
     * Secondo token (es. altro account HF) usato solo se il principale risponde 402 / crediti esauriti.
     * I crediti Inference sono legati all’account, non al singolo modello: senza fallback serve ricaricare o cambiare account.
     */
    HUGGINGFACE_API_KEY_FALLBACK?: string;
    HF_TOKEN_FALLBACK?: string;
    HUGGINGFACE_TOKEN_FALLBACK?: string;
    /**
     * Provider per generazione testuale server-side: `huggingface` (default), `openrouter`, `ollama` / `local`.
     * Per RAG/embedding servono ancora `HUGGINGFACE_API_KEY` / `HF_TOKEN` se usi quella funzionalità.
     */
    AI_TEXT_PROVIDER?: string;
    /** Chiave API OpenRouter (https://openrouter.ai/keys). Usata con `AI_TEXT_PROVIDER=openrouter`. */
    OPENROUTER_API_KEY?: string;
    /** Modello OpenRouter (es. `openai/gpt-4o-mini`). */
    OPENROUTER_MODEL?: string;
    /** Override base URL API (default `https://openrouter.ai/api/v1`). */
    OPENROUTER_BASE_URL?: string;
    /** Header opzionale `HTTP-Referer` per OpenRouter. */
    OPENROUTER_HTTP_REFERER?: string;
    /** Header opzionale `X-Title` per OpenRouter. */
    OPENROUTER_APP_TITLE?: string;
    /** Base URL API Ollama (default `http://127.0.0.1:11434`). */
    OLLAMA_BASE_URL?: string;
    /** Nome modello Ollama (default `llama3`). */
    OLLAMA_MODEL?: string;
    /**
     * Provider per generazione immagini server-side: `huggingface` (default, Flux via HF)
     * oppure `gemini` (Google Generative Language API). La UI può passare un override
     * per singola richiesta; questa variabile definisce solo il default server.
     */
    AI_IMAGE_PROVIDER?: string;
    /** Chiave API Google Gemini (https://aistudio.google.com/apikey). */
    GEMINI_API_KEY?: string;
    /**
     * Modello Gemini image-out (default `gemini-2.5-flash-image`, con fallback automatico
     * su `gemini-2.5-flash-image-preview` e varianti 2.0 se il primo non è abilitato
     * sull'account). Altri candidati manuali: `imagen-4.0-generate-001`.
     */
    GEMINI_IMAGE_MODEL?: string;
    /** Override base URL API Gemini (default `https://generativelanguage.googleapis.com`). */
    GEMINI_BASE_URL?: string;
  }
}
