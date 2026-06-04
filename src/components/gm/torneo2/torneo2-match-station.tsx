"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Monitor, Pause, Play, Power, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Torneo2CombatTracker } from "./torneo2-combat-tracker";
import {
  computeTorneo2TimerView,
  formatTorneo2Time,
  type Torneo2TimerColumns,
} from "@/lib/torneo2/timer";
import type { Torneo2CombatState } from "@/lib/torneo2/combat-state";
import type { Torneo2Match, Torneo2Team } from "@/lib/torneo2/types";

type Props = {
  stationNumber: 1 | 2;
  match: Torneo2Match | null;
  teams: Torneo2Team[];
  combat: Torneo2CombatState;
  onCombatChange: (next: Torneo2CombatState) => void;
  timer: Torneo2TimerColumns;
  onToggleTimer: () => void;
  onRestartTurn: () => void;
  onStart: () => void;
  onEnd: () => void;
  busy: boolean;
  liveEnabled: boolean;
  timerUrl: string | null;
  tableUrl: string | null;
};

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

export function Torneo2MatchStation({
  stationNumber,
  match,
  teams,
  combat,
  onCombatChange,
  timer,
  onToggleTimer,
  onRestartTurn,
  onStart,
  onEnd,
  busy,
  liveEnabled,
  timerUrl,
  tableUrl,
}: Props) {
  const now = useNow(timer.timer_running);
  const view = computeTorneo2TimerView(
    {
      ...timer,
      timer_paused_elapsed_ms: timer.timer_paused_elapsed_ms,
    },
    now
  );

  const teamAName = match?.teamAId ? teams.find((t) => t.id === match.teamAId)?.name ?? null : null;
  const teamBName = match?.teamBId ? teams.find((t) => t.id === match.teamBId)?.name ?? null : null;
  const isActive = match?.status === "active";

  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-violet-900/30 bg-zinc-950/70">
      <header className="flex flex-wrap items-center gap-2 border-b border-violet-900/30 px-3 py-2">
        <span className="rounded bg-violet-950/60 px-2 py-0.5 text-[11px] font-bold text-violet-200">
          Tavolo {stationNumber}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-zinc-200">
          {match
            ? match.label ??
              (match.kind === "final_ffa"
                ? "Finale · Tutti contro tutti"
                : `${teamAName ?? "?"} vs ${teamBName ?? "?"}`)
            : "Nessun incontro caricato"}
        </span>

        {match && timer.timer_mode !== "none" ? (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "min-w-[3.5rem] rounded px-2 py-1 text-center text-sm font-bold tabular-nums",
                view.expired
                  ? "bg-red-950/60 text-red-300"
                  : view.running
                    ? "bg-amber-950/60 text-amber-200"
                    : "bg-zinc-800 text-zinc-300"
              )}
            >
              {formatTorneo2Time(view.remainingSec)}
            </span>
            {isActive ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 px-0"
                  onClick={onToggleTimer}
                  title={view.running ? "Pausa" : "Avvia"}
                >
                  {view.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 px-0"
                  onClick={onRestartTurn}
                  title="Riavvia turno"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {match && liveEnabled ? (
          <div className="flex items-center gap-1">
            {timerUrl ? (
              <a href={timerUrl} target="_blank" rel="noopener noreferrer" title="Apri megatimer">
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-1.5 text-[10px]">
                  <Monitor className="h-3.5 w-3.5" /> Timer
                </Button>
              </a>
            ) : null}
            {tableUrl ? (
              <a href={tableUrl} target="_blank" rel="noopener noreferrer" title="Apri PC tavolo">
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-1.5 text-[10px]">
                  <ExternalLink className="h-3.5 w-3.5" /> Tavolo
                </Button>
              </a>
            ) : null}
          </div>
        ) : null}

        {match ? (
          isActive ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 border-red-800/60 px-2 text-[10px] text-red-300"
              disabled={busy}
              onClick={onEnd}
            >
              <Square className="h-3 w-3" /> Termina
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              className="h-7 gap-1 bg-emerald-700 px-2 text-[10px] hover:bg-emerald-600"
              disabled={busy || !liveEnabled}
              onClick={onStart}
              title={liveEnabled ? "Avvia incontro" : "Avvia prima la sessione live"}
            >
              <Power className="h-3 w-3" /> Avvia
            </Button>
          )
        ) : null}
      </header>

      <div className="min-h-0 flex-1 p-2">
        <Torneo2CombatTracker
          state={combat}
          onChange={onCombatChange}
          readOnly={!match || !liveEnabled}
          teamAName={teamAName}
          teamBName={teamBName}
          className="h-full"
        />
      </div>
    </div>
  );
}
