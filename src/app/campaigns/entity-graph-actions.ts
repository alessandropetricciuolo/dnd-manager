"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";

export type WikiEntityForGraph = {
  id: string;
  name: string;
  type: string;
};

export type WikiRelationshipRow = {
  id: string;
  source_id: string;
  target_id: string;
  label: string;
};

export type GetGraphDataResult = {
  success: boolean;
  entities?: WikiEntityForGraph[];
  relationships?: WikiRelationshipRow[];
  error?: string;
};

export async function getEntityGraphData(campaignId: string): Promise<GetGraphDataResult> {
  if (!campaignId) return { success: false, error: "Campagna non valida." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isGmOrAdmin = profile?.role === "gm" || profile?.role === "admin";
    if (!isGmOrAdmin) return { success: false, error: "Solo GM e Admin possono vedere il grafo." };

    const [entitiesRes, relsRes] = await Promise.all([
      supabase
        .from("wiki_entities")
        .select("id, name, type")
        .eq("campaign_id", campaignId)
        .order("name"),
      supabase
        .from("wiki_relationships")
        .select("id, source_id, target_id, label")
        .eq("campaign_id", campaignId),
    ]);

    if (entitiesRes.error) return { success: false, error: entitiesRes.error.message };
    if (relsRes.error) return { success: false, error: relsRes.error.message };

    return {
      success: true,
      entities: (entitiesRes.data ?? []) as WikiEntityForGraph[],
      relationships: (relsRes.data ?? []) as WikiRelationshipRow[],
    };
  } catch (err) {
    console.error("[getEntityGraphData]", err);
    return { success: false, error: "Errore nel caricamento." };
  }
}

export type CreateRelationshipResult = { success: boolean; error?: string };

export async function createWikiRelationship(
  campaignId: string,
  sourceId: string,
  targetId: string,
  label: string
): Promise<CreateRelationshipResult> {
  if (!campaignId || !sourceId || !targetId) return { success: false, error: "Dati mancanti." };
  if (sourceId === targetId) return { success: false, error: "Source e target devono essere diversi." };
  const trimmedLabel = (label ?? "").trim();
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") return { success: false, error: "Non autorizzato." };

    const { error } = await supabase.from("wiki_relationships").insert({
      campaign_id: campaignId,
      source_id: sourceId,
      target_id: targetId,
      label: trimmedLabel || "—",
    });

    if (error) {
      if (error.code === "23505") return { success: false, error: "Questa relazione esiste già." };
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("[createWikiRelationship]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}

export type DeleteRelationshipResult = { success: boolean; error?: string };

export async function deleteWikiRelationship(
  relationshipId: string,
  campaignId: string
): Promise<DeleteRelationshipResult> {
  if (!relationshipId || !campaignId) return { success: false, error: "Dati mancanti." };
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return { success: false, error: "Non autenticato." };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "gm" && profile?.role !== "admin") return { success: false, error: "Non autorizzato." };

    const { error } = await supabase
      .from("wiki_relationships")
      .delete()
      .eq("id", relationshipId)
      .eq("campaign_id", campaignId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    console.error("[deleteWikiRelationship]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}
