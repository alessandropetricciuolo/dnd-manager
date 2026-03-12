"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { getPlayerEmails, getNotificationsPaused, hasNotificationsDisabled } from "@/lib/player-emails";
import { sendEmail, wrapInTemplate, escapeHtml } from "@/lib/email";
import { uploadToTelegram } from "@/lib/telegram-storage";
import { incrementSessionsAttendedWithAdmin } from "@/lib/actions/gamification";

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
  const partyIdRaw = (formData.get("party_id") as string | null)?.trim() || null;
  const chapterTitle = (formData.get("chapter_title") as string | null)?.trim() || null;

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

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, type")
      .eq("id", campaignId)
      .single();

    const isLongCampaign = campaign?.type === "long";
    const party_id = isLongCampaign && partyIdRaw ? partyIdRaw : null;
    const chapter_title = isLongCampaign && chapterTitle ? chapterTitle : null;

    const { error } = await supabase.from("sessions").insert({
      campaign_id: campaignId,
      title: null,
      scheduled_at: scheduledAt,
      status: "scheduled",
      max_players: Math.max(1, Math.min(20, maxPlayers)),
      notes: location || null,
      ...(dmId && { dm_id: dmId }),
      ...(party_id && { party_id: party_id }),
      ...(chapter_title != null && { chapter_title }),
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

export type CampaignPartyRow = {
  id: string;
  campaign_id: string;
  name: string;
  color: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export async function listCampaignParties(
  campaignId: string
): Promise<{ success: boolean; data?: CampaignPartyRow[]; message?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const can = await isGmOrAdmin(supabase, campaignId);
    if (!can) {
      return { success: false, message: "Non autorizzato." };
    }
    const { data, error } = await supabase
      .from("campaign_parties")
      .select("id, campaign_id, name, color, description, created_at, updated_at")
      .eq("campaign_id", campaignId)
      .order("name");
    if (error) {
      console.error("[listCampaignParties]", error);
      return { success: false, message: error.message ?? "Errore nel caricamento dei gruppi." };
    }
    return { success: true, data: (data ?? []) as CampaignPartyRow[] };
  } catch (err) {
    console.error("[listCampaignParties]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}

export type CreatePartyResult = { success: boolean; data?: CampaignPartyRow; message?: string };

export async function createCampaignParty(
  campaignId: string,
  payload: { name: string; color?: string | null; description?: string | null }
): Promise<CreatePartyResult> {
  const name = payload.name?.trim() ?? "";
  if (!name) return { success: false, message: "Il nome del gruppo è obbligatorio." };
  try {
    const supabase = await createSupabaseServerClient();
    const can = await isGmOrAdmin(supabase, campaignId);
    if (!can) {
      return { success: false, message: "Non autorizzato." };
    }
    const { data, error } = await supabase
      .from("campaign_parties")
      .insert({
        campaign_id: campaignId,
        name,
        color: payload.color?.trim() || null,
        description: payload.description?.trim() || null,
      })
      .select("id, campaign_id, name, color, description, created_at, updated_at")
      .single();
    if (error) {
      console.error("[createCampaignParty]", error);
      return { success: false, message: error.message ?? "Errore nella creazione del gruppo." };
    }
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, data: data as CampaignPartyRow };
  } catch (err) {
    console.error("[createCampaignParty]", err);
    return { success: false, message: "Errore imprevisto." };
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
      .select("id, session_id, player_id, status")
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

    if (newStatus === "attended") {
      const prevStatus = (signup as { status?: string }).status ?? "";
      const wasAlreadyAttended = prevStatus === "attended";
      if (!wasAlreadyAttended) {
        try {
          const admin = createSupabaseAdminClient();
          await incrementSessionsAttendedWithAdmin(admin, signup.player_id);
        } catch (gamErr) {
          console.error("[updateSignupStatus] gamification increment", gamErr);
        }
      }
    }

    if (newStatus === "approved") {
      try {
        const paused = await getNotificationsPaused();
        const optedOut = await hasNotificationsDisabled(signup.player_id);
        if (!paused && !optedOut) {
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

export type UpdateSessionResult = { success: boolean; message: string };

/** Aggiorna titolo, riassunto e/o note segrete GM di una sessione (es. concluse). Solo GM/Admin della campagna. */
export async function updateSession(
  sessionId: string,
  payload: { title?: string | null; session_summary?: string | null; gm_private_notes?: string | null }
): Promise<UpdateSessionResult & { campaignId?: string }> {
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
      return { success: false, message: "Solo GM o Admin possono modificare sessioni." };
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, campaign_id")
      .eq("id", sessionId)
      .single();
    if (sessionError || !session) {
      return { success: false, message: "Sessione non trovata." };
    }

    const canEdit = await isGmOrAdmin(supabase, session.campaign_id);
    if (!canEdit) {
      return { success: false, message: "Non puoi modificare sessioni di questa campagna." };
    }

    const updates: { title?: string | null; session_summary?: string | null; gm_private_notes?: string | null } = {};
    if (payload.title !== undefined) updates.title = payload.title?.trim() || null;
    if (payload.session_summary !== undefined) updates.session_summary = payload.session_summary?.trim() || null;
    if (payload.gm_private_notes !== undefined) updates.gm_private_notes = payload.gm_private_notes?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return { success: true, message: "Nessuna modifica.", campaignId: session.campaign_id };
    }

    const { error: updateError } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", sessionId);

    if (updateError) {
      console.error("[updateSession]", updateError);
      return { success: false, message: updateError.message ?? "Errore durante il salvataggio." };
    }

    revalidatePath(`/campaigns/${session.campaign_id}`);
    return { success: true, message: "Sessione aggiornata.", campaignId: session.campaign_id };
  } catch (err) {
    console.error("[updateSession]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

/** Sessione conclusa visibile al current user (GM: tutte con gm_private_notes; Player: solo stesso party o party_id null, senza gm_private_notes). */
export type CompletedSessionForUser = {
  id: string;
  title: string | null;
  scheduled_at: string;
  session_summary: string | null;
  party_id: string | null;
  chapter_title: string | null;
  campaign_parties?: { name: string; color: string | null } | null;
  gm_private_notes?: string | null;
};

/** Lista sessioni concluse per l'utente corrente. GM vede tutto (con note segrete); player solo sessioni del proprio gruppo o senza gruppo (Opzione A: niente altre sessioni). */
export async function getCompletedSessionsForCurrentUser(
  campaignId: string
): Promise<{ success: boolean; error?: string; data?: CompletedSessionForUser[] }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Devi essere autenticato." };
    }

    const gmOrAdmin = await isGmOrAdmin(supabase, campaignId);

    if (gmOrAdmin) {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, title, scheduled_at, session_summary, party_id, chapter_title, gm_private_notes, campaign_parties(name, color)")
        .eq("campaign_id", campaignId)
        .eq("status", "completed")
        .order("scheduled_at", { ascending: false });
      if (error) {
        console.error("[getCompletedSessionsForCurrentUser] GM", error);
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
          campaign_parties: party,
          gm_private_notes: (r as { gm_private_notes?: string | null }).gm_private_notes ?? null,
        };
      });
      return { success: true, data: rows };
    }

    const { data: member, error: memberErr } = await supabase
      .from("campaign_members")
      .select("party_id")
      .eq("campaign_id", campaignId)
      .eq("player_id", user.id)
      .maybeSingle();
    if (memberErr || !member) {
      return { success: true, data: [] };
    }
    const userPartyId = member.party_id ?? null;

    const q = supabase
      .from("sessions")
      .select("id, title, scheduled_at, session_summary, party_id, chapter_title, campaign_parties(name, color)")
      .eq("campaign_id", campaignId)
      .eq("status", "completed")
      .order("scheduled_at", { ascending: false });
    if (userPartyId === null) {
      q.is("party_id", null);
    } else {
      q.or(`party_id.is.null,party_id.eq.${userPartyId}`);
    }
    const { data, error } = await q;
    if (error) {
      console.error("[getCompletedSessionsForCurrentUser] player", error);
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
        campaign_parties: party,
      };
    });
    return { success: true, data: rows };
  } catch (err) {
    console.error("[getCompletedSessionsForCurrentUser]", err);
    return { success: false, error: "Errore imprevisto. Riprova." };
  }
}

/** Iscritti approvati per una sessione (per wizard chiusura). Usato da EndSessionWizard quando aperto da GM Screen. */
export async function getApprovedSignupsForSession(
  sessionId: string
): Promise<{ success: boolean; error?: string; data?: { id: string; player_id: string; player_name: string }[] }> {
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, error: "Solo GM o Admin possono vedere gli iscritti." };
    }
    const admin = createSupabaseAdminClient();
    const { data: signupsRaw, error: signupsErr } = await admin
      .from("session_signups")
      .select("id, player_id")
      .eq("session_id", sessionId)
      .in("status", ["approved", "confirmed"]);
    const signups = (signupsRaw ?? []) as { id: string; player_id: string }[];
    if (signupsErr || !signups.length) {
      return { success: true, data: [] };
    }
    const playerIds = [...new Set(signups.map((s) => s.player_id))];
    const { data: profilesData } = await admin
      .from("profiles")
      .select("id, first_name, last_name, display_name")
      .in("id", playerIds);
    const profilesList = (profilesData ?? []) as { id: string; first_name: string | null; last_name: string | null; display_name: string | null }[];
    const nameMap = new Map<string, string>();
    for (const p of profilesList) {
      const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
      nameMap.set(p.id, full || (p.display_name ?? "") || "Giocatore");
    }
    const data = signups.map((s) => ({
      id: s.id,
      player_id: s.player_id,
      player_name: nameMap.get(s.player_id) ?? "Giocatore",
    }));
    return { success: true, data };
  } catch (err) {
    console.error("[getApprovedSignupsForSession]", err);
    return { success: false, error: "Errore nel caricamento." };
  }
}

