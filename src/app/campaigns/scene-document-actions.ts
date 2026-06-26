"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { Json } from "@/types/database.types";
import { parsePolygonJson } from "@/lib/map-core/coordinates";
import {
  buildFowUpsertsForFloor,
  createEmptySceneDocument,
  documentToPersistPayload,
  getSceneMapPlaceholderPngBuffer,
  gridMetadataFromFloor,
  parseExistingFowRegionRow,
  planFloorFowSync,
  assertSceneDocumentV1,
  type SceneDocumentV1,
} from "@/lib/map-core-bd/scene-document";
import { cloneSceneDocument } from "@/lib/map-core/scene-schema";
import { uploadImageToTelegram } from "@/lib/telegram-storage";

type Result<T = void> = { success: true; data?: T } | { success: false; error: string };

function revalidateExplorationPaths(campaignId: string, sceneDocumentId?: string) {
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath(`/campaigns/${campaignId}/gm-only/vista-dall-alto`);
  revalidatePath(`/campaigns/${campaignId}/gm-screen`);
  if (sceneDocumentId) {
    revalidatePath(`/campaigns/${campaignId}/gm-only/scene-editor/${sceneDocumentId}`);
  }
  revalidatePath(`/campaigns/${campaignId}/gm-only/scene-editor`);
}

export type SceneDocumentRow = {
  id: string;
  campaign_id: string;
  name: string;
  linked_mission_id: string | null;
  document: Json;
  document_version: number;
  created_at: string;
  updated_at: string;
};

export type SceneDocumentWithMaps = {
  document: SceneDocumentV1;
  sceneDocumentId: string;
  floorMapIds: Record<string, string>;
};

async function requireGm(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, ok: false as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const ok = profile?.role === "gm" || profile?.role === "admin";
  return { user, ok, supabase };
}

async function uploadPlaceholderImage(floorLabel: string): Promise<string> {
  const buf = getSceneMapPlaceholderPngBuffer();
  const bytes = new Uint8Array(buf);
  const file = new File([bytes], "scene-placeholder.png", { type: "image/png" });
  const fileId = await uploadImageToTelegram(file, floorLabel || "scene");
  return `/api/tg-image/${fileId}`;
}

async function uploadFloorRasterBlob(floorLabel: string, blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const type = blob.type || "image/webp";
  const ext = type.includes("png") ? "png" : "webp";
  const file = new File([bytes], `${floorLabel}.${ext}`, { type });
  const fileId = await uploadImageToTelegram(file, floorLabel || "scene");
  return `/api/tg-image/${fileId}`;
}

