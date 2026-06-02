import {
  sanitizeInitiativeTrackerState,
  type InitiativeTrackerState,
} from "@/components/gm/initiative-tracker";
import { parseTorneoInitiativeSnapshot } from "@/lib/torneo/initiative-snapshot";
import { torneoInitiativeStorageKey } from "@/lib/torneo/initiative";

export function torneoLiveDbInitiativeStorageKey(campaignId: string, matchId: string): string {
  return `torneo-live-db-${campaignId}-${matchId}`;
}

/** Chiavi localStorage usate dal GM screen / tracker torneo (stesso browser del megatimer). */
export function torneoInitiativeBrowserStorageKeys(campaignId: string, matchId: string): string[] {
  return [
    torneoLiveDbInitiativeStorageKey(campaignId, matchId),
    torneoInitiativeStorageKey(campaignId, matchId),
  ];
}

export function readInitiativeFromBrowserStorage(
  campaignId: string,
  matchId: string
): InitiativeTrackerState | null {
  if (typeof window === "undefined") return null;
  for (const key of torneoInitiativeBrowserStorageKeys(campaignId, matchId)) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = sanitizeInitiativeTrackerState(JSON.parse(raw) as Partial<InitiativeTrackerState>);
      if (parsed.entries.length > 0) return parsed;
    } catch {
      /* prova la chiave successiva */
    }
  }
  return null;
}

export function parseInitiativeSnapshotField(raw: unknown): InitiativeTrackerState | null {
  const parsed = parseTorneoInitiativeSnapshot(raw);
  if (!parsed?.entries.length) return null;
  return parsed;
}
