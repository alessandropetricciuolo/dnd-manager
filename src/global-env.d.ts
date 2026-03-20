declare namespace NodeJS {
  interface ProcessEnv {
    /** Token Hugging Face (Inference API). Solo server-side. */
    HUGGINGFACE_API_KEY?: string;
    /** Alternativa riconosciuta dalla CLI Hugging Face. */
    HF_TOKEN?: string;
    HUGGINGFACE_TOKEN?: string;
    /** Segreto per `/api/debug-env?secret=` (solo debug, rimuovere la route dopo). */
    DEBUG_ENV_SECRET?: string;
  }
}
