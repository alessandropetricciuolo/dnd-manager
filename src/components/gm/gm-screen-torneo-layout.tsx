"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { LayoutGrid, Trophy } from "lucide-react";
import {
  emptyInitiativeTrackerState,
  type InitiativeTrackerHandle,
  type InitiativeTrackerState,
} from "./initiative-tracker";
import { GmRemoteIntegration } from "./gm-remote-integration";
import { GmRemoteInitiativePublisher } from "./gm-remote-initiative-publisher";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GmTorneoLiveBar } from "./gm-torneo-live-bar";
import { GmTorneoManager } from "./gm-torneo-manager";
import { TorneoBracketLiveView } from "./torneo-bracket-live-view";
import { TorneoMatchTracker } from "./torneo-match-tracker";
import { computeMatchDamageTotals } from "@/lib/torneo/compute-match-damage";
import { buildCharacterTeamMap } from "@/lib/torneo/initiative";
import { getTorneoSetupAction } from "@/app/campaigns/torneo-actions";
import {
  getTorneoMatchTimerAction,
  patchTorneoMatchTimerAction,
  type TorneoLiveSessionInfo,
} from "@/app/campaigns/torneo-live-actions";
import type { TorneoRemoteHandlers } from "@/lib/gm-remote/apply-torneo-remote";
import {
  buildTimerPausePatch,
  buildTimerResetPatch,
  buildTimerResumePatch,
  buildTimerStartPatch,
  DEFAULT_MATCH_TIMER_SEC,
} from "@/lib/torneo/timer-patch";
import type { TorneoMatchWithTeams, TorneoTeamWithMembers } from "@/lib/torneo/types";

type GmScreenTorneoLayoutProps = {
  campaignId: string;
  currentUserId: string;
  initialSessionId?: string | null;
};

