import {
  initiativeStateSyncSignature,
  sanitizeInitiativeTrackerState,
  type InitiativeTrackerState,
} from "@/components/gm/initiative-tracker";
import { parseTorneoInitiativeSnapshot } from "@/lib/torneo/initiative-snapshot";
import { torneoInitiativeStorageKey } from "@/lib/torneo/initiative";

export function torneoLiveDbInitiativeStorageKey(campaignId: string, matchId: string): string {
  return `torneo-live-db-${campaignId}-${matchId}`;
}

type InitiativeSource = {
  state: InitiativeTrackerState;
  updatedAt: string | null;
  priority: number;
};

/** Estrae il totale turni dal label timer (es. "Turno 1 · 3/6" → 6). */
export function parseEntryCountHintFromTimerLabel(label: string | null | undefined): number | null {
  const m = (label ?? "").match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  const total = Number.parseInt(m[2] ?? "", 10);
  return Number.isFinite(total) && total > 0 ? total : null;
}

export function initiativeMatchesMatchRoster(
  state: InitiativeTrackerState,
  rosterCharacterIds: string[]
): boolean {
  if (!rosterCharacterIds.length) return state.entries.length > 0;
  const roster = new Set(rosterCharacterIds);
  const pcs = state.entries.filter((e) => e.type === "pc" && e.playerId);
  if (!pcs.length) return state.entries.length > 0;
  return pcs.every((e) => roster.has(e.playerId!));
}

function readStorageKey(key: string): InitiativeTrackerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = sanitizeInitiativeTrackerState(JSON.parse(raw) as Partial<InitiativeTrackerState>);
    return parsed.entries.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function readLiveInitiativeFromBrowserStorage(
  campaignId: string,
  matchId: string
): InitiativeTrackerState | null {
  return readStorageKey(torneoLiveDbInitiativeStorageKey(campaignId, matchId));
}

/** Solo chiave legacy (non usare se esiste snapshot live più recente). */
export function readLegacyInitiativeFromBrowserStorage(
  campaignId: string,
  matchId: string
): InitiativeTrackerState | null {
  return readStorageKey(torneoInitiativeStorageKey(campaignId, matchId));
}

export function parseInitiativeSnapshotField(raw: unknown): InitiativeTrackerState | null {
  const parsed = parseTorneoInitiativeSnapshot(raw);
  if (!parsed?.entries.length) return null;
  return parsed;
}

function scoreInitiativeSource(
  source: InitiativeSource,
  rosterCharacterIds: string[],
  entryCountHint: number | null
): number {
  if (!initiativeMatchesMatchRoster(source.state, rosterCharacterIds)) return -1;

  let score = source.priority;
  const updatedMs = source.updatedAt ? Date.parse(source.updatedAt) : 0;
  if (Number.isFinite(updatedMs) && updatedMs > 0) score += updatedMs / 1_000_000_000_000;

  if (entryCountHint != null) {
    const diff = Math.abs(source.state.entries.length - entryCountHint);
    score += Math.max(0, 40 - diff * 20);
  }

  return score;
}

/** Sceglie lo snapshot initiative più affidabile tra DB e localStorage. */
export function pickInitiativeForMegatimer(
  sources: InitiativeSource[],
  rosterCharacterIds: string[],
  timerRoundLabel: string | null | undefined
): InitiativeTrackerState | null {
  const entryCountHint = parseEntryCountHintFromTimerLabel(timerRoundLabel);
  let best: InitiativeSource | null = null;
  let bestScore = -1;

  for (const source of sources) {
    const score = scoreInitiativeSource(source, rosterCharacterIds, entryCountHint);
    if (score > bestScore) {
      bestScore = score;
      best = source;
    }
  }

  return best?.state ?? null;
}

export function initiativeSyncSignature(state: InitiativeTrackerState | null): string {
  if (!state) return "";
  return initiativeStateSyncSignature(state);
}
