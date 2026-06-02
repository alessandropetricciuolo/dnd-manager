import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";

export const GM_REMOTE_INITIATIVE_TYPES = [
  "initiative.next_turn",
  "initiative.prev_turn",
  "initiative.toggle_timer",
  "initiative.reset_turn_timer",
  "initiative.reset_round",
  "initiative.adjust_damage",
  "initiative.adjust_damage_taken",
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
  /** Incontro torneo attivo (sync telecomando / multi-PC). */
  matchId?: string;
  entries: Array<{
    id: string;
    name: string;
    type: "pc" | "monster" | "custom";
    hp: number;
    maxHp: number;
    damageDealt: number;
    damageTaken: number;
    initiative: number;
    isDead?: boolean;
    teamId?: string;
    teamName?: string;
    teamColor?: string;
    spellSlotsRemaining?: Array<{ level: number; count: number }>;
  }>;
  activeMatch?: {
    teamA: { id: string; name: string; color: string; damageTotal: number };
    teamB: { id: string; name: string; color: string; damageTotal: number };
  } | null;
  currentTurnIndex: number;
  roundNumber: number;
  turnElapsedSeconds: number;
  isTurnTimerRunning: boolean;
  updatedAt: string;
};

export function toInitiativeRemoteSnapshot(
  state: InitiativeTrackerState,
  activeMatch?: InitiativeRemoteSnapshot["activeMatch"],
  matchId?: string
): InitiativeRemoteSnapshot {
  const entries = state.entries.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
    hp: e.hp,
    maxHp: e.maxHp,
    damageDealt: e.damageDealt ?? 0,
    damageTaken: e.damageTaken ?? 0,
    initiative: e.initiative,
    isDead: e.isDead,
    ...(e.teamId ? { teamId: e.teamId, teamName: e.teamName, teamColor: e.teamColor } : {}),
    ...(e.spellSlots?.remaining?.length
      ? { spellSlotsRemaining: e.spellSlots.remaining }
      : {}),
  }));

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
    ...(matchId ? { matchId } : {}),
    entries,
    activeMatch: matchSummary,
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
        damageTaken: typeof r.damageTaken === "number" ? Math.max(0, r.damageTaken) : 0,
        initiative: typeof r.initiative === "number" ? r.initiative : 0,
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

  return {
    ...(matchId ? { matchId } : {}),
    entries,
    activeMatch,
    currentTurnIndex: typeof o.currentTurnIndex === "number" ? o.currentTurnIndex : 0,
    roundNumber: typeof o.roundNumber === "number" ? Math.max(1, o.roundNumber) : 1,
    turnElapsedSeconds: typeof o.turnElapsedSeconds === "number" ? Math.max(0, o.turnElapsedSeconds) : 0,
    isTurnTimerRunning: o.isTurnTimerRunning === true,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : new Date().toISOString(),
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
    default:
      return false;
  }
}
