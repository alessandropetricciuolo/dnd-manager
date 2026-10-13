import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthContext';
import { useCampaign } from './CampaignContext';
import { Campaign, Session, Character, CreateSessionInput, UpdateSessionInput, SessionSignupDetail, SessionSignupStatus } from '../types';

export interface GmCampaignCandidate {
  playerId: string;
  name: string;
  avatarUrl: string | null;
  characterName?: string;
  characterClass?: string;
  characterLevel?: number;
}

export interface GmCampaignContextType {
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  sessions: Session[];
  activeSession: Session | null;
  characters: Character[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  selectCampaign: (campaignId: string) => Promise<void>;
  selectSession: (sessionId: string) => void;
  refreshCampaigns: () => Promise<void>;
  refreshSessionData: () => Promise<void>;
  updateCharacterHp: (characterId: string, nextHp: number) => Promise<boolean>;
  updateCharacterXp: (characterId: string, newTotalXp: number) => Promise<boolean>;
  // Session Creation & Management
  createSession: (data: CreateSessionInput) => Promise<{ success: boolean; session?: Session; error?: string }>;
  updateSession: (sessionId: string, data: UpdateSessionInput) => Promise<{ success: boolean; error?: string }>;
  deleteSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  // Signups Management
  fetchSessionSignups: (sessionId: string) => Promise<SessionSignupDetail[]>;
  updateSignupStatus: (signupId: string, status: SessionSignupStatus) => Promise<{ success: boolean; error?: string }>;
  removeSignup: (signupId: string) => Promise<{ success: boolean; error?: string }>;
  addPlayerToSession: (sessionId: string, playerId: string) => Promise<{ success: boolean; error?: string }>;
  fetchCampaignCandidates: (sessionId: string) => Promise<GmCampaignCandidate[]>;
}

const GmCampaignContext = createContext<GmCampaignContextType | undefined>(undefined);

export const GmCampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const {
    campaigns,
    activeCampaign,
    selectCampaign: selectGlobalCampaign,
    refreshCampaigns: refreshGlobalCampaigns,
  } = useCampaign();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [demoSignupsMap, setDemoSignupsMap] = useState<Record<string, SessionSignupDetail[]>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load Sessions and Characters for the active campaign
  const loadCampaignDetails = useCallback(async (campaignId: string) => {
    try {
      if (campaignId.startsWith('demo-')) {
        setSessions([]);
        setActiveSession(null);
        setCharacters([]);
        return;
      }

      // Fetch real sessions for this campaign
      const { data: sessionRows, error: sessErr } = await supabase
        .from('sessions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('scheduled_at', { ascending: false });

      if (sessErr) {
        console.warn('[GmCampaignContext] sessions error:', sessErr.message);
      }

      const loadedSessions: Session[] = (sessionRows as Session[]) || [];
      setSessions(loadedSessions);

      // Default active session: earliest upcoming scheduled, or first, or null
      const scheduledSessions = loadedSessions.filter((s) => s.status === 'scheduled');
      const preferred =
        scheduledSessions.length > 0
          ? scheduledSessions[scheduledSessions.length - 1]
          : loadedSessions[0] || null;
      setActiveSession(preferred);

      // Fetch all characters in this campaign (for combat tracker, attendance, XP)
      const { data: charRows, error: charErr } = await supabase
        .from('campaign_characters')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name', { ascending: true });

      if (charErr) {
        console.warn('[GmCampaignContext] characters error:', charErr.message);
      }

      setCharacters((charRows as Character[]) || []);
    } catch (err: any) {
      console.warn('[GmCampaignContext] loadCampaignDetails catch:', err);
    }
  }, []);

  // When activeCampaign changes, reload sessions and characters
  useEffect(() => {
    if (activeCampaign?.id) {
      setIsLoading(true);
      loadCampaignDetails(activeCampaign.id).finally(() => {
        setIsLoading(false);
      });
    }
  }, [activeCampaign?.id, loadCampaignDetails]);

  // Select campaign
  const selectCampaign = useCallback(
    async (campaignId: string) => {
      await selectGlobalCampaign(campaignId);
      await loadCampaignDetails(campaignId);
    },
    [selectGlobalCampaign, loadCampaignDetails]
  );

  // Select session
  const selectSession = useCallback(
    (sessionId: string) => {
      const target = sessions.find((s) => s.id === sessionId);
      if (target) {
        setActiveSession(target);
      }
    },
    [sessions]
  );

  // Refresh current campaign session/characters data
  const refreshSessionData = useCallback(async () => {
    if (activeCampaign) {
      setIsRefreshing(true);
      await loadCampaignDetails(activeCampaign.id);
      setIsRefreshing(false);
    }
  }, [activeCampaign, loadCampaignDetails]);

  // Save character HP through the revision-checked mobile endpoint before updating local UI.
  const updateCharacterHp = useCallback(
    async (characterId: string, nextHp: number): Promise<boolean> => {
      const clamped = Math.max(0, nextHp);

      // Demo characters are local-only
      if (characterId.startsWith('char-')) {
        setCharacters((prev) =>
          prev.map((c) => (c.id === characterId ? { ...c, hit_points: clamped } : c))
        );
        return true;
      }

      try {
        const current = characters.find((character) => character.id === characterId);
        if (!current?.updated_at) return false;
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) return false;

        const baseUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');
        const response = await fetch(
          `${baseUrl}/api/mobile/characters/${encodeURIComponent(characterId)}/state`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              expectedUpdatedAt: current.updated_at,
              operation: { type: 'hp', hitPoints: clamped },
            }),
            signal: AbortSignal.timeout(15000),
          }
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.character) {
          console.warn('[GmCampaignContext] updateCharacterHp rejected:', response.status, payload.error);
          return false;
        }

