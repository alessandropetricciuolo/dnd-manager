"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { computeMatchTimerView, formatTimerMmSs } from "@/lib/torneo/match-timer";
import {
  clearMegatimerInitiativeBrowserStorage,
  isAuthoritativeMegatimerInitiativeClear,
  initiativeSyncSignature,
  parseInitiativeSnapshotField,
  pickInitiativeForMegatimer,
  readLegacyInitiativeFromBrowserStorage,
  readLiveInitiativeFromBrowserStorage,
  torneoLiveDbInitiativeStorageKey,
} from "@/lib/torneo/megatimer-initiative";
import type { TorneoMatchTimerPayload } from "@/app/campaigns/torneo-live-actions";
import type { InitiativeEntry, InitiativeTrackerState } from "@/components/gm/initiative-tracker";
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
  /** PG dell'incontro corrente: filtra snapshot initiative obsoleti. */
  rosterCharacterIds?: string[];
  /** Tavolo 1 o 2: identità visiva del megatimer. */
  stationNumber?: 1 | 2;
  className?: string;
};

function enrichEntryPortraits(
  state: InitiativeTrackerState,
  characterPortraits: Record<string, string | null>
): InitiativeTrackerState {
  if (!Object.keys(characterPortraits).length) return state;
  return {
    ...state,
    entries: state.entries.map((e) => {
      if (e.portraitUrl?.trim()) return e;
      if (!e.playerId) return e;
      const url = characterPortraits[e.playerId]?.trim();
      return url ? { ...e, portraitUrl: url } : e;
    }),
  };
}

