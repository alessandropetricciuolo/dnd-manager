"use client";

import { useEffect, useState, useCallback } from "react";

export type TurnTimerState = {
  isRunning: boolean;
  endsAt: number | null; // Date.now() + remainingSec * 1000 when running
  remainingSeconds: number; // remaining seconds when paused or at last calculation
  durationSeconds: number; // configured turn duration (e.g. 120s)
  lastUpdated: number;
};

const DEFAULT_DURATION = 120;
const STORAGE_PREFIX = "bnd-combat-turn-timer-";
const CHANNEL_PREFIX = "bnd-combat-turn-timer-ch-";

// In-memory cache per campaignId
const timerCache = new Map<string, TurnTimerState>();
const listeners = new Map<string, Set<() => void>>();

function getStorageKey(campaignId: string): string {
  return `${STORAGE_PREFIX}${campaignId}`;
}

function getChannelName(campaignId: string): string {
  return `${CHANNEL_PREFIX}${campaignId}`;
}

export function loadTurnTimerState(campaignId: string): TurnTimerState {
  if (!campaignId) {
    return {
      isRunning: false,
      endsAt: null,
      remainingSeconds: DEFAULT_DURATION,
      durationSeconds: DEFAULT_DURATION,
      lastUpdated: Date.now(),
    };
  }

  // Check in-memory cache first
  const cached = timerCache.get(campaignId);
  if (cached) {
    if (cached.isRunning && cached.endsAt) {
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((cached.endsAt - now) / 1000));
      return {
        ...cached,
        remainingSeconds: rem,
      };
    }
    return cached;
  }

  // Check localStorage
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(getStorageKey(campaignId));
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<TurnTimerState>;
        const duration =
          typeof parsed.durationSeconds === "number" && parsed.durationSeconds > 0
            ? parsed.durationSeconds
            : DEFAULT_DURATION;
        const isRunning = Boolean(parsed.isRunning);
        const endsAt = typeof parsed.endsAt === "number" ? parsed.endsAt : null;
        let rem =
          typeof parsed.remainingSeconds === "number" && parsed.remainingSeconds > 0
            ? parsed.remainingSeconds
            : duration;

        if (isRunning && endsAt) {
          const now = Date.now();
          rem = Math.max(0, Math.ceil((endsAt - now) / 1000));
        }

        const state: TurnTimerState = {
          isRunning,
          endsAt: isRunning ? endsAt : null,
          remainingSeconds: rem,
          durationSeconds: duration,
          lastUpdated: Date.now(),
        };
        timerCache.set(campaignId, state);
        return state;
      }
    } catch {
      // ignore
    }
  }

  // Default initial state
  const initial: TurnTimerState = {
    isRunning: false,
    endsAt: null,
    remainingSeconds: DEFAULT_DURATION,
    durationSeconds: DEFAULT_DURATION,
    lastUpdated: Date.now(),
  };
  timerCache.set(campaignId, initial);
  return initial;
}

export function saveTurnTimerState(campaignId: string, state: TurnTimerState): void {
  if (!campaignId) return;
  timerCache.set(campaignId, state);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(getStorageKey(campaignId), JSON.stringify(state));
    } catch {
      // ignore
    }

    try {
      const ch = new BroadcastChannel(getChannelName(campaignId));
      ch.postMessage(state);
      ch.close();
    } catch {
      // ignore
    }
  }

  // Notify listeners
  const set = listeners.get(campaignId);
  if (set) {
    set.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore
      }
    });
  }
}

export function startTurnTimer(campaignId: string): void {
  const current = loadTurnTimerState(campaignId);
  if (current.isRunning && current.endsAt && current.endsAt > Date.now()) return;

  const rem = current.remainingSeconds <= 0 ? current.durationSeconds : current.remainingSeconds;
  const endsAt = Date.now() + rem * 1000;
  saveTurnTimerState(campaignId, {
    ...current,
    isRunning: true,
    endsAt,
    remainingSeconds: rem,
    lastUpdated: Date.now(),
  });
}

export function pauseTurnTimer(campaignId: string): void {
  const current = loadTurnTimerState(campaignId);
  if (!current.isRunning) return;

  const now = Date.now();
  const rem = current.endsAt
    ? Math.max(0, Math.ceil((current.endsAt - now) / 1000))
    : current.remainingSeconds;

  saveTurnTimerState(campaignId, {
    ...current,
    isRunning: false,
    endsAt: null,
    remainingSeconds: rem,
    lastUpdated: now,
  });
}

export function toggleTurnTimer(campaignId: string): void {
  const current = loadTurnTimerState(campaignId);
  if (current.isRunning) {
    pauseTurnTimer(campaignId);
  } else {
    startTurnTimer(campaignId);
  }
}

