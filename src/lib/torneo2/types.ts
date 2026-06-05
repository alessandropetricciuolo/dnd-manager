import type { Json } from "@/types/database.types";
import type { Torneo2CombatState } from "@/lib/torneo2/combat-state";
import type { Torneo2TimerMode } from "@/lib/torneo2/timer";

export type Torneo2MatchStatus = "pending" | "active" | "completed";
export type Torneo2MatchKind = "team" | "final_ffa";

export type Torneo2TeamMember = {
  id: string;
  characterId: string;
  name: string;
  characterClass: string | null;
  classSubclass: string | null;
  level: number;
  armorClass: number | null;
  hitPoints: number | null;
  imageUrl: string | null;
  rulesSnapshot: Json | null;
};

export type Torneo2Team = {
  id: string;
  campaignId: string;
  name: string;
  color: string;
  sortOrder: number;
  members: Torneo2TeamMember[];
};

export type Torneo2Participant = {
  id: string;
  side: "a" | "b" | "ffa";
  teamId: string | null;
  characterId: string | null;
  sortOrder: number;
};

export type Torneo2Match = {
  id: string;
  campaignId: string;
  label: string | null;
  sortOrder: number;
  kind: Torneo2MatchKind;
  status: Torneo2MatchStatus;
  teamAId: string | null;
  teamBId: string | null;
  timerMode: Torneo2TimerMode;
  turnSeconds: number;
  matchSeconds: number | null;
  timerRunning: boolean;
  timerStartedAt: string | null;
  timerPausedElapsedMs: number;
  timerLabel: string | null;
  combatState: Torneo2CombatState | null;
  combatSeq: number;
  combatOrigin: string | null;
  combatUpdatedAt: string | null;
  winnerTeamId: string | null;
  winnerCharacterId: string | null;
  completedAt: string | null;
  notes: string | null;
  // Bracket / tabellone
  bracketRound: number | null;
  bracketPosition: number;
  roundLabel: string | null;
  feedsMatchId: string | null;
  feedsSlot: "a" | "b" | null;
};

export type Torneo2LiveSession = {
  id: string;
  publicId: string;
  campaignId: string;
  status: "live" | "ended";
  station1MatchId: string | null;
  station2MatchId: string | null;
  remoteSessionPublicId: string | null;
  startedAt: string;
  endedAt: string | null;
};

export type Torneo2LiveSessionStarted = Torneo2LiveSession & {
  remotePlainToken: string;
  remoteExpiresAt: string;
};

export type Torneo2Setup = {
  teams: Torneo2Team[];
  matches: Torneo2Match[];
  participantsByMatch: Record<string, Torneo2Participant[]>;
};

export const TORNEO2_TEAM_COLORS = [
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
] as const;
