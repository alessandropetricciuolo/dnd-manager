"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateGmRemotePlainToken, hashGmRemoteToken } from "@/lib/gm-remote/hash-token";
import {
  parseTorneoInitiativeSnapshot,
  serializeTorneoInitiativeSnapshot,
} from "@/lib/torneo/initiative-snapshot";
import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";

type Result<T = void> = { success: true; data?: T } | { success: false; error: string };

const REMOTE_TTL_HOURS = 12;

async function ensureTorneoGm(campaignId: string): Promise<
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

function revalidateTorneoLive(campaignId: string) {
  revalidatePath(`/campaigns/${campaignId}/gm-screen`);
  revalidatePath(`/campaigns/${campaignId}`);
}

export type TorneoLiveSessionInfo = {
  id: string;
  publicId: string;
  campaignId: string;
  status: "live" | "ended";
  remoteSessionPublicId: string | null;
  startedAt: string;
  endedAt: string | null;
};

export type TorneoLiveSessionStarted = TorneoLiveSessionInfo & {
  remotePlainToken: string;
  remoteExpiresAt: string;
};

export async function getActiveTorneoLiveSessionAction(
  campaignId: string
): Promise<Result<TorneoLiveSessionInfo | null>> {
  const check = await ensureTorneoGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data, error } = await check.supabase
    .from("torneo_live_sessions")
    .select("id, public_id, campaign_id, status, remote_session_public_id, started_at, ended_at")
    .eq("campaign_id", campaignId)
    .eq("status", "live")
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: true, data: null };

  return {
    success: true,
    data: {
      id: data.id,
      publicId: data.public_id,
      campaignId: data.campaign_id,
      status: data.status as "live" | "ended",
      remoteSessionPublicId: data.remote_session_public_id ?? null,
      startedAt: data.started_at,
      endedAt: data.ended_at ?? null,
    },
  };
}

export async function getTorneoLiveSessionByPublicIdAction(
  livePublicId: string
): Promise<Result<TorneoLiveSessionInfo>> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non autenticato." };

  const { data, error } = await supabase
    .from("torneo_live_sessions")
    .select("id, public_id, campaign_id, status, remote_session_public_id, started_at, ended_at")
    .eq("public_id", livePublicId.trim())
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Sessione live non trovata." };
  if (data.status !== "live") return { success: false, error: "Sessione live terminata." };

  const check = await ensureTorneoGm(data.campaign_id);
  if (!check.ok) return { success: false, error: check.error };

  return {
    success: true,
    data: {
      id: data.id,
      publicId: data.public_id,
      campaignId: data.campaign_id,
      status: "live",
      remoteSessionPublicId: data.remote_session_public_id ?? null,
      startedAt: data.started_at,
      endedAt: data.ended_at ?? null,
    },
  };
}

/** Avvia sessione live: chiude eventuali live precedenti, crea telecomando collegato. */
export async function startTorneoLiveSessionAction(
  campaignId: string
): Promise<Result<TorneoLiveSessionStarted>> {
  const check = await ensureTorneoGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  const supabase = check.supabase;

  await supabase
    .from("torneo_live_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("status", "live");

  const { data: liveRow, error: liveErr } = await supabase
    .from("torneo_live_sessions")
    .insert({
      campaign_id: campaignId,
      status: "live",
      created_by: check.userId,
    })
    .select("id, public_id, campaign_id, status, started_at")
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
      torneo_live_session_id: liveRow.id,
    })
    .select("public_id, expires_at")
    .single();

  if (remoteErr || !remoteRow) {
    await supabase.from("torneo_live_sessions").delete().eq("id", liveRow.id);
    return { success: false, error: remoteErr?.message ?? "Errore creazione telecomando." };
  }

  const { error: linkErr } = await supabase
    .from("torneo_live_sessions")
    .update({ remote_session_public_id: remoteRow.public_id })
    .eq("id", liveRow.id);

  if (linkErr) {
    await supabase.from("gm_remote_sessions").delete().eq("public_id", remoteRow.public_id);
    await supabase.from("torneo_live_sessions").delete().eq("id", liveRow.id);
    return { success: false, error: linkErr.message };
  }

  revalidateTorneoLive(campaignId);

  return {
    success: true,
    data: {
      id: liveRow.id,
      publicId: liveRow.public_id,
      campaignId: liveRow.campaign_id,
      status: "live",
      remoteSessionPublicId: remoteRow.public_id,
      startedAt: liveRow.started_at,
      endedAt: null,
      remotePlainToken: plainToken,
      remoteExpiresAt: remoteRow.expires_at,
    },
  };
}

