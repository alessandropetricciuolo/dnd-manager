import { NextResponse } from "next/server";

/**
 * Route temporanea per verificare che le variabili Supabase siano caricate.
 * Apri http://localhost:3001/api/check-env (o la tua porta).
 * Elimina questo file quando tutto funziona.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const aiText = process.env.AI_TEXT_PROVIDER?.trim() || "(default huggingface)";
  const aiImage = process.env.AI_IMAGE_PROVIDER?.trim() || "(default huggingface)";
  const ollamaUrl = process.env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434 (default)";
  const ollamaModel = process.env.OLLAMA_MODEL?.trim() || "llama3 (default)";
  const hfKey = !!(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN);
  const openrouterKey = !!process.env.OPENROUTER_API_KEY?.trim();
  const openrouterModel = process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini (default)";
  const openrouterEmbeddingModel =
    process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || "openai/text-embedding-3-small (default, 384d)";
  const siliconflowKey = !!process.env.SILICONFLOW_API_KEY?.trim();
  const siliconflowModel =
    process.env.SILICONFLOW_IMAGE_MODEL?.trim() ||
    "Kwai-Kolors/Kolors (default, con fallback automatico)";

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: url ? "impostata" : "MANCANTE",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? "impostata" : "MANCANTE",
    ok: !!(url && anonKey),
    AI_TEXT_PROVIDER: aiText,
    AI_IMAGE_PROVIDER: aiImage,
    OPENROUTER_API_KEY: openrouterKey ? "impostata" : "MANCANTE",
    OPENROUTER_MODEL: openrouterModel,
    OPENROUTER_EMBEDDING_MODEL: openrouterEmbeddingModel,
    OLLAMA_BASE_URL: ollamaUrl,
    OLLAMA_MODEL: ollamaModel,
    HUGGINGFACE_API_KEY_o_HF_TOKEN: hfKey ? "impostata (serve per embedding RAG / immagini HF)" : "MANCANTE",
    SILICONFLOW_API_KEY: siliconflowKey ? "impostata" : "MANCANTE",
    SILICONFLOW_IMAGE_MODEL: siliconflowModel,
  });
}