export function resetTurnTimer(campaignId: string, autoStart = false): void {
  const current = loadTurnTimerState(campaignId);
  const duration = current.durationSeconds;

  if (autoStart || current.isRunning) {
    const endsAt = Date.now() + duration * 1000;
    saveTurnTimerState(campaignId, {
      ...current,
      isRunning: true,
      endsAt,
      remainingSeconds: duration,
      lastUpdated: Date.now(),
    });
  } else {
    saveTurnTimerState(campaignId, {
      ...current,
      isRunning: false,
      endsAt: null,
      remainingSeconds: duration,
      lastUpdated: Date.now(),
    });
  }
}

export function setTurnTimerDuration(campaignId: string, durationSec: number): void {
  const current = loadTurnTimerState(campaignId);
  const valid = Math.max(10, Math.min(1800, durationSec));
  const wasAtMax =
    current.remainingSeconds === current.durationSeconds || current.remainingSeconds === 0;

  let newRemaining = current.remainingSeconds;
  let newEndsAt = current.endsAt;

  if (current.isRunning) {
    newRemaining = valid;
    newEndsAt = Date.now() + valid * 1000;
  } else if (wasAtMax) {
    newRemaining = valid;
  }

  saveTurnTimerState(campaignId, {
    ...current,
    durationSeconds: valid,
    remainingSeconds: newRemaining,
    endsAt: current.isRunning ? newEndsAt : null,
    lastUpdated: Date.now(),
  });
}

/**
 * Hook reattivo per sincronizzare il countdown del turno del combattimento.
 * Garantisce che una volta avviato il countdown, NIENTE nel GM screen (cambio vista, modali, unmount)
 * possa fermarlo se non il tasto pausa esplicito.
 */
export function useTurnTimer(campaignId?: string | null) {
  const [timerState, setTimerState] = useState<TurnTimerState>(() =>
    loadTurnTimerState(campaignId ?? "")
  );

  useEffect(() => {
    if (!campaignId) return;

    // Carica stato corrente
    setTimerState(loadTurnTimerState(campaignId));

    const onUpdate = () => {
      setTimerState(loadTurnTimerState(campaignId));
    };

    if (!listeners.has(campaignId)) {
      listeners.set(campaignId, new Set());
    }
    listeners.get(campaignId)!.add(onUpdate);

    // Ascolta eventi storage per sincronizzazione tra finestre/tab
    const onStorage = (e: StorageEvent) => {
      if (e.key === getStorageKey(campaignId)) {
        onUpdate();
      }
    };
    window.addEventListener("storage", onStorage);

    // Ascolta BroadcastChannel
    let ch: BroadcastChannel | null = null;
    try {
      ch = new BroadcastChannel(getChannelName(campaignId));
      ch.onmessage = (event) => {
        if (event.data && typeof event.data === "object") {
          timerCache.set(campaignId, event.data as TurnTimerState);
          onUpdate();
        }
      };
    } catch {
      // ignore
    }

    return () => {
      listeners.get(campaignId)?.delete(onUpdate);
      window.removeEventListener("storage", onStorage);
      if (ch) ch.close();
    };
  }, [campaignId]);

  // Tick costante ad alta precisione durante l'esecuzione
  useEffect(() => {
    if (!campaignId || !timerState.isRunning || !timerState.endsAt) return;

    const intervalId = window.setInterval(() => {
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((timerState.endsAt! - now) / 1000));
      setTimerState((prev) => {
        if (prev.remainingSeconds === rem) return prev;
        return { ...prev, remainingSeconds: rem };
      });
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [campaignId, timerState.isRunning, timerState.endsAt]);

  const start = useCallback(() => {
    if (campaignId) startTurnTimer(campaignId);
  }, [campaignId]);

  const pause = useCallback(() => {
    if (campaignId) pauseTurnTimer(campaignId);
  }, [campaignId]);

  const toggle = useCallback(() => {
    if (campaignId) toggleTurnTimer(campaignId);
  }, [campaignId]);

  const reset = useCallback(
    (autoStart = false) => {
      if (campaignId) resetTurnTimer(campaignId, autoStart);
    },
    [campaignId]
  );

  const setDuration = useCallback(
    (durationSec: number) => {
      if (campaignId) setTurnTimerDuration(campaignId, durationSec);
    },
    [campaignId]
  );

  return {
    isRunning: timerState.isRunning,
    remainingSeconds: timerState.remainingSeconds,
    durationSeconds: timerState.durationSeconds,
    start,
    pause,
    toggle,
    reset,
    setDuration,
  };
}
