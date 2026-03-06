"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { getPlayerEmails } from "@/lib/player-emails";
import { sendEmail, wrapInTemplate, escapeHtml } from "@/lib/email";
import { uploadToTelegram } from "@/lib/telegram-storage";

export type CreateSessionResult = {
  success: boolean;
  message: string;
};

export async function createSession(
  campaignId: string,
  formData: FormData
): Promise<CreateSessionResult> {
  const date = (formData.get("date") as string | null)?.trim();
  const time = (formData.get("time") as string | null)?.trim() ?? "20:00";
  const location = (formData.get("location") as string | null)?.trim() ?? "";
  const maxPlayersStr = (formData.get("max_players") as string | null)?.trim();
  const maxPlayers = maxPlayersStr ? parseInt(maxPlayersStr, 10) : 6;
  const dmId = (formData.get("dm_id") as string | null)?.trim() || null;

  if (!date) {
    return { success: false, message: "La data è obbligatoria." };
  }
  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const canCreate = await isGmOrAdminByRole(supabase);
    if (!canCreate) {
      return { success: false, message: "Solo GM e Admin possono creare sessioni." };
    }

    const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
    if (Number.isNaN(Date.parse(scheduledAt))) {
      return { success: false, message: "Data o orario non validi." };
    }

    const { error } = await supabase.from("sessions").insert({
      campaign_id: campaignId,
      title: null,
      scheduled_at: scheduledAt,
      status: "scheduled",
      max_players: Math.max(1, Math.min(20, maxPlayers)),
      notes: location || null,
      ...(dmId && { dm_id: dmId }),
    });

    if (error) {
      console.error("[createSession]", error);
      return {
        success: false,
        message: error.message ?? "Errore durante la creazione della sessione.",
      };
    }

    try {
      const playerEmails = await getPlayerEmails();
      if (playerEmails.length > 0) {
        const dateLabel = format(new Date(scheduledAt), "EEEE d MMMM yyyy, HH:mm", { locale: it });
        void sendEmail({
          to: process.env.GMAIL_USER ?? "",
          bcc: playerEmails,
          subject: `Nuova Sessione in Calendario per ${dateLabel}`,
          html: wrapInTemplate(
            `<p>È stata inserita una nuova sessione in calendario per il <strong>${escapeHtml(dateLabel)}</strong>.</p><p>Accedi al sito per iscriverti.</p>`
          ),
        });
      }
    } catch (mailErr) {
      console.error("[createSession] invio email:", mailErr);
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Sessione creata!" };
  } catch (err) {
    console.error("[createSession]", err);
    return {
      success: false,
      message: "Si è verificato un errore imprevisto. Riprova.",
    };
  }
}

/** Modello Guild: chi ha ruolo gm o admin può gestire approvazioni/sessioni ovunque. */
async function isGmOrAdminByRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<boolean> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "gm" || profile?.role === "admin";
}

/** Per azioni su una campagna (es. sblocco contenuti) serve essere GM/Admin (Guild) o GM della campagna. */
async function isGmOrAdmin(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string
): Promise<boolean> {
  if (await isGmOrAdminByRole(supabase)) return true;
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("gm_id")
    .eq("id", campaignId)
    .single();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return campaign?.gm_id === user?.id;
}

export type JoinSessionResult = { success: boolean; message: string };

