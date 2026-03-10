"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { uploadToTelegram } from "@/lib/telegram-storage";

const GM_FILES_BUCKET = "gm_files";
const GM_FILES_TELEGRAM_PREFIX = "tg:";
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

export type CompletedSessionRow = {
  id: string;
  title: string | null;
  scheduled_at: string;
  session_summary: string | null;
  party_id: string | null;
  chapter_title: string | null;
  campaign_parties?: { name: string; color: string | null } | null;
  /** Presente solo per GM/Admin; non esporre ai player. */
  gm_private_notes?: string | null;
};

/** Sessioni concluse per Session History Manager (solo GM). Ordine: più recente prima. Include gm_private_notes. */
export async function getCompletedSessionsForCampaign(
  campaignId: string
): Promise<GmResult<CompletedSessionRow[]>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const { data, error } = await supabase
    .from("sessions")
    .select("id, title, scheduled_at, session_summary, party_id, chapter_title, gm_private_notes, campaign_parties(name, color)")
    .eq("campaign_id", campaignId)
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false });

  if (error) {
    console.error("[getCompletedSessionsForCampaign]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento." };
  }

  const rows = (data ?? []).map((r) => {
    const rawParty = (r as { campaign_parties?: { name: string; color: string | null } | { name: string; color: string | null }[] | null }).campaign_parties;
    const party = Array.isArray(rawParty) ? rawParty[0] ?? null : rawParty ?? null;
    return {
      id: r.id,
      title: r.title ?? null,
      scheduled_at: r.scheduled_at,
      session_summary: r.session_summary ?? null,
      party_id: r.party_id ?? null,
      chapter_title: r.chapter_title ?? null,
      gm_private_notes: (r as { gm_private_notes?: string | null }).gm_private_notes ?? null,
      campaign_parties: party,
    };
  });
  return { success: true, data: rows as CompletedSessionRow[] };
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
    let signed_url: string | undefined;
    if (row.file_path.startsWith("http")) {
      signed_url = row.file_path;
    } else if (row.file_path.startsWith(GM_FILES_TELEGRAM_PREFIX)) {
      const fileId = encodeURIComponent(row.file_path.slice(GM_FILES_TELEGRAM_PREFIX.length));
      const name = encodeURIComponent(row.file_name || "file");
      signed_url = `/api/tg-file/${fileId}?name=${name}`;
    } else {
      signed_url = (await supabase.storage.from(GM_FILES_BUCKET).createSignedUrl(row.file_path, SIGNED_URL_EXPIRY_SEC)).data
        ?.signedUrl ?? undefined;
    }
    withUrls.push({ ...row, signed_url });
  }

  return { success: true, data: withUrls };
}

/** File GM: archivio su Telegram (qualsiasi tipo di file). file_path = "tg:" + telegram file_id. */
export async function uploadGmFile(campaignId: string, formData: FormData): Promise<GmResult<GmAttachmentRow>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const file = formData.get("file") as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { success: false, error: "Seleziona un file da caricare." };
  }

  let telegramFileId: string;
  try {
    telegramFileId = await uploadToTelegram(file, undefined, "document");
  } catch (err) {
    console.error("[uploadGmFile] Telegram", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Errore nel caricamento su Telegram.",
    };
  }

  const file_path = GM_FILES_TELEGRAM_PREFIX + telegramFileId;

  const { data: row, error: insertError } = await supabase
    .from("gm_attachments")
    .insert({
      campaign_id: campaignId,
      file_path,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
    })
    .select("id, campaign_id, file_path, file_name, mime_type, file_size, created_at")
    .single();

  if (insertError) {
    console.error("[uploadGmFile] insert", insertError);
    return { success: false, error: insertError.message ?? "Errore nel salvataggio del file." };
  }

  const signed_url = `/api/tg-file/${encodeURIComponent(telegramFileId)}?name=${encodeURIComponent(file.name)}`;
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: { ...row, signed_url } as GmAttachmentRow };
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

  if (!att.file_path.startsWith("http") && !att.file_path.startsWith(GM_FILES_TELEGRAM_PREFIX)) {
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
  global_status: "alive" | "dead" | "missing";
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
    global_status: (r.global_status === "dead" ? "dead" : r.global_status === "missing" ? "missing" : "alive") as "alive" | "dead" | "missing",
  }));
  return { success: true, data: list };
}

/** Salva debrief: summary sulla sessione, status = completed, note segrete GM, e (se campagna Long) aggiorna global_status sulle entità core. */
export async function saveSessionDebrief(
  sessionId: string,
  payload: {
    summary: string;
    gm_private_notes?: string | null;
    entityStatusUpdates: Record<string, "alive" | "dead" | "missing">;
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

  const sessionUpdate: { status: string; session_summary: string | null; gm_private_notes?: string | null } = {
    status: "completed",
    session_summary: payload.summary?.trim() || null,
  };
  if (payload.gm_private_notes !== undefined) {
    sessionUpdate.gm_private_notes = payload.gm_private_notes?.trim() || null;
  }
  const { error: updateSessionErr } = await supabase
    .from("sessions")
    .update(sessionUpdate)
    .eq("id", sessionId);

  if (updateSessionErr) {
    console.error("[saveSessionDebrief] session", updateSessionErr);
    return { success: false, error: updateSessionErr.message ?? "Errore nel salvataggio." };
  }

  if (isLongCampaign && Object.keys(payload.entityStatusUpdates).length > 0) {
    for (const [entityId, status] of Object.entries(payload.entityStatusUpdates)) {
      const safeStatus = status === "alive" || status === "dead" || status === "missing" ? status : "alive";
      const { error: entityErr } = await supabase
        .from("wiki_entities")
        .update({ global_status: safeStatus })
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
