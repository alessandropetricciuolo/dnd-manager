"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const GM_FILES_BUCKET = "gm_files";
const SIGNED_URL_EXPIRY_SEC = 3600;

type GmResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/** Verifica che l'utente sia GM o Admin. Se no, ritorna errore. */
async function ensureGmOrAdmin(): Promise<GmResult<Awaited<ReturnType<typeof createSupabaseServerClient>>>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: "Non autenticato." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return { success: false, error: "Unauthorized." };
  }
  return { success: true, data: supabase };
}

// ---------- GM Notes ----------

export type GmNoteRow = {
  id: string;
  campaign_id: string;
  session_id: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

/**
 * Lista note GM. Se sessionId è valorizzato: note della sessione + note globali (session_id NULL).
 * Se sessionId è null/undefined: solo note globali.
 */
export async function listGmNotes(
  campaignId: string,
  sessionId?: string | null
): Promise<GmResult<GmNoteRow[]>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  let query = supabase
    .from("gm_notes")
    .select("id, campaign_id, session_id, title, content, created_at, updated_at")
    .eq("campaign_id", campaignId);

  if (sessionId != null && sessionId !== "") {
    query = query.or(`session_id.eq.${sessionId},session_id.is.null`);
  } else {
    query = query.is("session_id", null);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    console.error("[listGmNotes]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento delle note." };
  }
  return { success: true, data: (data ?? []) as GmNoteRow[] };
}

export type CampaignSessionOption = {
  id: string;
  title: string | null;
  scheduled_at: string;
};

/** Sessioni della campagna (scheduled) per il selettore GM Screen. */
export async function getCampaignSessionsForGm(
  campaignId: string
): Promise<GmResult<CampaignSessionOption[]>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const { data, error } = await supabase
    .from("sessions")
    .select("id, title, scheduled_at")
    .eq("campaign_id", campaignId)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[getCampaignSessionsForGm]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento delle sessioni." };
  }
  return { success: true, data: (data ?? []) as CampaignSessionOption[] };
}

export async function createGmNote(
  campaignId: string,
  payload: { title: string; content: string; session_id?: string | null }
): Promise<GmResult<GmNoteRow>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const title = payload.title?.trim() ?? "";
  if (!title) return { success: false, error: "Il titolo è obbligatorio." };

  const session_id = payload.session_id === undefined || payload.session_id === "" ? null : payload.session_id;

  const { data, error } = await supabase
    .from("gm_notes")
    .insert({
      campaign_id: campaignId,
      title,
      content: payload.content?.trim() ?? "",
      session_id,
    })
    .select("id, campaign_id, session_id, title, content, created_at, updated_at")
    .single();

  if (error) {
    console.error("[createGmNote]", error);
    return { success: false, error: error.message ?? "Errore nella creazione della nota." };
  }
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: data as GmNoteRow };
}

export async function updateGmNote(
  noteId: string,
  payload: { title: string; content: string; session_id?: string | null }
): Promise<GmResult<GmNoteRow>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const title = payload.title?.trim() ?? "";
  if (!title) return { success: false, error: "Il titolo è obbligatorio." };

  const updatePayload: { title: string; content: string; session_id: string | null } = {
    title,
    content: payload.content?.trim() ?? "",
    session_id: payload.session_id === undefined || payload.session_id === "" ? null : payload.session_id,
  };

  const { data, error } = await supabase
    .from("gm_notes")
    .update(updatePayload)
    .eq("id", noteId)
    .select("id, campaign_id, session_id, title, content, created_at, updated_at")
    .single();

  if (error) {
    console.error("[updateGmNote]", error);
    return { success: false, error: error.message ?? "Errore nell'aggiornamento della nota." };
  }
  const campaignId = (data as GmNoteRow).campaign_id;
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: data as GmNoteRow };
}

export async function deleteGmNote(noteId: string): Promise<GmResult<{ campaignId: string }>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const { data: note, error: fetchError } = await supabase
    .from("gm_notes")
    .select("campaign_id")
    .eq("id", noteId)
    .single();

  if (fetchError || !note) {
    return { success: false, error: "Nota non trovata." };
  }

  const { error: deleteError } = await supabase.from("gm_notes").delete().eq("id", noteId);
  if (deleteError) {
    console.error("[deleteGmNote]", deleteError);
    return { success: false, error: deleteError.message ?? "Errore nell'eliminazione." };
  }
  revalidatePath(`/campaigns/${note.campaign_id}`);
  return { success: true, data: { campaignId: note.campaign_id } };
}

// ---------- GM Attachments (file) ----------

export type GmAttachmentRow = {
  id: string;
  campaign_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
  signed_url?: string;
};

export async function listGmAttachments(campaignId: string): Promise<GmResult<GmAttachmentRow[]>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const { data: rows, error } = await supabase
    .from("gm_attachments")
    .select("id, campaign_id, file_path, file_name, mime_type, file_size, created_at")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listGmAttachments]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento dei file." };
  }

  const list = (rows ?? []) as Omit<GmAttachmentRow, "signed_url">[];
  const withUrls: GmAttachmentRow[] = [];

  for (const row of list) {
    const isExternalUrl = row.file_path.startsWith("http");
    const signed_url = isExternalUrl
      ? row.file_path
      : (await supabase.storage.from(GM_FILES_BUCKET).createSignedUrl(row.file_path, SIGNED_URL_EXPIRY_SEC)).data
          ?.signedUrl ?? undefined;
    withUrls.push({ ...row, signed_url });
  }

  return { success: true, data: withUrls };
}

