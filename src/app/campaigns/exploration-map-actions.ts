"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { Json } from "@/types/database.types";
import type { NormPoint } from "@/lib/exploration/fow-geometry";
import { createExplorationMapFromFormData } from "@/lib/exploration/exploration-map-upload-core";

const BUCKET = "exploration_maps";

export type ExplorationMapRow = {
  id: string;
  campaign_id: string;
  floor_label: string;
  sort_order: number;
  image_path: string;
  grid_cell_meters: number | null;
  grid_source_cell_px: number | null;
  grid_offset_x_cells: number;
  grid_offset_y_cells: number;
  grid_kind: "square" | "hex";
  created_at: string;
  updated_at: string;
};

export type FowRegionRow = {
  id: string;
  map_id: string;
  polygon: Json;
  is_revealed: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type Result<T = void> = { success: true; data?: T } | { success: false; error: string };

async function requireGm(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, ok: false as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const ok = profile?.role === "gm" || profile?.role === "admin";
  return { user, ok, supabase };
}


export async function listExplorationMaps(campaignId: string): Promise<Result<ExplorationMapRow[]>> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };
  const { data, error } = await supabase
    .from("campaign_exploration_maps")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as ExplorationMapRow[] };
}

export async function listFowRegions(mapId: string): Promise<Result<FowRegionRow[]>> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };
  const { data, error } = await supabase
    .from("campaign_exploration_fow_regions")
    .select("*")
    .eq("map_id", mapId)
    .order("sort_order", { ascending: true });
  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as FowRegionRow[] };
}

export async function createExplorationMap(
  campaignId: string,
  formData: FormData
): Promise<Result<{ id: string }>> {
  const supabase = await createSupabaseServerClient();
  const result = await createExplorationMapFromFormData(supabase, campaignId, formData);
  if (result.success) {
    revalidatePath(`/campaigns/${campaignId}`);
  }
  return result;
}

export async function updateExplorationMapMeta(
  campaignId: string,
  mapId: string,
  input: {
    floor_label?: string;
    sort_order?: number;
    grid_cell_meters?: number | null;
    grid_source_cell_px?: number | null;
    grid_offset_x_cells?: number;
    grid_offset_y_cells?: number;
    grid_kind?: "square" | "hex";
  }
): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const { error } = await supabase
    .from("campaign_exploration_maps")
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq("id", mapId)
    .eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function deleteExplorationMap(campaignId: string, mapId: string): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const { data: row } = await supabase
    .from("campaign_exploration_maps")
    .select("image_path")
    .eq("id", mapId)
    .eq("campaign_id", campaignId)
    .single();
  if (!row) return { success: false, error: "Mappa non trovata." };

  const { error } = await supabase.from("campaign_exploration_maps").delete().eq("id", mapId).eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  const legacyPath = row.image_path?.trim() ?? "";
  if (legacyPath && !legacyPath.startsWith("/api/tg-image/") && !legacyPath.startsWith("/api/tg-file/")) {
    await supabase.storage.from(BUCKET).remove([legacyPath]);
  }
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function createFowRegion(
  campaignId: string,
  mapId: string,
  polygon: NormPoint[]
): Promise<Result<{ id: string }>> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };
  if (polygon.length < 3) return { success: false, error: "Servono almeno 3 vertici." };

  const { data: map } = await supabase
    .from("campaign_exploration_maps")
    .select("id")
    .eq("id", mapId)
    .eq("campaign_id", campaignId)
    .single();
  if (!map) return { success: false, error: "Mappa non trovata." };

  const { data: maxRow } = await supabase
    .from("campaign_exploration_fow_regions")
    .select("sort_order")
    .eq("map_id", mapId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data: row, error } = await supabase
    .from("campaign_exploration_fow_regions")
    .insert({
      map_id: mapId,
      polygon: polygon as unknown as Json,
      is_revealed: false,
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (error || !row) return { success: false, error: error?.message ?? "Errore salvataggio poligono." };
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: { id: row.id } };
}

export async function updateFowRegionPolygon(
  campaignId: string,
  regionId: string,
  polygon: NormPoint[]
): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };
  if (polygon.length < 3) return { success: false, error: "Servono almeno 3 vertici." };

  const { data: reg } = await supabase
    .from("campaign_exploration_fow_regions")
    .select("map_id")
    .eq("id", regionId)
    .single();
  if (!reg) return { success: false, error: "Regione non trovata." };
  const { data: map } = await supabase
    .from("campaign_exploration_maps")
    .select("campaign_id")
    .eq("id", reg.map_id)
    .single();
  if (!map || map.campaign_id !== campaignId) return { success: false, error: "Non autorizzato." };

  const { error } = await supabase
    .from("campaign_exploration_fow_regions")
    .update({
      polygon: polygon as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", regionId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function deleteFowRegion(campaignId: string, regionId: string): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const { data: reg } = await supabase
    .from("campaign_exploration_fow_regions")
    .select("map_id")
    .eq("id", regionId)
    .single();
  if (!reg) return { success: false, error: "Regione non trovata." };
  const { data: map } = await supabase
    .from("campaign_exploration_maps")
    .select("campaign_id")
    .eq("id", reg.map_id)
    .single();
  if (!map || map.campaign_id !== campaignId) return { success: false, error: "Non autorizzato." };

  const { error } = await supabase.from("campaign_exploration_fow_regions").delete().eq("id", regionId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function setFowRegionRevealed(
  campaignId: string,
  regionId: string,
  isRevealed: boolean
): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const { data: reg } = await supabase
    .from("campaign_exploration_fow_regions")
    .select("map_id")
    .eq("id", regionId)
    .single();
  if (!reg) return { success: false, error: "Regione non trovata." };
  const { data: map } = await supabase
    .from("campaign_exploration_maps")
    .select("campaign_id")
    .eq("id", reg.map_id)
    .single();
  if (!map || map.campaign_id !== campaignId) return { success: false, error: "Non autorizzato." };

  const { error } = await supabase
    .from("campaign_exploration_fow_regions")
    .update({
      is_revealed: isRevealed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", regionId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

export async function resetMapFog(campaignId: string, mapId: string): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const { data: map } = await supabase
    .from("campaign_exploration_maps")
    .select("id")
    .eq("id", mapId)
    .eq("campaign_id", campaignId)
    .single();
  if (!map) return { success: false, error: "Mappa non trovata." };

  const { error } = await supabase
    .from("campaign_exploration_fow_regions")
    .update({ is_revealed: false, updated_at: new Date().toISOString() })
    .eq("map_id", mapId);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true };
}

