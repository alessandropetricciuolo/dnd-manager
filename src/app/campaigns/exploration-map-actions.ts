"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { Json } from "@/types/database.types";
import type { NormPoint } from "@/lib/exploration/fow-geometry";

const BUCKET = "exploration_maps";

export type ExplorationMapRow = {
  id: string;
  campaign_id: string;
  floor_label: string;
  sort_order: number;
  image_path: string;
  grid_cell_meters: number | null;
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

/** FormData file entries are not always `instanceof File` in the Node server-actions runtime. */
function readImageBlobFromFormData(formData: FormData):
  | { ok: true; blob: Blob; contentType: string }
  | { ok: false; error: string } {
  const raw = formData.get("image");
  if (raw == null || typeof raw === "string") {
    return { ok: false, error: "Seleziona un'immagine." };
  }
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Seleziona un'immagine." };
  }
  const blob = raw as Blob;
  if (typeof blob.size !== "number" || blob.size === 0) {
    return { ok: false, error: "Seleziona un'immagine." };
  }
  if (typeof blob.arrayBuffer !== "function") {
    return { ok: false, error: "Seleziona un'immagine." };
  }
  let contentType = blob.type;
  const fileName =
    "name" in raw && typeof (raw as File).name === "string" ? (raw as File).name : "";
  if (!contentType && fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".png")) contentType = "image/png";
    else if (lower.endsWith(".webp")) contentType = "image/webp";
    else if (lower.endsWith(".gif")) contentType = "image/gif";
    else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(contentType)) {
    return { ok: false, error: "Formato non supportato (JPG, PNG, WebP, GIF)." };
  }
  return { ok: true, blob, contentType };
}

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
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Solo il Master può creare mappe." };

  const floorLabel = (formData.get("floor_label") as string | null)?.trim() ?? "";
  const sortOrderRaw = (formData.get("sort_order") as string | null)?.trim() ?? "0";
  const gridRaw = (formData.get("grid_cell_meters") as string | null)?.trim() ?? "";
  const imageRead = readImageBlobFromFormData(formData);
  if (!imageRead.ok) {
    return { success: false, error: imageRead.error };
  }
  const { blob, contentType } = imageRead;

  const ext =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : contentType === "image/gif"
          ? "gif"
          : "jpg";
  const path = `${campaignId}/${randomUUID()}.${ext}`;

  const buf = Buffer.from(await blob.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buf, {
    contentType,
    upsert: false,
  });
  if (upErr) return { success: false, error: upErr.message ?? "Upload fallito." };

  const sortOrder = Number.parseInt(sortOrderRaw, 10);
  const grid_cell_meters =
    gridRaw === "" ? null : Number.parseFloat(gridRaw.replace(",", "."));
  const gridOk =
    grid_cell_meters != null && Number.isFinite(grid_cell_meters) && grid_cell_meters > 0
      ? grid_cell_meters
      : null;

  const { data: row, error: insErr } = await supabase
    .from("campaign_exploration_maps")
    .insert({
      campaign_id: campaignId,
      floor_label: floorLabel,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      image_path: path,
      grid_cell_meters: gridOk,
    })
    .select("id")
    .single();

  if (insErr || !row) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { success: false, error: insErr?.message ?? "Salvataggio fallito." };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: { id: row.id } };
}

export async function updateExplorationMapMeta(
  campaignId: string,
  mapId: string,
  input: { floor_label?: string; sort_order?: number; grid_cell_meters?: number | null }
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
  if (row.image_path) await supabase.storage.from(BUCKET).remove([row.image_path]);
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

