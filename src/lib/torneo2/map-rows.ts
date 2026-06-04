import type { Json } from "@/types/database.types";
import { sanitizeTorneo2CombatState } from "@/lib/torneo2/combat-state";
import type {
  Torneo2LiveSession,
  Torneo2Match,
  Torneo2MatchKind,
  Torneo2MatchStatus,
  Torneo2Participant,
  Torneo2Team,
  Torneo2TeamMember,
} from "@/lib/torneo2/types";
import type { Torneo2TimerMode } from "@/lib/torneo2/timer";

export const TORNEO2_MATCH_SELECT =
  "id, campaign_id, label, sort_order, kind, status, team_a_id, team_b_id, timer_mode, turn_seconds, match_seconds, timer_running, timer_started_at, timer_paused_elapsed_ms, timer_label, combat_state, combat_seq, combat_origin, combat_updated_at, winner_team_id, winner_character_id, completed_at, notes";

export const TORNEO2_LIVE_SELECT =
  "id, public_id, campaign_id, status, station1_match_id, station2_match_id, remote_session_public_id, started_at, ended_at";

export type Torneo2MatchRow = {
  id: string;
  campaign_id: string;
  label: string | null;
  sort_order: number;
  kind: string;
  status: string;
  team_a_id: string | null;
  team_b_id: string | null;
  timer_mode: string;
  turn_seconds: number;
  match_seconds: number | null;
  timer_running: boolean;
  timer_started_at: string | null;
  timer_paused_elapsed_ms: number | string | null;
  timer_label: string | null;
  combat_state: unknown;
  combat_seq: number | string | null;
  combat_origin: string | null;
  combat_updated_at: string | null;
  winner_team_id: string | null;
  winner_character_id: string | null;
  completed_at: string | null;
  notes: string | null;
};

export function mapTorneo2MatchRow(row: Torneo2MatchRow): Torneo2Match {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    label: row.label,
    sortOrder: row.sort_order,
    kind: (row.kind as Torneo2MatchKind) ?? "team",
    status: (row.status as Torneo2MatchStatus) ?? "pending",
    teamAId: row.team_a_id,
    teamBId: row.team_b_id,
    timerMode: (row.timer_mode as Torneo2TimerMode) ?? "turn",
    turnSeconds: row.turn_seconds ?? 120,
    matchSeconds: row.match_seconds,
    timerRunning: row.timer_running ?? false,
    timerStartedAt: row.timer_started_at,
    timerPausedElapsedMs: Number(row.timer_paused_elapsed_ms ?? 0) || 0,
    timerLabel: row.timer_label,
    combatState: row.combat_state != null ? sanitizeTorneo2CombatState(row.combat_state) : null,
    combatSeq: Number(row.combat_seq ?? 0) || 0,
    combatOrigin: row.combat_origin,
    combatUpdatedAt: row.combat_updated_at,
    winnerTeamId: row.winner_team_id,
    winnerCharacterId: row.winner_character_id,
    completedAt: row.completed_at,
    notes: row.notes,
  };
}

type RawCharacter = {
  name: string;
  character_class: string | null;
  class_subclass: string | null;
  armor_class: number | null;
  hit_points: number | null;
  level: number | null;
  image_url: string | null;
  rules_snapshot: unknown;
};

export function mapTorneo2TeamMemberRow(row: {
  id: string;
  character_id: string;
  sort_order?: number | null;
  campaign_characters: unknown;
}): Torneo2TeamMember {
  const raw = row.campaign_characters as RawCharacter | RawCharacter[] | null;
  const c = Array.isArray(raw) ? raw[0] : raw;
  return {
    id: row.id,
    characterId: row.character_id,
    name: c?.name ?? "—",
    characterClass: c?.character_class ?? null,
    classSubclass: c?.class_subclass ?? null,
    level: typeof c?.level === "number" && c.level > 0 ? c.level : 1,
    armorClass: c?.armor_class ?? null,
    hitPoints: c?.hit_points ?? null,
    imageUrl: c?.image_url ?? null,
    rulesSnapshot: (c?.rules_snapshot ?? null) as Json | null,
  };
}

export function mapTorneo2ParticipantRow(row: {
  id: string;
  side: string;
  team_id: string | null;
  character_id: string | null;
  sort_order: number;
}): Torneo2Participant {
  const side = row.side === "a" || row.side === "b" ? row.side : "ffa";
  return {
    id: row.id,
    side,
    teamId: row.team_id,
    characterId: row.character_id,
    sortOrder: row.sort_order ?? 0,
  };
}

export function mapTorneo2TeamRow(
  row: { id: string; campaign_id: string; name: string; color: string; sort_order: number },
  members: Torneo2TeamMember[]
): Torneo2Team {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    members,
  };
}

export function mapTorneo2LiveRow(row: {
  id: string;
  public_id: string;
  campaign_id: string;
  status: string;
  station1_match_id: string | null;
  station2_match_id: string | null;
  remote_session_public_id: string | null;
  started_at: string;
  ended_at: string | null;
}): Torneo2LiveSession {
  return {
    id: row.id,
    publicId: row.public_id,
    campaignId: row.campaign_id,
    status: (row.status as "live" | "ended") ?? "ended",
    station1MatchId: row.station1_match_id,
    station2MatchId: row.station2_match_id,
    remoteSessionPublicId: row.remote_session_public_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
  };
}
