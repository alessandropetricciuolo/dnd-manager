import type { SupabaseClient } from "@supabase/supabase-js";
import type { TorneoMatchWithTeams, TorneoTeamWithMembers } from "@/lib/torneo/types";

/** Caricamento torneo via service role (API telecomando / display). */
export async function loadTorneoSetupAdmin(
  admin: SupabaseClient,
  campaignId: string
): Promise<{ teams: TorneoTeamWithMembers[]; matches: TorneoMatchWithTeams[] } | null> {
  const { data: teamsRaw } = await admin
    .from("torneo_teams")
    .select("id, campaign_id, name, color, sort_order")
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  const teamIds = (teamsRaw ?? []).map((t) => t.id);
  let membersRaw: Array<{
    id: string;
    team_id: string;
    character_id: string;
    campaign_characters: unknown;
  }> = [];

  if (teamIds.length > 0) {
    const { data: memData } = await admin
      .from("torneo_team_members")
      .select("id, team_id, character_id, campaign_characters(name, character_class, armor_class, hit_points)")
      .in("team_id", teamIds);
    membersRaw = (memData ?? []) as typeof membersRaw;
  }

  const { data: matchesRaw } = await admin
    .from("torneo_matches")
    .select(
      "id, campaign_id, team_a_id, team_b_id, label, sort_order, status, match_kind, bracket_round, bracket_slot, advances_to_match_id, advances_to_slot, winner_team_id, winner_character_id, team_a_damage_total, team_b_damage_total, completed_at, notes, initiative_updated_at, timer_round_label, timer_duration_sec, timer_started_at, timer_paused_at"
    )
    .eq("campaign_id", campaignId)
    .order("sort_order", { ascending: true });

  if (!teamsRaw || !matchesRaw) return null;

  const teamById = new Map((teamsRaw ?? []).map((t) => [t.id, t]));

  const teams: TorneoTeamWithMembers[] = teamsRaw.map((t) => ({
    ...t,
    members: membersRaw
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

  const matches: TorneoMatchWithTeams[] = matchesRaw.flatMap((row) => {
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
        status: row.status,
        match_kind: row.match_kind ?? "bracket",
        bracket_round: row.bracket_round ?? null,
        bracket_slot: row.bracket_slot ?? null,
        advances_to_match_id: row.advances_to_match_id ?? null,
        advances_to_slot: row.advances_to_slot ?? null,
        winner_team_id: row.winner_team_id ?? null,
        winner_character_id: row.winner_character_id ?? null,
        team_a_damage_total: row.team_a_damage_total,
        team_b_damage_total: row.team_b_damage_total,
        completed_at: row.completed_at ?? null,
        notes: row.notes ?? null,
        initiative_updated_at: row.initiative_updated_at ?? null,
        timer_round_label: row.timer_round_label ?? null,
        timer_duration_sec: row.timer_duration_sec ?? null,
        timer_started_at: row.timer_started_at ?? null,
        timer_paused_at: row.timer_paused_at ?? null,
        team_a: { id: teamA.id, name: teamA.name, color: teamA.color },
        team_b: { id: teamB.id, name: teamB.name, color: teamB.color },
      },
    ];
  });

  return { teams, matches };
}
