import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { BookOpen, Check, Edit3, Heart, MessageSquare, Search, Shield, Skull, Sparkles, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { fetchMobileCampaignWikiIndex } from '../../api/wiki';
import { parseMonsterStatInteger } from '../../lib/wiki-cache';
import { resolveEffectiveCharacterFields } from '../../lib/character-sheet';
import type { GmLiveEntry } from '../../contexts/GmLiveContext';
import type { Character, CharacterRulesSnapshot, MobileWikiIndexItem } from '../../types';

export const LIVE_CONDITIONS = [
  ['accecato', 'Accecato'],
  ['affascinato', 'Affascinato'],
  ['assordato', 'Assordato'],
  ['avvelenato', 'Avvelenato'],
  ['afferrato', 'Afferrato'],
  ['incapacitato', 'Incapacitato'],
  ['invisibile', 'Invisibile'],
  ['paralizzato', 'Paralizzato'],
  ['pietrificato', 'Pietrificato'],
  ['prono', 'Prono'],
  ['spaventato', 'Spaventato'],
  ['stordito', 'Stordito'],
  ['trattenuto', 'Trattenuto'],
  ['esausto', 'Esausto'],
  ['sotto_tiro', 'Sotto tiro'],
  ['concentrato', 'Concentrato'],
] as const;

export const LIVE_CONDITION_LABELS: Record<string, string> = Object.fromEntries(LIVE_CONDITIONS);

// ============================================================================
// 1. CONDITIONS PICKER SHEET (48pt WCAG touch targets)
// ============================================================================

export interface GmCombatConditionsSheetProps {
  entry: GmLiveEntry | null;
  disabled: boolean;
  onToggleCondition: (entry: GmLiveEntry, conditionId: string) => void;
  onClose: () => void;
}

export const GmCombatConditionsSheet: React.FC<GmCombatConditionsSheetProps> = ({
  entry,
  disabled,
  onToggleCondition,
  onClose,
}) => {
  if (!entry) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>CONDIZIONI ATTIVE</Text>
              <Text style={styles.title} numberOfLines={1}>
                {entry.name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Chiudi condizioni"
            >
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.conditionsGrid}>
            {LIVE_CONDITIONS.map(([id, label]) => {
              const active = entry.conditions?.includes(id) ?? false;
              return (
                <TouchableOpacity
                  key={id}
                  disabled={disabled}
                  style={[styles.conditionBtn, active && styles.conditionBtnActive]}
                  onPress={() => onToggleCondition(entry, id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                >
                  <Text style={[styles.conditionBtnText, active && styles.conditionBtnTextActive]}>
                    {label}
                  </Text>
                  {active ? <Check size={15} color={colors.void} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// 2. ADD COMBATANT MODAL (From Campaign Wiki Monsters OR Manual)
// ============================================================================

export interface GmAddCombatantModalProps {
  visible: boolean;
  campaignId: string | null;
  blocked: boolean;
  onAdd: (combatant: {
    name: string;
    hp: number;
    ac: number;
    initiative: number;
  }) => void;
  onClose: () => void;
}

export const GmAddCombatantModal: React.FC<GmAddCombatantModalProps> = ({
  visible,
  campaignId,
  blocked,
  onAdd,
  onClose,
}) => {
  const [tab, setTab] = useState<'wiki' | 'manual'>('wiki');
  const [wikiMonsters, setWikiMonsters] = useState<MobileWikiIndexItem[]>([]);
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [search, setSearch] = useState('');

  const [name, setName] = useState('');
  const [hp, setHp] = useState('');
  const [ac, setAc] = useState('');
  const [initiative, setInitiative] = useState('');

  useEffect(() => {
    if (!visible || !campaignId) return;
    let cancelled = false;
    setLoadingWiki(true);
    fetchMobileCampaignWikiIndex(campaignId)
      .then((res) => {
        if (cancelled) return;
        const candidates = res.entities.filter(
          (e) => e.type === 'monster' || Boolean(e.monster_combat_preview),
        );
        setWikiMonsters(candidates);
        if (candidates.length === 0) setTab('manual');
      })
      .catch(() => {
        if (!cancelled) setTab('manual');
      })
      .finally(() => {
        if (!cancelled) setLoadingWiki(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, campaignId]);

  const filteredMonsters = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return wikiMonsters;
    return wikiMonsters.filter((m) => m.name.toLowerCase().includes(q));
  }, [wikiMonsters, search]);

  const selectWikiMonster = (item: MobileWikiIndexItem) => {
    const parsedHp = parseMonsterStatInteger(item.monster_combat_preview?.hp, 20);
    const parsedAc = parseMonsterStatInteger(item.monster_combat_preview?.ac, 13);
    setName(item.name);
    setHp(String(parsedHp));
    setAc(String(parsedAc));
    setTab('manual');
  };

  const submit = () => {
    const cleanName = name.trim();
    const numHp = Number.parseInt(hp, 10);
    const numAc = Number.parseInt(ac, 10);
    const numInit = Number.parseInt(initiative, 10);
    if (!cleanName || !Number.isFinite(numHp) || numHp < 1 || !Number.isFinite(numAc) || !Number.isFinite(numInit)) {
      Alert.alert('Dati incompleti', 'Inserisci nome, PF, CA e il risultato di Iniziativa.');
      return;
    }
    onAdd({ name: cleanName, hp: numHp, ac: numAc, initiative: numInit });
    setName('');
    setHp('');
    setAc('');
    setInitiative('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>NUOVO COMBATTENTE LIVE</Text>
              <Text style={styles.title}>Aggiungi Mostro o PNG</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.segmentedRow}>
            <TouchableOpacity
              style={[styles.segBtn, tab === 'wiki' && styles.segBtnActive]}
              onPress={() => setTab('wiki')}
            >
              <BookOpen size={14} color={tab === 'wiki' ? colors.void : colors.parchmentMuted} />
              <Text style={[styles.segText, tab === 'wiki' && styles.segTextActive]}>
                Da Wiki ({wikiMonsters.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segBtn, tab === 'manual' && styles.segBtnActive]}
              onPress={() => setTab('manual')}
            >
              <Edit3 size={14} color={tab === 'manual' ? colors.void : colors.parchmentMuted} />
              <Text style={[styles.segText, tab === 'manual' && styles.segTextActive]}>
                Valori & Iniziativa
              </Text>
            </TouchableOpacity>
          </View>

          {tab === 'wiki' ? (
            <View style={styles.wikiPickerWrap}>
              <View style={styles.searchBox}>
                <Search size={15} color={colors.parchmentMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cerca mostro nella Wiki della campagna..."
                  placeholderTextColor={colors.parchmentMuted}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                {loadingWiki ? (
                  <ActivityIndicator color={colors.brassBase} style={{ marginVertical: 24 }} />
                ) : filteredMonsters.length === 0 ? (
                  <Text style={styles.emptyHint}>
                    Nessun mostro trovato nella Wiki di questa campagna. Usa «Valori & Iniziativa» per inserirlo manualmente.
                  </Text>
                ) : (
                  filteredMonsters.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.monsterRow}
                      onPress={() => selectWikiMonster(m)}
                    >
                      <Skull size={16} color={colors.crimsonLight} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.monsterName}>{m.name}</Text>
                        <Text style={styles.monsterMeta}>
                          PF {m.monster_combat_preview?.hp || '—'} · CA {m.monster_combat_preview?.ac || '—'}
                          {m.monster_combat_preview?.cr ? ` · GS ${m.monster_combat_preview.cr}` : ''}
                        </Text>
                      </View>
                      <Text style={styles.pickLabel}>Scegli →</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          ) : (
            <View style={styles.formWrap}>
              <TextInput
                style={styles.input}
                placeholder="Nome combattente (es. Goblin Arciere 1)"
                placeholderTextColor={colors.parchmentMuted}
                value={name}
                onChangeText={setName}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="PF Max"
                  placeholderTextColor={colors.parchmentMuted}
                  keyboardType="number-pad"
                  value={hp}
                  onChangeText={setHp}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="CA"
                  placeholderTextColor={colors.parchmentMuted}
                  keyboardType="number-pad"
                  value={ac}
                  onChangeText={setAc}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Iniziativa tirata al tavolo (es. 16)"
                placeholderTextColor={colors.parchmentMuted}
                keyboardType="number-pad"
                value={initiative}
                onChangeText={setInitiative}
              />
              <TouchableOpacity
                disabled={blocked}
                style={[styles.submitBtn, blocked && { opacity: 0.45 }]}
                onPress={submit}
              >
                <Text style={styles.submitText}>Invia al GM Screen</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ============================================================================
// 3. PARTY MEMBER READ-ONLY QUICK DOSSIER MODAL
// ============================================================================

export interface GmPartyDossierModalProps {
  character: Character | null;
  onClose: () => void;
  onWhisperPlayer?: (playerId: string) => void;
}

export const GmPartyDossierModal: React.FC<GmPartyDossierModalProps> = ({
  character,
  onClose,
  onWhisperPlayer,
}) => {
  if (!character) return null;

  const effective = resolveEffectiveCharacterFields(character);
  const snap = (character.rules_snapshot ?? {}) as CharacterRulesSnapshot;
  const sheet = (snap.character_sheet ?? {}) as Record<string, any>;
  const passivePerception =
    sheet.passivePerception ?? snap.passive_perception ?? null;
  const spellDc =
    sheet.spellSaveDc ?? snap.spellcasting?.saveDc ?? null;
  const speed = sheet.speed ?? snap.speed ?? null;
  const inspiration = Boolean(sheet.inspiration ?? snap.inspiration);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.centerBackdrop}>
        <View style={styles.dossierCard}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>DOSSIER RAPIDO EROE · SOLA LETTURA</Text>
              <Text style={styles.title}>{effective.name || character.name}</Text>
              <Text style={styles.monsterMeta}>
                {effective.characterClass || 'Avventuriero'}
                {effective.classSubclass ? ` (${effective.classSubclass})` : ''} · Livello{' '}
                {effective.level || 1}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <View style={styles.dossierBody}>
            <View style={styles.statsGrid}>
              <View style={styles.statTile}>
                <Heart size={15} color={colors.emerald} />
                <Text style={styles.statBig}>
                  {effective.hitPoints ?? 0}
                  {effective.maxHp ? `/${effective.maxHp}` : ''}
                </Text>
                <Text style={styles.statCap}>PUNTI FERITA</Text>
              </View>
              <View style={styles.statTile}>
                <Shield size={15} color={colors.brassLight} />
                <Text style={styles.statBig}>{character.armor_class ?? 10}</Text>
                <Text style={styles.statCap}>CLASSE ARMATURA</Text>
              </View>
              <View style={styles.statTile}>
                <Sparkles size={15} color={colors.brassBase} />
                <Text style={styles.statBig}>{passivePerception ?? '—'}</Text>
                <Text style={styles.statCap}>PERC. PASSIVA</Text>
              </View>
            </View>

            <View style={styles.metaStrip}>
              <Text style={styles.metaStripItem}>CD Incantesimi: {spellDc ?? '—'}</Text>
              <Text style={styles.metaStripItem}>Velocità: {speed || '9m'}</Text>
              <Text style={styles.metaStripItem}>
                Ispirazione: {inspiration ? '★ Attiva' : 'No'}
              </Text>
            </View>

            {character.assigned_to && onWhisperPlayer ? (
              <TouchableOpacity
                style={styles.whisperBtn}
                onPress={() => {
                  const pid = character.assigned_to!;
                  onClose();
                  onWhisperPlayer(pid);
                }}
              >
                <MessageSquare size={16} color={colors.void} />
                <Text style={styles.submitText}>Invia Sussurro Segreto al Giocatore</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.74)',
  },
  centerBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  sheet: {
    maxHeight: '86%',
    backgroundColor: colors.stoneSurface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1.5,
    borderColor: colors.brassDark,
  },
  dossierCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  eyebrow: {
    color: colors.brassLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.parchmentLight,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    paddingBottom: 32,
  },
  conditionBtn: {
    width: '48%',
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    backgroundColor: colors.stone,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  conditionBtnActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  conditionBtnText: {
    color: colors.parchmentLight,
    fontSize: 13,
    fontWeight: '700',
  },
  conditionBtnTextActive: {
    color: colors.void,
    fontWeight: '900',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: colors.stone,
  },
  segBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    backgroundColor: colors.stoneSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segBtnActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassBase,
  },
  segText: {
    color: colors.parchmentMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  segTextActive: {
    color: colors.void,
  },
  wikiPickerWrap: {
    padding: 16,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.void,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.parchmentLight,
    fontSize: 14,
  },
  emptyHint: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    paddingVertical: 18,
  },
  monsterRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  monsterName: {
    color: colors.parchmentLight,
    fontSize: 14,
    fontWeight: '800',
  },
  monsterMeta: {
    color: colors.parchmentMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pickLabel: {
    color: colors.brassLight,
    fontSize: 12,
    fontWeight: '800',
  },
  formWrap: {
    padding: 16,
    paddingBottom: 28,
    gap: 10,
  },
  input: {
    minHeight: 46,
    color: colors.parchmentLight,
    backgroundColor: colors.void,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  submitBtn: {
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitText: {
    color: colors.void,
    fontSize: 14,
    fontWeight: '900',
  },
  dossierBody: {
    padding: 16,
    gap: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  statBig: {
    color: colors.parchmentLight,
    fontSize: 17,
    fontWeight: '900',
  },
  statCap: {
    color: colors.parchmentMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  metaStrip: {
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    gap: 4,
  },
  metaStripItem: {
    color: colors.parchmentLight,
    fontSize: 13,
    fontWeight: '600',
  },
  whisperBtn: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: colors.brassBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
