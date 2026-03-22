'use server';

import type { Json } from "@/types/database.types";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateAiText, generateEmbedding, HuggingFaceInferenceError } from "@/lib/ai/huggingface-client";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";

export type WikiMarkdownEntityType = "npc" | "location" | "item" | "lore" | "monster" | "magic_item";

export type WikiMarkdownExtraParams = {
  cr?: string;
  rarity?: string;
};

export type ExtractedWikiStats = {
  ac: string | null;
  hp: string | null;
  cr: string | null;
};

export type GenerateWikiMarkdownResult =
  | { success: true; description: string; statblock: string; stats?: ExtractedWikiStats }
  | { success: false; message: string };

function cleanSingleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractStatsFromMarkdown(markdown: string): ExtractedWikiStats {
  const source = markdown.replace(/\r/g, "");

  const acMatch =
    source.match(/(?:Classe\s+Armatura|Armor\s+Class|CA)\*{0,2}\s*[:\-]\s*(\d{1,3})/i) ??
    source.match(/\bAC\*{0,2}\s*[:\-]\s*(\d{1,3})/i);

  const hpMatch =
    source.match(/(?:Punti\s+Vita|Hit\s+Points|HP|PF)\*{0,2}\s*[:\-]\s*(\d{1,4})/i) ??
    source.match(/\bHP\*{0,2}\s*[:\-]\s*(\d{1,4})/i);

  const crMatch =
    source.match(/(?:Grado\s+di\s+Sfida|Challenge\s+Rating|CR|GS)\*{0,2}\s*[:\-]\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)/i) ??
    source.match(/\bCR\*{0,2}\s*[:\-]\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)/i);

  return {
    ac: acMatch?.[1] ?? null,
    hp: hpMatch?.[1] ?? null,
    cr: crMatch?.[1]?.trim() ?? null,
  };
}

function splitNarrativeAndMechanics(raw: string): { description: string; statblock: string } {
  const source = raw.replace(/\r/g, "").trim();
  const narrativeMatch = source.match(/\[NARRATIVA\]([\s\S]*?)\[MECCANICA\]/i);
  const mechanicMatch = source.match(/\[MECCANICA\]([\s\S]*)/i);

  const description = narrativeMatch ? narrativeMatch[1].trim() : source;
  const statblock = mechanicMatch ? mechanicMatch[1].trim() : "";
  return { description, statblock };
}