const ALLOWED_MIME = new RegExp(
  "^(image/|application/pdf$|application/msword$|application/vnd\\.openxmlformats-officedocument\\.)"
);

export async function uploadGmFile(campaignId: string, formData: FormData): Promise<GmResult<GmAttachmentRow>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "Seleziona un file (PDF, immagine o documento)." };
  }
  if (!ALLOWED_MIME.test(file.type)) {
    return {
      success: false,
      error: "Tipo file non consentito. Usa PDF, immagini o documenti (DOC/DOCX).",
    };
  }

  const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || "bin";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const path = `${campaignId}/${randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(GM_FILES_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    console.error("[uploadGmFile]", uploadError);
    return { success: false, error: uploadError.message ?? "Errore nel caricamento del file." };
  }

  const { data: row, error: insertError } = await supabase
    .from("gm_attachments")
    .insert({
      campaign_id: campaignId,
      file_path: path,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
    })
    .select("id, campaign_id, file_path, file_name, mime_type, file_size, created_at")
    .single();

  if (insertError) {
    await supabase.storage.from(GM_FILES_BUCKET).remove([path]);
    console.error("[uploadGmFile] insert", insertError);
    return { success: false, error: insertError.message ?? "Errore nel salvataggio del file." };
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: row as GmAttachmentRow };
}

export async function deleteGmAttachment(attachmentId: string): Promise<GmResult<{ campaignId: string }>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const { data: att, error: fetchError } = await supabase
    .from("gm_attachments")
    .select("campaign_id, file_path")
    .eq("id", attachmentId)
    .single();

  if (fetchError || !att) {
    return { success: false, error: "Allegato non trovato." };
  }

  if (!att.file_path.startsWith("http")) {
    await supabase.storage.from(GM_FILES_BUCKET).remove([att.file_path]);
  }
  const { error: deleteError } = await supabase.from("gm_attachments").delete().eq("id", attachmentId);
  if (deleteError) {
    console.error("[deleteGmAttachment]", deleteError);
    return { success: false, error: deleteError.message ?? "Errore nell'eliminazione." };
  }
  revalidatePath(`/campaigns/${att.campaign_id}`);
  return { success: true, data: { campaignId: att.campaign_id } };
}

// ---------- Session Debrief (Chiusura Sessione GM Screen) ----------

export type CoreEntityForDebrief = {
  id: string;
  name: string;
  type: string;
  global_status: "alive" | "dead";
};

/** Restituisce le voci Wiki (NPC/Mostri/Luoghi) core per il debrief: solo quelle in entityIds con is_core = true. */
export async function getCoreEntitiesForDebrief(
  campaignId: string,
  entityIds: string[]
): Promise<GmResult<CoreEntityForDebrief[]>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  if (!entityIds.length) {
    return { success: true, data: [] };
  }

  const { data, error } = await supabase
    .from("wiki_entities")
    .select("id, name, type, global_status")
    .eq("campaign_id", campaignId)
    .eq("is_core", true)
    .in("id", entityIds);

  if (error) {
    console.error("[getCoreEntitiesForDebrief]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento." };
  }

  const list = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    global_status: (r.global_status === "dead" ? "dead" : "alive") as "alive" | "dead",
  }));
  return { success: true, data: list };
}

/** Salva debrief: summary sulla sessione, status = completed, e (se campagna Long) aggiorna global_status sulle entità core. */
export async function saveSessionDebrief(
  sessionId: string,
  payload: {
    summary: string;
    entityStatusUpdates: Record<string, "alive" | "dead">;
  }
): Promise<GmResult<{ campaignId: string }>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const { data: session, error: sessionErr } = await supabase
    .from("sessions")
    .select("id, campaign_id, status")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !session) {
    return { success: false, error: "Sessione non trovata." };
  }
  if (session.status !== "scheduled") {
    return { success: false, error: "La sessione è già chiusa." };
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("type")
    .eq("id", session.campaign_id)
    .single();

  const isLongCampaign = campaign?.type === "long";

  const { error: updateSessionErr } = await supabase
    .from("sessions")
    .update({
      status: "completed",
      session_summary: payload.summary?.trim() || null,
    })
    .eq("id", sessionId);

  if (updateSessionErr) {
    console.error("[saveSessionDebrief] session", updateSessionErr);
    return { success: false, error: updateSessionErr.message ?? "Errore nel salvataggio." };
  }

  if (isLongCampaign && Object.keys(payload.entityStatusUpdates).length > 0) {
    for (const [entityId, status] of Object.entries(payload.entityStatusUpdates)) {
      const { error: entityErr } = await supabase
        .from("wiki_entities")
        .update({ global_status: status })
        .eq("id", entityId)
        .eq("campaign_id", session.campaign_id)
        .eq("is_core", true);
      if (entityErr) {
        console.error("[saveSessionDebrief] entity", entityId, entityErr);
      }
    }
  }

  revalidatePath(`/campaigns/${session.campaign_id}`);
  revalidatePath("/dashboard");
  return { success: true, data: { campaignId: session.campaign_id } };
}