export function TorneoMegatimerDisplay({
  campaignId,
  matchId,
  matchLabel,
  initialTimer,
  initialInitiative = null,
  characterPortraits = {},
  rosterCharacterIds = [],
  stationNumber,
  className,
}: Props) {
  const [fields, setFields] = useState(initialTimer);
  const [initiativeSnapshot, setInitiativeSnapshot] = useState<InitiativeTrackerState | null>(
    initialInitiative?.entries.length
      ? enrichEntryPortraits(initialInitiative, characterPortraits)
      : null
  );
  const [now, setNow] = useState(Date.now());
  const [portraitError, setPortraitError] = useState(false);
  const lastAppliedSigRef = useRef(initiativeSyncSignature(initialInitiative ?? null));
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const applyInitiativeState = useCallback(
    (next: InitiativeTrackerState | null) => {
      if (!next) {
        if (lastAppliedSigRef.current === "") return;
        lastAppliedSigRef.current = "";
        setInitiativeSnapshot(null);
        return;
      }
      const enriched = enrichEntryPortraits(next, characterPortraits);
      const sig = initiativeSyncSignature(enriched);
      if (sig === lastAppliedSigRef.current) return;
      lastAppliedSigRef.current = sig;
      setInitiativeSnapshot(enriched);
    },
    [characterPortraits]
  );

  const syncInitiativeSources = useCallback(async () => {
    const sources: Array<{
      state: InitiativeTrackerState;
      updatedAt: string | null;
      priority: number;
    }> = [];

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase
      .from("torneo_matches")
      .select("initiative_snapshot, initiative_updated_at, status")
      .eq("id", matchId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    if (
      !error &&
      data &&
      isAuthoritativeMegatimerInitiativeClear(data.initiative_snapshot, data.status)
    ) {
      clearMegatimerInitiativeBrowserStorage(campaignId, matchId);
      applyInitiativeState(null);
      return;
    }

    if (!error && data?.initiative_snapshot != null) {
      const fromDb = parseInitiativeSnapshotField(data.initiative_snapshot);
      if (fromDb) {
        sources.push({
          state: fromDb,
          updatedAt: data.initiative_updated_at ?? null,
          priority: 100,
        });
      }
    }

    const fromLiveStorage = readLiveInitiativeFromBrowserStorage(campaignId, matchId);
    if (fromLiveStorage) {
      sources.push({
        state: fromLiveStorage,
        updatedAt: null,
        priority: 110,
      });
    }

    const fromLegacyStorage = readLegacyInitiativeFromBrowserStorage(campaignId, matchId);
    if (fromLegacyStorage) {
      sources.push({
        state: fromLegacyStorage,
        updatedAt: null,
        priority: 10,
      });
    }

    const picked = pickInitiativeForMegatimer(
      sources,
      rosterCharacterIds,
      fieldsRef.current.timer_round_label
    );
    if (picked) applyInitiativeState(picked);
  }, [applyInitiativeState, campaignId, matchId, rosterCharacterIds]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    void syncInitiativeSources();
    const id = window.setInterval(() => void syncInitiativeSources(), 800);
    return () => window.clearInterval(id);
  }, [syncInitiativeSources]);

  useEffect(() => {
    const storageKey = torneoLiveDbInitiativeStorageKey(campaignId, matchId);
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== storageKey) return;
      if (!ev.newValue) {
        applyInitiativeState(null);
        return;
      }
      try {
        const parsed = parseInitiativeSnapshotField(JSON.parse(ev.newValue));
        if (parsed) applyInitiativeState(parsed);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applyInitiativeState, campaignId, matchId]);

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
            if (isAuthoritativeMegatimerInitiativeClear(row.initiative_snapshot, row.status as string | null | undefined)) {
              clearMegatimerInitiativeBrowserStorage(campaignId, matchId);
              applyInitiativeState(null);
            } else if (row.initiative_snapshot != null) {
              const fromDb = parseInitiativeSnapshotField(row.initiative_snapshot);
              if (fromDb) applyInitiativeState(fromDb);
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [campaignId, matchId, applyInitiativeState]);

  const view = computeMatchTimerView(fields, now);
  const pct =
    view.durationSec > 0 ? Math.min(100, (view.elapsedSec / view.durationSec) * 100) : 0;

  const activeEntry: InitiativeEntry | null = useMemo(() => {
    if (!initiativeSnapshot?.entries.length) return null;
    const idx = Math.min(
      Math.max(0, initiativeSnapshot.currentTurnIndex),
      initiativeSnapshot.entries.length - 1
    );
    return initiativeSnapshot.entries[idx] ?? null;
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

  const stationAccent =
    stationNumber === 2
      ? {
          badge: "Tavolo 2",
          heading: "text-amber-400/80",
          border: "border-amber-500/40",
          portraitBorder: "border-amber-500/55",
          cardBg: "from-amber-950/50 to-zinc-950/80",
          name: "text-amber-50",
          round: "text-amber-200",
          timer: "text-amber-300",
        }
      : {
          badge: stationNumber === 1 ? "Tavolo 1" : null,
          heading: "text-violet-400/80",
          border: "border-violet-500/40",
          portraitBorder: "border-violet-500/55",
          cardBg: "from-violet-950/50 to-zinc-950/80",
          name: "text-violet-50",
          round: "text-violet-200",
          timer: "text-violet-300",
        };

  return (
    <div
      className={cn(
        "flex min-h-screen w-screen flex-col items-center justify-center bg-zinc-950 px-4 py-8 text-center sm:px-8",
        className
      )}
    >
      {stationAccent.badge ? (
        <p className={cn("mb-1 text-xs font-bold uppercase tracking-[0.35em]", stationAccent.heading)}>
          Megatimer · {stationAccent.badge}
        </p>
      ) : null}
      <p className="mb-2 text-sm uppercase tracking-[0.3em] text-zinc-500">Torneo · Countdown turno</p>
      <h1 className="mb-4 max-w-4xl text-lg font-medium text-zinc-500 md:text-xl">{matchLabel}</h1>

      <div className="flex w-full max-w-6xl flex-col items-stretch gap-8 lg:flex-row lg:items-center lg:justify-center lg:gap-12">
        {activeEntry ? (
          <div
            className={cn(
              "flex flex-1 flex-col items-center justify-center rounded-2xl border bg-gradient-to-b px-6 py-8 lg:max-w-md",
              stationAccent.border,
              stationAccent.cardBg
            )}
          >
            <div
              className={cn(
                "relative mb-5 aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-2xl border-2 shadow-2xl shadow-black/50 sm:max-w-[320px]",
                stationAccent.portraitBorder
              )}
              style={
                activeEntry.teamColor
                  ? { boxShadow: `0 0 24px ${activeEntry.teamColor}44, 0 16px 48px #00000088` }
                  : undefined
              }
            >
              <Image
                src={imageSrc}
                alt={activeEntry.name}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 90vw, 320px"
                unoptimized
                onError={() => setPortraitError(true)}
                priority
              />
            </div>
            <p className="text-xs uppercase tracking-[0.3em] text-amber-200/60">Personaggio in turno</p>
            <p className="mt-3 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
              <span className={stationAccent.name}>{activeEntry.name}</span>
            </p>
            {activeEntry.characterClass ? (
              <p className="mt-2 text-lg text-amber-200/55 md:text-xl">{activeEntry.characterClass}</p>
            ) : null}
            {activeEntry.teamName ? (
              <p
                className="mt-3 text-base font-semibold uppercase tracking-wide md:text-lg"
                style={activeEntry.teamColor ? { color: activeEntry.teamColor } : undefined}
              >
                {activeEntry.teamName}
              </p>
            ) : null}
            {turnPosition ? (
              <p className="mt-4 text-sm uppercase tracking-widest text-zinc-400">
                Turno {turnPosition}
                {roundNumber > 1 ? ` · Giro ${roundNumber}` : ""}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 px-6 py-12 lg:max-w-md">
            <p className="text-base text-zinc-600 md:text-lg">
              In attesa dell&apos;initiative tracker…
            </p>
            <p className="mt-2 max-w-xs text-sm text-zinc-700">
              Apri il megatimer sullo stesso browser del GM screen con sessione live attiva.
            </p>
          </div>
        )}

        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="mb-2 text-sm uppercase tracking-[0.35em] text-zinc-500">Round</p>
          <p className={cn("mb-6 font-mono text-[min(14vw,5rem)] font-black tabular-nums leading-none", stationAccent.round)}>
            {roundNumber}
          </p>

          {showExpired ? (
            <p className="font-mono text-[min(14vw,6rem)] font-black uppercase leading-none tracking-tight text-red-400 lg:text-[min(10vw,5.5rem)]">
              Tempo Scaduto
            </p>
          ) : (
            <p
              className={cn(
                "font-mono text-[min(22vw,10rem)] font-bold tabular-nums leading-none tracking-tight lg:text-[min(16vw,8rem)]",
                view.isPaused ? "text-amber-400" : "text-emerald-300"
              )}
            >
              {formatTimerMmSs(view.remainingSec)}
            </p>
          )}

          <div className="mt-8 h-3 w-full max-w-md overflow-hidden rounded-full bg-zinc-800 lg:max-w-lg">
            <div
              className={cn(
                "h-full transition-all duration-300",
                showExpired ? "bg-red-500" : view.isPaused ? "bg-amber-600" : "bg-emerald-500"
              )}
              style={{ width: `${showExpired ? 100 : 100 - pct}%` }}
            />
          </div>

          <p className="mt-6 max-w-md text-sm text-zinc-500">
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
      </div>
    </div>
  );
}
