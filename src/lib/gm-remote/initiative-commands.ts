import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";
import { normalizeCombatConditions, type CombatConditionId } from "@/lib/combat-conditions";
import {
  applyCombatHpMutation,
  computeEffectiveArmorClass,
  normalizeActiveConcentration,
  normalizeCombatEffectInstance,
} from "@/lib/fight-mode/state-transitions";
import type { ActiveConcentration, CombatEffectInstance } from "@/lib/fight-mode/types";
import { initiativeStateSyncSignature } from "@/lib/fight-mode/state-transitions";
import { validateCombatCommandProposal } from "@/lib/fight-mode/combat-command-proposal-schema";
import type { RemoteCombatCommandSnapshot } from "@/lib/gm-remote/combat-command-remote";

export const GM_REMOTE_INITIATIVE_TYPES = [
  "initiative.next_turn",
  "initiative.prev_turn",
  "initiative.toggle_timer",
  "initiative.reset_turn_timer",
  "initiative.reset_round",
  "initiative.adjust_damage",
  "initiative.adjust_damage_taken",
  "initiative.set_hp",
  "initiative.adjust_hp",
  "initiative.set_conditions",
  "initiative.toggle_condition",
  "initiative.add_combatant",
  "initiative.remove_combatant",
] as const;

export type GmRemoteInitiativeCommandType = (typeof GM_REMOTE_INITIATIVE_TYPES)[number];

