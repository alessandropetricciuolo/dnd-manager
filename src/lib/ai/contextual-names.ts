import { generateOpenRouterChat } from "@/lib/ai/openrouter-client";
import { buildCampaignContextBlock } from "@/lib/campaign-context-prompt";
import { parseCampaignAiContextFromDb } from "@/lib/campaign-ai-context";
import { fetchLongCampaignWikiMemoryPromptBlock } from "@/lib/campaign-wiki-ai-memory";
import type { WikiMarkdownEntityType } from "@/lib/ai/wiki-text-generator";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";

const PLACEHOLDER_WIKI_TITLES = new Set([
  "nuovo npc",
  "nuova voce",
  "nuovo luogo",
  "nuovo mostro",
  "nuovo oggetto",
  "nuova lore",
  "nuovo item",
  "nuovo monster",
  "nuova location",
]);

const PLACEHOLDER_CHARACTER_NAMES = new Set(["nuovo personaggio", "personaggio", "nuovo pg"]);
const PLACEHOLDER_MISSION_TITLES = new Set(["nuova missione", "nuovo incarico"]);
const PLACEHOLDER_CAMPAIGN_TITLES = new Set(["nuova campagna", "nuova avventura", "nuovo oneshot"]);

export type ContextualNameKind =
  | WikiMarkdownEntityType
  | "character"
  | "mission"
  | "campaign";

function normalizeNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function isPlaceholderWikiTitle(title: string): boolean {
  const key = normalizeNameKey(title);
  return !key || PLACEHOLDER_WIKI_TITLES.has(key);
}

export function isPlaceholderCharacterName(name: string): boolean {
  const key = normalizeNameKey(name);
  return !key || PLACEHOLDER_CHARACTER_NAMES.has(key);
}

export function isPlaceholderMissionTitle(title: string): boolean {
  const key = normalizeNameKey(title);
  return !key || PLACEHOLDER_MISSION_TITLES.has(key);
}

export function isPlaceholderCampaignTitle(title: string): boolean {
  const key = normalizeNameKey(title);
  return !key || PLACEHOLDER_CAMPAIGN_TITLES.has(key);
}

export function isPlaceholderTitle(title: string, kind: ContextualNameKind): boolean {
  if (kind === "character") return isPlaceholderCharacterName(title);
  if (kind === "mission") return isPlaceholderMissionTitle(title);
  if (kind === "campaign") return isPlaceholderCampaignTitle(title);
  return isPlaceholderWikiTitle(title);
}

function wikiKindLabel(entityType: WikiMarkdownEntityType): string {
  switch (entityType) {
    case "npc":
      return "nome proprio per l'NPC";
    case "location":
      return "nome per il luogo";
    case "monster":
      return "nome per il mostro";
    case "item":
    case "magic_item":
      return "nome per l'oggetto";
    case "lore":
      return "titolo per la voce di lore";
    default:
      return "nome o titolo per la voce wiki";
  }
}

/** Istruzioni prompt quando il Master non ha dato un nome/titolo. */
export function wikiAutoNameInstruction(entityType: WikiMarkdownEntityType): string {
  return [
    "Il Master NON ha indicato un nome/titolo proprio.",
    `Inventa un ${wikiKindLabel(entityType)} originale e memorabile, coerente con il mondo, la cultura locale, i personaggi e i luoghi già noti della campagna.`,
    "Usa quel nome nel titolo Markdown (# ...) e nel testo.",
  ].join(" ");
}

export function wikiEntityNamePromptLine(
  entityType: WikiMarkdownEntityType,
  safeName: string
): string {
  if (isPlaceholderWikiTitle(safeName)) {
    return wikiAutoNameInstruction(entityType);
  }
  return `Il nome/titolo dell'entità è "${safeName}" (vincolato: non cambiarlo).`;
}

