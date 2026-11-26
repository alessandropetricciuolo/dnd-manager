import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthContext';
import { Campaign, CampaignType, PlayerCharacter } from '../types';
import { projectMobileCharacter } from '../lib/character-projection';
import { ELDARIA_CAMPAIGN_ID } from '../lib/long-campaign-helpers';

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  oneshot: 'One Shot',
  quest: 'Quest',
  long: 'Campagna Lunga',
  torneo: 'Torneo',
};

export const CAMPAIGN_TYPE_BADGES: Record<
  CampaignType,
  { label: string; bg: string; border: string; text: string }
> = {
  oneshot: {
    label: 'ONE SHOT',
    bg: 'rgba(34, 197, 94, 0.16)',
    border: 'rgba(34, 197, 94, 0.45)',
    text: '#22C55E',
  },
  quest: {
    label: 'QUEST',
    bg: 'rgba(168, 85, 247, 0.16)',
    border: 'rgba(168, 85, 247, 0.45)',
    text: '#C084FC',
  },
  long: {
    label: 'CAMPAGNA LONG',
    bg: 'rgba(250, 204, 21, 0.16)',
    border: 'rgba(250, 204, 21, 0.45)',
    text: '#FACC15',
  },
  torneo: {
    label: 'TORNEO',
    bg: 'rgba(225, 29, 72, 0.15)',
    border: 'rgba(225, 29, 72, 0.4)',
    text: '#FB7185',
  },
};



export interface CampaignSessionDirectoryMeta {
  dmName: string | null;
  participants: string[];
}