export function isInitiativeRemoteType(type: string): type is GmRemoteInitiativeCommandType {
  return (GM_REMOTE_INITIATIVE_TYPES as readonly string[]).includes(type);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Snapshot leggero per il telecomando (solo lettura). */
export type InitiativeRemoteSnapshot = {
  sessionId?: string | null;
  sessionTitle?: string | null;
  /** Incontro torneo attivo (sync telecomando / multi-PC). */
  matchId?: string;
  entries: Array<{
    id: string;
    name: string;
    type: "pc" | "monster" | "custom";
    hp: number;
    maxHp: number;
    tempHp?: number;
    damageDealt: number;
    damageTaken: number;
    initiative: number;
    ac?: number;
    effectiveAc?: number;
    conditions?: CombatConditionId[];
    activeEffects?: CombatEffectInstance[];
    activeConcentration?: ActiveConcentration | null;
    isDead?: boolean;
    teamId?: string;
    teamName?: string;
    teamColor?: string;
    spellSlotsRemaining?: Array<{ level: number; count: number }>;
  }>;
  pendingConcentrationChecksCount?: number;
  activeMatch?: {
    teamA: { id: string; name: string; color: string; damageTotal: number };
    teamB: { id: string; name: string; color: string; damageTotal: number };
  } | null;
  currentTurnIndex: number;
  roundNumber: number;
  turnElapsedSeconds: number;
  isTurnTimerRunning: boolean;
  updatedAt: string;
  stateSignature: string;
  combatCommand?: RemoteCombatCommandSnapshot | null;
};

export function toInitiativeRemoteSnapshot(
  state: InitiativeTrackerState,
  activeMatch?: InitiativeRemoteSnapshot["activeMatch"],
  matchId?: string,
  sessionId?: string | null,
  sessionTitle?: string | null,
  combatCommand?: RemoteCombatCommandSnapshot | null
): InitiativeRemoteSnapshot {
  const entries = state.entries.map((e) => {
    const acCalc = computeEffectiveArmorClass(e.armorClass, e.activeEffects);
    return {
      id: e.id,
      name: e.name,
      type: e.type,
      hp: e.hp,
      maxHp: e.maxHp,
      ...(typeof e.tempHp === "number" && e.tempHp > 0 ? { tempHp: e.tempHp } : {}),
      damageDealt: e.damageDealt ?? 0,
      damageTaken: e.damageTaken ?? 0,
      initiative: e.initiative,
      ac: e.armorClass,
      ...(acCalc.effectiveAc !== e.armorClass ? { effectiveAc: acCalc.effectiveAc } : {}),
      conditions: normalizeCombatConditions(e.conditions),
      ...(e.activeEffects?.length ? { activeEffects: e.activeEffects } : {}),
      ...(e.activeConcentration ? { activeConcentration: e.activeConcentration } : {}),
      isDead: e.isDead,
      ...(e.teamId ? { teamId: e.teamId, teamName: e.teamName, teamColor: e.teamColor } : {}),
      ...(e.spellSlots?.remaining?.length
        ? { spellSlotsRemaining: e.spellSlots.remaining }
        : {}),
    };
  });

  let matchSummary = activeMatch ?? null;
  if (!matchSummary && entries.some((e) => e.teamId)) {
    const byTeam = new Map<string, { name: string; color: string; total: number }>();
    for (const e of entries) {
      if (!e.teamId) continue;
      const cur = byTeam.get(e.teamId) ?? {
        name: e.teamName ?? "Squadra",
        color: e.teamColor ?? "#f59e0b",
        total: 0,
      };
      cur.total += e.damageDealt;
      byTeam.set(e.teamId, cur);
    }
    const teams = [...byTeam.entries()];
    if (teams.length >= 2) {
      matchSummary = {
        teamA: {
          id: teams[0]![0],
          name: teams[0]![1].name,
          color: teams[0]![1].color,
          damageTotal: teams[0]![1].total,
        },
        teamB: {
          id: teams[1]![0],
          name: teams[1]![1].name,
          color: teams[1]![1].color,
          damageTotal: teams[1]![1].total,
        },
      };
    }
  }

  return {
    ...(sessionId !== undefined ? { sessionId } : {}),
    ...(sessionTitle !== undefined ? { sessionTitle } : {}),
    ...(matchId ? { matchId } : {}),
    entries,
    ...(state.pendingConcentrationChecks?.length
      ? { pendingConcentrationChecksCount: state.pendingConcentrationChecks.length }
      : {}),
    activeMatch: matchSummary,
    currentTurnIndex: state.currentTurnIndex,
    roundNumber: state.roundNumber,
    turnElapsedSeconds: state.turnElapsedSeconds,
    isTurnTimerRunning: state.isTurnTimerRunning,
    updatedAt: new Date().toISOString(),
    stateSignature: initiativeStateSyncSignature(state),
    ...(combatCommand !== undefined ? { combatCommand } : {}),
  };
}

/** Stable content identity for publication: heartbeat timestamps must not count as edits. */
export function initiativeRemoteSnapshotSignature(snapshot: InitiativeRemoteSnapshot): string {
  const { updatedAt: _updatedAt, combatCommand: _combatCommand, ...content } = snapshot;
  return JSON.stringify(content);
}

function parseRemoteCombatCommandSnapshot(raw: unknown): RemoteCombatCommandSnapshot | null {
  if (!isRecord(raw)) return null;
  const { requestId, proposalId, status, campaignId, remoteSessionPublicId, sessionId, matchId, stateSignature } = raw;
  if (typeof requestId !== "string" || !requestId || typeof campaignId !== "string" || !campaignId ||
    typeof remoteSessionPublicId !== "string" || !remoteSessionPublicId || typeof sessionId !== "string" || !sessionId ||
    (matchId !== null && typeof matchId !== "string") || typeof stateSignature !== "string" || !stateSignature ||
    (status !== "awaiting" && status !== "proposal" && status !== "applied" && status !== "rejected")) return null;
  const proposal = raw.proposal;
  if (proposal !== undefined && !validateCombatCommandProposal(proposal)) return null;
  if (status === "proposal" && (typeof proposalId !== "string" || !proposal || !validateCombatCommandProposal(proposal))) return null;
  const receiptRaw = raw.receipt;
  const receipt = isRecord(receiptRaw) && typeof receiptRaw.appliedAt === "string" && typeof receiptRaw.stateSignature === "string"
    ? { appliedAt: receiptRaw.appliedAt, stateSignature: receiptRaw.stateSignature }
    : undefined;
  return {
    requestId,
    ...(typeof proposalId === "string" ? { proposalId } : {}),
    status,
    campaignId,
    remoteSessionPublicId,
    sessionId,
    matchId: matchId as string | null,
    stateSignature,
    ...(typeof raw.message === "string" ? { message: raw.message.slice(0, 1000) } : {}),
    ...(typeof raw.rawInput === "string" ? { rawInput: raw.rawInput.slice(0, 2000) } : {}),
    ...(proposal ? { proposal: proposal as RemoteCombatCommandSnapshot["proposal"] } : {}),
    ...(receipt ? { receipt } : {}),
  };
}

export function parseInitiativeRemoteSnapshot(raw: unknown): InitiativeRemoteSnapshot | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.entries)) return null;
  const entries = o.entries
    .map((row) => {
      if (typeof row !== "object" || row === null) return null;
      const r = row as Record<string, unknown>;
      const id = typeof r.id === "string" ? r.id : "";
      const name = typeof r.name === "string" ? r.name : "";
      const typeRaw = r.type;
      if (!id || !name || (typeRaw !== "pc" && typeRaw !== "monster" && typeRaw !== "custom")) return null;
      const type = typeRaw as "pc" | "monster" | "custom";
      const activeEffects = Array.isArray(r.activeEffects)
        ? r.activeEffects
            .map((eff) => normalizeCombatEffectInstance(eff, id))
            .filter((eff): eff is CombatEffectInstance => eff !== null)
        : undefined;
      const activeConcentration = normalizeActiveConcentration(r.activeConcentration, id);
      const tempHp =
        typeof r.tempHp === "number" && Number.isFinite(r.tempHp) && r.tempHp > 0
          ? Math.trunc(r.tempHp)
          : undefined;
      return {
        id,
        name,
        type,
        hp: typeof r.hp === "number" ? r.hp : 0,
        maxHp: typeof r.maxHp === "number" ? r.maxHp : 0,
        ...(tempHp ? { tempHp } : {}),
        damageDealt: typeof r.damageDealt === "number" ? Math.max(0, r.damageDealt) : 0,
        damageTaken: typeof r.damageTaken === "number" ? Math.max(0, r.damageTaken) : 0,
        initiative: typeof r.initiative === "number" ? r.initiative : 0,
        ac: typeof r.ac === "number" && Number.isFinite(r.ac) ? r.ac : undefined,
        ...(typeof r.effectiveAc === "number" && Number.isFinite(r.effectiveAc)
          ? { effectiveAc: r.effectiveAc }
          : {}),
        conditions: normalizeCombatConditions(r.conditions),
        ...(activeEffects?.length ? { activeEffects } : {}),
        ...(activeConcentration ? { activeConcentration } : {}),
        isDead: r.isDead === true,
        ...(typeof r.teamId === "string" && r.teamId
          ? {
              teamId: r.teamId,
              teamName: typeof r.teamName === "string" ? r.teamName : undefined,
              teamColor: typeof r.teamColor === "string" ? r.teamColor : undefined,
            }
          : {}),
      };
    })
    .filter((e): e is NonNullable<typeof e> => e != null);

  let activeMatch: InitiativeRemoteSnapshot["activeMatch"] = null;
  if (isRecord(o.activeMatch)) {
    const am = o.activeMatch;
    const parseSide = (key: "teamA" | "teamB") => {
      const side = am[key];
      if (!isRecord(side)) return null;
      const id = typeof side.id === "string" ? side.id : "";
      const name = typeof side.name === "string" ? side.name : "";
      if (!id || !name) return null;
      return {
        id,
        name,
        color: typeof side.color === "string" ? side.color : "#f59e0b",
        damageTotal: typeof side.damageTotal === "number" ? Math.max(0, side.damageTotal) : 0,
      };
    };
    const teamA = parseSide("teamA");
    const teamB = parseSide("teamB");
    if (teamA && teamB) activeMatch = { teamA, teamB };
  }

  const matchId = typeof o.matchId === "string" && o.matchId.trim() ? o.matchId.trim() : undefined;
  const sessionId = typeof o.sessionId === "string" && o.sessionId.trim() ? o.sessionId.trim() : null;
  const sessionTitle = typeof o.sessionTitle === "string" && o.sessionTitle.trim() ? o.sessionTitle.trim() : null;
  const stateSignature = typeof o.stateSignature === "string" && o.stateSignature.length <= 20_000 ? o.stateSignature : "";
  const combatCommand = o.combatCommand === null || o.combatCommand === undefined
    ? null
    : parseRemoteCombatCommandSnapshot(o.combatCommand);
  if ((o.stateSignature !== undefined && !stateSignature) || (o.combatCommand != null && !combatCommand)) return null;
  const pendingConcentrationChecksCount =
    typeof o.pendingConcentrationChecksCount === "number" &&
    Number.isFinite(o.pendingConcentrationChecksCount) &&
    o.pendingConcentrationChecksCount > 0
      ? Math.trunc(o.pendingConcentrationChecksCount)
      : undefined;

  return {
    ...(Object.hasOwn(o, "sessionId") ? { sessionId } : {}),
    ...(Object.hasOwn(o, "sessionTitle") ? { sessionTitle } : {}),
    ...(matchId ? { matchId } : {}),
    entries,
    ...(pendingConcentrationChecksCount ? { pendingConcentrationChecksCount } : {}),
    activeMatch,
    currentTurnIndex: typeof o.currentTurnIndex === "number" ? o.currentTurnIndex : 0,
    roundNumber: typeof o.roundNumber === "number" ? Math.max(1, o.roundNumber) : 1,
    turnElapsedSeconds: typeof o.turnElapsedSeconds === "number" ? Math.max(0, o.turnElapsedSeconds) : 0,
    isTurnTimerRunning: o.isTurnTimerRunning === true,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
    stateSignature,
    ...(Object.hasOwn(o, "combatCommand") ? { combatCommand } : {}),
  };
}

