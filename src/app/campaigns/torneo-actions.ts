"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  buildEightTeamBracketPlan,
  BRACKET_ROUND,
  resolveBracketSlotAfterAdvance,
} from "@/lib/torneo/bracket";
import { isTorneoMatchPlayable, mapTorneoMatchRow } from "@/lib/torneo/map-match-row";
import type {
  TorneoMatchStatus,
  TorneoMatchWithTeams,
  TorneoTeamWithMembers,
} from "@/lib/torneo/types";

type Result<T = void> = { success: true; data?: T } | { success: false; error: string };

async function ensureCampaignGm(campaignId: string): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> }
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

  return { ok: true, supabase };
}

function revalidateTorneo(campaignId: string) {
  revalidatePath(`/campaigns/${campaignId}/gm-screen`);
  revalidatePath(`/campaigns/${campaignId}/torneo-tabellone`);
  revalidatePath(`/campaigns/${campaignId}`);
}

const TORNEO_MATCH_SELECT =
  "id, campaign_id, team_a_id, team_b_id, team_a_placeholder, team_b_placeholder, label, sort_order, status, match_kind, bracket_round, bracket_slot, advances_to_match_id, advances_to_slot, winner_team_id, winner_character_id, team_a_damage_total, team_b_damage_total, completed_at, notes, initiative_updated_at, timer_round_label, timer_duration_sec, timer_started_at, timer_paused_at";

export async function getTorneoSetupAction(campaignId: string): Promise<
  Result<{ teams: TorneoTeamWithMembers[]; matches: TorneoMatchWithTeams[] }>
> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  const supabase = check.supabase;

  const { data: teamsRaw, error: teamsErr } = await supabase
    .from("torneo_teams")
    .select("id, campaign_id, name, color, sort_order")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  if (teamsErr) return { success: false, error: teamsErr.message };

  const teamIds = (teamsRaw ?? []).map((t) => t.id);
  let membersRaw: Array<{
    id: string;
    team_id: string;
    character_id: string;
    campaign_characters: unknown;
  }> = [];
  if (teamIds.length > 0) {
    const { data: memData } = await supabase
      .from("torneo_team_members")
      .select("id, team_id, character_id, campaign_characters(name, character_class, armor_class, hit_points)")
      .in("team_id", teamIds);
    membersRaw = (memData ?? []) as typeof membersRaw;
  }

  const { data: matchesRaw, error: matchesErr } = await supabase
    .from("torneo_matches")
    .select(TORNEO_MATCH_SELECT)
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  if (matchesErr) return { success: false, error: matchesErr.message };

  const teamById = new Map((teamsRaw ?? []).map((t) => [t.id, t]));

  const teams: TorneoTeamWithMembers[] = (teamsRaw ?? []).map((t) => ({
    ...t,
    members: (membersRaw ?? [])
      .filter((m) => m.team_id === t.id)
      .map((m) => {
        const ch = m.campaign_characters as
          | { name: string; character_class: string | null; armor_class: number | null; hit_points: number | null }
          | { name: string; character_class: string | null; armor_class: number | null; hit_points: number | null }[]
          | null;
        const c = Array.isArray(ch) ? ch[0] : ch;
        return {
          id: m.id,
          character_id: m.character_id,
          name: c?.name ?? "—",
          character_class: c?.character_class ?? null,
          armor_class: c?.armor_class ?? null,
          hit_points: c?.hit_points ?? null,
        };
      }),
  }));

  const matches: TorneoMatchWithTeams[] = (matchesRaw ?? []).map((row) =>
    mapTorneoMatchRow(row, teamById)
  );

  return { success: true, data: { teams, matches } };
}

export async function createTorneoTeamAction(
  campaignId: string,
  payload: { name: string; color?: string }
): Promise<Result<{ id: string }>> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  const name = payload.name.trim();
  if (!name) return { success: false, error: "Nome squadra obbligatorio." };

  const { data: maxRow } = await check.supabase
    .from("torneo_teams")
    .select("sort_order")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await check.supabase
    .from("torneo_teams")
    .insert({
      campaign_id: campaignId,
      name,
      color: payload.color?.trim() || "#f59e0b",
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateTorneo(campaignId);
  return { success: true, data: { id: data.id } };
}

export async function updateTorneoTeamAction(
  campaignId: string,
  teamId: string,
  payload: { name?: string; color?: string }
): Promise<Result> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const patch: Record<string, string> = {};
  if (payload.name !== undefined) {
    const n = payload.name.trim();
    if (!n) return { success: false, error: "Nome non valido." };
    patch.name = n;
  }
  if (payload.color !== undefined) patch.color = payload.color.trim() || "#f59e0b";

  const { error } = await check.supabase.from("torneo_teams").update(patch).eq("id", teamId).eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  revalidateTorneo(campaignId);
  return { success: true };
}

