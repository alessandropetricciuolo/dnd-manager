"use client";

import { useCallback, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import {
  getTorneo2TimerAction,
  loadTorneo2MatchStateAction,
  updateTorneo2CombatStateAction,
  type Torneo2TimerColumns,
} from "@/app/campaigns/torneo2-live-actions";
import {
  sanitizeTorneo2CombatState,
  torneo2CombatSignature,
  type Torneo2CombatState,
} from "@/lib/torneo2/combat-state";

const SAVE_DEBOUNCE_MS = 280;
const ORIGIN_STORAGE_KEY = "torneo2-origin-id";

function getOriginId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = sessionStorage.getItem(ORIGIN_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(ORIGIN_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

type Options = {
  campaignId: string;
  matchId: string | null;
  enabled: boolean;
  /** Display read-only: niente scritture. */
  readOnly?: boolean;
  state: Torneo2CombatState;
  onRemoteCombat: (state: Torneo2CombatState) => void;
  onTimer?: (timer: Torneo2TimerColumns) => void;
};

/**
 * Hook unico di sincronizzazione incontro Torneo 2.0.
 * - Carica lo stato iniziale (combat + timer).
 * - Si iscrive a un singolo canale Realtime sulla riga del match.
 * - Scrive lo stato (debounced) con guardia a sequenza/origin: niente echi, niente polling.
 */
export function useTorneo2MatchSync({
  campaignId,
  matchId,
  enabled,
  readOnly = false,
  state,
  onRemoteCombat,
  onTimer,
}: Options) {
  const originRef = useRef<string>("");
  if (!originRef.current) originRef.current = getOriginId();

  const appliedSeqRef = useRef<number>(0);
  const lastSavedSigRef = useRef<string>("");
  const stateRef = useRef(state);
  stateRef.current = state;
  const onRemoteCombatRef = useRef(onRemoteCombat);
  onRemoteCombatRef.current = onRemoteCombat;
  const onTimerRef = useRef(onTimer);
  onTimerRef.current = onTimer;

  // Reset quando cambia incontro.
  useEffect(() => {
    appliedSeqRef.current = 0;
    lastSavedSigRef.current = "";
  }, [matchId]);

  // Caricamento iniziale (combat + timer).
  useEffect(() => {
    if (!matchId || !enabled) return;
    let cancelled = false;
    void (async () => {
      const [combatRes, timerRes] = await Promise.all([
        loadTorneo2MatchStateAction(campaignId, matchId),
        getTorneo2TimerAction(campaignId, matchId),
      ]);
      if (cancelled) return;
      if (combatRes.success && combatRes.data) {
        appliedSeqRef.current = combatRes.data.seq;
        lastSavedSigRef.current = torneo2CombatSignature(combatRes.data.state);
        onRemoteCombatRef.current(combatRes.data.state);
      }
      if (timerRes.success && timerRes.data) {
        onTimerRef.current?.(timerRes.data);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignId, matchId, enabled]);

  // Singolo canale Realtime per la riga del match.
  useEffect(() => {
    if (!matchId || !enabled) return;
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      await supabase.realtime.setAuth(session?.access_token ?? null);
      if (cancelled) return;

      channel = supabase
        .channel(`torneo2-match-${matchId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "torneo2_matches", filter: `id=eq.${matchId}` },
          (payload) => {
            const row = payload.new as Record<string, unknown>;

            // Timer: sempre propagato (i client calcolano il countdown localmente).
            if (onTimerRef.current) {
              onTimerRef.current({
                timer_mode: (row.timer_mode as Torneo2TimerColumns["timer_mode"]) ?? "turn",
                turn_seconds: Number(row.turn_seconds ?? 120) || 120,
                match_seconds: row.match_seconds == null ? null : Number(row.match_seconds),
                timer_running: row.timer_running === true,
                timer_started_at: (row.timer_started_at as string | null) ?? null,
                timer_paused_elapsed_ms: Number(row.timer_paused_elapsed_ms ?? 0) || 0,
                timer_label: (row.timer_label as string | null) ?? null,
              });
            }

            // Combat: guardia origin + seq.
            const seq = Number(row.combat_seq ?? 0) || 0;
            const origin = (row.combat_origin as string | null) ?? null;
            if (origin && origin === originRef.current) return;
            if (seq <= appliedSeqRef.current) return;
            if (row.combat_state == null) {
              appliedSeqRef.current = seq;
              return;
            }
            const next = sanitizeTorneo2CombatState(row.combat_state);
            appliedSeqRef.current = seq;
            lastSavedSigRef.current = torneo2CombatSignature(next);
            onRemoteCombatRef.current(next);
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [campaignId, matchId, enabled]);

  // Scrittura debounced dello stato combattimento.
  const stateSig = torneo2CombatSignature(state);
  useEffect(() => {
    if (!matchId || !enabled || readOnly) return;
    if (stateSig === lastSavedSigRef.current) return;

    const timer = window.setTimeout(() => {
      void updateTorneo2CombatStateAction(
        campaignId,
        matchId,
        stateRef.current,
        originRef.current
      ).then((res) => {
        if (res.success && res.data) {
          appliedSeqRef.current = res.data.seq;
          lastSavedSigRef.current = stateSig;
        }
      });
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [campaignId, matchId, enabled, readOnly, stateSig]);

  /** Segnala che lo stato è stato salvato esternamente (es. seed all'avvio incontro). */
  const noteExternalSave = useCallback((seq: number, savedState: Torneo2CombatState) => {
    appliedSeqRef.current = Math.max(appliedSeqRef.current, seq);
    lastSavedSigRef.current = torneo2CombatSignature(savedState);
  }, []);

  return { origin: originRef.current, noteExternalSave };
}