export type InitiativeRemoteCommandHandlers = {
  nextTurn: () => void;
  prevTurn: () => void;
  toggleTurnTimer: () => void;
  resetTurnTimer: () => void;
  resetRound: () => void;
  adjustDamage: (entryId: string, delta: number) => void;
  adjustDamageTaken: (entryId: string, delta: number) => void;
  setHp: (entryId: string, hp: number) => void;
  adjustHp: (entryId: string, delta: number) => void;
  setConditions: (entryId: string, conditions: CombatConditionId[]) => void;
  toggleCondition: (entryId: string, condition: CombatConditionId) => void;
  toggleMobileConcentration?: (entryId: string) => void;
  addCombatant: (combatant: InitiativeRemoteCombatant) => void;
  removeCombatant: (entryId: string) => void;
};

export type InitiativeRemoteCombatant = {
  id: string;
  name: string;
  type: "monster" | "custom";
  hp: number;
  maxHp: number;
  initiative: number;
  ac: number;
  conditions?: CombatConditionId[];
};

function parseCombatant(value: unknown): InitiativeRemoteCombatant | null {
  if (!isRecord(value)) return null;
  const { id, name, type, hp, maxHp, initiative, ac } = value;
  if (
    typeof id !== "string" || !id.trim() || id.length > 80 ||
    typeof name !== "string" || !name.trim() || name.length > 100 ||
    (type !== "monster" && type !== "custom") ||
    ![hp, maxHp, initiative, ac].every((n) => typeof n === "number" && Number.isFinite(n))
  ) return null;
  if (Math.abs(hp as number) > 100_000 || Math.abs(maxHp as number) > 100_000 ||
      Math.abs(initiative as number) > 10_000 || Math.abs(ac as number) > 1_000) return null;
  return {
    id: id.trim(), name: name.trim(), type,
    hp: Math.max(0, Math.min(hp as number, maxHp as number)),
    maxHp: Math.max(0, maxHp as number),
    initiative: initiative as number,
    ac: ac as number,
    conditions: normalizeCombatConditions(value.conditions),
  };
}