async function applyFowSyncForMap(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  mapId: string,
  floor: SceneDocumentV1["floors"][number]
): Promise<Result> {
  const { data: existingRows, error: listErr } = await supabase
    .from("campaign_exploration_fow_regions")
    .select("id, source_area_id, polygon, is_revealed, sort_order")
    .eq("map_id", mapId);
  if (listErr) return { success: false, error: listErr.message };

  const existing = (existingRows ?? []).map(parseExistingFowRegionRow);
  const plan = planFloorFowSync(floor, existing);

  if (plan.toDeleteIds.length > 0) {
    const { error } = await supabase
      .from("campaign_exploration_fow_regions")
      .delete()
      .in("id", plan.toDeleteIds);
    if (error) return { success: false, error: error.message };
  }

  for (const upd of plan.toUpdate) {
    const { error } = await supabase
      .from("campaign_exploration_fow_regions")
      .update({
        polygon: upd.polygon as unknown as Json,
        sort_order: upd.sortOrder,
        is_revealed: upd.preserveRevealed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", upd.id);
    if (error) return { success: false, error: error.message };
  }

  if (plan.toInsert.length > 0) {
    const { error } = await supabase.from("campaign_exploration_fow_regions").insert(
      plan.toInsert.map((row) => ({
        map_id: mapId,
        polygon: row.polygon as unknown as Json,
        is_revealed: false,
        sort_order: row.sortOrder,
        source_area_id: row.sourceAreaId,
      }))
    );
    if (error) return { success: false, error: error.message };
  }

  return { success: true };
}

async function upsertFloorMaps(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string,
  sceneDocumentId: string,
  document: SceneDocumentV1,
  linkedMissionId: string | null,
  floorRasters?: Record<string, Blob>
): Promise<Result<Record<string, string>>> {
  const floorMapIds: Record<string, string> = {};

  const { data: existingMaps } = await supabase
    .from("campaign_exploration_maps")
    .select("id, scene_floor_id, image_path")
    .eq("scene_document_id", sceneDocumentId);

  const byFloorId = new Map(
    (existingMaps ?? [])
      .filter((m) => m.scene_floor_id)
      .map((m) => [m.scene_floor_id as string, m])
  );

  for (const floor of document.floors) {
    const gridMeta = gridMetadataFromFloor(floor);
    const existing = byFloorId.get(floor.id);

    if (existing) {
      let imagePathUpdate: { image_path?: string } = {};
      const raster = floorRasters?.[floor.id];
      if (raster && raster.size > 0) {
        try {
          imagePathUpdate.image_path = await uploadFloorRasterBlob(floor.label, raster);
        } catch (e) {
          return {
            success: false,
            error: e instanceof Error ? e.message : "Upload raster piano fallito.",
          };
        }
      }
      const { error } = await supabase
        .from("campaign_exploration_maps")
        .update({
          floor_label: floor.label,
          sort_order: floor.sortOrder,
          linked_mission_id: linkedMissionId,
          source_type: "generated_scene",
          ...gridMeta,
          ...imagePathUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) return { success: false, error: error.message };
      floorMapIds[floor.id] = existing.id;

      const sync = await applyFowSyncForMap(supabase, existing.id, floor);
      if (!sync.success) return sync;
      continue;
    }

    let imagePath: string;
    const raster = floorRasters?.[floor.id];
    if (raster && raster.size > 0) {
      try {
        imagePath = await uploadFloorRasterBlob(floor.label, raster);
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Upload raster piano fallito.",
        };
      }
    } else {
      try {
        imagePath = await uploadPlaceholderImage(floor.label);
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Upload placeholder immagine fallito.",
        };
      }
    }

    const { data: inserted, error: insErr } = await supabase
      .from("campaign_exploration_maps")
      .insert({
        campaign_id: campaignId,
        floor_label: floor.label,
        sort_order: floor.sortOrder,
        image_path: imagePath,
        linked_mission_id: linkedMissionId,
        source_type: "generated_scene",
        scene_document_id: sceneDocumentId,
        scene_floor_id: floor.id,
        ...gridMeta,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      return { success: false, error: insErr?.message ?? "Errore creazione mappa piano." };
    }
    floorMapIds[floor.id] = inserted.id;

    const sync = await applyFowSyncForMap(supabase, inserted.id, floor);
    if (!sync.success) return sync;
  }

  const validFloorIds = new Set(document.floors.map((f) => f.id));
  const orphanMaps = (existingMaps ?? []).filter(
    (m) => m.scene_floor_id && !validFloorIds.has(m.scene_floor_id)
  );
  for (const orphan of orphanMaps) {
    await supabase.from("campaign_exploration_maps").delete().eq("id", orphan.id);
  }

  return { success: true, data: floorMapIds };
}

export async function createSceneDocumentAction(
  campaignId: string,
  options?: { name?: string; linkedMissionId?: string | null }
): Promise<Result<{ sceneDocumentId: string; document: SceneDocumentV1; floorMapIds: Record<string, string> }>> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const doc = createEmptySceneDocument(options?.name?.trim() || "Nuova scena");
  if (options?.linkedMissionId !== undefined) {
    doc.linkedMissionId = options.linkedMissionId;
  }

  const payload = documentToPersistPayload(doc);
  const { data: row, error } = await supabase
    .from("campaign_scene_documents")
    .insert({
      campaign_id: campaignId,
      ...payload,
    })
    .select("id")
    .single();

  if (error || !row) return { success: false, error: error?.message ?? "Errore creazione scena." };

  revalidateExplorationPaths(campaignId);
  return {
    success: true,
    data: {
      sceneDocumentId: row.id,
      document: doc,
      floorMapIds: {},
    },
  };
}

export async function getSceneDocumentAction(
  campaignId: string,
  sceneDocumentId: string
): Promise<Result<SceneDocumentWithMaps>> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const { data: row, error } = await supabase
    .from("campaign_scene_documents")
    .select("*")
    .eq("id", sceneDocumentId)
    .eq("campaign_id", campaignId)
    .single();

  if (error || !row) return { success: false, error: error?.message ?? "Scena non trovata." };

  let document: SceneDocumentV1;
  try {
    document = assertSceneDocumentV1(row.document);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Documento corrotto." };
  }

  const { data: maps } = await supabase
    .from("campaign_exploration_maps")
    .select("id, scene_floor_id")
    .eq("scene_document_id", sceneDocumentId);

  const floorMapIds: Record<string, string> = {};
  for (const m of maps ?? []) {
    if (m.scene_floor_id) floorMapIds[m.scene_floor_id] = m.id;
  }

  return {
    success: true,
    data: { document, sceneDocumentId, floorMapIds },
  };
}

