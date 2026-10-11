import { useEffect, useState } from "react";
import type { FightProjectionState } from "./types";

const CHANNEL_PREFIX = "bnd-fight-projection-";
const STORAGE_PREFIX = "bnd-fight-projection-storage-";

export function publishFightProjection(state: FightProjectionState): void {
  if (typeof window === "undefined") return;

  const channelName = `${CHANNEL_PREFIX}${state.campaignId}`;
  const storageKey = `${STORAGE_PREFIX}${state.campaignId}`;

  // 1. Invia via BroadcastChannel (comunicazione immediata tra tab/finestre aperte nello stesso browser)
  try {
    const channel = new BroadcastChannel(channelName);
    channel.postMessage(state);
    channel.close();
  } catch {
    // Ignore BroadcastChannel errors in unsupported contexts
  }

  // 2. Persisti in localStorage (per recupero immediato al caricamento della pagina e fallback)
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Ignore storage quota
  }
}

export function readFightProjection(campaignId: string): FightProjectionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${campaignId}`);
    if (!raw) return null;
    return JSON.parse(raw) as FightProjectionState;
  } catch {
    return null;
  }
}

export function useFightProjectionSync(campaignId: string): FightProjectionState | null {
  const [state, setState] = useState<FightProjectionState | null>(() => readFightProjection(campaignId));

  useEffect(() => {
    if (!campaignId) return;

    // Carica valore iniziale
    const initial = readFightProjection(campaignId);
    if (initial) setState(initial);

    const channelName = `${CHANNEL_PREFIX}${campaignId}`;
    const storageKey = `${STORAGE_PREFIX}${campaignId}`;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = (event) => {
        if (event.data && typeof event.data === "object") {
          setState(event.data as FightProjectionState);
        }
      };
    } catch {
      // BroadcastChannel not available
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey && event.newValue) {
        try {
          setState(JSON.parse(event.newValue) as FightProjectionState);
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener("storage", onStorage);
    };
  }, [campaignId]);

  return state;
}
