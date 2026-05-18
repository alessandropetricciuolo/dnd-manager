export type TorneoMatchStatus = "pending" | "active" | "completed";

export type TorneoTeamRow = {
  id: string;
  campaign_id: string;
  name: string;
  color: string;
  sort_order: number;
};

export type TorneoTeamMemberRow = {
  id: string;
  team_id: string;
  character_id: string;
};

export type TorneoTeamWithMembers = TorneoTeamRow & {
  members: Array<{
    id: string;
    character_id: string;
    name: string;
    character_class: string | null;
    armor_class: number | null;
    hit_points: number | null;
  }>;
};

export type TorneoMatchRow = {
  id: string;
  campaign_id: string;
  team_a_id: string;
  team_b_id: string;
  label: string | null;
  sort_order: number;
  status: TorneoMatchStatus;
  winner_team_id: string | null;
  team_a_damage_total: number;
  team_b_damage_total: number;
  completed_at: string | null;
  notes: string | null;
};

export type TorneoMatchWithTeams = TorneoMatchRow & {
  team_a: { id: string; name: string; color: string };
  team_b: { id: string; name: string; color: string };
  winner?: { id: string; name: string; color: string } | null;
};

export const TORNEO_TEAM_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
] as const;
