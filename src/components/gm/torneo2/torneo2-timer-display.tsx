"use client";

import { useEffect, useRef, useState } from "react";
import { useTorneo2MatchSync } from "@/hooks/use-torneo2-match-sync";
import { playTimerExpiredBeep } from "@/lib/torneo2/beep";
import {
  computeTorneo2TimerView,
  formatTorneo2Time,
  type Torneo2TimerColumns,
} from "@/lib/torneo2/timer";
import {
  emptyTorneo2CombatState,
  type Torneo2CombatState,
} from "@/lib/torneo2/combat-state";
import { cn } from "@/lib/utils";

type Props = {
  campaignId: string;
  matchId: string;
  matchLabel: string;
  initialCombat: Torneo2CombatState | null;
  initialTimer: Torneo2TimerColumns;
};

export function Torneo2TimerDisplay({ campaignId, matchId, matchLabel, initialCombat, initialTimer }: Props) {
  const [combat, setCombat] = useState<Torneo2CombatState>(initialCombat ?? emptyTorneo2CombatState());
  const [timer, setTimer] = useState<Torneo2TimerColumns>(initialTimer);
  const [now, setNow] = useState(() => Date.now());

  useTorneo2MatchSync({
    campaignId,
    matchId,
    enabled: true,
    readOnly: true,
    state: combat,
    onRemoteCombat: setCombat,
    onTimer: setTimer,
  });

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const view = computeTorneo2TimerView(timer, now);
  const active = combat.combatants[combat.currentTurnIndex] ?? null;

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

  const accent = active?.teamColor ?? "#f59e0b";

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100">
      {/* Colonna sinistra: ritratto grande in un rettangolo */}
      <div className="flex w-[40%] max-w-[46rem] shrink-0 items-stretch p-6">
        {active ? (
          <div
            className="relative h-full w-full overflow-hidden rounded-3xl border-4 bg-zinc-900 shadow-2xl"
            style={{ borderColor: accent }}
          >
            {active.portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.portraitUrl} alt={active.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[16rem] font-black text-zinc-700">
                {active.name.slice(0, 1)}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-8">
              <p className="text-5xl font-black leading-tight drop-shadow-lg">{active.name}</p>
              {active.teamName ? (
                <p className="mt-1 text-2xl font-semibold" style={{ color: accent }}>
                  {active.teamName}
                </p>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-3xl border-4 border-zinc-800 text-2xl text-zinc-600">
            In attesa…
          </div>
        )}
      </div>

      {/* Colonna destra: timer e info */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center p-6">
        <p className="mb-2 text-center text-2xl font-semibold text-amber-400/90">{matchLabel}</p>
        <p className="mb-8 text-base uppercase tracking-widest text-zinc-500">
          Round {combat.roundNumber}
          {view.label ? ` · ${view.label}` : ""}
        </p>

        {timer.timer_mode !== "none" ? (
          <div
            className={cn(
              "text-[14vw] font-black leading-none tabular-nums xl:text-[12rem]",
              view.expired ? "text-red-500" : view.running ? "text-amber-300" : "text-zinc-300"
            )}
          >
            {formatTorneo2Time(view.remainingSec)}
          </div>
        ) : null}

        {/* Ordine iniziativa compatto */}
        <div className="mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-2">
          {combat.combatants.map((c, idx) => (
            <span
              key={c.id}
              className={cn(
                "rounded-full px-3 py-1 text-sm",
                idx === combat.currentTurnIndex
                  ? "bg-amber-600 font-bold text-zinc-950"
                  : c.isDead || c.hp <= 0
                    ? "bg-zinc-900 text-zinc-600 line-through"
                    : "bg-zinc-800 text-zinc-300"
              )}
            >
              {c.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