export async function endTorneoLiveSessionAction(campaignId: string): Promise<Result> {
  const check = await ensureTorneoGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const now = new Date().toISOString();
  const { data: live } = await check.supabase
    .from("torneo_live_sessions")
    .select("id, remote_session_public_id")
    .eq("campaign_id", campaignId)
    .eq("status", "live")
    .maybeSingle();

  if (!live) return { success: true };

  await check.supabase
    .from("torneo_live_sessions")
    .update({ status: "ended", ended_at: now })
    .eq("id", live.id);

  if (live.remote_session_public_id) {
    await check.supabase
      .from("gm_remote_sessions")
      .update({ revoked_at: now })
      .eq("public_id", live.remote_session_public_id);
  }

  revalidateTorneoLive(campaignId);
  return { success: true };
}

export async function saveTorneoMatchInitiativeAction(
  campaignId: string,
  matchId: string,
  state: InitiativeTrackerState
): Promise<Result<{ updatedAt: string }>> {
  const check = await ensureTorneoGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const snapshot = serializeTorneoInitiativeSnapshot(state);
  const updatedAt = new Date().toISOString();

  const { error } = await check.supabase
    .from("torneo_matches")
    .update({
      initiative_snapshot: snapshot,
      initiative_updated_at: updatedAt,
    })
    .eq("id", matchId)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: { updatedAt } };
}

export async function loadTorneoMatchInitiativeAction(
  campaignId: string,
  matchId: string
): Promise<Result<{ state: InitiativeTrackerState | null; updatedAt: string | null }>> {
  const check = await ensureTorneoGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data, error } = await check.supabase
    .from("torneo_matches")
    .select("initiative_snapshot, initiative_updated_at")
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Incontro non trovato." };

  const state = parseTorneoInitiativeSnapshot(data.initiative_snapshot);
  return {
    success: true,
    data: {
      state,
      updatedAt: data.initiative_updated_at ?? null,
    },
  };
}

export type TorneoMatchTimerPayload = {
  timer_round_label: string | null;
  timer_duration_sec: number | null;
  timer_started_at: string | null;
  timer_paused_at: string | null;
};

export async function getTorneoMatchTimerAction(
  campaignId: string,
  matchId: string
): Promise<Result<TorneoMatchTimerPayload>> {
  const check = await ensureTorneoGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data, error } = await check.supabase
    .from("torneo_matches")
    .select("timer_round_label, timer_duration_sec, timer_started_at, timer_paused_at")
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: "Incontro non trovato." };

  return { success: true, data };
}

export async function patchTorneoMatchTimerAction(
  campaignId: string,
  matchId: string,
  patch: Partial<TorneoMatchTimerPayload>
): Promise<Result> {
  const check = await ensureTorneoGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await check.supabase
    .from("torneo_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Telecomando: imposta incontro controllato (initiative + timer). */
export async function setGmRemoteFocusedMatchAction(
  remotePublicId: string,
  matchId: string | null
): Promise<Result> {
  const check = await ensureGmOrAdminForRemote();
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await check.supabase
    .from("gm_remote_sessions")
    .update({ focused_match_id: matchId })
    .eq("public_id", remotePublicId)
    .is("revoked_at", null);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

async function ensureGmOrAdminForRemote(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Non autenticato." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return { ok: false, error: "Non autorizzato." };
  }
  return { ok: true, supabase };
}

export type TorneoRemoteMatchSummary = {
  id: string;
  label: string | null;
  status: string;
  teamAName: string;
  teamBName: string;
  bracketRound: number | null;
  matchKind: string;
};

export async function listTorneoMatchesForRemoteAction(
  campaignId: string
): Promise<Result<TorneoRemoteMatchSummary[]>> {
  const { getTorneoSetupAction } = await import("@/app/campaigns/torneo-actions");
  const setup = await getTorneoSetupAction(campaignId);
  if (!setup.success) {
    return { success: false, error: "error" in setup ? setup.error : "Errore caricamento incontri." };
  }
  if (!setup.data) {
    return { success: false, error: "Errore caricamento incontri." };
  }

  const out: TorneoRemoteMatchSummary[] = setup.data.matches.map((m) => ({
    id: m.id,
    label: m.label,
    status: m.status,
    teamAName: m.match_kind === "triello" ? m.team_a.name : m.team_a.name,
    teamBName: m.match_kind === "triello" ? "Triello" : m.team_b.name,
    bracketRound: m.bracket_round,
    matchKind: m.match_kind,
  }));

  return { success: true, data: out };
}
