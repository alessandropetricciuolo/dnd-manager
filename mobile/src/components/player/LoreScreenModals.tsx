import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Coins,
  Flag,
  Layers,
  Map as MapIcon,
  Shield,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import {
  extractWikiEntityBody,
  resolveBackgroundCatalogInfo,
  resolveRaceAndSubraceLabels,
  resolveTelegramOrImageUrl,
} from '../../lib/long-campaign-helpers';
import { resolveEffectiveCharacterFields } from '../../lib/character-sheet';
import { CampaignMap, Character, WikiEntity } from '../../types';
import { RichMarkdownView } from '../common/RichMarkdownView';

const WIKI_TYPE_LABELS: Record<string, string> = {
  npc: 'PNG',
  location: 'LUOGO',
  monster: 'MOSTRO',
  item: 'OGGETTO',
  lore: 'CRONACA',
  faction: 'FAZIONE',
};

const MAP_TYPE_LABELS: Record<string, string> = {
  world: 'Mappa Mondo',
  city: 'Città / Regione',
  region: 'Regione',
  dungeon: 'Dungeon / Luogo',
  building: 'Edificio',
  district: 'Quartiere',
};

export function formatMapTypeLabel(mapType?: string | null): string {
  if (!mapType) return 'Mappa';
  return MAP_TYPE_LABELS[mapType.toLowerCase()] ?? mapType.toUpperCase();
}

export interface WikiEntityReaderModalProps {
  entity: WikiEntity | null;
  isGmOrAdmin: boolean;
  linkedMissionTitle?: string | null;
  linkedMaps?: CampaignMap[];
  onOpenLinkedMap?: (map: CampaignMap) => void;
  onClose: () => void;
}