export function isValidInitiativeRemotePayload(type: string, payload: Record<string, unknown>): boolean {
  const boundedEntryId = (value: unknown) => typeof value === "string" && value.trim().length > 0 && value.length <= 80;
  switch (type) {
    case "initiative.adjust_damage":
    case "initiative.adjust_damage_taken":
    case "initiative.adjust_hp":
      return boundedEntryId(payload.entry_id) && typeof payload.delta === "number" &&
        Number.isFinite(payload.delta) && Math.abs(payload.delta) <= 100_000;
    case "initiative.set_hp":
      return boundedEntryId(payload.entry_id) && typeof payload.hp === "number" &&
        Number.isFinite(payload.hp) && Math.abs(payload.hp) <= 100_000;
    case "initiative.set_conditions": {
      if (!boundedEntryId(payload.entry_id) || !Array.isArray(payload.conditions)) return false;
      const normalized = normalizeCombatConditions(payload.conditions);
      return normalized.length === payload.conditions.length && new Set(payload.conditions).size === payload.conditions.length;
    }
    case "initiative.toggle_condition":
      if (!boundedEntryId(payload.entry_id) || typeof payload.condition !== "string") return false;
      if (payload.condition === "concentrato") return true;
      return normalizeCombatConditions([payload.condition]).length === 1;
    case "initiative.add_combatant":
      return parseCombatant(payload.combatant) !== null;
    case "initiative.remove_combatant":
      return boundedEntryId(payload.entry_id);
    default:
      return true;
  }
}

