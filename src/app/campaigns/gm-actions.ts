"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { uploadToTelegram } from "@/lib/telegram-storage";
import { parseSafeExternalUrl } from "@/lib/security/url";
import {
  deleteCampaignMemorySource,
  syncGmNoteToCampaignMemory,
} from "@/lib/campaign-memory-indexer";

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
  image_url: string | null;
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
    .select("id, campaign_id, session_id, title, content, image_url, created_at, updated_at")
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
  is_pre_closed?: boolean | null;
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
    .select("id, title, scheduled_at, is_pre_closed")
    .eq("campaign_id", campaignId)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[getCampaignSessionsForGm]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento delle sessioni." };
  }
  return { success: true, data: (data ?? []) as CampaignSessionOption[] };
}

export type PreClosedSessionRow = {
  id: string;
  title: string | null;
  scheduled_at: string;
};

/** Sessione salvata in bozza (pre-chiusura) per una campagna, se esiste. Visibile a tutti i GM/Admin. */
export async function getPreClosedSessionForCampaign(
  campaignId: string
): Promise<GmResult<PreClosedSessionRow | null>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const { data, error } = await supabase
    .from("sessions")
    .select("id, title, scheduled_at, is_pre_closed, status")
    .eq("campaign_id", campaignId)
    .eq("is_pre_closed", true)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getPreClosedSessionForCampaign]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento." };
  }
  if (!data) {
    return { success: true, data: null };
  }
  const row = data as { id: string; title: string | null; scheduled_at: string };
  return {
    success: true,
    data: {
      id: row.id,
      title: row.title,
      scheduled_at: row.scheduled_at,
    },
  };
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
  played_by?: Array<{ player_id: string; player_name: string }>;
};

export type DashboardCompletedSessionRow = CompletedSessionRow & {
  campaign_id: string;
  campaign_name: string;
};

const DASHBOARD_COMPLETED_SESSIONS_LIMIT = 150;

async function fetchPlayedByMapForSessionIds(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  sessionIds: string[]
): Promise<Map<string, Array<{ player_id: string; player_name: string }>>> {
  const empty = new Map<string, Array<{ player_id: string; player_name: string }>>();
  if (sessionIds.length === 0) return empty;

  const { data: signupsRaw, error: signupsError } = await admin
    .from("session_signups")
    .select("session_id, player_id, status")
    .in("session_id", sessionIds)
    .in("status", ["attended", "approved"]);

  if (signupsError) {
    console.error("[fetchPlayedByMapForSessionIds] signups", signupsError);
    return empty;
  }

  const signups = (signupsRaw ?? []) as Array<{
    session_id: string;
    player_id: string;
    status: string | null;
  }>;

  const playerIds = [...new Set(signups.map((s) => s.player_id).filter(Boolean))];
  const { data: profilesRaw, error: profilesError } = playerIds.length
    ? await admin
        .from("profiles")
        .select("id, first_name, last_name, display_name")
        .in("id", playerIds)
    : { data: [], error: null };

  if (profilesError) {
    console.error("[fetchPlayedByMapForSessionIds] profiles", profilesError);
  }

  const profileNameById = new Map(
    ((profilesRaw ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null; display_name: string | null }>).map(
      (p) => {
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        return [p.id, fullName || p.display_name?.trim() || `Utente ${p.id.slice(0, 8)}`] as const;
      }
    )
  );

  const statusRank = (status: string | null): number => (status === "attended" ? 2 : status === "approved" ? 1 : 0);
  const playedByMap = new Map<string, Array<{ player_id: string; player_name: string }>>();
  const playerStatusBySession = new Map<string, Map<string, string | null>>();

  for (const signup of signups) {
    const statusByPlayer = playerStatusBySession.get(signup.session_id) ?? new Map<string, string | null>();
    const prev = statusByPlayer.get(signup.player_id) ?? null;
    if (!prev || statusRank(signup.status) > statusRank(prev)) {
      statusByPlayer.set(signup.player_id, signup.status);
    }
    playerStatusBySession.set(signup.session_id, statusByPlayer);
  }

  for (const [sessionId, statusByPlayer] of playerStatusBySession.entries()) {
    const players = [...statusByPlayer.keys()]
      .map((playerId) => ({
        player_id: playerId,
        player_name: profileNameById.get(playerId) ?? `Utente ${playerId.slice(0, 8)}`,
      }))
      .sort((a, b) => a.player_name.localeCompare(b.player_name, "it"));
    playedByMap.set(sessionId, players);
  }

  return playedByMap;
}

function normalizeCampaignNameFromJoin(raw: unknown): string {
  if (raw == null) return "Campagna";
  if (typeof raw === "object" && raw !== null && "name" in raw && typeof (raw as { name: unknown }).name === "string") {
    return ((raw as { name: string }).name || "").trim() || "Campagna";
  }
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object" && "name" in raw[0]) {
    return String((raw[0] as { name?: string }).name ?? "").trim() || "Campagna";
  }
  return "Campagna";
}

