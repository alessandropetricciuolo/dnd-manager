import type { SupabaseClient } from "@supabase/supabase-js";
import { retrievePreviewMemory, type RetrieveResult } from "@/lib/ai-core/campaign-memory-retriever";
import type { Database } from "@/types/database.types";
import { resolveCanonicalReferences, type CanonicalReference } from "./canonical-references";

export type AssistantContext = { campaignId: string; result: RetrieveResult; evidence: string; canonicalReferences: CanonicalReference[] };

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
  const result = await retrievePreviewMemory(supabase, campaignId, question);
  // Il router riceve solo un contesto piccolo: il RAG è un vincolo narrativo,
  // non materiale da ricopiare in una voce wiki.
  const chunks = result.chunks.slice(0, 3);
  const sources = result.sources.slice(0, 3);
  const compactResult = { ...result, chunks, sources };
  const canonicalReferences = await loadCanonicalReferences(supabase, campaignId, question, sources);
  return { campaignId, result: compactResult, evidence: chunks.map((c, i) => `[${sources[i]?.evidenceId}] ${c.title}: ${c.content}`).join("\n\n"), canonicalReferences };
}
