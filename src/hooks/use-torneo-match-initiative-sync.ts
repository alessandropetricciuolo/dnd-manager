"use client";

import { useCallback, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import {
  loadTorneoMatchInitiativeAction,
  saveTorneoMatchInitiativeAction,
} from "@/app/campaigns/torneo-live-actions";
import {
  emptyInitiativeTrackerState,
  initiativeStateSyncSignature,
  initiativeStatesSyncEqual,
  sanitizeInitiativeTrackerState,
  type InitiativeTrackerState,
} from "@/components/gm/initiative-tracker";
import { torneoLiveDbInitiativeStorageKey } from "@/lib/torneo/megatimer-initiative";

type Options = {
  campaignId: string;
  matchId: string | null;
  liveSyncEnabled: boolean;
  state: InitiativeTrackerState;
  onStateFromRemote: (state: InitiativeTrackerState) => void;
  /** Non sovrascrivere stato locale con snapshot vuoto (race all'avvio incontro). */
  ignoreEmptyRemoteOverwrite?: boolean;
};

const SAVE_DEBOUNCE_MS = 450;

export function useTorneoMatchInitiativeSync({
  campaignId,
  matchId,
  liveSyncEnabled,
  state,
  onStateFromRemote,
  ignoreEmptyRemoteOverwrite = false,
}: Options) {
  const lastSavedRef = useRef<string>("");
  const lastSavedSigRef = useRef<string>("");
  const lastRemoteAtRef = useRef<string | null>(null);
  const selfSaveUntilRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;
  const onStateFromRemoteRef = useRef(onStateFromRemote);
  onStateFromRemoteRef.current = onStateFromRemote;

  useEffect(() => {
    lastSavedRef.current = "";
    lastSavedSigRef.current = "";
    lastRemoteAtRef.current = null;
    selfSaveUntilRef.current = 0;
  }, [matchId]);

  const loadInitial = useCallback(async () => {
    if (!matchId || !liveSyncEnabled) return null;
    const res = await loadTorneoMatchInitiativeAction(campaignId, matchId);
    if (!res.success) return null;
    if (res.data?.state) {
      lastRemoteAtRef.current = res.data.updatedAt;
      lastSavedRef.current = JSON.stringify(res.data.state);
      lastSavedSigRef.current = initiativeStateSyncSignature(res.data.state);
      return res.data.state;
    }
    return null;
  }, [campaignId, matchId, liveSyncEnabled]);

  useEffect(() => {
    if (!matchId || !liveSyncEnabled) return;

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
        .channel(`torneo-match-init-${matchId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "torneo_matches",
            filter: `id=eq.${matchId}`,
          },
          (payload) => {
            if (Date.now() < selfSaveUntilRef.current) return;
            const row = payload.new as Record<string, unknown>;
            const updatedAt =
              typeof row.initiative_updated_at === "string" ? row.initiative_updated_at : null;
            if (updatedAt && updatedAt === lastRemoteAtRef.current) return;
            const snap = row.initiative_snapshot;
            if (!snap) return;
            try {
              const parsed =
                typeof snap === "string"
                  ? (JSON.parse(snap) as Partial<InitiativeTrackerState>)
                  : (snap as Partial<InitiativeTrackerState>);
              const next = sanitizeInitiativeTrackerState(parsed);
              if (ignoreEmptyRemoteOverwrite && next.entries.length === 0) return;
              if (initiativeStatesSyncEqual(stateRef.current, next)) return;
              lastRemoteAtRef.current = updatedAt;
              lastSavedRef.current = JSON.stringify(next);
              lastSavedSigRef.current = initiativeStateSyncSignature(next);
              onStateFromRemoteRef.current(next);
            } catch {
              /* ignore */
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [campaignId, matchId, liveSyncEnabled, ignoreEmptyRemoteOverwrite]);

  const stateSig = initiativeStateSyncSignature(state);

  useEffect(() => {
    if (!matchId || !liveSyncEnabled) return;

    if (stateSig === lastSavedSigRef.current) return;
    if (state.entries.length === 0 && lastSavedSigRef.current === initiativeStateSyncSignature(emptyInitiativeTrackerState())) {
      return;
    }

    const timer = window.setTimeout(() => {
      void saveTorneoMatchInitiativeAction(campaignId, matchId, stateRef.current).then((res) => {
        if (res.success && res.data?.updatedAt) {
          lastSavedRef.current = JSON.stringify(stateRef.current);
          lastSavedSigRef.current = stateSig;
          lastRemoteAtRef.current = res.data.updatedAt;
          selfSaveUntilRef.current = Date.now() + 800;
          try {
            localStorage.setItem(
              torneoLiveDbInitiativeStorageKey(campaignId, matchId),
              JSON.stringify(stateRef.current)
            );
          } catch {
            /* ignore */
          }
        }
      });
    }, SAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [campaignId, matchId, liveSyncEnabled, stateSig]);

  return { loadInitial };
}
