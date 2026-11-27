import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Lock,
  Map as MapIcon,
  Shield,
  Swords,
  Type as TypeIcon,
  X,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fetchMobileCampaignWikiDetail } from '../../api/wiki';
import { resolveTelegramOrImageUrl } from '../../lib/long-campaign-helpers';
import { parseMonsterStatInteger } from '../../lib/wiki-cache';
import { RichMarkdownView } from '../common/RichMarkdownView';
import type {
  CampaignMap,
  MobileWikiEntityDetail,
  MobileWikiResolvedRelation,
} from '../../types';

const MAX_HISTORY_DEPTH = 6;

const WIKI_TYPE_LABELS: Record<string, string> = {
  npc: 'PNG',
  location: 'LUOGO',
  monster: 'MOSTRO',
  item: 'OGGETTO',
  lore: 'CRONACA',
  faction: 'FAZIONE',
};

export function getVisibilityBadgeStyle(
  visibility?: 'public' | 'selective' | 'secret',
  adminOnly?: boolean,
  isDocument?: boolean,
): {
  label: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
} {
  if (isDocument) {
    return {
      label: 'DOCUMENTO DI CAMPAGNA (SOLO ADMIN)',
      textColor: colors.visibilityAdminOnly,
      bgColor: colors.visibilityAdminOnlyBg,
      borderColor: colors.visibilityAdminOnlyBorder,
    };
  }
  if (adminOnly) {
    return {
      label: 'SOLO ADMIN · PROTETTO',
      textColor: colors.visibilityAdminOnly,
      bgColor: colors.visibilityAdminOnlyBg,
      borderColor: colors.visibilityAdminOnlyBorder,
    };
  }
  if (visibility === 'secret') {
    return {
      label: 'SEGRETO DEL MASTER (NON SBLOCCATA)',
      textColor: colors.visibilitySecret,
      bgColor: colors.visibilitySecretBg,
      borderColor: colors.visibilitySecretBorder,
    };
  }
  if (visibility === 'selective') {
    return {
      label: 'VISIBILITÀ SELETTIVA (PARTY / PG)',
      textColor: colors.visibilitySelective,
      bgColor: colors.visibilitySelectiveBg,
      borderColor: colors.visibilitySelectiveBorder,
    };
  }
  return {
    label: 'PUBBLICA AI GIOCATORI',
    textColor: colors.visibilityPublic,
    bgColor: colors.visibilityPublicBg,
    borderColor: colors.visibilityPublicBorder,
  };
}

export interface WikiCodexReaderModalProps {
  visible: boolean;
  campaignId: string | null;
  initialEntityId: string | null;
  initialUpdatedAt?: string | null;
  canReadGmContent: boolean;
  includeAdminOnly?: boolean;
  allMaps?: CampaignMap[];
  missionTitleById?: Map<string, string>;
  canSendToInitiative?: boolean;
  onSendMonsterToInitiative?: (payload: {
    name: string;
    hp: number;
    ac: number;
    initiative: number;
  }) => void;
  onOpenMap?: (map: CampaignMap) => void;
  onClose: () => void;
}

