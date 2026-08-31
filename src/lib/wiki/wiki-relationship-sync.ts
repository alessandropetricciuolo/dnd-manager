import type { SupabaseClient } from "@supabase/supabase-js";
import {
  collectNarrativeTexts,
  extractEntityReferencesFromText,
  mergeManualAndTextRelations,
  type WikiCatalogEntry,
} from "@/lib/wiki/entity-reference-parser";

export type RelationFormRow = { targetType: "wiki" | "map"; targetId: string; label: string };

type WikiRelationshipRow = {
  campaign_id: string;
  source_id: string;
  target_id: string | null;
  target_map_id: string | null;
  label: string;
};

type ExistingWikiRelationshipRow = {
  target_id: string | null;
  target_map_id: string | null;
  label: string | null;
};

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

export function buildWikiRelationshipRows(
  campaignId: string,
  sourceEntityId: string,
  relations: RelationFormRow[]
): WikiRelationshipRow[] {
  const rows: WikiRelationshipRow[] = [];
  for (const rel of relations) {
    if (rel.targetType === "wiki" && rel.targetId === sourceEntityId) continue;
    rows.push({
      campaign_id: campaignId,
      source_id: sourceEntityId,
      target_id: rel.targetType === "wiki" ? rel.targetId : null,
      target_map_id: rel.targetType === "map" ? rel.targetId : null,
      label: rel.label || "—",
    });
  }
  return rows;
}

function restoreRows(
  campaignId: string,
  sourceEntityId: string,
  rows: ExistingWikiRelationshipRow[]
): WikiRelationshipRow[] {
  return rows.map((row) => ({
    campaign_id: campaignId,
    source_id: sourceEntityId,
    target_id: row.target_id,
    target_map_id: row.target_map_id,
    label: row.label || "—",
  }));
}

export async function replaceWikiRelationships(
  supabase: SupabaseClient,
  campaignId: string,
  sourceEntityId: string,
  relations: RelationFormRow[]
): Promise<{ success: true } | { success: false; error: string }> {
  const desiredRows = buildWikiRelationshipRows(campaignId, sourceEntityId, relations);

  const { data: previousRows, error: loadError } = await supabase
    .from("wiki_relationships")
    .select("target_id, target_map_id, label")
    .eq("campaign_id", campaignId)
    .eq("source_id", sourceEntityId);

  if (loadError) {
    return { success: false, error: loadError.message ?? "Errore caricamento relazioni esistenti." };
  }

  const { error: deleteError } = await supabase
    .from("wiki_relationships")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("source_id", sourceEntityId);

  if (deleteError) {
    return { success: false, error: deleteError.message ?? "Errore eliminazione relazioni esistenti." };
  }

  if (desiredRows.length === 0) return { success: true };

  const { error: insertError } = await supabase.from("wiki_relationships").insert(desiredRows);
  if (!insertError) return { success: true };

  const rowsToRestore = restoreRows(campaignId, sourceEntityId, (previousRows ?? []) as ExistingWikiRelationshipRow[]);
  if (rowsToRestore.length > 0) {
    const { error: restoreError } = await supabase.from("wiki_relationships").insert(rowsToRestore);
    if (restoreError) {
      console.error("[replaceWikiRelationships] restore failed after insert error", restoreError);
    }
  }

  return { success: false, error: insertError.message ?? "Errore salvataggio relazioni wiki." };
}
