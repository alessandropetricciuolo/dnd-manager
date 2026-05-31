"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  InitiativeTracker,
  emptyInitiativeTrackerState,
  sanitizeInitiativeTrackerState,
  type InitiativeTrackerHandle,
  type InitiativeTrackerState,
} from "@/components/gm/initiative-tracker";
import { useTorneoMatchInitiativeSync } from "@/hooks/use-torneo-match-initiative-sync";
import { saveTorneoMatchInitiativeAction } from "@/app/campaigns/torneo-live-actions";
import { buildMatchInitiativeState, torneoInitiativeStorageKey } from "@/lib/torneo/initiative";
import type { TorneoTeamWithMembers } from "@/lib/torneo/types";
import { computeMatchDamageTotals } from "@/lib/torneo/compute-match-damage";
import type { TorneoCharacterTeamInfo } from "@/lib/torneo/initiative";
import type { TorneoMatchWithTeams } from "@/lib/torneo/types";
import { cn } from "@/lib/utils";

type Props = {
  campaignId: string;
  match: TorneoMatchWithTeams | null;
  liveSyncEnabled: boolean;
  characterTeamMap: Record<string, TorneoCharacterTeamInfo>;
  stationLabel?: string;
  className?: string;
  onStateChange?: (state: InitiativeTrackerState) => void;
  initiativeHandleRef?: React.RefObject<InitiativeTrackerHandle>;
  /** Stato del tavolo gestito dal GM screen (evita sovrascrittura con snapshot vuoto). */
  syncState?: InitiativeTrackerState;
  teams?: TorneoTeamWithMembers[];
};

export function TorneoMatchTracker({
  campaignId,
  match,
  liveSyncEnabled,
  characterTeamMap,
  stationLabel,
  className,
  onStateChange,
  initiativeHandleRef,
  syncState,
  teams = [],
}: Props) {
  const isControlled = syncState !== undefined;
  const [internalState, setInternalState] = useState<InitiativeTrackerState>(emptyInitiativeTrackerState());
  const state = isControlled ? syncState : internalState;
  const matchId = match?.id ?? null;

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
      if (isControlled && next.entries.length === 0 && state.entries.length > 0) return;
      onStateFromRemote(next);
    },
  });

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
      if (matchId && !liveSyncEnabled) {
        try {
          localStorage.setItem(torneoInitiativeStorageKey(campaignId, matchId), JSON.stringify(next));
        } catch {
          /* ignore */
        }
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

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col gap-1", className)}>
      {stationLabel ? (
        <p className="shrink-0 px-1 text-[11px] font-semibold uppercase tracking-wide text-violet-300/80">
          {stationLabel} · {match.label ?? `${match.team_a.name} vs ${match.team_b.name}`}
        </p>
      ) : null}
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <InitiativeTracker
          {...(initiativeHandleRef ? { ref: initiativeHandleRef } : {})}
          campaignId={campaignId}
          campaignType="torneo"
          value={state}
          onChange={handleChange}
          onTrackerStateChange={handleChange}
          storageKeyOverride={
            liveSyncEnabled ? `torneo-live-db-${campaignId}-${match.id}` : torneoInitiativeStorageKey(campaignId, match.id)
          }
          characterTeamMap={characterTeamMap}
          showTeamColumn
          torneoScoreboard={torneoScoreboard}
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