/**
 * Storico sessioni concluse per dashboard GM/Admin: ultime N, con campagna e giocatori.
 * Admin: tutte le campagne. GM: solo campagne di cui è titolare (`gm_id`).
 */
export async function getCompletedSessionsDashboardForGmAdmin(): Promise<GmResult<DashboardCompletedSessionRow[]>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Non autenticato." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";
  const admin = createSupabaseAdminClient();

  let query = admin
    .from("sessions")
    .select(
      "id, campaign_id, title, scheduled_at, session_summary, party_id, chapter_title, gm_private_notes, campaigns(name), campaign_parties(name, color)"
    )
    .eq("status", "completed")
    .order("scheduled_at", { ascending: false })
    .limit(DASHBOARD_COMPLETED_SESSIONS_LIMIT);

  if (!isAdmin) {
    const { data: myCampaigns, error: campErr } = await admin.from("campaigns").select("id").eq("gm_id", user.id);
    if (campErr) {
      console.error("[getCompletedSessionsDashboardForGmAdmin] campaigns", campErr);
      return { success: false, error: campErr.message ?? "Errore nel caricamento." };
    }
    const ids = (myCampaigns ?? []).map((c) => (c as { id: string }).id).filter(Boolean);
    if (ids.length === 0) {
      return { success: true, data: [] };
    }
    query = query.in("campaign_id", ids);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getCompletedSessionsDashboardForGmAdmin]", error);
    return { success: false, error: error.message ?? "Errore nel caricamento." };
  }

  const baseRows = (data ?? []).map((r) => {
    const rawParty = (r as { campaign_parties?: { name: string; color: string | null } | { name: string; color: string | null }[] | null }).campaign_parties;
    const party = Array.isArray(rawParty) ? rawParty[0] ?? null : rawParty ?? null;
    const campaignRaw = (r as { campaigns?: unknown }).campaigns;
    const campaignName = normalizeCampaignNameFromJoin(campaignRaw);
    const campaignId = (r as { campaign_id: string }).campaign_id;
    return {
      campaign_id: campaignId,
      campaign_name: campaignName,
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

  const sessionIds = baseRows.map((r) => r.id);
  const playedByMap = await fetchPlayedByMapForSessionIds(admin, sessionIds);

  const rows = baseRows.map((row) => ({
    ...row,
    played_by: playedByMap.get(row.id) ?? [],
  }));

  return { success: true, data: rows as DashboardCompletedSessionRow[] };
}

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

  const baseRows = (data ?? []).map((r) => {
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

  const sessionIds = baseRows.map((r) => r.id);
  if (sessionIds.length === 0) {
    return { success: true, data: baseRows as CompletedSessionRow[] };
  }

  const admin = createSupabaseAdminClient();
  const playedByMap = await fetchPlayedByMapForSessionIds(admin, sessionIds);

  const rows = baseRows.map((row) => ({
    ...row,
    played_by: playedByMap.get(row.id) ?? [],
  }));

  return { success: true, data: rows as CompletedSessionRow[] };
}

/**
 * Crea una nota GM. Accetta FormData con: title, content, session_id (opzionale), image (file), image_url (URL).
 * Se è presente un file in "image", viene caricato su Telegram e image_url viene impostato a /api/tg-image/{fileId}.
 */
export async function createGmNote(
  campaignId: string,
  formData: FormData
): Promise<GmResult<GmNoteRow>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  if (!title) return { success: false, error: "Il titolo è obbligatorio." };

  const content = (formData.get("content") as string | null)?.trim() ?? "";
  const sessionIdRaw = formData.get("session_id") as string | null;
  const session_id = sessionIdRaw === undefined || sessionIdRaw === "" ? null : (sessionIdRaw?.trim() || null);

  const imageUrlRaw = (formData.get("image_url") as string | null)?.trim() || null;
  let image_url: string | null =
    imageUrlRaw && imageUrlRaw.startsWith("http")
      ? parseSafeExternalUrl(imageUrlRaw)
      : imageUrlRaw;
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile instanceof File && imageFile.size > 0) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(imageFile.type)) {
      return { success: false, error: "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF." };
    }
    try {
      const fileId = await uploadToTelegram(imageFile);
      image_url = `/api/tg-image/${fileId}`;
    } catch (err) {
      console.error("[createGmNote] Telegram upload", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Errore nel caricamento dell'immagine su Telegram.",
      };
    }
  }
  if (imageUrlRaw && imageUrlRaw.startsWith("http") && !image_url) {
    return { success: false, error: "URL immagine non valido o non consentito." };
  }

  const { data, error } = await supabase
    .from("gm_notes")
    .insert({
      campaign_id: campaignId,
      title,
      content,
      session_id,
      image_url,
    })
    .select("id, campaign_id, session_id, title, content, image_url, created_at, updated_at")
    .single();

  if (error) {
    console.error("[createGmNote]", error);
    return { success: false, error: error.message ?? "Errore nella creazione della nota." };
  }
  try {
    const admin = createSupabaseAdminClient();
    await syncGmNoteToCampaignMemory(admin, data.id, { campaignId });
  } catch (memoryErr) {
    console.error("[createGmNote] campaign memory sync", memoryErr);
  }
  revalidatePath(`/campaigns/${campaignId}`);
  return { success: true, data: data as GmNoteRow };
}

