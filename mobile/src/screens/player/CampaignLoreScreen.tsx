import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
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
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign } from '../../contexts/CampaignContext';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { supabase } from '../../api/supabase';
import {
  WikiEntity,
  CampaignMission,
  Character,
} from '../../types';

type ActiveTab = 'wiki' | 'missions' | 'party';

export const CampaignLoreScreen: React.FC = () => {
  const { user } = useAuth();
  const { activeCampaign, activeCampaignId } = useCampaign();
  const [campaignModalVisible, setCampaignModalVisible] = useState<boolean>(false);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('wiki');

  // Data states
  const [wikiEntities, setWikiEntities] = useState<WikiEntity[]>([]);
  const [missions, setMissions] = useState<CampaignMission[]>([]);
  const [companions, setCompanions] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Wiki tab filters
  const [wikiSearch, setWikiSearch] = useState<string>('');
  const [wikiTypeFilter, setWikiTypeFilter] = useState<string>('all');
  const [selectedWikiEntity, setSelectedWikiEntity] = useState<WikiEntity | null>(null);

  // Missions tab filters
  const [missionStatusFilter, setMissionStatusFilter] = useState<string>('all');
  const [selectedMission, setSelectedMission] = useState<CampaignMission | null>(null);

  // Party companion modal
  const [selectedCompanion, setSelectedCompanion] = useState<Character | null>(null);

  // Fetch Lore & Missions from Supabase
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Fetch Wiki Entities (admin_only = false or is_secret = false)
      let wikiQuery = supabase
        .from('wiki_entities')
        .select('*')
        .order('name', { ascending: true });

      if (activeCampaignId) {
        wikiQuery = wikiQuery.eq('campaign_id', activeCampaignId);
      }

      const { data: wikiData, error: wikiErr } = await wikiQuery;
      if (!wikiErr && wikiData) {
        setWikiEntities(wikiData as WikiEntity[]);
      } else {
        setWikiEntities([]);
      }

      // 2. Fetch Missions (campaign_missions)
      let missionsQuery = supabase
        .from('campaign_missions')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeCampaignId) {
        missionsQuery = missionsQuery.eq('campaign_id', activeCampaignId);
      }

      const { data: missionData, error: missionErr } = await missionsQuery;
      if (!missionErr && missionData) {
        setMissions(missionData as CampaignMission[]);
      } else {
        setMissions([]);
      }

      // 3. Fetch Party Companions (campaign_characters)
      let compQuery = supabase
        .from('campaign_characters')
        .select('*')
        .order('name', { ascending: true });

      if (activeCampaignId) {
        compQuery = compQuery.eq('campaign_id', activeCampaignId);
      }

      const { data: compData, error: compErr } = await compQuery;
      if (!compErr && compData) {
        setCompanions(compData as Character[]);
      } else {
        setCompanions([]);
      }
    } catch (err) {
      console.warn('[CampaignLoreScreen] loadData catch:', err);
      setWikiEntities([]);
      setMissions([]);
      setCompanions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeCampaignId]);

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
    <SafeAreaView style={styles.safeArea}>
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
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.brassBase} />
            <Text style={styles.loadingText}>Apertura tomi di gilda...</Text>
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
                  />
                  {wikiSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setWikiSearch('')} style={styles.clearBtn}>
                      <X size={14} color={colors.parchmentMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filter Chips for Wiki Types */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
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
                  return (
                    <TouchableOpacity
                      key={comp.id}
                      style={styles.companionCard}
                      onPress={() => setSelectedCompanion(comp)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.companionTop}>
                        {/* Avatar Initial Icon */}
                        <View style={styles.companionAvatar}>
                          <Text style={styles.avatarInitial}>
                            {comp.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>

                        <View style={styles.companionInfo}>
                          <Text style={styles.companionName}>{comp.name}</Text>
                          <Text style={styles.companionRole}>
                            {comp.race_slug ? `${comp.race_slug} ` : ''}
                            {comp.character_class || 'Avventuriero'}
                            {comp.level ? ` • Livello ${comp.level}` : ''}
                          </Text>
                          {comp.background && (
                            <Text style={styles.companionBackground}>
                              {comp.background}
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Stat chips row: AC & HP */}
                      <View style={styles.statsRow}>
                        <View style={styles.statPill}>
                          <Shield size={12} color={colors.brassLight} />
                          <Text style={styles.statPillLabel}>CA:</Text>
                          <Text style={styles.statPillValue}>
                            {comp.armor_class ?? 10}
                          </Text>
                        </View>

                        <View style={styles.statPill}>
                          <Heart size={12} color={colors.crimsonLight} />
                          <Text style={styles.statPillLabel}>PF:</Text>
                          <Text style={styles.statPillValue}>
                            {comp.hit_points ?? 20}
                          </Text>
                        </View>

                        <View style={styles.statPill}>
                          <Sparkles size={12} color={colors.emerald} />
                          <Text style={styles.statPillLabel}>XP:</Text>
                          <Text style={styles.statPillValue}>
                            {comp.current_xp ?? 0}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }))}
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
                  {selectedCompanion?.name}
                </Text>
                <Text style={styles.modalCompanionSub}>
                  {selectedCompanion?.race_slug ? `${selectedCompanion.race_slug} ` : ''}
                  {selectedCompanion?.character_class} • Lv. {selectedCompanion?.level}
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
                  <View style={styles.statsModalGrid}>
                    <View style={styles.statGridCard}>
                      <Shield size={16} color={colors.brassLight} />
                      <Text style={styles.statGridVal}>
                        {selectedCompanion.armor_class ?? 10}
                      </Text>
                      <Text style={styles.statGridLabel}>Classe Armatura</Text>
                    </View>

                    <View style={styles.statGridCard}>
                      <Heart size={16} color={colors.crimsonLight} />
                      <Text style={styles.statGridVal}>
                        {selectedCompanion.hit_points ?? 20}
                      </Text>
                      <Text style={styles.statGridLabel}>Punti Ferita</Text>
                    </View>

                    <View style={styles.statGridCard}>
                      <Sparkles size={16} color={colors.emerald} />
                      <Text style={styles.statGridVal}>
                        {selectedCompanion.current_xp ?? 0}
                      </Text>
                      <Text style={styles.statGridLabel}>Punti Esperienza</Text>
                    </View>
                  </View>

                  <Text style={styles.detailSectionTitle}>BACKGROUND & STORIA</Text>
                  <Text style={styles.modalContentText}>
                    {selectedCompanion.background ||
                      'Avventuriero legato al destino del gruppo nella campagna delle profondità del Pozzo Nero.'}
                  </Text>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => setSelectedCompanion(null)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalActionText}>Chiudi Profilo</Text>
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
    paddingVertical: 4,
  },
  filterChip: {
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  filterChipActive: {
    borderColor: colors.brassBase,
    backgroundColor: colors.stone,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.parchmentMuted,
  },
  filterChipTextActive: {
    color: colors.brassLight,
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
    fontSize: 9,
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
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  missionFiltersRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  missionFilterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
  },
  missionFilterBtnActive: {
    backgroundColor: colors.stone,
    borderColor: colors.brassBase,
  },
  missionFilterText: {
    fontSize: 11,
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
    fontSize: 9,
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
    fontSize: 9.5,
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
    fontSize: 10,
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
    fontSize: 10,
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
    fontSize: 8.5,
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
    padding: 6,
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
    fontSize: 9,
    color: colors.parchmentMuted,
    textAlign: 'center',
  },
});

export default CampaignLoreScreen;
