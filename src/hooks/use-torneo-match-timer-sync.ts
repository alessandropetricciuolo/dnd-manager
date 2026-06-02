"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import {
  getTorneoMatchTimerAction,
  patchTorneoMatchTimerAction,
  type TorneoMatchTimerPayload,
} from "@/app/campaigns/torneo-live-actions";
import {
  buildTimerPausePatch,
  buildTimerResumePatch,
  buildTimerResetPatch,
  buildTorneoTurnTimerStartPatch,
  TORNEO_MATCH_COUNTDOWN_SEC,
} from "@/lib/torneo/timer-patch";
import {
  computeMatchTimerView,
  type MatchTimerView,
  type TorneoMatchTimerFields,
} from "@/lib/torneo/match-timer";

const EMPTY_FIELDS: TorneoMatchTimerFields = {
  timer_round_label: null,
  timer_duration_sec: null,
  timer_started_at: null,
  timer_paused_at: null,
};

type UseTorneoMatchTimerSyncOptions = {
  campaignId: string;
  matchId: string | null;
  enabled: boolean;
  roundNumber: number;
  currentTurnIndex: number;
  entryCount: number;
};

export function useTorneoMatchTimerSync({
  campaignId,
  matchId,
  enabled,
  roundNumber,
  currentTurnIndex,
  entryCount,
}: UseTorneoMatchTimerSyncOptions) {
  const [fields, setFields] = useState<TorneoMatchTimerFields>(EMPTY_FIELDS);
  const [now, setNow] = useState(Date.now());
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const refreshFromServer = useCallback(async () => {
    if (!matchId) return;
    const res = await getTorneoMatchTimerAction(campaignId, matchId);
    if (res.success && res.data) setFields(res.data);
  }, [campaignId, matchId]);

  useEffect(() => {
    if (!enabled || !matchId) {
      setFields(EMPTY_FIELDS);
      return;
    }
    void refreshFromServer();
  }, [enabled, matchId, refreshFromServer]);

  useEffect(() => {
    if (!enabled || !matchId) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [enabled, matchId]);

  useEffect(() => {
    if (!enabled || !matchId) return;

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
        .channel(`torneo-match-timer-sync-${matchId}`)
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
  }, [enabled, matchId]);

  const view: MatchTimerView = computeMatchTimerView(fields, now);

  const applyPatch = useCallback(
    async (patch: Partial<TorneoMatchTimerPayload>) => {
      if (!matchId) return;
      setFields((prev) => ({ ...prev, ...patch }));
      await patchTorneoMatchTimerAction(campaignId, matchId, patch);
    },
    [campaignId, matchId]
  );

  const restartCurrentTurn = useCallback(async () => {
    if (!matchId || entryCount === 0) return;
    await applyPatch(
      buildTorneoTurnTimerStartPatch(roundNumber, currentTurnIndex, entryCount, TORNEO_MATCH_COUNTDOWN_SEC)
    );
  }, [applyPatch, currentTurnIndex, entryCount, matchId, roundNumber]);

  const togglePause = useCallback(async () => {
    if (!matchId) return;
    const cur = fieldsRef.current;
    if (!cur.timer_started_at) {
      await restartCurrentTurn();
      return;
    }
    const patch = cur.timer_paused_at ? buildTimerResumePatch(cur) : buildTimerPausePatch(cur);
    await applyPatch(patch);
  }, [applyPatch, matchId, restartCurrentTurn]);

  const stopTimer = useCallback(async () => {
    if (!matchId) return;
    await applyPatch(buildTimerResetPatch());
  }, [applyPatch, matchId]);

  return {
    view,
    enabled: enabled && !!matchId,
    refreshFromServer,
    restartCurrentTurn,
    togglePause,
    stopTimer,
  };
}
