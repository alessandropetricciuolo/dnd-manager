"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/utils/supabase/server";
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
  revalidatePath(`/campaigns/${campaignId}`);
}

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
    .select(
      "id, campaign_id, team_a_id, team_b_id, label, sort_order, status, winner_team_id, team_a_damage_total, team_b_damage_total, completed_at, notes"
    )
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

  const matches: TorneoMatchWithTeams[] = (matchesRaw ?? []).flatMap((row) => {
    const teamA = teamById.get(row.team_a_id);
    const teamB = teamById.get(row.team_b_id);
    if (!teamA || !teamB) return [];
    return [
      {
        id: row.id,
        campaign_id: row.campaign_id,
        team_a_id: row.team_a_id,
        team_b_id: row.team_b_id,
        label: row.label ?? null,
        sort_order: row.sort_order,
        status: row.status as TorneoMatchStatus,
        winner_team_id: row.winner_team_id ?? null,
        team_a_damage_total: row.team_a_damage_total,
        team_b_damage_total: row.team_b_damage_total,
        completed_at: row.completed_at ?? null,
        notes: row.notes ?? null,
        team_a: { id: teamA.id, name: teamA.name, color: teamA.color },
        team_b: { id: teamB.id, name: teamB.name, color: teamB.color },
      },
    ];
  });

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

  const patch: Record<string, unknown> = { status };
  if (status === "pending") {
    patch.winner_team_id = null;
    patch.completed_at = null;
  }

  const { error } = await check.supabase
    .from("torneo_matches")
    .update(patch)
    .eq("id", matchId)
    .eq("campaign_id", campaignId);

  if (error) return { success: false, error: error.message };

  if (status === "active") {
    await check.supabase
      .from("torneo_matches")
      .update({ status: "pending" })
      .eq("campaign_id", campaignId)
      .eq("status", "active")
      .neq("id", matchId);
  }

  revalidateTorneo(campaignId);
  return { success: true };
}

export async function completeTorneoMatchAction(
  campaignId: string,
  matchId: string,
  payload: {
    winnerTeamId: string;
    teamADamageTotal: number;
    teamBDamageTotal: number;
    notes?: string;
  }
): Promise<Result> {
  const check = await ensureCampaignGm(campaignId);
  if (!check.ok) return { success: false, error: check.error };

  const { data: match } = await check.supabase
    .from("torneo_matches")
    .select("team_a_id, team_b_id")
    .eq("id", matchId)
    .eq("campaign_id", campaignId)
    .maybeSingle();

  if (!match) return { success: false, error: "Incontro non trovato." };
  if (payload.winnerTeamId !== match.team_a_id && payload.winnerTeamId !== match.team_b_id) {
    return { success: false, error: "Vincitore non valido per questo incontro." };
  }

  const { error } = await check.supabase
    .from("torneo_matches")
    .update({
      status: "completed",
      winner_team_id: payload.winnerTeamId,
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
