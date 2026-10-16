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
  isGmOfActiveCampaign: boolean;
  userRoleInActiveCampaign: 'gm' | 'player';
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile, role, activeMode } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [assignedCharactersMap, setAssignedCharactersMap] = useState<Record<string, PlayerCharacter[]>>({});
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
      } else {
        // Player:
        // 1. Fetch campaigns where player is member
        const { data: memberRows } = await supabase
          .from('campaign_members')
          .select('campaign_id')
          .eq('player_id', user.id);

        const memberCampaignIds = (memberRows ?? []).map((r) => r.campaign_id).filter(Boolean);

        // 2. Fetch campaigns where player has an assigned character
        const { data: charRows } = await supabase
          .from('campaign_characters')
          .select('campaign_id')
          .eq('assigned_to', user.id);

        const charCampaignIds = (charRows ?? []).map((r) => r.campaign_id).filter(Boolean);

        // 3. Fetch campaigns where player has session signups
        const { data: signupRows } = await supabase
          .from('session_signups')
          .select('session_id')
          .eq('player_id', user.id);

        const sessionIds = (signupRows ?? []).map((s) => s.session_id).filter(Boolean);
        let signupCampaignIds: string[] = [];
        if (sessionIds.length > 0) {
          const { data: sessRows } = await supabase
            .from('sessions')
            .select('campaign_id')
            .in('id', sessionIds);
          signupCampaignIds = (sessRows ?? []).map((s) => s.campaign_id).filter(Boolean);
        }

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

      if (campaignList.length === 0) {
        campaignList = [
          {
            id: 'demo-camp-1',
            gm_id: user?.id || 'demo-gm-uuid-1234',
            name: 'Le Ombre di Waterdeep',
            description: 'Intrighi politici e pericoli nei vicoli oscuri della Città degli Splendori.',
            is_public: true,
            type: 'quest',
            image_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'demo-camp-2',
            gm_id: 'other-gm-id',
            name: 'La Corona di Pietra',
            description: 'Una spedizione sotterranea verso i picchi innevati di Monte Drago.',
            is_public: true,
            type: 'long',
            image_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }

      // Load player's assigned characters across all campaigns
      const mapping: Record<string, PlayerCharacter[]> = {};
      if (user?.id) {
        const { data: userChars, error: charErr } = await supabase
          .from('campaign_characters')
          .select('*, campaigns(id, name)')
          .eq('assigned_to', user.id);

        if (!charErr && userChars && userChars.length > 0) {
          for (const c of userChars as PlayerCharacter[]) {
            const campId = c.campaign_id;
            if (!mapping[campId]) mapping[campId] = [];
            mapping[campId].push(c);
          }
        }
      }
      setAssignedCharactersMap(mapping);
      setCampaigns(campaignList);

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
      isGmOfActiveCampaign,
      userRoleInActiveCampaign,
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
      isGmOfActiveCampaign,
      userRoleInActiveCampaign,
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
