import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCampaign } from '../contexts/CampaignContext';
import { PlayerSession, SessionSignupStatus } from '../types';
import { enrichPlayerSession, resolveSignupTargetStatus } from '../lib/session-booking';

export function usePlayerSessions(overrideCampaignId?: string | null) {
  const { user, role } = useAuth();
  const { activeCampaignId } = useCampaign();

  const currentCampaignId = overrideCampaignId !== undefined ? overrideCampaignId : activeCampaignId;

  const [allSessions, setAllSessions] = useState<PlayerSession[]>([]);
  const [filterByCampaign, setFilterByCampaign] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightSessionIdsRef = useRef<Set<string>>(new Set());

  const enrichSessions = useCallback(
    (rawSessions: any[]): PlayerSession[] =>
      rawSessions.map((session) => enrichPlayerSession(session, user?.id)),
    [user?.id]
  );

  // Fetch sessions from Supabase (no demo fallback on empty data)
  const fetchSessions = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) {
          setLoading(true);
        }
        setError(null);

        const { data, error: fetchErr } = await supabase
          .from('sessions')
          .select('*, campaigns(id, name, image_url, type), session_signups(id, player_id, status)')
          .order('scheduled_at', { ascending: true });

        if (fetchErr) {
          console.warn('[usePlayerSessions] Errore caricamento sessioni:', fetchErr.message);
          setError('Impossibile caricare le sessioni dal server. Verifica la connessione e riprova.');
          if (!options?.silent) {
            setAllSessions([]);
          }
          return;
        }

        setAllSessions(data && data.length > 0 ? enrichSessions(data) : []);
      } catch (err: any) {
        console.warn('[usePlayerSessions] Eccezione:', err);
        setError(err?.message ?? 'Errore nel caricamento delle sessioni.');
        if (!options?.silent) {
          setAllSessions([]);
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [enrichSessions]
  );

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

  // Sign up for session: verify live capacity, persist first, then refresh confirmed state
  const signUpForSession = useCallback(
    async (sessionId: string): Promise<{ success: boolean; status?: SessionSignupStatus; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: 'Devi essere autenticato per prenotare una sessione.' };
      }

      if (inFlightSessionIdsRef.current.has(sessionId)) {
        return { success: false, error: 'Operazione già in corso per questa sessione.' };
      }

      const targetSession = allSessions.find((s) => s.id === sessionId);
      if (!targetSession) {
        return { success: false, error: 'Sessione non trovata.' };
      }

      inFlightSessionIdsRef.current.add(sessionId);
      try {
        // Re-read current signups & capacity from DB to handle concurrent bookings accurately
        const { data: liveSession, error: liveErr } = await supabase
          .from('sessions')
          .select('id, campaign_id, max_players, status, campaigns(id, type), session_signups(id, player_id, status)')
          .eq('id', sessionId)
          .single();

        if (liveErr || !liveSession) {
          return {
            success: false,
            error: liveErr?.message || 'Impossibile verificare la disponibilità aggiornata della sessione.',
          };
        }

        const liveCampaignType = (liveSession as any)?.campaigns?.type;
        const liveCampaignId = liveSession.campaign_id as string | null;
        if (liveCampaignType === 'long' && liveCampaignId && role !== 'gm' && role !== 'admin') {
          const { data: memberRow } = await supabase
            .from('campaign_members')
            .select('id')
            .eq('campaign_id', liveCampaignId)
            .eq('player_id', user.id)
            .maybeSingle();

          if (!memberRow) {
            return {
              success: false,
              error: 'Per prenotare sessioni di una campagna Long devi prima iscriverti alla campagna.',
            };
          }
        }

        if (liveSession.status !== 'scheduled') {
          await fetchSessions({ silent: true });
          return { success: false, error: 'Questa sessione non è più aperta alle prenotazioni.' };
        }

        const liveSignups = Array.isArray(liveSession.session_signups)
          ? liveSession.session_signups
          : [];
        const existingMine = liveSignups.find((row: any) => row.player_id === user.id);

        if (
          existingMine &&
          (existingMine.status === 'confirmed' ||
            existingMine.status === 'approved' ||
            existingMine.status === 'attended' ||
            existingMine.status === 'waitlist')
        ) {
          await fetchSessions({ silent: true });
          return {
            success: true,
            status: existingMine.status as SessionSignupStatus,
          };
        }

        const targetStatus = resolveSignupTargetStatus(liveSignups, liveSession.max_players);

        if (existingMine) {
          const { error: updErr } = await supabase
            .from('session_signups')
            .update({
              status: targetStatus,
              signed_up_at: new Date().toISOString(),
            })
            .eq('id', existingMine.id);

          if (updErr) {
            console.warn('[signUpForSession] Errore update signup:', updErr.message);
            await fetchSessions({ silent: true });
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
            await fetchSessions({ silent: true });
            return { success: false, error: insErr.message };
          }
        }

        await fetchSessions({ silent: true });
        return { success: true, status: targetStatus };
      } catch (err: any) {
        console.warn('[signUpForSession] Eccezione:', err);
        await fetchSessions({ silent: true });
        return { success: false, error: err?.message || 'Errore durante la prenotazione.' };
      } finally {
        inFlightSessionIdsRef.current.delete(sessionId);
      }
    },
    [allSessions, user?.id, role, fetchSessions]
  );

  // Cancel sign up: persist first, then refresh confirmed state
  const cancelSignUp = useCallback(
    async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: 'Devi essere autenticato per annullare la prenotazione.' };
      }

      if (inFlightSessionIdsRef.current.has(sessionId)) {
        return { success: false, error: 'Operazione già in corso per questa sessione.' };
      }

      inFlightSessionIdsRef.current.add(sessionId);
      try {
        const { error: delErr } = await supabase
          .from('session_signups')
          .update({ status: 'cancelled' })
          .eq('session_id', sessionId)
          .eq('player_id', user.id);

        if (delErr) {
          console.warn('[cancelSignUp] Errore cancel signup:', delErr.message);
          await fetchSessions({ silent: true });
          return { success: false, error: delErr.message };
        }

        await fetchSessions({ silent: true });
        return { success: true };
      } catch (err: any) {
        console.warn('[cancelSignUp] Eccezione:', err);
        await fetchSessions({ silent: true });
        return { success: false, error: err?.message || 'Errore durante la disdetta.' };
      } finally {
        inFlightSessionIdsRef.current.delete(sessionId);
      }
    },
    [user?.id, fetchSessions]
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
    refresh: () => fetchSessions(),
    signUpForSession,
    cancelSignUp,
  };
}

export default usePlayerSessions;
