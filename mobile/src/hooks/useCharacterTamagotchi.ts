import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../api/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TamagotchiAction,
  TamagotchiAppearance,
  TamagotchiCareStat,
  TamagotchiState,
  applyTamagotchiDecay,
  createInitialTamagotchiState,
  deriveTamagotchiMood,
  getTamagotchiActionCooldownRemainingMs,
  getTamagotchiCareGameCooldownRemainingMs,
  normalizeTamagotchiAppearance,
  normalizeTamagotchiState,
} from '../lib/character-tamagotchi';
import {
  TamagotchiMutationPayload,
  TamagotchiStorageAdapter,
  TamagotchiTransport,
  classifyHttpStatus,
  enqueueAndFlushMutation,
  syncTamagotchiState,
} from '../lib/tamagotchi-sync';

const secureStoreAdapter: TamagotchiStorageAdapter = {
  async getItem(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string) {
    await SecureStore.deleteItemAsync(key);
  },
};

function createHttpTransport(expectedUserId: string): TamagotchiTransport {
  const getBaseUrl = () =>
    (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');

  const getValidatedToken = async (): Promise<
    { ok: true; token: string } | { ok: false; errorKind: 'retryable' | 'auth_expired'; status: number; errorCode: string }
  > => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session?.access_token) {
        return { ok: false, errorKind: 'retryable', status: 0, errorCode: 'no_token' };
      }
      if (session.user?.id !== expectedUserId) {
        return { ok: false, errorKind: 'auth_expired', status: 401, errorCode: 'session_user_mismatch' };
      }
      return { ok: true, token: session.access_token };
    } catch {
      return { ok: false, errorKind: 'retryable', status: 0, errorCode: 'session_error' };
    }
  };

  return {
    async getState(characterId) {
      const tokenRes = await getValidatedToken();
      if (!tokenRes.ok) {
        return tokenRes;
      }
      try {
        const res = await fetch(
          `${getBaseUrl()}/api/mobile/characters/${encodeURIComponent(characterId)}/tamagotchi`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${tokenRes.token}` },
          }
        );
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const errorCode = typeof payload?.error === 'string' ? payload.error : undefined;
          return {
            ok: false,
            errorKind: classifyHttpStatus(res.status, errorCode),
            status: res.status,
            errorCode,
          };
        }
        if (!payload?.state) {
          return { ok: false, errorKind: 'retryable', status: res.status, errorCode: 'invalid_payload' };
        }
        return {
          ok: true,
          state: normalizeTamagotchiState(payload.state),
          canonicalState: payload.canonicalState ? normalizeTamagotchiState(payload.canonicalState) : undefined,
          lowpolyAvatarUrl: payload.lowpolyAvatarUrl ?? null,
        };
      } catch {
        return { ok: false, errorKind: 'retryable', status: 0, errorCode: 'network_error' };
      }
    },

    async postMutation(characterId, mutation) {
      const tokenRes = await getValidatedToken();
      if (!tokenRes.ok) {
        return tokenRes;
      }
      const bodyPayload =
        mutation.payload.kind === 'care_game_reward'
          ? {
              kind: 'care_game_reward',
              stat: mutation.payload.stat,
              excellent: mutation.payload.excellent,
              mutationId: mutation.mutationId,
              occurredAt: mutation.occurredAt,
            }
          : mutation.payload.kind === 'innkeeper_trophy'
            ? {
                kind: 'innkeeper_trophy',
                mutationId: mutation.mutationId,
                occurredAt: mutation.occurredAt,
              }
            : mutation.payload.kind === 'set_appearance'
              ? {
                  kind: 'set_appearance',
                  appearance: mutation.payload.appearance,
                  mutationId: mutation.mutationId,
                  occurredAt: mutation.occurredAt,
                }
              : mutation.payload.kind === 'dice_reward'
              ? {
                  kind: 'dice_reward',
                  won: mutation.payload.won,
                  mutationId: mutation.mutationId,
                  occurredAt: mutation.occurredAt,
                }
              : {
                  kind: 'action',
                  action: mutation.payload.action,
                  mutationId: mutation.mutationId,
                  occurredAt: mutation.occurredAt,
                };

      try {
        const res = await fetch(
          `${getBaseUrl()}/api/mobile/characters/${encodeURIComponent(characterId)}/tamagotchi`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenRes.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyPayload),
          }
        );
        const payload = await res.json().catch(() => null);
        if (!res.ok) {
          const errorCode = typeof payload?.error === 'string' ? payload.error : undefined;
          return {
            ok: false,
            errorKind: classifyHttpStatus(res.status, errorCode),
            status: res.status,
            errorCode,
          };
        }
        if (!payload?.state) {
          return { ok: false, errorKind: 'retryable', status: res.status, errorCode: 'invalid_payload' };
        }
        return {
          ok: true,
          state: normalizeTamagotchiState(payload.state),
          canonicalState: payload.canonicalState ? normalizeTamagotchiState(payload.canonicalState) : undefined,
          applied: Boolean(payload.applied),
          deduplicated: Boolean(payload.deduplicated),
          cooldownRemainingMs:
            typeof payload.cooldownRemainingMs === 'number' ? payload.cooldownRemainingMs : 0,
          message: typeof payload.message === 'string' ? payload.message : '',
          lowpolyAvatarUrl: payload.lowpolyAvatarUrl ?? null,
          ...(typeof payload.before === 'number' ? { before: payload.before } : {}),
          ...(typeof payload.after === 'number' ? { after: payload.after } : {}),
          ...(typeof payload.trophyUnlocked === 'boolean' ? { trophyUnlocked: payload.trophyUnlocked } : {}),
        };
      } catch {
        return { ok: false, errorKind: 'retryable', status: 0, errorCode: 'network_error' };
      }
    },
  };
}

export function useCharacterTamagotchi(characterId: string | null, characterName: string, enabled: boolean) {
  const { user } = useAuth();
  const [state, setState] = useState<TamagotchiState>(() => createInitialTamagotchiState());
  const [lowpolyAvatarUrl, setLowpolyAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);
  const [syncSource, setSyncSource] = useState<'server' | 'local'>('local');
  const [pendingCount, setPendingCount] = useState<number>(0);

  const scopeKey = `${user?.id ?? ''}::${characterId ?? ''}`;
  const activeScopeRef = useRef<string>(scopeKey);

  // Reset UI state when account or character changes so previous PG state never leaks
  useEffect(() => {
    activeScopeRef.current = scopeKey;
    setState(createInitialTamagotchiState());
    setLowpolyAvatarUrl(null);
    setLastFeedback(null);
    setSyncSource('local');
    setPendingCount(0);
    setActionLoading(false);
  }, [scopeKey]);

  const loadState = useCallback(async () => {
    if (!enabled || !characterId || !user?.id) {
      setLoading(false);
      return;
    }

    const requestScope = `${user.id}::${characterId}`;
    setLoading(true);
    try {
      const result = await syncTamagotchiState({
        storage: secureStoreAdapter,
        transport: createHttpTransport(user.id),
        userId: user.id,
        characterId,
        characterName: characterName || 'Eroe',
      });

      if (activeScopeRef.current !== requestScope) return;

      setState(result.projectedState);
      setLowpolyAvatarUrl(result.lowpolyAvatarUrl);
      setSyncSource(result.syncSource);
      setPendingCount(result.pendingCount);
      if (result.feedback) {
        setLastFeedback(result.feedback);
      }
    } catch {
      if (activeScopeRef.current === requestScope) {
        setSyncSource('local');
        setLastFeedback('Impossibile leggere i salvataggi della Taverna. Riprova.');
      }
    } finally {
      if (activeScopeRef.current === requestScope) {
        setLoading(false);
      }
    }
  }, [enabled, characterId, user?.id, characterName]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  // Replay pending queue & refresh when app returns to foreground
  useEffect(() => {
    if (!enabled || !characterId || !user?.id) return;
    let prevStatus: AppStateStatus = (AppState.currentState ?? 'active') as AppStateStatus;
    const subscription = AppState.addEventListener('change', (nextStatus) => {
      if (prevStatus !== 'active' && nextStatus === 'active') {
        void loadState();
      }
      prevStatus = nextStatus;
    });
    return () => {
      subscription.remove();
    };
  }, [enabled, characterId, user?.id, loadState]);

  // Periodic retry when offline mutations are queued
  useEffect(() => {
    if (!enabled || !characterId || !user?.id || pendingCount === 0) return;
    const retryTimer = setInterval(() => {
      void loadState();
    }, 30 * 1000);
    return () => clearInterval(retryTimer);
  }, [enabled, characterId, user?.id, pendingCount, loadState]);

  // Periodic decay refresh every 60s while screen is mounted
  useEffect(() => {
    if (!enabled || !characterId) return;
    const timer = setInterval(() => {
      setState((prev) => applyTamagotchiDecay(prev));
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [enabled, characterId]);

  const executeMutation = useCallback(
    async (payload: TamagotchiMutationPayload) => {
      if (!enabled || !characterId || !user?.id || actionLoading) {
        return { applied: false, message: '' };
      }

      const requestScope = `${user.id}::${characterId}`;
      setActionLoading(true);
      try {
        const result = await enqueueAndFlushMutation({
          storage: secureStoreAdapter,
          transport: createHttpTransport(user.id),
          userId: user.id,
          characterId,
          characterName: characterName || 'Eroe',
          payload,
        });

        if (activeScopeRef.current !== requestScope) {
          return { applied: false, message: '' };
        }

        setState(result.projectedState);
        setLowpolyAvatarUrl(result.lowpolyAvatarUrl);
        setSyncSource(result.syncSource);
        setPendingCount(result.pendingCount);
        setLastFeedback(result.message || null);

        return {
          applied: result.applied,
          message: result.message,
          ...(result.before !== undefined ? { before: result.before } : {}),
          ...(result.after !== undefined ? { after: result.after } : {}),
          queued: result.queued ?? (result.applied && result.syncSource === 'local' && result.pendingCount > 0),
          trophyUnlocked:
            payload.kind === 'care_game_reward'
              ? Boolean(result.trophyUnlocked)
              : Boolean(result.projectedState.innkeeperTrophyUnlockedAt),
        };
      } catch {
        const message = 'Impossibile salvare l’azione in locale. Riprova.';
        if (activeScopeRef.current === requestScope) {
          setLastFeedback(message);
        }
        return { applied: false, message };
      } finally {
        if (activeScopeRef.current === requestScope) {
          setActionLoading(false);
        }
      }
    },
    [enabled, characterId, user?.id, actionLoading, characterName]
  );

  const performAction = useCallback(
    async (action: TamagotchiAction): Promise<{ applied: boolean; message: string }> => {
      return executeMutation({ kind: 'action', action });
    },
    [executeMutation]
  );

  const claimInnkeeperTrophy = useCallback(
    () => executeMutation({ kind: 'innkeeper_trophy' }),
    [executeMutation]
  );

  const saveAppearance = useCallback(
    (appearance: TamagotchiAppearance | null) =>
      executeMutation({
        kind: 'set_appearance',
        appearance: normalizeTamagotchiAppearance(appearance) ?? null,
      }),
    [executeMutation]
  );

  const completeCareGame = useCallback(
    (
      stat: TamagotchiCareStat,
      excellent: boolean
    ): Promise<{
      applied: boolean;
      message: string;
      before?: number;
      after?: number;
      queued?: boolean;
      trophyUnlocked?: boolean;
    }> => executeMutation({ kind: 'care_game_reward', stat, excellent }),
    [executeMutation]
  );

  const moodInfo = useMemo(() => deriveTamagotchiMood(state), [state]);

  const getCooldownMinutes = useCallback(
    (action: TamagotchiAction) => {
      const rem = getTamagotchiActionCooldownRemainingMs(state, action);
      return rem > 0 ? Math.ceil(rem / 60000) : 0;
    },
    [state]
  );

  const getCareGameCooldownMinutes = useCallback(
    (stat: TamagotchiCareStat) => {
      const rem = getTamagotchiCareGameCooldownRemainingMs(state, stat);
      return rem > 0 ? Math.ceil(rem / 60000) : 0;
    },
    [state]
  );

  return {
    state,
    moodInfo,
    lowpolyAvatarUrl,
    loading,
    actionLoading,
    lastFeedback,
    syncSource,
    refresh: loadState,
    performAction,
    claimInnkeeperTrophy,
    saveAppearance,
    completeCareGame,
    getCooldownMinutes,
    getCareGameCooldownMinutes,
  };
}
