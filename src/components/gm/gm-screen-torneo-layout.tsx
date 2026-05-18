"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  InitiativeTracker,
  emptyInitiativeTrackerState,
  sanitizeInitiativeTrackerState,
  type InitiativeTrackerHandle,
  type InitiativeTrackerState,
} from "./initiative-tracker";
import { GmRemoteIntegration } from "./gm-remote-integration";
import { GmRemoteInitiativePublisher } from "./gm-remote-initiative-publisher";
import { GmTorneoManager } from "./gm-torneo-manager";
import { computeMatchDamageTotals } from "@/lib/torneo/compute-match-damage";
import { buildCharacterTeamMap, torneoInitiativeStorageKey } from "@/lib/torneo/initiative";
import { getTorneoSetupAction } from "@/app/campaigns/torneo-actions";
import type { TorneoMatchWithTeams, TorneoTeamWithMembers } from "@/lib/torneo/types";

type GmScreenTorneoLayoutProps = {
  campaignId: string;
  currentUserId: string;
  initialSessionId?: string | null;
};

/** GM Screen Torneo: squadre, incontri, initiative tracker + telecomando. */
export function GmScreenTorneoLayout({ campaignId }: GmScreenTorneoLayoutProps) {
  const trackerRef = useRef<InitiativeTrackerHandle>(null);
  const [trackerState, setTrackerState] = useState<InitiativeTrackerState>(emptyInitiativeTrackerState());
  const [remoteSessionPublicId, setRemoteSessionPublicId] = useState<string | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [teams, setTeams] = useState<TorneoTeamWithMembers[]>([]);
  const [matches, setMatches] = useState<TorneoMatchWithTeams[]>([]);

  /** Stabile: evita che GmTorneoManager ricarichi in loop (prop inline → useEffect [refresh] infinito). */
  const handleTorneoSetupChange = useCallback((t: TorneoTeamWithMembers[], m: TorneoMatchWithTeams[]) => {
    setTeams(t);
    setMatches(m);
  }, []);

  const refreshTorneoMeta = useCallback(async () => {
    const res = await getTorneoSetupAction(campaignId);
    if (res.success && res.data) {
      setTeams(res.data.teams);
      setMatches(res.data.matches);
    }
  }, [campaignId]);

  useEffect(() => {
    void refreshTorneoMeta();
  }, [refreshTorneoMeta]);

  const activeMatch = useMemo(
    () => matches.find((m) => m.id === activeMatchId) ?? null,
    [matches, activeMatchId]
  );

  const characterTeamMap = useMemo(() => buildCharacterTeamMap(teams), [teams]);

  const torneoScoreboard = useMemo(() => {
    if (!activeMatch) return null;
    const totals = computeMatchDamageTotals(trackerState.entries, activeMatch);
    return {
      teamA: {
        id: activeMatch.team_a_id,
        name: activeMatch.team_a.name,
        color: activeMatch.team_a.color,
        total: totals.teamA,
      },
      teamB: {
        id: activeMatch.team_b_id,
        name: activeMatch.team_b.name,
        color: activeMatch.team_b.color,
        total: totals.teamB,
      },
    };
  }, [activeMatch, trackerState.entries]);

  const handleLoadMatch = useCallback(
    (matchId: string, state: InitiativeTrackerState) => {
      setActiveMatchId(matchId);
      setTrackerState(state);
      void refreshTorneoMeta();
    },
    [refreshTorneoMeta]
  );

  const storageKeyOverride = activeMatchId
    ? torneoInitiativeStorageKey(campaignId, activeMatchId)
    : undefined;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-zinc-950">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-600/20 px-4 py-2.5">
        <div>
          <h1 className="text-sm font-bold tracking-tight text-amber-400">GM Screen · Torneo</h1>
          <p className="text-[11px] text-zinc-500">
            Squadre e incontri · danni per squadra · vincitore scelto dal GM
          </p>
        </div>
        <GmRemoteIntegration
          campaignId={campaignId}
          initiativeHandleRef={trackerRef}
          initiativeState={trackerState}
          onSessionPublicIdChange={setRemoteSessionPublicId}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-[min(100%,320px)] shrink-0 border-r border-violet-900/30 bg-zinc-950/80 lg:w-80">
          <GmTorneoManager
            campaignId={campaignId}
            trackerState={trackerState}
            onLoadMatch={handleLoadMatch}
            activeMatchId={activeMatchId}
            onActiveMatchIdChange={setActiveMatchId}
            onSetupChange={handleTorneoSetupChange}
          />
        </aside>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden p-2 md:p-3">
          <InitiativeTracker
            ref={trackerRef}
            campaignId={campaignId}
            campaignType="torneo"
            value={trackerState}
            onChange={setTrackerState}
            onTrackerStateChange={setTrackerState}
            storageKeyOverride={storageKeyOverride}
            characterTeamMap={characterTeamMap}
            showTeamColumn
            torneoScoreboard={torneoScoreboard}
          />
        </div>
      </div>

      <GmRemoteInitiativePublisher
        campaignId={campaignId}
        sessionPublicId={remoteSessionPublicId}
        state={trackerState}
        torneoActiveMatch={
          torneoScoreboard
            ? {
                teamA: {
                  id: torneoScoreboard.teamA.id,
                  name: torneoScoreboard.teamA.name,
                  color: torneoScoreboard.teamA.color,
                  damageTotal: torneoScoreboard.teamA.total,
                },
                teamB: {
                  id: torneoScoreboard.teamB.id,
                  name: torneoScoreboard.teamB.name,
                  color: torneoScoreboard.teamB.color,
                  damageTotal: torneoScoreboard.teamB.total,
                },
              }
            : null
        }
      />
    </div>
  );
}