export function applyInitiativeRemoteCommand(
  handlers: InitiativeRemoteCommandHandlers,
  type: string,
  payload: Record<string, unknown>
): boolean {
  if (!isInitiativeRemoteType(type)) return false;
  switch (type) {
    case "initiative.next_turn":
      handlers.nextTurn();
      return true;
    case "initiative.prev_turn":
      handlers.prevTurn();
      return true;
    case "initiative.toggle_timer":
      handlers.toggleTurnTimer();
      return true;
    case "initiative.reset_turn_timer":
      handlers.resetTurnTimer();
      return true;
    case "initiative.reset_round":
      handlers.resetRound();
      return true;
    case "initiative.adjust_damage": {
      const entryId = typeof payload.entry_id === "string" ? payload.entry_id : "";
      const delta = typeof payload.delta === "number" ? payload.delta : 0;
      if (!entryId || !Number.isFinite(delta) || delta === 0) return true;
      handlers.adjustDamage(entryId, Math.trunc(delta));
      return true;
    }
    case "initiative.adjust_damage_taken": {
      const entryId = typeof payload.entry_id === "string" ? payload.entry_id : "";
      const delta = typeof payload.delta === "number" ? payload.delta : 0;
      if (!entryId || !Number.isFinite(delta) || delta === 0) return true;
      handlers.adjustDamageTaken(entryId, Math.trunc(delta));
      return true;
    }
    case "initiative.set_hp": {
      const id = typeof payload.entry_id === "string" ? payload.entry_id : "";
      const hp = payload.hp;
      if (id && typeof hp === "number" && Number.isFinite(hp) && Math.abs(hp) <= 100_000) {
        handlers.setHp(id, hp);
      }
      return true;
    }
    case "initiative.adjust_hp": {
      const id = typeof payload.entry_id === "string" ? payload.entry_id : "";
      const delta = payload.delta;
      if (id && typeof delta === "number" && Number.isFinite(delta) && Math.abs(delta) <= 100_000) {
        handlers.adjustHp(id, Math.trunc(delta));
      }
      return true;
    }
    case "initiative.set_conditions": {
      const id = typeof payload.entry_id === "string" ? payload.entry_id : "";
      if (id && Array.isArray(payload.conditions)) {
        handlers.setConditions(id, normalizeCombatConditions(payload.conditions));
      }
      return true;
    }
    case "initiative.toggle_condition": {
      const id = typeof payload.entry_id === "string" ? payload.entry_id : "";
      if (id && payload.condition === "concentrato") {
        handlers.toggleMobileConcentration?.(id);
        return true;
      }
      const condition = normalizeCombatConditions([payload.condition])[0];
      if (id && condition) handlers.toggleCondition(id, condition);
      return true;
    }
    case "initiative.add_combatant": {
      const combatant = parseCombatant(payload.combatant);
      if (!combatant) return false;
      handlers.addCombatant(combatant);
      return true;
    }
    case "initiative.remove_combatant": {
      const id = typeof payload.entry_id === "string" ? payload.entry_id : "";
      if (!id || id.length > 80) return false;
      handlers.removeCombatant(id);
      return true;
    }
    default:
      return false;
  }
}

/**
 * Pure delta helper; callers apply it inside a functional update to avoid stale HP reads.
 * Delegates to applyCombatHpMutation so negative deltas (damage) consume tempHp and queue concentration checks.
 */
export function adjustInitiativeHp(
  state: InitiativeTrackerState,
  entryId: string,
  delta: number
): InitiativeTrackerState {
  const intDelta = Math.trunc(delta);
  if (intDelta === 0) return state;
  if (intDelta < 0) {
    return applyCombatHpMutation(state, {
      kind: "damage",
      targetId: entryId,
      amount: Math.abs(intDelta),
    });
  }
  return applyCombatHpMutation(state, {
    kind: "heal",
    targetId: entryId,
    amount: intDelta,
  });
}
