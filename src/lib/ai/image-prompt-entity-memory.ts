import type { Json } from "@/types/database.types";
import { extractWikiEntityMemoryText } from "@/lib/campaign-wiki-ai-memory";
import { normalizeEntityNameKey } from "@/lib/wiki/entity-reference-parser";
import {
  haystackHasSpecificVenueSubject,
  VENUE_SUBJECT_PATTERN,
} from "@/lib/ai/image-prompt-location";

export {
  haystackHasSpecificVenueSubject,
  VENUE_SUBJECT_PATTERN,
} from "@/lib/ai/image-prompt-location";

type AdminClient = ReturnType<typeof import("@/utils/supabase/admin").createSupabaseAdminClient>;

export type ImagePromptEntityReference = {
  id: string;
  name: string;
  source: "wiki" | "character" | "map" | "gm_note" | "corpus";
  referenceLine: string;
};

export type ResolveImagePromptEntityReferencesOptions = {
  excludeEntityId?: string;
  /** Voce wiki in modifica: includi lore anche se esclusa dal pool (es. corpo vuoto + note GM). */
  forceIncludeEntityId?: string;
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
/** Snippet compatto per entità-geografia genitore quando il soggetto è un locale specifico. */
const PARENT_PLACE_SNIPPET_CHARS = 72;
/** Parole distintive estratte dal nome entità per match parziale (es. «Druven» in «Regno di Druven»). */
const MIN_PARTIAL_NAME_WORD_CHARS = 4;

/** Varianti ortografiche note nel lore (Riavandriel ↔ Rianvadriel). */
export function entityNameMatchVariants(entityName: string): string[] {
  const name = entityName.trim();
  if (!name) return [];
  const variants = new Set<string>([name]);
  if (/^riavandriel\b/i.test(name)) variants.add("Rianvadriel");
  if (/^rianvadriel\b/i.test(name)) variants.add("Riavandriel");
  return [...variants];
}

export function compactAlphanumeric(text: string): string {
  return normalizeEntityNameKey(text).replace(/[^a-z0-9]/g, "");
}

/** Match senza spazi/punteggiatura (Roccaferrea ↔ «rocca ferrea»). */
export function compactNameMatchesHaystack(haystack: string, entityName: string): boolean {
  const compactName = compactAlphanumeric(entityName);
  if (compactName.length < 4) return false;
  return compactAlphanumeric(haystack).includes(compactName);
}

/** True se `entityName` compare nel testo come token (case-insensitive, confini parola Unicode). */
export function textMentionsEntityName(haystack: string, entityName: string): boolean {
  const name = entityName.trim();
  if (name.length < 2) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:[^\\p{L}\\p{N}]|$)`, "iu");
  return re.test(haystack);
}

/**
 * Match per nome completo, variante ortografica, parola distintiva o forma compatta (senza spazi).
 */
export function entityNameMatchesHaystack(haystack: string, entityName: string): boolean {
  for (const variant of entityNameMatchVariants(entityName)) {
    if (textMentionsEntityName(haystack, variant)) return true;
    const words = variant
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= MIN_PARTIAL_NAME_WORD_CHARS)
      .sort((a, b) => b.length - a.length);
    if (words.some((word) => textMentionsEntityName(haystack, word))) return true;
  }
  if (compactNameMatchesHaystack(haystack, entityName)) return true;
  return false;
}

/**
 * Con soggetto «bottega/macellaio/…», evita lore generica di città/regioni genitore
 * (es. Portico intero quando si chiede la bottega del macellaio di Portico).
 */
export function shouldSuppressParentPlaceMemoryReference(
  haystack: string,
  entityName: string,
  entityBody: string
): boolean {
  if (!haystackHasSpecificVenueSubject(haystack)) return false;
  const name = entityName.trim();
  if (!name || VENUE_SUBJECT_PATTERN.test(name)) return false;
  if (VENUE_SUBJECT_PATTERN.test(entityBody)) return false;
  if (!entityNameMatchesHaystack(haystack, name)) return false;

  if (textMentionsEntityName(haystack, name)) {
    const wordCount = name.split(/\s+/).filter(Boolean).length;
    if (wordCount === 1) return true;
    if (/^(regno|continente|citt[aà]|regione|porto|isola|penisola|dominio)\b/i.test(name)) {
      return true;
    }
    if (/\bportico\b/i.test(name) && !VENUE_SUBJECT_PATTERN.test(name)) return true;
    return false;
  }

  const partialWords = name
    .split(/\s+/)
    .filter((w) => w.length >= MIN_PARTIAL_NAME_WORD_CHARS)
    .sort((a, b) => b.length - a.length);
  return partialWords.some(
    (word) => textMentionsEntityName(haystack, word) && !textMentionsEntityName(haystack, name)
  );
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

type GmNoteMemRow = {
  id: string;
  title: string;
  content: string | null;
};

type NamedCandidate = {
  id: string;
  name: string;
  source: ImagePromptEntityReference["source"];
  body: string;
  kindLabel: string;
  /** Se true, candidato incluso anche quando `excludeEntityId` coincide. */
  forceEligible?: boolean;
};

function bodyMentionsEntityName(body: string, entityName: string): boolean {
  if (!body.trim()) return false;
  return entityNameMatchVariants(entityName).some(
    (variant) =>
      textMentionsEntityName(body, variant) || compactNameMatchesHaystack(body, variant)
  );
}

function findSupplementalBodyInGmNotes(notes: GmNoteMemRow[], entityName: string): string {
  for (const note of notes) {
    const content = typeof note.content === "string" ? note.content.trim() : "";
    if (!content || !bodyMentionsEntityName(content, entityName)) continue;
    return content;
  }
  return "";
}

function extractSnippetAroundKeyword(body: string, keyword: string, maxChars: number): string {
  const plain = stripMarkdownForSnippet(body);
  if (!plain) return "";
  const lower = plain.toLowerCase();
  const idx = lower.indexOf(keyword.toLowerCase());
  if (idx < 0) return compressBodyToReferenceSnippet(plain, maxChars);
  const radius = Math.max(80, maxChars);
  const start = Math.max(0, idx - 40);
  const end = Math.min(plain.length, idx + keyword.length + radius);
  return compressBodyToReferenceSnippet(plain.slice(start, end), maxChars);
}

/** Luoghi citati nel prompt senza voce wiki/mappa dedicata (es. Roccaferrea). */
const CORPUS_PLACE_ALIASES: Array<{ displayName: string; keywords: string[] }> = [
  { displayName: "Rocca Ferrea", keywords: ["roccaferrea", "rocca ferrea"] },
];

function haystackMentionsCorpusPlace(haystack: string, keywords: string[]): boolean {
  const compactHay = compactAlphanumeric(haystack);
  return keywords.some((keyword) => {
    const compactKey = compactAlphanumeric(keyword);
    if (compactKey.length >= 4 && compactHay.includes(compactKey)) return true;
    return textMentionsEntityName(haystack, keyword);
  });
}

function findCorpusPlaceReference(
  haystack: string,
  bodies: Array<{ id: string; name: string; body: string; kindLabel: string }>,
  maxSnippetChars: number
): ImagePromptEntityReference | null {
  for (const place of CORPUS_PLACE_ALIASES) {
    if (!haystackMentionsCorpusPlace(haystack, place.keywords)) continue;
    for (const source of bodies) {
      if (!source.body.trim()) continue;
      const lowerBody = source.body.toLowerCase();
      const matchedKeyword = place.keywords.find((kw) => lowerBody.includes(kw.toLowerCase()));
      if (!matchedKeyword) continue;
      const snippet = extractSnippetAroundKeyword(source.body, matchedKeyword, maxSnippetChars);
      if (!snippet) continue;
      return {
        id: `corpus:${compactAlphanumeric(place.displayName)}:${source.id}`,
        name: place.displayName,
        source: "corpus",
        referenceLine: formatEntityReferenceLine(place.displayName, snippet),
      };
    }
  }
  return null;
}

async function buildForcedWikiReference(
  admin: AdminClient,
  campaignId: string,
  entityId: string,
  searchHaystack: string,
  gmNotes: GmNoteMemRow[],
  maxSnippetChars: number
): Promise<ImagePromptEntityReference | null> {
  const { data } = await admin
    .from("wiki_entities")
    .select("id, name, type, content, attributes, include_in_campaign_ai_memory")
    .eq("campaign_id", campaignId)
    .eq("id", entityId)
    .maybeSingle();

  const row = data as WikiMemRow | null;
  if (!row || row.include_in_campaign_ai_memory !== true) return null;

  const name = row.name.trim();
  if (name.length < 2) return null;
  if (!entityNameMatchesHaystack(searchHaystack, name)) return null;

  let body = extractWikiEntityMemoryText(row.content as Json, row.attributes ?? null);
  if (!body.trim()) {
    body = findSupplementalBodyInGmNotes(gmNotes, name);
  }

  const snippet =
    compressBodyToReferenceSnippet(body, maxSnippetChars) ||
    fallbackSnippetForEntity(name, row.type?.trim() || "voce wiki", maxSnippetChars);
  const referenceLine = formatEntityReferenceLine(name, snippet);
  if (!referenceLine) return null;

  return {
    id: row.id,
    name,
    source: "wiki",
    referenceLine,
  };
}

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
  const forceIncludeId = options.forceIncludeEntityId?.trim() || undefined;

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

  const [{ data: wikiRaw }, { data: charactersRaw }, { data: mapsRaw }, { data: gmNotesRaw }] =
    await Promise.all([
    admin
      .from("wiki_entities")
      .select("id, name, type, content, attributes, include_in_campaign_ai_memory")
      .eq("campaign_id", campaignId),
    admin.from("campaign_characters").select("id, name, background").eq("campaign_id", campaignId),
    admin.from("maps").select("id, name, description, map_type").eq("campaign_id", campaignId),
    admin.from("gm_notes").select("id, title, content").eq("campaign_id", campaignId),
  ]);

  const gmNotes = (gmNotesRaw ?? []) as GmNoteMemRow[];

  const wikiCandidates: NamedCandidate[] = ((wikiRaw ?? []) as WikiMemRow[])
    .filter((row) => row.include_in_campaign_ai_memory === true)
    .filter((row) => !excludeId || row.id !== excludeId || row.id === forceIncludeId)
    .map((row) => {
      let body = extractWikiEntityMemoryText(row.content as Json, row.attributes ?? null);
      if (!body.trim()) {
        body = findSupplementalBodyInGmNotes(gmNotes, row.name.trim());
      }
      return {
        id: row.id,
        name: row.name.trim(),
        source: "wiki" as const,
        body,
        kindLabel: row.type?.trim() || "voce wiki",
        forceEligible: row.id === forceIncludeId,
      };
    })
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
    if (excludeId && candidate.id === excludeId && !candidate.forceEligible) continue;
    if (!entityNameMatchesHaystack(searchHaystack, candidate.name)) continue;
    if (
      shouldSuppressParentPlaceMemoryReference(
        searchHaystack,
        candidate.name,
        candidate.body
      )
    ) {
      continue;
    }

    const snippetMaxChars = haystackHasSpecificVenueSubject(searchHaystack)
      ? Math.min(maxSnippetChars, PARENT_PLACE_SNIPPET_CHARS)
      : maxSnippetChars;

    const snippet =
      compressBodyToReferenceSnippet(candidate.body, snippetMaxChars) ||
      fallbackSnippetForEntity(candidate.name, candidate.kindLabel, snippetMaxChars);
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

  if (
    forceIncludeId &&
    !matchedIds.has(forceIncludeId) &&
    references.length < maxReferences
  ) {
    const forced = await buildForcedWikiReference(
      admin,
      campaignId,
      forceIncludeId,
      searchHaystack,
      gmNotes,
      maxSnippetChars
    );
    if (forced) {
      matchedIds.add(forced.id);
      references.push(forced);
    }
  }

  if (references.length < maxReferences && !haystackHasSpecificVenueSubject(searchHaystack)) {
    const corpusBodies = [
      ...mapCandidates.map((m) => ({
        id: m.id,
        name: m.name,
        body: m.body,
        kindLabel: m.kindLabel,
      })),
      ...wikiCandidates.map((w) => ({
        id: w.id,
        name: w.name,
        body: w.body,
        kindLabel: w.kindLabel,
      })),
      ...gmNotes.map((n) => ({
        id: n.id,
        name: n.title.trim() || "Nota GM",
        body: typeof n.content === "string" ? n.content.trim() : "",
        kindLabel: "nota GM",
      })),
    ];
    const corpusRef = findCorpusPlaceReference(searchHaystack, corpusBodies, maxSnippetChars);
    if (corpusRef && !references.some((r) => r.name === corpusRef.name)) {
      references.push(corpusRef);
    }
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
