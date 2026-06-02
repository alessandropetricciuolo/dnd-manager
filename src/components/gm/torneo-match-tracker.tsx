"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  InitiativeTracker,
  emptyInitiativeTrackerState,
  initiativeStatesSyncEqual,
  sanitizeInitiativeTrackerState,
  type InitiativeTrackerHandle,
  type InitiativeTrackerState,
} from "@/components/gm/initiative-tracker";
import { useTorneoMatchInitiativeSync } from "@/hooks/use-torneo-match-initiative-sync";
import { useTorneoMatchTimerSync } from "@/hooks/use-torneo-match-timer-sync";
import { saveTorneoMatchInitiativeAction } from "@/app/campaigns/torneo-live-actions";
import {
  buildMatchInitiativeState,
  torneoInitiativeStorageKey,
} from "@/lib/torneo/initiative";
import { torneoLiveDbInitiativeStorageKey } from "@/lib/torneo/megatimer-initiative";
import type { TorneoTeamWithMembers } from "@/lib/torneo/types";
import { computeMatchDamageTotals } from "@/lib/torneo/compute-match-damage";
import type { TorneoCharacterTeamInfo } from "@/lib/torneo/initiative";
import type { TorneoMatchWithTeams } from "@/lib/torneo/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2, Monitor, Play, Square } from "lucide-react";
import { torneoLiveTimerUrl } from "@/lib/torneo/live-links";

type Props = {
  campaignId: string;
  match: TorneoMatchWithTeams | null;
  liveSyncEnabled: boolean;
  /** Sessione live: link megatimer dedicato per questo tavolo. */
  livePublicId?: string | null;
  stationNumber?: 1 | 2;
  characterTeamMap: Record<string, TorneoCharacterTeamInfo>;
  stationLabel?: string;
  className?: string;
  onStateChange?: (state: InitiativeTrackerState) => void;
  initiativeHandleRef?: React.RefObject<InitiativeTrackerHandle>;
  /** Stato del tavolo gestito dal GM screen (evita sovrascrittura con snapshot vuoto). */
  syncState?: InitiativeTrackerState;
  teams?: TorneoTeamWithMembers[];
  /** Avvia incontro (stato active + timer live) dopo il caricamento dalla sidebar. */
  onStartEncounter?: () => void | Promise<void>;
  /** Termina incontro attivo (ferma megatimer, stato pending). */
  onEndEncounter?: () => void | Promise<void>;
};

