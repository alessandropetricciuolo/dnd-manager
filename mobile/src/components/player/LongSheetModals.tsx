import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { Check, Plus, Sparkles, X } from 'lucide-react-native';
import { supabase } from '../../api/supabase';
import {
  QUICK_WEAPONS_5E,
  buildCalculatedWeaponRow,
} from '../../lib/character-rules-calc';
import type {
  CharacterAbilityKey,
  CharacterSheetPersonality,
  CharacterSheetSpell,
  CharacterSheetWeapon,
} from '../../lib/character-sheet';
import { colors } from '../../theme/colors';
import type { AbilityScoreEntry } from '../../types';

type CompendiumSpellHit = {
  slug: string;
  name: string;
  level: number;
  school: string;
  ritual: boolean;
  concentration: boolean;
  verbal: boolean;
  somatic: boolean;
  material: boolean;
  summary: string;
  fullTextMd: string;
  sourceBook: string;
};

export interface WeaponEditModalProps {
  visible: boolean;
  onClose: () => void;
  initialWeapon?: CharacterSheetWeapon | null;
  editIndex?: number;
  abilityScores: AbilityScoreEntry[];
  proficiencyBonus?: number;
  isSaving: boolean;
  onSave: (weapon: CharacterSheetWeapon, index?: number) => Promise<boolean>;
  onDelete?: (index: number) => Promise<boolean>;
}

