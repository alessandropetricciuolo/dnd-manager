import type { SupabaseClient } from "@supabase/supabase-js";
import { retrievePreviewMemory, buildPreviewSources, type PreviewChunkRow, type RetrieveResult } from "@/lib/ai-core/campaign-memory-retriever";
import type { Database } from "@/types/database.types";
import { resolveCanonicalReferences, resolveExplicitCanonicalReferences, type CanonicalCatalogEntry, type CanonicalReference } from "./canonical-references";

export type AssistantContext = { campaignId: string; result: RetrieveResult; evidence: string; canonicalReferences: CanonicalReference[]; citationLimit: 2 | 3 };

type CatalogRow = { id: string; name: string };

async function loadCampaignCatalog(supabase: SupabaseClient<Database>, campaignId: string): Promise<CanonicalCatalogEntry[]> {
  try {
    const [wikiRows, mapRows]: [CatalogRow[], CatalogRow[]] = await Promise.all([
      supabase.from("wiki_entities").select("id, name").eq("campaign_id", campaignId).limit(1000).then(({ data }) => data ?? []),
      supabase.from("maps").select("id, name").eq("campaign_id", campaignId).limit(1000).then(({ data }) => data ?? []),
    ]);
    return [
      ...wikiRows.map((entry) => ({ targetType: "wiki" as const, targetId: entry.id, name: entry.name })),
      ...mapRows.map((entry) => ({ targetType: "map" as const, targetId: entry.id, name: entry.name })),
    ];
  } catch {
    return [];
  }
}

async function loadNamedSourceChunks(supabase: SupabaseClient<Database>, campaignId: string, references: CanonicalReference[]): Promise<PreviewChunkRow[]> {
  const rows = await Promise.all(references.map(async (reference) => {
    const sourceType = reference.targetType === "wiki" ? "wiki" : "map_description";
    try {
      const { data, error } = await supabase.from("campaign_memory_chunks")
        .select("id, campaign_id, source_type, source_id, chunk_index, title, content, summary, metadata")
        .eq("campaign_id", campaignId).eq("source_type", sourceType).eq("source_id", reference.targetId)
        .order("chunk_index", { ascending: true }).limit(1);
      if (error || !data?.[0]) return null;
      const row = data[0] as unknown as PreviewChunkRow;
      return { ...row, summary: row.summary ?? null, metadata: row.metadata ?? null, similarity: null };
    } catch {
      return null;
    }
  }));
  return rows.filter(Boolean) as PreviewChunkRow[];
}

async function loadCanonicalReferences(
  supabase: SupabaseClient<Database>,
  campaignId: string,
  question: string,
  sources: RetrieveResult["sources"],
): Promise<CanonicalReference[]> {
  const wikiIds = [...new Set(sources.filter((source) => source.sourceType === "wiki").map((source) => source.sourceId).filter(Boolean))];
  const mapIds = [...new Set(sources.filter((source) => source.sourceType === "map_description").map((source) => source.sourceId).filter(Boolean))];
  if (!wikiIds.length && !mapIds.length) return [];
  try {
    type CatalogRow = { id: string; name: string };
    const [wikiRows, mapRows]: [CatalogRow[], CatalogRow[]] = await Promise.all([
      wikiIds.length
        ? supabase.from("wiki_entities").select("id, name").eq("campaign_id", campaignId).in("id", wikiIds).then(({ data }) => data ?? [])
        : Promise.resolve([]),
      mapIds.length
        ? supabase.from("maps").select("id, name").eq("campaign_id", campaignId).in("id", mapIds).then(({ data }) => data ?? [])
        : Promise.resolve([]),
    ]);
    const catalog = [
      ...wikiRows.map((entry) => ({ targetType: "wiki" as const, targetId: entry.id, name: entry.name })),
      ...mapRows.map((entry) => ({ targetType: "map" as const, targetId: entry.id, name: entry.name })),
    ];
    return resolveCanonicalReferences(question, sources, catalog);
  } catch {
    // A relation must be proven, never guessed. Retrieval can still ground the prose.
    return [];
  }
}

export async function loadAssistantContext(supabase: SupabaseClient<Database>, campaignId: string | null, question: string): Promise<AssistantContext | null> {
  if (!campaignId) return null;
  const [result, catalog] = await Promise.all([retrievePreviewMemory(supabase, campaignId, question), loadCampaignCatalog(supabase, campaignId)]);
  const explicitReferences = resolveExplicitCanonicalReferences(question, catalog);
  const namedChunks = await loadNamedSourceChunks(supabase, campaignId, explicitReferences);
  const mergedChunks = [...namedChunks, ...result.chunks].filter((chunk, index, all) => all.findIndex((other) => other.source_type === chunk.source_type && other.source_id === chunk.source_id) === index).slice(0, 3);
  const mergedSources = buildPreviewSources(campaignId, mergedChunks);
  // Il router riceve solo un contesto piccolo: il RAG è un vincolo narrativo,
  // non materiale da ricopiare in una voce wiki.
  const chunks = mergedChunks;
  const sources = mergedSources;
  const compactResult = { ...result, chunks, sources };
  const retrievedReferences = await loadCanonicalReferences(supabase, campaignId, question, sources);
  const canonicalReferences = [...explicitReferences, ...retrievedReferences].filter((entry, index, all) => all.findIndex((other) => other.targetType === entry.targetType && other.targetId === entry.targetId) === index).slice(0, 3);
  return { campaignId, result: compactResult, evidence: chunks.map((c, i) => `[${sources[i]?.evidenceId}] ${c.title}: ${c.content}`).join("\n\n"), canonicalReferences, citationLimit: namedChunks.length === 3 ? 3 : 2 };
}
