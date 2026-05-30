import {
  emptyInitiativeTrackerState,
  sanitizeInitiativeTrackerState,
  type InitiativeTrackerState,
} from "@/components/gm/initiative-tracker";

export function parseTorneoInitiativeSnapshot(raw: unknown): InitiativeTrackerState | null {
  if (raw == null) return null;
  try {
    const parsed = typeof raw === "string" ? (JSON.parse(raw) as unknown) : raw;
    if (typeof parsed !== "object" || parsed === null) return null;
    return sanitizeInitiativeTrackerState(parsed as Partial<InitiativeTrackerState>);
  } catch {
    return null;
  }
}

export function serializeTorneoInitiativeSnapshot(state: InitiativeTrackerState): Record<string, unknown> {
  return sanitizeInitiativeTrackerState(state) as unknown as Record<string, unknown>;
}

export function emptyTorneoInitiativeSnapshot(): InitiativeTrackerState {
  return emptyInitiativeTrackerState();
}