export const WikiCodexReaderModal: React.FC<WikiCodexReaderModalProps> = ({
  visible,
  campaignId,
  initialEntityId,
  initialUpdatedAt,
  canReadGmContent,
  includeAdminOnly = false,
  allMaps = [],
  missionTitleById,
  canSendToInitiative = false,
  onSendMonsterToInitiative,
  onOpenMap,
  onClose,
}) => {
  const [history, setHistory] = useState<string[]>([]);
  const [entity, setEntity] = useState<MobileWikiEntityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playerPreviewMode, setPlayerPreviewMode] = useState(false);
  const [largeFont, setLargeFont] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(true);

  // Quick initiative prompt for monsters
  const [initPromptOpen, setInitPromptOpen] = useState(false);
  const [initRollInput, setInitRollInput] = useState('');

  const currentEntityId = history.length > 0 ? history[history.length - 1] : null;

  useEffect(() => {
    if (visible && initialEntityId) {
      setHistory([initialEntityId]);
      setPlayerPreviewMode(false);
      setSummaryOpen(true);
    } else if (!visible) {
      setHistory([]);
      setEntity(null);
      setError(null);
      setInitPromptOpen(false);
    }
  }, [visible, initialEntityId]);

  const loadCurrent = useCallback(
    async (targetId: string, force = false) => {
      if (!campaignId) return;
      setLoading(true);
      setError(null);
      try {
        const loaded = await fetchMobileCampaignWikiDetail(campaignId, targetId, {
          includeAdminOnly,
          expectedUpdatedAt: targetId === initialEntityId ? initialUpdatedAt : undefined,
          forceRefresh: force,
        });
        setEntity(loaded);
      } catch (err: any) {
        setError(err?.message || 'Impossibile aprire questa voce Wiki.');
      } finally {
        setLoading(false);
      }
    },
    [campaignId, includeAdminOnly, initialEntityId, initialUpdatedAt],
  );

  useEffect(() => {
    if (visible && currentEntityId) {
      void loadCurrent(currentEntityId);
    }
  }, [visible, currentEntityId, loadCurrent]);

  const navigateToRelatedWiki = (nextId: string) => {
    setHistory((prev) => {
      if (prev[prev.length - 1] === nextId) return prev;
      if (prev.length >= MAX_HISTORY_DEPTH) {
        // Keep readability on mobile as specified in wiki-geografica-collegamenti.md
        return [nextId];
      }
      return [...prev, nextId];
    });
  };

  const goBackInStack = () => {
    if (history.length > 1) {
      setHistory((prev) => prev.slice(0, -1));
    } else {
      onClose();
    }
  };

  const mapsById = useMemo(() => new Map(allMaps.map((m) => [m.id, m])), [allMaps]);

  const directLinkedMaps = useMemo(() => {
    if (!entity) return [];
    return (entity.linked_map_ids ?? [])
      .map((id) => mapsById.get(id))
      .filter((m): m is CampaignMap => Boolean(m));
  }, [entity, mapsById]);

  const effectiveGmSectionsVisible = canReadGmContent && !playerPreviewMode;

  const visibleRelations = useMemo<MobileWikiResolvedRelation[]>(() => {
    if (!entity) return [];
    if (!playerPreviewMode) return entity.relations ?? [];
    return (entity.relations ?? []).filter(
      (r) => !r.targetAdminOnly && (!r.targetVisibility || r.targetVisibility === 'public'),
    );
  }, [entity, playerPreviewMode]);

  const mapRelations = useMemo(
    () => visibleRelations.filter((r) => r.targetKind === 'map'),
    [visibleRelations],
  );
  const wikiRelations = useMemo(
    () => visibleRelations.filter((r) => r.targetKind === 'wiki'),
    [visibleRelations],
  );

  if (!visible) return null;

  const attrs = (entity?.attributes ?? {}) as Record<string, any>;
  const heroUri = entity
    ? resolveTelegramOrImageUrl(entity.image_url, entity.telegram_fallback_id)
    : null;
  const extraImages: string[] = Array.isArray(attrs.images)
    ? attrs.images
        .map((img: any) =>
          typeof img === 'string'
            ? resolveTelegramOrImageUrl(img, null)
            : resolveTelegramOrImageUrl(img?.url ?? img?.image_url, img?.telegram_fallback_id),
        )
        .filter((u): u is string => Boolean(u))
    : [];

  const loreSummary = typeof attrs.summary === 'string' ? attrs.summary.trim() : '';
  const npcRace = typeof attrs.race === 'string' ? attrs.race.trim() : '';
  const npcClass = typeof attrs.class === 'string' ? attrs.class.trim() : '';
  const npcAge = typeof attrs.age === 'string' ? attrs.age.trim() : '';
  const npcRelationships =
    typeof attrs.relationships === 'string' ? attrs.relationships.trim() : '';
  const monsterStatblock = typeof attrs.statblock === 'string' ? attrs.statblock.trim() : '';
  const combatStats = (attrs.combat_stats ?? {}) as {
    hp?: string;
    ac?: string;
    cr?: string;
    attacks?: string;
  };
  const hasCombatStats = Boolean(
    combatStats.hp?.trim() ||
      combatStats.ac?.trim() ||
      combatStats.cr?.trim() ||
      combatStats.attacks?.trim(),
  );
  const gmLoot = typeof attrs.loot === 'string' ? attrs.loot.trim() : '';
  const gmNotes = typeof attrs.gm_notes === 'string' ? attrs.gm_notes.trim() : '';

  const linkedMissionTitle =
    entity?.linked_mission_id && missionTitleById
      ? missionTitleById.get(entity.linked_mission_id) ?? null
      : null;

  const visBadge = entity
    ? getVisibilityBadgeStyle(
        entity.visibility,
        entity.admin_only,
        entity.is_campaign_document,
      )
    : null;

  const handleConfirmSendInitiative = () => {
    if (!entity || !onSendMonsterToInitiative) return;
    const initNum = Number.parseInt(initRollInput, 10);
    if (!Number.isFinite(initNum)) {
      Alert.alert('Iniziativa richiesta', 'Inserisci il tiro di iniziativa per questo combattente.');
      return;
    }
    const hpNum = parseMonsterStatInteger(combatStats.hp, 20);
    const acNum = parseMonsterStatInteger(combatStats.ac, 13);
    onSendMonsterToInitiative({
      name: entity.name,
      hp: hpNum,
      ac: acNum,
      initiative: initNum,
    });
    setInitPromptOpen(false);
    setInitRollInput('');
    Alert.alert('Inviato all’Iniziativa', `${entity.name} è stato accodato sul GM Screen.`);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={goBackInStack}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        {/* TOP CODEX TOOLBAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={goBackInStack}
            accessibilityRole="button"
            accessibilityLabel={history.length > 1 ? 'Torna alla voce precedente' : 'Chiudi voce'}
          >
            <ArrowLeft size={18} color={colors.brassLight} />
            <Text style={styles.navBtnText}>
              {history.length > 1 ? `Indietro (${history.length - 1})` : 'Indice'}
            </Text>
          </TouchableOpacity>

          <View style={styles.topActions}>
            <TouchableOpacity
              style={[styles.toolIconBtn, largeFont && styles.toolIconBtnActive]}
              onPress={() => setLargeFont((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel="Cambia dimensione carattere"
            >
              <TypeIcon size={15} color={largeFont ? colors.void : colors.parchmentLight} />
              <Text style={[styles.toolIconLabel, largeFont && { color: colors.void }]}>
                {largeFont ? 'A+' : 'A'}
              </Text>
            </TouchableOpacity>

            {canReadGmContent ? (
              <TouchableOpacity
                style={[styles.toolIconBtn, playerPreviewMode && styles.toolIconBtnActive]}
                onPress={() => setPlayerPreviewMode((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel={
                  playerPreviewMode
                    ? 'Disattiva anteprima giocatore'
                    : 'Attiva anteprima vista giocatore'
                }
              >
                {playerPreviewMode ? (
                  <Eye size={15} color={colors.void} />
                ) : (
                  <EyeOff size={15} color={colors.brassLight} />
                )}
                <Text
                  style={[styles.toolIconLabel, playerPreviewMode && { color: colors.void }]}
                >
                  {playerPreviewMode ? 'Vista PG' : 'Vista GM'}
                </Text>
              </TouchableOpacity>
            ) : null}

            {history.length > 1 ? (
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Chiudi e torna all’indice"
              >
                <X size={19} color={colors.parchmentLight} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.brassBase} />
            <Text style={styles.loadingText}>Apertura pergamena...</Text>
          </View>
        ) : error || !entity ? (
          <View style={styles.centerBox}>
            <BookOpen size={36} color={colors.crimsonLight} />
            <Text style={styles.errorTitle}>{error || 'Voce non trovata'}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => currentEntityId && void loadCurrent(currentEntityId, true)}
            >
              <Text style={styles.retryBtnText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* GM ANTI-SPOILER VISIBILITY BANNER */}
            {canReadGmContent && visBadge ? (
              <View
                style={[
                  styles.visibilityBanner,
                  {
                    backgroundColor: visBadge.bgColor,
                    borderColor: visBadge.borderColor,
                  },
                ]}
              >
                {entity.is_campaign_document ? (
                  <FileText size={14} color={visBadge.textColor} />
                ) : entity.visibility === 'public' && !entity.admin_only ? (
                  <Eye size={14} color={visBadge.textColor} />
                ) : (
                  <Lock size={14} color={visBadge.textColor} />
                )}
                <Text style={[styles.visibilityBannerText, { color: visBadge.textColor }]}>
                  {visBadge.label}
                  {entity.archived_at ? ' · ARCHIVIATA' : ''}
                </Text>
              </View>
            ) : null}

            {playerPreviewMode ? (
              <View style={styles.previewNotice}>
                <Shield size={14} color={colors.brassLight} />
                <Text style={styles.previewNoticeText}>
                  Anteprima Giocatore attiva: note segrete GM, loot, statblock riservati e legami segreti sono nascosti.
                </Text>
              </View>
            ) : null}

            {/* ENTITY HEADER */}
            <View style={styles.titleBlock}>
              <View style={styles.badgeRow}>
                <View style={styles.typePill}>
                  <Text style={styles.typePillText}>
                    {WIKI_TYPE_LABELS[entity.type] ?? String(entity.type).toUpperCase()}
                  </Text>
                </View>
                {entity.type === 'lore' && entity.is_chapter && entity.sort_order ? (
                  <View style={styles.chapterPill}>
                    <Text style={styles.chapterPillText}>CAPITOLO {entity.sort_order}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.entityTitle}>{entity.name}</Text>
              {entity.description ? (
                <Text style={styles.entitySubtitle}>{entity.description}</Text>
              ) : null}
            </View>

            {heroUri ? (
              <Image source={{ uri: heroUri }} style={styles.heroImage} resizeMode="cover" />
            ) : null}

            {/* MONSTER / NPC -> SEND TO LIVE INITIATIVE BRIDGE (GM ONLY) */}
            {effectiveGmSectionsVisible &&
            canSendToInitiative &&
            onSendMonsterToInitiative &&
            (entity.type === 'monster' || hasCombatStats) ? (
              <View style={styles.initiativeBridgeBox}>
                {!initPromptOpen ? (
                  <TouchableOpacity
                    style={styles.initiativeBridgeBtn}
                    onPress={() => setInitPromptOpen(true)}
                  >
                    <Swords size={16} color={colors.void} />
                    <Text style={styles.initiativeBridgeBtnText}>
                      Invia {entity.name} all’Iniziativa Live
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.initPromptRow}
                  >
                    <TextInput
                      style={styles.initPromptInput}
                      placeholder="Iniziativa tirata (es. 15)"
                      placeholderTextColor={colors.parchmentMuted}
                      keyboardType="number-pad"
                      value={initRollInput}
                      onChangeText={setInitRollInput}
                      autoFocus
                    />
                    <TouchableOpacity
                      style={styles.initConfirmBtn}
                      onPress={handleConfirmSendInitiative}
                    >
                      <Text style={styles.initiativeBridgeBtnText}>Aggiungi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.closeIconBtn}
                      onPress={() => setInitPromptOpen(false)}
                    >
                      <X size={16} color={colors.parchmentMuted} />
                    </TouchableOpacity>
                  </KeyboardAvoidingView>
                )}
              </View>
            ) : null}

            {/* LINKED MISSION */}
            {linkedMissionTitle ? (
              <View style={styles.linkedMissionBanner}>
                <Flag size={14} color={colors.brassLight} />
                <Text style={styles.linkedMissionText}>
                  Missione collegata: {linkedMissionTitle}
                </Text>
              </View>
            ) : null}

            {/* GEOGRAPHY & ATLANTE MAPS LINKS */}
            {(directLinkedMaps.length > 0 || mapRelations.length > 0) && onOpenMap ? (
              <View style={styles.relationsSection}>
                <Text style={styles.sectionEyebrow}>COLLOCAZIONE GEOGRAFICA & MAPPE</Text>
                <View style={styles.relationsWrap}>
                  {directLinkedMaps.map((m) => (
                    <TouchableOpacity
                      key={`direct-${m.id}`}
                      style={styles.mapRelChip}
                      onPress={() => onOpenMap(m)}
                    >
                      <MapIcon size={14} color={colors.void} />
                      <Text style={styles.mapRelChipText}>Mappa: {m.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {mapRelations.map((rel) => {
                    const targetMap = mapsById.get(rel.targetId);
                    if (!targetMap) return null;
                    return (
                      <TouchableOpacity
                        key={rel.id}
                        style={styles.mapRelChipSecondary}
                        onPress={() => onOpenMap(targetMap)}
                      >
                        <MapIcon size={14} color={colors.brassLight} />
                        <Text style={styles.mapRelChipSecondaryText}>
                          {rel.label}: <Text style={{ fontWeight: '900' }}>{rel.targetName}</Text>
                        </Text>
                        <ArrowRight size={13} color={colors.brassLight} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* NPC PUBLIC PROFILE */}
            {entity.type === 'npc' && (npcRace || npcClass || npcAge) ? (
              <View style={styles.metaCard}>
                <Text style={styles.sectionEyebrow}>PROFILO RAPIDO PNG</Text>
                <View style={styles.threeCols}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metaCap}>RAZZA</Text>
                    <Text style={styles.metaVal}>{npcRace || '—'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metaCap}>RUOLO / CLASSE</Text>
                    <Text style={styles.metaVal}>{npcClass || '—'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metaCap}>ETÀ</Text>
                    <Text style={styles.metaVal}>{npcAge || '—'}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* CHAPTER SUMMARY ACCORDION */}
            {loreSummary ? (
              <View style={styles.metaCard}>
                <TouchableOpacity
                  style={styles.summaryHeader}
                  onPress={() => setSummaryOpen((v) => !v)}
                >
                  <Text style={styles.sectionEyebrow}>RIASSUNTO CAPITOLO</Text>
                  {summaryOpen ? (
                    <ChevronUp size={16} color={colors.brassLight} />
                  ) : (
                    <ChevronDown size={16} color={colors.brassLight} />
                  )}
                </TouchableOpacity>
                {summaryOpen ? (
                  <Text style={[styles.summaryBody, largeFont && { fontSize: 16, lineHeight: 24 }]}>
                    {loreSummary}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {/* MAIN MARKDOWN BODY */}
            <View style={styles.markdownCard}>
              {entity.body ? (
                <RichMarkdownView markdown={entity.body} compact={!largeFont ? false : false} />
              ) : (
                <Text style={styles.emptyBodyText}>Nessun testo descrittivo registrato.</Text>
              )}
            </View>

            {/* PUBLIC STATBLOCK */}
            {(entity.type === 'monster' || entity.type === 'npc') && monsterStatblock ? (
              <View style={styles.metaCard}>
                <Text style={styles.sectionEyebrow}>STATBLOCK</Text>
                <RichMarkdownView markdown={monsterStatblock} compact />
              </View>
            ) : null}

            {/* MULTI-HOP WIKI RELATIONSHIPS */}
            {wikiRelations.length > 0 ? (
              <View style={styles.relationsSection}>
                <Text style={styles.sectionEyebrow}>
                  COLLEGAMENTI NARRATIVI ({wikiRelations.length})
                </Text>
                <View style={{ gap: 7 }}>
                  {wikiRelations.map((rel) => (
                    <TouchableOpacity
                      key={rel.id}
                      style={styles.wikiRelRow}
                      onPress={() => navigateToRelatedWiki(rel.targetId)}
                    >
                      <View style={styles.relTypePill}>
                        <Text style={styles.relTypeText}>
                          {WIKI_TYPE_LABELS[rel.targetType] ?? rel.targetType.toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.relLabelText}>
                          {rel.direction === 'outgoing' ? `${rel.label} →` : `← ${rel.label}`}
                        </Text>
                        <Text style={styles.relTargetName}>{rel.targetName}</Text>
                      </View>
                      {canReadGmContent && rel.targetVisibility === 'secret' ? (
                        <Lock size={13} color={colors.visibilitySecret} />
                      ) : null}
                      <ArrowRight size={15} color={colors.brassLight} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {/* EXTRA GALLERY */}
            {extraImages.length > 0 ? (
              <View style={styles.relationsSection}>
                <Text style={styles.sectionEyebrow}>
                  GALLERIA ILLUSTRATA ({extraImages.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {extraImages.map((uri, idx) => (
                    <Image
                      key={`${uri}-${idx}`}
                      source={{ uri }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* GM SECRET SECTIONS */}
            {effectiveGmSectionsVisible && hasCombatStats ? (
              <View style={styles.gmSecretCard}>
                <Text style={styles.gmSecretTitle}>STATISTICHE COMBATTIMENTO (SOLO GM)</Text>
                <View style={styles.threeCols}>
                  {combatStats.hp ? (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.metaCap}>PF</Text>
                      <Text style={styles.metaVal}>{combatStats.hp}</Text>
                    </View>
                  ) : null}
                  {combatStats.ac ? (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.metaCap}>CA</Text>
                      <Text style={styles.metaVal}>{combatStats.ac}</Text>
                    </View>
                  ) : null}
                  {combatStats.cr ? (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.metaCap}>GS</Text>
                      <Text style={styles.metaVal}>{combatStats.cr}</Text>
                    </View>
                  ) : null}
                </View>
                {combatStats.attacks ? (
                  <Text style={styles.gmSecretBody}>{combatStats.attacks}</Text>
                ) : null}
              </View>
            ) : null}

            {effectiveGmSectionsVisible && npcRelationships ? (
              <View style={styles.gmSecretCard}>
                <Text style={styles.gmSecretTitle}>RAPPORTI INTERPERSONALI (SOLO GM)</Text>
                <Text style={styles.gmSecretBody}>{npcRelationships}</Text>
              </View>
            ) : null}

            {effectiveGmSectionsVisible && gmLoot ? (
              <View style={styles.gmSecretCard}>
                <Text style={styles.gmSecretTitle}>TESORI & LOOT (SOLO GM)</Text>
                <Text style={styles.gmSecretBody}>{gmLoot}</Text>
              </View>
            ) : null}

            {effectiveGmSectionsVisible && gmNotes ? (
              <View style={styles.gmSecretCard}>
                <Text style={styles.gmSecretTitle}>NOTE SEGRETE DEL MASTER</Text>
                <Text style={styles.gmSecretBody}>{gmNotes}</Text>
              </View>
            ) : null}

            {/* TAGS */}
            {entity.tags && entity.tags.length > 0 ? (
              <View style={styles.tagsWrap}>
                {entity.tags.map((t, idx) => (
                  <View key={`${t}-${idx}`} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>#{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  navBtn: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  navBtnText: {
    color: colors.brassLight,
    fontSize: 14,
    fontWeight: '800',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toolIconBtn: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  toolIconBtnActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassBase,
  },
  toolIconLabel: {
    color: colors.parchmentLight,
    fontSize: 12,
    fontWeight: '800',
  },
  closeIconBtn: {
    minWidth: 42,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    color: colors.parchmentMuted,
    fontSize: 14,
  },
  errorTitle: {
    color: colors.parchmentLight,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.brassBase,
    justifyContent: 'center',
  },
  retryBtnText: {
    color: colors.void,
    fontWeight: '900',
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 44,
    gap: 14,
  },
  visibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  visibilityBannerText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  previewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.visibilitySelectiveBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brassDark,
    padding: 10,
  },
  previewNoticeText: {
    flex: 1,
    color: colors.brassLight,
    fontSize: 12,
    lineHeight: 17,
  },
  titleBlock: {
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typePill: {
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  typePillText: {
    color: colors.brassLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chapterPill: {
    backgroundColor: colors.visibilitySelectiveBg,
    borderWidth: 1,
    borderColor: colors.brassBase,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  chapterPillText: {
    color: colors.brassLight,
    fontSize: 11,
    fontWeight: '800',
  },
  entityTitle: {
    color: colors.parchmentLight,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  entitySubtitle: {
    color: colors.parchmentMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: colors.stone,
  },
  initiativeBridgeBox: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brassDark,
    padding: 10,
  },
  initiativeBridgeBtn: {
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: colors.brassBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  initiativeBridgeBtnText: {
    color: colors.void,
    fontSize: 13,
    fontWeight: '900',
  },
  initPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  initPromptInput: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.void,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
    color: colors.parchmentLight,
    fontSize: 14,
  },
  initConfirmBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.brassBase,
    justifyContent: 'center',
  },
  linkedMissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.visibilitySelectiveBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  linkedMissionText: {
    flex: 1,
    color: colors.brassLight,
    fontSize: 13,
    fontWeight: '700',
  },
  relationsSection: {
    gap: 8,
  },
  sectionEyebrow: {
    color: colors.brassBase,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  relationsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapRelChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    borderRadius: 9,
    paddingHorizontal: 14,
  },
  mapRelChipText: {
    color: colors.void,
    fontSize: 13,
    fontWeight: '900',
  },
  mapRelChipSecondary: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.stoneSurface,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 12,
  },
  mapRelChipSecondaryText: {
    color: colors.brassLight,
    fontSize: 13,
    fontWeight: '700',
  },
  metaCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 14,
    gap: 8,
  },
  threeCols: {
    flexDirection: 'row',
    gap: 10,
  },
  metaCap: {
    color: colors.parchmentMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  metaVal: {
    color: colors.parchmentLight,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryBody: {
    color: colors.parchmentLight,
    fontSize: 14,
    lineHeight: 22,
  },
  markdownCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 16,
  },
  emptyBodyText: {
    color: colors.parchmentMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
  wikiRelRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  relTypePill: {
    backgroundColor: colors.stone,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  relTypeText: {
    color: colors.brassLight,
    fontSize: 10,
    fontWeight: '800',
  },
  relLabelText: {
    color: colors.parchmentMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  relTargetName: {
    color: colors.parchmentLight,
    fontSize: 14,
    fontWeight: '800',
  },
  galleryImage: {
    width: 190,
    height: 135,
    borderRadius: 10,
    backgroundColor: colors.stone,
  },
  gmSecretCard: {
    backgroundColor: colors.visibilitySecretBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.visibilitySecretBorder,
    padding: 14,
    gap: 8,
  },
  gmSecretTitle: {
    color: colors.visibilitySecret,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  gmSecretBody: {
    color: colors.parchmentLight,
    fontSize: 14,
    lineHeight: 21,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagChipText: {
    color: colors.parchmentMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});
