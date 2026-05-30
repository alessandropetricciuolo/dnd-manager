"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { computeMatchTimerView, formatTimerMmSs } from "@/lib/torneo/match-timer";
import type { TorneoMatchTimerPayload } from "@/app/campaigns/torneo-live-actions";
import { cn } from "@/lib/utils";

type Props = {
  campaignId: string;
  matchId: string;
  matchLabel: string;
  initialTimer: TorneoMatchTimerPayload;
  className?: string;
};

export function TorneoMegatimerDisplay({ campaignId, matchId, matchLabel, initialTimer, className }: Props) {
  const [fields, setFields] = useState(initialTimer);
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
        .channel(`torneo-timer-${matchId}`)
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

  return (
    <div
      className={cn(
        "flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center",
        className
      )}
    >
      <p className="mb-2 text-sm uppercase tracking-[0.3em] text-violet-400/80">Torneo · Timer incontro</p>
      <h1 className="mb-8 max-w-4xl text-2xl font-semibold text-zinc-300 md:text-3xl">{matchLabel}</h1>

      <p className="mb-4 text-lg uppercase tracking-widest text-amber-300/90 md:text-xl">{view.roundLabel}</p>

      <p
        className={cn(
          "font-mono text-[min(28vw,12rem)] font-bold tabular-nums leading-none tracking-tight",
          view.isExpired ? "text-red-400" : view.isPaused ? "text-amber-400" : "text-emerald-300"
        )}
      >
        {formatTimerMmSs(view.remainingSec)}
      </p>

      <div className="mt-10 h-3 w-full max-w-2xl overflow-hidden rounded-full bg-zinc-800">
        <div
          className={cn("h-full transition-all duration-300", view.isExpired ? "bg-red-500" : "bg-amber-500")}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-6 text-sm text-zinc-500">
        {view.isPaused ? "In pausa" : view.isRunning ? "In corso" : "Non avviato"}
        {view.durationSec > 0 ? ` · durata ${formatTimerMmSs(view.durationSec)}` : ""}
      </p>
    </div>
  );
}
