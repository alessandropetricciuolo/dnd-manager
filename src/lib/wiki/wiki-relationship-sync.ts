import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectNarrativeTexts,
  extractEntityReferencesFromText,
  mergeManualAndTextRelations,
  type WikiCatalogEntry,
} from "@/lib/wiki/entity-reference-parser";
type RelationFormRow = { targetType: "wiki" | "map"; targetId: string; label: string };

async function loadWikiCatalog(
  supabase: SupabaseClient,
  campaignId: string
): Promise<WikiCatalogEntry[]> {
  const [entitiesRes, mapsRes] = await Promise.all([
    supabase.from("wiki_entities").select("id, name").eq("campaign_id", campaignId),
    supabase.from("maps").select("id, name").eq("campaign_id", campaignId),
  ]);

  const out: WikiCatalogEntry[] = [];
  for (const e of entitiesRes.data ?? []) {
    if (e.name && e.id) out.push({ id: e.id, name: e.name, kind: "wiki" });
  }
  for (const m of mapsRes.data ?? []) {
    if (m.name && m.id) out.push({ id: m.id, name: m.name, kind: "map" });
  }
  return out;
}

export async function mergeRelationsWithTextReferences(
  supabase: SupabaseClient,
  campaignId: string,
  sourceEntityId: string,
  manualRelations: RelationFormRow[],
  content: string,
  attributes: Record<string, unknown>
): Promise<RelationFormRow[]> {
  const catalog = await loadWikiCatalog(supabase, campaignId);
  const texts = collectNarrativeTexts(content, attributes);
  const combined = texts.join("\n\n");
  const fromText = extractEntityReferencesFromText(combined, catalog, sourceEntityId);
  return mergeManualAndTextRelations(manualRelations, fromText);
}
