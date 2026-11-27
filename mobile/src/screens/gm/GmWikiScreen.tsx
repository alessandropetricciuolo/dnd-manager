import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Layers,
  Lock,
  Map as MapIcon,
  Search,
  Shield,
  X,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { useGmLive } from '../../contexts/GmLiveContext';
import { CAMPAIGN_TYPE_BADGES } from '../../contexts/CampaignContext';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import {
  formatMapTypeLabel,
  MapViewerModal,
} from '../../components/player/LoreScreenModals';
import {
  getVisibilityBadgeStyle,
  WikiCodexReaderModal,
} from '../../components/wiki/WikiCodexReaderModal';
import {
  clearMobileWikiCache,
  fetchMobileCampaignWikiIndex,
} from '../../api/wiki';
import { resolveTelegramOrImageUrl } from '../../lib/long-campaign-helpers';
import type { CampaignMap, MobileWikiIndexItem } from '../../types';
import type { GmTabParamList } from '../../navigation/GmTabNavigator';

type GmWikiSubTab = 'wiki' | 'maps' | 'documents';
type GmVisibilityFilter = 'all' | 'public' | 'selective' | 'secret' | 'archived' | 'admin_only';

const WIKI_TYPE_CHIPS = [
  { key: 'all', label: 'Tutti' },
  { key: 'npc', label: 'PNG' },
  { key: 'location', label: 'Luoghi' },
  { key: 'monster', label: 'Mostri' },
  { key: 'item', label: 'Oggetti' },
  { key: 'faction', label: 'Fazioni' },
  { key: 'lore', label: 'Cronaca' },
] as const;

