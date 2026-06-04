"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateGmRemotePlainToken, hashGmRemoteToken } from "@/lib/gm-remote/hash-token";
import {
  mapTorneo2LiveRow,
  mapTorneo2MatchRow,
  TORNEO2_MATCH_SELECT,
  TORNEO2_LIVE_SELECT,
} from "@/lib/torneo2/map-rows";
import {
  sanitizeTorneo2CombatState,
  type Torneo2CombatState,
} from "@/lib/torneo2/combat-state";
import { buildTorneo2CombatSeed } from "@/lib/torneo2/seed";
import type { Torneo2LiveSession, Torneo2LiveSessionStarted, Torneo2Match } from "@/lib/torneo2/types";
import type { Torneo2TimerColumns, Torneo2TimerState } from "@/lib/torneo2/timer";
import { getTorneo2SetupAction } from "@/app/campaigns/torneo2-actions";

type Result<T = void> = { success: true; data?: T } | { success: false; error: string };

const REMOTE_TTL_HOURS = 12;

async function ensureTorneo2Gm(campaignId: string): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; userId: string }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "Non autenticato." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, gm_id, type")
    .eq("id", campaignId)
    .single();

  if (!campaign) return { ok: false, error: "Campagna non trovata." };
  if (campaign.type !== "torneo") return { ok: false, error: "Solo campagne torneo." };
  if (!isAdmin && campaign.gm_id !== user.id) return { ok: false, error: "Non autorizzato." };

  return { ok: true, supabase, userId: user.id };
}

function revalidateLive(campaignId: string) {
  revalidatePath(`/campaigns/${campaignId}/gm-screen`);
}

// ============================================================
// Sessione live
// ============================================================
export async function getActiveTorneo2LiveSessionAction(
  campaignId: string
): Promise<Result<Torneo2LiveSession | null>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data, error } = await check.supabase
    .from("torneo2_live_sessions")
    .select(TORNEO2_LIVE_SELECT)
    .eq("campaign_id", campaignId)
    .eq("status", "live")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ? mapTorneo2LiveRow(data) : null };
}

export async function getTorneo2LiveByPublicIdAction(
  publicId: string
): Promise<Result<Torneo2LiveSession>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non autenticato." };

  const { data, error } = await supabase
    .from("torneo2_live_sessions")
    .select(TORNEO2_LIVE_SELECT)
    .eq("public_id", publicId.trim())
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Sessione live non trovata." };

  const check = await ensureTorneo2Gm(data.campaign_id);
  if (!check.ok) return { success: false, error: check.error };

  return { success: true, data: mapTorneo2LiveRow(data) };
}

export async function startTorneo2LiveSessionAction(
  campaignId: string
): Promise<Result<Torneo2LiveSessionStarted>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  const supabase = check.supabase;

  await supabase
    .from("torneo2_live_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("status", "live");

  const { data: liveRow, error: liveErr } = await supabase
    .from("torneo2_live_sessions")
    .insert({ campaign_id: campaignId, status: "live", created_by: check.userId })
    .select(TORNEO2_LIVE_SELECT)
    .single();

  if (liveErr || !liveRow) {
    return { success: false, error: liveErr?.message ?? "Errore creazione sessione live." };
  }

  const plainToken = generateGmRemotePlainToken();
  const tokenHash = hashGmRemoteToken(plainToken);
  const expiresAt = new Date(Date.now() + REMOTE_TTL_HOURS * 3600 * 1000).toISOString();

  const { data: remoteRow, error: remoteErr } = await supabase
    .from("gm_remote_sessions")
    .insert({
      campaign_id: campaignId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: check.userId,
    })
    .select("public_id, expires_at")
    .single();

  if (remoteErr || !remoteRow) {
    await supabase.from("torneo2_live_sessions").delete().eq("id", liveRow.id);
    return { success: false, error: remoteErr?.message ?? "Errore creazione telecomando." };
  }

  await supabase
    .from("torneo2_live_sessions")
    .update({ remote_session_public_id: remoteRow.public_id })
    .eq("id", liveRow.id);

  revalidateLive(campaignId);

  return {
    success: true,
    data: {
      ...mapTorneo2LiveRow({ ...liveRow, remote_session_public_id: remoteRow.public_id }),
      remotePlainToken: plainToken,
      remoteExpiresAt: remoteRow.expires_at,
    },
  };
}

