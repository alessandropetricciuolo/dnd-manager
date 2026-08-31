"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  mapTorneo2LiveRow,
  mapTorneo2MatchRow,
  mapTorneo2ParticipantRow,
  mapTorneo2TeamMemberRow,
  mapTorneo2TeamRow,
  TORNEO2_MATCH_SELECT,
} from "@/lib/torneo2/map-rows";
import { finalistCharacterIds } from "@/lib/torneo2/standings";
import { buildBracketPlan, isPowerOfTwo } from "@/lib/torneo2/bracket";
import type { Torneo2MatchStatus, Torneo2Participant, Torneo2Setup, Torneo2Team } from "@/lib/torneo2/types";
import type { Torneo2TimerMode } from "@/lib/torneo2/timer";

type Result<T = void> = { success: true; data?: T } | { success: false; error: string };

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
  if (campaign.type !== "torneo") return { ok: false, error: "Questa azione è solo per tornei." };
  if (!isAdmin && campaign.gm_id !== user.id) return { ok: false, error: "Non autorizzato." };

  return { ok: true, supabase, userId: user.id };
}

function revalidateTorneo2(campaignId: string) {
  revalidatePath(`/campaigns/${campaignId}/gm-screen`);
  revalidatePath(`/campaigns/${campaignId}`);
}

export async function getTorneo2SetupAction(campaignId: string): Promise<Result<Torneo2Setup>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  const supabase = check.supabase;

  const { data: teamsRaw, error: teamsErr } = await supabase
    .from("torneo2_teams")
    .select("id, campaign_id, name, color, sort_order")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  if (teamsErr) return { success: false, error: teamsErr.message };

  const teamIds = (teamsRaw ?? []).map((t) => t.id);
  let membersRaw: Array<{
    id: string;
    team_id: string;
    character_id: string;
    sort_order: number;
    campaign_characters: unknown;
  }> = [];
  if (teamIds.length > 0) {
    const { data: memData } = await supabase
      .from("torneo2_team_members")
      .select(
        "id, team_id, character_id, sort_order, campaign_characters(name, character_class, class_subclass, armor_class, hit_points, level, image_url, rules_snapshot)"
      )
      .in("team_id", teamIds)
      .order("sort_order", { ascending: true });
    membersRaw = (memData ?? []) as typeof membersRaw;
  }

  const teams: Torneo2Team[] = (teamsRaw ?? []).map((t) =>
    mapTorneo2TeamRow(
      t,
      membersRaw.filter((m) => m.team_id === t.id).map((m) => mapTorneo2TeamMemberRow(m))
    )
  );

  const { data: matchesRaw, error: matchesErr } = await supabase
    .from("torneo2_matches")
    .select(TORNEO2_MATCH_SELECT)
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  if (matchesErr) return { success: false, error: matchesErr.message };

  const matches = (matchesRaw ?? []).map((row) => mapTorneo2MatchRow(row as never));
  const matchIds = matches.map((m) => m.id);

  const participantsByMatch: Record<string, Torneo2Participant[]> = {};
  if (matchIds.length > 0) {
    const { data: partRaw } = await supabase
      .from("torneo2_match_participants")
      .select("id, match_id, side, team_id, character_id, sort_order")
      .in("match_id", matchIds)
      .order("sort_order", { ascending: true });
    for (const row of partRaw ?? []) {
      const list = participantsByMatch[row.match_id] ?? (participantsByMatch[row.match_id] = []);
      list.push(mapTorneo2ParticipantRow(row));
    }
  }

  return { success: true, data: { teams, matches, participantsByMatch } };
}

// ============================================================
// Squadre
// ============================================================
export async function createTorneo2TeamAction(
  campaignId: string,
  payload: { name: string; color?: string }
): Promise<Result<{ id: string }>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  const name = payload.name.trim();
  if (!name) return { success: false, error: "Nome squadra obbligatorio." };

  const { data: maxRow } = await check.supabase
    .from("torneo2_teams")
    .select("sort_order")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await check.supabase
    .from("torneo2_teams")
    .insert({
      campaign_id: campaignId,
      name,
      color: payload.color?.trim() || "#f59e0b",
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateTorneo2(campaignId);
  return { success: true, data: { id: data.id } };
}

export async function updateTorneo2TeamAction(
  campaignId: string,
  teamId: string,
  payload: { name?: string; color?: string }
): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const patch: Record<string, string> = {};
  if (payload.name !== undefined) {
    const n = payload.name.trim();
    if (!n) return { success: false, error: "Nome non valido." };
    patch.name = n;
  }
  if (payload.color !== undefined) patch.color = payload.color.trim() || "#f59e0b";

  const { error } = await check.supabase
    .from("torneo2_teams")
    .update(patch)
    .eq("id", teamId)
    .eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  revalidateTorneo2(campaignId);
  return { success: true };
}

