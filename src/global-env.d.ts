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
  }
}