        setCharacters((prev) =>
          prev.map((character) =>
            character.id === characterId ? { ...character, ...payload.character } : character
          )
        );
        return true;
      } catch (e) {
        console.warn('[GmCampaignContext] updateCharacterHp exception:', e);
        return false;
      }
    },
    [characters]
  );

  // Quick update character XP
  const updateCharacterXp = useCallback(
    async (characterId: string, newTotalXp: number): Promise<boolean> => {
      const clamped = Math.max(0, Math.floor(newTotalXp));

      setCharacters((prev) =>
        prev.map((c) => (c.id === characterId ? { ...c, current_xp: clamped } : c))
      );

      if (characterId.startsWith('char-')) {
        return true;
      }

      try {
        const { error: updErr } = await supabase
          .from('campaign_characters')
          .update({ current_xp: clamped })
          .eq('id', characterId);

        if (updErr) {
          console.warn('[GmCampaignContext] updateCharacterXp error:', updErr.message);
          return false;
        }
        return true;
      } catch (e) {
        console.warn('[GmCampaignContext] updateCharacterXp exception:', e);
        return false;
      }
    },
    []
  );

  // 1. Create a session
  const createSession = useCallback(
    async (input: CreateSessionInput): Promise<{ success: boolean; session?: Session; error?: string }> => {
      try {
        if (!input.title?.trim()) {
          return { success: false, error: 'Il titolo della sessione è obbligatorio.' };
        }
        if (!input.campaign_id) {
          return { success: false, error: 'ID campagna mancante.' };
        }

        const isDemo = input.campaign_id.startsWith('demo-');

        if (isDemo) {
          const newSession: Session = {
            id: `demo-session-${Date.now()}`,
            campaign_id: input.campaign_id,
            title: input.title.trim(),
            scheduled_at: input.scheduled_at,
            status: 'scheduled',
            max_players: input.max_players || 6,
            notes: input.notes || null,
            location: input.location || 'Tavolo 1 - Taverna del Barbiere',
            dm_id: input.dm_id || user?.id || 'gm-demo-user',
            session_summary: null,
            gm_private_notes: input.gm_private_notes || null,
            is_pre_closed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          setSessions((prev) => [newSession, ...prev]);
          setActiveSession(newSession);
          setDemoSignupsMap((prev) => ({
            ...prev,
            [newSession.id]: [],
          }));

          return { success: true, session: newSession };
        }

        const { data, error: insertErr } = await supabase
          .from('sessions')
          .insert({
            campaign_id: input.campaign_id,
            title: input.title.trim(),
            scheduled_at: input.scheduled_at,
            status: 'scheduled',
            max_players: input.max_players || 6,
            notes: input.notes || null,
            location: input.location || null,
            gm_private_notes: input.gm_private_notes || null,
            dm_id: input.dm_id || user?.id || null,
          })
          .select('*')
          .single();

        if (insertErr || !data) {
          console.error('[GmCampaignContext] createSession error:', insertErr);
          return { success: false, error: insertErr?.message || 'Errore durante la creazione della sessione' };
        }

        const created = data as Session;
        setSessions((prev) => [created, ...prev]);
        setActiveSession(created);
        return { success: true, session: created };
      } catch (err: any) {
        console.error('[GmCampaignContext] createSession exception:', err);
        return { success: false, error: err?.message || 'Errore imprevisto' };
      }
    },
    [user?.id]
  );

  // 2. Update an existing session
  const updateSession = useCallback(
    async (sessionId: string, input: UpdateSessionInput): Promise<{ success: boolean; error?: string }> => {
      try {
        setSessions((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, ...input, updated_at: new Date().toISOString() } : s))
        );
        if (activeSession?.id === sessionId) {
          setActiveSession((prev) =>
            prev ? { ...prev, ...input, updated_at: new Date().toISOString() } : null
          );
        }

        if (sessionId.startsWith('demo-')) {
          return { success: true };
        }

        const { error: updErr } = await supabase
          .from('sessions')
          .update(input)
          .eq('id', sessionId);

        if (updErr) {
          console.error('[GmCampaignContext] updateSession error:', updErr);
          return { success: false, error: updErr.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Errore imprevisto' };
      }
    },
    [activeSession?.id]
  );

  // 3. Delete a session
  const deleteSession = useCallback(
    async (sessionId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setSessions((prev) => {
          const next = prev.filter((s) => s.id !== sessionId);
          if (activeSession?.id === sessionId) {
            setActiveSession(next[0] || null);
          }
          return next;
        });

        if (sessionId.startsWith('demo-')) {
          setDemoSignupsMap((prev) => {
            const copy = { ...prev };
            delete copy[sessionId];
            return copy;
          });
          return { success: true };
        }

        const { error: delErr } = await supabase
          .from('sessions')
          .delete()
          .eq('id', sessionId);

        if (delErr) {
          console.error('[GmCampaignContext] deleteSession error:', delErr);
          return { success: false, error: delErr.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Errore imprevisto' };
      }
    },
    [activeSession?.id]
  );

  // 4. Fetch signups for a session
  const fetchSessionSignups = useCallback(
    async (sessionId: string): Promise<SessionSignupDetail[]> => {
      try {
        if (sessionId.startsWith('demo-')) {
          return demoSignupsMap[sessionId] || [];
        }

        const { data: signups, error: signupsErr } = await supabase
          .from('session_signups')
          .select('*')
          .eq('session_id', sessionId)
          .order('signed_up_at', { ascending: true });

        if (signupsErr || !signups) {
          console.warn('[GmCampaignContext] fetchSessionSignups error:', signupsErr?.message);
          return demoSignupsMap[sessionId] || [];
        }

        const playerIds = signups.map((s) => s.player_id).filter(Boolean);
        const profilesMap: Record<string, any> = {};
        if (playerIds.length > 0) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id, display_name, first_name, last_name, nickname, username, avatar_url')
            .in('id', playerIds);
          if (profs) {
            profs.forEach((p) => {
              profilesMap[p.id] = p;
            });
          }
        }

        // Map characters belonging to this campaign
        const charsMap: Record<string, Character> = {};
        characters.forEach((c) => {
          if (c.assigned_to) {
            charsMap[c.assigned_to] = c;
          }
        });

        const details: SessionSignupDetail[] = signups.map((s: any) => {
          const prof = profilesMap[s.player_id] || null;
          const char = charsMap[s.player_id] || null;
          const realName = prof
            ? prof.display_name ||
              [prof.first_name, prof.last_name].filter(Boolean).join(' ') ||
              prof.nickname ||
              prof.username ||
              'Giocatore'
            : null;

          return {
            id: s.id,
            session_id: s.session_id,
            player_id: s.player_id,
            status: s.status as SessionSignupStatus,
            signed_up_at: s.signed_up_at || s.created_at,
            created_at: s.created_at,
            playerProfile: prof
              ? {
                  id: prof.id,
                  display_name: realName,
                  nickname: prof.nickname || realName,
                  avatar_url: prof.avatar_url,
                }
              : null,
            character: char
              ? {
                  id: char.id,
                  name: char.name,
                  level: char.level || 1,
                  character_class: char.character_class,
                  class_subclass: char.class_subclass,
                  image_url: char.image_url,
                  armor_class: char.armor_class,
                  hit_points: char.hit_points,
                }
              : null,
          };
        });

        return details;
      } catch (e) {
        console.warn('[GmCampaignContext] fetchSessionSignups catch:', e);
        return demoSignupsMap[sessionId] || [];
      }
    },
    [characters, demoSignupsMap]
  );

  // 5. Update signup status
  const updateSignupStatus = useCallback(
    async (signupId: string, status: SessionSignupStatus): Promise<{ success: boolean; error?: string }> => {
      try {
        setDemoSignupsMap((prev) => {
          const updated: Record<string, SessionSignupDetail[]> = {};
          for (const [sessId, list] of Object.entries(prev)) {
            updated[sessId] = list.map((su) => (su.id === signupId ? { ...su, status } : su));
          }
          return updated;
        });

        if (signupId.startsWith('su-demo-') || signupId.startsWith('su-local-')) {
          return { success: true };
        }

        const { error: updErr } = await supabase
          .from('session_signups')
          .update({ status })
          .eq('id', signupId);

        if (updErr) {
          console.error('[GmCampaignContext] updateSignupStatus error:', updErr);
          return { success: false, error: updErr.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Errore imprevisto' };
      }
    },
    []
  );

  // 6. Remove a signup
  const removeSignup = useCallback(
    async (signupId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setDemoSignupsMap((prev) => {
          const updated: Record<string, SessionSignupDetail[]> = {};
          for (const [sessId, list] of Object.entries(prev)) {
            updated[sessId] = list.filter((su) => su.id !== signupId);
          }
          return updated;
        });

        if (signupId.startsWith('su-demo-') || signupId.startsWith('su-local-')) {
          return { success: true };
        }

        const { error: delErr } = await supabase
          .from('session_signups')
          .delete()
          .eq('id', signupId);

        if (delErr) {
          console.error('[GmCampaignContext] removeSignup error:', delErr);
          return { success: false, error: delErr.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Errore imprevisto' };
      }
    },
    []
  );

  // 7. Add player to session directly as approved
  const addPlayerToSession = useCallback(
    async (sessionId: string, playerId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const char = characters.find((c) => c.assigned_to === playerId || c.id === playerId);
        const effectivePlayerId = char?.assigned_to || playerId;

        if (sessionId.startsWith('demo-')) {
          const newSignup: SessionSignupDetail = {
            id: `su-local-${Date.now()}`,
            session_id: sessionId,
            player_id: effectivePlayerId,
            status: 'approved',
            signed_up_at: new Date().toISOString(),
            playerProfile: {
              id: effectivePlayerId,
              display_name: char?.name || 'Giocatore Aggiunto',
              nickname: null,
              avatar_url: null,
            },
            character: char
              ? {
                  id: char.id,
                  name: char.name,
                  level: char.level || 1,
                  character_class: char.character_class,
                  class_subclass: char.class_subclass,
                  image_url: char.image_url,
                  armor_class: char.armor_class,
                  hit_points: char.hit_points,
                }
              : null,
          };

          setDemoSignupsMap((prev) => ({
            ...prev,
            [sessionId]: [...(prev[sessionId] || []), newSignup],
          }));
          return { success: true };
        }

        const { error: insErr } = await supabase.from('session_signups').insert({
          session_id: sessionId,
          player_id: effectivePlayerId,
          status: 'approved',
          signed_up_at: new Date().toISOString(),
        });

        if (insErr) {
          if (insErr.code === '23505') {
            return { success: false, error: 'Il giocatore è già iscritto a questa sessione.' };
          }
          console.error('[GmCampaignContext] addPlayerToSession error:', insErr);
          return { success: false, error: insErr.message };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Errore imprevisto' };
      }
    },
    [characters]
  );

  // 8. Fetch campaign candidates for manual addition
  const fetchCampaignCandidates = useCallback(
    async (sessionId: string): Promise<GmCampaignCandidate[]> => {
      const currentSignups = await fetchSessionSignups(sessionId);
      const existingPlayerIds = new Set(currentSignups.map((su) => su.player_id));

      const candidates: GmCampaignCandidate[] = [];
      characters.forEach((c) => {
        const pId = c.assigned_to || `player-char-${c.id}`;
        if (!existingPlayerIds.has(pId)) {
          candidates.push({
            playerId: pId,
            name: c.name,
            avatarUrl: c.image_url || null,
            characterName: c.name,
            characterClass: c.character_class || undefined,
            characterLevel: c.level || undefined,
          });
        }
      });

      return candidates;
    },
    [characters, fetchSessionSignups]
  );

  const value = useMemo<GmCampaignContextType>(
    () => ({
      campaigns,
      activeCampaign,
      sessions,
      activeSession,
      characters,
      isLoading,
      isRefreshing,
      error,
      selectCampaign,
      selectSession,
      refreshCampaigns: refreshGlobalCampaigns,
      refreshSessionData,
      updateCharacterHp,
      updateCharacterXp,
      createSession,
      updateSession,
      deleteSession,
      fetchSessionSignups,
      updateSignupStatus,
      removeSignup,
      addPlayerToSession,
      fetchCampaignCandidates,
    }),
    [
      campaigns,
      activeCampaign,
      sessions,
      activeSession,
      characters,
      isLoading,
      isRefreshing,
      error,
      selectCampaign,
      selectSession,
      refreshGlobalCampaigns,
      refreshSessionData,
      updateCharacterHp,
      updateCharacterXp,
      createSession,
      updateSession,
      deleteSession,
      fetchSessionSignups,
      updateSignupStatus,
      removeSignup,
      addPlayerToSession,
      fetchCampaignCandidates,
    ]
  );

  return <GmCampaignContext.Provider value={value}>{children}</GmCampaignContext.Provider>;
};

export const useGmCampaignsContext = () => {
  const context = useContext(GmCampaignContext);
  if (!context) {
    throw new Error('useGmCampaigns must be used within a GmCampaignProvider');
  }
  return context;
};

export default useGmCampaignsContext;