/**
 * Aggiorna una nota GM. Accetta FormData con: title, content, session_id, image (file), image_url, remove_image (on per rimuovere).
 */
export async function updateGmNote(noteId: string, formData: FormData): Promise<GmResult<GmNoteRow>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const title = (formData.get("title") as string | null)?.trim() ?? "";
  if (!title) return { success: false, error: "Il titolo è obbligatorio." };

  const content = (formData.get("content") as string | null)?.trim() ?? "";
  const sessionIdRaw = formData.get("session_id") as string | null;
  const session_id = sessionIdRaw === undefined || sessionIdRaw === "" ? null : (sessionIdRaw?.trim() || null);
  const removeImage = formData.get("remove_image") === "on" || formData.get("remove_image") === "true";

  const { data: existing } = await supabase
    .from("gm_notes")
    .select("campaign_id, image_url")
    .eq("id", noteId)
    .single();

  if (!existing) return { success: false, error: "Nota non trovata." };

  let image_url: string | null = (existing as { image_url?: string | null }).image_url ?? null;
  if (removeImage) {
    image_url = null;
  } else {
    const imageFile = formData.get("image") as File | null;
    const urlFromFormRaw = (formData.get("image_url") as string | null)?.trim() || null;
    const urlFromForm =
      urlFromFormRaw && urlFromFormRaw.startsWith("http")
        ? parseSafeExternalUrl(urlFromFormRaw)
        : urlFromFormRaw;
    if (imageFile && imageFile instanceof File && imageFile.size > 0) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(imageFile.type)) {
        return { success: false, error: "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF." };
      }
      try {
        const fileId = await uploadToTelegram(imageFile);
        image_url = `/api/tg-image/${fileId}`;
      } catch (err) {
        console.error("[updateGmNote] Telegram upload", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Errore nel caricamento dell'immagine su Telegram.",
        };
      }
    } else if (urlFromForm) {
      image_url = urlFromForm;
    }
    if (urlFromFormRaw && urlFromFormRaw.startsWith("http") && !urlFromForm) {
      return { success: false, error: "URL immagine non valido o non consentito." };
    }
  }

  const updatePayload: { title: string; content: string; session_id: string | null; image_url: string | null } = {
    title,
    content,
    session_id,
    image_url,
  };

  const { data, error } = await supabase
    .from("gm_notes")
    .update(updatePayload)
    .eq("id", noteId)
    .select("id, campaign_id, session_id, title, content, image_url, created_at, updated_at")
    .single();

  if (error) {
    console.error("[updateGmNote]", error);
    return { success: false, error: error.message ?? "Errore nell'aggiornamento della nota." };
  }
  const campaignId = (data as GmNoteRow).campaign_id;
  try {
    const admin = createSupabaseAdminClient();
    await syncGmNoteToCampaignMemory(admin, noteId, { campaignId });
  } catch (memoryErr) {
    console.error("[updateGmNote] campaign memory sync", memoryErr);
  }
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
  try {
    const admin = createSupabaseAdminClient();
    await deleteCampaignMemorySource(admin, note.campaign_id, "gm_note", noteId);
  } catch (memoryErr) {
    console.error("[deleteGmNote] campaign memory delete", memoryErr);
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

/**
 * Registra in gm_attachments un file già caricato su Supabase Storage (bucket gm_files).
 * Usare dopo upload diretto dal client per supportare file > 4MB.
 */
export async function registerGmFileAfterUpload(
  campaignId: string,
  filePath: string,
  fileName: string,
  mimeType: string | null,
  fileSize: number | null
): Promise<GmResult<GmAttachmentRow>> {
  const check = await ensureGmOrAdmin();
  if (!check.success) return check;
  const supabase = check.data!;

  const normalized = filePath.replace(/\\/g, "/").trim();
  const prefix = `${campaignId}/`;
  if (!normalized.startsWith(prefix)) {
    return { success: false, error: "Percorso file non valido per questa campagna." };
  }

  const { data: row, error: insertError } = await supabase
    .from("gm_attachments")
    .insert({
      campaign_id: campaignId,
      file_path: normalized,
      file_name: fileName,
      mime_type: mimeType || null,
      file_size: fileSize != null && Number.isFinite(fileSize) ? Math.max(0, Math.floor(fileSize)) : null,
    })
    .select("id, campaign_id, file_path, file_name, mime_type, file_size, created_at")
    .single();

  if (insertError) {
    console.error("[registerGmFileAfterUpload]", insertError);
    return { success: false, error: insertError.message ?? "Errore nel salvataggio del file." };
  }

  const signed_url = (
    await supabase.storage.from(GM_FILES_BUCKET).createSignedUrl(normalized, SIGNED_URL_EXPIRY_SEC)
  ).data?.signedUrl ?? undefined;
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

