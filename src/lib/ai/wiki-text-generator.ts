'use server';

import type { Json } from "@/types/database.types";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateAiText, HuggingFaceInferenceError } from "@/lib/ai/huggingface-client";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";

export type WikiMarkdownEntityType = "monster" | "magic_item";

export type WikiMarkdownExtraParams = {
  cr?: string;
  rarity?: string;
};

export type GenerateWikiMarkdownResult =
  | { success: true; markdown: string }
  | { success: false; message: string };

function cleanSingleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function generateWikiMarkdownAction(
  campaignId: string,
  entityType: WikiMarkdownEntityType,
  name: string,
  extraParams: WikiMarkdownExtraParams = {}
): Promise<GenerateWikiMarkdownResult> {
  const safeName = cleanSingleLine(name ?? "");
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

    const templateInstruction =
      entityType === "monster"
        ? [
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
          ].join("\n")
        : [
            "Genera una scheda OGGETTO MAGICO in Markdown pronta per wiki GM.",
            "Usa sezioni in quest'ordine:",
            "1) # Nome",
            "2) > Tag: Oggetto Magico, Rarita', Sintonia",
            "3) ## Descrizione",
            "4) ## Proprieta' meccaniche",
            "5) ## Regole D&D 5e (uso, limiti, ricariche, CD se applicabili)",
            "6) ## Bilanciamento e note GM",
            "7) ## Ganci narrativi",
          ].join("\n");

    const paramLine =
      entityType === "monster"
        ? `Parametro richiesto: CR target = ${cr || "scegli un CR bilanciato rispetto alle regole."}`
        : `Parametro richiesto: Rarita' target = ${rarity || "scegli una rarita' coerente e bilanciata."}`;

    const prompt = [
      "Sei un Senior D&D 5e Content Designer.",
      `Tono campagna: ${loreTone}`,
      `Livello magia: ${magicLevel}`,
      `Focus meccanico: ${mechanics}`,
      `Tipo elemento: ${entityType === "monster" ? "Mostro" : "Oggetto Magico"}`,
      `Nome elemento: ${safeName}`,
      paramLine,
      templateInstruction,
      "Rispondi SOLO con Markdown valido, senza JSON e senza testo extra prima/dopo.",
    ].join("\n\n");

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

    if (!normalized) {
      return { success: false, message: "Il modello non ha restituito contenuto markdown." };
    }

    return { success: true, markdown: normalized };
  } catch (err) {
    console.error("[generateWikiMarkdownAction]", err);
    return { success: false, message: "Errore imprevisto durante la generazione." };
  }
}
