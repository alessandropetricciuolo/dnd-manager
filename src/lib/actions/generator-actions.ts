'use server';

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { generateEmbedding } from "@/lib/ai/huggingface-client";

export type GenerateSheetResult = {
  success: boolean;
  message: string;
};

export async function generateSheetAction(
  formData: FormData
): Promise<GenerateSheetResult> {
  const characterName = (formData.get("characterName") as string | null)?.trim() ?? "";
  const race = (formData.get("race") as string | null)?.trim() ?? "";
  const dndClass = (formData.get("dndClass") as string | null)?.trim() ?? "";
  const level = (formData.get("level") as string | null)?.trim() ?? "";

  if (!race || !dndClass || !level) {
    return {
      success: false,
      message: "Compila razza, classe e livello.",
    };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const searchQuery = `Manuale D&D: Regole, privilegi e capacità della classe ${dndClass} fino al livello ${level}. Tratti razziali della razza ${race}.`;
    const embedding = await generateEmbedding(searchQuery);

    const { data: chunks, error } = await supabase.rpc("match_manuals_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.3,
      match_count: 10,
    });

    if (error) {
      return {
        success: false,
        message: `Errore RPC match_manuals_knowledge: ${error.message}`,
      };
    }

    const list = (chunks ?? []) as Array<{ content?: string | null }>;
    const retrievedContext = list
      .map((c) => (typeof c.content === "string" ? c.content.trim() : ""))
      .filter(Boolean)
      .join("\n\n");

    const preview = retrievedContext
      ? retrievedContext.slice(0, 500)
      : "Nessun chunk rilevante trovato.";
    const ellipsis = retrievedContext.length > 500 ? "…" : "";

    return {
      success: true,
      message: `Ricerca dati per ${race} ${dndClass} di livello ${level} avviata... (PG: ${characterName || "senza nome"})\n\nContesto recuperato:\n${preview}${ellipsis}`,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Errore durante il retrieval semantico: ${error.message}`
          : "Errore imprevisto durante il retrieval semantico.",
    };
  }
}
