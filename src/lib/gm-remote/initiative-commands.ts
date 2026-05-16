import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";

export const GM_REMOTE_INITIATIVE_TYPES = [
  "initiative.next_turn",
  "initiative.toggle_timer",
  "initiative.reset_turn_timer",
  "initiative.reset_round",
  "initiative.adjust_damage",
] as const;

export type GmRemoteInitiativeCommandType = (typeof GM_REMOTE_INITIATIVE_TYPES)[number];

export function isInitiativeRemoteType(type: string): type is GmRemoteInitiativeCommandType {
  return (GM_REMOTE_INITIATIVE_TYPES as readonly string[]).includes(type);
}

/** Snapshot leggero per il telecomando (solo lettura). */
export type InitiativeRemoteSnapshot = {
  entries: Array<{
    id: string;
    name: string;
    type: "pc" | "monster" | "custom";
    hp: number;
    maxHp: number;
    damageDealt: number;
    initiative: number;
    isDead?: boolean;
  }>;
  currentTurnIndex: number;
  roundNumber: number;
  turnElapsedSeconds: number;
  isTurnTimerRunning: boolean;
  updatedAt: string;
};

export function toInitiativeRemoteSnapshot(state: InitiativeTrackerState): InitiativeRemoteSnapshot {
  return {
    entries: state.entries.map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      hp: e.hp,
      maxHp: e.maxHp,
      damageDealt: e.damageDealt ?? 0,
      initiative: e.initiative,
      isDead: e.isDead,
    })),
    currentTurnIndex: state.currentTurnIndex,
    roundNumber: state.roundNumber,
    turnElapsedSeconds: state.turnElapsedSeconds,
    isTurnTimerRunning: state.isTurnTimerRunning,
    updatedAt: new Date().toISOString(),
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
      return {
        id,
        name,
        type,
        hp: typeof r.hp === "number" ? r.hp : 0,
        maxHp: typeof r.maxHp === "number" ? r.maxHp : 0,
        damageDealt: typeof r.damageDealt === "number" ? Math.max(0, r.damageDealt) : 0,
        initiative: typeof r.initiative === "number" ? r.initiative : 0,
        isDead: r.isDead === true,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e != null);

  return {
    entries,
    currentTurnIndex: typeof o.currentTurnIndex === "number" ? o.currentTurnIndex : 0,
    roundNumber: typeof o.roundNumber === "number" ? Math.max(1, o.roundNumber) : 1,
    turnElapsedSeconds: typeof o.turnElapsedSeconds === "number" ? Math.max(0, o.turnElapsedSeconds) : 0,
    isTurnTimerRunning: o.isTurnTimerRunning === true,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
  };
}

export type InitiativeRemoteCommandHandlers = {
  nextTurn: () => void;
  toggleTurnTimer: () => void;
  resetTurnTimer: () => void;
  resetRound: () => void;
  adjustDamage: (entryId: string, delta: number) => void;
};

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
    default:
      return false;
  }
}
