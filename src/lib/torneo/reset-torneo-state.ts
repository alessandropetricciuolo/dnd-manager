import type { BracketSeedSlot } from "@/lib/torneo/bracket";
import type { TorneoMatchKind } from "@/lib/torneo/types";

export function bracketSlotKey(
  matchKind: TorneoMatchKind | string,
  bracketRound: number | null,
  bracketSlot: number | null
): string | null {
  if (bracketRound == null || bracketSlot == null) return null;
  return `${matchKind}:${bracketRound}:${bracketSlot}`;
}

export function planSlotsByKey(plan: BracketSeedSlot[]): Map<string, BracketSeedSlot> {
  const map = new Map<string, BracketSeedSlot>();
  for (const slot of plan) {
    const key = bracketSlotKey(slot.matchKind, slot.round, slot.slot);
    if (key) map.set(key, slot);
  }
  return map;
}

/** Campi azzerati su ogni incontro durante l'arresto totale. */
export function baseTorneoMatchResetPatch(): Record<string, unknown> {
  return {
    status: "pending",
    winner_team_id: null,
    winner_character_id: null,
    team_a_damage_total: 0,
    team_b_damage_total: 0,
    completed_at: null,
    notes: null,
    initiative_snapshot: null,
    initiative_updated_at: null,
    timer_round_label: null,
    timer_duration_sec: null,
    timer_started_at: null,
    timer_paused_at: null,
  };
}

export function bracketSlotResetPatch(slot: BracketSeedSlot): Record<string, unknown> {
  return {
    ...baseTorneoMatchResetPatch(),
    team_a_id: slot.teamAId,
    team_b_id: slot.teamBId,
    team_a_placeholder: slot.teamAPlaceholder,
    team_b_placeholder: slot.teamBPlaceholder,
  };
}
