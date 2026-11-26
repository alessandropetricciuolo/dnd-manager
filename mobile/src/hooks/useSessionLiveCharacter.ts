import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../api/supabase';
import { SESSION_LIVE_CHARACTER_TABLE, type SessionLiveProjection } from '../lib/session-live';

export function useSessionLiveCharacter(characterId: string | undefined, userId: string | undefined, onEnd: () => void) {
  const [state, setState] = useState<{ id: string; userId: string; row: SessionLiveProjection | null; stale: boolean }>();
  const stateRef = useRef(state);
  stateRef.current = state;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  useFocusEffect(useCallback(() => {
    if (!characterId || !userId) return;
    let open = true;
    let query = 0;
    const refresh = async () => {
      const revision = ++query;
      const { data, error } = await supabase.from(SESSION_LIVE_CHARACTER_TABLE)
        .select('character_id,active,resources')
        .eq('character_id', characterId).eq('active', true).maybeSingle();
      if (!open || revision !== query) return;
      const previous = stateRef.current;
      if (error) {
        if (previous?.id === characterId && previous.userId === userId && previous.row) {
          setState({ ...previous, stale: true });
        }
        return;
      }
      const next = { id: characterId, userId, row: data as SessionLiveProjection | null, stale: false };
      stateRef.current = next;
      setState(next);
      if (!data && previous?.id === characterId && previous.userId === userId && previous.row) {
        onEndRef.current();
      }
    };
    const filter = { schema: 'public', table: SESSION_LIVE_CHARACTER_TABLE, filter: `character_id=eq.${characterId}` };
    const channel = supabase.channel(`session-live-sheet:${characterId}`)
      .on('postgres_changes', { ...filter, event: 'INSERT' }, () => void refresh())
      .on('postgres_changes', { ...filter, event: 'UPDATE' }, () => void refresh())
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void refresh();
        else if (status !== 'CLOSED') {
          const previous = stateRef.current;
          if (open && previous?.id === characterId && previous.userId === userId && previous.row) {
            setState({ ...previous, stale: true });
          }
        }
      });
    void refresh();
    // A revoked assignment can no longer receive row events under RLS.
    const poll = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, 15_000);
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => {
      open = false;
      clearInterval(poll);
      appState.remove();
      void supabase.removeChannel(channel);
    };
  }, [characterId, userId]));

  return state?.id === characterId && state?.userId === userId ? state : undefined;
}