export async function deleteTorneo2TeamAction(campaignId: string, teamId: string): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { count } = await check.supabase
    .from("torneo2_matches")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`);

  if ((count ?? 0) > 0) {
    return { success: false, error: "Rimuovi prima gli incontri che coinvolgono questa squadra." };
  }

  const { error } = await check.supabase
    .from("torneo2_teams")
    .delete()
    .eq("id", teamId)
    .eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  revalidateTorneo2(campaignId);
  return { success: true };
}

export async function assignCharacterToTorneo2TeamAction(
  campaignId: string,
  teamId: string,
  characterId: string
): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data: ch } = await check.supabase
    .from("campaign_characters")
    .select("id")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!ch) return { success: false, error: "Personaggio non in questa campagna." };

  const { data: team } = await check.supabase
    .from("torneo2_teams")
    .select("id")
    .eq("id", teamId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!team) return { success: false, error: "Squadra non trovata." };

  await check.supabase.from("torneo2_team_members").delete().eq("character_id", characterId);

  const { data: maxRow } = await check.supabase
    .from("torneo2_team_members")
    .select("sort_order")
    .eq("team_id", teamId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await check.supabase.from("torneo2_team_members").insert({
    team_id: teamId,
    character_id: characterId,
    sort_order: (maxRow?.sort_order ?? -1) + 1,
  });

  if (error) {
    if (error.code === "23505") return { success: false, error: "PG già in un'altra squadra." };
    return { success: false, error: error.message };
  }
  revalidateTorneo2(campaignId);
  return { success: true };
}

export async function removeCharacterFromTorneo2TeamAction(
  campaignId: string,
  characterId: string
): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await check.supabase
    .from("torneo2_team_members")
    .delete()
    .eq("character_id", characterId);
  if (error) return { success: false, error: error.message };
  revalidateTorneo2(campaignId);
  return { success: true };
}

// ============================================================
// Incontri
// ============================================================
type TimerConfig = {
  timerMode?: Torneo2TimerMode;
  turnSeconds?: number;
  matchSeconds?: number | null;
};

function sanitizeTimerConfig(cfg: TimerConfig | undefined): {
  timer_mode: Torneo2TimerMode;
  turn_seconds: number;
  match_seconds: number | null;
} {
  const mode = cfg?.timerMode ?? "turn";
  const turn = Math.max(5, Math.trunc(cfg?.turnSeconds ?? 120));
  const matchSec =
    cfg?.matchSeconds != null && cfg.matchSeconds > 0 ? Math.trunc(cfg.matchSeconds) : null;
  return { timer_mode: mode, turn_seconds: turn, match_seconds: matchSec };
}

export async function createTorneo2MatchAction(
  campaignId: string,
  payload: { teamAId: string; teamBId: string; label?: string; timer?: TimerConfig }
): Promise<Result<{ id: string }>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  if (!payload.teamAId || !payload.teamBId) {
    return { success: false, error: "Seleziona due squadre." };
  }
  if (payload.teamAId === payload.teamBId) {
    return { success: false, error: "Scegli due squadre diverse." };
  }

  const { data: maxRow } = await check.supabase
    .from("torneo2_matches")
    .select("sort_order")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const timer = sanitizeTimerConfig(payload.timer);

  const { data, error } = await check.supabase
    .from("torneo2_matches")
    .insert({
      campaign_id: campaignId,
      kind: "team",
      team_a_id: payload.teamAId,
      team_b_id: payload.teamBId,
      label: payload.label?.trim() || null,
      sort_order: (maxRow?.sort_order ?? -1) + 1,
      status: "pending",
      ...timer,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateTorneo2(campaignId);
  return { success: true, data: { id: data.id } };
}

export async function updateTorneo2MatchSettingsAction(
  campaignId: string,
  matchId: string,
  payload: { label?: string | null; timer?: TimerConfig }
): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const patch: Record<string, unknown> = {};
  if (payload.label !== undefined) patch.label = payload.label?.trim() || null;
  if (payload.timer) Object.assign(patch, sanitizeTimerConfig(payload.timer));
  if (Object.keys(patch).length === 0) return { success: true };

  const { error } = await check.supabase
    .from("torneo2_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  revalidateTorneo2(campaignId);
  return { success: true };
}

export async function deleteTorneo2MatchAction(campaignId: string, matchId: string): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data: deleted, error } = await check.supabase
    .from("torneo2_matches")
    .delete()
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .neq("status", "active")
    .select("id")
    .maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!deleted) {
    const { data: existing, error: lookupError } = await check.supabase
      .from("torneo2_matches")
      .select("status")
      .eq("id", matchId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (lookupError) return { success: false, error: lookupError.message };
    if (existing?.status === "active") {
      return { success: false, error: "Non puoi eliminare un incontro attivo: termina prima il tavolo live." };
    }
    return { success: false, error: "Incontro non trovato." };
  }
  revalidateTorneo2(campaignId);
  return { success: true };
}

export async function setTorneo2MatchStatusAction(
  campaignId: string,
  matchId: string,
  status: Torneo2MatchStatus
): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const patch: Record<string, unknown> = { status };
  if (status === "pending") {
    patch.winner_team_id = null;
    patch.winner_character_id = null;
    patch.completed_at = null;
    patch.timer_running = false;
    patch.timer_started_at = null;
    patch.timer_paused_elapsed_ms = 0;
    patch.timer_label = null;
  }

  // Se riapro un incontro collegato nel tabellone, ritiro l'avanzamento dallo slot a valle.
  if (status === "pending") {
    const { data: m } = await check.supabase
      .from("torneo2_matches")
      .select("feeds_match_id, feeds_slot")
      .eq("id", matchId)
      .eq("campaign_id", campaignId)
      .maybeSingle();
    if (m?.feeds_match_id) {
      await withdrawWinnerFromBracket(
        check.supabase,
        campaignId,
        m.feeds_match_id as string,
        (m.feeds_slot as "a" | "b" | null) ?? "a"
      );
    }
  }

  const { error } = await check.supabase
    .from("torneo2_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  revalidateTorneo2(campaignId);
  return { success: true };
}

/** Annulla l'avanzamento a valle quando un incontro viene riaperto. */
async function withdrawWinnerFromBracket(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string,
  targetMatchId: string,
  slot: "a" | "b"
): Promise<void> {
  const { data: target } = await supabase
    .from("torneo2_matches")
    .select("id, kind, status")
    .eq("id", targetMatchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!target || target.status === "completed") return;

  const resetCombat = {
    combat_state: null,
    combat_seq: 0,
    combat_origin: null,
    combat_updated_at: null,
  };

  if (target.kind === "final_ffa") {
    await supabase.from("torneo2_match_participants").delete().eq("match_id", targetMatchId);
    await supabase.from("torneo2_matches").update(resetCombat).eq("id", targetMatchId);
  } else {
    await supabase
      .from("torneo2_matches")
      .update({ [slot === "b" ? "team_b_id" : "team_a_id"]: null, ...resetCombat })
      .eq("id", targetMatchId);
  }
}

/** Dichiarazione manuale del vincitore. Per team: winnerTeamId; per FFA: winnerCharacterId. */
export async function declareTorneo2WinnerAction(
  campaignId: string,
  matchId: string,
  payload: { winnerTeamId?: string | null; winnerCharacterId?: string | null; notes?: string }
): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data: match } = await check.supabase
    .from("torneo2_matches")
    .select("kind, team_a_id, team_b_id, feeds_match_id, feeds_slot")
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!match) return { success: false, error: "Incontro non trovato." };

  const patch: Record<string, unknown> = {
    status: "completed",
    completed_at: new Date().toISOString(),
    notes: payload.notes?.trim() || null,
    timer_running: false,
    timer_started_at: null,
  };

  let winnerTeamForAdvance: string | null = null;

  if (match.kind === "final_ffa") {
    const winnerCharacterId = payload.winnerCharacterId?.trim() || null;
    if (!winnerCharacterId) return { success: false, error: "Seleziona il PG vincitore." };
    const { data: part } = await check.supabase
      .from("torneo2_match_participants")
      .select("id")
      .eq("match_id", matchId)
      .eq("character_id", winnerCharacterId)
      .maybeSingle();
    if (!part) return { success: false, error: "Il vincitore deve essere un partecipante della finale." };
    patch.winner_character_id = winnerCharacterId;
    patch.winner_team_id = null;
  } else {
    const winnerTeamId = payload.winnerTeamId?.trim() || null;
    if (!winnerTeamId) return { success: false, error: "Seleziona la squadra vincitrice." };
    if (winnerTeamId !== match.team_a_id && winnerTeamId !== match.team_b_id) {
      return { success: false, error: "Vincitore non valido per questo incontro." };
    }
    patch.winner_team_id = winnerTeamId;
    patch.winner_character_id = null;
    winnerTeamForAdvance = winnerTeamId;
  }

  const { error } = await check.supabase
    .from("torneo2_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };

  // Avanzamento automatico nel tabellone.
  if (winnerTeamForAdvance && match.feeds_match_id) {
    await advanceWinnerInBracket(
      check.supabase,
      campaignId,
      match.feeds_match_id as string,
      (match.feeds_slot as "a" | "b" | null) ?? "a",
      winnerTeamForAdvance
    );
  }

  revalidateTorneo2(campaignId);
  return { success: true };
}

/**
 * Propaga la squadra vincente nell'incontro successivo del tabellone.
 * - Target squadra: riempie lo slot a/b indicato.
 * - Target triello/FFA: sostituisce i partecipanti con i membri della squadra vincente.
 * In entrambi i casi azzera lo stato combattimento del target (verra' riseminato).
 */
async function advanceWinnerInBracket(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string,
  targetMatchId: string,
  slot: "a" | "b",
  winnerTeamId: string
): Promise<void> {
  const { data: target } = await supabase
    .from("torneo2_matches")
    .select("id, kind, status")
    .eq("id", targetMatchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!target) return;
  if (target.status === "completed") return;

  const resetCombat = {
    combat_state: null,
    combat_seq: 0,
    combat_origin: null,
    combat_updated_at: null,
  };

  if (target.kind === "final_ffa") {
    const { data: members } = await supabase
      .from("torneo2_team_members")
      .select("character_id, sort_order")
      .eq("team_id", winnerTeamId)
      .order("sort_order", { ascending: true });
    await supabase.from("torneo2_match_participants").delete().eq("match_id", targetMatchId);
    const rows = (members ?? []).map((m, i) => ({
      match_id: targetMatchId,
      side: "ffa" as const,
      team_id: winnerTeamId,
      character_id: m.character_id,
      sort_order: i,
    }));
    if (rows.length > 0) {
      await supabase.from("torneo2_match_participants").insert(rows);
    }
    await supabase.from("torneo2_matches").update(resetCombat).eq("id", targetMatchId);
  } else {
    await supabase
      .from("torneo2_matches")
      .update({ [slot === "b" ? "team_b_id" : "team_a_id"]: winnerTeamId, ...resetCombat })
      .eq("id", targetMatchId);
  }
}

/** Genera la finale free-for-all individuale con i PG delle squadre vincitrici. */
export async function generateTorneo2FinalAction(
  campaignId: string,
  payload?: { label?: string; timer?: TimerConfig; extraCharacterIds?: string[] }
): Promise<Result<{ matchId: string; participantCount: number }>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const setup = await getTorneo2SetupAction(campaignId);
  if (!setup.success || !setup.data) {
    return { success: false, error: "error" in setup ? setup.error : "Errore caricamento torneo." };
  }

  const finalists = finalistCharacterIds(setup.data.matches, setup.data.teams);
  const extra = (payload?.extraCharacterIds ?? []).filter(Boolean);
  const characterIds = [...new Set([...finalists, ...extra])];
  if (characterIds.length < 2) {
    return { success: false, error: "Servono almeno 2 vincitori per generare la finale." };
  }

  const { data: activeFinal, error: activeFinalErr } = await check.supabase
    .from("torneo2_matches")
    .select("id")
    .eq("campaign_id", campaignId)
    .eq("kind", "final_ffa")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (activeFinalErr) return { success: false, error: activeFinalErr.message };
  if (activeFinal) {
    return { success: false, error: "Finale live in corso: termina il tavolo prima di rigenerarla." };
  }

  // Rimuove solo eventuali finali ancora in preparazione: una finale live non va mai cancellata.
  const { error: deletePendingFinalErr } = await check.supabase
    .from("torneo2_matches")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("kind", "final_ffa")
    .eq("status", "pending");
  if (deletePendingFinalErr) return { success: false, error: deletePendingFinalErr.message };

  const { data: maxRow } = await check.supabase
    .from("torneo2_matches")
    .select("sort_order")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const timer = sanitizeTimerConfig(payload?.timer);

  const { data: match, error: matchErr } = await check.supabase
    .from("torneo2_matches")
    .insert({
      campaign_id: campaignId,
      kind: "final_ffa",
      label: payload?.label?.trim() || "Finale · Tutti contro tutti",
      sort_order: (maxRow?.sort_order ?? -1) + 1,
      status: "pending",
      ...timer,
    })
    .select("id")
    .single();

  if (matchErr || !match) {
    return { success: false, error: matchErr?.message ?? "Errore creazione finale." };
  }

  const teamByCharacter = new Map<string, Torneo2Team>();
  for (const team of setup.data.teams) {
    for (const m of team.members) teamByCharacter.set(m.characterId, team);
  }

  const rows = characterIds.map((characterId, i) => ({
    match_id: match.id,
    side: "ffa" as const,
    team_id: teamByCharacter.get(characterId)?.id ?? null,
    character_id: characterId,
    sort_order: i,
  }));

  const { error: partErr } = await check.supabase.from("torneo2_match_participants").insert(rows);
  if (partErr) {
    await check.supabase.from("torneo2_matches").delete().eq("id", match.id);
    return { success: false, error: partErr.message };
  }

  revalidateTorneo2(campaignId);
  return { success: true, data: { matchId: match.id, participantCount: rows.length } };
}

// ============================================================
// Tabellone (bracket)
// ============================================================

/** Modifica manuale dei dati bracket di un incontro (round, etichetta, collegamento vincitore). */
export async function updateTorneo2MatchBracketAction(
  campaignId: string,
  matchId: string,
  payload: {
    bracketRound?: number | null;
    bracketPosition?: number;
    roundLabel?: string | null;
    feedsMatchId?: string | null;
    feedsSlot?: "a" | "b" | null;
  }
): Promise<Result> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  if (payload.feedsMatchId && payload.feedsMatchId === matchId) {
    return { success: false, error: "Un incontro non puo' alimentare se stesso." };
  }

  const patch: Record<string, unknown> = {};
  if (payload.bracketRound !== undefined) patch.bracket_round = payload.bracketRound;
  if (payload.bracketPosition !== undefined) patch.bracket_position = payload.bracketPosition;
  if (payload.roundLabel !== undefined) patch.round_label = payload.roundLabel?.trim() || null;
  if (payload.feedsMatchId !== undefined) patch.feeds_match_id = payload.feedsMatchId || null;
  if (payload.feedsSlot !== undefined) patch.feeds_slot = payload.feedsSlot ?? null;
  if (Object.keys(patch).length === 0) return { success: true };

  const { error } = await check.supabase
    .from("torneo2_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  revalidateTorneo2(campaignId);
  return { success: true };
}

/** Elimina tutti gli incontri del tabellone (quelli con bracket_round valorizzato). */
export async function clearTorneo2BracketAction(campaignId: string): Promise<Result<{ removed: number }>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data, error } = await check.supabase
    .from("torneo2_matches")
    .delete()
    .eq("campaign_id", campaignId)
    .not("bracket_round", "is", null)
    .select("id");
  if (error) return { success: false, error: error.message };
  revalidateTorneo2(campaignId);
  return { success: true, data: { removed: (data ?? []).length } };
}

/**
 * Genera un tabellone a eliminazione diretta dalle squadre selezionate (potenza di due),
 * con avanzamento automatico e, opzionalmente, un triello finale tra i membri della
 * squadra vincitrice della finale.
 */
export async function generateTorneo2BracketAction(
  campaignId: string,
  payload: { teamIds: string[]; timer?: TimerConfig; withTriello?: boolean; replaceExisting?: boolean }
): Promise<Result<{ matchesCreated: number }>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  const supabase = check.supabase;

  const teamIds = [...new Set((payload.teamIds ?? []).filter(Boolean))];
  if (teamIds.length < 2) return { success: false, error: "Seleziona almeno 2 squadre." };
  if (!isPowerOfTwo(teamIds.length)) {
    return {
      success: false,
      error: "Per la generazione automatica servono 2, 4, 8 o 16 squadre. Usa l'editor manuale per altri numeri.",
    };
  }

  const plan = buildBracketPlan(teamIds);
  if (plan.length === 0) return { success: false, error: "Impossibile costruire il tabellone." };

  if (payload.replaceExisting) {
    await supabase
      .from("torneo2_matches")
      .delete()
      .eq("campaign_id", campaignId)
      .not("bracket_round", "is", null);
  }

  const { data: maxRow } = await supabase
    .from("torneo2_matches")
    .select("sort_order")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  let nextSort = (maxRow?.sort_order ?? -1) + 1;

  const timer = sanitizeTimerConfig(payload.timer);
  const maxRound = plan.reduce((acc, m) => Math.max(acc, m.round), 0);

  // Inserimento in due fasi: prima i match (senza feeds), poi i collegamenti.
  const idGrid: Record<string, string> = {}; // `${round}:${position}` -> id
  for (const m of plan) {
    const { data, error } = await supabase
      .from("torneo2_matches")
      .insert({
        campaign_id: campaignId,
        kind: "team",
        team_a_id: m.teamAId,
        team_b_id: m.teamBId,
        label: null,
        round_label: m.label,
        bracket_round: m.round,
        bracket_position: m.position,
        sort_order: nextSort,
        status: "pending",
        ...timer,
      })
      .select("id")
      .single();
    if (error || !data) {
      return { success: false, error: error?.message ?? "Errore creazione incontri." };
    }
    idGrid[`${m.round}:${m.position}`] = data.id;
    nextSort += 1;
  }

  let trielloId: string | null = null;
  if (payload.withTriello) {
    const { data: triello, error: triErr } = await supabase
      .from("torneo2_matches")
      .insert({
        campaign_id: campaignId,
        kind: "final_ffa",
        label: "Triello",
        round_label: "Triello",
        bracket_round: maxRound + 1,
        bracket_position: 0,
        sort_order: nextSort,
        status: "pending",
        ...timer,
      })
      .select("id")
      .single();
    if (triErr || !triello) {
      return { success: false, error: triErr?.message ?? "Errore creazione triello." };
    }
    trielloId = triello.id;
    nextSort += 1;
  }

  // Collegamenti vincitore.
  for (const m of plan) {
    const id = idGrid[`${m.round}:${m.position}`];
    if (!id) continue;
    if (m.feedsTo) {
      const targetId = idGrid[`${m.feedsTo.round}:${m.feedsTo.position}`];
      if (targetId) {
        await supabase
          .from("torneo2_matches")
          .update({ feeds_match_id: targetId, feeds_slot: m.feedsTo.slot })
          .eq("id", id);
      }
    } else if (trielloId) {
      // La finale alimenta il triello (espansione membri squadra vincente).
      await supabase
        .from("torneo2_matches")
        .update({ feeds_match_id: trielloId, feeds_slot: null })
        .eq("id", id);
    }
  }

  revalidateTorneo2(campaignId);
  return { success: true, data: { matchesCreated: plan.length + (trielloId ? 1 : 0) } };
}

/** Kill switch Torneo 2.0: termina live, revoca telecomandi, azzera incontri. */
export async function emergencyResetTorneo2Action(
  campaignId: string
): Promise<Result<{ matchesReset: number }>> {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  const supabase = check.supabase;
  const now = new Date().toISOString();

  const { data: live } = await supabase
    .from("torneo2_live_sessions")
    .select("id, remote_session_public_id")
    .eq("campaign_id", campaignId)
    .eq("status", "live")
    .maybeSingle();

  if (live) {
    await supabase
      .from("torneo2_live_sessions")
      .update({ status: "ended", ended_at: now })
      .eq("id", live.id);
    if (live.remote_session_public_id) {
      await supabase
        .from("gm_remote_sessions")
        .update({ revoked_at: now, focused_match_id: null })
        .eq("public_id", live.remote_session_public_id);
    }
  }

  const { data: matches, error } = await supabase
    .from("torneo2_matches")
    .update({
      status: "pending",
      winner_team_id: null,
      winner_character_id: null,
      completed_at: null,
      combat_state: null,
      combat_seq: 0,
      combat_origin: null,
      combat_updated_at: null,
      timer_running: false,
      timer_started_at: null,
      timer_paused_elapsed_ms: 0,
      timer_label: null,
    })
    .eq("campaign_id", campaignId)
    .select("id");

  if (error) return { success: false, error: error.message };

  revalidateTorneo2(campaignId);
  return { success: true, data: { matchesReset: (matches ?? []).length } };
}

/** Riepilogo sessione live attiva (usato dalla console). */
export async function getActiveTorneo2LiveAction(campaignId: string) {
  const check = await ensureTorneo2Gm(campaignId);
  if (!check.ok) return { success: false as const, error: check.error };

  const { data, error } = await check.supabase
    .from("torneo2_live_sessions")
    .select(
      "id, public_id, campaign_id, status, station1_match_id, station2_match_id, remote_session_public_id, started_at, ended_at"
    )
    .eq("campaign_id", campaignId)
    .eq("status", "live")
    .maybeSingle();

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data ? mapTorneo2LiveRow(data) : null };
}
