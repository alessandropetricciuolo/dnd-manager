import type { SupabaseClient } from "@supabase/supabase-js";
import { mapTorneoMatchRow } from "@/lib/torneo/map-match-row";
import type { TorneoMatchWithTeams, TorneoTeamWithMembers } from "@/lib/torneo/types";

const TORNEO_MATCH_SELECT =
  "id, campaign_id, team_a_id, team_b_id, team_a_placeholder, team_b_placeholder, label, sort_order, status, match_kind, bracket_round, bracket_slot, advances_to_match_id, advances_to_slot, winner_team_id, winner_character_id, team_a_damage_total, team_b_damage_total, completed_at, notes, initiative_updated_at, timer_round_label, timer_duration_sec, timer_started_at, timer_paused_at";

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
      .select(
        "id, team_id, character_id, campaign_characters(name, character_class, class_subclass, armor_class, hit_points, level, image_url, rules_snapshot)"
      )
      .in("team_id", teamIds);
    membersRaw = (memData ?? []) as typeof membersRaw;
  }

  const { data: matchesRaw } = await admin
    .from("torneo_matches")
    .select(TORNEO_MATCH_SELECT)
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
          | {
              name: string;
              character_class: string | null;
              class_subclass: string | null;
              armor_class: number | null;
              hit_points: number | null;
              level: number | null;
              image_url: string | null;
              rules_snapshot: unknown;
            }
          | {
              name: string;
              character_class: string | null;
              class_subclass: string | null;
              armor_class: number | null;
              hit_points: number | null;
              level: number | null;
              image_url: string | null;
              rules_snapshot: unknown;
            }[]
          | null;
        const c = Array.isArray(ch) ? ch[0] : ch;
        return {
          id: m.id,
          character_id: m.character_id,
          name: c?.name ?? "—",
          character_class: c?.character_class ?? null,
          class_subclass: c?.class_subclass ?? null,
          level: typeof c?.level === "number" && c.level > 0 ? c.level : 1,
          armor_class: c?.armor_class ?? null,
          hit_points: c?.hit_points ?? null,
          image_url: c?.image_url ?? null,
          rules_snapshot: (c?.rules_snapshot ?? null) as import("@/types/database.types").Json | null,
        };
      }),
  }));

  const matches: TorneoMatchWithTeams[] = matchesRaw.map((row) => mapTorneoMatchRow(row, teamById));

  return { teams, matches };
}