export const WikiEntityReaderModal: React.FC<WikiEntityReaderModalProps> = ({
  entity,
  isGmOrAdmin,
  linkedMissionTitle,
  linkedMaps = [],
  onOpenLinkedMap,
  onClose,
}) => {
  const [summaryOpen, setSummaryOpen] = useState(true);

  if (!entity) return null;

  const attrs = (entity.attributes ?? {}) as Record<string, any>;
  const body = extractWikiEntityBody(entity.content);
  const heroUri = resolveTelegramOrImageUrl(entity.image_url, entity.telegram_fallback_id);

  const extraImages: string[] = Array.isArray(attrs.images)
    ? attrs.images
        .map((img: any) =>
          typeof img === 'string'
            ? resolveTelegramOrImageUrl(img, null)
            : resolveTelegramOrImageUrl(img?.url ?? img?.image_url, img?.telegram_fallback_id),
        )
        .filter((u): u is string => Boolean(u))
    : [];

  const isChapter = Boolean(attrs.is_chapter || (entity.sort_order != null && entity.sort_order > 0));
  const loreSummary = typeof attrs.summary === 'string' ? attrs.summary.trim() : '';

  const npcRace = typeof attrs.race === 'string' ? attrs.race.trim() : '';
  const npcClass = typeof attrs.class === 'string' ? attrs.class.trim() : '';
  const npcAge = typeof attrs.age === 'string' ? attrs.age.trim() : '';
  const npcRelationships = typeof attrs.relationships === 'string' ? attrs.relationships.trim() : '';

  const monsterStatblock = typeof attrs.statblock === 'string' ? attrs.statblock.trim() : '';
  const combatStats = (attrs.combat_stats ?? {}) as {
    hp?: string;
    ac?: string;
    cr?: string;
    attacks?: string;
  };
  const hasCombatStats = Boolean(
    combatStats.hp?.trim() || combatStats.ac?.trim() || combatStats.cr?.trim() || combatStats.attacks?.trim(),
  );
  const gmLoot = typeof attrs.loot === 'string' ? attrs.loot.trim() : '';
  const gmNotes = typeof attrs.gm_notes === 'string' ? attrs.gm_notes.trim() : '';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.headerBadgesRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {WIKI_TYPE_LABELS[entity.type] ?? entity.type.toUpperCase()}
                  </Text>
                </View>
                {entity.type === 'lore' && isChapter && entity.sort_order ? (
                  <View style={styles.chapterBadge}>
                    <Text style={styles.chapterBadgeText}>CAPITOLO {entity.sort_order}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {entity.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Chiudi voce wiki">
              <X size={18} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {heroUri ? (
              <Image source={{ uri: heroUri }} style={styles.heroImage} resizeMode="cover" />
            ) : null}

            {linkedMissionTitle ? (
              <View style={styles.linkedBanner}>
                <Flag size={13} color={colors.brassLight} />
                <Text style={styles.linkedBannerText}>Missione collegata: {linkedMissionTitle}</Text>
              </View>
            ) : null}

            {linkedMaps.length > 0 && onOpenLinkedMap ? (
              <View style={styles.linkedMapsWrap}>
                {linkedMaps.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.linkedMapChip}
                    onPress={() => onOpenLinkedMap(m)}
                  >
                    <MapIcon size={13} color={colors.void} />
                    <Text style={styles.linkedMapChipText}>Apri Mappa: {m.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* NPC Quick Profile */}
            {entity.type === 'npc' && (npcRace || npcClass || npcAge) ? (
              <View style={styles.metaGridCard}>
                <Text style={styles.sectionEyebrow}>PROFILO RAPIDO PNG</Text>
                <View style={styles.threeColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metaSmallLabel}>RAZZA</Text>
                    <Text style={styles.metaSmallVal}>{npcRace || '—'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metaSmallLabel}>CLASSE / RUOLO</Text>
                    <Text style={styles.metaSmallVal}>{npcClass || '—'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metaSmallLabel}>ETÀ</Text>
                    <Text style={styles.metaSmallVal}>{npcAge || '—'}</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Lore Chapter Summary */}
            {loreSummary ? (
              <View style={styles.summaryAccordion}>
                <TouchableOpacity
                  style={styles.summaryHeader}
                  onPress={() => setSummaryOpen((v) => !v)}
                >
                  <Text style={styles.sectionEyebrow}>RIASSUNTO</Text>
                  {summaryOpen ? (
                    <ChevronUp size={15} color={colors.brassLight} />
                  ) : (
                    <ChevronDown size={15} color={colors.brassLight} />
                  )}
                </TouchableOpacity>
                {summaryOpen && <Text style={styles.summaryText}>{loreSummary}</Text>}
              </View>
            ) : null}

            {/* Main Markdown Content */}
            {body ? (
              <RichMarkdownView markdown={body} />
            ) : (
              <Text style={styles.emptyNotice}>Nessun testo descrittivo registrato.</Text>
            )}

            {/* Monster Public Statblock */}
            {entity.type === 'monster' && monsterStatblock ? (
              <View style={styles.metaGridCard}>
                <Text style={styles.sectionEyebrow}>STATBLOCK</Text>
                <RichMarkdownView markdown={monsterStatblock} compact />
              </View>
            ) : null}

            {/* Extra Image Gallery */}
            {extraImages.length > 0 ? (
              <View style={{ gap: 6 }}>
                <Text style={styles.sectionEyebrow}>GALLERIA IMMAGINI ({extraImages.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {extraImages.map((uri, idx) => (
                    <Image key={`${uri}-${idx}`} source={{ uri }} style={styles.galleryThumb} resizeMode="cover" />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* GM-Only Sections (strictly gated like Web GmOnlySection) */}
            {isGmOrAdmin && entity.type === 'monster' && hasCombatStats ? (
              <View style={styles.gmBox}>
                <Text style={styles.gmBoxTitle}>STATISTICHE COMBATTIMENTO (SOLO GM)</Text>
                <View style={styles.threeColRow}>
                  {combatStats.hp ? (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.metaSmallLabel}>PF</Text>
                      <Text style={styles.metaSmallVal}>{combatStats.hp}</Text>
                    </View>
                  ) : null}
                  {combatStats.ac ? (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.metaSmallLabel}>CA</Text>
                      <Text style={styles.metaSmallVal}>{combatStats.ac}</Text>
                    </View>
                  ) : null}
                  {combatStats.cr ? (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.metaSmallLabel}>GS</Text>
                      <Text style={styles.metaSmallVal}>{combatStats.cr}</Text>
                    </View>
                  ) : null}
                </View>
                {combatStats.attacks ? <Text style={styles.gmBodyText}>{combatStats.attacks}</Text> : null}
              </View>
            ) : null}

            {isGmOrAdmin && npcRelationships ? (
              <View style={styles.gmBox}>
                <Text style={styles.gmBoxTitle}>RAPPORTI INTERPERSONALI (SOLO GM)</Text>
                <Text style={styles.gmBodyText}>{npcRelationships}</Text>
              </View>
            ) : null}

            {isGmOrAdmin && gmLoot ? (
              <View style={styles.gmBox}>
                <Text style={styles.gmBoxTitle}>TESORI / LOOT (SOLO GM)</Text>
                <Text style={styles.gmBodyText}>{gmLoot}</Text>
              </View>
            ) : null}

            {isGmOrAdmin && gmNotes ? (
              <View style={styles.gmBox}>
                <Text style={styles.gmBoxTitle}>NOTE SEGRETE GM</Text>
                <Text style={styles.gmBodyText}>{gmNotes}</Text>
              </View>
            ) : null}

            {entity.tags && entity.tags.length > 0 ? (
              <View style={styles.tagsRow}>
                {entity.tags.map((t, idx) => (
                  <View key={`${t}-${idx}`} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>#{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Chiudi Voce</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export interface MapViewerModalProps {
  map: CampaignMap | null;
  allMaps: CampaignMap[];
  linkedWikiEntity?: WikiEntity | null;
  onSelectMap: (nextMap: CampaignMap) => void;
  onOpenWikiEntity?: (entity: WikiEntity) => void;
  onClose: () => void;
}

export const MapViewerModal: React.FC<MapViewerModalProps> = ({
  map,
  allMaps,
  linkedWikiEntity,
  onSelectMap,
  onOpenWikiEntity,
  onClose,
}) => {
  const [zoomFactor, setZoomFactor] = useState<1 | 2 | 3>(1);

  const parentMap = useMemo(
    () => (map?.parent_map_id ? allMaps.find((m) => m.id === map.parent_map_id) ?? null : null),
    [map?.parent_map_id, allMaps],
  );
  const childMaps = useMemo(
    () => (map ? allMaps.filter((m) => m.parent_map_id === map.id) : []),
    [map, allMaps],
  );

  if (!map) return null;

  const resolvedUri = resolveTelegramOrImageUrl(map.image_url, null);
  const screenWidth = Math.max(280, Dimensions.get('window').width - 56);
  const canvasWidth = screenWidth * zoomFactor;
  const canvasHeight = 260 * zoomFactor;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={() => {
        setZoomFactor(1);
        onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.headerBadgesRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>{formatMapTypeLabel(map.map_type)}</Text>
                </View>
                {parentMap ? (
                  <TouchableOpacity
                    style={styles.parentBreadcrumbChip}
                    onPress={() => {
                      setZoomFactor(1);
                      onSelectMap(parentMap);
                    }}
                  >
                    <Text style={styles.parentBreadcrumbText}>↑ {parentMap.name}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {map.name}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setZoomFactor(1);
                onClose();
              }}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Chiudi mappa"
            >
              <X size={18} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* Zoom Controls */}
            <View style={styles.zoomBar}>
              <Text style={styles.metaSmallLabel}>INGRANDIMENTO CARTINA ({zoomFactor}×)</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  disabled={zoomFactor <= 1}
                  onPress={() => setZoomFactor((z) => (z === 3 ? 2 : 1))}
                >
                  <ZoomOut size={14} color={colors.parchmentLight} />
                  <Text style={styles.zoomBtnText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  disabled={zoomFactor >= 3}
                  onPress={() => setZoomFactor((z) => (z === 1 ? 2 : 3))}
                >
                  <ZoomIn size={14} color={colors.brassLight} />
                  <Text style={styles.zoomBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Map Image Viewport */}
            <ScrollView horizontal showsHorizontalScrollIndicator style={styles.mapViewport}>
              <ScrollView
                nestedScrollEnabled
                maximumZoomScale={4}
                minimumZoomScale={1}
                showsVerticalScrollIndicator
              >
                {resolvedUri ? (
                  <Image
                    source={{ uri: resolvedUri }}
                    style={{ width: canvasWidth, height: canvasHeight, borderRadius: 8 }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[styles.portraitPlaceholder, { width: screenWidth, height: 220 }]}>
                    <MapIcon size={40} color={colors.brassBase} />
                    <Text style={styles.emptyNotice}>Immagine mappa non disponibile.</Text>
                  </View>
                )}
              </ScrollView>
            </ScrollView>

            {map.description?.trim() ? (
              <RichMarkdownView markdown={map.description} compact />
            ) : null}

            {linkedWikiEntity && onOpenWikiEntity ? (
              <TouchableOpacity
                style={styles.linkedMapChip}
                onPress={() => {
                  setZoomFactor(1);
                  onOpenWikiEntity(linkedWikiEntity);
                }}
              >
                <BookOpen size={14} color={colors.void} />
                <Text style={styles.linkedMapChipText}>
                  Leggi Voce Wiki: {linkedWikiEntity.name}
                </Text>
              </TouchableOpacity>
            ) : null}

            {childMaps.length > 0 ? (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Layers size={14} color={colors.brassLight} />
                  <Text style={styles.sectionEyebrow}>SOTTOMAPPE E LUOGHI INTERNI ({childMaps.length})</Text>
                </View>
                {childMaps.map((child) => (
                  <TouchableOpacity
                    key={child.id}
                    style={styles.subMapRow}
                    onPress={() => {
                      setZoomFactor(1);
                      onSelectMap(child);
                    }}
                  >
                    <MapIcon size={14} color={colors.brassBase} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subMapName}>{child.name}</Text>
                      <Text style={styles.metaSmallLabel}>{formatMapTypeLabel(child.map_type)}</Text>
                    </View>
                    <Text style={styles.parentBreadcrumbText}>Apri →</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setZoomFactor(1);
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Chiudi Cartina</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export interface CompanionDossierModalProps {
  companion: Character | null;
  partyBadge?: { name: string; color?: string | null } | null;
  noteValue: string;
  onChangeNote: (text: string) => void;
  onPersistNote: () => void;
  onClose: () => void;
}

export const CompanionDossierModal: React.FC<CompanionDossierModalProps> = ({
  companion,
  partyBadge,
  noteValue,
  onChangeNote,
  onPersistNote,
  onClose,
}) => {
  if (!companion) return null;

  const effective = resolveEffectiveCharacterFields(companion);
  const { raceLabel, subraceLabel } = resolveRaceAndSubraceLabels({
    raceSlug: companion.race_slug,
    subclassSlug: companion.subclass_slug,
    sheetRaceLabel: effective.sheet?.raceLabel,
    sheetSubraceLabel: effective.sheet?.subraceLabel,
  });
  const bgInfo = resolveBackgroundCatalogInfo({
    backgroundSlug: companion.background_slug,
    sheetBackgroundLabel: effective.sheet?.backgroundLabel,
  });
  const portraitUri = resolveTelegramOrImageUrl(companion.image_url, null);
  const identityLine = [
    subraceLabel ?? raceLabel,
    effective.characterClass,
    effective.classSubclass ? `(${effective.classSubclass})` : null,
    bgInfo.label ? `· ${bgInfo.label}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.headerBadgesRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>LV {effective.level ?? companion.level ?? 1}</Text>
                </View>
                {partyBadge ? (
                  <View
                    style={[
                      styles.chapterBadge,
                      partyBadge.color ? { borderColor: partyBadge.color } : undefined,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chapterBadgeText,
                        partyBadge.color ? { color: partyBadge.color } : undefined,
                      ]}
                    >
                      {partyBadge.name.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.title}>{effective.name || companion.name}</Text>
              {identityLine ? <Text style={styles.companionSubText}>{identityLine}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Chiudi compagno">
              <X size={18} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {portraitUri ? (
              <Image source={{ uri: portraitUri }} style={styles.companionPortrait} resizeMode="contain" />
            ) : (
              <View style={[styles.portraitPlaceholder, { height: 170 }]}>
                <Users size={44} color={colors.brassBase} />
                <Text style={styles.emptyNotice}>Nessun ritratto disponibile</Text>
              </View>
            )}

            {companion.background?.trim() ? (
              <View style={styles.metaGridCard}>
                <Text style={styles.sectionEyebrow}>STORIA & DESCRIZIONE PUBBLICA</Text>
                <Text style={styles.summaryText}>{companion.background.trim()}</Text>
              </View>
            ) : null}

            <View style={{ gap: 6 }}>
              <Text style={styles.sectionEyebrow}>LE TUE NOTE PERSONALI (SALVATE SUL TELEFONO)</Text>
              <TextInput
                style={styles.notesInput}
                value={noteValue}
                onChangeText={onChangeNote}
                onBlur={onPersistNote}
                placeholder="Scrivi liberamente le tue note su questo compagno..."
                placeholderTextColor={colors.parchmentMuted}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                onPersistNote();
                onClose();
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Salva e Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 13, 16, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  headerBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: colors.stoneSurface,
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
  },
  chapterBadge: {
    backgroundColor: 'rgba(200, 157, 73, 0.14)',
    borderWidth: 1,
    borderColor: colors.brassBase,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chapterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  parentBreadcrumbChip: {
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  parentBreadcrumbText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.brassLight,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  companionSubText: {
    fontSize: 12,
    color: colors.brassLight,
    marginTop: 2,
  },
  closeBtn: {
    minWidth: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    maxHeight: 470,
  },
  bodyContent: {
    padding: 16,
    gap: 12,
  },
  heroImage: {
    width: '100%',
    height: 190,
    borderRadius: 8,
    backgroundColor: colors.void,
  },
  companionPortrait: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    backgroundColor: colors.void,
  },
  portraitPlaceholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  linkedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(200, 157, 73, 0.12)',
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  linkedBannerText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.brassLight,
  },
  linkedMapsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkedMapChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  linkedMapChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.void,
  },
  metaGridCard: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.brassBase,
  },
  threeColRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metaSmallLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  metaSmallVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginTop: 1,
  },
  summaryAccordion: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryText: {
    fontSize: 12.5,
    lineHeight: 18.5,
    color: colors.parchmentLight,
  },
  galleryThumb: {
    width: 150,
    height: 110,
    borderRadius: 8,
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  gmBox: {
    backgroundColor: 'rgba(153, 27, 27, 0.14)',
    borderWidth: 1,
    borderColor: colors.crimson,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  gmBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.crimsonLight,
  },
  gmBodyText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.parchmentLight,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagChipText: {
    fontSize: 11,
    color: colors.brassLight,
  },
  zoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  zoomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  zoomBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  mapViewport: {
    backgroundColor: colors.void,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    maxHeight: 320,
  },
  subMapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    padding: 10,
  },
  subMapName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  notesInput: {
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.parchmentLight,
    fontSize: 13,
    minHeight: 105,
  },
  emptyNotice: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.parchmentMuted,
  },
  footer: {
    padding: 12,
    backgroundColor: colors.stone,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  primaryBtn: {
    backgroundColor: colors.brassBase,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.void,
  },
});
