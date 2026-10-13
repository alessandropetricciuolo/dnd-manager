import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCampaign } from '../contexts/CampaignContext';
import { PlayerSession, SessionSignup, SessionSignupStatus } from '../types';

export function usePlayerSessions(overrideCampaignId?: string | null) {
  const { user } = useAuth();
  const { activeCampaignId } = useCampaign();

  const currentCampaignId = overrideCampaignId !== undefined ? overrideCampaignId : activeCampaignId;

  const [allSessions, setAllSessions] = useState<PlayerSession[]>([]);
  const [filterByCampaign, setFilterByCampaign] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Normalize session rows adding mySignup and occupancy indicators
  const enrichSessions = useCallback(
    (rawSessions: any[]): PlayerSession[] => {
      const currentUserId = user?.id;

      return rawSessions.map((session) => {
        const signups: SessionSignup[] = Array.isArray(session.session_signups)
          ? session.session_signups
          : [];

        // Find active signup for current user (ignoring cancelled)
        const mySignup = currentUserId
          ? signups.find(
              (s) => s.player_id === currentUserId && s.status !== 'cancelled'
            ) ?? null
          : null;

        const confirmedCount = signups.filter(
          (s) => s.status === 'confirmed' || s.status === 'approved' || s.status === 'attended'
        ).length;

        const isFull = confirmedCount >= (session.max_players ?? 6);
        const isConfirmed = mySignup?.status === 'confirmed' || mySignup?.status === 'approved' || mySignup?.status === 'attended';
        const isWaitlist = mySignup?.status === 'waitlist';

        return {
          ...session,
          session_signups: signups,
          mySignup,
          confirmedCount,
          isConfirmed,
          isWaitlist,
          isFull,
        };
      });
    },
    [user?.id]
  );

  // Fetch sessions from Supabase
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('sessions')
        .select('*, campaigns(id, name, image_url), session_signups(id, player_id, status)')
        .order('scheduled_at', { ascending: true });

      if (fetchErr) {
        console.warn('[usePlayerSessions] Errore caricamento sessioni:', fetchErr.message);
        setError(fetchErr.message);
        setAllSessions([]);
        return;
      }

      if (data && data.length > 0) {
        setAllSessions(enrichSessions(data));
      } else {
        setAllSessions([]);
      }
    } catch (err: any) {
      console.warn('[usePlayerSessions] Eccezione:', err);
      setError(err?.message ?? 'Errore nel caricamento delle sessioni');
      setAllSessions([]);
    } finally {
      setLoading(false);
    }
  }, [enrichSessions]);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // Sessions filtered by currently selected campaign
  const campaignSessions = useMemo<PlayerSession[]>(() => {
    if (!currentCampaignId) return allSessions;
    return allSessions.filter((s) => s.campaign_id === currentCampaignId);
  }, [allSessions, currentCampaignId]);

  // Active sessions shown according to filterByCampaign toggle
  const sessions = useMemo<PlayerSession[]>(() => {
    if (filterByCampaign && currentCampaignId) {
      return campaignSessions;
    }
    return allSessions;
  }, [filterByCampaign, currentCampaignId, campaignSessions, allSessions]);

  // Sign up for session
  const signUpForSession = useCallback(
    async (sessionId: string): Promise<{ success: boolean; status?: SessionSignupStatus; error?: string }> => {
      const targetSession = allSessions.find((s) => s.id === sessionId);
      if (!targetSession) {
        return { success: false, error: 'Sessione non trovata' };
      }

      const isFull = (targetSession.confirmedCount ?? 0) >= (targetSession.max_players ?? 6);
      const targetStatus: SessionSignupStatus = isFull ? 'waitlist' : 'confirmed';
      const playerId = user?.id || 'demo-player-id';

      // Optimistic update
      setAllSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const existing = s.session_signups || [];
          const filtered = existing.filter((item) => item.player_id !== playerId);
          const newSignup: SessionSignup = {
            id: `signup-opt-${Date.now()}`,
            session_id: sessionId,
            player_id: playerId,
            status: targetStatus,
            signed_up_at: new Date().toISOString(),
          };
          const nextSignups = [...filtered, newSignup];
          const nextConfirmedCount = nextSignups.filter(
            (it) => it.status === 'confirmed' || it.status === 'approved'
          ).length;

          return {
            ...s,
            session_signups: nextSignups,
            mySignup: newSignup,
            confirmedCount: nextConfirmedCount,
            isConfirmed: targetStatus === 'confirmed',
            isWaitlist: targetStatus === 'waitlist',
            isFull: nextConfirmedCount >= (s.max_players ?? 6),
          };
        })
      );

      // Persist to Supabase
      if (user?.id) {
        try {
          const { data: existingRows } = await supabase
            .from('session_signups')
            .select('id')
            .eq('session_id', sessionId)
            .eq('player_id', user.id);

          if (existingRows && existingRows.length > 0) {
            const { error: updErr } = await supabase
              .from('session_signups')
              .update({
                status: targetStatus,
                signed_up_at: new Date().toISOString(),
              })
              .eq('id', existingRows[0].id);

            if (updErr) {
              console.warn('[signUpForSession] Errore update signup:', updErr.message);
              return { success: false, error: updErr.message };
            }
          } else {
            const { error: insErr } = await supabase.from('session_signups').insert({
              session_id: sessionId,
              player_id: user.id,
              status: targetStatus,
              signed_up_at: new Date().toISOString(),
            });

            if (insErr) {
              console.warn('[signUpForSession] Errore insert signup:', insErr.message);
              return { success: false, error: insErr.message };
            }
          }
        } catch (err: any) {
          console.warn('[signUpForSession] Eccezione:', err);
          return { success: false, error: err?.message };
        }
      }

      return { success: true, status: targetStatus };
    },
    [allSessions, user?.id]
  );

  // Cancel sign up
  const cancelSignUp = useCallback(
    async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
      const playerId = user?.id || 'demo-player-id';

      // Optimistic update
      setAllSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s;
          const existing = s.session_signups || [];
          const updatedSignups = existing.map((item) => {
            if (item.player_id === playerId) {
              return { ...item, status: 'cancelled' as SessionSignupStatus };
            }
            return item;
          });
          const nextConfirmedCount = updatedSignups.filter(
            (it) => it.status === 'confirmed' || it.status === 'approved'
          ).length;

          return {
            ...s,
            session_signups: updatedSignups,
            mySignup: null,
            confirmedCount: nextConfirmedCount,
            isConfirmed: false,
            isWaitlist: false,
            isFull: nextConfirmedCount >= (s.max_players ?? 6),
          };
        })
      );

      // Persist to Supabase
      if (user?.id) {
        try {
          const { error: delErr } = await supabase
            .from('session_signups')
            .update({ status: 'cancelled' })
            .eq('session_id', sessionId)
            .eq('player_id', user.id);

          if (delErr) {
            console.warn('[cancelSignUp] Errore cancel signup:', delErr.message);
            return { success: false, error: delErr.message };
          }
        } catch (err: any) {
          console.warn('[cancelSignUp] Eccezione:', err);
          return { success: false, error: err?.message };
        }
      }

      return { success: true };
    },
    [user?.id]
  );

  // Upcoming confirmed session for the player
  const nextConfirmedSession = useMemo<PlayerSession | null>(() => {
    const now = new Date();
    const sourceSessions = currentCampaignId ? campaignSessions : allSessions;

    const futureConfirmed = sourceSessions
      .filter(
        (s) =>
          s.status === 'scheduled' &&
          s.isConfirmed &&
          new Date(s.scheduled_at) > now
      )
      .sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );

    if (futureConfirmed.length > 0) {
      return futureConfirmed[0];
    }

    const upcoming = sourceSessions
      .filter((s) => s.status === 'scheduled' && new Date(s.scheduled_at) > now)
      .sort(
        (a, b) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );

    return upcoming[0] ?? null;
  }, [currentCampaignId, campaignSessions, allSessions]);

  return {
    sessions,
    allSessions,
    campaignSessions,
    filterByCampaign,
    setFilterByCampaign,
    nextConfirmedSession,
    loading,
    error,
    refresh: fetchSessions,
    signUpForSession,
    cancelSignUp,
  };
}

export default usePlayerSessions;
