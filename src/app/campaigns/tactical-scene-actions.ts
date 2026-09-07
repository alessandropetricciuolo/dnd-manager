"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  assertPublishableScene,
  canManageTacticalScene,
  parseTacticalScene,
  type TacticalScene,
} from "@/lib/scene-runtime";
import { createExplorationMapFromFormData } from "@/lib/exploration/exploration-map-upload-core";
import { deleteExplorationMap } from "@/app/campaigns/exploration-map-actions";

type Result<T> = { success: true; data: T } | { success: false; error: string };
export type TacticalSceneListItem = {
  id: string;
  name: string;
  lifecycle: string;
  current_revision_no: number;
  updated_at: string;
};

async function requireTacticalGm() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return { success: false as const, error: "Autenticazione richiesta." };
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error || !canManageTacticalScene(profile?.role))
    return {
      success: false as const,
      error: "Solo GM e Admin possono gestire le scene tattiche.",
    };
  return { success: true as const, supabase, user };
}

function parseDocument(raw: string): Result<TacticalScene> {
  try {
    const result = parseTacticalScene(JSON.parse(raw));
    return result.ok
      ? { success: true, data: result.scene }
      : { success: false, error: result.errors.join("; ") };
  } catch {
    return { success: false, error: "Documento scena non valido." };
  }
}

export async function listTacticalScenesAction(
  campaignId: string,
): Promise<Result<TacticalSceneListItem[]>> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  const { data, error } = await auth.supabase
    .from("tactical_scenes")
    .select("id,name,lifecycle,current_revision_no,updated_at")
    .eq("campaign_id", campaignId)
    .order("updated_at", { ascending: false });
  return error
    ? { success: false, error: error.message }
    : { success: true, data: (data ?? []) as TacticalSceneListItem[] };
}
export async function renameTacticalSceneAction(
  sceneId: string,
  name: string,
): Promise<Result<null>> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  if (!name.trim())
    return { success: false, error: "Nome scena obbligatorio." };
  const { data, error } = await auth.supabase
    .from("tactical_scenes")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", sceneId)
    .select("id")
    .maybeSingle();
  return error || !data
    ? { success: false, error: error?.message ?? "Scena non trovata." }
    : { success: true, data: null };
}
export async function archiveTacticalSceneAction(
  sceneId: string,
): Promise<Result<null>> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  const { data, error } = await auth.supabase
    .from("tactical_scenes")
    .update({ lifecycle: "archived", updated_at: new Date().toISOString() })
    .eq("id", sceneId)
    .select("id")
    .maybeSingle();
  return error || !data
    ? { success: false, error: error?.message ?? "Scena non trovata." }
    : { success: true, data: null };
}
export async function listTacticalMissionOptionsAction(
  campaignId: string,
): Promise<Result<{ id: string; title: string }[]>> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  const { data, error } = await auth.supabase
    .from("campaign_missions")
    .select("id,title")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  return error
    ? { success: false, error: error.message }
    : {
        success: true,
        data: (data ?? []).map((m) => ({
          id: m.id,
          title: m.title,
        })),
      };
}
export async function uploadTacticalSceneMapAction(
  campaignId: string,
  formData: FormData,
): Promise<Result<{ id: string; imagePath: string }>> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  const uploaded = await createExplorationMapFromFormData(
    auth.supabase,
    campaignId,
    formData,
  );
  if (!uploaded.success) return uploaded;
  const { data, error } = await auth.supabase
    .from("campaign_exploration_maps")
    .select("id,image_path")
    .eq("id", uploaded.data.id)
    .single();
  return error || !data
    ? { success: false, error: error?.message ?? "Asset non trovato." }
    : { success: true, data: { id: data.id, imagePath: data.image_path } };
}

export async function discardPendingTacticalSceneMapAction(
  campaignId: string,
  mapId: string,
): Promise<Result<null>> {
  const result = await deleteExplorationMap(campaignId, mapId);
  return result.success
    ? { success: true, data: null }
    : { success: false, error: result.error ?? "Pulizia mappa non riuscita." };
}

export async function createTacticalSceneAction(
  campaignId: string,
  rawDocument: string,
): Promise<
  Result<{
    sceneId: string;
    revisionId: string;
    revisionNo: number;
    document: TacticalScene;
  }>
> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  const parsed = parseDocument(rawDocument);
  if (!parsed.success || parsed.data.campaignId !== campaignId)
    return {
      success: false,
      error: parsed.success
        ? "Campagna della scena non coerente."
        : parsed.error,
    };
  const { data, error } = await auth.supabase.rpc(
    "create_tactical_scene_with_revision",
    { p_campaign_id: campaignId, p_document: parsed.data },
  );
  if (error || !data)
    return {
      success: false,
      error: error?.message ?? "Creazione scena non riuscita.",
    };
  const row = (Array.isArray(data) ? data[0] : data) as {
    scene_id?: string;
    revision_id?: string;
    revision_no?: number;
    document?: unknown;
  };
  const normalized = row.document ? parseTacticalScene(row.document) : null;
  if (
    !row.scene_id ||
    !row.revision_id ||
    row.revision_no === undefined ||
    !normalized?.ok
  )
    return {
      success: false,
      error: "La scena restituita dal database non è valida.",
    };
  revalidatePath(`/campaigns/${campaignId}/gm-only/scene-workspace`);
  return {
    success: true,
    data: {
      sceneId: row.scene_id,
      revisionId: row.revision_id,
      revisionNo: row.revision_no,
      document: normalized.scene,
    },
  };
}

