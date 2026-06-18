/**
 * Stime token per prompt testo (CLIP / encoder diffusion e confronto LLM).
 * Non usa tiktoken: approssimazione word-based adatta a prompt misti IT/EN.
 */

export type PromptTokenStats = {
  chars: number;
  words: number;
  /** Stima token CLIP/BPE (~0.75 token per parola, tipico encoder immagine). */
  estimatedClipTokens: number;
  /** Stima token stile GPT (~4 caratteri per token, utile per confronto costi LLM). */
  estimatedGptTokens: number;
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimatePromptTokens(text: string): PromptTokenStats {
  const trimmed = text.trim();
  const chars = trimmed.length;
  const words = countWords(trimmed);
  return {
    chars,
    words,
    estimatedClipTokens: Math.max(0, Math.ceil(words * 0.75)),
    estimatedGptTokens: Math.max(0, Math.ceil(chars / 4)),
  };
}

export function mergeStats(parts: PromptTokenStats[]): PromptTokenStats {
  return parts.reduce(
    (acc, p) => ({
      chars: acc.chars + p.chars,
      words: acc.words + p.words,
      estimatedClipTokens: acc.estimatedClipTokens + p.estimatedClipTokens,
      estimatedGptTokens: acc.estimatedGptTokens + p.estimatedGptTokens,
    }),
    { chars: 0, words: 0, estimatedClipTokens: 0, estimatedGptTokens: 0 }
  );
}

/** Payload effettivo inviato a Hugging Face (Flux unifica positivo + negativo). */
export function formatHuggingFaceImageInputs(positivePrompt: string, negativePrompt: string): string {
  const pos = positivePrompt.trim();
  const neg = negativePrompt.trim();
  return neg ? `${pos}. Do not show or include: ${neg}` : pos;
}
