"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { loadTorneoMatchInitiativeAction } from "@/app/campaigns/torneo-live-actions";
import { computeMatchTimerView, formatTimerMmSs } from "@/lib/torneo/match-timer";
import { parseTorneoInitiativeSnapshot } from "@/lib/torneo/initiative-snapshot";
import type { TorneoMatchTimerPayload } from "@/app/campaigns/torneo-live-actions";
import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";
import { cn } from "@/lib/utils";

const PLACEHOLDER_PORTRAIT =
  "https://placehold.co/480x640/1c1917/fbbf24/png?text=PG";

type Props = {
  campaignId: string;
  matchId: string;
  matchLabel: string;
  initialTimer: TorneoMatchTimerPayload;
  initialInitiative?: InitiativeTrackerState | null;
  /** Fallback ritratto per PG (character_id → image_url). */
  characterPortraits?: Record<string, string | null>;
  className?: string;
};

export function TorneoMegatimerDisplay({
  campaignId,
  matchId,
  matchLabel,
  initialTimer,
  initialInitiative = null,
  characterPortraits = {},
  className,
}: Props) {
  const [fields, setFields] = useState(initialTimer);
  const [initiativeSnapshot, setInitiativeSnapshot] = useState<InitiativeTrackerState | null>(
    initialInitiative
  );
  const [now, setNow] = useState(Date.now());
  const [portraitError, setPortraitError] = useState(false);

  const applyInitiative = useCallback((raw: unknown) => {
    const parsed = parseTorneoInitiativeSnapshot(raw);
    if (parsed?.entries.length) setInitiativeSnapshot(parsed);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const res = await loadTorneoMatchInitiativeAction(campaignId, matchId);
      if (cancelled || !res.success || !res.data?.state?.entries.length) return;
      setInitiativeSnapshot(res.data.state);
    };
    void poll();
    const id = window.setInterval(() => void poll(), 1500);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [campaignId, matchId]);

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
            if (row.initiative_snapshot != null) applyInitiative(row.initiative_snapshot);
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [campaignId, matchId, applyInitiative]);

  const view = computeMatchTimerView(fields, now);
  const pct =
    view.durationSec > 0 ? Math.min(100, (view.elapsedSec / view.durationSec) * 100) : 0;

  const activeEntry = useMemo(() => {
    if (!initiativeSnapshot?.entries.length) return null;
    return initiativeSnapshot.entries[initiativeSnapshot.currentTurnIndex] ?? null;
  }, [initiativeSnapshot]);

  const portraitUrl = useMemo(() => {
    if (!activeEntry) return null;
    const fromEntry = activeEntry.portraitUrl?.trim();
    if (fromEntry) return fromEntry;
    if (activeEntry.playerId) {
      const fromMap = characterPortraits[activeEntry.playerId]?.trim();
      if (fromMap) return fromMap;
    }
    return null;
  }, [activeEntry, characterPortraits]);

  useEffect(() => {
    setPortraitError(false);
  }, [portraitUrl, activeEntry?.id]);

  const roundNumber = initiativeSnapshot?.roundNumber ?? 1;
  const turnPosition =
    initiativeSnapshot && initiativeSnapshot.entries.length > 0
      ? `${initiativeSnapshot.currentTurnIndex + 1}/${initiativeSnapshot.entries.length}`
      : null;

  const showExpired = view.isExpired && view.durationSec > 0;
  const imageSrc = portraitError || !portraitUrl ? PLACEHOLDER_PORTRAIT : portraitUrl;

  return (
    <div
      className={cn(
        "flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center",
        className
      )}
    >
      <p className="mb-2 text-sm uppercase tracking-[0.3em] text-violet-400/80">Torneo · Countdown turno</p>
      <h1 className="mb-6 max-w-4xl text-lg font-medium text-zinc-500 md:text-xl">{matchLabel}</h1>

      <p className="mb-2 text-sm uppercase tracking-[0.35em] text-violet-300/80">Round</p>
      <p className="mb-6 font-mono text-[min(14vw,5rem)] font-black tabular-nums leading-none text-violet-200">
        {roundNumber}
      </p>

      {activeEntry ? (
        <div className="mb-8 flex w-full max-w-3xl flex-col items-center rounded-2xl border border-amber-500/45 bg-amber-950/35 px-6 py-6 md:px-8 md:py-7">
          <div
            className="relative mb-5 h-40 w-32 shrink-0 overflow-hidden rounded-xl border-2 border-amber-500/50 shadow-lg shadow-black/40 sm:h-48 sm:w-36 md:mb-6 md:h-56 md:w-44"
            style={
              activeEntry.teamColor
                ? { boxShadow: `0 0 0 1px ${activeEntry.teamColor}55, 0 12px 40px #00000066` }
                : undefined
            }
          >
            <Image
              src={imageSrc}
              alt={activeEntry.name}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 176px, 220px"
              unoptimized
              onError={() => setPortraitError(true)}
              priority
            />
          </div>
          <p className="text-sm uppercase tracking-[0.25em] text-amber-200/70">Personaggio in turno</p>
          <p className="mt-2 text-[min(8vw,3.5rem)] font-bold leading-tight text-amber-50">{activeEntry.name}</p>
          {activeEntry.characterClass ? (
            <p className="mt-1 text-lg text-amber-200/50">{activeEntry.characterClass}</p>
          ) : null}
          {activeEntry.teamName ? (
            <p
              className="mt-2 text-base font-medium uppercase tracking-wide md:text-lg"
              style={activeEntry.teamColor ? { color: activeEntry.teamColor } : undefined}
            >
              {activeEntry.teamName}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mb-8 text-base text-zinc-600">In attesa dell&apos;initiative tracker…</p>
      )}

      {turnPosition ? (
        <p className="mb-4 text-base uppercase tracking-widest text-zinc-400">
          Turno {turnPosition}
          {view.roundLabel && view.roundLabel !== "Round" ? ` · ${view.roundLabel}` : ""}
        </p>
      ) : null}

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
          ? "Avanza il turno dal GM screen o telecomando per ripartire"
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
