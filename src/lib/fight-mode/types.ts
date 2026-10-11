import type { CombatSpellSlots } from "@/lib/combat-spell-slots";
import type { CombatConditionId } from "@/lib/combat-conditions";

export type SavingThrowsMap = {
  for: number;
  des: number;
  cos: number;
  int: number;
  sag: number;
  car: number;
};

export type CombatReaction = {
  name: string;
  trigger?: string;
  description?: string;
};

export type WeaponAttack = {
  name: string;
  toHit: string;
  damage: string;
  type: string;
};

export type DeathSaves = {
  success: number;
  fail: number;
};

/** Stato sintetico trasmesso al secondo monitor (zero PF visibili ai giocatori). */
export type FightProjectionState = {
  campaignId: string;
  roundNumber: number;
  turnElapsedSeconds: number;
  isTurnTimerRunning: boolean;
  activeCombatant: {
    id: string;
    name: string;
    type: "pc" | "monster" | "custom";
    characterClass?: string | null;
    portraitUrl?: string | null;
    conditions: CombatConditionId[];
    noteText?: string;
    usedReaction?: boolean;
  } | null;
  /** Coda dei prossimi 5 turni (On-Deck Queue) */
  upcomingTurns: Array<{
    id: string;
    name: string;
    type: "pc" | "monster" | "custom";
    characterClass?: string | null;
    portraitUrl?: string | null;
    conditions: CombatConditionId[];
    order: number;
  }>;
  updatedAt: number;
};