export function TorneoMatchTracker({
  campaignId,
  match,
  liveSyncEnabled,
  livePublicId = null,
  stationNumber,
  characterTeamMap,
  stationLabel,
  className,
  onStateChange,
  initiativeHandleRef,
  syncState,
  teams = [],
  onStartEncounter,
  onEndEncounter,
}: Props) {
  const [startingEncounter, setStartingEncounter] = useState(false);
  const [endingEncounter, setEndingEncounter] = useState(false);
  const isControlled = syncState !== undefined;
  const [internalState, setInternalState] = useState<InitiativeTrackerState>(emptyInitiativeTrackerState());
  const state = isControlled ? syncState : internalState;
  const matchId = match?.id ?? null;
  const seededMatchRef = useRef<string | null>(null);

  const applyState = useCallback(
    (next: InitiativeTrackerState) => {
      if (!isControlled) setInternalState(next);
      onStateChange?.(next);
    },
    [isControlled, onStateChange]
  );

  const onStateFromRemote = useCallback(
    (next: InitiativeTrackerState) => {
      applyState(next);
    },
    [applyState]
  );

  const { loadInitial } = useTorneoMatchInitiativeSync({
    campaignId,
    matchId,
    liveSyncEnabled,
    state,
    ignoreEmptyRemoteOverwrite: isControlled,
    onStateFromRemote: (next) => {
      if (isControlled && next.entries.length === 0) return;
      if (isControlled && initiativeStatesSyncEqual(state, next)) return;
      onStateFromRemote(next);
    },
  });

  const megatimerSync = useTorneoMatchTimerSync({
    campaignId,
    matchId,
    enabled: liveSyncEnabled && match?.status === "active",
    roundNumber: state.roundNumber,
    currentTurnIndex: state.currentTurnIndex,
    entryCount: state.entries.length,
  });

  const torneoMegatimer =
    megatimerSync.enabled && match?.status === "active"
      ? {
          enabled: true,
          remainingSec: megatimerSync.view.remainingSec,
          roundLabel: megatimerSync.view.roundLabel,
          isRunning: megatimerSync.view.isRunning,
          isPaused: megatimerSync.view.isPaused,
          isExpired: megatimerSync.view.isExpired,
          onTogglePause: megatimerSync.togglePause,
          onRestartTurn: megatimerSync.restartCurrentTurn,
        }
      : null;

  useEffect(() => {
    seededMatchRef.current = null;
  }, [matchId]);

  const seedFromTeams = useCallback(
    (targetMatch: TorneoMatchWithTeams) => {
      if (teams.length === 0) return null;
      const seeded = buildMatchInitiativeState(targetMatch, teams);
      if (seeded.entries.length === 0) return null;
      return seeded;
    },
    [teams]
  );

  useEffect(() => {
    if (!matchId || !match || !isControlled) return;
    if (state.entries.length > 0) {
      seededMatchRef.current = matchId;
      return;
    }
    if (seededMatchRef.current === matchId) return;
    const seeded = seedFromTeams(match);
    if (!seeded) return;
    seededMatchRef.current = matchId;
    onStateChange?.(seeded);
    void persistTorneoMatchInitiative(campaignId, matchId, seeded, liveSyncEnabled);
  }, [
    campaignId,
    isControlled,
    liveSyncEnabled,
    match,
    matchId,
    onStateChange,
    seedFromTeams,
    state.entries.length,
  ]);

  useEffect(() => {
    if (!matchId) {
      if (!isControlled) applyState(emptyInitiativeTrackerState());
      return;
    }

    if (isControlled) return;

    let cancelled = false;
    void (async () => {
      let loaded: InitiativeTrackerState | null = null;

      if (liveSyncEnabled) {
        loaded = await loadInitial();
        if (cancelled) return;
      }

      if (!loaded?.entries.length) {
        try {
          const raw = localStorage.getItem(torneoInitiativeStorageKey(campaignId, matchId));
          if (raw) {
            loaded = sanitizeInitiativeTrackerState(JSON.parse(raw) as Partial<InitiativeTrackerState>);
          }
        } catch {
          /* ignore */
        }
      }

      if (!loaded?.entries.length && match && teams.length > 0) {
        const seeded = buildMatchInitiativeState(match, teams);
        if (seeded.entries.length > 0) {
          loaded = seeded;
          if (liveSyncEnabled) {
            await saveTorneoMatchInitiativeAction(campaignId, matchId, seeded);
          }
          try {
            localStorage.setItem(torneoInitiativeStorageKey(campaignId, matchId), JSON.stringify(seeded));
          } catch {
            /* ignore */
          }
        }
      }

      if (cancelled || !loaded) return;
      applyState(loaded);
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, matchId, liveSyncEnabled, loadInitial, isControlled, match, teams, applyState]);

  const handleChange = useCallback(
    (next: InitiativeTrackerState) => {
      applyState(next);
      if (!matchId || next.entries.length === 0) return;
      const key = liveSyncEnabled
        ? torneoLiveDbInitiativeStorageKey(campaignId, matchId)
        : torneoInitiativeStorageKey(campaignId, matchId);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [campaignId, matchId, liveSyncEnabled, applyState]
  );

  const torneoScoreboard = match
    ? (() => {
        const totals = computeMatchDamageTotals(state.entries, match);
        return {
          teamA: {
            id: match.team_a_id ?? "",
            name: match.team_a.name,
            color: match.team_a.color,
            total: totals.teamA,
          },
          teamB: {
            id: match.team_b_id ?? "",
            name: match.team_b.name,
            color: match.team_b.color,
            total: totals.teamB,
          },
        };
      })()
    : null;

  const canStartEncounter =
    !!onStartEncounter &&
    match?.status !== "completed" &&
    match?.status !== "active" &&
    state.entries.length > 0;

  const handleStartEncounter = async () => {
    if (!onStartEncounter) return;
    setStartingEncounter(true);
    try {
      await onStartEncounter();
    } finally {
      setStartingEncounter(false);
    }
  };

  const handleEndEncounter = async () => {
    if (!onEndEncounter) return;
    if (!confirm("Terminare l'incontro? Il megatimer si ferma; i danni restano registrati.")) return;
    setEndingEncounter(true);
    try {
      await onEndEncounter();
    } finally {
      setEndingEncounter(false);
    }
  };

  if (!match) {
    return (
      <div
        className={cn(
          "flex min-h-[200px] flex-1 items-center justify-center rounded-lg border border-dashed border-violet-900/40 bg-zinc-950/50 p-6 text-center text-sm text-zinc-500",
          className
        )}
      >
        {stationLabel ? `${stationLabel}: seleziona un incontro dalla sidebar` : "Nessun incontro selezionato"}
      </div>
    );
  }

  const megatimerUrl =
    livePublicId && match ? torneoLiveTimerUrl(livePublicId, match.id) : null;

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-1", className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1">
        {stationLabel ? (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300/80">
            {stationLabel} · {match.label ?? `${match.team_a.name} vs ${match.team_b.name}`}
          </p>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {match.status === "active" ? (
            <span className="rounded bg-emerald-900/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
              In corso
            </span>
          ) : null}
          {megatimerUrl ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "h-7 gap-1 px-2.5 text-[11px]",
                stationNumber === 2
                  ? "border-amber-700/50 text-amber-200 hover:bg-amber-950/40"
                  : "border-violet-700/50 text-violet-200 hover:bg-violet-950/40"
              )}
              asChild
            >
              <a href={megatimerUrl} target="_blank" rel="noopener noreferrer">
                <Monitor className="h-3.5 w-3.5" />
                Megatimer {stationNumber ?? ""}
                <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
            </Button>
          ) : null}
          {canStartEncounter ? (
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 bg-emerald-700 px-2.5 text-[11px] text-white hover:bg-emerald-600"
              disabled={startingEncounter}
              onClick={() => void handleStartEncounter()}
            >
              {startingEncounter ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
              Avvia incontro
            </Button>
          ) : null}
          {onEndEncounter && match.status === "active" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 border-red-700/50 px-2.5 text-[11px] text-red-300 hover:bg-red-950/40"
              disabled={endingEncounter}
              onClick={() => void handleEndEncounter()}
            >
              {endingEncounter ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              Termina incontro
            </Button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <InitiativeTracker
          {...(initiativeHandleRef ? { ref: initiativeHandleRef } : {})}
          campaignId={campaignId}
          campaignType="torneo"
          value={state}
          onChange={handleChange}
          storageKeyOverride={
            liveSyncEnabled ? `torneo-live-db-${campaignId}-${match.id}` : torneoInitiativeStorageKey(campaignId, match.id)
          }
          characterTeamMap={characterTeamMap}
          showTeamColumn
          torneoScoreboard={torneoScoreboard}
          torneoMegatimer={torneoMegatimer}
        />
      </div>
    </div>
  );
}

/** Salva stato incontro su DB (es. all'avvio incontro in live). */
export async function persistTorneoMatchInitiative(
  campaignId: string,
  matchId: string,
  state: InitiativeTrackerState,
  liveSyncEnabled: boolean
): Promise<void> {
  if (liveSyncEnabled) {
    await saveTorneoMatchInitiativeAction(campaignId, matchId, state);
  }
  try {
    localStorage.setItem(torneoInitiativeStorageKey(campaignId, matchId), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
