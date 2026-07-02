import { generateOpenRouterChat } from "@/lib/ai/openrouter-client";
import { buildCampaignContextBlock } from "@/lib/campaign-context-prompt";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import { fetchLongCampaignWikiMemoryPromptBlock } from "@/lib/campaign-wiki-ai-memory";
import { extractJsonObject } from "@/modules/command-center/ai-control-plane/interpreter";
import { formatCharacterStoryForChat } from "@/modules/command-center/ai-control-plane/character-proposal-shared";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";

export type CharacterAiStoryDraft = {
  characterStory: string;
};

const CREATE_SYSTEM_PROMPT = `Sei un narratore per D&D 5e. Il Master vuole creare un nuovo personaggio giocatore (PG).

Genera SOLO la storia narrativa del personaggio (background, legami, motivazioni, tratti evidenti al tavolo).
NON scegliere razza, classe, background meccanico o statistiche: li compilerà il Master nel generatore scheda.

Rispondi SOLO con JSON valido:
{
  "character_story": "2-4 paragrafi in italiano, tono da scheda PG"
}

Regole:
- Coerente con il contesto di campagna se fornito
- Utile per roleplay, non meta-gioco
- Niente elenchi di regole o numeri di scheda`;

const REFINE_SYSTEM_PROMPT = `Aggiorna la storia narrativa del PG in base alle richieste del Master.

Rispondi SOLO con JSON: { "character_story": "..." }`;

async function loadCharacterStoryContext(campaignId: string): Promise<string> {
  const admin = createSupabaseAdminClient();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("name, description, type, ai_context")
    .eq("id", campaignId)
    .maybeSingle();

  if (!campaign) {
    return "Fantasy D&D 5e, tono epico-verosimile.";
  }

  const row = campaign as {
    name?: string | null;
    description?: string | null;
    type?: string | null;
    ai_context?: Json | null;
  };

  const blocks: string[] = [];
  if (row.name?.trim()) blocks.push(`Campagna: ${row.name.trim()}`);
  if (row.description?.trim()) blocks.push(`Sinossi:\n${row.description.trim()}`);
  blocks.push(buildCampaignContextBlock(parseCampaignAiContextFromDb(row.ai_context ?? null)));

  if (row.type === "long") {
    const wiki = await fetchLongCampaignWikiMemoryPromptBlock(admin, campaignId);
    if (wiki.trim()) blocks.push(wiki);
  }

  return blocks.join("\n\n");
}

export function parseCharacterStoryJson(
  raw: string
): { ok: true; data: CharacterAiStoryDraft } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    return { ok: false, error: "Il modello non ha restituito JSON valido per la storia del PG." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Risposta storia PG non valida." };
  }

  const o = parsed as Record<string, unknown>;
  const rawStory = o.character_story;
  const story = typeof rawStory === "string" ? rawStory.trim() : "";

  if (!story) {
    return { ok: false, error: "Storia del personaggio mancante nella risposta AI." };
  }

  return { ok: true, data: { characterStory: story } };
}

export async function generateCharacterStoryFromPrompt(
  campaignId: string,
  userPrompt: string,
  characterName?: string
): Promise<
  { ok: true; draft: CharacterAiStoryDraft; assistantMessage: string } | { ok: false; error: string }
> {
  const trimmed = userPrompt.trim();
  if (!trimmed) return { ok: false, error: "Descrivi il personaggio che vuoi creare." };

  const context = await loadCharacterStoryContext(campaignId);
  const prompt = [
    CREATE_SYSTEM_PROMPT,
    "",
    "--- CONTESTO CAMPAGNA ---",
    context,
    characterName ? `Nome PG suggerito: ${characterName}` : "",
    "",
    "--- RICHIESTA MASTER ---",
    trimmed,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.75, maxTokens: 1400 });
    const parsed = parseCharacterStoryJson(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const name = characterName?.trim() || "Nuovo personaggio";
    return {
      ok: true,
      draft: parsed.data,
      assistantMessage: formatCharacterStoryForChat(name, parsed.data),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore generazione storia PG.",
    };
  }
}

export async function refineCharacterStoryFromPrompt(
  campaignId: string,
  userPrompt: string,
  currentStory: string,
  characterName?: string
): Promise<
  { ok: true; draft: CharacterAiStoryDraft; assistantMessage: string } | { ok: false; error: string }
> {
  const context = await loadCharacterStoryContext(campaignId);
  const prompt = [
    REFINE_SYSTEM_PROMPT,
    "",
    "--- CONTESTO CAMPAGNA ---",
    context,
    "",
    "--- STORIA ATTUALE ---",
    currentStory,
    "",
    "--- RICHIESTA MODIFICA ---",
    userPrompt.trim(),
  ].join("\n");

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.6, maxTokens: 1400 });
    const parsed = parseCharacterStoryJson(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    const name = characterName?.trim() || "Personaggio";
    return {
      ok: true,
      draft: parsed.data,
      assistantMessage: formatCharacterStoryForChat(name, parsed.data),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Errore aggiornamento storia PG.",
    };
  }
}
