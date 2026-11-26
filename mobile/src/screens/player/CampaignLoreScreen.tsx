import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen,
  Flag,
  Users,
  Search,
  MapPin,
  Map as MapIcon,
  Shield,
  Crown,
  ChevronRight,
  X,
  Coins,
  Award,
  AlertTriangle,
  Compass,
  Layers,
  Trophy,
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign } from '../../contexts/CampaignContext';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { RichMarkdownView } from '../../components/common/RichMarkdownView';
import {
  CompanionDossierModal,
  formatMapTypeLabel,
  MapViewerModal,
  WikiEntityReaderModal,
} from '../../components/player/LoreScreenModals';
import { supabase } from '../../api/supabase';
import { resolveEffectiveCharacterFields } from '../../lib/character-sheet';
import {
  ELDARIA_CAMPAIGN_ID,
  extractWikiEntityBody,
  extractWikiEntitySnippet,
  formatMissionRankMeta,
  formatMissionTreasureLabel,
  resolveRaceAndSubraceLabels,
  resolveTelegramOrImageUrl,
} from '../../lib/long-campaign-helpers';
import {
  WikiEntity,
  CampaignMission,
  CampaignMap,
  CampaignGuild,
  CampaignParty,
  Character,
} from '../../types';

const buildCompanionNoteKey = (userId: string, campaignId: string, companionId: string) =>
  `bd_party_note_${userId}_${campaignId}_${companionId}`.replace(/[^a-zA-Z0-9._-]/g, '_');

type ActiveTab = 'wiki' | 'maps' | 'missions' | 'party';

const WIKI_TYPE_CHIPS = [
  { key: 'all', label: 'Tutti' },
  { key: 'npc', label: 'PNG' },
  { key: 'location', label: 'Luoghi' },
  { key: 'monster', label: 'Mostri' },
  { key: 'item', label: 'Oggetti' },
  { key: 'lore', label: 'Cronaca' },
] as const;