export const GmWikiScreen: React.FC = () => {
  const route = useRoute<RouteProp<GmTabParamList, 'GmWiki'>>();
  const { role } = useAuth();
  const { campaigns, activeCampaign } = useGmCampaigns();
  const live = useGmLive();

  const isAdmin = role === 'admin';
  const activeCampaignId = activeCampaign?.id ?? null;

  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [subTab, setSubTab] = useState<GmWikiSubTab>('wiki');

  // Admin opt-in controls (strictly off by default per ADMIN_ONLY_CONTENT_M6)
  const [adminOnlyOptIn, setAdminOnlyOptIn] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Loaded data
  const [entities, setEntities] = useState<MobileWikiIndexItem[]>([]);
  const [documents, setDocuments] = useState<MobileWikiIndexItem[]>([]);
  const [maps, setMaps] = useState<CampaignMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState<GmVisibilityFilter>('all');
  const [mapTypeFilter, setMapTypeFilter] = useState<'all' | 'world' | 'city' | 'other'>('all');

  // Reader & Map Viewer state
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    updatedAt: string | null;
  } | null>(null);
  const [selectedMap, setSelectedMap] = useState<CampaignMap | null>(null);

  useEffect(() => {
    if (route.params?.initialQuery) {
      setSubTab('wiki');
      setSearchQuery(route.params.initialQuery);
    }
  }, [route.params?.initialQuery]);

  // Reset subTab if non-admin or campaign changes
  useEffect(() => {
    if (!isAdmin && subTab === 'documents') {
      setSubTab('wiki');
    }
  }, [isAdmin, subTab]);

  const loadIndex = useCallback(
    async (force = false) => {
      if (!activeCampaignId) {
        setEntities([]);
        setDocuments([]);
        setMaps([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      try {
        if (!force) setLoading(true);
        setLoadError(null);
        const res = await fetchMobileCampaignWikiIndex(activeCampaignId, {
          includeAdminOnly: isAdmin && adminOnlyOptIn,
          includeDocuments: isAdmin && (adminOnlyOptIn || subTab === 'documents'),
          includeArchived,
          forceRefresh: force,
        });
        setEntities(res.entities ?? []);
        setDocuments(res.documents ?? []);
        setMaps(res.maps ?? []);
      } catch (err: any) {
        setLoadError(err?.message || 'Impossibile sincronizzare la Wiki della campagna.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeCampaignId, isAdmin, adminOnlyOptIn, subTab, includeArchived],
  );

  useEffect(() => {
    void loadIndex(false);
  }, [loadIndex]);

  const onRefresh = useCallback(() => {
    if (activeCampaignId) clearMobileWikiCache(activeCampaignId);
    setRefreshing(true);
    void loadIndex(true);
  }, [activeCampaignId, loadIndex]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: entities.length };
    for (const e of entities) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    return counts;
  }, [entities]);

  const filteredEntities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = entities.filter((item) => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (visibilityFilter === 'public' && (item.visibility !== 'public' || item.admin_only)) {
        return false;
      }
      if (visibilityFilter === 'selective' && item.visibility !== 'selective') return false;
      if (visibilityFilter === 'secret' && item.visibility !== 'secret') return false;
      if (visibilityFilter === 'archived' && !item.archived_at) return false;
      if (visibilityFilter === 'admin_only' && !item.admin_only) return false;

      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.snippet.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    if (typeFilter === 'lore' || (filtered.length > 0 && filtered.every((e) => e.type === 'lore'))) {
      return [...filtered].sort((a, b) => {
        const sa = a.sort_order ?? 9999;
        const sb = b.sort_order ?? 9999;
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name, 'it');
      });
    }
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [entities, searchQuery, typeFilter, visibilityFilter]);

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) => d.name.toLowerCase().includes(q) || d.snippet.toLowerCase().includes(q),
    );
  }, [documents, searchQuery]);

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
    const q = searchQuery.trim().toLowerCase();
    return maps
      .filter((m) => {
        const normType = m.map_type === 'region' ? 'city' : m.map_type ?? 'city';
        if (mapTypeFilter === 'world' && normType !== 'world') return false;
        if (mapTypeFilter === 'city' && normType !== 'city') return false;
        if (mapTypeFilter === 'other' && (normType === 'world' || normType === 'city')) {
          return false;
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
  }, [maps, searchQuery, mapTypeFilter]);

  const pcOnlineForCampaign =
    live.status === 'online' && live.campaignId === activeCampaignId && Boolean(live.snapshot);

  const handleSendMonsterToInitiative = useCallback(
    (monster: { name: string; hp: number; ac: number; initiative: number }) => {
      const id = `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const basePayload: Record<string, unknown> = {
        combatant: {
          id,
          name: monster.name,
          type: 'monster',
          hp: monster.hp,
          maxHp: monster.hp,
          initiative: monster.initiative,
          ac: monster.ac,
          conditions: [],
        },
      };
      if (live.snapshot?.matchId) {
        basePayload.match_id = live.snapshot.matchId;
      }
      void live.sendCommand('initiative.add_combatant', basePayload).then((res) => {
        if (res.ok) void live.refresh();
      });
    },
    [live],
  );

  const campBadge = activeCampaign?.type ? CAMPAIGN_TYPE_BADGES[activeCampaign.type] : null;

  const linkedWikiForSelectedMap = useMemo(() => {
    if (!selectedMap?.wiki_entity_id) return null;
    const found = entities.find((e) => e.id === selectedMap.wiki_entity_id);
    if (!found) return null;
    return {
      id: found.id,
      campaign_id: found.campaign_id,
      type: found.type as any,
      name: found.name,
      content: { body: found.snippet },
      image_url: found.image_url,
    };
  }, [selectedMap?.wiki_entity_id, entities]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {/* 1. MULTI-CAMPAIGN & FORMAT HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.campaignSelector}
          onPress={() => setCampaignModalOpen(true)}
          disabled={campaigns.length <= 1}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.eyebrow}>ARCHIVIO GM MULTI-CAMPAGNA</Text>
              {campBadge ? (
                <View
                  style={[
                    styles.formatBadge,
                    { backgroundColor: campBadge.bg, borderColor: campBadge.border },
                  ]}
                >
                  <Text style={[styles.formatBadgeText, { color: campBadge.text }]}>
                    {campBadge.label}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.campaignName} numberOfLines={1}>
              {activeCampaign?.name || 'Seleziona Campagna'}
            </Text>
          </View>
          {campaigns.length > 1 ? <ChevronDown size={16} color={colors.brassLight} /> : null}
        </TouchableOpacity>

        {isAdmin ? (
          <TouchableOpacity
            style={[styles.adminTogglePill, adminOnlyOptIn && styles.adminTogglePillActive]}
            onPress={() => {
              setAdminOnlyOptIn((prev) => {
                const next = !prev;
                if (!next && visibilityFilter === 'admin_only') setVisibilityFilter('all');
                return next;
              });
            }}
            accessibilityRole="switch"
            accessibilityState={{ checked: adminOnlyOptIn }}
            accessibilityLabel="Includi contenuti Solo Admin"
          >
            <Lock
              size={14}
              color={adminOnlyOptIn ? colors.void : colors.visibilityAdminOnly}
            />
            <Text
              style={[
                styles.adminToggleText,
                adminOnlyOptIn && { color: colors.void, fontWeight: '900' },
              ]}
            >
              Solo Admin
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 2. SUB-TABS: WIKI, ATLANTE MAPPE, DOCUMENTI (ADMIN) */}
      <View style={styles.subTabsRow}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'wiki' && styles.subTabBtnActive]}
          onPress={() => setSubTab('wiki')}
        >
          <BookOpen size={14} color={subTab === 'wiki' ? colors.void : colors.parchmentMuted} />
          <Text style={[styles.subTabText, subTab === 'wiki' && styles.subTabTextActive]}>
            Wiki ({entities.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'maps' && styles.subTabBtnActive]}
          onPress={() => setSubTab('maps')}
        >
          <MapIcon size={14} color={subTab === 'maps' ? colors.void : colors.parchmentMuted} />
          <Text style={[styles.subTabText, subTab === 'maps' && styles.subTabTextActive]}>
            Atlante ({maps.length})
          </Text>
        </TouchableOpacity>

        {isAdmin ? (
          <TouchableOpacity
            style={[styles.subTabBtn, subTab === 'documents' && styles.subTabBtnActive]}
            onPress={() => setSubTab('documents')}
          >
            <FileText
              size={14}
              color={subTab === 'documents' ? colors.void : colors.visibilityAdminOnly}
            />
            <Text style={[styles.subTabText, subTab === 'documents' && styles.subTabTextActive]}>
              Documenti ({documents.length})
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 3. UNIVERSAL SEARCH BAR */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.parchmentMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              subTab === 'maps'
                ? 'Cerca città, regione o dungeon nell’Atlante...'
                : subTab === 'documents'
                  ? 'Cerca nei documenti riservati di campagna...'
                  : 'Cerca PNG, mostri, luoghi, oggetti, fazioni o tag...'
            }
            placeholderTextColor={colors.parchmentMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <X size={15} color={colors.parchmentMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 4. CONTENT SCROLL */}
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brassBase}
          />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={colors.brassBase} />
            <Text style={styles.loadingText}>Consultazione archivio del Master...</Text>
          </View>
        ) : loadError ? (
          <View style={styles.emptyCard}>
            <AlertTriangle size={30} color={colors.crimsonLight} />
            <Text style={styles.emptyTitle}>Errore di sincronizzazione</Text>
            <Text style={styles.emptySub}>{loadError}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
              <Text style={styles.retryBtnText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        ) : subTab === 'wiki' ? (
          <>
            {/* Entity Type Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {WIKI_TYPE_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={chip.key}
                  style={[styles.chip, typeFilter === chip.key && styles.chipActive]}
                  onPress={() => setTypeFilter(chip.key)}
                >
                  <Text
                    style={[styles.chipText, typeFilter === chip.key && styles.chipTextActive]}
                  >
                    {chip.label} ({typeCounts[chip.key] ?? 0})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* GM Anti-Spoiler Visibility Filter Strip */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.visChipsRow}
            >
              {(
                [
                  ['all', 'Tutte le visibilità'],
                  ['public', '🟢 Pubbliche'],
                  ['selective', '🟡 Selettive'],
                  ['secret', '🔴 Segrete GM'],
                  ...(isAdmin && adminOnlyOptIn
                    ? ([['admin_only', '🔒 Solo Admin']] as const)
                    : []),
                ] as const
              ).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.visChip, visibilityFilter === key && styles.visChipActive]}
                  onPress={() => setVisibilityFilter(key)}
                >
                  <Text
                    style={[
                      styles.visChipText,
                      visibilityFilter === key && styles.visChipTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={[styles.visChip, includeArchived && styles.visChipActive]}
                onPress={() => {
                  setIncludeArchived((prev) => {
                    const next = !prev;
                    if (!next && visibilityFilter === 'archived') setVisibilityFilter('all');
                    return next;
                  });
                }}
              >
                <Archive
                  size={12}
                  color={includeArchived ? colors.brassLight : colors.parchmentMuted}
                />
                <Text style={[styles.visChipText, includeArchived && styles.visChipTextActive]}>
                  Archiviate
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {filteredEntities.length === 0 ? (
              <View style={styles.emptyCard}>
                <BookOpen size={30} color={colors.stoneBorderLight} />
                <Text style={styles.emptyTitle}>Nessuna voce Wiki trovata</Text>
                <Text style={styles.emptySub}>
                  Prova a modificare i filtri o seleziona un’altra campagna dall’intestazione.
                </Text>
              </View>
            ) : (
              filteredEntities.map((item) => {
                const thumbUri = resolveTelegramOrImageUrl(
                  item.image_url,
                  item.telegram_fallback_id,
                );
                const visStyle = getVisibilityBadgeStyle(
                  item.visibility,
                  item.admin_only,
                  false,
                );
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.entityCard}
                    onPress={() =>
                      setSelectedEntity({ id: item.id, updatedAt: item.updated_at })
                    }
                    activeOpacity={0.84}
                  >
                    {thumbUri ? (
                      <Image
                        source={{ uri: thumbUri }}
                        style={styles.entityThumb}
                        resizeMode="cover"
                      />
                    ) : null}
                    <View style={{ flex: 1, gap: 4 }}>
                      <View style={styles.cardTopRow}>
                        <View style={styles.badgesInline}>
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>{item.type.toUpperCase()}</Text>
                          </View>
                          <View
                            style={[
                              styles.visBadgeMini,
                              {
                                backgroundColor: visStyle.bgColor,
                                borderColor: visStyle.borderColor,
                              },
                            ]}
                          >
                            {item.visibility === 'public' && !item.admin_only ? (
                              <Eye size={10} color={visStyle.textColor} />
                            ) : (
                              <Lock size={10} color={visStyle.textColor} />
                            )}
                            <Text style={[styles.visBadgeMiniText, { color: visStyle.textColor }]}>
                              {item.admin_only
                                ? 'ADMIN'
                                : item.visibility === 'secret'
                                  ? 'SEGRETO'
                                  : item.visibility === 'selective'
                                    ? 'SELETTIVA'
                                    : 'PUBBLICA'}
                            </Text>
                          </View>
                        </View>
                        <ChevronRight size={16} color={colors.brassBase} />
                      </View>

                      <Text style={styles.entityName}>{item.name}</Text>

                      {item.monster_combat_preview ? (
                        <Text style={styles.monsterPreviewLine}>
                          ⚔️ PF {item.monster_combat_preview.hp || '—'} · CA{' '}
                          {item.monster_combat_preview.ac || '—'}
                          {item.monster_combat_preview.cr
                            ? ` · GS ${item.monster_combat_preview.cr}`
                            : ''}
                        </Text>
                      ) : null}

                      {item.snippet ? (
                        <Text style={styles.entitySnippet} numberOfLines={2}>
                          {item.snippet}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : subTab === 'maps' ? (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {(
                [
                  ['all', `Tutte (${maps.length})`],
                  ['world', 'Mondo'],
                  ['city', 'Città / Regioni'],
                  ['other', 'Dungeon / Interni'],
                ] as const
              ).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, mapTypeFilter === key && styles.chipActive]}
                  onPress={() => setMapTypeFilter(key)}
                >
                  <Text style={[styles.chipText, mapTypeFilter === key && styles.chipTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredMaps.length === 0 ? (
              <View style={styles.emptyCard}>
                <MapIcon size={30} color={colors.stoneBorderLight} />
                <Text style={styles.emptyTitle}>Nessuna mappa nell’Atlante</Text>
                <Text style={styles.emptySub}>
                  Questa campagna non contiene ancora mappe per il filtro selezionato.
                </Text>
              </View>
            ) : (
              filteredMaps.map((m) => {
                const imgUri = resolveTelegramOrImageUrl(m.image_url, null);
                const parentName = m.parent_map_id ? mapParentNameById.get(m.parent_map_id) : null;
                const childrenCount = childCountByMapId.get(m.id) ?? 0;
                const visStyle = getVisibilityBadgeStyle(
                  (m.visibility as any) ?? 'public',
                  m.admin_only,
                  false,
                );
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.mapCard}
                    onPress={() => setSelectedMap(m)}
                    activeOpacity={0.85}
                  >
                    {imgUri ? (
                      <Image source={{ uri: imgUri }} style={styles.mapBanner} resizeMode="cover" />
                    ) : null}
                    <View style={styles.mapCardBody}>
                      <View style={styles.cardTopRow}>
                        <View style={styles.badgesInline}>
                          <View style={styles.typeBadge}>
                            <Text style={styles.typeBadgeText}>
                              {formatMapTypeLabel(m.map_type)}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.visBadgeMini,
                              {
                                backgroundColor: visStyle.bgColor,
                                borderColor: visStyle.borderColor,
                              },
                            ]}
                          >
                            <Text style={[styles.visBadgeMiniText, { color: visStyle.textColor }]}>
                              {m.admin_only
                                ? 'SOLO ADMIN'
                                : m.visibility === 'secret'
                                  ? 'SEGRETA'
                                  : m.visibility === 'selective'
                                    ? 'SELETTIVA'
                                    : 'PUBBLICA'}
                            </Text>
                          </View>
                          {childrenCount > 0 ? (
                            <View style={styles.subMapCountBadge}>
                              <Layers size={11} color={colors.brassLight} />
                              <Text style={styles.visBadgeMiniText}>
                                {childrenCount} luoghi
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <ChevronRight size={16} color={colors.brassBase} />
                      </View>

                      <Text style={styles.entityName}>{m.name}</Text>
                      {parentName ? (
                        <Text style={styles.monsterPreviewLine}>↑ Parte di: {parentName}</Text>
                      ) : null}
                      {m.description ? (
                        <Text style={styles.entitySnippet} numberOfLines={2}>
                          {m.description}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : (
          /* ================================================================
             SUB-TAB 3: ADMIN CAMPAIGN DOCUMENTS (READ-ONLY)
             ================================================================ */
          <>
            <View style={styles.adminDocNotice}>
              <Shield size={15} color={colors.visibilityAdminOnly} />
              <Text style={styles.adminDocNoticeText}>
                Documenti di Campagna riservati esclusivamente agli account Admin (sola lettura su mobile).
              </Text>
            </View>

            {filteredDocuments.length === 0 ? (
              <View style={styles.emptyCard}>
                <FileText size={30} color={colors.visibilityAdminOnly} />
                <Text style={styles.emptyTitle}>Nessun documento di campagna</Text>
                <Text style={styles.emptySub}>
                  Non ci sono voci marcate come Documento di Campagna per «{activeCampaign?.name}».
                </Text>
              </View>
            ) : (
              filteredDocuments.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={[
                    styles.entityCard,
                    { borderColor: colors.visibilityAdminOnlyBorder },
                  ]}
                  onPress={() =>
                    setSelectedEntity({ id: doc.id, updatedAt: doc.updated_at })
                  }
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={styles.cardTopRow}>
                      <View
                        style={[
                          styles.visBadgeMini,
                          {
                            backgroundColor: colors.visibilityAdminOnlyBg,
                            borderColor: colors.visibilityAdminOnlyBorder,
                          },
                        ]}
                      >
                        <Lock size={10} color={colors.visibilityAdminOnly} />
                        <Text
                          style={[
                            styles.visBadgeMiniText,
                            { color: colors.visibilityAdminOnly },
                          ]}
                        >
                          DOCUMENTO SOLO ADMIN
                        </Text>
                      </View>
                      <ChevronRight size={16} color={colors.visibilityAdminOnly} />
                    </View>
                    <Text style={styles.entityName}>{doc.name}</Text>
                    {doc.snippet ? (
                      <Text style={styles.entitySnippet} numberOfLines={3}>
                        {doc.snippet}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* MODALS */}
      <CampaignSelectorModal
        visible={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
      />

      <WikiCodexReaderModal
        visible={Boolean(selectedEntity)}
        campaignId={activeCampaignId}
        initialEntityId={selectedEntity?.id ?? null}
        initialUpdatedAt={selectedEntity?.updatedAt}
        canReadGmContent={true}
        includeAdminOnly={isAdmin && (adminOnlyOptIn || subTab === 'documents')}
        allMaps={maps}
        canSendToInitiative={pcOnlineForCampaign}
        onSendMonsterToInitiative={handleSendMonsterToInitiative}
        onOpenMap={(map) => {
          setSelectedEntity(null);
          setSelectedMap(map);
        }}
        onClose={() => setSelectedEntity(null)}
      />

      <MapViewerModal
        map={selectedMap}
        allMaps={maps}
        linkedWikiEntity={linkedWikiForSelectedMap as any}
        onSelectMap={(next) => setSelectedMap(next)}
        onOpenWikiEntity={(wiki) => {
          setSelectedMap(null);
          setSelectedEntity({ id: wiki.id, updatedAt: null });
        }}
        onClose={() => setSelectedMap(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  campaignSelector: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  eyebrow: {
    color: colors.brassLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  formatBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  formatBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  campaignName: {
    color: colors.parchmentLight,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  adminTogglePill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.visibilityAdminOnlyBorder,
    backgroundColor: colors.visibilityAdminOnlyBg,
  },
  adminTogglePillActive: {
    backgroundColor: colors.visibilityAdminOnly,
    borderColor: colors.visibilityAdminOnly,
  },
  adminToggleText: {
    color: colors.visibilityAdminOnly,
    fontSize: 11,
    fontWeight: '800',
  },
  subTabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.stone,
  },
  subTabBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    backgroundColor: colors.stoneSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  subTabBtnActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassBase,
  },
  subTabText: {
    color: colors.parchmentMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  subTabTextActive: {
    color: colors.void,
  },
  searchWrap: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  searchBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.parchmentLight,
    fontSize: 14,
  },
  clearBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 14,
    paddingBottom: 36,
    gap: 10,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    backgroundColor: colors.stoneSurface,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassBase,
  },
  chipText: {
    color: colors.parchmentMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextActive: {
    color: colors.void,
  },
  visChipsRow: {
    gap: 6,
    paddingBottom: 4,
  },
  visChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    backgroundColor: colors.stone,
  },
  visChipActive: {
    borderColor: colors.brassBase,
    backgroundColor: colors.visibilitySelectiveBg,
  },
  visChipText: {
    color: colors.parchmentMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  visChipTextActive: {
    color: colors.brassLight,
    fontWeight: '800',
  },
  centerBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: colors.parchmentMuted,
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: {
    color: colors.parchmentLight,
    fontSize: 15,
    fontWeight: '800',
  },
  emptySub: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.brassBase,
    justifyContent: 'center',
    marginTop: 4,
  },
  retryBtnText: {
    color: colors.void,
    fontWeight: '900',
    fontSize: 13,
  },
  entityCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
  },
  entityThumb: {
    width: 66,
    height: 66,
    borderRadius: 9,
    backgroundColor: colors.stone,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgesInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  typeBadge: {
    backgroundColor: colors.stone,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeBadgeText: {
    color: colors.brassLight,
    fontSize: 10,
    fontWeight: '800',
  },
  visBadgeMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  visBadgeMiniText: {
    color: colors.brassLight,
    fontSize: 10,
    fontWeight: '800',
  },
  subMapCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  entityName: {
    color: colors.parchmentLight,
    fontSize: 15,
    fontWeight: '800',
  },
  monsterPreviewLine: {
    color: colors.brassLight,
    fontSize: 12,
    fontWeight: '700',
  },
  entitySnippet: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  mapCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    overflow: 'hidden',
  },
  mapBanner: {
    width: '100%',
    height: 135,
    backgroundColor: colors.stone,
  },
  mapCardBody: {
    padding: 12,
    gap: 4,
  },
  adminDocNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.visibilityAdminOnlyBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.visibilityAdminOnlyBorder,
    padding: 12,
  },
  adminDocNoticeText: {
    flex: 1,
    color: colors.visibilityAdminOnly,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
});

export default GmWikiScreen;