export async function saveSceneDocumentAction(
  campaignId: string,
  sceneDocumentId: string,
  documentInput: SceneDocumentV1
): Promise<Result<{ floorMapIds: Record<string, string> }>> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  let document: SceneDocumentV1;
  try {
    document = assertSceneDocumentV1(documentInput);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Documento non valido." };
  }

  const { data: existing } = await supabase
    .from("campaign_scene_documents")
    .select("id")
    .eq("id", sceneDocumentId)
    .eq("campaign_id", campaignId)
    .single();
  if (!existing) return { success: false, error: "Scena non trovata." };

  const payload = documentToPersistPayload(document);
  const { error: updErr } = await supabase
    .from("campaign_scene_documents")
    .update(payload)
    .eq("id", sceneDocumentId)
    .eq("campaign_id", campaignId);
  if (updErr) return { success: false, error: updErr.message };

  const maps = await upsertFloorMaps(
    supabase,
    campaignId,
    sceneDocumentId,
    document,
    document.linkedMissionId
  );
  if (!maps.success) return maps;

  revalidateExplorationPaths(campaignId, sceneDocumentId);
  return { success: true, data: { floorMapIds: maps.data! } };
}

export async function saveSceneDocumentWithRastersAction(
  campaignId: string,
  sceneDocumentId: string,
  formData: FormData
): Promise<Result<{ floorMapIds: Record<string, string> }>> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const rawDoc = formData.get("document");
  if (typeof rawDoc !== "string" || rawDoc.length < 2) {
    return { success: false, error: "Documento mancante." };
  }

  let document: SceneDocumentV1;
  try {
    document = assertSceneDocumentV1(JSON.parse(rawDoc));
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Documento non valido." };
  }

  const { data: existing } = await supabase
    .from("campaign_scene_documents")
    .select("id")
    .eq("id", sceneDocumentId)
    .eq("campaign_id", campaignId)
    .single();
  if (!existing) return { success: false, error: "Scena non trovata." };

  const floorRasters: Record<string, Blob> = {};
  for (const floor of document.floors) {
    const entry = formData.get(`floor_raster_${floor.id}`);
    if (entry instanceof Blob && entry.size > 0) {
      floorRasters[floor.id] = entry;
    }
  }

  if (Object.keys(floorRasters).length === 0) {
    return { success: false, error: "Raster piano mancanti: impossibile aggiornare Esplorazione e FoW." };
  }

  if (Object.keys(floorRasters).length !== document.floors.length) {
    return {
      success: false,
      error: "Raster mancante per uno o più piani. Riprova il salvataggio.",
    };
  }

  const payload = documentToPersistPayload(document);
  const { error: updErr } = await supabase
    .from("campaign_scene_documents")
    .update(payload)
    .eq("id", sceneDocumentId)
    .eq("campaign_id", campaignId);
  if (updErr) return { success: false, error: updErr.message };

  const maps = await upsertFloorMaps(
    supabase,
    campaignId,
    sceneDocumentId,
    document,
    document.linkedMissionId,
    floorRasters
  );
  if (!maps.success) return maps;

  revalidateExplorationPaths(campaignId, sceneDocumentId);
  return { success: true, data: { floorMapIds: maps.data! } };
}

export async function listSceneDocumentsAction(
  campaignId: string
): Promise<Result<SceneDocumentRow[]>> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const { data, error } = await supabase
    .from("campaign_scene_documents")
    .select("id, campaign_id, name, linked_mission_id, document, document_version, created_at, updated_at")
    .eq("campaign_id", campaignId)
    .order("updated_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as SceneDocumentRow[] };
}

export async function duplicateSceneDocumentAction(
  campaignId: string,
  sourceSceneDocumentId: string
): Promise<Result<{ sceneDocumentId: string }>> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const loaded = await getSceneDocumentAction(campaignId, sourceSceneDocumentId);
  if (!loaded.success) return { success: false, error: loaded.error };
  if (!loaded.data) return { success: false, error: "Scena non trovata." };

  const cloned = cloneSceneDocument(loaded.data.document);
  const payload = documentToPersistPayload(cloned);

  const { data: row, error } = await supabase
    .from("campaign_scene_documents")
    .insert({
      campaign_id: campaignId,
      ...payload,
    })
    .select("id")
    .single();

  if (error || !row) return { success: false, error: error?.message ?? "Errore duplicazione scena." };

  revalidateExplorationPaths(campaignId);
  return { success: true, data: { sceneDocumentId: row.id } };
}