export const WeaponEditModal: React.FC<WeaponEditModalProps> = ({
  visible,
  onClose,
  initialWeapon,
  editIndex,
  abilityScores,
  proficiencyBonus,
  isSaving,
  onSave,
  onDelete,
}) => {
  const [presetId, setPresetId] = useState<string>(QUICK_WEAPONS_5E[4]?.id ?? 'spada-lunga');
  const [proficient, setProficient] = useState<boolean>(true);
  const [magicBonus, setMagicBonus] = useState<number>(0);
  const [name, setName] = useState<string>('');
  const [toHit, setToHit] = useState<string>('+4');
  const [damage, setDamage] = useState<string>('1d8+2');
  const [damageType, setDamageType] = useState<string>('taglienti');

  const abilityMods = useMemo(() => {
    const out: Partial<Record<CharacterAbilityKey, number>> = {};
    for (const ab of abilityScores) {
      if (ab.modifier !== undefined) out[ab.key] = ab.modifier;
    }
    return out;
  }, [abilityScores]);

  useEffect(() => {
    if (!visible) return;
    if (initialWeapon) {
      setName(initialWeapon.name);
      setToHit(initialWeapon.toHit);
      setDamage(initialWeapon.damage);
      setDamageType(initialWeapon.type);
    } else {
      const preset = QUICK_WEAPONS_5E.find((p) => p.id === presetId) ?? QUICK_WEAPONS_5E[0];
      if (preset) {
        const calc = buildCalculatedWeaponRow({
          name: preset.name,
          damageDie: preset.damageDie,
          versatileDie: preset.versatileDie,
          damageType: preset.damageType,
          mode: preset.mode,
          proficient: true,
          magicBonus: 0,
          abilityMods,
          proficiencyBonus,
        });
        setName(calc.name);
        setToHit(calc.toHit);
        setDamage(calc.damage);
        setDamageType(calc.type);
      }
      setProficient(true);
      setMagicBonus(0);
    }
  }, [visible, initialWeapon]);

  const applyPresetCalculation = (nextPresetId: string, nextProf: boolean, nextMagic: number) => {
    const preset = QUICK_WEAPONS_5E.find((p) => p.id === nextPresetId);
    if (!preset) return;
    const calc = buildCalculatedWeaponRow({
      name: preset.name,
      damageDie: preset.damageDie,
      versatileDie: preset.versatileDie,
      damageType: preset.damageType,
      mode: preset.mode,
      proficient: nextProf,
      magicBonus: nextMagic,
      abilityMods,
      proficiencyBonus,
    });
    setName(calc.name);
    setToHit(calc.toHit);
    setDamage(calc.damage);
    setDamageType(calc.type);
  };

  const handleConfirm = async () => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const ok = await onSave(
      {
        name: cleanName,
        toHit: toHit.trim() || '+0',
        damage: damage.trim() || '1d4',
        type: damageType.trim() || 'fisici',
      },
      editIndex,
    );
    if (ok) onClose();
  };

  const handleRemove = async () => {
    if (editIndex === undefined || !onDelete) return;
    const ok = await onDelete(editIndex);
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {editIndex !== undefined ? 'MODIFICA ARMA / ATTACCO' : 'AGGIUNGI ARMA / ATTACCO'}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi">
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>CALCOLO RAPIDO DA ARMA 5E</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {QUICK_WEAPONS_5E.map((preset) => {
                const active = preset.id === presetId;
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => {
                      setPresetId(preset.id);
                      applyPresetCalculation(preset.id, proficient, magicBonus);
                    }}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{preset.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.inlineRow}>
              <TouchableOpacity
                style={[styles.togglePill, proficient && styles.togglePillActive]}
                onPress={() => {
                  const next = !proficient;
                  setProficient(next);
                  applyPresetCalculation(presetId, next, magicBonus);
                }}
              >
                <Text style={[styles.togglePillText, proficient && styles.togglePillTextActive]}>
                  {proficient ? '✓ Competente' : 'Non competente'}
                </Text>
              </TouchableOpacity>

              <View style={styles.magicRow}>
                {[0, 1, 2, 3].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.magicBtn, magicBonus === m && styles.togglePillActive]}
                    onPress={() => {
                      setMagicBonus(m);
                      applyPresetCalculation(presetId, proficient, m);
                    }}
                  >
                    <Text style={[styles.togglePillText, magicBonus === m && styles.togglePillTextActive]}>
                      +{m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.fieldLabel}>NOME ARMA</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Es. Spada lunga +1"
              placeholderTextColor={colors.parchmentMuted}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>TIRO PER COLPIRE</Text>
                <TextInput
                  style={styles.input}
                  value={toHit}
                  onChangeText={setToHit}
                  placeholder="+5"
                  placeholderTextColor={colors.parchmentMuted}
                />
              </View>
              <View style={{ flex: 1.4 }}>
                <Text style={styles.fieldLabel}>FORMULA DANNI</Text>
                <TextInput
                  style={styles.input}
                  value={damage}
                  onChangeText={setDamage}
                  placeholder="1d8+3"
                  placeholderTextColor={colors.parchmentMuted}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>TIPO DI DANNO</Text>
            <TextInput
              style={styles.input}
              value={damageType}
              onChangeText={setDamageType}
              placeholder="taglienti, perforanti, contundenti..."
              placeholderTextColor={colors.parchmentMuted}
            />
          </ScrollView>

          <View style={styles.footerRow}>
            {editIndex !== undefined && onDelete && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleRemove}
                disabled={isSaving}
              >
                <Text style={styles.deleteBtnText}>Rimuovi</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              disabled={isSaving || !name.trim()}
            >
              <Text style={styles.confirmBtnText}>Salva Arma</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export interface SpellAddModalProps {
  visible: boolean;
  onClose: () => void;
  isSaving: boolean;
  onAddSpell: (spell: CharacterSheetSpell) => Promise<boolean>;
}

export const SpellAddModal: React.FC<SpellAddModalProps> = ({
  visible,
  onClose,
  isSaving,
  onAddSpell,
}) => {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<CompendiumSpellHit[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>('');
  const [manualLevel, setManualLevel] = useState<string>('0');
  const [manualSummary, setManualSummary] = useState<string>('');
  const [manualPrepared, setManualPrepared] = useState<boolean>(true);
  const [manualConcentration, setManualConcentration] = useState<boolean>(false);
  const [manualRitual, setManualRitual] = useState<boolean>(false);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setResults([]);
    setManualName('');
    setManualLevel('0');
    setManualSummary('');
    setManualPrepared(true);
    setManualConcentration(false);
    setManualRitual(false);
  }, [visible]);

  useEffect(() => {
    const q = query.trim();
    if (!visible || q.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const baseUrl = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');
        const res = await fetch(
          `${baseUrl}/api/mobile/compendium/spells?q=${encodeURIComponent(q)}&limit=15`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const payload = await res.json().catch(() => ({ spells: [] }));
        if (!cancelled && Array.isArray(payload.spells)) {
          setResults(payload.spells);
        }
      } catch {
        // Ignore network errors and allow manual entry
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 260);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, visible]);

  const handlePickCompendiumSpell = async (hit: CompendiumSpellHit) => {
    const ok = await onAddSpell({
      name: hit.name,
      level: hit.level,
      ritual: hit.ritual,
      concentration: hit.concentration,
      verbal: hit.verbal,
      somatic: hit.somatic,
      material: hit.material,
      summary: hit.summary || (hit.school ? `Scuola: ${hit.school}` : ''),
      fullTextMd: hit.fullTextMd || undefined,
      ...(hit.level > 0 ? { prepared: true } : {}),
    });
    if (ok) onClose();
  };

  const handleSaveManual = async () => {
    const cleanName = manualName.trim();
    if (!cleanName) return;
    const lvl = Math.max(0, Math.min(9, Number.parseInt(manualLevel, 10) || 0));
    const ok = await onAddSpell({
      name: cleanName,
      level: lvl,
      summary: manualSummary.trim(),
      ritual: manualRitual || undefined,
      concentration: manualConcentration || undefined,
      ...(lvl > 0 ? { prepared: manualPrepared } : {}),
    });
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>AGGIUNGI INCANTESIMO</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi">
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>CERCA NEI MANUALI ITALIANI (PHB / XANATHAR / TASHA)</Text>
            <TextInput
              style={styles.input}
              value={query}
              onChangeText={setQuery}
              placeholder="Scrivi almeno 2 lettere (es. Palla di fuoco, Cura ferite)..."
              placeholderTextColor={colors.parchmentMuted}
            />
            {searching && <ActivityIndicator size="small" color={colors.brassBase} style={{ marginVertical: 8 }} />}
            {results.map((hit) => (
              <TouchableOpacity
                key={`${hit.name}-${hit.level}-${hit.sourceBook}`}
                style={styles.spellHitRow}
                disabled={isSaving}
                onPress={() => handlePickCompendiumSpell(hit)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.spellHitName}>{hit.name}</Text>
                  <Text style={styles.spellHitMeta}>
                    {hit.level === 0 ? 'Trucchetto' : `Livello ${hit.level}`}
                    {hit.school ? ` • ${hit.school}` : ''}
                    {hit.sourceBook ? ` • ${hit.sourceBook}` : ''}
                  </Text>
                  {Boolean(hit.summary) && (
                    <Text style={styles.spellHitSummary} numberOfLines={2}>
                      {hit.summary}
                    </Text>
                  )}
                </View>
                <View style={styles.addSmallBadge}>
                  <Plus size={14} color={colors.void} />
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>OPPURE INSERISCI MANUALMENTE</Text>
            <View style={styles.twoCol}>
              <View style={{ flex: 2 }}>
                <Text style={styles.fieldLabel}>NOME INCANTESIMO</Text>
                <TextInput
                  style={styles.input}
                  value={manualName}
                  onChangeText={setManualName}
                  placeholder="Nome incantesimo"
                  placeholderTextColor={colors.parchmentMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>LIVELLO (0-9)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={manualLevel}
                  onChangeText={setManualLevel}
                  placeholder="0"
                  placeholderTextColor={colors.parchmentMuted}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>DESCRIZIONE / EFFETTO BREVE</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={manualSummary}
              onChangeText={setManualSummary}
              placeholder="Danni, portata, TS o note..."
              placeholderTextColor={colors.parchmentMuted}
            />

            <View style={styles.inlineRow}>
              {(Number.parseInt(manualLevel, 10) || 0) > 0 && (
                <TouchableOpacity
                  style={[styles.togglePill, manualPrepared && styles.togglePillActive]}
                  onPress={() => setManualPrepared((v) => !v)}
                >
                  <Text style={[styles.togglePillText, manualPrepared && styles.togglePillTextActive]}>
                    Preparato
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.togglePill, manualConcentration && styles.togglePillActive]}
                onPress={() => setManualConcentration((v) => !v)}
              >
                <Text style={[styles.togglePillText, manualConcentration && styles.togglePillTextActive]}>
                  Concentrazione
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.togglePill, manualRitual && styles.togglePillActive]}
                onPress={() => setManualRitual((v) => !v)}
              >
                <Text style={[styles.togglePillText, manualRitual && styles.togglePillTextActive]}>
                  Rituale
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Chiudi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleSaveManual}
              disabled={isSaving || !manualName.trim()}
            >
              <Text style={styles.confirmBtnText}>Salva Manuale</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export interface InventoryEditModalProps {
  visible: boolean;
  onClose: () => void;
  initialItems: string[];
  isSaving: boolean;
  onSave: (items: string[]) => Promise<boolean>;
}

export const InventoryEditModal: React.FC<InventoryEditModalProps> = ({
  visible,
  onClose,
  initialItems,
  isSaving,
  onSave,
}) => {
  const [text, setText] = useState<string>('');

  useEffect(() => {
    if (visible) {
      setText(initialItems.join('\n'));
    }
  }, [visible, initialItems]);

  const handleConfirm = async () => {
    const items = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const ok = await onSave(items);
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>MODIFICA ZAINO & OGGETTI</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi">
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            Inserisci un oggetto per riga (es. “Corda di canapa 15m”, “Pozione di guarigione x2”).
          </Text>
          <TextInput
            style={[styles.input, styles.tallMultiline]}
            multiline
            value={text}
            onChangeText={setText}
            placeholder="Un oggetto per riga..."
            placeholderTextColor={colors.parchmentMuted}
          />

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={isSaving}>
              <Text style={styles.confirmBtnText}>Salva Zaino</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export interface BioNotesEditModalProps {
  visible: boolean;
  onClose: () => void;
  initialPersonality?: CharacterSheetPersonality;
  initialPlayerNotes?: string | null;
  isSaving: boolean;
  onSave: (personality: CharacterSheetPersonality, playerNotes: string | null) => Promise<boolean>;
}

export const BioNotesEditModal: React.FC<BioNotesEditModalProps> = ({
  visible,
  onClose,
  initialPersonality,
  initialPlayerNotes,
  isSaving,
  onSave,
}) => {
  const [traits, setTraits] = useState<string>('');
  const [ideals, setIdeals] = useState<string>('');
  const [bonds, setBonds] = useState<string>('');
  const [flaws, setFlaws] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (!visible) return;
    setTraits(initialPersonality?.traits ?? '');
    setIdeals(initialPersonality?.ideals ?? '');
    setBonds(initialPersonality?.bonds ?? '');
    setFlaws(initialPersonality?.flaws ?? '');
    setNotes(initialPlayerNotes ?? '');
  }, [visible, initialPersonality, initialPlayerNotes]);

  const handleConfirm = async () => {
    const ok = await onSave(
      {
        traits: traits.trim() || undefined,
        ideals: ideals.trim() || undefined,
        bonds: bonds.trim() || undefined,
        flaws: flaws.trim() || undefined,
      },
      notes.trim() || null,
    );
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>PERSONALITÀ & NOTE GIOCATORE</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Chiudi">
              <X size={20} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>TRATTI CARATTERIALI</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={traits}
              onChangeText={setTraits}
              placeholder="Tratti distintivi del personaggio..."
              placeholderTextColor={colors.parchmentMuted}
            />

            <Text style={styles.fieldLabel}>IDEALI</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={ideals}
              onChangeText={setIdeals}
              placeholder="Principi che guidano l'eroe..."
              placeholderTextColor={colors.parchmentMuted}
            />

            <Text style={styles.fieldLabel}>LEGAMI</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={bonds}
              onChangeText={setBonds}
              placeholder="Persone, luoghi o giuramenti..."
              placeholderTextColor={colors.parchmentMuted}
            />

            <Text style={styles.fieldLabel}>DIFETTI</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              multiline
              value={flaws}
              onChangeText={setFlaws}
              placeholder="Vizi, paure o debolezze..."
              placeholderTextColor={colors.parchmentMuted}
            />

            <Text style={styles.fieldLabel}>APPUNTI DI CAMPAGNA DEL GIOCATORE</Text>
            <TextInput
              style={[styles.input, styles.tallMultiline]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="PNG incontrati, indizi, patti, missioni..."
              placeholderTextColor={colors.parchmentMuted}
            />
          </ScrollView>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Annulla</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={isSaving}>
              <Text style={styles.confirmBtnText}>Salva Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 16,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: colors.brassLight,
  },
  scrollBody: {
    maxHeight: 460,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.brassLight,
    marginTop: 8,
    marginBottom: 4,
  },
  helperText: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginBottom: 8,
    lineHeight: 16,
  },
  input: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.parchmentLight,
    fontSize: 13,
  },
  multilineInput: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  tallMultiline: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 8,
  },
  chipsRow: {
    gap: 6,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  chipTextActive: {
    color: colors.void,
    fontWeight: '800',
  },
  inlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  magicRow: {
    flexDirection: 'row',
    gap: 4,
  },
  magicBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  togglePill: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  togglePillActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  togglePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  togglePillTextActive: {
    color: colors.void,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: colors.stoneBorder,
    marginVertical: 12,
  },
  spellHitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  spellHitName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  spellHitMeta: {
    fontSize: 10.5,
    color: colors.brassLight,
    marginTop: 1,
  },
  spellHitSummary: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  addSmallBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  deleteBtn: {
    backgroundColor: colors.crimson,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.stone,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  confirmBtn: {
    flex: 1.3,
    backgroundColor: colors.brassBase,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.void,
  },
});