export async function deleteTorneoTeamAction(campaignId: string, teamId: string): Promise<Result> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { count } = await check.supabase
    .from("torneo_matches")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`);

  if ((count ?? 0) > 0) {
    return { success: false, error: "Rimuovi prima gli incontri che coinvolgono questa squadra." };
  }

  const { error } = await check.supabase.from("torneo_teams").delete().eq("id", teamId).eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  revalidateTorneo(campaignId);
  return { success: true };
}

export async function assignCharacterToTorneoTeamAction(
  campaignId: string,
  teamId: string,
  characterId: string
): Promise<Result> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data: ch } = await check.supabase
    .from("campaign_characters")
    .select("id")
    .eq("id", characterId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!ch) return { success: false, error: "Personaggio non in questa campagna." };

  const { data: team } = await check.supabase
    .from("torneo_teams")
    .select("id")
    .eq("id", teamId)
    .eq("campaign_id", campaignId)
    .maybeSingle();
  if (!team) return { success: false, error: "Squadra non trovata." };

  await check.supabase.from("torneo_team_members").delete().eq("character_id", characterId);

  const { error } = await check.supabase.from("torneo_team_members").insert({
    team_id: teamId,
    character_id: characterId,
  });

  if (error) {
    if (error.code === "23505") return { success: false, error: "PG già in un'altra squadra." };
    return { success: false, error: error.message };
  }
  revalidateTorneo(campaignId);
  return { success: true };
}

export async function removeCharacterFromTorneoTeamAction(
  campaignId: string,
  characterId: string
): Promise<Result> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await check.supabase.from("torneo_team_members").delete().eq("character_id", characterId);
  if (error) return { success: false, error: error.message };
  revalidateTorneo(campaignId);
  return { success: true };
}

/** Salva tutte le assegnazioni PG→squadra in un'unica operazione. */
export async function saveTorneoTeamRosterAction(
  campaignId: string,
  assignments: Array<{ characterId: string; teamId: string | null }>
): Promise<Result> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  if (assignments.length === 0) return { success: true };

  const characterIds = [...new Set(assignments.map((a) => a.characterId.trim()).filter(Boolean))];
  const teamIds = [...new Set(assignments.map((a) => a.teamId).filter((id): id is string => !!id?.trim()))];

  const { data: chars } = await check.supabase
    .from("campaign_characters")
    .select("id")
    .eq("campaign_id", campaignId)
    .in("id", characterIds);

  if ((chars ?? []).length !== characterIds.length) {
    return { success: false, error: "Uno o più personaggi non appartengono a questa campagna." };
  }

  if (teamIds.length > 0) {
    const { data: teams } = await check.supabase
      .from("torneo_teams")
      .select("id")
      .eq("campaign_id", campaignId)
      .in("id", teamIds);

    if ((teams ?? []).length !== teamIds.length) {
      return { success: false, error: "Una o più squadre non sono valide." };
    }
  }

  const { error: delErr } = await check.supabase
    .from("torneo_team_members")
    .delete()
    .in("character_id", characterIds);

  if (delErr) return { success: false, error: delErr.message };

  const toInsert = assignments
    .filter((a) => a.teamId?.trim())
    .map((a) => ({ team_id: a.teamId!.trim(), character_id: a.characterId.trim() }));

  if (toInsert.length > 0) {
    const { error: insErr } = await check.supabase.from("torneo_team_members").insert(toInsert);
    if (insErr) {
      if (insErr.code === "23505") return { success: false, error: "PG già in un'altra squadra." };
      return { success: false, error: insErr.message };
    }
  }

  revalidateTorneo(campaignId);
  return { success: true };
}

export async function createTorneoMatchAction(
  campaignId: string,
  payload: { teamAId: string; teamBId: string; label?: string }
): Promise<Result<{ id: string }>> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };
  if (payload.teamAId === payload.teamBId) {
    return { success: false, error: "Scegli due squadre diverse." };
  }

  const { data: maxRow } = await check.supabase
    .from("torneo_matches")
    .select("sort_order")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await check.supabase
    .from("torneo_matches")
    .insert({
      campaign_id: campaignId,
      team_a_id: payload.teamAId,
      team_b_id: payload.teamBId,
      label: payload.label?.trim() || null,
      sort_order: (maxRow?.sort_order ?? -1) + 1,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateTorneo(campaignId);
  return { success: true, data: { id: data.id } };
}

export async function setTorneoMatchStatusAction(
  campaignId: string,
  matchId: string,
  status: TorneoMatchStatus
): Promise<Result> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  if (status === "active") {
    const { data: match } = await check.supabase
      .from("torneo_matches")
      .select("team_a_id, team_b_id, match_kind")
      .eq("id", matchId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (!match) return { success: false, error: "Incontro non trovato." };
    if (
      !isTorneoMatchPlayable({
        team_a_id: match.team_a_id,
        team_b_id: match.team_b_id,
        match_kind: (match.match_kind ?? "bracket") as "bracket" | "triello",
      })
    ) {
      return {
        success: false,
        error: "Incontro non ancora pronto: attendi i vincitori del turno precedente.",
      };
    }
  }

  const patch: Record<string, unknown> = { status };
  if (status === "pending") {
    patch.winner_team_id = null;
    patch.winner_character_id = null;
    patch.completed_at = null;
    patch.team_a_damage_total = 0;
    patch.team_b_damage_total = 0;
  }

  const { error } = await check.supabase
    .from("torneo_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };

  revalidateTorneo(campaignId);
  return { success: true };
}

async function advanceBracketWinner(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  campaignId: string,
  completedMatchId: string,
  winnerTeamId: string
): Promise<Result> {
  const { data: completed } = await supabase
    .from("torneo_matches")
    .select("advances_to_match_id, advances_to_slot, bracket_round, match_kind")
    .eq("id", completedMatchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!completed?.advances_to_match_id || !completed.advances_to_slot) {
    return { success: true };
  }

  const { data: target } = await supabase
    .from("torneo_matches")
    .select("team_a_id, team_b_id, team_a_placeholder, team_b_placeholder, match_kind")
    .eq("id", completed.advances_to_match_id)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!target) {
    return { success: false, error: "Incontro successivo nel tabellone non trovato." };
  }

  const slot = completed.advances_to_slot as "a" | "b";
  const { teamAId, teamBId, teamAPlaceholder, teamBPlaceholder } = resolveBracketSlotAfterAdvance(
    target.team_a_id,
    target.team_b_id,
    target.team_a_placeholder,
    target.team_b_placeholder,
    slot,
    winnerTeamId
  );

  const { error: advanceErr } = await supabase
    .from("torneo_matches")
    .update({
      team_a_id: teamAId,
      team_b_id: teamBId,
      team_a_placeholder: teamAPlaceholder,
      team_b_placeholder: teamBPlaceholder,
    })
    .eq("id", completed.advances_to_match_id)
    .eq("campaign_id", campaignId);

  if (advanceErr) {
    return {
      success: false,
      error: `Aggiornamento tabellone fallito: ${advanceErr.message}`,
    };
  }

  if (completed.bracket_round === BRACKET_ROUND.FINAL) {
    const { error: trielloErr } = await supabase
      .from("torneo_matches")
      .update({
        team_a_id: winnerTeamId,
        team_b_id: winnerTeamId,
        team_a_placeholder: null,
        team_b_placeholder: null,
      })
      .eq("campaign_id", campaignId)
      .eq("match_kind", "triello");

    if (trielloErr) {
      return {
        success: false,
        error: `Triello non aggiornato: ${trielloErr.message}`,
      };
    }
  }

  return { success: true };
}

export async function generateTorneoBracketAction(campaignId: string): Promise<Result<{ matchCount: number }>> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const setup = await getTorneoSetupAction(campaignId);
  if (!setup.success) return { success: false, error: "error" in setup ? setup.error : "Errore setup." };
  if (!setup.data) return { success: false, error: "Errore setup." };
  if (setup.data.teams.length !== 8) {
    return { success: false, error: "Servono esattamente 8 squadre per il tabellone." };
  }

  const { error: delErr } = await check.supabase
    .from("torneo_matches")
    .delete()
    .eq("campaign_id", campaignId);

  if (delErr) return { success: false, error: delErr.message };

  let plan;
  try {
    plan = buildEightTeamBracketPlan(setup.data.teams);
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Errore tabellone." };
  }

  const insertedIds: string[] = [];

  for (let i = 0; i < plan.length; i += 1) {
    const slot = plan[i]!;
    const { data, error } = await check.supabase
      .from("torneo_matches")
      .insert({
        campaign_id: campaignId,
        team_a_id: slot.teamAId,
        team_b_id: slot.teamBId,
        team_a_placeholder: slot.teamAPlaceholder,
        team_b_placeholder: slot.teamBPlaceholder,
        label: slot.label,
        sort_order: i,
        status: "pending",
        match_kind: slot.matchKind,
        bracket_round: slot.round,
        bracket_slot: slot.slot,
      })
      .select("id")
      .single();

    if (error || !data) return { success: false, error: error?.message ?? "Errore creazione incontro." };
    insertedIds.push(data.id);
  }

  for (let i = 0; i < plan.length; i += 1) {
    const slot = plan[i]!;
    if (slot.advancesToMatchIndex == null || !slot.advancesToSlot) continue;
    const childId = insertedIds[slot.advancesToMatchIndex];
    if (!childId) continue;
    await check.supabase
      .from("torneo_matches")
      .update({
        advances_to_match_id: childId,
        advances_to_slot: slot.advancesToSlot,
      })
      .eq("id", insertedIds[i]!)
      .eq("campaign_id", campaignId);
  }

  revalidateTorneo(campaignId);
  return { success: true, data: { matchCount: plan.length } };
}

export async function completeTorneoMatchAction(
  campaignId: string,
  matchId: string,
  payload: {
    winnerTeamId?: string;
    winnerCharacterId?: string;
    teamADamageTotal: number;
    teamBDamageTotal: number;
    notes?: string;
  }
): Promise<Result> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data: match } = await check.supabase
    .from("torneo_matches")
    .select("team_a_id, team_b_id, match_kind")
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!match) return { success: false, error: "Incontro non trovato." };

  const isTriello = match.match_kind === "triello";
  const winnerTeamId = payload.winnerTeamId?.trim() || null;
  const winnerCharacterId = payload.winnerCharacterId?.trim() || null;

  if (isTriello) {
    if (!winnerCharacterId) {
      return { success: false, error: "Seleziona il PG vincitore del triello." };
    }
    const { data: member } = await check.supabase
      .from("torneo_team_members")
      .select("team_id")
      .eq("character_id", winnerCharacterId)
      .maybeSingle();
    if (!member || member.team_id !== match.team_a_id) {
      return { success: false, error: "Il vincitore deve essere un PG della squadra campione." };
    }
  } else {
    if (!winnerTeamId) return { success: false, error: "Vincitore squadra obbligatorio." };
    if (winnerTeamId !== match.team_a_id && winnerTeamId !== match.team_b_id) {
      return { success: false, error: "Vincitore non valido per questo incontro." };
    }
  }

  if (!isTriello && winnerTeamId) {
    const advanceRes = await advanceBracketWinner(check.supabase, campaignId, matchId, winnerTeamId);
    if (!advanceRes.success) {
      return { success: false, error: advanceRes.error };
    }
  }

  const { error } = await check.supabase
    .from("torneo_matches")
    .update({
      status: "completed",
      winner_team_id: isTriello ? match.team_a_id : winnerTeamId,
      winner_character_id: isTriello ? winnerCharacterId : null,
      team_a_damage_total: Math.max(0, Math.trunc(payload.teamADamageTotal)),
      team_b_damage_total: Math.max(0, Math.trunc(payload.teamBDamageTotal)),
      completed_at: new Date().toISOString(),
      notes: payload.notes?.trim() || null,
    })
    .eq("id", matchId)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };

  revalidateTorneo(campaignId);
  return { success: true };
}

export async function deleteTorneoMatchAction(campaignId: string, matchId: string): Promise<Result> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { error } = await check.supabase.from("torneo_matches").delete().eq("id", matchId).eq("campaign_id", campaignId);
  if (error) return { success: false, error: error.message };
  revalidateTorneo(campaignId);
  return { success: true };
}
