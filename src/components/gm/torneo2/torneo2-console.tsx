"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ListChecks, Network, Octagon, Swords, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Torneo2SetupPanel } from "./torneo2-setup-panel";
import { Torneo2MatchStation } from "./torneo2-match-station";
import { Torneo2LiveBar } from "./torneo2-live-bar";
import { Torneo2Standings } from "./torneo2-standings";
import { Torneo2Bracket } from "./torneo2-bracket";
import { useTorneo2MatchSync } from "@/hooks/use-torneo2-match-sync";
import {
  emergencyResetTorneo2Action,
  getTorneo2SetupAction,
} from "@/app/campaigns/torneo2-actions";
import {
  endTorneo2MatchOnStationAction,
  getActiveTorneo2LiveSessionAction,
  patchTorneo2TimerAction,
  startTorneo2MatchOnStationAction,
  type Torneo2TimerColumns,
} from "@/app/campaigns/torneo2-live-actions";
import {
  emptyTorneo2CombatState,
  type Torneo2CombatState,
} from "@/lib/torneo2/combat-state";
import { buildTorneo2CombatSeed } from "@/lib/torneo2/seed";
import {
  emptyTorneo2TimerState,
  primeTimerPatch,
  startTimerPatch,
  togglePauseTimerPatch,
} from "@/lib/torneo2/timer";
import { torneo2TableUrl, torneo2TimerUrl } from "@/lib/torneo2/live-links";
import type { Torneo2LiveSession, Torneo2Match, Torneo2Setup } from "@/lib/torneo2/types";

type Props = { campaignId: string; campaignName?: string | null };

type Section = "setup" | "live" | "bracket" | "classifica";

function emptyTimerColumns(): Torneo2TimerColumns {
  return emptyTorneo2TimerState();
}

