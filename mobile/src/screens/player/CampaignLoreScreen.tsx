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
  Shield,
  Heart,
  Crown,
  Sparkles,
  ChevronRight,
  X,
  Coins,
  Award,
  AlertTriangle,
  Compass,
  CheckCircle2,
  Clock,
  Skull,
} from 'lucide-react-native';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign } from '../../contexts/CampaignContext';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { supabase } from '../../api/supabase';
import { resolveImageUrl } from '../../utils/imageUrl';
import {
  WikiEntity,
  CampaignMission,
  Character,
} from '../../types';

const buildCompanionNoteKey = (userId: string, campaignId: string, companionId: string) =>
  `bd_party_note_${userId}_${campaignId}_${companionId}`.replace(/[^a-zA-Z0-9._-]/g, '_');

type ActiveTab = 'wiki' | 'missions' | 'party';

export const CampaignLoreScreen: React.FC = () => {
  const { user, role } = useAuth();
  const {
    activeCampaign,
    activeCampaignId,
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
  const isTargetLongAccessible =
    (targetLongCampaign?.type === 'long' &&
      (role === 'gm' || role === 'admin' || joinedLongCampaigns.some((c) => c.id === targetLongCampaign.id))) ||
    false;

  const [campaignModalVisible, setCampaignModalVisible] = useState<boolean>(false);
  const [joiningLong, setJoiningLong] = useState<boolean>(false);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('wiki');

  // Data states
  const [wikiEntities, setWikiEntities] = useState<WikiEntity[]>([]);
  const [missions, setMissions] = useState<CampaignMission[]>([]);
  const [companions, setCompanions] = useState<Character[]>([]);
  const [companionNotes, setCompanionNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Wiki tab filters
  const [wikiSearch, setWikiSearch] = useState<string>('');
  const [wikiTypeFilter, setWikiTypeFilter] = useState<string>('all');
  const [selectedWikiEntity, setSelectedWikiEntity] = useState<WikiEntity | null>(null);

  // Missions tab filters
  const [missionStatusFilter, setMissionStatusFilter] = useState<string>('all');
  const [selectedMission, setSelectedMission] = useState<CampaignMission | null>(null);

  // Party companion modal
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
    [user?.id, targetLongCampaignId]
  );

  // Fetch Lore & Missions from Supabase (solo per campagne Long con accesso abilitato)
  const loadData = useCallback(async () => {
    if (!targetLongCampaignId || !isTargetLongAccessible) {
      setWikiEntities([]);
      setMissions([]);
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

      // 1. Fetch Wiki Entities enabled for this player in the long campaign
      const isGmOrAdmin = role === 'gm' || role === 'admin';
      let wikiQuery = supabase
        .from('wiki_entities')
        .select('*')
        .eq('campaign_id', targetLongCampaignId)
        .eq('admin_only', false)
        .eq('is_campaign_document', false)
        .is('archived_at', null)
        .order('name', { ascending: true });

      const { data: wikiData, error: wikiErr } = await wikiQuery;
      if (!wikiErr && wikiData) {
        const rawEntities = wikiData as WikiEntity[];
        if (isGmOrAdmin || !user?.id || rawEntities.length === 0) {
          setWikiEntities(rawEntities);
        } else {
          const [permsRes, explorationsRes] = await Promise.all([
            supabase
              .from('entity_permissions')
              .select('entity_id')
              .eq('campaign_id', targetLongCampaignId)
              .eq('entity_type', 'wiki')
              .eq('user_id', user.id),
            supabase
              .from('explorations')
              .select('entity_id')
              .eq('player_id', user.id)
              .in('entity_id', rawEntities.map((e) => e.id)),
          ]);

          const permittedIds = new Set(
            (permsRes.data ?? []).map((p: any) => p.entity_id).filter(Boolean) as string[]
          );
          const unlockedIds = new Set(
            (explorationsRes.data ?? []).map((e: any) => e.entity_id).filter(Boolean) as string[]
          );

          const visibleEntities = rawEntities.filter((e) => {
            if (e.archived_at) return false;
            const vis = e.visibility ?? (e.is_secret ? 'secret' : 'public');
            if (vis === 'public') return true;
            if (vis === 'selective') return permittedIds.has(e.id);
            if (vis === 'secret') return unlockedIds.has(e.id);
            return false;
          });
          setWikiEntities(visibleEntities);
        }
      } else {
        setWikiEntities([]);
      }

      // 2. Fetch Missions (campaign_missions)
      const { data: missionData, error: missionErr } = await supabase
        .from('campaign_missions')
        .select('*')
        .eq('campaign_id', targetLongCampaignId)
        .order('created_at', { ascending: false });

      if (!missionErr && missionData) {
        setMissions(missionData as CampaignMission[]);
      } else {
        setMissions([]);
      }

      // 3. Fetch Party Companions (campaign_characters)
      const { data: compData, error: compErr } = await supabase
        .from('campaign_characters')
        .select('*')
        .eq('campaign_id', targetLongCampaignId)
        .order('name', { ascending: true });

      if (!compErr && compData) {
        const compList = compData as Character[];
        setCompanions(compList);
        if (user?.id) {
          const noteEntries = await Promise.all(
            compList.map(async (c) => {
              try {
                const stored = await SecureStore.getItemAsync(
                  buildCompanionNoteKey(user.id, targetLongCampaignId, c.id)
                );
                return [c.id, stored ?? ''] as const;
              } catch {
                return [c.id, ''] as const;
              }
            })
          );
          setCompanionNotes(Object.fromEntries(noteEntries));
        }
      } else {
        setCompanions([]);
        setCompanionNotes({});
      }

      if (wikiErr && missionErr && compErr) {
        setLoadError('Impossibile sincronizzare i tomi di gilda. Verifica la connessione e riprova.');
      }
    } catch (err) {
      console.warn('[CampaignLoreScreen] loadData catch:', err);
      setWikiEntities([]);
      setMissions([]);
      setCompanions([]);
      setLoadError('Impossibile sincronizzare i tomi di gilda. Verifica la connessione e riprova.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [targetLongCampaignId, isTargetLongAccessible, role, user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  // Helper to extract plain text string from wiki entity content
  const getEntityText = (content: any): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content === 'object') {
      if (typeof content.text === 'string') return content.text;
      if (typeof content.description === 'string') return content.description;
      if (typeof content.summary === 'string') return content.summary;
      if (typeof content.notes === 'string') return content.notes;
    }
    return '';
  };

  // Helper for difficulty badge
  const getDifficultyBadge = (grade: string) => {
    const g = (grade || '').toLowerCase();
    if (g.includes('letale') || g === 's' || g.includes('difficile')) {
      return {
        label: 'Letale',
        color: colors.crimsonLight,
        borderColor: colors.crimson,
        bgColor: 'rgba(153, 27, 27, 0.25)',
      };
    }
    if (g.includes('media') || g === 'b' || g === 'a') {
      return {
        label: 'Media',
        color: colors.brassLight,
        borderColor: colors.brassDark,
        bgColor: 'rgba(197, 155, 39, 0.2)',
      };
    }
    return {
      label: 'Facile',
      color: colors.emerald,
      borderColor: '#065F46',
      bgColor: 'rgba(16, 185, 129, 0.2)',
    };
  };

  // Helper for status badge
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s.includes('compiut')) {
      return {
        label: 'Compiuta',
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
      label: 'Disponibile',
      color: colors.brassLight,
      borderColor: colors.brassDark,
      bgColor: 'rgba(197, 155, 39, 0.15)',
    };
  };

  // Filtered Wiki Entities
  const filteredWiki = useMemo(() => {
    return wikiEntities.filter((item) => {
      const matchesSearch =
        wikiSearch.trim() === '' ||
        item.name.toLowerCase().includes(wikiSearch.toLowerCase()) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(wikiSearch.toLowerCase()))) ||
        getEntityText(item.content).toLowerCase().includes(wikiSearch.toLowerCase());

      const matchesType =
        wikiTypeFilter === 'all' ||
        item.type === wikiTypeFilter ||
        (wikiTypeFilter === 'location' && item.type === 'location') ||
        (wikiTypeFilter === 'npc' && item.type === 'npc') ||
        (wikiTypeFilter === 'faction' && item.type === 'faction');

      return matchesSearch && matchesType;
    });
  }, [wikiEntities, wikiSearch, wikiTypeFilter]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.headerTitle}>LORE & BACHECA</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activeCampaign?.name || 'Memorie del regno, taglie & compagni'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.campaignBadgeBtn}
          onPress={() => setCampaignModalVisible(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`Seleziona campagna, attuale: ${activeCampaign?.name || 'Cambia'}`}
        >
          <Compass size={12} color={colors.brassBase} />
          <Text style={styles.campaignBadgeText} numberOfLines={1}>
            {activeCampaign?.name || 'Cambia'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3 Navigable Tabs */}
      <View style={styles.tabNavRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'wiki' && styles.tabBtnActive]}
          onPress={() => setActiveTab('wiki')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'wiki' }}
        >
          <BookOpen
            size={14}
            color={activeTab === 'wiki' ? colors.void : colors.parchmentMuted}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'wiki' && styles.tabBtnTextActive,
            ]}
          >
            Wiki Lore
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'missions' && styles.tabBtnActive]}
          onPress={() => setActiveTab('missions')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'missions' }}
        >
          <Flag
            size={14}
            color={activeTab === 'missions' ? colors.void : colors.parchmentMuted}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'missions' && styles.tabBtnTextActive,
            ]}
          >
            Bacheca Missioni
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'party' && styles.tabBtnActive]}
          onPress={() => setActiveTab('party')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'party' }}
        >
          <Users
            size={14}
            color={activeTab === 'party' ? colors.void : colors.parchmentMuted}
          />
          <Text
            style={[
              styles.tabBtnText,
              activeTab === 'party' && styles.tabBtnTextActive,
            ]}
          >
            Compagni Party
          </Text>
        </TouchableOpacity>
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
              Per le One Shot e le Quest puoi consultare direttamente le Sessioni e la Scheda PG. Seleziona una Campagna Long per aprire Wiki, Bacheca Missioni e Party.
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
            <Text style={styles.emptyTitle}>Iscrizione alla Campagna Long richiesta</Text>
            <Text style={styles.emptySubtitle}>
              {targetLongCampaign.long_registrations_open === false
                ? 'Le iscrizioni autonome sono chiuse. Contatta il GM per essere aggiunto alla campagna.'
                : `Iscriviti a "${targetLongCampaign.name}" per consultare Wiki, Bacheca Missioni e Compagni del Party.`}
            </Text>
            {targetLongCampaign.long_registrations_open !== false && (
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
            {/* TAB 1: WIKI LORE (Luoghi, PNG, Fazioni)           */}
            {/* ================================================= */}
            {activeTab === 'wiki' && (
              <View style={styles.tabContent}>
                {/* Search Bar */}
                <View style={styles.searchBar}>
                  <Search size={16} color={colors.parchmentMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Cerca luoghi, PNG, fazioni o parole chiave..."
                    placeholderTextColor={colors.parchmentMuted}
                    value={wikiSearch}
                    onChangeText={setWikiSearch}
                    accessibilityLabel="Cerca nell'archivio Wiki Lore"
                  />
                  {wikiSearch.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setWikiSearch('')}
                      style={styles.clearBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="Cancella testo di ricerca"
                    >
                      <X size={14} color={colors.parchmentMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filter Chips for Wiki Types */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0, flexShrink: 0 }}
                  contentContainerStyle={styles.filterChipScroll}
                >
                  {[
                    { key: 'all', label: 'Tutti' },
                    { key: 'location', label: 'Luoghi' },
                    { key: 'npc', label: 'PNG' },
                    { key: 'faction', label: 'Fazioni' },
                    { key: 'item', label: 'Oggetti' },
                    { key: 'lore', label: 'Cronaca' },
                  ].map((chip) => (
                    <TouchableOpacity
                      key={chip.key}
                      style={[
                        styles.filterChip,
                        wikiTypeFilter === chip.key && styles.filterChipActive,
                      ]}
                      onPress={() => setWikiTypeFilter(chip.key)}
                      activeOpacity={0.75}
                      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
                      accessibilityRole="tab"
                      accessibilityState={{ selected: wikiTypeFilter === chip.key }}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          wikiTypeFilter === chip.key && styles.filterChipTextActive,
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Wiki Cards List */}
                {filteredWiki.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Compass size={32} color={colors.stoneBorder} />
                    <Text style={styles.emptyTitle}>Nessuna voce trovata</Text>
                    <Text style={styles.emptySubtitle}>
                      Modifica i filtri di ricerca per consultare altre voci dell’archivio.
                    </Text>
                  </View>
                ) : (
                  filteredWiki.map((entity) => {
                    const textSnippet = getEntityText(entity.content);
                    return (
                      <TouchableOpacity
                        key={entity.id}
                        style={styles.entityCard}
                        onPress={() => setSelectedWikiEntity(entity)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.entityTopRow}>
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>
                              {entity.type.toUpperCase()}
                            </Text>
                          </View>
                          <ChevronRight size={16} color={colors.brassBase} />
                        </View>

                        <Text style={styles.entityTitle}>{entity.name}</Text>

                        {textSnippet ? (
                          <Text style={styles.entitySnippet} numberOfLines={3}>
                            {textSnippet}
                          </Text>
                        ) : null}

                        {/* Tag Chips */}
                        {entity.tags && entity.tags.length > 0 && (
                          <View style={styles.tagsRow}>
                            {entity.tags.slice(0, 3).map((tag, tIdx) => (
                              <View key={tIdx} style={styles.tagBadge}>
                                <Text style={styles.tagText}>{tag}</Text>
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
            {/* TAB 2: BACHECA MISSIONI (Facile, Media, Letale)   */}
            {/* ================================================= */}
            {activeTab === 'missions' && (
              <View style={styles.tabContent}>
                {/* Status Filter Chips */}
                <View style={styles.missionFiltersRow}>
                  {[
                    { key: 'all', label: 'Tutte' },
                    { key: 'open', label: 'Disponibili' },
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

                {/* Missions List */}
                {filteredMissions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Flag size={32} color={colors.stoneBorder} />
                    <Text style={styles.emptyTitle}>Bacheca vuota</Text>
                    <Text style={styles.emptySubtitle}>
                      Nessun avviso o contratto registrato per questo stato.
                    </Text>
                  </View>
                ) : (
                  filteredMissions.map((m) => {
                    const diff = getDifficultyBadge(m.grade);
                    const stat = getStatusBadge(m.status);

                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={styles.missionCard}
                        onPress={() => setSelectedMission(m)}
                        activeOpacity={0.85}
                      >
                        {/* Header Badges */}
                        <View style={styles.missionHeaderRow}>
                          <View
                            style={[
                              styles.diffBadge,
                              {
                                backgroundColor: diff.bgColor,
                                borderColor: diff.borderColor,
                              },
                            ]}
                          >
                            <AlertTriangle size={11} color={diff.color} style={styles.badgeIcon} />
                            <Text style={[styles.diffBadgeText, { color: diff.color }]}>
                              {diff.label.toUpperCase()}
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

                        {/* Details Grid */}
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

                        {/* Rewards Box */}
                        <View style={styles.rewardsBox}>
                          <View style={styles.rewardItem}>
                            <Coins size={14} color={colors.brassLight} />
                            <Text style={styles.rewardValue}>
                              {m.paga || (m.treasure_gp ? `${m.treasure_gp} MO` : 'Ricompensa Segreta')}
                            </Text>
                          </View>

                          {m.points_reward ? (
                            <View style={styles.rewardItem}>
                              <Award size={14} color={colors.emerald} />
                              <Text style={[styles.rewardValue, { color: colors.emerald }]}>
                                +{m.points_reward} Punti Gilda
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
            {/* TAB 3: COMPAGNI DEL PARTY                         */}
            {/* ================================================= */}
            {activeTab === 'party' && (
              <View style={styles.tabContent}>
                <View style={styles.partyBanner}>
                  <Shield size={16} color={colors.brassLight} />
                  <Text style={styles.partyBannerText}>
                    AVVENTURIERI DELLA CAMPAGNA • {companions.length} EROI AL TAVOLO
                  </Text>
                </View>

                {companions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Users size={32} color={colors.stoneBorder} />
                    <Text style={styles.emptyTitle}>Nessun compagno registrato</Text>
                    <Text style={styles.emptySubtitle}>
                      Non ci sono ancora personaggi registrati per questa campagna.
                    </Text>
                  </View>
                ) : (
                  companions.map((comp) => {
                    const resolvedImage = resolveImageUrl(comp.image_url);
                    const noteValue = companionNotes[comp.id] ?? '';
                    return (
                      <View key={comp.id} style={styles.companionCard}>
                        <TouchableOpacity
                          style={styles.companionImageWrap}
                          onPress={() => setSelectedCompanion(comp)}
                          activeOpacity={0.85}
                        >
                          {resolvedImage ? (
                            <Image
                              source={{ uri: resolvedImage }}
                              style={styles.companionPortraitImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.companionImagePlaceholder}>
                              <Users size={42} color={colors.brassBase} />
                              <Text style={styles.companionNoImageText}>
                                Nessuna immagine disponibile
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>

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
                            onBlur={() => { void persistCompanionNote(comp.id, noteValue); }}
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

      {/* ================================================= */}
      {/* MODAL DI LETTURA DETTAGLIATA WIKI LORE            */}
      {/* ================================================= */}
      <Modal
        visible={selectedWikiEntity !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedWikiEntity(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <View style={styles.modalTypeBadge}>
                  <Text style={styles.modalTypeBadgeText}>
                    {selectedWikiEntity?.type.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedWikiEntity?.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedWikiEntity(null)}
              >
                <X size={18} color={colors.parchmentLight} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedWikiEntity?.image_url && (
                <Image
                  source={{ uri: selectedWikiEntity.image_url }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
              )}

              <Text style={styles.modalContentText}>
                {selectedWikiEntity ? getEntityText(selectedWikiEntity.content) : ''}
              </Text>

              {/* Tags */}
              {selectedWikiEntity?.tags && selectedWikiEntity.tags.length > 0 && (
                <View style={styles.modalTagsRow}>
                  {selectedWikiEntity.tags.map((t, idx) => (
                    <View key={idx} style={styles.modalTag}>
                      <Text style={styles.modalTagText}>#{t}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => setSelectedWikiEntity(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalActionText}>Chiudi Archivio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================= */}
      {/* MODAL DETTAGLI MISSIONE                           */}
      {/* ================================================= */}
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
              {selectedMission && (
                <>
                  <View style={styles.missionModalBadgesRow}>
                    <View
                      style={[
                        styles.diffBadge,
                        {
                          backgroundColor: getDifficultyBadge(selectedMission.grade).bgColor,
                          borderColor: getDifficultyBadge(selectedMission.grade).borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.diffBadgeText,
                          { color: getDifficultyBadge(selectedMission.grade).color },
                        ]}
                      >
                        DIFFICOLTÀ: {getDifficultyBadge(selectedMission.grade).label.toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusBadge(selectedMission.status).bgColor,
                          borderColor: getStatusBadge(selectedMission.status).borderColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: getStatusBadge(selectedMission.status).color },
                        ]}
                      >
                        {getStatusBadge(selectedMission.status).label}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.missionDetailBox}>
                    <View style={styles.missionDetailItem}>
                      <Text style={styles.detailLabel}>Committente:</Text>
                      <Text style={styles.detailValue}>
                        {selectedMission.committente || 'Gilda dei Barbieri'}
                      </Text>
                    </View>

                    <View style={styles.missionDetailItem}>
                      <Text style={styles.detailLabel}>Ubicazione:</Text>
                      <Text style={styles.detailValue}>
                        {selectedMission.ubicazione || 'Sconosciuta'}
                      </Text>
                    </View>

                    <View style={styles.missionDetailItem}>
                      <Text style={styles.detailLabel}>Urgenza:</Text>
                      <Text style={styles.detailValue}>
                        {selectedMission.urgenza || 'Standard'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.detailSectionTitle}>DESCRIZIONE MISSIONE</Text>
                  <Text style={styles.modalContentText}>
                    {selectedMission.description}
                  </Text>

                  <View style={styles.rewardsModalBox}>
                    <Coins size={16} color={colors.brassLight} />
                    <View style={styles.rewardsModalTexts}>
                      <Text style={styles.rewardModalTitle}>Paga Pattuita:</Text>
                      <Text style={styles.rewardModalAmount}>
                        {selectedMission.paga || `${selectedMission.treasure_gp ?? 0} Monete d’Oro`}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => setSelectedMission(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalActionText}>Chiudi Bacheca</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================= */}
      {/* MODAL DETTAGLI COMPAGNO DEL PARTY                 */}
      {/* ================================================= */}
      <Modal
        visible={selectedCompanion !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedCompanion(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  Compagno di Party
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedCompanion(null)}
              >
                <X size={18} color={colors.parchmentLight} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedCompanion && (
                <>
                  {resolveImageUrl(selectedCompanion.image_url) ? (
                    <Image
                      source={{ uri: resolveImageUrl(selectedCompanion.image_url)! }}
                      style={styles.modalCompanionPortrait}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.companionImagePlaceholder}>
                      <Users size={48} color={colors.brassBase} />
                      <Text style={styles.companionNoImageText}>
                        Nessuna immagine disponibile
                      </Text>
                    </View>
                  )}

                  <Text style={styles.detailSectionTitle}>LE TUE NOTE</Text>
                  <TextInput
                    style={[styles.companionNotesInput, { minHeight: 110 }]}
                    value={companionNotes[selectedCompanion.id] ?? ''}
                    onChangeText={(text) =>
                      handleCompanionNoteChange(selectedCompanion.id, text)
                    }
                    onBlur={() => {
                      void persistCompanionNote(
                        selectedCompanion.id,
                        companionNotes[selectedCompanion.id] ?? ''
                      );
                    }}
                    placeholder="Scrivi liberamente le tue note su questo compagno..."
                    placeholderTextColor={colors.parchmentMuted}
                    multiline
                    textAlignVertical="top"
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => {
                  if (selectedCompanion) {
                    void persistCompanionNote(
                      selectedCompanion.id,
                      companionNotes[selectedCompanion.id] ?? ''
                    );
                  }
                  setSelectedCompanion(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.modalActionText}>Salva e Chiudi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    maxWidth: 150,
  },
  campaignBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  headerTitle: {
    fontSize: 18,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
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
    fontSize: 11,
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
    paddingVertical: 6,
    paddingRight: 24,
    alignItems: 'center',
  },
  filterChip: {
    minHeight: 36,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: colors.brassBase,
    backgroundColor: colors.stone,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.parchmentMuted,
  },
  filterChipTextActive: {
    color: colors.brassLight,
    fontWeight: '700',
  },
  entityCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 14,
  },
  entityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.5,
  },
  entityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginBottom: 6,
  },
  entitySnippet: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.parchmentMuted,
    marginBottom: 8,
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
  missionFiltersRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  missionFilterBtn: {
    flex: 1,
    minHeight: 36,
    paddingVertical: 8,
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
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.parchmentMuted,
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
    fontSize: 10,
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
    marginBottom: 10,
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
  rewardsBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.stone,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 8,
    marginTop: 2,
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
    marginBottom: 4,
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
    marginBottom: 12,
  },
  companionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.stone,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  companionRole: {
    fontSize: 12,
    color: colors.brassLight,
    marginTop: 1,
  },
  companionBackground: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.stone,
    padding: 8,
    borderRadius: 8,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statPillLabel: {
    fontSize: 10.5,
    color: colors.parchmentMuted,
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
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
  modalTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  modalTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  modalCompanionSub: {
    fontSize: 12,
    color: colors.brassLight,
    marginTop: 2,
  },
  modalCloseBtn: {
    minWidth: 40,
    minHeight: 40,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    maxHeight: 400,
  },
  modalBodyContent: {
    padding: 16,
    gap: 12,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },
  modalContentText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.parchmentLight,
  },
  modalTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  modalTag: {
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  modalTagText: {
    fontSize: 11,
    color: colors.brassLight,
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
    gap: 8,
    marginBottom: 8,
  },
  missionDetailBox: {
    backgroundColor: colors.stone,
    borderRadius: 8,
    padding: 12,
    gap: 6,
    marginVertical: 4,
  },
  missionDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  detailSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.6,
    marginTop: 8,
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
    marginTop: 6,
  },
  rewardsModalTexts: {
    flex: 1,
  },
  rewardModalTitle: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  rewardModalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brassLight,
  },
  statsModalGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statGridCard: {
    flex: 1,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  statGridVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  statGridLabel: {
    fontSize: 10.5,
    color: colors.parchmentMuted,
    textAlign: 'center',
  },
  companionImageWrap: {
    width: '100%',
    height: 220,
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
  companionImagePlaceholder: {
    width: '100%',
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  companionNoImageText: {
    fontSize: 12,
    color: colors.parchmentMuted,
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
    minHeight: 74,
  },
  modalCompanionPortrait: {
    width: '100%',
    height: 280,
    borderRadius: 10,
    backgroundColor: colors.void,
  },
});

export default CampaignLoreScreen;
