import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCampaign } from '../contexts/CampaignContext';
import { PlayerSession, SessionFeedbackEntry, SessionSignupStatus } from '../types';
import {
  canPlayerSeeCompletedSession,
  enrichPlayerSession,
  resolveSignupTargetStatus,
  validateSessionFeedbackPayload,
} from '../lib/session-booking';

export function usePlayerSessions(overrideCampaignId?: string | null) {
  const { user, role, reviewCampaignId } = useAuth();
  const { activeCampaignId } = useCampaign();

  const currentCampaignId = overrideCampaignId !== undefined ? overrideCampaignId : activeCampaignId;
  const isGmOrAdmin = role === 'gm' || role === 'admin';

  const [rawAllSessions, setRawAllSessions] = useState<PlayerSession[]>([]);
  const [memberPartyByCampaignId, setMemberPartyByCampaignId] = useState<Record<string, string | null>>({});
  const [feedbackBySessionId, setFeedbackBySessionId] = useState<Record<string, SessionFeedbackEntry>>({});
  const [filterByCampaign, setFilterByCampaign] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightSessionIdsRef = useRef<Set<string>>(new Set());

  const enrichSessions = useCallback(
    (rawSessions: any[]): PlayerSession[] =>
      rawSessions.map((session) => enrichPlayerSession(session, user?.id)),
    [user?.id]
  );

  // Fetch sessions, party membership, and feedback from Supabase
  const fetchSessions = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        if (!options?.silent) {
          setLoading(true);
        }
        setError(null);

        const sessionsQuery = supabase
          .from('sessions')
          .select(
            '*, campaigns(id, name, image_url, type), campaign_parties(name, color), session_signups(id, player_id, status)'
          )
          .order('scheduled_at', { ascending: true });
        if (reviewCampaignId) sessionsQuery.eq('campaign_id', reviewCampaignId);

        const memberPromise = user?.id
          ? supabase
              .from('campaign_members')
              .select('campaign_id, party_id')
              .eq('player_id', user.id)
          : Promise.resolve({ data: [] as any[], error: null });

        const feedbackPromise = user?.id
          ? supabase
              .from('session_feedback')
              .select('session_id, campaign_id, session_rating, campaign_rating, comment, updated_at')
              .eq('player_id', user.id)
          : Promise.resolve({ data: [] as any[], error: null });

        const [sessionsRes, memberRes, feedbackRes] = await Promise.all([
          sessionsQuery,
          memberPromise,
          feedbackPromise,
        ]);

        let sessionRows = sessionsRes.data;
        let fetchErr = sessionsRes.error;

        // Fallback if campaign_parties relationship is unavailable in local cache
        if (fetchErr) {
          const fallbackQuery = supabase
            .from('sessions')
            .select('*, campaigns(id, name, image_url, type), session_signups(id, player_id, status)')
            .order('scheduled_at', { ascending: true });
          if (reviewCampaignId) fallbackQuery.eq('campaign_id', reviewCampaignId);
          const fallbackRes = await fallbackQuery;
          sessionRows = fallbackRes.data;
          fetchErr = fallbackRes.error;
        }

        if (fetchErr) {
          console.warn('[usePlayerSessions] Errore caricamento sessioni:', fetchErr.message);
          setError('Impossibile caricare le sessioni dal server. Verifica la connessione e riprova.');
          if (!options?.silent) {
            setRawAllSessions([]);
          }
          return;
        }

        const partyMap: Record<string, string | null> = {};
        for (const m of (memberRes.data ?? []) as any[]) {
          if (m.campaign_id) {
            partyMap[String(m.campaign_id)] = m.party_id ? String(m.party_id) : null;
          }
        }
        setMemberPartyByCampaignId(partyMap);

        const fbMap: Record<string, SessionFeedbackEntry> = {};
        for (const f of (feedbackRes.data ?? []) as any[]) {
          if (f.session_id) {
            fbMap[String(f.session_id)] = {
              session_id: String(f.session_id),
              campaign_id: String(f.campaign_id ?? ''),
              session_rating: Number(f.session_rating ?? 0),
              campaign_rating: Number(f.campaign_rating ?? 0),
              comment: typeof f.comment === 'string' ? f.comment : null,
              updated_at: String(f.updated_at ?? ''),
            };
          }
        }
        setFeedbackBySessionId(fbMap);

        setRawAllSessions(sessionRows && sessionRows.length > 0 ? enrichSessions(sessionRows) : []);
      } catch (err: any) {
        console.warn('[usePlayerSessions] Eccezione:', err);
        setError(err?.message ?? 'Errore nel caricamento delle sessioni.');
        if (!options?.silent) {
          setRawAllSessions([]);
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [enrichSessions, user?.id, reviewCampaignId]
  );

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // Apply Long campaign party visibility rules for completed sessions (parity with Web getCompletedSessionsForCurrentUser)
  const allSessions = useMemo<PlayerSession[]>(() => {
    return rawAllSessions.filter((s) =>
      canPlayerSeeCompletedSession(s, {
        isGmOrAdmin,
        memberPartyByCampaignId,
      })
    );
  }, [rawAllSessions, isGmOrAdmin, memberPartyByCampaignId]);

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

  // Completed attended sessions awaiting feedback in current scope
  const pendingFeedbackSessions = useMemo<PlayerSession[]>(() => {
    return sessions
      .filter(
        (s) =>
          s.status === 'completed' &&
          s.mySignup?.status === 'attended' &&
          Boolean(s.campaign_id) &&
          !feedbackBySessionId[s.id]
      )
      .sort(
        (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
      );
  }, [sessions, feedbackBySessionId]);

  // Sign up for session: verify live capacity, persist first, then refresh confirmed state
  const signUpForSession = useCallback(
    async (sessionId: string): Promise<{ success: boolean; status?: SessionSignupStatus; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: 'Devi essere autenticato per prenotare una sessione.' };
      }

      if (inFlightSessionIdsRef.current.has(sessionId)) {
        return { success: false, error: 'Operazione già in corso per questa sessione.' };
      }

      const targetSession = rawAllSessions.find((s) => s.id === sessionId);
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
    [rawAllSessions, user?.id, role, fetchSessions]
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

  // Submit or update post-session feedback (session_feedback upsert)
  const submitFeedback = useCallback(
    async (
      sessionId: string,
      campaignId: string,
      payload: { sessionRating: number; campaignRating: number; comment?: string | null }
    ): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) {
        return { success: false, error: 'Devi essere autenticato per inviare il feedback.' };
      }
      if (!campaignId) {
        return { success: false, error: 'Campagna non associata alla sessione.' };
      }

      const validated = validateSessionFeedbackPayload(payload);
      if (!validated.valid) {
        return { success: false, error: validated.error };
      }

      try {
        const { error: upsertErr } = await supabase.from('session_feedback').upsert(
          {
            session_id: sessionId,
            campaign_id: campaignId,
            player_id: user.id,
            session_rating: validated.sessionRating,
            campaign_rating: validated.campaignRating,
            comment: validated.comment,
          },
          { onConflict: 'session_id,player_id' }
        );

        if (upsertErr) {
          console.warn('[submitFeedback] Errore upsert:', upsertErr.message);
          return {
            success: false,
            error: upsertErr.message || 'Impossibile salvare il feedback. Verifica di aver partecipato alla sessione.',
          };
        }

        setFeedbackBySessionId((prev) => ({
          ...prev,
          [sessionId]: {
            session_id: sessionId,
            campaign_id: campaignId,
            session_rating: validated.sessionRating,
            campaign_rating: validated.campaignRating,
            comment: validated.comment,
            updated_at: new Date().toISOString(),
          },
        }));
        return { success: true };
      } catch (err: any) {
        console.warn('[submitFeedback] Eccezione:', err);
        return { success: false, error: err?.message || 'Errore imprevisto durante il salvataggio.' };
      }
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
    feedbackBySessionId,
    pendingFeedbackSessions,
    filterByCampaign,
    setFilterByCampaign,
    nextConfirmedSession,
    loading,
    error,
    refresh: () => fetchSessions(),
    signUpForSession,
    cancelSignUp,
    submitFeedback,
  };
}

export default usePlayerSessions;