export interface CampaignContextType {
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  activeCampaignId: string | null;
  selectCampaign: (campaignId: string) => Promise<void>;
  isLoading: boolean;
  isRefreshing: boolean;
  refreshCampaigns: () => Promise<void>;
  assignedCharactersMap: Record<string, PlayerCharacter[]>;
  activeCampaignCharacter: PlayerCharacter | null;
  gmNamesByCampaignId: Record<string, string>;
  sessionDirectoryMeta: Record<string, CampaignSessionDirectoryMeta>;
  confirmedGuideCampaignIds: string[];
  confirmCampaignGuide: (campaignId: string) => Promise<boolean>;
  isGmOfActiveCampaign: boolean;
  userRoleInActiveCampaign: 'gm' | 'player';
  joinedCampaignIds: string[];
  joinedLongCampaigns: Campaign[];
  hasJoinedLongCampaign: boolean;
  upcomingNonLongCampaignIds: string[];
  eligibleSheetCampaigns: Campaign[];
  canAccessCharacterSheet: boolean;
  isLongCampaignActive: boolean;
  isMemberOfActiveCampaign: boolean;
  canAccessLongFeatures: boolean;
  joinLongCampaign: (campaignId: string) => Promise<{ success: boolean; message: string }>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile, role, activeMode } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [assignedCharactersMap, setAssignedCharactersMap] = useState<Record<string, PlayerCharacter[]>>({});
  const [gmNamesByCampaignId, setGmNamesByCampaignId] = useState<Record<string, string>>({});
  const [sessionDirectoryMeta, setSessionDirectoryMeta] = useState<Record<string, CampaignSessionDirectoryMeta>>({});
  const [confirmedGuideCampaignIds, setConfirmedGuideCampaignIds] = useState<string[]>([]);
  const [joinedCampaignIds, setJoinedCampaignIds] = useState<string[]>([]);
  const [upcomingSignupCampaignIds, setUpcomingSignupCampaignIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Active campaign entity
  const activeCampaign = useMemo<Campaign | null>(() => {
    if (!campaigns.length) return null;
    const found = campaigns.find((c) => c.id === activeCampaignId);
    return found || campaigns[0] || null;
  }, [campaigns, activeCampaignId]);

  // Active character assigned to user in the selected campaign
  const activeCampaignCharacter = useMemo<PlayerCharacter | null>(() => {
    if (!activeCampaign) return null;
    const chars = assignedCharactersMap[activeCampaign.id] || [];
    return chars[0] || null;
  }, [activeCampaign, assignedCharactersMap]);

  // Is the current user the GM of the active campaign? (Or an admin)
  const isGmOfActiveCampaign = useMemo<boolean>(() => {
    if (role === 'admin' || role === 'gm') return true;
    if (!activeCampaign || !user) return false;
    return activeCampaign.gm_id === user.id;
  }, [role, activeCampaign, user]);

  const userRoleInActiveCampaign = useMemo<'gm' | 'player'>(() => {
    if (activeMode === 'gm' && isGmOfActiveCampaign) return 'gm';
    return 'player';
  }, [activeMode, isGmOfActiveCampaign]);

  const isLongCampaignActive = useMemo<boolean>(() => {
    return activeCampaign?.type === 'long';
  }, [activeCampaign?.type]);

  const isMemberOfActiveCampaign = useMemo<boolean>(() => {
    if (!activeCampaign) return false;
    if (isGmOfActiveCampaign) return true;
    return joinedCampaignIds.includes(activeCampaign.id);
  }, [activeCampaign, isGmOfActiveCampaign, joinedCampaignIds]);

  const canAccessLongFeatures = isLongCampaignActive && isMemberOfActiveCampaign;

  const isGmOrAdminRole = role === 'gm' || role === 'admin';

  const joinedLongCampaigns = useMemo<Campaign[]>(() => {
    const longCampaigns = campaigns.filter((c) => c.type === 'long');
    if (isGmOrAdminRole) return longCampaigns;
    return longCampaigns.filter((c) => joinedCampaignIds.includes(c.id));
  }, [campaigns, isGmOrAdminRole, joinedCampaignIds]);

  const hasJoinedLongCampaign = joinedLongCampaigns.length > 0;

  const upcomingNonLongCampaignIds = useMemo<string[]>(() => {
    if (isGmOrAdminRole) {
      return campaigns.filter((c) => c.type !== 'long').map((c) => c.id);
    }
    return upcomingSignupCampaignIds.filter((id) => {
      const camp = campaigns.find((c) => c.id === id);
      return camp ? camp.type !== 'long' : false;
    });
  }, [campaigns, isGmOrAdminRole, upcomingSignupCampaignIds]);

  const eligibleSheetCampaigns = useMemo<Campaign[]>(() => {
    if (isGmOrAdminRole) return campaigns;
    const allowedIds = new Set<string>([
      ...joinedLongCampaigns.map((c) => c.id),
      ...upcomingNonLongCampaignIds,
    ]);
    return campaigns.filter((c) => allowedIds.has(c.id));
  }, [campaigns, isGmOrAdminRole, joinedLongCampaigns, upcomingNonLongCampaignIds]);

  const canAccessCharacterSheet = isGmOrAdminRole || eligibleSheetCampaigns.length > 0;

  // Load campaigns from Supabase according to role and permissions
  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!user?.id) {
        // Unauthenticated / Guest: fetch real public campaigns directly from Supabase
        const { data: publicData, error: pubErr } = await supabase
          .from('campaigns')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (pubErr) {
          console.warn('[CampaignContext] Public campaigns fetch error:', pubErr.message);
        }

        const publicList = (publicData as Campaign[]) || [];
        setJoinedCampaignIds([]);
        setUpcomingSignupCampaignIds([]);
        setCampaigns(publicList);
        setActiveCampaignId((prev) => {
          if (prev && publicList.some((c) => c.id === prev)) return prev;
          return publicList[0]?.id || null;
        });
        return;
      }

      const isGmOrAdmin = role === 'gm' || role === 'admin';

      let campaignList: Campaign[] = [];

      if (isGmOrAdmin) {
        // GM and Admin see all guild campaigns directly from Supabase
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[CampaignContext] GM/Admin fetch error:', error.message);
        }
        campaignList = (data as Campaign[]) || [];
        setJoinedCampaignIds([]);
        setUpcomingSignupCampaignIds([]);
      } else {
        // Player:
        // 1. Fetch campaigns where player is member
        const { data: memberRows } = await supabase
          .from('campaign_members')
          .select('campaign_id')
          .eq('player_id', user.id);

        const memberCampaignIds = (memberRows ?? []).map((r) => r.campaign_id).filter(Boolean);
        setJoinedCampaignIds(memberCampaignIds);

        // 2. Fetch campaigns where player has an assigned character
        const { data: charRows } = await supabase
          .from('campaign_characters')
          .select('campaign_id')
          .eq('assigned_to', user.id);

        const charCampaignIds = (charRows ?? []).map((r) => r.campaign_id).filter(Boolean);

        // 3. Fetch campaigns where player has session signups
        const { data: signupRows } = await supabase
          .from('session_signups')
          .select('session_id, status')
          .eq('player_id', user.id);

        const activeSignupRows = (signupRows ?? []).filter(
          (s) => s.status !== 'rejected' && s.status !== 'absent'
        );
        const sessionIds = activeSignupRows.map((s) => s.session_id).filter(Boolean);
        let signupCampaignIds: string[] = [];
        let upcomingIds: string[] = [];
        if (sessionIds.length > 0) {
          const { data: sessRows } = await supabase
            .from('sessions')
            .select('campaign_id, scheduled_at, status')
            .in('id', sessionIds);
          const cutoffIso = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
          signupCampaignIds = (sessRows ?? []).map((s) => s.campaign_id).filter(Boolean);
          upcomingIds = (sessRows ?? [])
            .filter(
              (s) =>
                Boolean(s.campaign_id) &&
                s.status !== 'completed' &&
                s.status !== 'cancelled' &&
                (!s.scheduled_at || s.scheduled_at >= cutoffIso)
            )
            .map((s) => s.campaign_id)
            .filter(Boolean);
        }
        setUpcomingSignupCampaignIds(Array.from(new Set(upcomingIds)));

        const combinedIds = Array.from(
          new Set([...memberCampaignIds, ...charCampaignIds, ...signupCampaignIds])
        );

        // Build query: public campaigns OR joined campaigns
        const query = supabase
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false });

        const { data, error } =
          combinedIds.length > 0
            ? await query.or(`is_public.eq.true,id.in.(${combinedIds.join(',')})`)
            : await query.eq('is_public', true);

        if (error) {
          console.warn('[CampaignContext] Player fetch error:', error.message);
        }
        campaignList = (data as Campaign[]) || [];
      }

      // Load player's assigned characters across all campaigns
      const mapping: Record<string, PlayerCharacter[]> = {};
      if (user?.id) {
        const { data: userChars, error: charErr } = await supabase
          .from('campaign_characters')
          .select('*, campaigns(id, name, type)')
          .eq('assigned_to', user.id);

        if (!charErr && userChars && userChars.length > 0) {
          for (const rawChar of userChars as PlayerCharacter[]) {
            const c = projectMobileCharacter(rawChar);
            const campId = c.campaign_id;
            if (!mapping[campId]) mapping[campId] = [];
            mapping[campId].push(c);
          }
        }
      }
      setAssignedCharactersMap(mapping);
      setCampaigns(campaignList);

      // Load guide read confirmations & resolve GM/DM/participant labels (with graceful public-profile fallback)
      if (user?.id) {
        const gmIds = Array.from(new Set(campaignList.map((c) => c.gm_id).filter(Boolean)));
        const [guideReadsRes, publicGmProfilesRes, sessionData] = await Promise.all([
          supabase
            .from('campaign_guide_reads')
            .select('campaign_id')
            .eq('player_id', user.id),
          gmIds.length > 0
            ? supabase
                .from('profiles')
                .select('id, first_name, last_name, display_name, nickname')
                .in('id', gmIds)
            : Promise.resolve({ data: [] as any[] }),
          supabase.auth.getSession(),
        ]);

        setConfirmedGuideCampaignIds(
          (guideReadsRes.data ?? []).map((r: any) => String(r.campaign_id)).filter(Boolean),
        );

        const fallbackGmNames: Record<string, string> = {};
        const profNameMap = new Map<string, string>();
        for (const p of (publicGmProfilesRes.data ?? []) as any[]) {
          const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
          const label = full || p.display_name?.trim() || p.nickname?.trim();
          if (p.id && label) profNameMap.set(p.id, label);
        }
        for (const camp of campaignList) {
          if (camp.gm_id && profNameMap.has(camp.gm_id)) {
            fallbackGmNames[camp.id] = profNameMap.get(camp.gm_id)!;
          }
        }

        const token = sessionData.data.session?.access_token;
        if (token) {
          try {
            const baseUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');
            const dirRes = await fetch(`${baseUrl}/api/mobile/directory`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (dirRes.ok) {
              const dirJson = await dirRes.json();
              setGmNamesByCampaignId({ ...fallbackGmNames, ...(dirJson.gmNames ?? {}) });
              setSessionDirectoryMeta(dirJson.sessionMeta ?? {});
            } else {
              setGmNamesByCampaignId(fallbackGmNames);
            }
          } catch {
            setGmNamesByCampaignId(fallbackGmNames);
          }
        } else {
          setGmNamesByCampaignId(fallbackGmNames);
        }
      } else {
        setConfirmedGuideCampaignIds([]);
      }

      setActiveCampaignId((prev) => {
        if (prev && campaignList.some((c) => c.id === prev)) {
          return prev;
        }
        // If player has a campaign with an assigned character, prioritize it
        const campWithChar = campaignList.find((c) => mapping[c.id] && mapping[c.id].length > 0);
        if (campWithChar) {
          return campWithChar.id;
        }
        // If GM/admin, prioritize campaigns where user is GM
        if (isGmOrAdmin && user?.id) {
          const gmCamp = campaignList.find((c) => c.gm_id === user.id);
          if (gmCamp) return gmCamp.id;
        }
        return campaignList[0]?.id || null;
      });
    } catch (err: any) {
      console.warn('[CampaignContext] Exception loading campaigns:', err);
      setCampaigns([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id, role, activeMode]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  // Select campaign handler
  const selectCampaign = useCallback(async (campaignId: string) => {
    setActiveCampaignId(campaignId);
  }, []);

  // Refresh campaigns
  const refreshCampaigns = useCallback(async () => {
    setIsRefreshing(true);
    await loadCampaigns();
  }, [loadCampaigns]);

  // Join a Long campaign (required before booking sessions or reading Long content)
  const joinLongCampaign = useCallback(
    async (campaignId: string): Promise<{ success: boolean; message: string }> => {
      if (!user?.id) {
        return { success: false, message: 'Devi essere autenticato per iscriverti alla campagna.' };
      }
      if (role === 'gm' || role === 'admin') {
        return { success: false, message: 'GM e Admin hanno già accesso completo alla campagna.' };
      }

      const target = campaigns.find((c) => c.id === campaignId);
      if (!target) {
        return { success: false, message: 'Campagna non trovata.' };
      }
      if (target.type !== 'long') {
        return { success: false, message: "L'iscrizione alla campagna è richiesta solo per le campagne Long." };
      }
      if (target.id === ELDARIA_CAMPAIGN_ID) {
        return {
          success: false,
          message: 'Dopo il colloquio dal vivo, il GM aggiunge il tuo account a Eldaria.',
        };
      }
      if (!target.is_public) {
        return { success: false, message: 'Campagna privata: chiedi al GM di aggiungerti manualmente.' };
      }
      if (target.long_registrations_open === false) {
        return { success: false, message: 'Le iscrizioni a questa campagna sono chiuse. Contatta il GM.' };
      }

      const { error: insertError } = await supabase.from('campaign_members').insert({
        campaign_id: campaignId,
        player_id: user.id,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          setJoinedCampaignIds((prev) => (prev.includes(campaignId) ? prev : [...prev, campaignId]));
          return { success: true, message: 'Sei già iscritto a questa campagna Long.' };
        }
        return { success: false, message: insertError.message || "Errore durante l'iscrizione alla campagna." };
      }

      setJoinedCampaignIds((prev) => (prev.includes(campaignId) ? prev : [...prev, campaignId]));
      await loadCampaigns();
      return { success: true, message: 'Iscrizione alla campagna Long completata!' };
    },
    [user?.id, role, campaigns, loadCampaigns]
  );

  const confirmCampaignGuide = useCallback(
    async (campaignId: string): Promise<boolean> => {
      if (!user?.id) return false;
      const { error } = await supabase
        .from('campaign_guide_reads')
        .insert({ campaign_id: campaignId, player_id: user.id });
      if (error && error.code !== '23505') {
        console.warn('[CampaignContext] confirmCampaignGuide error:', error.message);
        return false;
      }
      setConfirmedGuideCampaignIds((prev) =>
        prev.includes(campaignId) ? prev : [...prev, campaignId],
      );
      return true;
    },
    [user?.id],
  );

  const value = useMemo<CampaignContextType>(
    () => ({
      campaigns,
      activeCampaign,
      activeCampaignId,
      selectCampaign,
      isLoading,
      isRefreshing,
      refreshCampaigns,
      assignedCharactersMap,
      activeCampaignCharacter,
      gmNamesByCampaignId,
      sessionDirectoryMeta,
      confirmedGuideCampaignIds,
      confirmCampaignGuide,
      isGmOfActiveCampaign,
      userRoleInActiveCampaign,
      joinedCampaignIds,
      joinedLongCampaigns,
      hasJoinedLongCampaign,
      upcomingNonLongCampaignIds,
      eligibleSheetCampaigns,
      canAccessCharacterSheet,
      isLongCampaignActive,
      isMemberOfActiveCampaign,
      canAccessLongFeatures,
      joinLongCampaign,
    }),
    [
      campaigns,
      activeCampaign,
      activeCampaignId,
      selectCampaign,
      isLoading,
      isRefreshing,
      refreshCampaigns,
      assignedCharactersMap,
      activeCampaignCharacter,
      gmNamesByCampaignId,
      sessionDirectoryMeta,
      confirmedGuideCampaignIds,
      confirmCampaignGuide,
      isGmOfActiveCampaign,
      userRoleInActiveCampaign,
      joinedCampaignIds,
      joinedLongCampaigns,
      hasJoinedLongCampaign,
      upcomingNonLongCampaignIds,
      eligibleSheetCampaigns,
      canAccessCharacterSheet,
      isLongCampaignActive,
      isMemberOfActiveCampaign,
      canAccessLongFeatures,
      joinLongCampaign,
    ]
  );

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
};

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};

export default useCampaign;