export async function endTorneo2LiveSessionAction(campaignId: string): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const now = new Date().toISOString();
  const { data: live } = await check.supabase
    .from("torneo2_live_sessions")
    .select("id, remote_session_public_id")
    .eq("campaign_id", campaignId)
    .eq("status", "live")
    .maybeSingle();

  if (!live) return { success: true };

  await check.supabase
    .from("torneo2_live_sessions")
    .update({ status: "ended", ended_at: now })
    .eq("id", live.id);

  if (live.remote_session_public_id) {
    await check.supabase
      .from("gm_remote_sessions")
      .update({ revoked_at: now })
      .eq("public_id", live.remote_session_public_id);
  }

  revalidateLive(campaignId);
  return { success: true };
}

export async function updateTorneo2StationsAction(
  campaignId: string,
  station1MatchId: string | null,
  station2MatchId: string | null
): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await check.supabase
    .from("torneo2_live_sessions")
    .update({ station1_match_id: station1MatchId, station2_match_id: station2MatchId })
    .eq("campaign_id", campaignId)
    .eq("status", "live");

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ============================================================
// Stato combattimento: UNICA fonte di verità
// ============================================================
export type Torneo2CombatPayload = {
  state: Torneo2CombatState;
  seq: number;
  origin: string | null;
  updatedAt: string | null;
};

export async function loadTorneo2MatchStateAction(
  campaignId: string,
  matchId: string
): Promise<Result<Torneo2CombatPayload>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data, error } = await check.supabase
    .from("torneo2_matches")
    .select("combat_state, combat_seq, combat_origin, combat_updated_at")
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Incontro non trovato." };

  return {
    success: true,
    data: {
      state: data.combat_state != null
        ? sanitizeTorneo2CombatState(data.combat_state)
        : sanitizeTorneo2CombatState(null),
      seq: Number(data.combat_seq ?? 0) || 0,
      origin: data.combat_origin ?? null,
      updatedAt: data.combat_updated_at ?? null,
    },
  };
}

/**
 * Scrittura unica dello stato combattimento.
 * Incrementa combat_seq e registra l'origin: i client ignorano i propri echi
 * e applicano solo update con seq maggiore.
 */
export async function updateTorneo2CombatStateAction(
  campaignId: string,
  matchId: string,
  state: Torneo2CombatState,
  originId: string
): Promise<Result<{ seq: number; updatedAt: string }>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data: current } = await check.supabase
    .from("torneo2_matches")
    .select("combat_seq")
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  const nextSeq = (Number(current?.combat_seq ?? 0) || 0) + 1;
  const updatedAt = new Date().toISOString();
  const clean = sanitizeTorneo2CombatState(state);

  const { error } = await check.supabase
    .from("torneo2_matches")
    .update({
      combat_state: clean as unknown as Record<string, unknown>,
      combat_seq: nextSeq,
      combat_origin: originId,
      combat_updated_at: updatedAt,
    })
    .eq("id", matchId)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { seq: nextSeq, updatedAt } };
}

// ============================================================
// Timer autoritativo
// ============================================================
export type { Torneo2TimerColumns };

export async function getTorneo2TimerAction(
  campaignId: string,
  matchId: string
): Promise<Result<Torneo2TimerColumns>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data, error } = await check.supabase
    .from("torneo2_matches")
    .select("timer_mode, turn_seconds, match_seconds, timer_running, timer_started_at, timer_paused_elapsed_ms, timer_label")
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Incontro non trovato." };

  return {
    success: true,
    data: {
      timer_mode: data.timer_mode as Torneo2TimerState["timer_mode"],
      turn_seconds: data.turn_seconds,
      match_seconds: data.match_seconds,
      timer_running: data.timer_running,
      timer_started_at: data.timer_started_at,
      timer_paused_elapsed_ms: Number(data.timer_paused_elapsed_ms ?? 0) || 0,
      timer_label: data.timer_label,
    },
  };
}

