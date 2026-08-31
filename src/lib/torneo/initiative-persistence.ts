import {
  sanitizeInitiativeTrackerState,
  type InitiativeTrackerState,
} from "@/components/gm/initiative-tracker";

export function hasTorneoInitiativeEntries(
  state: InitiativeTrackerState | null | undefined
): state is InitiativeTrackerState {
  return (state?.entries.length ?? 0) > 0;
}

export function parseStoredTorneoInitiativeState(raw: string | null): InitiativeTrackerState | null {
  if (!raw) return null;
  try {
    return sanitizeInitiativeTrackerState(JSON.parse(raw) as Partial<InitiativeTrackerState>);
  } catch {
    return null;
  }
}

export function preferRestorableTorneoInitiativeState(
  remoteState: InitiativeTrackerState | null | undefined,
  storedRaw: string | null
): InitiativeTrackerState | null {
  if (hasTorneoInitiativeEntries(remoteState)) return remoteState;

  const storedState = parseStoredTorneoInitiativeState(storedRaw);
  if (hasTorneoInitiativeEntries(storedState)) return storedState;

  return null;
}
