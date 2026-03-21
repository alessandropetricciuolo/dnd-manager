'use server';

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { generateCharacterSheetJSON, generateEmbedding } from "@/lib/ai/huggingface-client";

export type GenerateSheetResult = {
  success: boolean;
  message: string;
  sheetData?: Record<string, unknown>;
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
    // La signature RPC non e' ancora tipizzata nel Database generated type.
    const runRpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const searchQuery = `Manuale D&D: Regole, privilegi e capacità della classe ${dndClass} fino al livello ${level}. Tratti razziali della razza ${race}.`;
    let list: Array<{ content?: string | null }> = [];
    let retrievalMode = "semantic";

    try {
      const embedding = await generateEmbedding(searchQuery);
      const { data: chunks, error } = await runRpc("match_manuals_knowledge", {
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
      list = (chunks ?? []) as Array<{ content?: string | null }>;
    } catch (embeddingErr) {
      // Fallback runtime: se gli embeddings non sono disponibili sul provider,
      // manteniamo operativo il generatore con retrieval testuale best-effort.
      retrievalMode = "text-fallback";
      console.error("[generateSheetAction] embedding retrieval failed, fallback text search", embeddingErr);

      const keywords = [dndClass, race]
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2);

      const primary = keywords[0] ?? "";
      const secondary = keywords[1] ?? "";

      let query = supabase.from("manuals_knowledge").select("content").limit(10);
      if (primary) query = query.ilike("content", `%${primary}%`);
      if (secondary) query = query.ilike("content", `%${secondary}%`);
      const { data: rows, error: textErr } = await query;

      if (textErr) {
        return {
          success: false,
          message: `Errore fallback testuale manuals_knowledge: ${textErr.message}`,
        };
      }
      list = (rows ?? []) as Array<{ content?: string | null }>;
    }

    const retrievedContext = list
      .map((c) => (typeof c.content === "string" ? c.content.trim() : ""))
      .filter(Boolean)
      .join("\n\n");

    const preview = retrievedContext
      ? retrievedContext.slice(0, 500)
      : "Nessun chunk rilevante trovato.";
    const ellipsis = retrievedContext.length > 500 ? "…" : "";

    const rawJsonString = await generateCharacterSheetJSON(
      `Genera la scheda per ${characterName}, un ${race} ${dndClass} di livello ${level}.`,
      retrievedContext
    );

    let sheetData: Record<string, unknown>;
    try {
      const parsed = JSON.parse(rawJsonString) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Il modello non ha restituito un oggetto JSON valido.");
      }
      sheetData = parsed as Record<string, unknown>;
    } catch (parseError) {
      console.error("[generateSheetAction] parse JSON failed", parseError);
      console.error("[generateSheetAction] raw JSON string", rawJsonString);
      return {
        success: false,
        message: "JSON non valido restituito dal modello. Controlla i log server.",
      };
    }

    return {
      success: true,
      message: `Ricerca dati per ${race} ${dndClass} di livello ${level} avviata... (PG: ${characterName || "senza nome"}) [mode: ${retrievalMode}]\n\nContesto recuperato:\n${preview}${ellipsis}`,
      sheetData,
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