export async function generateWikiMarkdownAction(
  campaignId: string,
  entityType: WikiMarkdownEntityType,
  name: string,
  userPrompt: string,
  extraParams: WikiMarkdownExtraParams = {}
): Promise<GenerateWikiMarkdownResult> {
  const safeName = cleanSingleLine(name ?? "");
  const safeUserPrompt = cleanSingleLine(userPrompt ?? "");
  if (!campaignId) return { success: false, message: "Campagna non valida." };
  if (!safeName) return { success: false, message: "Inserisci un nome valido." };

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, message: "Devi essere autenticato." };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "gm" && profile?.role !== "admin") {
      return { success: false, message: "Solo GM e Admin possono generare contenuti AI." };
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("ai_context")
      .eq("id", campaignId)
      .single();
    if (campaignError) {
      return { success: false, message: campaignError.message ?? "Impossibile leggere la campagna." };
    }

    const ctx = parseCampaignAiContextFromDb((campaign as { ai_context: Json | null } | null)?.ai_context ?? null);
    const loreTone = ctx?.narrative_tone?.trim() || "fantasy epico e coerente con D&D 5e";
    const magicLevel = ctx?.magic_level?.trim() || "livello di magia standard D&D 5e";
    const mechanics = ctx?.mechanics_focus?.trim() || "regole ufficiali D&D 5e";
    const cr = cleanSingleLine(extraParams.cr ?? "");
    const rarity = cleanSingleLine(extraParams.rarity ?? "");

    const normalizedType: Exclude<WikiMarkdownEntityType, "magic_item"> =
      entityType === "magic_item" ? "item" : entityType;

    const templateInstructionMap: Record<Exclude<WikiMarkdownEntityType, "magic_item">, string> = {
      monster: [
        "Genera una scheda MONSTRO in Markdown pronta per wiki GM.",
        "Usa sezioni in quest'ordine:",
        "1) # Nome",
        "2) > Tag: Mostro, CR",
        "3) ## Panoramica",
        "4) ## Stat Block (tabella markdown con CA, PF, Velocita', FOR, DES, COS, INT, SAG, CAR, TS, Abilita', Sensi, Linguaggi, CR, PE)",
        "5) ## Tratti",
        "6) ## Azioni",
        "7) ## Reazioni (se presenti)",
        "8) ## Azioni Leggendarie (se presenti)",
        "9) ## Tattiche e uso al tavolo",
      ].join("\n"),
      npc: [
        "Genera una scheda NPC in Markdown pronta per wiki GM.",
        "Usa sezioni in quest'ordine:",
        "1) # Nome",
        "2) > Tag: NPC",
        "3) ## Aspetto",
        "4) ## Tratti Caratteriali",
        "5) ### Ideali",
        "6) ### Legami",
        "7) ### Difetti",
        "8) ## Ruolo / Occupazione",
        "9) ## Segreti / Rumors",
      ].join("\n"),
      location: [
        "Genera una scheda LUOGO in Markdown pronta per wiki GM.",
        "Usa sezioni in quest'ordine:",
        "1) # Nome",
        "2) > Tag: Luogo",
        "3) ## Atmosfera / Clima",
        "4) ## Punti di Interesse principali",
        "5) ## Abitanti notevoli",
        "6) ## Spunti per Avventure (Plot Hooks)",
      ].join("\n"),
      item: [
        "Genera una scheda OGGETTO MAGICO in Markdown pronta per wiki GM.",
        "Usa sezioni in quest'ordine:",
        "1) # Nome",
        "2) > Tag: Oggetto Magico, Rarita', Sintonia",
        "3) ## Tipologia / Rarita'",
        "4) ## Requisiti di Sintonia",
        "5) ## Aspetto Visivo",
        "6) ## Meccaniche / Regole esatte",
      ].join("\n"),
      lore: [
        "Genera una scheda LORE narrativa in Markdown pronta per wiki GM.",
        "Usa sezioni in quest'ordine:",
        "1) # Titolo",
        "2) > Tag: Lore",
        "3) ## Contesto Storico",
        "4) ## Fazioni Coinvolte",
        "5) ## Impatto attuale sul mondo",
      ].join("\n"),
    };

    const paramLine =
      normalizedType === "monster"
        ? `Parametro richiesto: CR target = ${cr || "scegli un CR bilanciato rispetto alle regole."}`
        : normalizedType === "item"
          ? `Parametro richiesto: Rarita' target = ${rarity || "scegli una rarita' coerente e bilanciata."}`
          : "Parametro richiesto: mantieni coerenza con ambientazione, tono e regole della campagna.";

    let prompt = [
      "Sei un Senior D&D 5e Content Designer.",
      `Tono campagna: ${loreTone}`,
      `Livello magia: ${magicLevel}`,
      `Focus meccanico: ${mechanics}`,
      `Tipo elemento: ${normalizedType}`,
      `RICHIESTA SPECIFICA DELL'UTENTE: Il nome dell'entità è "${safeName}". Segui queste istruzioni per i dettagli: "${safeUserPrompt || "Nessuna istruzione aggiuntiva."}".`,
      `Nome elemento: ${safeName}`,
      paramLine,
      templateInstructionMap[normalizedType],
      "Devi dividere la tua risposta esattamente in due parti usando questi delimitatori esatti: inizia la descrizione narrativa con il tag [NARRATIVA] e inizia lo statblock con il tag [MECCANICA]. Non inserire testo prima di [NARRATIVA].",
      "Rispondi SOLO con Markdown valido, senza JSON e senza testo extra prima/dopo.",
    ].join("\n\n");

    if (normalizedType === "monster") {
      const searchQuery = `Regole, privilegi e statblock completo del mostro: ${safeName}. Dettagli: ${safeUserPrompt || "nessuno"}.`;
      let technicalContext = "";

      try {
        const embedding = await generateEmbedding(searchQuery);
        // Tipizzazione RPC best-effort: la firma generated potrebbe non includere ancora la funzione.
        const runRpc = supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ data: unknown; error: { message: string } | null }>;

        const { data: chunks, error: rpcError } = await runRpc("match_manuals_knowledge", {
          query_embedding: embedding,
          match_threshold: 0.35,
          match_count: 5,
        });

        if (rpcError) {
          return { success: false, message: `Errore RPC match_manuals_knowledge: ${rpcError.message}` };
        }

        const list = (chunks ?? []) as Array<{ content?: string | null }>;
        technicalContext = list
          .map((c) => (typeof c.content === "string" ? c.content.trim() : ""))
          .filter(Boolean)
          .join("\n\n");
      } catch (ragError) {
        console.error("[generateWikiMarkdownAction] RAG retrieval failed", ragError);
        return { success: false, message: "Errore durante il retrieval tecnico dai manuali." };
      }

      if (!technicalContext.trim()) {
        return {
          success: false,
          message: "Nessuna informazione tecnica trovata nei manuali per questo mostro.",
        };
      }

      prompt = [
        "Sei un motore di formattazione.",
        `[CONTESTO TECNICO]:\n${technicalContext}`,
        `RICHIESTA SPECIFICA DELL'UTENTE: Il nome dell'entità è "${safeName}". Segui queste istruzioni per i dettagli: "${safeUserPrompt || "Nessuna istruzione aggiuntiva."}".`,
        `Nome mostro richiesto: ${safeName}`,
        `Grado di Sfida target: ${cr || "1"}`,
        "Usa ESCLUSIVAMENTE il [CONTESTO TECNICO] fornito.",
        "Se contiene lo statblock di un mostro diverso, ignoralo.",
        "Se non contiene nulla, restituisci solo il messaggio di errore: NO_TECHNICAL_DATA.",
        `Se contiene i dati, compila il template Markdown seguente bilanciando matematica (PF, CA, Danni) e attacchi per GS ${cr || "1"}:`,
        templateInstructionMap.monster,
        "Devi dividere la tua risposta esattamente in due parti usando questi delimitatori esatti: inizia la descrizione narrativa con il tag [NARRATIVA] e inizia lo statblock con il tag [MECCANICA]. Non inserire testo prima di [NARRATIVA].",
        "NO parole extra prima o dopo.",
      ].join("\n\n");
    }

    let markdown = "";
    try {
      markdown = (await generateAiText(prompt)).trim();
    } catch (err) {
      const msg =
        err instanceof HuggingFaceInferenceError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Errore generazione testo AI.";
      return { success: false, message: msg };
    }

    const normalized = markdown
      .replace(/^```markdown\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    if (normalized === "NO_TECHNICAL_DATA") {
      return {
        success: false,
        message: "Nessuna informazione tecnica trovata nei manuali per questo mostro.",
      };
    }

    if (!normalized) {
      return { success: false, message: "Il modello non ha restituito contenuto markdown." };
    }

    const { description, statblock } = splitNarrativeAndMechanics(normalized);
    const extractedStats = normalizedType === "monster" ? extractStatsFromMarkdown(statblock) : undefined;

    return {
      success: true,
      description,
      statblock,
      stats: extractedStats,
    };
  } catch (err) {
    console.error("[generateWikiMarkdownAction]", err);
    return { success: false, message: "Errore imprevisto durante la generazione." };
  }
}