export function extractMarkdownH1(text: string): string | null {
  const source = text.replace(/^\[NARRATIVA\]\s*/i, "").trim();
  const match = source.match(/^#\s+(.+)$/m);
  const candidate = match?.[1]?.trim();
  if (!candidate) return null;
  if (candidate.length < 2 || candidate.length > 80) return null;
  return candidate;
}

function capitalizeTitle(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function resolveWikiTitleFromDescription(
  description: string,
  proposedTitle: string
): string {
  if (!isPlaceholderWikiTitle(proposedTitle)) return proposedTitle.trim();

  const fromH1 = extractMarkdownH1(description);
  if (fromH1 && !isPlaceholderWikiTitle(fromH1)) {
    return capitalizeTitle(fromH1);
  }

  return proposedTitle.trim();
}

/** Allinea il titolo # in testa al nome risolto. */
export function syncMarkdownTitle(description: string, title: string): string {
  const safeTitle = title.trim();
  if (!safeTitle) return description;

  const narrPrefix = /^\[NARRATIVA\]\s*/i.test(description) ? "[NARRATIVA]\n" : "";
  const body = description.replace(/^\[NARRATIVA\]\s*/i, "").trim();

  if (/^#\s+/m.test(body)) {
    const updated = body.replace(/^#\s+.+$/m, `# ${safeTitle}`);
    return narrPrefix ? `${narrPrefix}${updated}` : updated;
  }

  const withHeader = `# ${safeTitle}\n\n${body}`;
  return narrPrefix ? `${narrPrefix}${withHeader}` : withHeader;
}

async function loadCampaignNameContext(campaignId: string): Promise<string> {
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

const KIND_LABELS: Record<ContextualNameKind, string> = {
  npc: "nome proprio di un NPC",
  location: "nome di un luogo",
  monster: "nome di un mostro",
  item: "nome di un oggetto magico",
  magic_item: "nome di un oggetto magico",
  lore: "titolo di una voce lore",
  character: "nome proprio di un personaggio giocatore",
  mission: "titolo breve di una missione gilda",
  campaign: "titolo evocativo di una campagna",
};

/** Fallback dedicato se il nome non emerge dal testo generato. */
export async function generateContextualNameFromCampaign(
  campaignId: string,
  kind: ContextualNameKind,
  userPrompt: string,
  contentExcerpt?: string
): Promise<string | null> {
  const trimmed = userPrompt.trim();
  if (!trimmed) return null;

  const context = await loadCampaignNameContext(campaignId);
  const prompt = [
    "Sei un autore per D&D 5e. Il Master non ha indicato un nome/titolo.",
    `Inventa UN SOLO ${KIND_LABELS[kind]} coerente con la campagna.`,
    "Rispondi SOLO con il nome/titolo, senza virgolette, senza spiegazioni, massimo 6 parole.",
    "",
    "--- CONTESTO CAMPAGNA ---",
    context,
    contentExcerpt?.trim() ? `\n--- ESTRATTO BOZZA ---\n${contentExcerpt.trim().slice(0, 600)}` : "",
    "",
    "--- RICHIESTA MASTER ---",
    trimmed,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw = await generateOpenRouterChat(prompt, { temperature: 0.85, maxTokens: 40 });
    const candidate = raw
      .trim()
      .replace(/^["'«]|["'»]$/g, "")
      .replace(/^titolo[:\s]+/i, "")
      .split("\n")[0]
      ?.trim();
    if (!candidate || candidate.length < 2 || candidate.length > 80) return null;
    if (isPlaceholderTitle(candidate, kind)) return null;
    return capitalizeTitle(candidate);
  } catch {
    return null;
  }
}

export const AUTO_NAME_MISSION_HINT = `Il Master NON ha indicato un titolo: inventa un titolo breve ed evocativo coerente con il mondo della campagna e la bacheca gilda.`;

export const AUTO_NAME_CAMPAIGN_HINT = `Il Master NON ha indicato un titolo per la campagna: inventa un titolo evocativo coerente con ambientazione e tono descritti.`;

export const AUTO_NAME_CHARACTER_HINT = `Il Master NON ha indicato un nome per il PG: inventa un nome proprio coerente con la cultura e il mondo della campagna e includilo nel campo "character_name".`;
