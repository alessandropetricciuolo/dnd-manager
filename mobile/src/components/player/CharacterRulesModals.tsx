import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BookOpen, ChevronDown, ChevronRight, Clock, Coins, Search, Shield, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { resolveImageUrl } from '../../utils/imageUrl';
import { RichMarkdownView } from '../common/RichMarkdownView';

export interface RulesDetailModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  markdown: string;
  onClose: () => void;
}

export const RulesDetailModal: React.FC<RulesDetailModalProps> = ({
  visible,
  title,
  subtitle,
  markdown,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              {subtitle ? <Text style={styles.eyebrow}>{subtitle.toUpperCase()}</Text> : null}
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Chiudi regole"
            >
              <X size={18} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {markdown.trim() ? (
              <RichMarkdownView markdown={markdown} />
            ) : (
              <Text style={styles.emptyText}>Testo regolistico non disponibile nello snapshot attuale.</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export interface ClassSpellListModalProps {
  visible: boolean;
  classNameLabel?: string | null;
  spellcastingMd?: string | null;
  spellsListMd?: string | null;
  spellsDetailsMd?: Record<string, string> | null;
  onClose: () => void;
}

export const ClassSpellListModal: React.FC<ClassSpellListModalProps> = ({
  visible,
  classNameLabel,
  spellcastingMd,
  spellsListMd,
  spellsDetailsMd,
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [expandedSpellKey, setExpandedSpellKey] = useState<string | null>(null);
  const [showRulesIntro, setShowRulesIntro] = useState(false);

  const detailByNorm = useMemo(() => {
    const map = new Map<string, { label: string; body: string }>();
    for (const [k, v] of Object.entries(spellsDetailsMd ?? {})) {
      if (typeof v === 'string' && v.trim()) {
        map.set(k.trim().toLowerCase(), { label: k, body: v });
      }
    }
    return map;
  }, [spellsDetailsMd]);

  const listLines = useMemo(() => {
    const raw = (spellsListMd ?? '').replace(/\r\n?/g, '\n').split('\n');
    const q = search.trim().toLowerCase();
    return raw
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((line) => {
        if (!q) return true;
        if (/^#{1,6}\s+/.test(line)) return true;
        const norm = line.replace(/^[-*•]\s+/, '').trim().toLowerCase();
        const hit = detailByNorm.get(norm);
        return norm.includes(q) || Boolean(hit?.body.toLowerCase().includes(q));
      });
  }, [spellsListMd, search, detailByNorm]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.eyebrow}>COMPENDIO DI CLASSE (PHB)</Text>
              <Text style={styles.title}>
                Lista Incantesimi{classNameLabel ? ` · ${classNameLabel}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Chiudi lista incantesimi di classe"
            >
              <X size={18} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Search size={15} color={colors.parchmentMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Filtra incantesimi della lista di classe..."
              placeholderTextColor={colors.parchmentMuted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <X size={14} color={colors.parchmentMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {Boolean(spellcastingMd?.trim()) && (
              <View style={styles.rulesAccordion}>
                <TouchableOpacity
                  style={styles.rulesAccordionHeader}
                  onPress={() => setShowRulesIntro((v) => !v)}
                  activeOpacity={0.8}
                >
                  <BookOpen size={14} color={colors.brassLight} />
                  <Text style={styles.rulesAccordionTitle}>Regole di Lancio della Classe</Text>
                  {showRulesIntro ? (
                    <ChevronDown size={15} color={colors.brassBase} />
                  ) : (
                    <ChevronRight size={15} color={colors.brassBase} />
                  )}
                </TouchableOpacity>
                {showRulesIntro && (
                  <View style={styles.rulesAccordionBody}>
                    <RichMarkdownView markdown={spellcastingMd!} compact />
                  </View>
                )}
              </View>
            )}

            {listLines.length === 0 ? (
              <Text style={styles.emptyText}>Nessun incantesimo corrisponde alla ricerca.</Text>
            ) : (
              listLines.map((line, idx) => {
                if (/^#{1,6}\s+/.test(line)) {
                  return (
                    <Text key={`sh-${idx}`} style={styles.spellLevelHeader}>
                      {line.replace(/^#{1,6}\s+/, '')}
                    </Text>
                  );
                }
                const cleanName = line.replace(/^[-*•]\s+/, '').trim();
                const hit = detailByNorm.get(cleanName.toLowerCase());
                if (!hit) {
                  return (
                    <View key={`sp-${idx}`} style={styles.plainSpellRow}>
                      <Text style={styles.plainSpellText}>{cleanName}</Text>
                    </View>
                  );
                }
                const itemKey = `${idx}-${cleanName}`;
                const isOpen = expandedSpellKey === itemKey;
                return (
                  <View key={itemKey} style={styles.expandableSpellCard}>
                    <TouchableOpacity
                      style={styles.expandableSpellHeader}
                      onPress={() => setExpandedSpellKey(isOpen ? null : itemKey)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.expandableSpellTitle}>{hit.label}</Text>
                      {isOpen ? (
                        <ChevronDown size={15} color={colors.brassLight} />
                      ) : (
                        <ChevronRight size={15} color={colors.brassBase} />
                      )}
                    </TouchableOpacity>
                    {isOpen && (
                      <View style={styles.expandableSpellBody}>
                        <RichMarkdownView markdown={hit.body} compact />
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Chiudi Lista</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export interface CharacterPortraitModalProps {
  visible: boolean;
  name: string;
  level?: number | null;
  identityLine: string;
  imageUrl?: string | null;
  calendarDateLabel?: string | null;
  hoursLived?: number;
  isLongCampaign?: boolean;
  coinsGp?: number;
  coinsSp?: number;
  coinsCp?: number;
  onClose: () => void;
}

export const CharacterPortraitModal: React.FC<CharacterPortraitModalProps> = ({
  visible,
  name,
  level,
  identityLine,
  imageUrl,
  calendarDateLabel,
  hoursLived = 0,
  isLongCampaign = false,
  coinsGp = 0,
  coinsSp = 0,
  coinsCp = 0,
  onClose,
}) => {
  const resolved = resolveImageUrl(imageUrl);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.eyebrow}>DOSSIER EROE · LV {level ?? '—'}</Text>
              <Text style={styles.title}>{name}</Text>
              {identityLine ? <Text style={styles.subIdentity}>{identityLine}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Chiudi ritratto personaggio"
            >
              <X size={18} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            <View style={styles.portraitWrap}>
              {resolved ? (
                <Image source={{ uri: resolved }} style={styles.portraitImage} resizeMode="contain" />
              ) : (
                <View style={styles.portraitPlaceholder}>
                  <Shield size={54} color={colors.brassBase} />
                  <Text style={styles.emptyText}>Nessun ritratto caricato per questo eroe.</Text>
                </View>
              )}
            </View>

            {calendarDateLabel ? (
              <View style={styles.dossierMetaCard}>
                <View style={styles.dossierMetaHeader}>
                  <Clock size={14} color={colors.brassLight} />
                  <Text style={styles.dossierMetaTitle}>CRONACA TEMPORALE</Text>
                </View>
                <Text style={styles.dossierMetaMain}>{calendarDateLabel}</Text>
                <Text style={styles.dossierMetaSub}>Tempo vissuto: {hoursLived} ore</Text>
              </View>
            ) : null}

            {isLongCampaign && (
              <View style={styles.dossierMetaCard}>
                <View style={styles.dossierMetaHeader}>
                  <Coins size={14} color={colors.brassLight} />
                  <Text style={styles.dossierMetaTitle}>BORSA DEL PERSONAGGIO</Text>
                </View>
                <Text style={styles.dossierMetaMain}>
                  {coinsGp} oro · {coinsSp} argento · {coinsCp} rame
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.primaryBtn} onPress={onClose} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Chiudi Dossier</Text>
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
    backgroundColor: 'rgba(8, 7, 6, 0.86)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  eyebrow: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: colors.brassBase,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  subIdentity: {
    fontSize: 11.5,
    color: colors.brassLight,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: colors.parchmentLight,
    paddingVertical: 0,
  },
  body: {
    maxHeight: 480,
  },
  bodyContent: {
    padding: 16,
    gap: 10,
  },
  emptyText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: colors.parchmentMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  rulesAccordion: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brassDark,
    backgroundColor: colors.stone,
    overflow: 'hidden',
  },
  rulesAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rulesAccordionTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
  },
  rulesAccordionBody: {
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    padding: 12,
  },
  spellLevelHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.brassLight,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 157, 73, 0.25)',
    paddingBottom: 3,
  },
  plainSpellRow: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: colors.stone,
  },
  plainSpellText: {
    fontSize: 12.5,
    color: colors.parchmentLight,
  },
  expandableSpellCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    backgroundColor: colors.stone,
    overflow: 'hidden',
  },
  expandableSpellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  expandableSpellTitle: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.brassLight,
  },
  expandableSpellBody: {
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  portraitWrap: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.brassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  portraitPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
  },
  dossierMetaCard: {
    borderLeftWidth: 2.5,
    borderLeftColor: colors.brassBase,
    backgroundColor: colors.stone,
    borderRadius: 8,
    padding: 12,
    gap: 3,
  },
  dossierMetaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dossierMetaTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    color: colors.brassBase,
  },
  dossierMetaMain: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  dossierMetaSub: {
    fontSize: 11.5,
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
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.void,
  },
});