export const CampaignLoreScreen: React.FC = () => {
  const { user, role } = useAuth();
  const {
    activeCampaign,
    joinedLongCampaigns,
    hasJoinedLongCampaign,
    isLongCampaignActive,
    isMemberOfActiveCampaign,
    joinLongCampaign,
  } = useCampaign();

  const targetLongCampaign = useMemo(() => {
    if (isLongCampaignActive && isMemberOfActiveCampaign && activeCampaign) {
      return activeCampaign;
    }
    return joinedLongCampaigns[0] ?? activeCampaign;
  }, [isLongCampaignActive, isMemberOfActiveCampaign, activeCampaign, joinedLongCampaigns]);

  const targetLongCampaignId = targetLongCampaign?.id ?? null;
  const isGmOrAdmin = role === 'gm' || role === 'admin';
  const isAdmin = role === 'admin';
  const isEldaria = targetLongCampaignId === ELDARIA_CAMPAIGN_ID;
  const isTargetLongAccessible =
    (targetLongCampaign?.type === 'long' &&
      (isGmOrAdmin || joinedLongCampaigns.some((c) => c.id === targetLongCampaign.id))) ||
    false;

  const [campaignModalVisible, setCampaignModalVisible] = useState<boolean>(false);
  const [joiningLong, setJoiningLong] = useState<boolean>(false);

  // 4 Sub-tabs: Wiki, Mappe, Missioni, Party
  const [activeTab, setActiveTab] = useState<ActiveTab>('wiki');

  // Data states
  const [wikiEntities, setWikiEntities] = useState<WikiEntity[]>([]);
  const [maps, setMaps] = useState<CampaignMap[]>([]);
  const [missions, setMissions] = useState<CampaignMission[]>([]);
  const [guilds, setGuilds] = useState<CampaignGuild[]>([]);
  const [parties, setParties] = useState<CampaignParty[]>([]);
  const [playerPartyMap, setPlayerPartyMap] = useState<Record<string, string>>({});
  const [companions, setCompanions] = useState<Character[]>([]);
  const [companionNotes, setCompanionNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Wiki tab filters
  const [wikiSearch, setWikiSearch] = useState<string>('');
  const [wikiTypeFilter, setWikiTypeFilter] = useState<string>('all');
  const [wikiMissionFilter, setWikiMissionFilter] = useState<string>('all');
  const [selectedWikiEntity, setSelectedWikiEntity] = useState<WikiEntity | null>(null);

  // Maps tab filters
  const [mapSearch, setMapSearch] = useState<string>('');
  const [mapTypeFilter, setMapTypeFilter] = useState<string>('all');
  const [selectedMap, setSelectedMap] = useState<CampaignMap | null>(null);

  // Missions tab filters
  const [missionStatusFilter, setMissionStatusFilter] = useState<string>('all');
  const [showGuildsBoard, setShowGuildsBoard] = useState<boolean>(true);
  const [selectedMission, setSelectedMission] = useState<CampaignMission | null>(null);

  // Party tab filters & companion modal
  const [selectedPartyFilter, setSelectedPartyFilter] = useState<string>('all');
  const [selectedCompanion, setSelectedCompanion] = useState<Character | null>(null);

  const handleCompanionNoteChange = useCallback((companionId: string, text: string) => {
    setCompanionNotes((prev) => ({ ...prev, [companionId]: text }));
  }, []);

  const persistCompanionNote = useCallback(
    async (companionId: string, text: string) => {
      if (!user?.id || !targetLongCampaignId) return;
      setSavingNoteId(companionId);
      try {
        const key = buildCompanionNoteKey(user.id, targetLongCampaignId, companionId);
        if (text.trim().length === 0) {
          await SecureStore.deleteItemAsync(key);
        } else {
          await SecureStore.setItemAsync(key, text);
        }
      } catch (err) {
        console.warn('[CampaignLoreScreen] Failed to save companion note:', err);
      } finally {
        setSavingNoteId((curr) => (curr === companionId ? null : curr));
      }
    },
    [user?.id, targetLongCampaignId],
  );

  const loadData = useCallback(async () => {
    if (!targetLongCampaignId || !isTargetLongAccessible) {
      setWikiEntities([]);
      setMaps([]);
      setMissions([]);
      setGuilds([]);
      setParties([]);
      setPlayerPartyMap({});
      setCompanions([]);
      setCompanionNotes({});
      setLoadError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError(null);

      // Build queries in parallel
      let wikiQuery = supabase
        .from('wiki_entities')
        .select('*')
        .eq('campaign_id', targetLongCampaignId)
        .eq('is_campaign_document', false)
        .is('archived_at', null)
        .order('name', { ascending: true });
      if (!isAdmin) wikiQuery = wikiQuery.eq('admin_only', false);

      let mapsQuery = supabase
        .from('maps')
        .select('*')
        .eq('campaign_id', targetLongCampaignId)
        .order('created_at', { ascending: false });
      if (!isAdmin) mapsQuery = mapsQuery.eq('admin_only', false);

      const missionsQuery = supabase
        .from('campaign_missions')
        .select('*')
        .eq('campaign_id', targetLongCampaignId)
        .eq('mission_kind', 'organization')
        .order('created_at', { ascending: false });

      const guildsQuery = supabase
        .from('campaign_guilds')
        .select('*')
        .eq('campaign_id', targetLongCampaignId)
        .order('score', { ascending: false });

      const partiesQuery = supabase
        .from('campaign_parties')
        .select('id, campaign_id, name, color')
        .eq('campaign_id', targetLongCampaignId)
        .order('name', { ascending: true });

      const membersQuery = supabase
        .from('campaign_members')
        .select('player_id, party_id')
        .eq('campaign_id', targetLongCampaignId);

      const companionsQuery = supabase
        .from('campaign_characters')
        .select('*')
        .eq('campaign_id', targetLongCampaignId)
        .order('name', { ascending: true });

      const [
        wikiRes,
        mapsRes,
        missionRes,
        guildsRes,
        partiesRes,
        membersRes,
        compRes,
      ] = await Promise.all([
        wikiQuery,
        mapsQuery,
        missionsQuery,
        guildsQuery,
        partiesQuery,
        membersQuery,
        companionsQuery,
      ]);

      // Resolve selective permissions & secret explorations for players (both Wiki & Maps)
      let permittedWikiIds = new Set<string>();
      let permittedMapIds = new Set<string>();
      let unlockedWikiIds = new Set<string>();
      let unlockedMapIds = new Set<string>();

      if (!isGmOrAdmin && user?.id) {
        const [permsRes, explorationsRes] = await Promise.all([
          supabase
            .from('entity_permissions')
            .select('entity_id, entity_type')
            .eq('campaign_id', targetLongCampaignId)
            .eq('user_id', user.id),
          supabase
            .from('explorations')
            .select('entity_id, map_id')
            .eq('player_id', user.id),
        ]);

        for (const p of (permsRes.data ?? []) as Array<{ entity_id?: string; entity_type?: string }>) {
          if (!p.entity_id) continue;
          if (p.entity_type === 'wiki') permittedWikiIds.add(p.entity_id);
          if (p.entity_type === 'map') permittedMapIds.add(p.entity_id);
        }
        for (const e of (explorationsRes.data ?? []) as Array<{ entity_id?: string | null; map_id?: string | null }>) {
          if (e.entity_id) unlockedWikiIds.add(e.entity_id);
          if (e.map_id) unlockedMapIds.add(e.map_id);
        }
      }

      // 1. Wiki
      if (!wikiRes.error && wikiRes.data) {
        const rawWiki = wikiRes.data as WikiEntity[];
        const visibleWiki = isGmOrAdmin
          ? rawWiki
          : rawWiki.filter((e) => {
              if (e.archived_at) return false;
              const vis = e.visibility ?? (e.is_secret ? 'secret' : 'public');
              if (vis === 'public') return true;
              if (vis === 'selective') return permittedWikiIds.has(e.id);
              if (vis === 'secret') return unlockedWikiIds.has(e.id);
              return false;
            });
        setWikiEntities(visibleWiki);
      } else {
        setWikiEntities([]);
      }

      // 2. Maps (exact Web MapGallery visibility parity)
      if (!mapsRes.error && mapsRes.data) {
        const rawMaps = mapsRes.data as CampaignMap[];
        const visibleMaps = isGmOrAdmin
          ? rawMaps
          : rawMaps.filter((m) => {
              const vis = m.visibility ?? 'public';
              if (vis === 'public') return true;
              if (vis === 'selective') return permittedMapIds.has(m.id);
              if (vis === 'secret') return unlockedMapIds.has(m.id);
              return false;
            });
        setMaps(visibleMaps);
      } else {
        setMaps([]);
      }

      // 3. Missions & Guilds
      setMissions(!missionRes.error && missionRes.data ? (missionRes.data as CampaignMission[]) : []);
      setGuilds(!guildsRes.error && guildsRes.data ? (guildsRes.data as CampaignGuild[]) : []);

      // 4. Parties & Companions
      setParties(!partiesRes.error && partiesRes.data ? (partiesRes.data as CampaignParty[]) : []);
      const pMap: Record<string, string> = {};
      for (const mRow of (membersRes.data ?? []) as Array<{ player_id?: string; party_id?: string | null }>) {
        if (mRow.player_id && mRow.party_id) {
          pMap[mRow.player_id] = mRow.party_id;
        }
      }
      setPlayerPartyMap(pMap);

      if (!compRes.error && compRes.data) {
        const compList = compRes.data as Character[];
        setCompanions(compList);
        if (user?.id) {
          const noteEntries = await Promise.all(
            compList.map(async (c) => {
              try {
                const stored = await SecureStore.getItemAsync(
                  buildCompanionNoteKey(user.id, targetLongCampaignId, c.id),
                );
                return [c.id, stored ?? ''] as const;
              } catch {
                return [c.id, ''] as const;
              }
            }),
          );
          setCompanionNotes(Object.fromEntries(noteEntries));
        }
      } else {
        setCompanions([]);
        setCompanionNotes({});
      }

      if (wikiRes.error && mapsRes.error && missionRes.error && compRes.error) {
        setLoadError('Impossibile sincronizzare i tomi di gilda. Verifica la connessione e riprova.');
      }
    } catch (err) {
      console.warn('[CampaignLoreScreen] loadData catch:', err);
      setLoadError('Impossibile sincronizzare i tomi di gilda. Verifica la connessione e riprova.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [targetLongCampaignId, isTargetLongAccessible, isGmOrAdmin, isAdmin, user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadData();
  }, [loadData]);

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s.includes('compiut')) {
      return {
        label: 'Completata',
        color: colors.emerald,
        borderColor: '#065F46',
        bgColor: 'rgba(16, 185, 129, 0.15)',
      };
    }
    if (s === 'in_progress' || s.includes('corso')) {
      return {
        label: 'In Corso',
        color: '#60A5FA',
        borderColor: '#1E40AF',
        bgColor: 'rgba(59, 130, 246, 0.15)',
      };
    }
    return {
      label: 'Accettabile',
      color: colors.brassLight,
      borderColor: colors.brassDark,
      bgColor: 'rgba(197, 155, 39, 0.15)',
    };
  };

  const missionTitleById = useMemo(
    () => new Map(missions.map((m) => [m.id, m.title])),
    [missions],
  );
  const guildNameById = useMemo(
    () => new Map(guilds.map((g) => [g.id, g.name])),
    [guilds],
  );
  const partyById = useMemo(
    () => new Map(parties.map((p) => [p.id, p])),
    [parties],
  );
  const wikiById = useMemo(
    () => new Map(wikiEntities.map((w) => [w.id, w])),
    [wikiEntities],
  );

  // Wiki counts & filtered list (sorted by chapter for lore, alphabetical otherwise)
  const wikiTypeCounts = useMemo(() => {
    const out: Record<string, number> = { all: wikiEntities.length };
    for (const e of wikiEntities) {
      out[e.type] = (out[e.type] ?? 0) + 1;
    }
    return out;
  }, [wikiEntities]);

  const missionsWithWiki = useMemo(() => {
    const ids = new Set(wikiEntities.map((w) => w.linked_mission_id).filter(Boolean) as string[]);
    return missions.filter((m) => ids.has(m.id));
  }, [wikiEntities, missions]);

  const filteredWiki = useMemo(() => {
    const q = wikiSearch.trim().toLowerCase();
    const list = wikiEntities.filter((item) => {
      if (wikiTypeFilter !== 'all' && item.type !== wikiTypeFilter) return false;
      if (wikiMissionFilter !== 'all') {
        if (wikiMissionFilter === 'none') {
          if (item.linked_mission_id) return false;
        } else if (item.linked_mission_id !== wikiMissionFilter) {
          return false;
        }
      }
      if (!q) return true;
      const mTitle = item.linked_mission_id ? missionTitleById.get(item.linked_mission_id) ?? '' : '';
      return (
        item.name.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q))) ||
        extractWikiEntityBody(item.content).toLowerCase().includes(q) ||
        mTitle.toLowerCase().includes(q)
      );
    });

    if (wikiTypeFilter === 'lore' || list.every((e) => e.type === 'lore')) {
      return [...list].sort((a, b) => {
        const sa = a.sort_order ?? 9999;
        const sb = b.sort_order ?? 9999;
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name, 'it');
      });
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [wikiEntities, wikiSearch, wikiTypeFilter, wikiMissionFilter, missionTitleById]);

  // Maps filtered & grouped
  const mapParentNameById = useMemo(
    () => new Map(maps.map((m) => [m.id, m.name])),
    [maps],
  );
  const childCountByMapId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of maps) {
      if (m.parent_map_id) {
        counts.set(m.parent_map_id, (counts.get(m.parent_map_id) ?? 0) + 1);
      }
    }
    return counts;
  }, [maps]);

  const filteredMaps = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    return maps
      .filter((m) => {
        const normType = m.map_type === 'region' ? 'city' : m.map_type ?? 'city';
        if (mapTypeFilter !== 'all') {
          if (mapTypeFilter === 'world' && normType !== 'world') return false;
          if (mapTypeFilter === 'city' && normType !== 'city') return false;
          if (mapTypeFilter === 'other' && (normType === 'world' || normType === 'city')) return false;
        }
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          Boolean(m.description?.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const aWorld = a.map_type === 'world' ? 0 : !a.parent_map_id ? 1 : 2;
        const bWorld = b.map_type === 'world' ? 0 : !b.parent_map_id ? 1 : 2;
        if (aWorld !== bWorld) return aWorld - bWorld;
        return a.name.localeCompare(b.name, 'it');
      });
  }, [maps, mapSearch, mapTypeFilter]);

  // Filtered Missions
  const filteredMissions = useMemo(() => {
    return missions.filter((item) => {
      if (missionStatusFilter === 'all') return true;
      if (missionStatusFilter === 'open') return item.status === 'open' || item.status === 'disponibile';
      if (missionStatusFilter === 'in_progress') return item.status === 'in_progress' || item.status === 'in corso';
      if (missionStatusFilter === 'completed') return item.status === 'completed' || item.status === 'compiuta';
      return true;
    });
  }, [missions, missionStatusFilter]);

  // Filtered Companions
  const filteredCompanions = useMemo(() => {
    return companions.filter((c) => {
      if (selectedPartyFilter === 'all') return true;
      const partyId = c.assigned_to ? playerPartyMap[c.assigned_to] : undefined;
      if (selectedPartyFilter === 'unassigned') return !partyId;
      return partyId === selectedPartyFilter;
    });
  }, [companions, selectedPartyFilter, playerPartyMap]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.headerTitle}>DIARIO & ARCHIVIO LONG</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {targetLongCampaign?.name || 'Wiki, mappe, bacheca missioni & party'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.campaignBadgeBtn}
          onPress={() => setCampaignModalVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`Seleziona campagna, attuale: ${targetLongCampaign?.name || 'Cambia'}`}
        >
          <Compass size={12} color={colors.brassBase} />
          <Text style={styles.campaignBadgeText} numberOfLines={1}>
            {targetLongCampaign?.name || 'Cambia'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4 Navigable Sub-Tabs: Wiki, Mappe, Missioni, Party */}
      <View style={styles.tabNavRow}>
        {[
          { key: 'wiki', label: 'Wiki', Icon: BookOpen },
          { key: 'maps', label: 'Mappe', Icon: MapIcon },
          { key: 'missions', label: 'Missioni', Icon: Flag },
          { key: 'party', label: 'Party', Icon: Users },
        ].map(({ key, label, Icon }) => {
          const isSelected = activeTab === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
              onPress={() => setActiveTab(key as ActiveTab)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
            >
              <Icon size={13} color={isSelected ? colors.void : colors.parchmentMuted} />
              <Text style={[styles.tabBtnText, isSelected && styles.tabBtnTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.brassBase}
          />
        }
      >
        {!hasJoinedLongCampaign && targetLongCampaign?.type !== 'long' ? (
          <View style={styles.emptyCard}>
            <BookOpen size={32} color={colors.brassBase} />
            <Text style={styles.emptyTitle}>Sezione riservata alle Campagne Long</Text>
            <Text style={styles.emptySubtitle}>
              Per le One Shot e le Quest puoi consultare direttamente le Sessioni e la Scheda PG. Seleziona una Campagna Long per aprire Wiki, Mappe, Bacheca Missioni e Party.
            </Text>
            <TouchableOpacity
              style={[styles.modalActionButton, { paddingHorizontal: 18, marginTop: 10 }]}
              onPress={() => setCampaignModalVisible(true)}
            >
              <Text style={styles.modalActionText}>Seleziona Campagna</Text>
            </TouchableOpacity>
          </View>
        ) : !isTargetLongAccessible && targetLongCampaign ? (
          <View style={styles.emptyCard}>
            <Shield size={32} color={colors.brassBase} />
            <Text style={styles.emptyTitle}>
              {isEldaria ? 'Ammissione su colloquio dal vivo' : 'Iscrizione alla Campagna Long richiesta'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isEldaria
                ? 'Dopo il colloquio dal vivo, il Game Master aggiunge il tuo account a Eldaria.'
                : targetLongCampaign.long_registrations_open === false
                  ? 'Le iscrizioni autonome sono chiuse. Contatta il GM per essere aggiunto alla campagna.'
                  : `Iscriviti a "${targetLongCampaign.name}" per consultare Wiki, Mappe, Bacheca Missioni e Compagni del Party.`}
            </Text>
            {!isEldaria && targetLongCampaign.long_registrations_open !== false && (
              <TouchableOpacity
                style={[styles.modalActionButton, { paddingHorizontal: 18, marginTop: 10 }, joiningLong && { opacity: 0.6 }]}
                disabled={joiningLong}
                onPress={async () => {
                  setJoiningLong(true);
                  try {
                    await joinLongCampaign(targetLongCampaign.id);
                  } finally {
                    setJoiningLong(false);
                  }
                }}
              >
                <Text style={styles.modalActionText}>
                  {joiningLong ? 'Iscrizione in corso...' : 'Iscriviti alla Campagna'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : isLoading && !isRefreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.brassBase} />
            <Text style={styles.loadingText}>Apertura tomi di gilda...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyCard} accessibilityRole="alert">
            <AlertTriangle size={32} color={colors.crimsonLight} />
            <Text style={styles.emptyTitle}>Errore di caricamento</Text>
            <Text style={styles.emptySubtitle}>{loadError}</Text>
            <TouchableOpacity
              style={[styles.modalActionButton, { paddingHorizontal: 18, marginTop: 8 }]}
              onPress={onRefresh}
              accessibilityRole="button"
              accessibilityLabel="Riprova caricamento archivio"
            >
              <Text style={styles.modalActionText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ================================================= */}
            {/* TAB 1: WIKI LORE                                  */}
            {/* ================================================= */}
            {activeTab === 'wiki' && (
              <View style={styles.tabContent}>
                <View style={styles.searchBar}>
                  <Search size={16} color={colors.parchmentMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Cerca PNG, luoghi, mostri, oggetti o cronaca..."
                    placeholderTextColor={colors.parchmentMuted}
                    value={wikiSearch}
                    onChangeText={setWikiSearch}
                    accessibilityLabel="Cerca nell'archivio Wiki Lore"
                  />
                  {wikiSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setWikiSearch('')} style={styles.clearBtn}>
                      <X size={14} color={colors.parchmentMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0, flexShrink: 0 }}
                  contentContainerStyle={styles.filterChipScroll}
                >
                  {WIKI_TYPE_CHIPS.map((chip) => {
                    const count = wikiTypeCounts[chip.key] ?? 0;
                    return (
                      <TouchableOpacity
                        key={chip.key}
                        style={[
                          styles.filterChip,
                          wikiTypeFilter === chip.key && styles.filterChipActive,
                        ]}
                        onPress={() => setWikiTypeFilter(chip.key)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            wikiTypeFilter === chip.key && styles.filterChipTextActive,
                          ]}
                        >
                          {chip.label} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Mission filter for Wiki (mirrors Web Long campaign Wiki mission filter) */}
                {missionsWithWiki.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flexGrow: 0, flexShrink: 0 }}
                    contentContainerStyle={styles.missionSubFilterScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.subChip,
                        wikiMissionFilter === 'all' && styles.subChipActive,
                      ]}
                      onPress={() => setWikiMissionFilter('all')}
                    >
                      <Text style={styles.subChipText}>Tutte le missioni</Text>
                    </TouchableOpacity>
                    {missionsWithWiki.map((m) => (
                      <TouchableOpacity
                        key={m.id}
                        style={[
                          styles.subChip,
                          wikiMissionFilter === m.id && styles.subChipActive,
                        ]}
                        onPress={() => setWikiMissionFilter(m.id)}
                      >
                        <Text style={styles.subChipText} numberOfLines={1}>
                          ⚑ {m.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {filteredWiki.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Compass size={32} color={colors.stoneBorder} />
                    <Text style={styles.emptyTitle}>Nessuna voce trovata</Text>
                    <Text style={styles.emptySubtitle}>
                      Modifica i filtri o gioca le prossime sessioni per sbloccare nuove conoscenze del mondo.
                    </Text>
                  </View>
                ) : (
                  filteredWiki.map((entity) => {
                    const snippet = extractWikiEntitySnippet(entity.content);
                    const thumbUri = resolveTelegramOrImageUrl(entity.image_url, entity.telegram_fallback_id);
                    const isChapter = Boolean(
                      entity.attributes?.is_chapter || (entity.sort_order != null && entity.sort_order > 0),
                    );
                    const mTitle = entity.linked_mission_id
                      ? missionTitleById.get(entity.linked_mission_id)
                      : null;

                    return (
                      <TouchableOpacity
                        key={entity.id}
                        style={styles.entityCard}
                        onPress={() => setSelectedWikiEntity(entity)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.entityCardBodyRow}>
                          {thumbUri ? (
                            <Image source={{ uri: thumbUri }} style={styles.entityThumb} resizeMode="cover" />
                          ) : null}
                          <View style={{ flex: 1 }}>
                            <View style={styles.entityTopRow}>
                              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                <View style={styles.typeBadge}>
                                  <Text style={styles.typeBadgeText}>{entity.type.toUpperCase()}</Text>
                                </View>
                                {entity.type === 'lore' && isChapter && entity.sort_order ? (
                                  <Text style={styles.chapterSmallLabel}>Cap. {entity.sort_order}</Text>
                                ) : null}
                              </View>
                              <ChevronRight size={16} color={colors.brassBase} />
                            </View>

                            <Text style={styles.entityTitle}>{entity.name}</Text>

                            {snippet ? (
                              <Text style={styles.entitySnippet} numberOfLines={3}>
                                {snippet}
                              </Text>
                            ) : null}

                            {mTitle ? (
                              <Text style={styles.linkedMissionHint} numberOfLines={1}>
                                ⚑ {mTitle}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        {entity.tags && entity.tags.length > 0 && (
                          <View style={[styles.tagsRow, { marginTop: 8 }]}>
                            {entity.tags.slice(0, 4).map((tag, tIdx) => (
                              <View key={tIdx} style={styles.tagBadge}>
                                <Text style={styles.tagText}>#{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* ================================================= */}
            {/* TAB 2: MAPPE NARRATIVE                            */}
            {/* ================================================= */}
            {activeTab === 'maps' && (
              <View style={styles.tabContent}>
                <View style={styles.searchBar}>
                  <Search size={16} color={colors.parchmentMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Cerca una mappa di mondo, regione o città..."
                    placeholderTextColor={colors.parchmentMuted}
                    value={mapSearch}
                    onChangeText={setMapSearch}
                  />
                  {mapSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setMapSearch('')} style={styles.clearBtn}>
                      <X size={14} color={colors.parchmentMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.missionFiltersRow}>
                  {[
                    { key: 'all', label: `Tutte (${maps.length})` },
                    { key: 'world', label: 'Mondo' },
                    { key: 'city', label: 'Città / Regioni' },
                    { key: 'other', label: 'Luoghi' },
                  ].map((f) => (
                    <TouchableOpacity
                      key={f.key}
                      style={[
                        styles.missionFilterBtn,
                        mapTypeFilter === f.key && styles.missionFilterBtnActive,
                      ]}
                      onPress={() => setMapTypeFilter(f.key)}
                    >
                      <Text
                        style={[
                          styles.missionFilterText,
                          mapTypeFilter === f.key && styles.missionFilterTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {filteredMaps.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <MapIcon size={32} color={colors.stoneBorder} />
                    <Text style={styles.emptyTitle}>Nessuna mappa visibile</Text>
                    <Text style={styles.emptySubtitle}>
                      Esplora il mondo al tavolo per sbloccare nuove cartine geografiche e mappe cittadine.
                    </Text>
                  </View>
                ) : (
                  filteredMaps.map((m) => {
                    const imgUri = resolveTelegramOrImageUrl(m.image_url, null);
                    const parentName = m.parent_map_id ? mapParentNameById.get(m.parent_map_id) : null;
                    const childCount = childCountByMapId.get(m.id) ?? 0;
                    const linkedWiki = m.wiki_entity_id ? wikiById.get(m.wiki_entity_id) : null;

                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.mapCard}
                        onPress={() => setSelectedMap(m)}
                        activeOpacity={0.85}
                      >
                        {imgUri ? (
                          <Image source={{ uri: imgUri }} style={styles.mapCardImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.mapCardPlaceholder}>
                            <MapIcon size={32} color={colors.brassBase} />
                          </View>
                        )}
                        <View style={styles.mapCardBody}>
                          <View style={styles.entityTopRow}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                              <View style={styles.typeBadge}>
                                <Text style={styles.typeBadgeText}>{formatMapTypeLabel(m.map_type)}</Text>
                              </View>
                              {parentName ? (
                                <Text style={styles.chapterSmallLabel}>in {parentName}</Text>
                              ) : null}
                            </View>
                            {childCount > 0 ? (
                              <View style={styles.subMapsPill}>
                                <Layers size={11} color={colors.brassLight} />
                                <Text style={styles.subMapsPillText}>{childCount}</Text>
                              </View>
                            ) : null}
                          </View>

                          <Text style={styles.entityTitle}>{m.name}</Text>
                          {m.description ? (
                            <Text style={styles.entitySnippet} numberOfLines={2}>
                              {m.description}
                            </Text>
                          ) : null}
                          {linkedWiki ? (
                            <Text style={styles.linkedMissionHint}>📖 Voce Wiki: {linkedWiki.name}</Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* ================================================= */}
            {/* TAB 3: BACHECA MISSIONI & CLASSIFICA GILDE        */}
            {/* ================================================= */}
            {activeTab === 'missions' && (
              <View style={styles.tabContent}>
                {/* Classifica Gilde della Campagna (mirrors Web MissionBoard guilds) */}
                {guilds.length > 0 && (
                  <View style={styles.guildsBoardCard}>
                    <TouchableOpacity
                      style={styles.guildsBoardHeader}
                      onPress={() => setShowGuildsBoard((v) => !v)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Trophy size={16} color={colors.brassLight} />
                        <Text style={styles.guildsBoardTitle}>
                          CLASSIFICA GILDE & GLORIA ({guilds.length})
                        </Text>
                      </View>
                      <Text style={styles.chapterSmallLabel}>
                        {showGuildsBoard ? 'Riduci ▴' : 'Mostra ▾'}
                      </Text>
                    </TouchableOpacity>

                    {showGuildsBoard && (
                      <View style={styles.guildsList}>
                        {guilds.map((g, gIdx) => (
                          <View key={g.id} style={styles.guildRow}>
                            <View style={styles.guildRankBadge}>
                              <Text style={styles.guildRankBadgeText}>{g.rank ?? 'D'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.guildNameText}>
                                {gIdx + 1}. {g.name}
                              </Text>
                              <Text style={styles.guildMetaText}>
                                Rango {g.rank ?? 'D'} · {g.auto_rank !== false ? ' progressione automatica' : ' manuale'}
                              </Text>
                            </View>
                            <Text style={styles.guildScoreText}>{g.score} Gloria</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

                {/* Status Filter Chips */}
                <View style={styles.missionFiltersRow}>
                  {[
                    { key: 'all', label: 'Tutte' },
                    { key: 'open', label: 'Accettabili' },
                    { key: 'in_progress', label: 'In Corso' },
                    { key: 'completed', label: 'Compiute' },
                  ].map((f) => (
                    <TouchableOpacity
                      key={f.key}
                      style={[
                        styles.missionFilterBtn,
                        missionStatusFilter === f.key && styles.missionFilterBtnActive,
                      ]}
                      onPress={() => setMissionStatusFilter(f.key)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.missionFilterText,
                          missionStatusFilter === f.key && styles.missionFilterTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {filteredMissions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Flag size={32} color={colors.stoneBorder} />
                    <Text style={styles.emptyTitle}>Bacheca vuota</Text>
                    <Text style={styles.emptySubtitle}>
                      Nessun bando ufficiale registrato per questo stato.
                    </Text>
                  </View>
                ) : (
                  filteredMissions.map((m) => {
                    const rankMeta = formatMissionRankMeta(m.grade);
                    const stat = getStatusBadge(m.status);
                    const completedGuildName = m.completed_by_guild_id
                      ? guildNameById.get(m.completed_by_guild_id)
                      : null;

                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.missionCard}
                        onPress={() => setSelectedMission(m)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.missionHeaderRow}>
                          <View
                            style={[
                              styles.diffBadge,
                              {
                                backgroundColor: rankMeta.bgColor,
                                borderColor: rankMeta.borderColor,
                              },
                            ]}
                          >
                            <Shield size={11} color={rankMeta.color} style={styles.badgeIcon} />
                            <Text style={[styles.diffBadgeText, { color: rankMeta.color }]}>
                              {rankMeta.label.toUpperCase()}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: stat.bgColor,
                                borderColor: stat.borderColor,
                              },
                            ]}
                          >
                            <Text style={[styles.statusBadgeText, { color: stat.color }]}>
                              {stat.label}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.missionTitle}>{m.title}</Text>
                        <Text style={styles.missionDesc} numberOfLines={2}>
                          {m.description}
                        </Text>

                        <View style={styles.missionMetaRow}>
                          {m.ubicazione ? (
                            <View style={styles.metaItem}>
                              <MapPin size={12} color={colors.brassLight} />
                              <Text style={styles.metaText} numberOfLines={1}>
                                {m.ubicazione}
                              </Text>
                            </View>
                          ) : null}

                          {m.committente ? (
                            <View style={styles.metaItem}>
                              <Crown size={12} color={colors.parchmentMuted} />
                              <Text style={styles.metaText} numberOfLines={1}>
                                {m.committente}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {completedGuildName ? (
                          <Text style={styles.completedByText}>
                            ✦ Compiuta dalla gilda: {completedGuildName}
                          </Text>
                        ) : null}

                        <View style={styles.rewardsBox}>
                          <View style={[styles.rewardItem, { flex: 1, marginRight: 8 }]}>
                            <Coins size={14} color={colors.brassLight} />
                            <Text style={styles.rewardValue} numberOfLines={1}>
                              {formatMissionTreasureLabel(m)}
                            </Text>
                          </View>

                          {m.points_reward ? (
                            <View style={styles.rewardItem}>
                              <Award size={14} color={colors.emerald} />
                              <Text style={[styles.rewardValue, { color: colors.emerald }]}>
                                +{m.points_reward} Gloria
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* ================================================= */}
            {/* TAB 4: COMPAGNI DEL PARTY & GRUPPI                */}
            {/* ================================================= */}
            {activeTab === 'party' && (
              <View style={styles.tabContent}>
                <View style={styles.partyBanner}>
                  <Shield size={16} color={colors.brassLight} />
                  <Text style={styles.partyBannerText}>
                    AVVENTURIERI DELLA CAMPAGNA • {companions.length} EROI AL TAVOLO
                  </Text>
                </View>

                {parties.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ flexGrow: 0, flexShrink: 0 }}
                    contentContainerStyle={styles.filterChipScroll}
                  >
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        selectedPartyFilter === 'all' && styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedPartyFilter('all')}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedPartyFilter === 'all' && styles.filterChipTextActive,
                        ]}
                      >
                        Tutti i gruppi ({companions.length})
                      </Text>
                    </TouchableOpacity>
                    {parties.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.filterChip,
                          selectedPartyFilter === p.id && styles.filterChipActive,
                        ]}
                        onPress={() => setSelectedPartyFilter(p.id)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            selectedPartyFilter === p.id && styles.filterChipTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {filteredCompanions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Users size={32} color={colors.stoneBorder} />
                    <Text style={styles.emptyTitle}>Nessun compagno in questo filtro</Text>
                    <Text style={styles.emptySubtitle}>
                      Non ci sono personaggi corrispondenti al gruppo selezionato.
                    </Text>
                  </View>
                ) : (
                  filteredCompanions.map((comp) => {
                    const effective = resolveEffectiveCharacterFields(comp);
                    const { raceLabel, subraceLabel } = resolveRaceAndSubraceLabels({
                      raceSlug: comp.race_slug,
                      subclassSlug: comp.subclass_slug,
                      sheetRaceLabel: effective.sheet?.raceLabel,
                      sheetSubraceLabel: effective.sheet?.subraceLabel,
                    });
                    const resolvedImage = resolveTelegramOrImageUrl(comp.image_url, null);
                    const noteValue = companionNotes[comp.id] ?? '';
                    const partyId = comp.assigned_to ? playerPartyMap[comp.assigned_to] : undefined;
                    const partyObj = partyId ? partyById.get(partyId) ?? null : null;
                    const roleLine = [
                      subraceLabel ?? raceLabel,
                      effective.characterClass || 'Avventuriero',
                      effective.classSubclass ? `(${effective.classSubclass})` : null,
                      `· Lv. ${effective.level ?? comp.level ?? 1}`,
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <View key={comp.id} style={styles.companionCard}>
                        {/* Companion Identity Header (restored!) */}
                        <TouchableOpacity
                          style={styles.companionTop}
                          onPress={() => setSelectedCompanion(comp)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.companionAvatar}>
                            {resolvedImage ? (
                              <Image source={{ uri: resolvedImage }} style={styles.companionAvatarImg} />
                            ) : (
                              <Text style={styles.avatarInitial}>
                                {(effective.name || comp.name || '?').charAt(0).toUpperCase()}
                              </Text>
                            )}
                          </View>
                          <View style={styles.companionInfo}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={styles.companionName}>{effective.name || comp.name}</Text>
                              {partyObj ? (
                                <View
                                  style={[
                                    styles.partySmallTag,
                                    partyObj.color ? { borderColor: partyObj.color } : undefined,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.partySmallTagText,
                                      partyObj.color ? { color: partyObj.color } : undefined,
                                    ]}
                                  >
                                    {partyObj.name}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.companionRole}>{roleLine}</Text>
                            {comp.background?.trim() ? (
                              <Text style={styles.companionBackground} numberOfLines={2}>
                                {comp.background.trim()}
                              </Text>
                            ) : null}
                          </View>
                          <ChevronRight size={16} color={colors.brassBase} />
                        </TouchableOpacity>

                        {resolvedImage ? (
                          <TouchableOpacity
                            style={styles.companionImageWrap}
                            onPress={() => setSelectedCompanion(comp)}
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{ uri: resolvedImage }}
                              style={styles.companionPortraitImage}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ) : null}

                        <View style={styles.companionNotesWrap}>
                          <View style={styles.companionNotesHeader}>
                            <Text style={styles.companionNotesLabel}>NOTE PERSONALI</Text>
                            {savingNoteId === comp.id && (
                              <Text style={styles.companionNotesSaving}>Salvataggio...</Text>
                            )}
                          </View>
                          <TextInput
                            style={styles.companionNotesInput}
                            value={noteValue}
                            onChangeText={(text) => handleCompanionNoteChange(comp.id, text)}
                            onBlur={() => {
                              void persistCompanionNote(comp.id, noteValue);
                            }}
                            placeholder="Scrivi liberamente le tue note su questo compagno..."
                            placeholderTextColor={colors.parchmentMuted}
                            multiline
                            textAlignVertical="top"
                          />
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* RICH WIKI ENTITY READER MODAL */}
      <WikiEntityReaderModal
        entity={selectedWikiEntity}
        isGmOrAdmin={isGmOrAdmin}
        linkedMissionTitle={
          selectedWikiEntity?.linked_mission_id
            ? missionTitleById.get(selectedWikiEntity.linked_mission_id) ?? null
            : null
        }
        linkedMaps={
          selectedWikiEntity
            ? maps.filter((m) => m.wiki_entity_id === selectedWikiEntity.id)
            : []
        }
        onOpenLinkedMap={(mapItem) => {
          setSelectedWikiEntity(null);
          setSelectedMap(mapItem);
        }}
        onClose={() => setSelectedWikiEntity(null)}
      />

      {/* INTERACTIVE ZOOMABLE MAP VIEWER MODAL */}
      <MapViewerModal
        map={selectedMap}
        allMaps={maps}
        linkedWikiEntity={
          selectedMap?.wiki_entity_id ? wikiById.get(selectedMap.wiki_entity_id) ?? null : null
        }
        onSelectMap={(nextMap) => setSelectedMap(nextMap)}
        onOpenWikiEntity={(entity) => {
          setSelectedMap(null);
          setSelectedWikiEntity(entity);
        }}
        onClose={() => setSelectedMap(null)}
      />

      {/* MISSION DETAILS MODAL */}
      <Modal
        visible={selectedMission !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedMission(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedMission?.title}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedMission(null)}
              >
                <X size={18} color={colors.parchmentLight} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedMission && (() => {
                const rankMeta = formatMissionRankMeta(selectedMission.grade);
                const stat = getStatusBadge(selectedMission.status);
                const completedGuild = selectedMission.completed_by_guild_id
                  ? guildNameById.get(selectedMission.completed_by_guild_id)
                  : null;
                const linkedWikiList = wikiEntities.filter(
                  (w) => w.linked_mission_id === selectedMission.id,
                );

                return (
                  <>
                    <View style={styles.missionModalBadgesRow}>
                      <View
                        style={[
                          styles.diffBadge,
                          {
                            backgroundColor: rankMeta.bgColor,
                            borderColor: rankMeta.borderColor,
                          },
                        ]}
                      >
                        <Text style={[styles.diffBadgeText, { color: rankMeta.color }]}>
                          {rankMeta.label.toUpperCase()}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: stat.bgColor,
                            borderColor: stat.borderColor,
                          },
                        ]}
                      >
                        <Text style={[styles.statusBadgeText, { color: stat.color }]}>
                          {stat.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.missionDetailBox}>
                      <View style={styles.missionDetailItem}>
                        <Text style={styles.detailLabel}>Committente:</Text>
                        <Text style={styles.detailValue}>
                          {selectedMission.committente || 'Gilda'}
                        </Text>
                      </View>

                      <View style={styles.missionDetailItem}>
                        <Text style={styles.detailLabel}>Ubicazione:</Text>
                        <Text style={styles.detailValue}>
                          {selectedMission.ubicazione || 'Non specificata'}
                        </Text>
                      </View>

                      <View style={styles.missionDetailItem}>
                        <Text style={styles.detailLabel}>Urgenza:</Text>
                        <Text style={styles.detailValue}>
                          {selectedMission.urgenza || 'Standard'}
                        </Text>
                      </View>

                      {(selectedMission.points_reward ?? 0) > 0 && (
                        <View style={styles.missionDetailItem}>
                          <Text style={styles.detailLabel}>Gloria Gilda:</Text>
                          <Text style={[styles.detailValue, { color: colors.emerald }]}>
                            +{selectedMission.points_reward} punti
                          </Text>
                        </View>
                      )}

                      {completedGuild ? (
                        <View style={styles.missionDetailItem}>
                          <Text style={styles.detailLabel}>Compiuta da:</Text>
                          <Text style={[styles.detailValue, { color: colors.brassLight }]}>
                            {completedGuild}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.detailSectionTitle}>DESCRIZIONE BANDO</Text>
                    <RichMarkdownView markdown={selectedMission.description || ''} />

                    <View style={styles.rewardsModalBox}>
                      <Coins size={16} color={colors.brassLight} />
                      <View style={styles.rewardsModalTexts}>
                        <Text style={styles.rewardModalTitle}>Ricompensa Pattuita:</Text>
                        <Text style={styles.rewardModalAmount}>
                          {formatMissionTreasureLabel(selectedMission)}
                        </Text>
                      </View>
                    </View>

                    {linkedWikiList.length > 0 && (
                      <View style={{ gap: 6, marginTop: 4 }}>
                        <Text style={styles.detailSectionTitle}>VOCI WIKI COLLEGATE</Text>
                        {linkedWikiList.map((w) => (
                          <TouchableOpacity
                            key={w.id}
                            style={styles.linkedWikiRowBtn}
                            onPress={() => {
                              setSelectedMission(null);
                              setSelectedWikiEntity(w);
                            }}
                          >
                            <BookOpen size={13} color={colors.brassLight} />
                            <Text style={styles.linkedWikiRowText}>{w.name}</Text>
                            <ChevronRight size={14} color={colors.brassBase} />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                );
              })()}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => setSelectedMission(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalActionText}>Chiudi Bando</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* COMPANION DOSSIER MODAL */}
      <CompanionDossierModal
        companion={selectedCompanion}
        partyBadge={
          selectedCompanion?.assigned_to && playerPartyMap[selectedCompanion.assigned_to]
            ? partyById.get(playerPartyMap[selectedCompanion.assigned_to]) ?? null
            : null
        }
        noteValue={selectedCompanion ? companionNotes[selectedCompanion.id] ?? '' : ''}
        onChangeNote={(text) => {
          if (selectedCompanion) handleCompanionNoteChange(selectedCompanion.id, text);
        }}
        onPersistNote={() => {
          if (selectedCompanion) {
            void persistCompanionNote(
              selectedCompanion.id,
              companionNotes[selectedCompanion.id] ?? '',
            );
          }
        }}
        onClose={() => setSelectedCompanion(null)}
      />

      {/* Campaign Selector Modal */}
      <CampaignSelectorModal
        visible={campaignModalVisible}
        onClose={() => setCampaignModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  campaignBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 155,
  },
  campaignBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  tabNavRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  tabBtnActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  tabBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  tabBtnTextActive: {
    color: colors.void,
    fontWeight: '800',
  },
  container: {
    padding: 14,
    paddingBottom: 36,
  },
  loadingBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  tabContent: {
    gap: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.parchmentLight,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  filterChipScroll: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 20,
    alignItems: 'center',
  },
  filterChip: {
    minHeight: 34,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: colors.brassBase,
    backgroundColor: colors.stone,
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.parchmentMuted,
  },
  filterChipTextActive: {
    color: colors.brassLight,
    fontWeight: '700',
  },
  missionSubFilterScroll: {
    gap: 6,
    paddingBottom: 2,
  },
  subChip: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 190,
  },
  subChipActive: {
    borderColor: colors.brassBase,
    backgroundColor: 'rgba(200, 157, 73, 0.14)',
  },
  subChipText: {
    fontSize: 11,
    color: colors.brassLight,
    fontWeight: '600',
  },
  entityCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 13,
  },
  entityCardBodyRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  entityThumb: {
    width: 64,
    height: 76,
    borderRadius: 8,
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  entityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  typeBadge: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.4,
  },
  chapterSmallLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.brassBase,
  },
  entityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginBottom: 4,
  },
  entitySnippet: {
    fontSize: 12,
    lineHeight: 17.5,
    color: colors.parchmentMuted,
  },
  linkedMissionHint: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
    marginTop: 5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagBadge: {
    backgroundColor: colors.stone,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 10.5,
    color: colors.parchmentMuted,
  },
  mapCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    overflow: 'hidden',
  },
  mapCardImage: {
    width: '100%',
    height: 150,
    backgroundColor: colors.void,
  },
  mapCardPlaceholder: {
    width: '100%',
    height: 110,
    backgroundColor: colors.stone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCardBody: {
    padding: 12,
  },
  subMapsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  subMapsPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  guildsBoardCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 12,
    gap: 10,
  },
  guildsBoardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guildsBoardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.brassLight,
  },
  guildsList: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 8,
  },
  guildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.stone,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  guildRankBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(200, 157, 73, 0.16)',
    borderWidth: 1,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guildRankBadgeText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.brassLight,
  },
  guildNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  guildMetaText: {
    fontSize: 10.5,
    color: colors.parchmentMuted,
  },
  guildScoreText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.emerald,
  },
  missionFiltersRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  missionFilterBtn: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionFilterBtnActive: {
    backgroundColor: colors.stone,
    borderColor: colors.brassBase,
  },
  missionFilterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
    textAlign: 'center',
  },
  missionFilterTextActive: {
    color: colors.brassLight,
  },
  missionCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 14,
  },
  missionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeIcon: {
    marginRight: 4,
  },
  diffBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  missionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginBottom: 4,
  },
  missionDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.parchmentMuted,
    marginBottom: 10,
  },
  missionMetaRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaText: {
    fontSize: 11,
    color: colors.parchmentMuted,
    flex: 1,
  },
  completedByText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
    marginBottom: 8,
  },
  rewardsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.stone,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 6,
    borderRadius: 6,
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  rewardValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  partyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  partyBannerText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.5,
  },
  companionCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 14,
  },
  companionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  companionAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.stone,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  companionAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brassLight,
  },
  companionInfo: {
    flex: 1,
  },
  companionName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  partySmallTag: {
    borderWidth: 1,
    borderColor: colors.brassBase,
    backgroundColor: 'rgba(200, 157, 73, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  partySmallTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.brassLight,
  },
  companionRole: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brassLight,
    marginTop: 2,
  },
  companionBackground: {
    fontSize: 11.5,
    color: colors.parchmentMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  companionImageWrap: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  companionPortraitImage: {
    width: '100%',
    height: '100%',
  },
  companionNotesWrap: {
    marginTop: 10,
    gap: 6,
  },
  companionNotesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companionNotesLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.6,
  },
  companionNotesSaving: {
    fontSize: 10.5,
    color: colors.emerald,
    fontWeight: '600',
  },
  companionNotesInput: {
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.parchmentLight,
    fontSize: 13,
    minHeight: 72,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 46,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.parchmentLight,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 13, 16, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.brassDark,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  modalHeaderTitleBox: {
    flex: 1,
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  modalCloseBtn: {
    minWidth: 40,
    minHeight: 40,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    maxHeight: 430,
  },
  modalBodyContent: {
    padding: 16,
    gap: 12,
  },
  modalFooter: {
    padding: 12,
    backgroundColor: colors.stone,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  modalActionButton: {
    backgroundColor: colors.brassBase,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.void,
  },
  missionModalBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  missionDetailBox: {
    backgroundColor: colors.stone,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  missionDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  detailValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.parchmentLight,
    textAlign: 'right',
    flex: 1,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.6,
    marginTop: 4,
  },
  rewardsModalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 8,
    padding: 12,
  },
  rewardsModalTexts: {
    flex: 1,
  },
  rewardModalTitle: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  rewardModalAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.brassLight,
    marginTop: 1,
  },
  linkedWikiRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    padding: 10,
  },
  linkedWikiRowText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
});

export default CampaignLoreScreen;