export async function saveTacticalSceneRevisionAction(
  sceneId: string,
  expectedRevisionNo: number,
  rawDocument: string,
): Promise<
  Result<{
    sceneId: string;
    revisionId: string;
    revisionNo: number;
    document: TacticalScene;
  }>
> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  const parsed = parseDocument(rawDocument);
  if (!parsed.success) return parsed;
  const { data, error } = await auth.supabase.rpc(
    "save_tactical_scene_revision",
    {
      p_scene_id: sceneId,
      p_expected_revision_no: expectedRevisionNo,
      p_document: parsed.data,
    },
  );
  if (error || !data)
    return {
      success: false,
      error: error?.message ?? "Salvataggio revisione non riuscito.",
    };
  const row = (Array.isArray(data) ? data[0] : data) as {
    revision_id?: string;
    revision_no?: number;
    document?: unknown;
  };
  const normalized = row.document ? parseTacticalScene(row.document) : null;
  if (!row.revision_id || !row.revision_no || !normalized?.ok)
    return {
      success: false,
      error: "La revisione restituita dal database non è valida.",
    };
  return {
    success: true,
    data: {
      sceneId,
      revisionId: row.revision_id,
      revisionNo: row.revision_no,
      document: normalized.scene,
    },
  };
}

export async function publishTacticalSceneAction(
  sceneId: string,
  revisionId: string,
  revisionNo: number,
): Promise<Result<{ publicationId: string; document: TacticalScene }>> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  const { data: revision } = await auth.supabase
    .from("tactical_scene_revisions")
    .select("document")
    .eq("id", revisionId)
    .eq("scene_id", sceneId)
    .single();
  const checked = revision ? parseTacticalScene(revision.document) : null;
  if (!checked?.ok)
    return { success: false, error: "Revisione scena non valida." };
  try {
    assertPublishableScene(checked.scene);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Mappa obbligatoria prima della pubblicazione.",
    };
  }
  const { data, error } = await auth.supabase.rpc("publish_tactical_scene", {
    p_scene_id: sceneId,
    p_revision_id: revisionId,
    p_revision_no: revisionNo,
  });
  if (error || !data)
    return {
      success: false,
      error: error?.message ?? "Pubblicazione non riuscita.",
    };
  const row = (Array.isArray(data) ? data[0] : data) as {
    publication_id?: string;
    document?: unknown;
  };
  const parsed = row.document ? parseTacticalScene(row.document) : null;
  if (!row.publication_id || !parsed?.ok)
    return {
      success: false,
      error: "La pubblicazione restituita dal database non è valida.",
    };
  return {
    success: true,
    data: { publicationId: row.publication_id, document: parsed.scene },
  };
}

export async function rollbackTacticalScenePublicationAction(
  sceneId: string,
): Promise<Result<{ revoked: boolean }>> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  const { data, error } = await auth.supabase.rpc(
    "rollback_tactical_scene_publication",
    { p_scene_id: sceneId },
  );
  if (error) return { success: false, error: error.message };
  return { success: true, data: { revoked: Boolean(data) } };
}

export async function updateTacticalFowRuntimeAction(
  sceneId: string,
  publicationId: string,
  revisionNo: number,
  rawDocument: string,
): Promise<Result<null>> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  const parsed = parseDocument(rawDocument);
  if (!parsed.success) return parsed;
  const { error } = await auth.supabase.rpc(
    "update_tactical_scene_fow_runtime",
    {
      p_scene_id: sceneId,
      p_publication_id: publicationId,
      p_revision_no: revisionNo,
      p_document: parsed.data.fow,
    },
  );
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}

export async function getTacticalPublicationAction(
  sceneId: string,
): Promise<Result<TacticalScene>> {
  const auth = await requireTacticalGm();
  if (!auth.success) return auth;
  const { data, error } = await auth.supabase
    .from("tactical_scene_publications")
    .select("id, document")
    .eq("scene_id", sceneId)
    .is("revoked_at", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data)
    return {
      success: false,
      error: error?.message ?? "Pubblicazione non trovata.",
    };
  const parsed = parseTacticalScene(data.document);
  if (!parsed.ok) return { success: false, error: parsed.errors.join("; ") };
  const { data: runtime } = await auth.supabase
    .from("tactical_scene_fow_runtime")
    .select("document")
    .eq("scene_id", sceneId)
    .eq("publication_id", data.id)
    .maybeSingle();
  if (!runtime) return { success: true, data: parsed.scene };
  const fow = runtime.document as TacticalScene["fow"];
  return { success: true, data: { ...parsed.scene, fow } };
}
