import type { Json } from "@/types/database.types";
import { extractWikiEntityMemoryText } from "@/lib/campaign-wiki-ai-memory";

type AdminClient = ReturnType<typeof import("@/utils/supabase/admin").createSupabaseAdminClient>;

export type ImagePromptEntityReference = {
  id: string;
  name: string;
  source: "wiki" | "character" | "map";
  referenceLine: string;
};

export type ResolveImagePromptEntityReferencesOptions = {
  excludeEntityId?: string;
  /** Testo in cui cercare citazioni (descrizione wiki + titolo opzionale). */
  searchText: string;
  maxReferences?: number;
  maxSnippetChars?: number;
};

export type ImagePromptEntityReferenceDiagnostics = {
  searchHaystack: string;
  wikiMemoryCount: number;
  mapCount: number;
  characterCount: number;
  references: ImagePromptEntityReference[];
};

const DEFAULT_MAX_REFERENCES = 4;
const DEFAULT_SNIPPET_CHARS = 240;
/** Parole distintive estratte dal nome entità per match parziale (es. «Druven» in «Regno di Druven»). */
const MIN_PARTIAL_NAME_WORD_CHARS = 4;

/** True se `entityName` compare nel testo come token (case-insensitive, confini parola Unicode). */
export function textMentionsEntityName(haystack: string, entityName: string): boolean {
  const name = entityName.trim();
  if (name.length < 2) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, "iu");
  return re.test(haystack);
}

/**
 * Match per nome completo o parola distintiva del nome (citazione parziale nel prompt utente).
 */
export function entityNameMatchesHaystack(haystack: string, entityName: string): boolean {
  if (textMentionsEntityName(haystack, entityName)) return true;
  const words = entityName
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= MIN_PARTIAL_NAME_WORD_CHARS)
    .sort((a, b) => b.length - a.length);
  return words.some((word) => textMentionsEntityName(haystack, word));
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

function fallbackSnippetForEntity(name: string, kindLabel: string, maxChars: number): string {
  const base = `${kindLabel} della campagna, ${name}.`;
  if (base.length <= maxChars) return base;
  return `${base.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

type WikiMemRow = {
  id: string;
  name: string;
  type: string;
  content: Json;
  attributes?: Json | Record<string, unknown> | null;
  include_in_campaign_ai_memory?: boolean;
};

type CharacterMemRow = {
  id: string;
  name: string;
  background: string | null;
};

type MapMemRow = {
  id: string;
  name: string;
  description: string | null;
  map_type: string;
};

type NamedCandidate = {
  id: string;
  name: string;
  source: ImagePromptEntityReference["source"];
  body: string;
  kindLabel: string;
};

/**
 * Campagne long: voci wiki in memoria IA, mappe con descrizione e PG con background,
 * filtrate per **nome citato** nel testo utente.
 */
export async function resolveImagePromptEntityReferences(
  admin: AdminClient,
  campaignId: string,
  options: ResolveImagePromptEntityReferencesOptions
): Promise<ImagePromptEntityReferenceDiagnostics> {
  const searchHaystack = options.searchText.trim();
  const maxReferences = options.maxReferences ?? DEFAULT_MAX_REFERENCES;
  const maxSnippetChars = options.maxSnippetChars ?? DEFAULT_SNIPPET_CHARS;
  const excludeId = options.excludeEntityId?.trim() || undefined;

  const empty: ImagePromptEntityReferenceDiagnostics = {
    searchHaystack,
    wikiMemoryCount: 0,
    mapCount: 0,
    characterCount: 0,
    references: [],
  };

  if (!searchHaystack) return empty;

  const { data: camp } = await admin.from("campaigns").select("type").eq("id", campaignId).maybeSingle();
  const campaignType = (camp as { type?: string | null } | null)?.type;
  if (campaignType !== "long") return empty;

  const [{ data: wikiRaw }, { data: charactersRaw }, { data: mapsRaw }] = await Promise.all([
    admin
      .from("wiki_entities")
      .select("id, name, type, content, attributes, include_in_campaign_ai_memory")
      .eq("campaign_id", campaignId),
    admin.from("campaign_characters").select("id, name, background").eq("campaign_id", campaignId),
    admin.from("maps").select("id, name, description, map_type").eq("campaign_id", campaignId),
  ]);

  const wikiCandidates: NamedCandidate[] = ((wikiRaw ?? []) as WikiMemRow[])
    .filter((row) => row.include_in_campaign_ai_memory === true)
    .filter((row) => !excludeId || row.id !== excludeId)
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      source: "wiki" as const,
      body: extractWikiEntityMemoryText(row.content as Json, row.attributes ?? null),
      kindLabel: row.type?.trim() || "voce wiki",
    }))
    .filter((row) => row.name.length >= 2);

  const characterCandidates: NamedCandidate[] = ((charactersRaw ?? []) as CharacterMemRow[])
    .filter((row) => !excludeId || row.id !== excludeId)
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      source: "character" as const,
      body: typeof row.background === "string" ? row.background.trim() : "",
      kindLabel: "personaggio giocante",
    }))
    .filter((row) => row.name.length >= 2 && row.body.length > 0);

  const mapCandidates: NamedCandidate[] = ((mapsRaw ?? []) as MapMemRow[])
    .filter((row) => !excludeId || row.id !== excludeId)
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      source: "map" as const,
      body: typeof row.description === "string" ? row.description.trim() : "",
      kindLabel: row.map_type?.trim() || "mappa",
    }))
    .filter((row) => row.name.length >= 2 && row.body.length > 0);

  const allCandidates = [...wikiCandidates, ...mapCandidates, ...characterCandidates].sort(
    (a, b) => b.name.length - a.name.length
  );

  const references: ImagePromptEntityReference[] = [];
  const matchedIds = new Set<string>();

  for (const candidate of allCandidates) {
    if (references.length >= maxReferences) break;
    if (matchedIds.has(candidate.id)) continue;
    if (!entityNameMatchesHaystack(searchHaystack, candidate.name)) continue;

    const snippet =
      compressBodyToReferenceSnippet(candidate.body, maxSnippetChars) ||
      fallbackSnippetForEntity(candidate.name, candidate.kindLabel, maxSnippetChars);
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

  return {
    searchHaystack,
    wikiMemoryCount: wikiCandidates.length,
    mapCount: mapCandidates.length,
    characterCount: characterCandidates.length,
    references,
  };
}

export function buildEntityReferencesPromptBlock(references: ImagePromptEntityReference[]): string {
  if (!references.length) return "";
  return references.map((r) => r.referenceLine).join("\n");
}

export function buildEntityReferenceSkipReason(diagnostics: ImagePromptEntityReferenceDiagnostics): string {
  if (diagnostics.references.length > 0) return "";
  const { wikiMemoryCount, mapCount, characterCount } = diagnostics;
  const pool = wikiMemoryCount + mapCount + characterCount;
  if (pool === 0) {
    return "Nessuna fonte memoria indicizzata (wiki con checkbox memoria, mappe con descrizione, PG con background).";
  }
  return `Nessun match su ${pool} fonti memoria (${wikiMemoryCount} wiki, ${mapCount} mappe, ${characterCount} PG) — verifica che il nome citato coincida con la voce wiki/mappa.`;
}
