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
        .select('*, campaigns(id, name, image_url, type), session_signups(id, player_id, status)')
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
        const today = new Date();
        const d1 = new Date(today);
        d1.setDate(today.getDate() + 1);
        d1.setHours(20, 30, 0, 0);

        const d2 = new Date(today);
        d2.setDate(today.getDate() + 4);
        d2.setHours(19, 0, 0, 0);

        const d3 = new Date(today);
        d3.setDate(today.getDate() + 8);
        d3.setHours(21, 0, 0, 0);

        const sampleRaw = [
          {
            id: 'demo-session-1',
            campaign_id: 'demo-camp-1',
            title: 'La Cripta dei Sussurri',
            description: 'Esplorazione del dungeon sotto la vecchia cattedrale.',
            scheduled_at: d1.toISOString(),
            duration_hours: 3.5,
            max_players: 5,
            status: 'scheduled',
            location: 'Tavolo Rosso - Sala Centrale',
            campaigns: { id: 'demo-camp-1', name: 'Le Ombre di Waterdeep', image_url: null, type: 'long' },
            session_signups: [
              { id: 's1', session_id: 'demo-session-1', player_id: 'p1', status: 'confirmed' },
              { id: 's2', session_id: 'demo-session-1', player_id: 'p2', status: 'confirmed' },
            ],
          },
          {
            id: 'demo-session-2',
            campaign_id: 'demo-camp-2',
            title: "L'Assedio alla Fortezza Nanica",
            description: "Battaglia campale contro l'orda dei goblin.",
            scheduled_at: d2.toISOString(),
            duration_hours: 4,
            max_players: 6,
            status: 'scheduled',
            location: 'Tavolo Verde',
            campaigns: { id: 'demo-camp-2', name: 'La Corona di Pietra', image_url: null, type: 'quest' },
            session_signups: [
              { id: 's3', session_id: 'demo-session-2', player_id: 'p3', status: 'confirmed' },
            ],
          },
          {
            id: 'demo-session-3',
            campaign_id: 'demo-camp-1',
            title: 'Il Patto col Drago di Giada',
            description: 'Negoziazione ad alta tensione nelle terre selvagge.',
            scheduled_at: d3.toISOString(),
            duration_hours: 4,
            max_players: 4,
            status: 'scheduled',
            location: 'Tavolo Oro - Privé',
            campaigns: { id: 'demo-camp-1', name: 'Le Ombre di Waterdeep', image_url: null, type: 'oneshot' },
            session_signups: [
              { id: 's4', session_id: 'demo-session-3', player_id: 'p4', status: 'confirmed' },
              { id: 's5', session_id: 'demo-session-3', player_id: 'p5', status: 'confirmed' },
              { id: 's6', session_id: 'demo-session-3', player_id: 'p6', status: 'confirmed' },
              { id: 's7', session_id: 'demo-session-3', player_id: 'p7', status: 'confirmed' },
            ],
          },
        ];
        setAllSessions(enrichSessions(sampleRaw));
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
