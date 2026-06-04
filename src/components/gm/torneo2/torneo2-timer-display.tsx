"use client";

import { useEffect, useState } from "react";
import { useTorneo2MatchSync } from "@/hooks/use-torneo2-match-sync";
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

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-100">
      <p className="mb-2 text-center text-lg font-semibold text-amber-400/90">{matchLabel}</p>
      <p className="mb-6 text-sm uppercase tracking-widest text-zinc-500">
        Round {combat.roundNumber}
        {view.label ? ` · ${view.label}` : ""}
      </p>

      {active ? (
        <div className="mb-8 flex flex-col items-center gap-3">
          {active.portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.portraitUrl}
              alt={active.name}
              className="h-40 w-40 rounded-full border-4 object-cover"
              style={{ borderColor: active.teamColor ?? "#f59e0b" }}
            />
          ) : (
            <div
              className="flex h-40 w-40 items-center justify-center rounded-full border-4 text-5xl font-bold"
              style={{ borderColor: active.teamColor ?? "#f59e0b" }}
            >
              {active.name.slice(0, 1)}
            </div>
          )}
          <p className="text-3xl font-bold">{active.name}</p>
          {active.teamName ? <p className="text-lg text-zinc-400">{active.teamName}</p> : null}
        </div>
      ) : null}

      {timer.timer_mode !== "none" ? (
        <div
          className={cn(
            "rounded-3xl px-16 py-8 text-[12rem] font-black leading-none tabular-nums",
            view.expired ? "text-red-500" : view.running ? "text-amber-300" : "text-zinc-300"
          )}
        >
          {formatTorneo2Time(view.remainingSec)}
        </div>
      ) : null}

      {/* Ordine iniziativa compatto */}
      <div className="mt-8 flex max-w-5xl flex-wrap items-center justify-center gap-2">
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
  );
}