export function Torneo2Console({ campaignId, campaignName }: Props) {
  const [setup, setSetup] = useState<Torneo2Setup>({ teams: [], matches: [], participantsByMatch: {} });
  const [liveSession, setLiveSession] = useState<Torneo2LiveSession | null>(null);
  const [section, setSection] = useState<Section>("setup");
  const [busy, setBusy] = useState(false);
  const [killBusy, setKillBusy] = useState(false);

  const [s1MatchId, setS1MatchId] = useState<string | null>(null);
  const [s2MatchId, setS2MatchId] = useState<string | null>(null);
  const [s1Combat, setS1Combat] = useState<Torneo2CombatState>(emptyTorneo2CombatState());
  const [s2Combat, setS2Combat] = useState<Torneo2CombatState>(emptyTorneo2CombatState());
  const [s1Timer, setS1Timer] = useState<Torneo2TimerColumns>(emptyTimerColumns());
  const [s2Timer, setS2Timer] = useState<Torneo2TimerColumns>(emptyTimerColumns());

  const isLive = liveSession?.status === "live";

  const refreshSetup = useCallback(async () => {
    const res = await getTorneo2SetupAction(campaignId);
    if (res.success && res.data) setSetup(res.data);
  }, [campaignId]);

  useEffect(() => {
    void refreshSetup();
    void (async () => {
      const res = await getActiveTorneo2LiveSessionAction(campaignId);
      if (res.success && res.data) {
        setLiveSession(res.data);
        setS1MatchId(res.data.station1MatchId);
        setS2MatchId(res.data.station2MatchId);
        setSection("live");
      }
    })();
  }, [campaignId, refreshSetup]);

  const s1Match = setup.matches.find((m) => m.id === s1MatchId) ?? null;
  const s2Match = setup.matches.find((m) => m.id === s2MatchId) ?? null;

  const s1Active = isLive && s1Match?.status === "active";
  const s2Active = isLive && s2Match?.status === "active";

  const sync1 = useTorneo2MatchSync({
    campaignId,
    matchId: s1MatchId,
    enabled: isLive && !!s1MatchId,
    readOnly: !s1Active,
    state: s1Combat,
    onRemoteCombat: setS1Combat,
    onTimer: setS1Timer,
  });
  const sync2 = useTorneo2MatchSync({
    campaignId,
    matchId: s2MatchId,
    enabled: isLive && !!s2MatchId,
    readOnly: !s2Active,
    state: s2Combat,
    onRemoteCombat: setS2Combat,
    onTimer: setS2Timer,
  });

  const prevTurn1 = useRef<number | null>(null);
  const prevTurn2 = useRef<number | null>(null);

  const applyTimerPatch = useCallback(
    (station: 1 | 2, matchId: string, patch: Partial<Torneo2TimerColumns>) => {
      if (station === 1) setS1Timer((t) => ({ ...t, ...patch }));
      else setS2Timer((t) => ({ ...t, ...patch }));
      void patchTorneo2TimerAction(campaignId, matchId, patch);
    },
    [campaignId]
  );

  useEffect(() => {
    if (!s1Active || !s1MatchId) {
      prevTurn1.current = null;
      return;
    }
    const idx = s1Combat.currentTurnIndex;
    if (prevTurn1.current === null) {
      prevTurn1.current = idx;
      return;
    }
    if (prevTurn1.current === idx) return;
    prevTurn1.current = idx;
    if (s1Timer.timer_mode === "turn" || s1Timer.timer_mode === "both") {
      // Turni successivi al primo: il timer riparte automaticamente.
      applyTimerPatch(1, s1MatchId, startTimerPatch(`Turno ${s1Combat.roundNumber}`, new Date().toISOString()));
    }
  }, [s1Active, s1MatchId, s1Combat.currentTurnIndex, s1Combat.roundNumber, s1Timer.timer_mode, applyTimerPatch]);

  useEffect(() => {
    if (!s2Active || !s2MatchId) {
      prevTurn2.current = null;
      return;
    }
    const idx = s2Combat.currentTurnIndex;
    if (prevTurn2.current === null) {
      prevTurn2.current = idx;
      return;
    }
    if (prevTurn2.current === idx) return;
    prevTurn2.current = idx;
    if (s2Timer.timer_mode === "turn" || s2Timer.timer_mode === "both") {
      // Turni successivi al primo: il timer riparte automaticamente.
      applyTimerPatch(2, s2MatchId, startTimerPatch(`Turno ${s2Combat.roundNumber}`, new Date().toISOString()));
    }
  }, [s2Active, s2MatchId, s2Combat.currentTurnIndex, s2Combat.roundNumber, s2Timer.timer_mode, applyTimerPatch]);

  const buildPreview = useCallback(
    (matchId: string): Torneo2CombatState => {
      const match = setup.matches.find((m) => m.id === matchId);
      if (!match) return emptyTorneo2CombatState();
      return buildTorneo2CombatSeed(match, setup.teams, setup.participantsByMatch[matchId] ?? []);
    },
    [setup]
  );

  const loadToStation = useCallback(
    (matchId: string, station: 1 | 2) => {
      const otherId = station === 1 ? s2MatchId : s1MatchId;
      if (otherId === matchId) {
        toast.error("Incontro già caricato sull'altro tavolo.");
        return;
      }
      const target = setup.matches.find((m) => m.id === matchId) ?? null;
      const currentId = station === 1 ? s1MatchId : s2MatchId;
      const clearing = currentId === matchId;

      if (station === 1) {
        setS1MatchId(clearing ? null : matchId);
        setS1Combat(
          clearing
            ? emptyTorneo2CombatState()
            : target?.combatState && target.combatState.combatants.length > 0
              ? target.combatState
              : buildPreview(matchId)
        );
        prevTurn1.current = null;
      } else {
        setS2MatchId(clearing ? null : matchId);
        setS2Combat(
          clearing
            ? emptyTorneo2CombatState()
            : target?.combatState && target.combatState.combatants.length > 0
              ? target.combatState
              : buildPreview(matchId)
        );
        prevTurn2.current = null;
      }
      if (!clearing) setSection("live");
    },
    [s1MatchId, s2MatchId, setup.matches, buildPreview]
  );

  const startStation = useCallback(
    async (station: 1 | 2) => {
      const matchId = station === 1 ? s1MatchId : s2MatchId;
      if (!matchId) return;
      if (!isLive) {
        toast.error("Avvia prima la sessione live.");
        return;
      }
      setBusy(true);
      const origin = station === 1 ? sync1.origin : sync2.origin;
      const seedState = station === 1 ? s1Combat : s2Combat;
      const res = await startTorneo2MatchOnStationAction(campaignId, matchId, station, origin, {
        seedState,
      });
      setBusy(false);
      if (!res.success || !res.data) {
        toast.error(res.success ? "Errore avvio." : res.error);
        return;
      }
      const match = res.data.match;
      const seeded = match.combatState ?? emptyTorneo2CombatState();
      if (station === 1) {
        setS1Combat(seeded);
        sync1.noteExternalSave(match.combatSeq, seeded);
        prevTurn1.current = seeded.currentTurnIndex;
      } else {
        setS2Combat(seeded);
        sync2.noteExternalSave(match.combatSeq, seeded);
        prevTurn2.current = seeded.currentTurnIndex;
      }
      // Timer preparato in pausa: il GM lo avvia manualmente quando il tavolo è pronto.
      if (match.timerMode === "turn" || match.timerMode === "both") {
        applyTimerPatch(station, matchId, primeTimerPatch("Turno 1"));
      } else if (match.timerMode === "match") {
        applyTimerPatch(station, matchId, primeTimerPatch(match.label ?? "Incontro"));
      }
      await refreshSetup();
      toast.success(`Incontro avviato su Tavolo ${station}.`);
    },
    [campaignId, isLive, s1MatchId, s2MatchId, s1Combat, s2Combat, sync1, sync2, applyTimerPatch, refreshSetup]
  );

  const endStation = useCallback(
    async (station: 1 | 2) => {
      const matchId = station === 1 ? s1MatchId : s2MatchId;
      if (!matchId) return;
      setBusy(true);
      const res = await endTorneo2MatchOnStationAction(campaignId, matchId);
      setBusy(false);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      if (station === 1) {
        setS1MatchId(null);
        setS1Combat(emptyTorneo2CombatState());
      } else {
        setS2MatchId(null);
        setS2Combat(emptyTorneo2CombatState());
      }
      await refreshSetup();
    },
    [campaignId, s1MatchId, s2MatchId, refreshSetup]
  );

  const toggleTimer = useCallback(
    (station: 1 | 2) => {
      const matchId = station === 1 ? s1MatchId : s2MatchId;
      if (!matchId) return;
      const timer = station === 1 ? s1Timer : s2Timer;
      applyTimerPatch(station, matchId, togglePauseTimerPatch(timer, Date.now(), new Date().toISOString()));
    },
    [s1MatchId, s2MatchId, s1Timer, s2Timer, applyTimerPatch]
  );

  const restartTurn = useCallback(
    (station: 1 | 2) => {
      const matchId = station === 1 ? s1MatchId : s2MatchId;
      if (!matchId) return;
      const combat = station === 1 ? s1Combat : s2Combat;
      applyTimerPatch(station, matchId, startTimerPatch(`Turno ${combat.roundNumber}`, new Date().toISOString()));
    },
    [s1MatchId, s2MatchId, s1Combat, s2Combat, applyTimerPatch]
  );

  const handleLiveChange = useCallback((s: Torneo2LiveSession | null) => {
    setLiveSession(s);
    if (s) {
      setSection("live");
    } else {
      setS1MatchId(null);
      setS2MatchId(null);
      setS1Combat(emptyTorneo2CombatState());
      setS2Combat(emptyTorneo2CombatState());
    }
  }, []);

  const handleKillSwitch = useCallback(async () => {
    if (
      !confirm(
        "Arresto totale Torneo 2.0: termina la live, revoca i telecomandi e azzera tutti gli incontri. Continuare?"
      )
    ) {
      return;
    }
    setKillBusy(true);
    const res = await emergencyResetTorneo2Action(campaignId);
    setKillBusy(false);
    if (!res.success) {
      toast.error(res.error);
      return;
    }
    setLiveSession(null);
    setS1MatchId(null);
    setS2MatchId(null);
    setS1Combat(emptyTorneo2CombatState());
    setS2Combat(emptyTorneo2CombatState());
    await refreshSetup();
    toast.success(`Arresto completato. ${res.data?.matchesReset ?? 0} incontri azzerati.`);
  }, [campaignId, refreshSetup]);

  const timerUrl1 = liveSession && s1MatchId ? torneo2TimerUrl(liveSession.publicId, s1MatchId) : null;
  const tableUrl1 = liveSession && s1MatchId ? torneo2TableUrl(liveSession.publicId, s1MatchId) : null;
  const timerUrl2 = liveSession && s2MatchId ? torneo2TimerUrl(liveSession.publicId, s2MatchId) : null;
  const tableUrl2 = liveSession && s2MatchId ? torneo2TableUrl(liveSession.publicId, s2MatchId) : null;

  const queue = setup.matches.filter((m) => m.status !== "completed");

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] w-full flex-col overflow-hidden bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-100 sm:h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-emerald-900/30 bg-zinc-950/70 px-4 py-2.5">
        <Link
          href={`/campaigns/${campaignId}/gm-screen`}
          className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft className="h-4 w-4" /> GM Screen
        </Link>
        <div className="mr-2">
          <h1 className="flex items-center gap-1.5 text-sm font-bold tracking-tight text-emerald-300">
            <Swords className="h-4 w-4" /> Torneo 2.0
          </h1>
          {campaignName ? <p className="text-[11px] text-zinc-500">{campaignName}</p> : null}
        </div>

        {/* Section switcher */}
        <nav className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900/70 p-1">
          {(
            [
              { id: "setup", label: "Setup", icon: ListChecks },
              { id: "live", label: "Live", icon: Swords },
              { id: "bracket", label: "Tabellone", icon: Network },
              { id: "classifica", label: "Classifica", icon: Trophy },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                section === tab.id
                  ? "bg-emerald-600 text-zinc-950"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Torneo2LiveBar campaignId={campaignId} liveSession={liveSession} onLiveChange={handleLiveChange} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 gap-1 border-red-800/60 bg-red-950/30 text-[11px] text-red-300 hover:bg-red-950/60"
            disabled={killBusy}
            onClick={() => void handleKillSwitch()}
          >
            <Octagon className="h-3.5 w-3.5" /> Kill switch
          </Button>
        </div>
      </header>

      {/* Body */}
      {section === "setup" ? (
        <Torneo2SetupPanel
          campaignId={campaignId}
          setup={setup}
          onChanged={refreshSetup}
          onLoadToStation={loadToStation}
          station1MatchId={s1MatchId}
          station2MatchId={s2MatchId}
          className="min-h-0 flex-1"
        />
      ) : section === "live" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Coda incontri */}
          <div className="shrink-0 border-b border-zinc-800/80 bg-zinc-950/50 px-4 py-2">
            {!isLive ? (
              <p className="text-xs text-amber-400/80">
                Avvia la sessione live per assegnare gli incontri ai tavoli.
              </p>
            ) : queue.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Nessun incontro in coda. Creane nella sezione Setup.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Coda
                </span>
                {queue.map((m) => (
                  <Torneo2QueueChip
                    key={m.id}
                    match={m}
                    teams={setup.teams}
                    onLoad={loadToStation}
                    s1MatchId={s1MatchId}
                    s2MatchId={s2MatchId}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Tavoli affiancati */}
          <div className="grid min-h-0 flex-1 gap-3 overflow-hidden p-3 xl:grid-cols-2">
            <Torneo2MatchStation
              stationNumber={1}
              match={s1Match}
              teams={setup.teams}
              combat={s1Combat}
              onCombatChange={setS1Combat}
              timer={s1Timer}
              onToggleTimer={() => toggleTimer(1)}
              onRestartTurn={() => restartTurn(1)}
              onStart={() => void startStation(1)}
              onEnd={() => void endStation(1)}
              busy={busy}
              liveEnabled={isLive}
              timerUrl={timerUrl1}
              tableUrl={tableUrl1}
            />
            <Torneo2MatchStation
              stationNumber={2}
              match={s2Match}
              teams={setup.teams}
              combat={s2Combat}
              onCombatChange={setS2Combat}
              timer={s2Timer}
              onToggleTimer={() => toggleTimer(2)}
              onRestartTurn={() => restartTurn(2)}
              onStart={() => void startStation(2)}
              onEnd={() => void endStation(2)}
              busy={busy}
              liveEnabled={isLive}
              timerUrl={timerUrl2}
              tableUrl={tableUrl2}
            />
          </div>
        </div>
      ) : section === "bracket" ? (
        <Torneo2Bracket
          campaignId={campaignId}
          setup={setup}
          onChanged={refreshSetup}
          canManage
          className="min-h-0 flex-1"
        />
      ) : (
        <Torneo2Standings
          campaignId={campaignId}
          setup={setup}
          onChanged={refreshSetup}
          canManage
          className="min-h-0 flex-1"
        />
      )}
    </div>
  );
}

function Torneo2QueueChip({
  match,
  teams,
  onLoad,
  s1MatchId,
  s2MatchId,
}: {
  match: Torneo2Match;
  teams: Torneo2Setup["teams"];
  onLoad: (matchId: string, station: 1 | 2) => void;
  s1MatchId: string | null;
  s2MatchId: string | null;
}) {
  const label =
    match.label ??
    (match.kind === "final_ffa"
      ? "Finale"
      : `${teams.find((t) => t.id === match.teamAId)?.name ?? "?"} vs ${
          teams.find((t) => t.id === match.teamBId)?.name ?? "?"
        }`);
  const onT1 = s1MatchId === match.id;
  const onT2 = s2MatchId === match.id;
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border bg-zinc-900/70 py-0.5 pl-3 pr-1",
        onT1 || onT2 ? "border-emerald-700/60" : "border-zinc-700",
        match.status === "active" && "ring-1 ring-amber-500/40"
      )}
    >
      <span className="max-w-[14rem] truncate text-xs text-zinc-200">{label}</span>
      <button
        type="button"
        onClick={() => onLoad(match.id, 1)}
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold",
          onT1 ? "bg-emerald-600 text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        )}
        title="Carica su Tavolo 1"
      >
        T1
      </button>
      <button
        type="button"
        onClick={() => onLoad(match.id, 2)}
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold",
          onT2 ? "bg-emerald-600 text-zinc-950" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
        )}
        title="Carica su Tavolo 2"
      >
        T2
      </button>
    </div>
  );
}
