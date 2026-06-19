import type { Json } from "@/types/database.types";
import { extractWikiContentBody } from "@/lib/campaign-wiki-ai-memory";

type AdminClient = ReturnType<typeof import("@/utils/supabase/admin").createSupabaseAdminClient>;

export type ImagePromptEntityReference = {
  id: string;
  name: string;
  source: "wiki" | "character";
  referenceLine: string;
};

export type ResolveImagePromptEntityReferencesOptions = {
  excludeEntityId?: string;
  /** Testo in cui cercare citazioni (descrizione wiki + titolo opzionale). */
  searchText: string;
  maxReferences?: number;
  maxSnippetChars?: number;
};

const DEFAULT_MAX_REFERENCES = 4;
const DEFAULT_SNIPPET_CHARS = 240;

/** True se `entityName` compare nel testo come token (case-insensitive, confini parola Unicode). */
export function textMentionsEntityName(haystack: string, entityName: string): boolean {
  const name = entityName.trim();
  if (name.length < 2) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, "iu");
  return re.test(haystack);
}

function stripMarkdownForSnippet(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*|__|\*|_/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prima frase utile, oppure estratto compatto per prompt immagine. */
export function compressBodyToReferenceSnippet(body: string, maxChars: number): string {
  const plain = stripMarkdownForSnippet(body);
  if (!plain) return "";
  const sentenceMatch = plain.match(/^[^.!?]+[.!?]?/);
  let snippet = (sentenceMatch?.[0] ?? plain).trim();
  if (snippet.length > maxChars) {
    snippet = `${snippet.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
  }
  return snippet;
}

export function formatEntityReferenceLine(entityName: string, snippet: string): string {
  const clean = snippet.trim();
  if (!clean) return "";
  return `Setting reference — ${entityName.trim()}: ${clean}`;
}

type WikiMemRow = {
  id: string;
  name: string;
  content: Json;
  include_in_campaign_ai_memory?: boolean;
};

type CharacterMemRow = {
  id: string;
  name: string;
  background: string | null;
};

/**
 * Campagne long: include solo voci wiki/PG la cui **denominazione** compare nel testo utente.
 * Output: righe «Setting reference — Nome: …».
 */
export async function resolveImagePromptEntityReferences(
  admin: AdminClient,
  campaignId: string,
  options: ResolveImagePromptEntityReferencesOptions
): Promise<{ references: ImagePromptEntityReference[]; searchHaystack: string }> {
  const searchHaystack = options.searchText.trim();
  const maxReferences = options.maxReferences ?? DEFAULT_MAX_REFERENCES;
  const maxSnippetChars = options.maxSnippetChars ?? DEFAULT_SNIPPET_CHARS;
  const excludeId = options.excludeEntityId?.trim() || undefined;

  if (!searchHaystack) {
    return { references: [], searchHaystack };
  }

  const { data: camp } = await admin.from("campaigns").select("type").eq("id", campaignId).maybeSingle();
  const campaignType = (camp as { type?: string | null } | null)?.type;
  if (campaignType !== "long") {
    return { references: [], searchHaystack };
  }

  const { data: wikiRaw } = await admin
    .from("wiki_entities")
    .select("id, name, content, include_in_campaign_ai_memory")
    .eq("campaign_id", campaignId);

  const { data: charactersRaw } = await admin
    .from("campaign_characters")
    .select("id, name, background")
    .eq("campaign_id", campaignId);

  const wikiCandidates = ((wikiRaw ?? []) as WikiMemRow[])
    .filter((row) => row.include_in_campaign_ai_memory === true)
    .filter((row) => !excludeId || row.id !== excludeId)
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      source: "wiki" as const,
      body: extractWikiContentBody(row.content as Json),
    }))
    .filter((row) => row.name.length >= 2 && row.body.length > 0);

  const characterCandidates = ((charactersRaw ?? []) as CharacterMemRow[])
    .filter((row) => !excludeId || row.id !== excludeId)
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      source: "character" as const,
      body: typeof row.background === "string" ? row.background.trim() : "",
    }))
    .filter((row) => row.name.length >= 2 && row.body.length > 0);

  const allCandidates = [...wikiCandidates, ...characterCandidates].sort(
    (a, b) => b.name.length - a.name.length
  );

  const references: ImagePromptEntityReference[] = [];
  const matchedIds = new Set<string>();

  for (const candidate of allCandidates) {
    if (references.length >= maxReferences) break;
    if (matchedIds.has(candidate.id)) continue;
    if (!textMentionsEntityName(searchHaystack, candidate.name)) continue;

    const snippet = compressBodyToReferenceSnippet(candidate.body, maxSnippetChars);
    const referenceLine = formatEntityReferenceLine(candidate.name, snippet);
    if (!referenceLine) continue;

    matchedIds.add(candidate.id);
    references.push({
      id: candidate.id,
      name: candidate.name,
      source: candidate.source,
      referenceLine,
    });
  }

  return { references, searchHaystack };
}

export function buildEntityReferencesPromptBlock(references: ImagePromptEntityReference[]): string {
  if (!references.length) return "";
  return references.map((r) => r.referenceLine).join("\n");
}