/** GM Screen Torneo: live session, 2 tavoli paralleli, sync initiative su DB. */
export function GmScreenTorneoLayout({ campaignId }: GmScreenTorneoLayoutProps) {
  const station1Ref = useRef<InitiativeTrackerHandle>(null!);
  const station2Ref = useRef<InitiativeTrackerHandle>(null!);
  const [liveSession, setLiveSession] = useState<TorneoLiveSessionInfo | null>(null);
  const [focusedRemoteMatchId, setFocusedRemoteMatchId] = useState<string | null>(null);
  const [remoteSessionPublicId, setRemoteSessionPublicId] = useState<string | null>(null);
  const [station1MatchId, setStation1MatchId] = useState<string | null>(null);
  const [station2MatchId, setStation2MatchId] = useState<string | null>(null);
  const [station1State, setStation1State] = useState<InitiativeTrackerState>(emptyInitiativeTrackerState());
  const [station2State, setStation2State] = useState<InitiativeTrackerState>(emptyInitiativeTrackerState());
  const [teams, setTeams] = useState<TorneoTeamWithMembers[]>([]);
  const [matches, setMatches] = useState<TorneoMatchWithTeams[]>([]);
  const [screenTab, setScreenTab] = useState<"gestione" | "tabellone">("gestione");

  const liveSyncEnabled = liveSession?.status === "live";

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

  const handleLiveSessionChange = useCallback((session: TorneoLiveSessionInfo | null) => {
    setLiveSession(session);
    setRemoteSessionPublicId(session?.remoteSessionPublicId ?? null);
  }, []);

  const station1Match = useMemo(
    () => matches.find((m) => m.id === station1MatchId) ?? null,
    [matches, station1MatchId]
  );
  const station2Match = useMemo(
    () => matches.find((m) => m.id === station2MatchId) ?? null,
    [matches, station2MatchId]
  );

  const characterTeamMap = useMemo(() => buildCharacterTeamMap(teams), [teams]);

  const handleLoadMatch = useCallback(
    (station: 1 | 2, matchId: string, state: InitiativeTrackerState) => {
      if (station === 1) {
        setStation1MatchId(matchId);
        setStation1State(state);
      } else {
        setStation2MatchId(matchId);
        setStation2State(state);
      }
      void refreshTorneoMeta();
    },
    [refreshTorneoMeta]
  );

  const torneoScoreboard = useMemo(() => {
    if (!station1Match) return null;
    const totals = computeMatchDamageTotals(station1State.entries, station1Match);
    return {
      teamA: {
        id: station1Match.team_a_id,
        name: station1Match.team_a.name,
        color: station1Match.team_a.color,
        total: totals.teamA,
      },
      teamB: {
        id: station1Match.team_b_id,
        name: station1Match.team_b.name,
        color: station1Match.team_b.color,
        total: totals.teamB,
      },
    };
  }, [station1Match, station1State.entries]);

  const trackerStateForSidebar = station1State;
  const activeMatchIdForSidebar = station1MatchId;

  const torneoHandlers = useMemo<TorneoRemoteHandlers>(
    () => ({
      setFocusedMatch: (matchId) => setFocusedRemoteMatchId(matchId),
      applyTimerStart: (matchId, durationSec, roundLabel) => {
        void (async () => {
          const cur = await getTorneoMatchTimerAction(campaignId, matchId);
          const fields = cur.success && cur.data ? cur.data : null;
          const patch =
            fields?.timer_started_at && fields.timer_paused_at
              ? buildTimerResumePatch(fields)
              : buildTimerStartPatch(durationSec ?? DEFAULT_MATCH_TIMER_SEC, roundLabel ?? "Round 1");
          await patchTorneoMatchTimerAction(campaignId, matchId, patch);
        })();
      },
      applyTimerPause: (matchId) => {
        void (async () => {
          const cur = await getTorneoMatchTimerAction(campaignId, matchId);
          if (!cur.success || !cur.data) return;
          const patch = cur.data.timer_paused_at
            ? buildTimerResumePatch(cur.data)
            : buildTimerPausePatch(cur.data);
          await patchTorneoMatchTimerAction(campaignId, matchId, patch);
        })();
      },
      applyTimerReset: (matchId, durationSec, roundLabel) => {
        void patchTorneoMatchTimerAction(
          campaignId,
          matchId,
          buildTimerResetPatch(durationSec ?? DEFAULT_MATCH_TIMER_SEC, roundLabel ?? "Round 1")
        );
      },
      applyTimerSetRound: (matchId, roundLabel) => {
        void patchTorneoMatchTimerAction(campaignId, matchId, { timer_round_label: roundLabel });
      },
    }),
    [campaignId]
  );

  const station2Scoreboard = useMemo(() => {
    if (!station2Match) return null;
    const totals = computeMatchDamageTotals(station2State.entries, station2Match);
    return {
      teamA: {
        id: station2Match.team_a_id,
        name: station2Match.team_a.name,
        color: station2Match.team_a.color,
        total: totals.teamA,
      },
      teamB: {
        id: station2Match.team_b_id,
        name: station2Match.team_b.name,
        color: station2Match.team_b.color,
        total: totals.teamB,
      },
    };
  }, [station2Match, station2State.entries]);

  const publishMatchId = focusedRemoteMatchId ?? station1MatchId;
  const publishState =
    publishMatchId === station2MatchId
      ? station2State
      : publishMatchId === station1MatchId
        ? station1State
        : station1State;
  const publishScoreboard =
    publishMatchId === station2MatchId
      ? station2Scoreboard
      : publishMatchId === station1MatchId
        ? torneoScoreboard
        : torneoScoreboard;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-zinc-950">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-amber-600/20 px-4 py-2.5">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4">
          <div>
            <h1 className="text-sm font-bold tracking-tight text-amber-400">GM Screen · Torneo</h1>
            <p className="text-[11px] text-zinc-500">
              Sessione live · 2 tavoli · sync initiative su server
            </p>
          </div>
          <Tabs
            value={screenTab}
            onValueChange={(v) => setScreenTab(v as "gestione" | "tabellone")}
            className="shrink-0"
          >
            <TabsList className="h-8 border border-violet-900/40 bg-zinc-900/80 p-0.5">
              <TabsTrigger
                value="gestione"
                className="h-7 gap-1.5 px-3 text-xs data-[state=active]:bg-amber-950/60 data-[state=active]:text-amber-200"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Gestione
              </TabsTrigger>
              <TabsTrigger
                value="tabellone"
                className="h-7 gap-1.5 px-3 text-xs data-[state=active]:bg-violet-950/60 data-[state=active]:text-violet-200"
              >
                <Trophy className="h-3.5 w-3.5" />
                Tabellone
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GmTorneoLiveBar
            campaignId={campaignId}
            matches={matches}
            onLiveSessionChange={handleLiveSessionChange}
          />
          <GmRemoteIntegration
            campaignId={campaignId}
            initiativeHandleRef={station1Ref as RefObject<InitiativeTrackerHandle | null>}
            initiativeHandleRef2={station2Ref as RefObject<InitiativeTrackerHandle | null>}
            station1MatchId={station1MatchId}
            station2MatchId={station2MatchId}
            torneoHandlers={torneoHandlers}
            initiativeState={station1State}
            forcedSessionPublicId={liveSession?.remoteSessionPublicId ?? null}
            onSessionPublicIdChange={setRemoteSessionPublicId}
          />
        </div>
      </header>

      <Tabs value={screenTab} className="flex min-h-0 flex-1 flex-col">
        <TabsContent value="gestione" className="mt-0 flex min-h-0 flex-1 data-[state=inactive]:hidden">
          <div className="flex min-h-0 w-full flex-1">
            <aside className="flex w-[min(100%,320px)] shrink-0 flex-col border-r border-violet-900/30 bg-zinc-950/80 lg:w-80">
              <GmTorneoManager
                className="min-h-0 flex-1"
                campaignId={campaignId}
                trackerState={trackerStateForSidebar}
                onLoadMatch={handleLoadMatch}
                activeMatchId={activeMatchIdForSidebar}
                station2MatchId={station2MatchId}
                onActiveMatchIdChange={setStation1MatchId}
                onSetupChange={handleTorneoSetupChange}
                liveSyncEnabled={liveSyncEnabled}
                getTrackerStateForMatch={(matchId) => {
                  if (matchId === station1MatchId) return station1State;
                  if (matchId === station2MatchId) return station2State;
                  return null;
                }}
              />
            </aside>
            <div className="grid min-h-0 min-w-0 flex-1 grid-rows-2 gap-2 overflow-hidden p-2 md:grid-cols-1 md:grid-rows-2 md:p-3">
              <TorneoMatchTracker
                campaignId={campaignId}
                match={station1Match}
                liveSyncEnabled={liveSyncEnabled}
                characterTeamMap={characterTeamMap}
                stationLabel="Tavolo 1"
                initiativeHandleRef={station1Ref}
                onStateChange={setStation1State}
              />
              <TorneoMatchTracker
                campaignId={campaignId}
                match={station2Match}
                liveSyncEnabled={liveSyncEnabled}
                characterTeamMap={characterTeamMap}
                stationLabel="Tavolo 2"
                initiativeHandleRef={station2Ref}
                onStateChange={setStation2State}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tabellone" className="mt-0 flex min-h-0 flex-1 data-[state=inactive]:hidden">
          <TorneoBracketLiveView
            campaignId={campaignId}
            initialMatches={matches}
            variant="display"
            showToolbar
            className="w-full"
          />
        </TabsContent>
      </Tabs>

      <GmRemoteInitiativePublisher
        campaignId={campaignId}
        sessionPublicId={remoteSessionPublicId}
        state={publishState}
        torneoMatchId={publishMatchId}
        torneoActiveMatch={
          publishScoreboard
            ? {
                teamA: {
                  id: publishScoreboard.teamA.id,
                  name: publishScoreboard.teamA.name,
                  color: publishScoreboard.teamA.color,
                  damageTotal: publishScoreboard.teamA.total,
                },
                teamB: {
                  id: publishScoreboard.teamB.id,
                  name: publishScoreboard.teamB.name,
                  color: publishScoreboard.teamB.color,
                  damageTotal: publishScoreboard.teamB.total,
                },
              }
            : null
        }
      />
    </div>
  );
}
