/**
 * Generazione testo/immagine contestualizzata con iniezione di ai_context (Fase 2).
 * Solo lato server (usa Supabase + Hugging Face).
 */

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";
import { generateAiText, HuggingFaceInferenceError } from "@/lib/ai/huggingface-client";
import {
  parseCampaignAiContextFromDb,
  type CampaignAiContext,
} from "@/lib/campaign-ai-context";
import { fetchLongCampaignWikiMemoryPromptBlock } from "@/lib/campaign-wiki-ai-memory";

export type WikiGeneratorEntityType = "npc" | "location" | "item" | "lore";

export type WikiAiTextGeneration = {
  title: string;
  content: string;
  hp: string | null;
  ac: string | null;
};

type TextResult = { ok: true; data: WikiAiTextGeneration } | { ok: false; error: string };

const ENTITY_LABEL_IT: Record<WikiGeneratorEntityType, string> = {
  npc: "NPC (personaggio non giocante)",
  location: "luogo / location",
  item: "oggetto (magico o mundano, come da contesto)",
  lore: "voce di lore (background, storia del mondo, mito o evento)",
};

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function optionalStat(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "string") {
    const t = v.trim();
    return t.length ? t : null;
  }
  return null;
}

/** Contesto narrativo/meccanico dei paletti Architetto (testo + immagini). */
export function buildCampaignContextBlock(ctx: CampaignAiContext | null): string {
  if (!ctx) {
    return "Il Master non ha ancora salvato i paletti AI della campagna; resta coerente con fantasy D&D 5e e con il tono epico/verosimile tipico del gioco.";
  }
  return [
    "Contesto di campagna (rispetta questi paletti):",
    `L'ambientazione ha questo tono: ${ctx.narrative_tone}`,
    `La magia funziona così: ${ctx.magic_level}`,
    `Enfatizza queste meccaniche/regole 5e: ${ctx.mechanics_focus}`,
  ].join("\n");
}

/**
 * Genera testo wiki strutturato (titolo, corpo markdown, hp/ca opzionali) con super-prompt blindato.
 */
export async function generateContextualText(
  campaignId: string,
  userPrompt: string,
  entityType: WikiGeneratorEntityType,
  options?: { excludeWikiEntityId?: string }
): Promise<TextResult> {
  const prompt = userPrompt.trim();
  if (!prompt) {
    return { ok: false, error: "Inserisci una richiesta per l’AI." };
  }
  if (!campaignId) {
    return { ok: false, error: "Campagna non valida." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const { data: row, error } = await admin
      .from("campaigns")
      .select("ai_context, type")
      .eq("id", campaignId)
      .single();

    if (error) {
      console.error("[generateContextualText] fetch ai_context", error);
      return { ok: false, error: error.message ?? "Impossibile caricare il contesto campagna." };
    }

    const ctx = parseCampaignAiContextFromDb(
      (row as { ai_context: Json | null } | null)?.ai_context ?? null
    );

    const wikiMemory =
      (row as { type?: string }).type === "long"
        ? await fetchLongCampaignWikiMemoryPromptBlock(admin, campaignId, {
            excludeEntityId: options?.excludeWikiEntityId,
          })
        : "";

    const ruleBase = `Sei un Game Master di D&D 5e. Devi generare un ${ENTITY_LABEL_IT[entityType]}. Tutte le statistiche devono rispettare fedelmente le regole di D&D 5e.`;

    const contextBlock = buildCampaignContextBlock(ctx);

    const userRequest = `Crea questo elemento: ${prompt}`;

    const outputForce =
      "Rispondi ESCLUSIVAMENTE con un oggetto JSON valido contenente le chiavi: title (string), content (string, formattato in markdown), hp e ac (string o numero; usa null se non applicabili per questa entità, es. lore senza combattimento). Non usare markdown fuori dal valore della chiave content.";

    const fullPrompt = [ruleBase, contextBlock, wikiMemory, userRequest, outputForce]
      .filter((s) => typeof s === "string" && s.trim().length > 0)
      .join("\n\n");

    let rawText: string;
    try {
      rawText = await generateAiText(fullPrompt);
    } catch (e) {
      const msg =
        e instanceof HuggingFaceInferenceError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Errore durante la chiamata al modello AI.";
      return { ok: false, error: msg };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(extractJsonObject(rawText));
    } catch {
      return { ok: false, error: "La risposta dell’AI non è un JSON valido. Riprova." };
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Formato JSON non valido." };
    }

    const o = parsed as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const content = typeof o.content === "string" ? o.content.trim() : "";

    if (!title || !content) {
      return { ok: false, error: "Il JSON deve includere title e content non vuoti." };
    }

    const data: WikiAiTextGeneration = {
      title,
      content,
      hp: optionalStat(o.hp),
      ac: optionalStat(o.ac),
    };

    return { ok: true, data };
  } catch (err) {
    console.error("[generateContextualText]", err);
    return { ok: false, error: "Errore imprevisto durante la generazione." };
  }
}

