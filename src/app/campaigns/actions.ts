"use server";

import { revalidatePath } from "next/cache";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { formatSessionInRome, sessionFormLocalToUtcIso } from "@/lib/session-datetime";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { getPlayerEmails, getNotificationsPaused, hasNotificationsDisabled } from "@/lib/player-emails";
import { sendEmail, wrapInTemplate, escapeHtml } from "@/lib/email";
import { sendJoinCampaignEmailIfEnabled } from "@/lib/campaign-long-emails";
import { uploadToTelegram } from "@/lib/telegram-storage";
import { incrementSessionsAttendedWithAdmin, applyAwardedAchievementWithAdmin } from "@/lib/actions/gamification";
import { sendAdminNotification } from "@/lib/telegram-notifier";
import {
  applyCloseSessionEconomy,
  type SessionEconomyPayload,
} from "@/lib/actions/campaign-economy-actions";
import {
  deleteCampaignMemorySource,
  syncWikiEntityToCampaignMemory,
  syncSessionToCampaignMemory,
} from "@/lib/campaign-memory-indexer";
import type { Json } from "@/types/database.types";
import {
  DEFAULT_FANTASY_BASE_DATE,
  DEFAULT_FANTASY_CALENDAR_CONFIG,
  deriveCharacterCalendarDate,
  normalizeFantasyCalendarConfig,
  normalizeFantasyCalendarDate,
  toCalendarDateJson,
  type FantasyCalendarDate,
  type FantasyCalendarConfig,
} from "@/lib/long-calendar";

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

    let scheduledAt: string;
    try {
      scheduledAt = sessionFormLocalToUtcIso(date, time.includes(":") ? time : `${time}:00`);
    } catch {
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

    const { data: createdSession, error } = await supabase
      .from("sessions")
      .insert({
        campaign_id: campaignId,
        title: null,
        scheduled_at: scheduledAt,
        status: "scheduled",
        max_players: Math.max(1, Math.min(20, maxPlayers)),
        notes: location || null,
        ...(dmId && { dm_id: dmId }),
        ...(party_id && { party_id: party_id }),
        ...(chapter_title != null && { chapter_title }),
      })
      .select("id")
      .single();

    if (error || !createdSession?.id) {
      console.error("[createSession]", error);
      return {
        success: false,
        message: error?.message ?? "Errore durante la creazione della sessione.",
      };
    }

    let participantsAutoAdded = 0;
    if (isLongCampaign && party_id) {
      try {
        const admin = createSupabaseAdminClient();
        const { data: membersRaw, error: membersError } = await admin
          .from("campaign_members")
          .select("player_id")
          .eq("campaign_id", campaignId)
          .eq("party_id", party_id);

        if (membersError) {
          console.error("[createSession] load party members", membersError);
        } else {
          const playerIds = Array.from(
            new Set(
              ((membersRaw ?? []) as Array<{ player_id: string | null }>)
                .map((m) => m.player_id)
                .filter((pid): pid is string => typeof pid === "string" && pid.trim().length > 0)
            )
          );

          if (playerIds.length > 0) {
            const signupRows = playerIds.map((playerId) => ({
              session_id: createdSession.id,
              player_id: playerId,
              status: "approved" as const,
            }));
            const { error: signupError } = await admin
              .from("session_signups")
              .insert(signupRows as never);
            if (signupError) {
              console.error("[createSession] auto-add session participants", signupError);
            } else {
              participantsAutoAdded = signupRows.length;
            }
          }
        }
      } catch (autoAddErr) {
        console.error("[createSession] auto-add party participants unexpected error", autoAddErr);
      }
    }

    try {
      const playerEmails = await getPlayerEmails();
      if (playerEmails.length > 0) {
        const dateLabel = formatSessionInRome(scheduledAt, "EEEE d MMMM yyyy, HH:mm", { locale: it });
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
    return {
      success: true,
      message:
        participantsAutoAdded > 0
          ? `Sessione creata! Partecipanti del gruppo aggiunti automaticamente (${participantsAutoAdded}).`
          : "Sessione creata!",
    };
  } catch (err) {
    console.error("[createSession]", err);
    return {
      success: false,
      message: "Si è verificato un errore imprevisto. Riprova.",
    };
  }
}

/**
 * Evento calendario senza campagna: i giocatori possono iscriversi; la campagna si collega dopo con `assignCampaignToOpenSession`.
 */
export async function createOpenCalendarEvent(formData: FormData): Promise<CreateSessionResult> {
  const date = (formData.get("date") as string | null)?.trim();
  const time = (formData.get("time") as string | null)?.trim() ?? "20:00";
  const location = (formData.get("location") as string | null)?.trim() ?? "";
  const maxPlayersStr = (formData.get("max_players") as string | null)?.trim();
  const maxPlayers = maxPlayersStr ? parseInt(maxPlayersStr, 10) : 6;
  const dmId = (formData.get("dm_id") as string | null)?.trim() || null;
  const titleRaw = (formData.get("title") as string | null)?.trim() || null;

  if (!date) {
    return { success: false, message: "La data è obbligatoria." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const can = await isGmOrAdminByRole(supabase);
    if (!can) {
      return { success: false, message: "Solo GM e Admin possono creare eventi sul calendario." };
    }

    let scheduledAt: string;
    try {
      scheduledAt = sessionFormLocalToUtcIso(date, time.includes(":") ? time : `${time}:00`);
    } catch {
      return { success: false, message: "Data o orario non validi." };
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("sessions").insert({
      campaign_id: null,
      title: titleRaw,
      scheduled_at: scheduledAt,
      status: "scheduled",
      max_players: Math.max(1, Math.min(20, maxPlayers)),
      notes: location || null,
      ...(dmId ? { dm_id: dmId } : {}),
    } as never);

    if (error) {
      console.error("[createOpenCalendarEvent]", error);
      return { success: false, message: error.message ?? "Errore durante la creazione dell'evento." };
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Evento calendario creato. Potrai collegare una campagna in seguito." };
  } catch (err) {
    console.error("[createOpenCalendarEvent]", err);
    return { success: false, message: "Si è verificato un errore imprevisto. Riprova." };
  }
}

/** Aggiorna data/ora, titolo, luogo, posti e DM di un evento ancora senza campagna e in stato scheduled. */
export async function updateOpenCalendarEvent(
  sessionId: string,
  formData: FormData
): Promise<CreateSessionResult> {
  const sid = sessionId?.trim();
  if (!sid) {
    return { success: false, message: "Sessione non valida." };
  }

  const date = (formData.get("date") as string | null)?.trim();
  const time = (formData.get("time") as string | null)?.trim() ?? "20:00";
  const location = (formData.get("location") as string | null)?.trim() ?? "";
  const maxPlayersStr = (formData.get("max_players") as string | null)?.trim();
  const maxPlayers = maxPlayersStr ? parseInt(maxPlayersStr, 10) : 6;
  const titleRaw = (formData.get("title") as string | null)?.trim() || null;
  const dmFromForm = formData.has("dm_id")
    ? ((formData.get("dm_id") as string | null)?.trim() || null)
    : undefined;

  if (!date) {
    return { success: false, message: "La data è obbligatoria." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const can = await isGmOrAdminByRole(supabase);
    if (!can) {
      return { success: false, message: "Solo GM e Admin possono modificare eventi sul calendario." };
    }

    let scheduledAt: string;
    try {
      scheduledAt = sessionFormLocalToUtcIso(date, time.includes(":") ? time : `${time}:00`);
    } catch {
      return { success: false, message: "Data o orario non validi." };
    }

    const admin = createSupabaseAdminClient();
    const { data: existing, error: loadErr } = await admin
      .from("sessions")
      .select("id, campaign_id, status")
      .eq("id", sid)
      .maybeSingle();

    if (loadErr || !existing) {
      return { success: false, message: "Sessione non trovata." };
    }
    const row = existing as { campaign_id: string | null; status: string };
    if (row.campaign_id != null || row.status !== "scheduled") {
      return {
        success: false,
        message: "Puoi modificare solo eventi aperti ancora programmati (senza campagna collegata).",
      };
    }

    const rowUpdate: Record<string, unknown> = {
      title: titleRaw,
      scheduled_at: scheduledAt,
      status: "scheduled",
      max_players: Math.max(1, Math.min(20, maxPlayers)),
      notes: location || null,
    };
    if (dmFromForm !== undefined) {
      rowUpdate.dm_id = dmFromForm;
    }

    const { error } = await admin.from("sessions").update(rowUpdate as never).eq("id", sid);

    if (error) {
      console.error("[updateOpenCalendarEvent]", error);
      return { success: false, message: error.message ?? "Errore durante l'aggiornamento." };
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Evento aggiornato." };
  } catch (err) {
    console.error("[updateOpenCalendarEvent]", err);
    return { success: false, message: "Si è verificato un errore imprevisto. Riprova." };
  }
}

export type OpenCalendarSessionRow = {
  id: string;
  title: string | null;
  scheduled_at: string;
  notes: string | null;
  signup_count: number;
  max_players: number;
  dm_id: string | null;
};

export async function listOpenCalendarSessionsForGmAdmin(): Promise<{
  success: boolean;
  data?: OpenCalendarSessionRow[];
  message?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const can = await isGmOrAdminByRole(supabase);
    if (!can) return { success: false, message: "Non autorizzato." };

    const admin = createSupabaseAdminClient();
    const { data: rows, error } = await admin
      .from("sessions")
      .select("id, title, scheduled_at, notes, max_players, dm_id")
      .is("campaign_id", null)
      .eq("status", "scheduled")
      .order("scheduled_at", { ascending: true });

    if (error) {
      console.error("[listOpenCalendarSessionsForGmAdmin]", error);
      return { success: false, message: error.message ?? "Errore nel caricamento." };
    }

    type SessionListRow = {
      id: string;
      title: string | null;
      scheduled_at: string;
      notes: string | null;
      max_players: number | null;
      dm_id: string | null;
    };
    const list = (rows ?? []) as SessionListRow[];
    const ids = list.map((r) => r.id);
    const signupCounts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: signups } = await admin.from("session_signups").select("session_id").in("session_id", ids);
      for (const s of signups ?? []) {
        const sid = (s as { session_id: string }).session_id;
        signupCounts.set(sid, (signupCounts.get(sid) ?? 0) + 1);
      }
    }

    return {
      success: true,
      data: list.map((r) => ({
        id: r.id,
        title: r.title ?? null,
        scheduled_at: r.scheduled_at,
        notes: r.notes ?? null,
        signup_count: signupCounts.get(r.id) ?? 0,
        max_players: Math.max(1, Math.min(20, r.max_players ?? 6)),
        dm_id: r.dm_id ?? null,
      })),
    };
  } catch (err) {
    console.error("[listOpenCalendarSessionsForGmAdmin]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}

export async function listCampaignsForOpenSessionAssignment(): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string }>;
  message?: string;
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Non autenticato." };

    const can = await isGmOrAdminByRole(supabase);
    if (!can) return { success: false, message: "Non autorizzato." };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const admin = createSupabaseAdminClient();

    if (profile?.role === "admin") {
      const { data, error } = await admin.from("campaigns").select("id, name").order("name");
      if (error) return { success: false, message: error.message ?? "Errore." };
      return { success: true, data: (data ?? []) as Array<{ id: string; name: string }> };
    }

    const { data, error } = await admin
      .from("campaigns")
      .select("id, name")
      .eq("gm_id", user.id)
      .order("name");
    if (error) return { success: false, message: error.message ?? "Errore." };
    return { success: true, data: (data ?? []) as Array<{ id: string; name: string }> };
  } catch (err) {
    console.error("[listCampaignsForOpenSessionAssignment]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}

export async function assignCampaignToOpenSession(
  sessionId: string,
  campaignId: string
): Promise<CreateSessionResult> {
  const sid = sessionId?.trim();
  const cid = campaignId?.trim();
  if (!sid || !cid) {
    return { success: false, message: "Sessione e campagna sono obbligatorie." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, message: "Devi essere autenticato." };

    const can = await isGmOrAdminByRole(supabase);
    if (!can) return { success: false, message: "Solo GM e Admin possono collegare una campagna." };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const admin = createSupabaseAdminClient();

    const { data: campaign, error: campErr } = await admin.from("campaigns").select("id, gm_id").eq("id", cid).maybeSingle();
    if (campErr || !campaign) {
      return { success: false, message: "Campagna non trovata." };
    }
    if (profile?.role !== "admin" && (campaign as { gm_id: string }).gm_id !== user.id) {
      return { success: false, message: "Puoi collegare solo campagne di cui sei il Master titolare." };
    }

    const { data: session, error: sessErr } = await admin
      .from("sessions")
      .select("id, campaign_id, status")
      .eq("id", sid)
      .maybeSingle();
    if (sessErr || !session) {
      return { success: false, message: "Sessione non trovata." };
    }
    const row = session as { campaign_id: string | null; status: string };
    if (row.status !== "scheduled") {
      return { success: false, message: "Solo sessioni ancora programmate possono essere aggiornate." };
    }
    if (row.campaign_id != null) {
      return { success: false, message: "Questa sessione ha già una campagna collegata." };
    }

    const { error: updErr } = await admin
      .from("sessions")
      .update({ campaign_id: cid } as never)
      .eq("id", sid);
    if (updErr) {
      console.error("[assignCampaignToOpenSession]", updErr);
      return { success: false, message: updErr.message ?? "Errore durante l'aggiornamento." };
    }

    revalidatePath("/dashboard");
    revalidatePath(`/campaigns/${cid}`);
    return { success: true, message: "Campagna collegata all'evento." };
  } catch (err) {
    console.error("[assignCampaignToOpenSession]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
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

export type CampaignMemberForGmRow = {
  player_id: string;
  player_name: string;
  party_id: string | null;
  party_name: string | null;
};

export type AssignablePlayerForCampaignRow = {
  id: string;
  label: string;
};

export async function listCampaignMembersForGm(
  campaignId: string
): Promise<{ success: boolean; data?: CampaignMemberForGmRow[]; message?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const can = await isGmOrAdmin(supabase, campaignId);
    if (!can) return { success: false, message: "Non autorizzato." };

    const admin = createSupabaseAdminClient();
    const [{ data: membersRaw, error: membersError }, { data: partiesRaw }] = await Promise.all([
      admin
        .from("campaign_members")
        .select("player_id, party_id")
        .eq("campaign_id", campaignId),
      admin
        .from("campaign_parties")
        .select("id, name")
        .eq("campaign_id", campaignId),
    ]);

    if (membersError) {
      console.error("[listCampaignMembersForGm]", membersError);
      return { success: false, message: membersError.message ?? "Errore nel caricamento membri." };
    }

    const members = (membersRaw ?? []) as { player_id: string; party_id: string | null }[];
    if (members.length === 0) return { success: true, data: [] };

    const playerIds = [...new Set(members.map((m) => m.player_id))];
    const { data: profilesRaw } = await admin
      .from("profiles")
      .select("id, first_name, last_name, display_name")
      .in("id", playerIds);

    const partyNameById = new Map(
      ((partiesRaw ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
    );
    const profileNameById = new Map(
      ((profilesRaw ?? []) as Array<{ id: string; first_name: string | null; last_name: string | null; display_name: string | null }>)
        .map((p) => {
          const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
          return [p.id, full || p.display_name?.trim() || `Utente ${p.id.slice(0, 8)}`] as const;
        })
    );

    const data: CampaignMemberForGmRow[] = members
      .map((m) => ({
        player_id: m.player_id,
        player_name: profileNameById.get(m.player_id) ?? `Utente ${m.player_id.slice(0, 8)}`,
        party_id: m.party_id,
        party_name: m.party_id ? partyNameById.get(m.party_id) ?? null : null,
      }))
      .sort((a, b) => a.player_name.localeCompare(b.player_name));

    return { success: true, data };
  } catch (err) {
    console.error("[listCampaignMembersForGm]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}

export async function assignCampaignMemberParty(
  campaignId: string,
  playerId: string,
  partyId: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const can = await isGmOrAdmin(supabase, campaignId);
    if (!can) return { success: false, message: "Non autorizzato." };

    if (partyId) {
      const { data: party } = await supabase
        .from("campaign_parties")
        .select("id")
        .eq("id", partyId)
        .eq("campaign_id", campaignId)
        .maybeSingle();
      if (!party) return { success: false, message: "Gruppo non valido per questa campagna." };
    }

    const { error } = await supabase
      .from("campaign_members")
      .update({ party_id: partyId })
      .eq("campaign_id", campaignId)
      .eq("player_id", playerId);
    if (error) {
      console.error("[assignCampaignMemberParty]", error);
      return { success: false, message: error.message ?? "Errore nell'assegnazione gruppo." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Gruppo aggiornato." };
  } catch (err) {
    console.error("[assignCampaignMemberParty]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}

export async function addCampaignMemberForGm(
  campaignId: string,
  playerId: string,
  partyId: string | null
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const can = await isGmOrAdmin(supabase, campaignId);
    if (!can) return { success: false, message: "Non autorizzato." };

    if (partyId) {
      const { data: party } = await supabase
        .from("campaign_parties")
        .select("id")
        .eq("id", partyId)
        .eq("campaign_id", campaignId)
        .maybeSingle();
      if (!party) return { success: false, message: "Gruppo non valido per questa campagna." };
    }

    const admin = createSupabaseAdminClient();
    const { data: alreadyMember } = await admin
      .from("campaign_members")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("player_id", playerId)
      .maybeSingle();
    if (alreadyMember) {
      return { success: false, message: "Giocatore gia iscritto alla campagna." };
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("id, role")
      .eq("id", playerId)
      .maybeSingle();
    if (!profile) {
      return { success: false, message: "Giocatore non trovato." };
    }
    if ((profile as { role?: string | null }).role === "gm" || (profile as { role?: string | null }).role === "admin") {
      return { success: false, message: "Non puoi iscrivere un GM/Admin come giocatore." };
    }

    const { error } = await admin.from("campaign_members").insert({
      campaign_id: campaignId,
      player_id: playerId,
      party_id: partyId,
    } as never);
    if (error) {
      if (error.code === "23505") {
        return { success: false, message: "Giocatore gia iscritto alla campagna." };
      }
      console.error("[addCampaignMemberForGm]", error);
      return { success: false, message: error.message ?? "Errore nell'iscrizione del giocatore." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Giocatore aggiunto alla campagna." };
  } catch (err) {
    console.error("[addCampaignMemberForGm]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}

export async function removeCampaignMemberForGm(
  campaignId: string,
  playerId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const can = await isGmOrAdmin(supabase, campaignId);
    if (!can) return { success: false, message: "Non autorizzato." };

    const { error } = await supabase
      .from("campaign_members")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("player_id", playerId);
    if (error) {
      console.error("[removeCampaignMemberForGm]", error);
      return { success: false, message: error.message ?? "Errore nella rimozione del membro." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Membro rimosso dalla campagna." };
  } catch (err) {
    console.error("[removeCampaignMemberForGm]", err);
    return { success: false, message: "Errore imprevisto." };
  }
}

export async function listAssignablePlayersForCampaign(
  campaignId: string
): Promise<{ success: boolean; data?: AssignablePlayerForCampaignRow[]; message?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const can = await isGmOrAdmin(supabase, campaignId);
    if (!can) return { success: false, message: "Non autorizzato." };

    const admin = createSupabaseAdminClient();
    const [{ data: membersRaw }, { data: profilesRaw, error: profilesError }] = await Promise.all([
      admin.from("campaign_members").select("player_id").eq("campaign_id", campaignId),
      admin.from("profiles").select("id, first_name, last_name, display_name, role"),
    ]);
    if (profilesError) {
      console.error("[listAssignablePlayersForCampaign]", profilesError);
      return { success: false, message: profilesError.message ?? "Errore nel caricamento giocatori." };
    }

    const memberIds = new Set(((membersRaw ?? []) as Array<{ player_id: string }>).map((m) => m.player_id));
    const data: AssignablePlayerForCampaignRow[] = ((profilesRaw ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      display_name: string | null;
      role: string | null;
    }>)
      .filter((p) => p.role !== "gm" && p.role !== "admin" && !memberIds.has(p.id))
      .map((p) => {
        const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
        const label = full || p.display_name?.trim() || `Utente ${p.id.slice(0, 8)}`;
        return { id: p.id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label));

    return { success: true, data };
  } catch (err) {
    console.error("[listAssignablePlayersForCampaign]", err);
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

/** Sessione senza campagna: gestibile solo da GM/Admin (guild). Con campagna: GM della campagna o guild. */
async function canManageSessionByCampaign(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string | null
): Promise<boolean> {
  if (campaignId == null) return isGmOrAdminByRole(supabase);
  return isGmOrAdmin(supabase, campaignId);
}

async function sendFeedbackRequestEmailsForSession(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  campaignId: string,
  sessionId: string
): Promise<void> {
  try {
    const [{ data: campaignRow }, { data: sessionRow }, { data: signupsRows }] = await Promise.all([
      admin.from("campaigns").select("name").eq("id", campaignId).maybeSingle(),
      admin.from("sessions").select("title, scheduled_at").eq("id", sessionId).maybeSingle(),
      admin.from("session_signups").select("player_id").eq("session_id", sessionId).eq("status", "attended"),
    ]);

    const campaignName = ((campaignRow as { name?: string | null } | null)?.name ?? "").trim() || "Campagna";
    const sessionTitle = ((sessionRow as { title?: string | null } | null)?.title ?? "").trim() || "Sessione";
    const sessionDateRaw = (sessionRow as { scheduled_at?: string | null } | null)?.scheduled_at ?? null;
    const sessionDate = sessionDateRaw
      ? formatSessionInRome(sessionDateRaw, "EEEE d MMMM yyyy, HH:mm", { locale: it })
      : "data non disponibile";
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://barberanddragons.com").replace(/\/$/, "");
    const feedbackUrl = `${appUrl}/campaigns/${campaignId}?tab=sessioni`;

    const signups = (signupsRows ?? []) as { player_id: string }[];
    const playerIds = [...new Set(signups.map((s) => s.player_id))];
    if (playerIds.length === 0) return;

    for (const playerId of playerIds) {
      const { data: authUser } = await admin.auth.admin.getUserById(playerId);
      const toEmail = authUser?.user?.email;
      if (!toEmail) continue;
      void sendEmail({
        to: toEmail,
        subject: `Lascia il tuo feedback: ${campaignName}`,
        html: wrapInTemplate(
          `<p>La sessione <strong>${escapeHtml(sessionTitle)}</strong> (${escapeHtml(sessionDate)}) è stata chiusa.</p>` +
            `<p>Il tuo feedback è prezioso: valuta l'esperienza della sessione e della campagna.</p>` +
            `<p><a href="${escapeHtml(feedbackUrl)}" style="color:#fbbf24;text-decoration:underline;">Apri la pagina campagna e lascia il feedback</a></p>`
        ),
      });
    }
  } catch (err) {
    console.error("[sendFeedbackRequestEmailsForSession]", err);
  }
}

export type JoinSessionResult = { success: boolean; message: string };

export type JoinLongCampaignResult = {
  success: boolean;
  message: string;
  /** true solo al primo inserimento riuscito (per redirect pagina conferma). */
  justJoined?: boolean;
};

/** Iscrizione diretta a una campagna Long. Necessaria prima della prenotazione sessioni. */
export async function joinLongCampaign(campaignId: string): Promise<JoinLongCampaignResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "gm" || profile?.role === "admin") {
      return { success: false, message: "I GM/Admin non devono iscriversi alla campagna come giocatori." };
    }

    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, type, is_public, long_registrations_open")
      .eq("id", campaignId)
      .single();
    if (campaignError || !campaign) {
      return { success: false, message: "Campagna non trovata." };
    }
    if (campaign.type !== "long") {
      return { success: false, message: "L'iscrizione alla campagna è richiesta solo per campagne Long." };
    }
    if (!campaign.is_public) {
      return { success: false, message: "Campagna privata: chiedi al GM di aggiungerti manualmente." };
    }

    const registrationsOpen = (campaign as { long_registrations_open?: boolean }).long_registrations_open !== false;

    const { data: existing } = await supabase
      .from("campaign_members")
      .select("id")
      .eq("campaign_id", campaignId)
      .eq("player_id", user.id)
      .maybeSingle();
    if (existing) {
      return { success: true, message: "Sei già iscritto a questa campagna.", justJoined: false };
    }

    if (!registrationsOpen) {
      return {
        success: false,
        message: "Le iscrizioni a questa campagna sono chiuse. Contatta il GM o l'organizzazione.",
      };
    }

    const { error: insertError } = await supabase.from("campaign_members").insert({
      campaign_id: campaignId,
      player_id: user.id,
    } as never);
    if (insertError) {
      if (insertError.code === "23505") {
        return { success: true, message: "Sei già iscritto a questa campagna.", justJoined: false };
      }
      console.error("[joinLongCampaign]", insertError);
      return { success: false, message: insertError.message ?? "Errore durante l'iscrizione alla campagna." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/dashboard");
    // Invio best-effort: eventuali errori SMTP non bloccano l'iscrizione.
    void sendJoinCampaignEmailIfEnabled(campaignId, user.id);
    return { success: true, message: "Iscrizione alla campagna completata.", justJoined: true };
  } catch (err) {
    console.error("[joinLongCampaign]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export type SetLongRegistrationsOpenResult = { success: boolean; message: string };

/** Apre/chiude le iscrizioni autonome (solo campagne Long). Solo GM/Admin. */
export async function setLongCampaignRegistrationsOpen(
  campaignId: string,
  open: boolean
): Promise<SetLongRegistrationsOpenResult> {
  if (!campaignId?.trim()) {
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

    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, message: "Solo GM o Admin possono modificare le iscrizioni." };
    }

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, type")
      .eq("id", campaignId)
      .single();
    if (!campaign) {
      return { success: false, message: "Campagna non trovata." };
    }
    if (campaign.type !== "long") {
      return { success: false, message: "Le iscrizioni guidate valgono solo per campagne Long." };
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("campaigns")
      .update({ long_registrations_open: open } as never)
      .eq("id", campaignId);

    if (error) {
      if (error.message?.toLowerCase().includes("long_registrations_open")) {
        return {
          success: false,
          message: "Aggiorna il database (migration long_registrations_open) e riprova.",
        };
      }
      console.error("[setLongCampaignRegistrationsOpen]", error);
      return { success: false, message: error.message ?? "Errore durante l'aggiornamento." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/dashboard");
    return {
      success: true,
      message: open
        ? "Iscrizioni alla campagna aperte: i giocatori possono iscriversi da soli."
        : "Iscrizioni alla campagna chiuse.",
    };
  } catch (err) {
    console.error("[setLongCampaignRegistrationsOpen]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

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

    const sessionCampaignId = session.campaign_id as string | null;
    if (sessionCampaignId != null) {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("id, type")
        .eq("id", sessionCampaignId)
        .single();
      if (!campaign) {
        return { success: false, message: "Campagna non trovata." };
      }
      if (campaign.type === "long") {
        const { data: member } = await supabase
          .from("campaign_members")
          .select("id")
          .eq("campaign_id", sessionCampaignId)
          .eq("player_id", user.id)
          .maybeSingle();
        if (!member) {
          return {
            success: false,
            message:
              "Per prenotare sessioni di campagne Long devi prima iscriverti alla campagna.",
          };
        }
      }
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

    void (async () => {
      const [{ data: playerProfile }, { data: sessionInfo }, campaignRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name, display_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase.from("sessions").select("title, scheduled_at").eq("id", sessionId).maybeSingle(),
        sessionCampaignId
          ? supabase.from("campaigns").select("name").eq("id", sessionCampaignId).maybeSingle()
          : Promise.resolve({ data: null as { name: string | null } | null }),
      ]);

      const player = (playerProfile ?? null) as
        | { first_name?: string | null; last_name?: string | null; display_name?: string | null }
        | null;
      const fullName = [player?.first_name, player?.last_name].filter(Boolean).join(" ").trim();
      const playerName = fullName || player?.display_name?.trim() || "Giocatore";
      const sessionRow = (sessionInfo as { title?: string | null; scheduled_at?: string | null } | null) ?? null;
      const sessionTitle = (sessionRow?.title ?? "").trim() || "Sessione";
      const campaignName = sessionCampaignId
        ? ((campaignRes.data?.name ?? "").trim() || "Campagna")
        : "Evento (campagna da definire)";
      const sessionDate = sessionRow?.scheduled_at
        ? formatSessionInRome(sessionRow.scheduled_at, "dd/MM/yyyy HH:mm")
        : "Data non disponibile";

      sendAdminNotification(
        `🎲 Nuova Iscrizione!\n\n👤 Giocatore: ${playerName}\n📚 Campagna: ${campaignName}\n🗓️ Sessione: ${sessionTitle}\n🕒 Data: ${sessionDate}`
      ).catch(console.error);
    })().catch(console.error);

    if (sessionCampaignId) {
      revalidatePath(`/campaigns/${sessionCampaignId}`);
    }
    revalidatePath("/dashboard");
    return { success: true, message: "Iscrizione effettuata. In attesa di approvazione." };
  } catch (err) {
    console.error("[joinSession]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export async function listAssignablePlayersForSession(
  sessionId: string
): Promise<{ success: boolean; data?: AssignablePlayerForCampaignRow[]; message?: string }> {
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

    const allowed = await canManageSessionByCampaign(supabase, session.campaign_id as string | null);
    if (!allowed) {
      return { success: false, message: "Solo GM o Admin possono aggiungere iscritti." };
    }

    const admin = createSupabaseAdminClient();
    const campaignIdForSession = session.campaign_id as string | null;
    const [{ data: campaignRaw }, { data: existingSignupsRaw, error: signupsError }] = await Promise.all([
      campaignIdForSession
        ? admin.from("campaigns").select("id, type").eq("id", campaignIdForSession).maybeSingle()
        : Promise.resolve({ data: null as { id: string; type: string | null } | null }),
      admin.from("session_signups").select("player_id").eq("session_id", sessionId),
    ]);
    const campaign = (campaignRaw as { id: string; type: string | null } | null) ?? null;

    if (signupsError) {
      console.error("[listAssignablePlayersForSession] signups", signupsError);
      return { success: false, message: signupsError.message ?? "Errore nel caricamento iscritti." };
    }

    const signedIds = new Set(
      ((existingSignupsRaw ?? []) as Array<{ player_id: string | null }>)
        .map((row) => row.player_id)
        .filter((playerId): playerId is string => typeof playerId === "string" && playerId.length > 0)
    );

    let allowedPlayerIds: Set<string> | null = null;
    if (campaign?.type === "long" && campaignIdForSession) {
      const { data: membersRaw, error: membersError } = await admin
        .from("campaign_members")
        .select("player_id")
        .eq("campaign_id", campaignIdForSession);
      if (membersError) {
        console.error("[listAssignablePlayersForSession] members", membersError);
        return { success: false, message: membersError.message ?? "Errore nel caricamento membri campagna." };
      }
      allowedPlayerIds = new Set(
        ((membersRaw ?? []) as Array<{ player_id: string | null }>)
          .map((row) => row.player_id)
          .filter((playerId): playerId is string => typeof playerId === "string" && playerId.length > 0)
      );
    }

    const { data: profilesRaw, error: profilesError } = await admin
      .from("profiles")
      .select("id, first_name, last_name, display_name, role");
    if (profilesError) {
      console.error("[listAssignablePlayersForSession] profiles", profilesError);
      return { success: false, message: profilesError.message ?? "Errore nel caricamento giocatori." };
    }

    const data: AssignablePlayerForCampaignRow[] = ((profilesRaw ?? []) as Array<{
      id: string;
      first_name: string | null;
      last_name: string | null;
      display_name: string | null;
      role: string | null;
    }>)
      .filter((profile) => {
        if (profile.role === "gm" || profile.role === "admin") return false;
        if (signedIds.has(profile.id)) return false;
        if (allowedPlayerIds && !allowedPlayerIds.has(profile.id)) return false;
        return true;
      })
      .map((profile) => {
        const full = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
        return {
          id: profile.id,
          label: full || profile.display_name?.trim() || `Utente ${profile.id.slice(0, 8)}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "it"));

    return { success: true, data };
  } catch (err) {
    console.error("[listAssignablePlayersForSession]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

export async function addSessionSignupForGm(
  sessionId: string,
  playerId: string
): Promise<{ success: boolean; message: string; campaignId?: string }> {
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

    const campaignIdForSession = session.campaign_id as string | null;
    const allowed = await canManageSessionByCampaign(supabase, campaignIdForSession);
    if (!allowed) {
      return { success: false, message: "Solo GM o Admin possono aggiungere iscritti." };
    }

    const admin = createSupabaseAdminClient();
    const [{ data: campaignRaw }, { data: profile }, { data: existingSignup }] = await Promise.all([
      campaignIdForSession
        ? admin.from("campaigns").select("id, type").eq("id", campaignIdForSession).maybeSingle()
        : Promise.resolve({ data: null as { id: string; type: string | null } | null }),
      admin.from("profiles").select("id, role").eq("id", playerId).maybeSingle(),
      admin
        .from("session_signups")
        .select("id")
        .eq("session_id", sessionId)
        .eq("player_id", playerId)
        .maybeSingle(),
    ]);
    const campaign = (campaignRaw as { id: string; type: string | null } | null) ?? null;

    if (!profile) {
      return { success: false, message: "Giocatore non trovato." };
    }
    if ((profile as { role?: string | null }).role === "gm" || (profile as { role?: string | null }).role === "admin") {
      return { success: false, message: "Non puoi iscrivere un GM/Admin come giocatore." };
    }
    if (existingSignup) {
      return { success: false, message: "Il giocatore è già iscritto a questa sessione." };
    }

    if (campaign?.type === "long" && campaignIdForSession) {
      const { data: member } = await admin
        .from("campaign_members")
        .select("id")
        .eq("campaign_id", campaignIdForSession)
        .eq("player_id", playerId)
        .maybeSingle();
      if (!member) {
        return {
          success: false,
          message: "Nelle campagne Long puoi aggiungere alla sessione solo membri già iscritti alla campagna.",
        };
      }
    }

    const { error: insertError } = await admin.from("session_signups").insert({
      session_id: sessionId,
      player_id: playerId,
      status: "approved",
    } as never);
    if (insertError) {
      if (insertError.code === "23505") {
        return { success: false, message: "Il giocatore è già iscritto a questa sessione." };
      }
      console.error("[addSessionSignupForGm]", insertError);
      return { success: false, message: insertError.message ?? "Errore durante l'aggiunta dell'iscritto." };
    }

    if (campaignIdForSession) {
      revalidatePath(`/campaigns/${campaignIdForSession}`);
    }
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Giocatore aggiunto alla sessione e segnato come approvato.",
      campaignId: campaignIdForSession ?? undefined,
    };
  } catch (err) {
    console.error("[addSessionSignupForGm]", err);
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
    if (!session) {
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
              ? formatSessionInRome(row.scheduled_at, "EEEE d MMMM yyyy, HH:mm", { locale: it })
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

    const cid = session.campaign_id as string | null;
    if (cid) {
      revalidatePath(`/campaigns/${cid}`);
    }
    revalidatePath("/dashboard");
    return { success: true, message: "Stato aggiornato.", campaignId: cid ?? undefined };
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
    if (!session) {
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

    const cid = session.campaign_id as string | null;
    if (cid) {
      revalidatePath(`/campaigns/${cid}`);
    }
    revalidatePath("/dashboard");
    return { success: true, message: "Giocatore rimosso dalla sessione.", campaignId: cid ?? undefined };
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

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";

    const admin = createSupabaseAdminClient();
    const { data: session, error: sessionError } = await admin
      .from("sessions")
      .select("id, campaign_id")
      .eq("id", sessionId)
      .maybeSingle();
    if (sessionError || !session) {
      return { success: false, message: "Sessione non trovata." };
    }

    const sessionRow = session as { id: string; campaign_id: string | null };
    const cid = sessionRow.campaign_id;
    if (!isAdmin && cid) {
      const { data: camp, error: campErr } = await admin.from("campaigns").select("gm_id").eq("id", cid).maybeSingle();
      if (campErr || !camp || (camp as { gm_id: string }).gm_id !== user.id) {
        return { success: false, message: "Puoi eliminare solo sessioni delle tue campagne." };
      }
    }

    const { error: deleteError } = await admin.from("sessions").delete().eq("id", sessionId);

    if (deleteError) {
      console.error("[deleteSession]", deleteError);
      return { success: false, message: deleteError.message ?? "Errore durante l'eliminazione." };
    }

    if (cid) {
      try {
        await Promise.all([
          deleteCampaignMemorySource(admin, cid, "session_summary", sessionId),
          deleteCampaignMemorySource(admin, cid, "session_note", sessionId),
        ]);
      } catch (memoryErr) {
        console.error("[deleteSession] campaign memory delete", memoryErr);
      }
      revalidatePath(`/campaigns/${cid}`);
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Sessione eliminata.", campaignId: cid ?? undefined };
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

    const canEdit = await canManageSessionByCampaign(supabase, session.campaign_id as string | null);
    if (!canEdit) {
      return { success: false, message: "Non puoi modificare questa sessione." };
    }

    const updates: { title?: string | null; session_summary?: string | null; gm_private_notes?: string | null } = {};
    if (payload.title !== undefined) updates.title = payload.title?.trim() || null;
    if (payload.session_summary !== undefined) updates.session_summary = payload.session_summary?.trim() || null;
    if (payload.gm_private_notes !== undefined) updates.gm_private_notes = payload.gm_private_notes?.trim() || null;

    const cid = session.campaign_id as string | null;
    if (Object.keys(updates).length === 0) {
      return { success: true, message: "Nessuna modifica.", campaignId: cid ?? undefined };
    }

    const { error: updateError } = await supabase
      .from("sessions")
      .update(updates)
      .eq("id", sessionId);

    if (updateError) {
      console.error("[updateSession]", updateError);
      return { success: false, message: updateError.message ?? "Errore durante il salvataggio." };
    }

    if (cid) {
      try {
        const admin = createSupabaseAdminClient();
        await syncSessionToCampaignMemory(admin, sessionId, { campaignId: cid });
      } catch (memoryErr) {
        console.error("[updateSession] campaign memory sync", memoryErr);
      }
      revalidatePath(`/campaigns/${cid}`);
    }

    revalidatePath("/dashboard");
    return { success: true, message: "Sessione aggiornata.", campaignId: cid ?? undefined };
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
): Promise<{
  success: boolean;
  error?: string;
  data?: { id: string; player_id: string; player_name: string; status: string }[];
}> {
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, error: "Solo GM o Admin possono vedere gli iscritti." };
    }
    const admin = createSupabaseAdminClient();
    const { data: signupsRaw, error: signupsErr } = await admin
      .from("session_signups")
      .select("id, player_id, status")
      .eq("session_id", sessionId)
      .in("status", ["approved", "confirmed", "attended", "absent"]);
    const signups = (signupsRaw ?? []) as { id: string; player_id: string; status: string }[];
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
      status: s.status,
    }));
    return { success: true, data };
  } catch (err) {
    console.error("[getApprovedSignupsForSession]", err);
    return { success: false, error: "Errore nel caricamento." };
  }
}

export type AchievementForWizard = {
  id: string;
  title: string;
  icon_name: string;
  is_incremental: boolean;
  max_progress: number;
  category: string;
};

/** Lista achievement per lo step Trofei del wizard (GM o Admin). */
export async function getAchievementsForWizard(): Promise<
  { success: true; data: AchievementForWizard[] } | { success: false; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return { success: false, error: "Non autenticato." };
    }
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, error: "Solo GM o Admin possono vedere gli achievement." };
    }
    const admin = createSupabaseAdminClient();
    const { data: rows, error: dbError } = await admin
      .from("achievements")
      .select("id, title, icon_name, is_incremental, max_progress, category")
      .order("created_at", { ascending: true });
    if (dbError) {
      console.error("[getAchievementsForWizard]", dbError);
      return { success: false, error: dbError.message ?? "Errore nel caricamento." };
    }
    const data = (rows ?? []) as AchievementForWizard[];
    return { success: true, data };
  } catch (err) {
    console.error("[getAchievementsForWizard]", err);
    return { success: false, error: "Errore imprevisto." };
  }
}

export type CloseSessionResult = { success: boolean; message: string };

export type LongCampaignCalendarState = {
  config: FantasyCalendarConfig;
  baseDate: FantasyCalendarDate;
};

type LongCampaignCalendarResult =
  | { success: true; data: LongCampaignCalendarState }
  | { success: false; error: string };

function buildLongCampaignCalendarState(row: {
  long_calendar_config?: Json | null;
  long_calendar_base_date?: Json | null;
} | null): LongCampaignCalendarState {
  const config = normalizeFantasyCalendarConfig(row?.long_calendar_config ?? DEFAULT_FANTASY_CALENDAR_CONFIG);
  const baseDate = normalizeFantasyCalendarDate(
    row?.long_calendar_base_date ?? DEFAULT_FANTASY_BASE_DATE,
    config
  );
  return { config, baseDate };
}

export async function getLongCampaignCalendarState(campaignId: string): Promise<LongCampaignCalendarResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, error: "Non autenticato." };

    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) return { success: false, error: "Solo GM o Admin." };

    const { data, error } = await supabase
      .from("campaigns")
      .select("id, type, gm_id, long_calendar_config, long_calendar_base_date")
      .eq("id", campaignId)
      .single();
    if (error || !data) return { success: false, error: error?.message ?? "Campagna non trovata." };
    if (data.type !== "long") return { success: false, error: "Calendario disponibile solo per campagne long." };

    const profileRes = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profileRes.data?.role === "admin";
    if (!isAdmin && data.gm_id !== user.id) return { success: false, error: "Non sei il Master di questa campagna." };

    return { success: true, data: buildLongCampaignCalendarState(data) };
  } catch (err) {
    console.error("[getLongCampaignCalendarState]", err);
    return { success: false, error: "Errore nel caricamento calendario." };
  }
}

export async function saveLongCampaignCalendarBaseDate(
  campaignId: string,
  payload: {
    baseDate: FantasyCalendarDate;
    months?: { name: string; days: number }[] | null;
  }
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) return { success: false, error: "Non autenticato." };

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = profile?.role === "admin";

    const admin = createSupabaseAdminClient();
    const { data: campaignRaw, error: campErr } = await admin
      .from("campaigns")
      .select("id, gm_id, type, long_calendar_config")
      .eq("id", campaignId)
      .single();
    const campaign = (campaignRaw as { id: string; gm_id: string; type: string | null; long_calendar_config?: Json | null } | null) ?? null;
    if (campErr || !campaign) return { success: false, error: campErr?.message ?? "Campagna non trovata." };
    if (campaign.type !== "long") return { success: false, error: "Disponibile solo per campagne long." };
    if (!isAdmin && campaign.gm_id !== user.id) return { success: false, error: "Non sei il Master di questa campagna." };

    const normalizedConfig = normalizeFantasyCalendarConfig(
      payload.months?.length
        ? ({ months: payload.months } as unknown as Json)
        : ((campaign as { long_calendar_config?: Json | null }).long_calendar_config ?? DEFAULT_FANTASY_CALENDAR_CONFIG)
    );
    const normalizedBaseDate = normalizeFantasyCalendarDate(payload.baseDate as unknown as Json, normalizedConfig);

    const { error: updErr } = await admin
      .from("campaigns")
      .update({
        long_calendar_config: normalizedConfig as unknown as Json,
        long_calendar_base_date: toCalendarDateJson(normalizedBaseDate),
      } as never)
      .eq("id", campaignId);
    if (updErr) return { success: false, error: updErr.message ?? "Errore salvataggio calendario." };

    const { data: charsRaw, error: charsErr } = await admin
      .from("campaign_characters")
      .select("id, time_offset_hours")
      .eq("campaign_id", campaignId);
    if (charsErr) return { success: false, error: charsErr.message ?? "Errore aggiornamento date personaggi." };

    for (const row of (charsRaw ?? []) as Array<{ id: string; time_offset_hours: number | null }>) {
      const hours =
        typeof row.time_offset_hours === "number" && Number.isFinite(row.time_offset_hours)
          ? Math.max(0, Math.trunc(row.time_offset_hours))
          : 0;
      const nextDate = deriveCharacterCalendarDate({
        campaignBaseDate: normalizedBaseDate,
        characterHours: hours,
        config: normalizedConfig,
        anchorDate: null,
        anchorHours: null,
      });
      const { error: syncErr } = await admin
        .from("campaign_characters")
        .update({
          calendar_anchor_date: null,
          calendar_anchor_hours: null,
          calendar_current_date: toCalendarDateJson(nextDate),
        } as never)
        .eq("id", row.id);
      if (syncErr) return { success: false, error: syncErr.message ?? "Errore sincronizzazione data personaggio." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Calendario campagna aggiornato." };
  } catch (err) {
    console.error("[saveLongCampaignCalendarBaseDate]", err);
    return { success: false, error: "Errore salvataggio calendario." };
  }
}

async function ensureCampaignMemberWithAdmin(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  campaignId: string,
  playerId: string,
  xpToAdd: number
): Promise<void> {
  const { data: existingRow } = await admin
    .from("campaign_members")
    .select("id, xp_earned")
    .eq("campaign_id", campaignId)
    .eq("player_id", playerId)
    .maybeSingle();

  const existing = existingRow as { id: string; xp_earned?: number } | null;
  if (!existing) {
    const nextXp = Math.max(0, Math.floor(xpToAdd));
    await admin.from("campaign_members").insert({
      campaign_id: campaignId,
      player_id: playerId,
      xp_earned: nextXp,
    } as never);
    await admin
      .from("campaign_characters")
      .update({ current_xp: nextXp } as never)
      .eq("campaign_id", campaignId)
      .eq("assigned_to", playerId);
    return;
  }

  const safeXp = Math.max(0, Math.floor(xpToAdd));
  if (safeXp > 0) {
    const currentXp = existing.xp_earned ?? 0;
    const nextXp = currentXp + safeXp;
    await admin
      .from("campaign_members")
      .update({ xp_earned: nextXp } as never)
      .eq("id", existing.id);
    await admin
      .from("campaign_characters")
      .update({ current_xp: nextXp } as never)
      .eq("campaign_id", campaignId)
      .eq("assigned_to", playerId);
  }
}

/** Payload unificato per chiusura sessione (EndSessionWizard). */
export type CloseSessionActionPayload = {
  /** player_id -> attended | absent */
  attendance: Record<string, "attended" | "absent">;
  /** XP da assegnare a tutti i presenti (numero >= 0). */
  xpGained: number;
  /** Override opzionale con XP specifici per player_id. */
  perPlayerXpAwards?: { playerId: string; xp: number }[];
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
  /** Trofei assegnati ai presenti (opzionale). */
  awardedAchievements?: { playerId: string; achievementId: string; addedProgress: number }[];
  /** Ore di gioco (viaggio + esplorazione) da sommare al tempo dei PG dei presenti (assigned_to). */
  elapsedHours: number;
  /** Solo campagne long: tesoretto missione e aggiustamenti monete PG. */
  economy?: SessionEconomyPayload;
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
      .select("id, campaign_id, status, is_pre_closed")
      .eq("id", sessionId)
      .single();
    if (sessionError || !session) {
      return { success: false, message: "Sessione non trovata." };
    }
    if (session.status !== "scheduled") {
      return { success: false, message: "La sessione è già chiusa." };
    }
    const isPreClosed =
      (session as { is_pre_closed?: boolean | null }).is_pre_closed === true;

    const { data: campaign } = await supabase
      .from("campaigns")
      .select("type")
      .eq("id", session.campaign_id)
      .single();
    const isLongCampaign = campaign?.type === "long";

    const admin = createSupabaseAdminClient();

    const sessionUpdate: {
      status: string;
      session_summary: string | null;
      gm_private_notes?: string | null;
      is_pre_closed?: boolean;
    } = {
      status: "completed",
      session_summary: payload.summary?.trim() || null,
      is_pre_closed: false,
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
    const signupsList = (signupsData ?? []) as {
      id: string;
      player_id: string;
      status: string;
    }[];

    const xpToAdd = Math.max(0, Math.floor(payload.xpGained));
    const perPlayerXp = new Map(
      (payload.perPlayerXpAwards ?? [])
        .filter((award) => award.playerId && Number.isFinite(award.xp) && award.xp > 0)
        .map((award) => [award.playerId, Math.max(0, Math.floor(award.xp))])
    );
    if (!isPreClosed) {

      for (const signup of signupsList) {
        const newStatus = payload.attendance[signup.player_id] ?? "attended";
        if (signup.status === "approved" || signup.status === "confirmed") {
          await admin
            .from("session_signups")
            .update({ status: newStatus } as never)
            .eq("id", signup.id);
          if (newStatus === "attended") {
            try {
              await incrementSessionsAttendedWithAdmin(admin, signup.player_id);
            } catch (gamErr) {
              console.error("[closeSessionAction] gamification increment", gamErr);
            }
            await ensureCampaignMemberWithAdmin(
              admin,
              session.campaign_id,
              signup.player_id,
              perPlayerXp.get(signup.player_id) ?? xpToAdd
            );
          }
        }
      }
    }

    // Garanzia: anche quando la sessione arriva già pre-chiusa, tutti i presenti
    // vengono registrati come giocatori della campagna.
    for (const signup of signupsList) {
      const finalStatus = isPreClosed
        ? signup.status
        : signup.status === "approved" || signup.status === "confirmed"
          ? payload.attendance[signup.player_id] ?? "attended"
          : signup.status;
      if (finalStatus === "attended") {
        await ensureCampaignMemberWithAdmin(admin, session.campaign_id, signup.player_id, 0);
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
        try {
          await syncWikiEntityToCampaignMemory(admin, entityId, { campaignId: session.campaign_id });
        } catch (memoryErr) {
          console.error("[closeSessionAction] wiki memory sync", entityId, memoryErr);
        }
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

    const elapsedHours = Math.max(0, Math.floor(Number(payload.elapsedHours ?? 0)));
    if (elapsedHours > 0 && presentUserIds.length > 0) {
      const { data: calendarCampaignRow } = await admin
        .from("campaigns")
        .select("long_calendar_config, long_calendar_base_date")
        .eq("id", session.campaign_id)
        .maybeSingle();
      const calendarState = buildLongCampaignCalendarState(
        calendarCampaignRow as { long_calendar_config?: Json | null; long_calendar_base_date?: Json | null } | null
      );
      const { data: epochChars, error: epochFetchErr } = await admin
        .from("campaign_characters")
        .select("id, time_offset_hours, calendar_anchor_date, calendar_anchor_hours")
        .eq("campaign_id", session.campaign_id)
        .in("assigned_to", presentUserIds);
      if (epochFetchErr) {
        console.error("[closeSessionAction] epoch fetch campaign_characters", epochFetchErr);
      } else {
        for (const row of (epochChars ?? []) as {
          id: string;
          time_offset_hours: number | null;
          calendar_anchor_date: Json | null;
          calendar_anchor_hours: number | null;
        }[]) {
          const cur = typeof row.time_offset_hours === "number" ? row.time_offset_hours : 0;
          const nextHours = cur + elapsedHours;
          const anchorDate = row.calendar_anchor_date
            ? normalizeFantasyCalendarDate(row.calendar_anchor_date, calendarState.config)
            : null;
          const nextCalendarDate = deriveCharacterCalendarDate({
            campaignBaseDate: calendarState.baseDate,
            characterHours: nextHours,
            config: calendarState.config,
            anchorDate,
            anchorHours: row.calendar_anchor_hours,
          });
          const { error: epochUpdErr } = await admin
            .from("campaign_characters")
            .update({
              time_offset_hours: nextHours,
              calendar_current_date: toCalendarDateJson(nextCalendarDate),
            } as never)
            .eq("id", row.id);
          if (epochUpdErr) {
            console.error("[closeSessionAction] epoch update", row.id, epochUpdErr);
          }
        }
      }
    }

    if (payload.awardedAchievements?.length) {
      for (const a of payload.awardedAchievements) {
        try {
          await applyAwardedAchievementWithAdmin(admin, {
            player_id: a.playerId,
            achievement_id: a.achievementId,
            added_progress: a.addedProgress,
          });
        } catch (gamErr) {
          console.error("[closeSessionAction] awarded achievement", a, gamErr);
        }
      }
      revalidatePath("/hall-of-fame");
    }

    void sendFeedbackRequestEmailsForSession(admin, session.campaign_id, sessionId);

    if (isLongCampaign && payload.economy) {
      const hasEconomy =
        (payload.economy.missionTreasurePayout?.allocations?.length ?? 0) > 0 ||
        (payload.economy.characterCoinDeltas?.some(
          (d) =>
            Math.trunc(Number(d.coins_gp) || 0) !== 0 ||
            Math.trunc(Number(d.coins_sp) || 0) !== 0 ||
            Math.trunc(Number(d.coins_cp) || 0) !== 0
        ) ??
          false);
      if (hasEconomy) {
        const econ = await applyCloseSessionEconomy(admin, session.campaign_id, payload.economy);
        if (!econ.success) {
          revalidatePath(`/campaigns/${session.campaign_id}`);
          revalidatePath("/dashboard");
          return {
            success: false,
            message: `${econ.message} La sessione risulta comunque chiusa: correggi l’economia dal GM Screen o dalla pagina campagna.`,
            campaignId: session.campaign_id,
          };
        }
      }
    }

    try {
      await syncSessionToCampaignMemory(admin, sessionId, { campaignId: session.campaign_id });
    } catch (memoryErr) {
      console.error("[closeSessionAction] campaign memory sync", memoryErr);
    }

    revalidatePath(`/campaigns/${session.campaign_id}`);
    revalidatePath("/dashboard");
    return { success: true, message: "Sessione chiusa. Appello, XP, diario e mondo aggiornati.", campaignId: session.campaign_id };
  } catch (err) {
    console.error("[closeSessionAction]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

type PreCloseSessionPayload = Pick<CloseSessionActionPayload, "attendance" | "xpGained">;

/** Pre-chiusura sessione: registra presenze e XP, marca la sessione come salvata in bozza (is_pre_closed = true). */
export async function preCloseSessionAction(
  sessionId: string,
  payload: PreCloseSessionPayload
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
      .select("id, campaign_id, status, is_pre_closed")
      .eq("id", sessionId)
      .single();
    if (sessionError || !session) {
      return { success: false, message: "Sessione non trovata." };
    }
    if (session.status !== "scheduled") {
      return { success: false, message: "La sessione è già chiusa." };
    }

    const admin = createSupabaseAdminClient();

    const { error: updateSessionErr } = await admin
      .from("sessions")
      .update({ is_pre_closed: true } as never)
      .eq("id", sessionId);
    if (updateSessionErr) {
      console.error("[preCloseSessionAction] session", updateSessionErr);
      return {
        success: false,
        message: updateSessionErr.message ?? "Errore durante il salvataggio in bozza.",
      };
    }

    const { data: signupsData } = await admin
      .from("session_signups")
      .select("id, player_id, status")
      .eq("session_id", sessionId);
    const signupsList = (signupsData ?? []) as {
      id: string;
      player_id: string;
      status: string;
    }[];

    const xpToAdd = Math.max(0, Math.floor(payload.xpGained));

    for (const signup of signupsList) {
      const newStatus = payload.attendance[signup.player_id] ?? "attended";
      if (signup.status === "approved" || signup.status === "confirmed") {
        await admin
          .from("session_signups")
          .update({ status: newStatus } as never)
          .eq("id", signup.id);
        if (newStatus === "attended") {
          try {
            await incrementSessionsAttendedWithAdmin(admin, signup.player_id);
          } catch (gamErr) {
            console.error("[preCloseSessionAction] gamification increment", gamErr);
          }
          await ensureCampaignMemberWithAdmin(admin, session.campaign_id, signup.player_id, xpToAdd);
        }
      }
    }

    revalidatePath(`/campaigns/${session.campaign_id}`);
    revalidatePath("/dashboard");
    return {
      success: true,
      message: "Sessione salvata in bozza. Presenze e XP registrati.",
      campaignId: session.campaign_id,
    };
  } catch (err) {
    console.error("[preCloseSessionAction]", err);
    return { success: false, message: "Errore imprevisto. Riprova." };
  }
}

/** Metadati per EndSessionWizard: usato per capire se la sessione è in pre-chiusura. */
export async function getSessionWizardMeta(
  sessionId: string
): Promise<{ success: boolean; error?: string; data?: { id: string; campaign_id: string; is_pre_closed: boolean } }> {
  try {
    const supabase = await createSupabaseServerClient();
    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, error: "Solo GM o Admin possono vedere le sessioni." };
    }
    const { data, error } = await supabase
      .from("sessions")
      .select("id, campaign_id, is_pre_closed, status")
      .eq("id", sessionId)
      .maybeSingle();
    if (error) {
      console.error("[getSessionWizardMeta]", error);
      return { success: false, error: error.message ?? "Errore nel caricamento." };
    }
    if (!data) {
      return { success: false, error: "Sessione non trovata." };
    }
    const row = data as { id: string; campaign_id: string; is_pre_closed?: boolean | null; status: string };
    if (row.status !== "scheduled" && row.status !== "completed") {
      // Per sicurezza, ma il wizard è usato solo su sessioni schedulate o appena chiuse.
    }
    return {
      success: true,
      data: {
        id: row.id,
        campaign_id: row.campaign_id,
        is_pre_closed: row.is_pre_closed === true,
      },
    };
  } catch (err) {
    console.error("[getSessionWizardMeta]", err);
    return { success: false, error: "Errore nel caricamento." };
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
          try {
            await incrementSessionsAttendedWithAdmin(admin, signup.player_id);
          } catch (gamErr) {
            console.error("[closeSession] gamification increment", gamErr);
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

    void sendFeedbackRequestEmailsForSession(admin, session.campaign_id, sessionId);

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
      .select("id, player_id, status")
      .eq("session_id", sessionId);

    const admin = createSupabaseAdminClient();
    const list = (signups ?? []) as { id: string; player_id: string; status: string }[];
    if (list.length === 0) {
      // Permettiamo la chiusura anche senza iscritti:
      // serve comunque per statistiche e storico campagna.
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
      return { success: true, message: "Sessione chiusa (nessun iscritto registrato).", campaignId: session.campaign_id };
    }
    const stillNotAttended = list.filter((s) => s.status === "approved" || s.status === "confirmed");
    if (stillNotAttended.length > 0) {
      const attendedCount = list.filter((s) => s.status === "attended").length;
      return {
        success: false,
        message: `Conferma la presenza di tutti i giocatori prima di chiudere. (${attendedCount}/${list.length} presenti.)`,
      };
    }

    for (const signup of list) {
      if (signup.status === "attended") {
        await ensureCampaignMemberWithAdmin(admin, session.campaign_id, signup.player_id, 0);
      }
    }

    const { error: updateErr } = await admin
      .from("sessions")
      .update({ status: "completed" } as never)
      .eq("id", sessionId);

    if (updateErr) {
      console.error("[closeSessionQuestOrOneshot]", updateErr);
      return { success: false, message: "Errore durante la chiusura." };
    }

    void sendFeedbackRequestEmailsForSession(admin, session.campaign_id, sessionId);

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
      .select("id, name, is_public")
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

    if (isPublic && campaign?.is_public !== true) {
      try {
        const campaignName = (campaign.name ?? "").trim() || "Nuova campagna";
        const playerEmails = await getPlayerEmails();
        if (playerEmails.length > 0) {
          void sendEmail({
            to: process.env.GMAIL_USER ?? "",
            bcc: playerEmails,
            subject: `Nuova Campagna Disponibile: ${campaignName}`,
            html: wrapInTemplate(
              `<p>La campagna <strong>${escapeHtml(campaignName)}</strong> è ora pubblica.</p><p>Accedi al sito per scoprirla e iscriverti alle sessioni.</p>`
            ),
          });
        }
      } catch (mailErr) {
        console.error("[setCampaignPublic] invio email:", mailErr);
      }
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
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("type")
      .eq("id", campaignId)
      .maybeSingle();
    if ((campaign as { type?: string } | null)?.type !== "long") {
      return { success: true, items: [], message: "Lo sblocco contenuti è disponibile solo per campagne Long." };
    }

    const [wikiRes, mapsRes] = await Promise.all([
      supabase
        .from("wiki_entities")
        .select("id, name, type, visibility, is_secret")
        .eq("campaign_id", campaignId)
        .order("name"),
      supabase
        .from("maps")
        .select("id, name")
        .eq("campaign_id", campaignId)
        .eq("visibility", "secret")
        .order("name"),
    ]);

    let wikiRows = (wikiRes.data ??
      []) as Array<{ id: string; name: string; type: string; visibility?: string | null; is_secret?: boolean | null }>;
    if (wikiRes.error?.message?.toLowerCase().includes("visibility")) {
      const fallback = await supabase
        .from("wiki_entities")
        .select("id, name, type, is_secret")
        .eq("campaign_id", campaignId)
        .order("name");
      wikiRows = ((fallback.data ?? []) as Array<{ id: string; name: string; type: string; is_secret?: boolean | null }>)
        .map((row) => ({
          ...row,
          visibility: row.is_secret ? "secret" : "public",
        }));
    }
    const wikiItems: UnlockableItem[] = wikiRows
      .filter((e) => {
        const visibility = e.visibility ?? (e.is_secret ? "secret" : "public");
        return visibility === "secret";
      })
      .map((e) => ({
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
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("type")
      .eq("id", campaignId)
      .maybeSingle();
    if ((campaign as { type?: string } | null)?.type !== "long") {
      return { success: false, message: "Lo sblocco contenuti è consentito solo nelle campagne Long." };
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
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("type")
      .eq("id", campaignId)
      .maybeSingle();
    if ((campaign as { type?: string } | null)?.type !== "long") {
      return { success: false, message: "Lo sblocco contenuti è consentito solo nelle campagne Long." };
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
  const isLongCampaign = formData.get("is_long_campaign") === "on" || formData.get("is_long_campaign") === "true";
  const playerPrimer = (formData.get("player_primer") as string | null)?.trim() || null;
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

    const payload: {
      name: string;
      description: string | null;
      type?: "oneshot" | "quest" | "long";
      is_long_campaign?: boolean;
      player_primer?: string | null;
      image_url?: string | null;
    } = {
      name: title,
      description: description || null,
      ...(type && { type }),
      is_long_campaign: isLongCampaign,
      player_primer: isLongCampaign ? playerPrimer : null,
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

export type PrimerTypography = {
  fontSize?: "small" | "medium" | "large";
  fontFamily?: "serif" | "sans";
};

export type UpdateCampaignPrimerResult = { success: boolean; message: string };

/** Aggiorna la Guida del Giocatore (player_primer) e opzionalmente la tipografia. Solo GM/Admin. */
export async function updateCampaignPrimer(
  campaignId: string,
  playerPrimer: string | null,
  primerTypography?: PrimerTypography | null
): Promise<UpdateCampaignPrimerResult> {
  if (!campaignId?.trim()) {
    return { success: false, message: "Campagna non valida." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: "Devi essere autenticato." };
    }

    const allowed = await isGmOrAdminByRole(supabase);
    if (!allowed) {
      return { success: false, message: "Solo GM e Admin possono modificare la Guida del Giocatore." };
    }

    const value = typeof playerPrimer === "string" ? playerPrimer.trim() || null : null;

    const payload: { player_primer: string | null; updated_at: string; primer_typography?: PrimerTypography } = {
      player_primer: value,
      updated_at: new Date().toISOString(),
    };
    if (primerTypography != null && typeof primerTypography === "object") {
      const fontSize = ["small", "medium", "large"].includes(primerTypography.fontSize ?? "")
        ? primerTypography.fontSize
        : "medium";
      const fontFamily = ["serif", "sans"].includes(primerTypography.fontFamily ?? "")
        ? primerTypography.fontFamily
        : "serif";
      payload.primer_typography = { fontSize, fontFamily };
    }

    const { error } = await supabase
      .from("campaigns")
      .update(payload)
      .eq("id", campaignId);

    if (error) {
      console.error("[updateCampaignPrimer]", error);
      return { success: false, message: error.message ?? "Errore durante il salvataggio." };
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/primer`);
    return { success: true, message: "Guida del Giocatore salvata!" };
  } catch (err) {
    console.error("[updateCampaignPrimer]", err);
    return { success: false, message: "Si è verificato un errore imprevisto. Riprova." };
  }
}