export type CloseSessionResult = { success: boolean; message: string };

/** Payload unificato per chiusura sessione (EndSessionWizard). */
export type CloseSessionActionPayload = {
  /** player_id -> attended | absent */
  attendance: Record<string, "attended" | "absent">;
  /** XP da assegnare a tutti i presenti (numero >= 0). */
  xpGained: number;
  /** Se true, sblocca i contenuti in unlockContentIds per i presenti. */
  unlockContent: boolean;
  /** Id e tipo dei contenuti da sbloccare (solo se unlockContent true). */
  unlockContentIds: { id: string; type: "wiki" | "map" }[];
  /** Riassunto pubblico sessione. */
  summary: string;
  /** Note segrete GM. */
  gm_private_notes?: string | null;
  /** entity_id -> alive | dead | missing (solo campagne Long). */
  entityStatusUpdates: Record<string, "alive" | "dead" | "missing">;
};

/** Chiusura sessione unificata: sessioni, presenze, XP, summary, note GM, mondo (global_status), sblocco contenuti. */
export async function closeSessionAction(
  sessionId: string,
  payload: CloseSessionActionPayload
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

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("type")
      .eq("id", session.campaign_id)
      .single();
    const isLongCampaign = campaign?.type === "long";

    const admin = createSupabaseAdminClient();

    const sessionUpdate: { status: string; session_summary: string | null; gm_private_notes?: string | null } = {
      status: "completed",
      session_summary: payload.summary?.trim() || null,
    };
    if (payload.gm_private_notes !== undefined) {
      sessionUpdate.gm_private_notes = payload.gm_private_notes?.trim() || null;
    }
    const { error: updateSessionErr } = await admin
      .from("sessions")
      .update(sessionUpdate as never)
      .eq("id", sessionId);
    if (updateSessionErr) {
      console.error("[closeSessionAction] session", updateSessionErr);
      return { success: false, message: updateSessionErr.message ?? "Errore durante la chiusura." };
    }

    const { data: signupsData } = await admin
      .from("session_signups")
      .select("id, player_id, status")
      .eq("session_id", sessionId);
    const signupsList = (signupsData ?? []) as { id: string; player_id: string; status: string }[];
    const xpToAdd = Math.max(0, Math.floor(payload.xpGained));

    for (const signup of signupsList) {
      const newStatus = payload.attendance[signup.player_id] ?? "attended";
      if (signup.status === "approved" || signup.status === "confirmed") {
        await admin.from("session_signups").update({ status: newStatus } as never).eq("id", signup.id);
        if (newStatus === "attended") {
          const wasAlreadyAttended = signup.status === "attended";
          if (!wasAlreadyAttended) {
            try {
              await incrementSessionsAttendedWithAdmin(admin, signup.player_id);
            } catch (gamErr) {
              console.error("[closeSessionAction] gamification increment", gamErr);
            }
          }
          const { data: existingRow } = await admin
            .from("campaign_members")
            .select("id, xp_earned")
            .eq("campaign_id", session.campaign_id)
            .eq("player_id", signup.player_id)
            .maybeSingle();
          const existing = existingRow as { id: string; xp_earned?: number } | null;
          const currentXp = existing?.xp_earned ?? 0;
          if (!existing) {
            await admin.from("campaign_members").insert({
              campaign_id: session.campaign_id,
              player_id: signup.player_id,
              xp_earned: currentXp + xpToAdd,
            } as never);
          } else {
            await admin.from("campaign_members").update({ xp_earned: currentXp + xpToAdd } as never).eq("id", existing.id);
          }
        }
      }
    }

    if (isLongCampaign && Object.keys(payload.entityStatusUpdates).length > 0) {
      for (const [entityId, status] of Object.entries(payload.entityStatusUpdates)) {
        await admin
          .from("wiki_entities")
          .update({ global_status: status } as never)
          .eq("id", entityId)
          .eq("campaign_id", session.campaign_id)
          .eq("is_core", true);
      }
    }

    const presentUserIds = Object.entries(payload.attendance)
      .filter(([, v]) => v === "attended")
      .map(([pid]) => pid);
    if (payload.unlockContent && presentUserIds.length > 0 && payload.unlockContentIds.length > 0) {
      const batchRes = await batchUnlockContent(session.campaign_id, presentUserIds, payload.unlockContentIds);
      if (!batchRes.success) {
        console.warn("[closeSessionAction] batchUnlockContent", batchRes.message);
      }
    }

    revalidatePath(`/campaigns/${session.campaign_id}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Sessione chiusa. Appello, XP, diario e mondo aggiornati.", campaignId: session.campaign_id };
  } catch (err) {
    console.error("[closeSessionAction]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

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
          const wasAlreadyAttended = signup.status === "attended";
          if (!wasAlreadyAttended) {
            try {
              await incrementSessionsAttendedWithAdmin(admin, signup.player_id);
            } catch (gamErr) {
              console.error("[closeSession] gamification increment", gamErr);
            }
          }
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

/** Chiusura sessione per quest/oneshot: tutti i giocatori già con presenza confermata → sessione completata senza modificare campagna (no wizard, no XP/summary). */
export async function closeSessionQuestOrOneshot(
  sessionId: string
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

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("type")
      .eq("id", session.campaign_id)
      .single();
    const campaignType = (campaign as { type?: string } | null)?.type;
    if (campaignType !== "quest" && campaignType !== "oneshot") {
      return { success: false, message: "Questa azione è solo per sessioni di tipo Quest o Oneshot." };
    }

    const { data: signups } = await supabase
      .from("session_signups")
      .select("id, status")
      .eq("session_id", sessionId);

    const list = (signups ?? []) as { id: string; status: string }[];
    if (list.length === 0) {
      return { success: false, message: "Nessun iscritto alla sessione." };
    }
    const stillNotAttended = list.filter((s) => s.status === "approved" || s.status === "confirmed");
    if (stillNotAttended.length > 0) {
      const attendedCount = list.filter((s) => s.status === "attended").length;
      return {
        success: false,
        message: `Conferma la presenza di tutti i giocatori prima di chiudere. (${attendedCount}/${list.length} presenti.)`,
      };
    }

    const admin = createSupabaseAdminClient();
    const { error: updateErr } = await admin
      .from("sessions")
      .update({ status: "completed" } as never)
      .eq("id", sessionId);

    if (updateErr) {
      console.error("[closeSessionQuestOrOneshot]", updateErr);
      return { success: false, message: "Errore durante la chiusura." };
    }

    revalidatePath(`/campaigns/${session.campaign_id}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Sessione chiusa (tutti presenti).", campaignId: session.campaign_id };
  } catch (err) {
    console.error("[closeSessionQuestOrOneshot]", err);
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
        .eq("visibility", "secret")
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
