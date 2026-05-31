import type { TorneoMatchKind, TorneoMatchStatus, TorneoMatchWithTeams } from "@/lib/torneo/types";

const PLACEHOLDER_COLOR = "#a1a1aa";

export type TorneoMatchDbRow = {
  id: string;
  campaign_id: string;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_placeholder?: string | null;
  team_b_placeholder?: string | null;
  label: string | null;
  sort_order: number;
  status: string;
  match_kind: string | null;
  bracket_round: number | null;
  bracket_slot: number | null;
  advances_to_match_id: string | null;
  advances_to_slot: string | null;
  winner_team_id: string | null;
  winner_character_id?: string | null;
  team_a_damage_total: number;
  team_b_damage_total: number;
  completed_at: string | null;
  notes: string | null;
  initiative_updated_at?: string | null;
  timer_round_label?: string | null;
  timer_duration_sec?: number | null;
  timer_started_at?: string | null;
  timer_paused_at?: string | null;
};

type TeamRow = { id: string; name: string; color: string };

function mapTeamSide(
  teamId: string | null,
  placeholder: string | null | undefined,
  teamById: Map<string, TeamRow>
): TorneoMatchWithTeams["team_a"] {
  if (teamId) {
    const team = teamById.get(teamId);
    if (team) {
      return { id: team.id, name: team.name, color: team.color, isPlaceholder: false };
    }
  }
  return {
    id: teamId ?? "",
    name: placeholder?.trim() || "Da definire",
    color: PLACEHOLDER_COLOR,
    isPlaceholder: true,
  };
}

export function isTorneoMatchPlayable(row: {
  team_a_id: string | null;
  team_b_id: string | null;
  match_kind: TorneoMatchKind;
}): boolean {
  if (row.match_kind === "triello") return Boolean(row.team_a_id);
  return Boolean(row.team_a_id && row.team_b_id);
}

export function mapTorneoMatchRow(
  row: TorneoMatchDbRow,
  teamById: Map<string, TeamRow>
): TorneoMatchWithTeams {
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    team_a_id: row.team_a_id,
    team_b_id: row.team_b_id,
    team_a_placeholder: row.team_a_placeholder ?? null,
    team_b_placeholder: row.team_b_placeholder ?? null,
    label: row.label ?? null,
    sort_order: row.sort_order,
    status: row.status as TorneoMatchStatus,
    match_kind: (row.match_kind as TorneoMatchKind) ?? "bracket",
    bracket_round: row.bracket_round ?? null,
    bracket_slot: row.bracket_slot ?? null,
    advances_to_match_id: row.advances_to_match_id ?? null,
    advances_to_slot: (row.advances_to_slot as "a" | "b" | null) ?? null,
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
    team_a: mapTeamSide(row.team_a_id, row.team_a_placeholder, teamById),
    team_b: mapTeamSide(row.team_b_id, row.team_b_placeholder, teamById),
  };
}
