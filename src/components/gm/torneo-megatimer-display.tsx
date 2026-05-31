"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { computeMatchTimerView, formatTimerMmSs } from "@/lib/torneo/match-timer";
import { parseTorneoInitiativeSnapshot } from "@/lib/torneo/initiative-snapshot";
import type { TorneoMatchTimerPayload } from "@/app/campaigns/torneo-live-actions";
import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";
import { cn } from "@/lib/utils";

type Props = {
  campaignId: string;
  matchId: string;
  matchLabel: string;
  initialTimer: TorneoMatchTimerPayload;
  initialInitiative?: InitiativeTrackerState | null;
  className?: string;
};

export function TorneoMegatimerDisplay({
  campaignId,
  matchId,
  matchLabel,
  initialTimer,
  initialInitiative = null,
  className,
}: Props) {
  const [fields, setFields] = useState(initialTimer);
  const [initiativeSnapshot, setInitiativeSnapshot] = useState<ReturnType<typeof parseTorneoInitiativeSnapshot>>(
    initialInitiative
  );
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel(`torneo-timer-display-${matchId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "torneo_matches", filter: `id=eq.${matchId}` },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            setFields({
              timer_round_label: typeof row.timer_round_label === "string" ? row.timer_round_label : null,
              timer_duration_sec:
                typeof row.timer_duration_sec === "number" ? row.timer_duration_sec : null,
              timer_started_at: typeof row.timer_started_at === "string" ? row.timer_started_at : null,
              timer_paused_at: typeof row.timer_paused_at === "string" ? row.timer_paused_at : null,
            });
            const snap = row.initiative_snapshot;
            if (snap != null) {
              setInitiativeSnapshot(parseTorneoInitiativeSnapshot(snap));
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [campaignId, matchId]);

  const view = computeMatchTimerView(fields, now);
  const pct =
    view.durationSec > 0 ? Math.min(100, (view.elapsedSec / view.durationSec) * 100) : 0;

  const activePlayer = useMemo(() => {
    if (!initiativeSnapshot?.entries.length) return null;
    const entry = initiativeSnapshot.entries[initiativeSnapshot.currentTurnIndex];
    return entry?.name?.trim() || null;
  }, [initiativeSnapshot]);

  const showExpired = view.isExpired && view.durationSec > 0;

  return (
    <div
      className={cn(
        "flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center",
        className
      )}
    >
      <p className="mb-2 text-sm uppercase tracking-[0.3em] text-violet-400/80">Torneo · Timer turno</p>
      <h1 className="mb-4 max-w-4xl text-xl font-semibold text-zinc-400 md:text-2xl">{matchLabel}</h1>

      {activePlayer ? (
        <div className="mb-8 max-w-3xl rounded-2xl border border-amber-500/40 bg-amber-950/30 px-8 py-5">
          <p className="text-sm uppercase tracking-[0.25em] text-amber-200/70">Sta giocando</p>
          <p className="mt-2 text-4xl font-bold leading-tight text-amber-50 md:text-5xl">{activePlayer}</p>
        </div>
      ) : (
        <p className="mb-8 text-sm text-zinc-600">In attesa dell&apos;initiative tracker…</p>
      )}

      <p className="mb-3 text-lg uppercase tracking-widest text-amber-300/90 md:text-xl">{view.roundLabel}</p>

      {showExpired ? (
        <p className="font-mono text-[min(18vw,7rem)] font-black uppercase leading-none tracking-tight text-red-400">
          Tempo Scaduto
        </p>
      ) : (
        <p
          className={cn(
            "font-mono text-[min(28vw,12rem)] font-bold tabular-nums leading-none tracking-tight",
            view.isPaused ? "text-amber-400" : "text-emerald-300"
          )}
        >
          {formatTimerMmSs(view.remainingSec)}
        </p>
      )}

      <div className="mt-10 h-3 w-full max-w-2xl overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn(
            "h-full transition-all duration-300",
            showExpired ? "bg-red-500" : view.isPaused ? "bg-amber-600" : "bg-emerald-500"
          )}
          style={{ width: `${showExpired ? 100 : 100 - pct}%` }}
        />
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        {showExpired
          ? "Avanza il turno dal GM screen per ripartire"
          : view.isPaused
            ? "In pausa"
            : view.isRunning
              ? "Countdown in corso"
              : "Non avviato"}
        {view.durationSec > 0 ? ` · ${formatTimerMmSs(view.durationSec)} per turno` : ""}
      </p>
    </div>
  );
}