export async function patchTorneo2TimerAction(
  campaignId: string,
  matchId: string,
  patch: Partial<Torneo2TimerColumns>
): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await check.supabase
    .from("torneo2_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Avvia un incontro su un tavolo: imposta lo stato active, semina il combattimento
 * (se non già presente) e assegna la stazione sulla sessione live.
 */
export async function startTorneo2MatchOnStationAction(
  campaignId: string,
  matchId: string,
  station: 1 | 2,
  originId: string,
  options?: { reseed?: boolean; seedState?: Torneo2CombatState }
): Promise<Result<{ match: Torneo2Match }>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  const supabase = check.supabase;

  const setup = await getTorneo2SetupAction(campaignId);
  if (!setup.success || !setup.data) {
    return { success: false, error: "error" in setup ? setup.error : "Errore caricamento torneo." };
  }
  const match = setup.data.matches.find((m) => m.id === matchId);
  if (!match) return { success: false, error: "Incontro non trovato." };

  // Priorità: stato preparato dal client (preview con iniziativa/HP già impostati) →
  // stato già persistito → seed dalle squadre/partecipanti.
  const providedSeed =
    !options?.reseed && options?.seedState && options.seedState.combatants.length > 0
      ? sanitizeTorneo2CombatState(options.seedState)
      : null;
  const persistedSeed =
    !options?.reseed && match.combatState && match.combatState.combatants.length > 0
      ? match.combatState
      : null;
  const seed =
    providedSeed ??
    persistedSeed ??
    buildTorneo2CombatSeed(match, setup.data.teams, setup.data.participantsByMatch[matchId] ?? []);

  if (seed.combatants.length === 0) {
    return { success: false, error: "Nessun combattente: configura squadre o partecipanti." };
  }

  const nextSeq = (match.combatSeq ?? 0) + 1;
  const now = new Date().toISOString();

  const { error: updErr } = await supabase
    .from("torneo2_matches")
    .update({
      status: "active",
      combat_state: seed as unknown as Record<string, unknown>,
      combat_seq: nextSeq,
      combat_origin: originId,
      combat_updated_at: now,
    })
    .eq("id", matchId)
    .eq("campaign_id", campaignId);

  if (updErr) return { success: false, error: updErr.message };

  const stationCol = station === 1 ? "station1_match_id" : "station2_match_id";
  await supabase
    .from("torneo2_live_sessions")
    .update({ [stationCol]: matchId })
    .eq("campaign_id", campaignId)
    .eq("status", "live");

  // Ricarica la riga aggiornata.
  const { data: row } = await supabase
    .from("torneo2_matches")
    .select(TORNEO2_MATCH_SELECT)
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .single();

  revalidateLive(campaignId);
  return { success: true, data: { match: mapTorneo2MatchRow(row as never) } };
}

/** Termina l'incontro sul tavolo: ferma il timer e libera la stazione (status -> pending). */
export async function endTorneo2MatchOnStationAction(
  campaignId: string,
  matchId: string
): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  const supabase = check.supabase;

  const { error } = await supabase
    .from("torneo2_matches")
    .update({
      timer_running: false,
      timer_started_at: null,
      timer_paused_elapsed_ms: 0,
      timer_label: null,
    })
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .eq("status", "active");

  if (error) return { success: false, error: error.message };

  const { data: live } = await supabase
    .from("torneo2_live_sessions")
    .select("station1_match_id, station2_match_id")
    .eq("campaign_id", campaignId)
    .eq("status", "live")
    .maybeSingle();

  if (live) {
    const patch: Record<string, unknown> = {};
    if (live.station1_match_id === matchId) patch.station1_match_id = null;
    if (live.station2_match_id === matchId) patch.station2_match_id = null;
    if (Object.keys(patch).length > 0) {
      await supabase
        .from("torneo2_live_sessions")
        .update(patch)
        .eq("campaign_id", campaignId)
        .eq("status", "live");
    }
  }

  revalidateLive(campaignId);
  return { success: true };
}
