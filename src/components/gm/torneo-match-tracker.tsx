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
import { torneoInitiativeStorageKey } from "@/lib/torneo/initiative";
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
}: Props) {
  const [state, setState] = useState<InitiativeTrackerState>(emptyInitiativeTrackerState());
  const matchId = match?.id ?? null;

  const onStateFromRemote = useCallback((next: InitiativeTrackerState) => {
    setState(next);
    onStateChange?.(next);
  }, [onStateChange]);

  const { loadInitial } = useTorneoMatchInitiativeSync({
    campaignId,
    matchId,
    liveSyncEnabled,
    state,
    onStateFromRemote,
  });

  useEffect(() => {
    if (!matchId) {
      setState(emptyInitiativeTrackerState());
      return;
    }

    let cancelled = false;
    void (async () => {
      if (liveSyncEnabled) {
        const fromDb = await loadInitial();
        if (cancelled) return;
        if (fromDb) {
          setState(fromDb);
          onStateChange?.(fromDb);
          return;
        }
      }
      try {
        const raw = localStorage.getItem(torneoInitiativeStorageKey(campaignId, matchId));
        if (raw) {
          const restored = sanitizeInitiativeTrackerState(JSON.parse(raw) as Partial<InitiativeTrackerState>);
          if (!cancelled) {
            setState(restored);
            onStateChange?.(restored);
          }
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [campaignId, matchId, liveSyncEnabled, loadInitial, onStateChange]);

  const handleChange = useCallback(
    (next: InitiativeTrackerState) => {
      setState(next);
      onStateChange?.(next);
      if (matchId && !liveSyncEnabled) {
        try {
          localStorage.setItem(torneoInitiativeStorageKey(campaignId, matchId), JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
    },
    [campaignId, matchId, liveSyncEnabled, onStateChange]
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