/** Iscrizione a una sessione. Inserisce session_signups senza status (default DB = pending). Errore se già iscritto. */
export async function joinSession(sessionId: string): Promise<JoinSessionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, campaign_id")
      .eq("id", sessionId)
      .single();
    if (sessionError || !session) {
      return { success: false, message: "Sessione non trovata." };
    }

    const { data: existing } = await supabase
      .from("session_signups")
      .select("id")
      .eq("session_id", sessionId)
      .eq("player_id", user.id)
      .maybeSingle();
    if (existing) {
      return { success: false, message: "Sei già iscritto a questa sessione." };
    }

    await supabase.rpc("ensure_my_profile");
    const { error: insertError } = await supabase.from("session_signups").insert({
      session_id: sessionId,
      player_id: user.id,
      status: "pending",
    });
    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, message: "Sei già iscritto a questa sessione." };
      }
      console.error("[joinSession]", insertError);
      return { success: false, message: insertError.message ?? "Errore durante l'iscrizione." };
    }

    revalidatePath(`/campaigns/${session.campaign_id}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Iscrizione effettuata. In attesa di approvazione." };
  } catch (err) {
    console.error("[joinSession]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type UpdateSignupStatusResult = { success: boolean; message: string };

export async function updateSignupStatus(
  signupId: string,
  newStatus: "pending" | "approved" | "attended" | "rejected"
): Promise<UpdateSignupStatusResult & { campaignId?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const { data: signup, error: signupError } = await supabase
      .from("session_signups")
      .select("id, session_id, player_id")
      .eq("id", signupId)
      .single();
    if (signupError || !signup) {
      return { success: false, message: "Iscrizione non trovata." };
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("campaign_id")
      .eq("id", signup.session_id)
      .single();
    if (!session?.campaign_id) {
      return { success: false, message: "Sessione non trovata." };
    }

    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, message: "Solo GM o Admin possono modificare lo stato." };
    }

    const { error: updateError } = await supabase
      .from("session_signups")
      .update({ status: newStatus })
      .eq("id", signupId);

    if (updateError) {
      console.error("[updateSignupStatus]", updateError);
      return { success: false, message: updateError.message ?? "Errore durante l'aggiornamento." };
    }

    if (newStatus === "approved") {
      try {
        const admin = createSupabaseAdminClient();
        const { data: sessionRow } = await admin
          .from("sessions")
          .select("title, scheduled_at")
          .eq("id", signup.session_id)
          .single();
        type SessionRow = { title: string | null; scheduled_at: string };
        const row = sessionRow as SessionRow | null;
        const title = row?.title?.trim() || "Sessione";
        const { data: authUser } = await admin.auth.admin.getUserById(signup.player_id);
        const toEmail = authUser?.user?.email;
        if (toEmail) {
          const dateLabel = row?.scheduled_at
            ? format(new Date(row.scheduled_at), "EEEE d MMMM yyyy, HH:mm", { locale: it })
            : "";
          void sendEmail({
            to: toEmail,
            subject: "Prenotazione Confermata!",
            html: wrapInTemplate(
              `<p>Il Master ti ha accettato per la sessione <strong>${escapeHtml(title)}</strong>${dateLabel ? ` del ${escapeHtml(dateLabel)}` : ""}.</p><p>Prepara i dadi!</p>`
            ),
          });
        }
      } catch (mailErr) {
        console.error("[updateSignupStatus] invio email:", mailErr);
      }
    }

    revalidatePath(`/campaigns/${session.campaign_id}`);
    return { success: true, message: "Stato aggiornato.", campaignId: session.campaign_id };
  } catch (err) {
    console.error("[updateSignupStatus]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type DeleteSignupResult = { success: boolean; message: string };

/** Rimuove un giocatore dalla sessione (solo GM/Admin). */
export async function deleteSignup(signupId: string): Promise<DeleteSignupResult & { campaignId?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, message: "Solo GM o Admin possono rimuovere iscritti." };
    }

    const { data: signup, error: signupError } = await supabase
      .from("session_signups")
      .select("id, session_id")
      .eq("id", signupId)
      .single();
    if (signupError || !signup) {
      return { success: false, message: "Iscrizione non trovata." };
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("campaign_id")
      .eq("id", signup.session_id)
      .single();
    if (!session?.campaign_id) {
      return { success: false, message: "Sessione non trovata." };
    }

    const { error: deleteError } = await supabase
      .from("session_signups")
      .delete()
      .eq("id", signupId);

    if (deleteError) {
      console.error("[deleteSignup]", deleteError);
      return { success: false, message: deleteError.message ?? "Errore durante la rimozione." };
    }

    revalidatePath(`/campaigns/${session.campaign_id}`);
    return { success: true, message: "Giocatore rimosso dalla sessione.", campaignId: session.campaign_id };
  } catch (err) {
    console.error("[deleteSignup]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type DeleteSessionResult = { success: boolean; message: string };

/** Elimina una sessione (solo GM/Admin). Le iscrizioni vengono rimosse in cascata. */
export async function deleteSession(sessionId: string): Promise<DeleteSessionResult & { campaignId?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, message: "Solo GM o Admin possono eliminare sessioni." };
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, campaign_id")
      .eq("id", sessionId)
      .single();
    if (sessionError || !session) {
      return { success: false, message: "Sessione non trovata." };
    }

    const admin = createSupabaseAdminClient();
    const { error: deleteError } = await admin.from("sessions").delete().eq("id", sessionId);

    if (deleteError) {
      console.error("[deleteSession]", deleteError);
      return { success: false, message: deleteError.message ?? "Errore durante l'eliminazione." };
    }

    revalidatePath(`/campaigns/${session.campaign_id}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Sessione eliminata.", campaignId: session.campaign_id };
  } catch (err) {
    console.error("[deleteSession]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type CloseSessionResult = { success: boolean; message: string };

/** attendanceData: record player_id -> 'attended' | 'absent'. Solo per iscritti approved. Chiude la sessione e aggiorna le presenze. */
export async function closeSession(
  sessionId: string,
  attendanceData: Record<string, "attended" | "absent">
): Promise<CloseSessionResult & { campaignId?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, message: "Solo GM o Admin possono chiudere sessioni." };
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, campaign_id, status")
      .eq("id", sessionId)
      .single();
    if (sessionError || !session) {
      return { success: false, message: "Sessione non trovata." };
    }
    if (session.status !== "scheduled") {
      return { success: false, message: "La sessione è già chiusa." };
    }

    const { data: signups } = await supabase
      .from("session_signups")
      .select("id, player_id, status")
      .eq("session_id", sessionId);

    const admin = createSupabaseAdminClient();

    for (const signup of signups ?? []) {
      const newStatus = attendanceData[signup.player_id] ?? "attended";
      if (signup.status === "approved") {
        await admin
          .from("session_signups")
          .update({ status: newStatus } as never)
          .eq("id", signup.id);
        if (newStatus === "attended") {
          const { data: existing } = await admin
            .from("campaign_members")
            .select("id")
            .eq("campaign_id", session.campaign_id)
            .eq("player_id", signup.player_id)
            .maybeSingle();
          if (!existing) {
            await admin.from("campaign_members").insert({
              campaign_id: session.campaign_id,
              player_id: signup.player_id,
            } as never);
          }
        }
      }
    }

    const { error: updateSessionError } = await admin
      .from("sessions")
      .update({ status: "completed" } as never)
      .eq("id", sessionId);

    if (updateSessionError) {
      console.error("[closeSession]", updateSessionError);
      return { success: false, message: updateSessionError.message ?? "Errore durante la chiusura." };
    }

    revalidatePath(`/campaigns/${session.campaign_id}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Sessione chiusa e appello registrato.", campaignId: session.campaign_id };
  } catch (err) {
    console.error("[closeSession]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type SetCampaignPublicResult = { success: boolean; message: string };

/** Imposta visibilità pubblica/privata di una campagna (solo GM/Admin). */
export async function setCampaignPublic(
  campaignId: string,
  isPublic: boolean
): Promise<SetCampaignPublicResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, message: "Solo GM o Admin possono modificare la visibilità." };
    }

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .single();
    if (!campaign) {
      return { success: false, message: "Campagna non trovata." };
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("campaigns")
      .update({ is_public: isPublic } as never)
      .eq("id", campaignId);

    if (error) {
      console.error("[setCampaignPublic]", error);
      return { success: false, message: error.message ?? "Errore durante l'aggiornamento." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/dashboard");
    return {
      success: true,
      message: isPublic ? "Campagna ora visibile a tutti i giocatori." : "Campagna ora privata.",
    };
  } catch (err) {
    console.error("[setCampaignPublic]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type DeleteCampaignResult = { success: boolean; message: string };

/** Elimina una campagna (solo GM/Admin). Sessioni, iscrizioni, wiki, mappe vengono rimossi in cascata. */
export async function deleteCampaign(campaignId: string): Promise<DeleteCampaignResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, message: "Solo GM o Admin possono eliminare campagne." };
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", campaignId)
      .single();
    if (campaignError || !campaign) {
      return { success: false, message: "Campagna non trovata." };
    }

    const admin = createSupabaseAdminClient();
    const { error: deleteError } = await admin.from("campaigns").delete().eq("id", campaignId);

    if (deleteError) {
      console.error("[deleteCampaign]", deleteError);
      return { success: false, message: deleteError.message ?? "Errore durante l'eliminazione." };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Campagna eliminata." };
  } catch (err) {
    console.error("[deleteCampaign]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

const WIKI_GROUP_LABELS: Record<string, string> = {
  npc: "NPC",
  location: "Luoghi",
  monster: "Mostri",
  item: "Oggetti",
  lore: "Lore",
};

export type UnlockableItem = {
  id: string;
  type: "wiki" | "map";
  name: string;
  /** Per raggruppare in UI: "Mappe", "NPC", "Luoghi", "Mostri", "Oggetti", "Lore" */
  groupLabel: string;
};

export async function getUnlockableContent(
  campaignId: string
): Promise<{ success: boolean; items: UnlockableItem[]; message?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, items: [], message: "Solo il GM o un Admin possono vedere i contenuti sbloccabili." };
    }

    const [wikiRes, mapsRes] = await Promise.all([
      supabase
        .from("wiki_entities")
        .select("id, name, type")
        .eq("campaign_id", campaignId)
        .eq("is_secret", true)
        .order("name"),
      supabase
        .from("maps")
        .select("id, name")
        .eq("campaign_id", campaignId)
        .eq("is_secret", true)
        .order("name"),
    ]);

    const wikiItems: UnlockableItem[] = (wikiRes.data ?? []).map((e) => ({
      id: e.id,
      type: "wiki" as const,
      name: e.name,
      groupLabel: WIKI_GROUP_LABELS[String(e.type)] ?? "Wiki",
    }));
    const mapItems: UnlockableItem[] = (mapsRes.data ?? []).map((m) => ({
      id: m.id,
      type: "map" as const,
      name: m.name,
      groupLabel: "Mappe",
    }));
    const items = [...mapItems, ...wikiItems].sort((a, b) => a.name.localeCompare(b.name));

    return { success: true, items };
  } catch (err) {
    console.error("[getUnlockableContent]", err);
    return { success: false, items: [], message: "Errore nel caricamento." };
  }
}

export type BatchUnlockContentResult = { success: boolean; message: string };

/** Sblocca in batch contenuti per più giocatori. Crea record in explorations; duplicati ignorati. */
export async function batchUnlockContent(
  campaignId: string,
  userIds: string[],
  contentIds: { id: string; type: "wiki" | "map" }[]
): Promise<BatchUnlockContentResult> {
  if (userIds.length === 0 || contentIds.length === 0) {
    return { success: true, message: "Nessun sblocco da applicare." };
  }
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdmin(supabase, campaignId);
    if (!allowed) {
      return { success: false, message: "Solo il GM o un Admin possono sbloccare contenuti." };
    }

    for (const userId of userIds) {
      for (const { id, type } of contentIds) {
        const isWiki = type === "wiki";
        const { data: existing } = await supabase
          .from("explorations")
          .select("id")
          .eq("player_id", userId)
          .eq(isWiki ? "entity_id" : "map_id", id)
          .is(isWiki ? "map_id" : "entity_id", null)
          .limit(1)
          .maybeSingle();
        if (existing) continue;

        const payload = isWiki
          ? { player_id: userId, entity_id: id, map_id: null }
          : { player_id: userId, map_id: id, entity_id: null };
        const { error } = await supabase.from("explorations").insert(payload);
        if (error) {
          console.error("[batchUnlockContent]", error);
          return { success: false, message: error.message ?? "Errore durante lo sblocco." };
        }
      }
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Contenuti sbloccati per i presenti." };
  } catch (err) {
    console.error("[batchUnlockContent]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type UnlockContentResult = { success: boolean; message: string };

export async function unlockContent(
  userId: string,
  campaignId: string,
  contentIds: { id: string; type: "wiki" | "map" }[]
): Promise<UnlockContentResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, message: "Solo il GM o un Admin possono sbloccare contenuti." };
    }

    for (const { id, type } of contentIds) {
      const isWiki = type === "wiki";
      const { data: existing } = await supabase
        .from("explorations")
        .select("id")
        .eq("player_id", userId)
        .eq(isWiki ? "entity_id" : "map_id", id)
        .is(isWiki ? "map_id" : "entity_id", null)
        .limit(1)
        .maybeSingle();
      if (existing) continue;

      const payload = isWiki
        ? { player_id: userId, entity_id: id, map_id: null }
        : { player_id: userId, map_id: id, entity_id: null };
      const { error } = await supabase.from("explorations").insert(payload);
      if (error) {
        console.error("[unlockContent]", error);
        return { success: false, message: error.message ?? "Errore durante lo sblocco." };
      }
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Contenuti sbloccati." };
  } catch (err) {
    console.error("[unlockContent]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type UpdateCampaignResult = { success: boolean; message: string };

export async function updateCampaign(formData: FormData): Promise<UpdateCampaignResult> {
  const campaignId = (formData.get("campaign_id") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim();
  const description = (formData.get("description") as string | null)?.trim() ?? null;
  const typeRaw = (formData.get("type") as string | null)?.trim()?.toLowerCase();
  const type = typeRaw && ["oneshot", "quest", "long"].includes(typeRaw)
    ? (typeRaw as "oneshot" | "quest" | "long")
    : null;
  const imageFile = formData.get("image") as File | null;
  const imageUrlFromForm = (formData.get("image_url") as string | null)?.trim() || null;

  if (!campaignId) {
    return { success: false, message: "Campagna non valida." };
  }
  if (!title) {
    return { success: false, message: "Il titolo è obbligatorio." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, message: "Solo GM e Admin possono modificare le campagne." };
    }

    let imageUrl: string | null = null;

    if (imageFile && imageFile instanceof File && imageFile.size > 0) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowedTypes.includes(imageFile.type)) {
        return {
          success: false,
          message: "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF.",
        };
      }
      try {
        const fileId = await uploadToTelegram(imageFile);
        imageUrl = `/api/tg-image/${fileId}`;
      } catch (uploadErr) {
        console.error("[updateCampaign] Telegram upload", uploadErr);
        return {
          success: false,
          message: uploadErr instanceof Error ? uploadErr.message : "Errore durante il caricamento dell'immagine.",
        };
      }
    } else if (imageUrlFromForm) {
      imageUrl = imageUrlFromForm;
    }

    const { data: existing } = await supabase
      .from("campaigns")
      .select("image_url")
      .eq("id", campaignId)
      .single();

    const payload: { name: string; description: string | null; type?: "oneshot" | "quest" | "long"; image_url?: string | null } = {
      name: title,
      description: description || null,
      ...(type && { type }),
    };
    if (imageUrl !== null) {
      payload.image_url = imageUrl;
    } else if (existing?.image_url != null) {
      payload.image_url = existing.image_url;
    }

    const { error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", campaignId);

    if (error) {
      console.error("[updateCampaign]", error);
      return { success: false, message: error.message ?? "Errore durante l'aggiornamento." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Campagna aggiornata!" };
  } catch (err) {
    console.error("[updateCampaign]", err);
    return { success: false, message: "Si è verificato un errore imprevisto. Riprova." };
  }
}