export async function deleteSceneDocumentAction(
  campaignId: string,
  sceneDocumentId: string
): Promise<Result> {
  const supabase = await createSupabaseServerClient();
  const ctx = await requireGm(supabase);
  if (!ctx.user || !ctx.ok) return { success: false, error: "Non autorizzato." };

  const { data: doc } = await supabase
    .from("campaign_scene_documents")
    .select("id")
    .eq("id", sceneDocumentId)
    .eq("campaign_id", campaignId)
    .single();
  if (!doc) return { success: false, error: "Scena non trovata." };

  const { data: maps } = await supabase
    .from("campaign_exploration_maps")
    .select("id")
    .eq("scene_document_id", sceneDocumentId)
    .eq("campaign_id", campaignId);

  const mapIds = (maps ?? []).map((m) => m.id);
  if (mapIds.length > 0) {
    const { error: fowErr } = await supabase
      .from("campaign_exploration_fow_regions")
      .delete()
      .in("map_id", mapIds);
    if (fowErr) return { success: false, error: fowErr.message };

    const { error: mapErr } = await supabase
      .from("campaign_exploration_maps")
      .delete()
      .in("id", mapIds);
    if (mapErr) return { success: false, error: mapErr.message };
  }

  const { error: delErr } = await supabase
    .from("campaign_scene_documents")
    .delete()
    .eq("id", sceneDocumentId)
    .eq("campaign_id", campaignId);
  if (delErr) return { success: false, error: delErr.message };

  revalidateExplorationPaths(campaignId);
  return { success: true };
}

export async function getSceneFloorGmNotesAction(
  campaignId: string,
  sceneDocumentId: string,
  sceneFloorId: string
): Promise<
  Result<{
    notes: Array<{ id: string; x: number; y: number; text: string; width?: number }>;
    floorWidth: number;
    floorHeight: number;
  }>
> {
  const loaded = await getSceneDocumentAction(campaignId, sceneDocumentId);
  if (!loaded.success) return { success: false, error: loaded.error };
  if (!loaded.data) return { success: false, error: "Scena non trovata." };
  const floor = loaded.data.document.floors.find((f) => f.id === sceneFloorId);
  if (!floor) return { success: false, error: "Piano non trovato nel documento." };
  return {
    success: true,
    data: {
      notes: floor.gmNotes ?? [],
      floorWidth: floor.width,
      floorHeight: floor.height,
    },
  };
}

/** Utility test: verifica che i poligoni FoW salvati corrispondano alle aree del documento. */
export async function verifySceneFowSyncAction(
  campaignId: string,
  sceneDocumentId: string
): Promise<Result<{ ok: boolean; mismatches: string[] }>> {
  const loaded = await getSceneDocumentAction(campaignId, sceneDocumentId);
  if (!loaded.success) return loaded;

  const mismatches: string[] = [];
  const supabase = await createSupabaseServerClient();

  for (const floor of loaded.data!.document.floors) {
    const mapId = loaded.data!.floorMapIds[floor.id];
    if (!mapId) {
      mismatches.push(`Mappa mancante per piano ${floor.id}`);
      continue;
    }
    const desired = buildFowUpsertsForFloor(floor);
    const { data: rows } = await supabase
      .from("campaign_exploration_fow_regions")
      .select("source_area_id, polygon")
      .eq("map_id", mapId)
      .not("source_area_id", "is", null);

    const byArea = new Map(
      (rows ?? []).map((r) => [r.source_area_id as string, parsePolygonJson(r.polygon)])
    );
    for (const d of desired) {
      const got = byArea.get(d.sourceAreaId);
      if (!got) {
        mismatches.push(`Regione mancante: ${d.sourceAreaId}`);
        continue;
      }
      const key = (poly: { x: number; y: number }[]) =>
        poly.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join("|");
      if (key(got) !== key(d.polygon)) {
        mismatches.push(`Poligono diverso: ${d.sourceAreaId}`);
      }
    }
  }

  return { success: true, data: { ok: mismatches.length === 0, mismatches } };
}
