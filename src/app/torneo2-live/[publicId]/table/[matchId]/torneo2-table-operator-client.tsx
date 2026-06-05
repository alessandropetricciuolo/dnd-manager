"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Torneo2CombatTracker } from "@/components/gm/torneo2/torneo2-combat-tracker";
import { playTimerExpiredBeep } from "@/lib/torneo2/beep";
import { useTorneo2MatchSync } from "@/hooks/use-torneo2-match-sync";
import { patchTorneo2TimerAction, type Torneo2TimerColumns } from "@/app/campaigns/torneo2-live-actions";
import {
  computeTorneo2TimerView,
  formatTorneo2Time,
  startTimerPatch,
  togglePauseTimerPatch,
} from "@/lib/torneo2/timer";
import { emptyTorneo2CombatState, type Torneo2CombatState } from "@/lib/torneo2/combat-state";
import { cn } from "@/lib/utils";

type Props = {
  campaignId: string;
  matchId: string;
  matchLabel: string;
  teamAName: string | null;
  teamBName: string | null;
  initialCombat: Torneo2CombatState | null;
  initialTimer: Torneo2TimerColumns;
};

export function Torneo2TableOperatorClient({
  campaignId,
  matchId,
  matchLabel,
  teamAName,
  teamBName,
  initialCombat,
  initialTimer,
}: Props) {
  const [combat, setCombat] = useState<Torneo2CombatState>(initialCombat ?? emptyTorneo2CombatState());
  const [timer, setTimer] = useState<Torneo2TimerColumns>(initialTimer);
  const [now, setNow] = useState(() => Date.now());

  useTorneo2MatchSync({
    campaignId,
    matchId,
    enabled: true,
    readOnly: false,
    state: combat,
    onRemoteCombat: setCombat,
    onTimer: setTimer,
  });

  useEffect(() => {
    if (!timer.timer_running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer.timer_running]);

  const view = computeTorneo2TimerView(timer, now);

  const expiredRef = useRef(false);
  useEffect(() => {
    if (timer.timer_mode === "none") {
      expiredRef.current = false;
      return;
    }
    if (view.expired) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        playTimerExpiredBeep();
      }
    } else {
      expiredRef.current = false;
    }
  }, [view.expired, timer.timer_mode]);

  const applyPatch = (patch: Partial<Torneo2TimerColumns>) => {
    setTimer((t) => ({ ...t, ...patch }));
    void patchTorneo2TimerAction(campaignId, matchId, patch);
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex flex-wrap items-center gap-2 border-b border-violet-900/30 px-4 py-2">
        <span className="rounded bg-violet-950/60 px-2 py-0.5 text-xs font-bold text-violet-200">
          PC Tavolo
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{matchLabel}</span>
        {timer.timer_mode !== "none" ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "min-w-[4rem] rounded px-3 py-1 text-center text-lg font-bold tabular-nums",
                view.expired
                  ? "bg-red-950/60 text-red-300"
                  : view.running
                    ? "bg-amber-950/60 text-amber-200"
                    : "bg-zinc-800 text-zinc-300"
              )}
            >
              {formatTorneo2Time(view.remainingSec)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 px-0"
              onClick={() => applyPatch(togglePauseTimerPatch(timer, Date.now(), new Date().toISOString()))}
            >
              {view.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 px-0"
              onClick={() =>
                applyPatch(startTimerPatch(`Turno ${combat.roundNumber}`, new Date().toISOString()))
              }
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 p-3">
        <Torneo2CombatTracker
          state={combat}
          onChange={setCombat}
          teamAName={teamAName}
          teamBName={teamBName}
          className="h-full"
        />
      </div>
    </div>
  );
}
