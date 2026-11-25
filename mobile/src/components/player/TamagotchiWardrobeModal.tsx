import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeftRight, RotateCcw, Sparkles, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import {
  ACCENT_SWATCH_OPTIONS,
  CAPE_STYLE_OPTIONS,
  EYE_SWATCH_OPTIONS,
  FACIAL_FEATURE_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HAIR_SWATCH_OPTIONS,
  HEADGEAR_OPTIONS,
  MAIN_HAND_OPTIONS,
  OFF_HAND_OPTIONS,
  OUTFIT_SWATCH_OPTIONS,
  SKIN_SWATCH_OPTIONS,
  SwatchOption,
  TamagotchiAppearance,
  areAppearancesEqual,
  normalizeTamagotchiAppearance,
} from '../../lib/tamagotchi-appearance';
import {
  SpritePose,
  buildCharacterSpritePalette,
  resolveClassArchetype,
  resolveRaceTrait,
} from '../../lib/retro-sprite';
import { RetroTamagotchiSprite } from './RetroTamagotchiSprite';

export type WardrobeEntrySource = 'mirror' | 'chest';

type WardrobeTabKey = 'face' | 'hair' | 'outfit' | 'weapons';
type PreviewPoseMode = 'idle' | 'walk' | 'happy' | 'rest';

interface TamagotchiWardrobeModalProps {
  visible: boolean;
  entrySource: WardrobeEntrySource;
  characterName: string;
  characterClass?: string | null;
  raceSlug?: string | null;
  imageUrl?: string | null;
  currentAppearance?: TamagotchiAppearance | null;
  saving?: boolean;
  onRequestClose: () => void;
  onSave: (nextAppearance: TamagotchiAppearance | null) => Promise<{ applied: boolean; message: string }>;
}

const TABS: readonly { key: WardrobeTabKey; label: string; group: WardrobeEntrySource }[] = [
  { key: 'face', label: 'Volto & Pelle', group: 'mirror' },
  { key: 'hair', label: 'Capelli', group: 'mirror' },
  { key: 'outfit', label: 'Abiti & Cappa', group: 'chest' },
  { key: 'weapons', label: 'Armi & Mani', group: 'chest' },
];

const POSE_MODES: readonly { key: PreviewPoseMode; label: string }[] = [
  { key: 'idle', label: 'Stasi' },
  { key: 'walk', label: 'Marcia' },
  { key: 'happy', label: 'Vittoria' },
  { key: 'rest', label: 'Riposo' },
];

interface OptionGroupProps<T extends string> {
  title: string;
  options: readonly SwatchOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
}

function OptionGroup<T extends string>({
  title,
  options,
  selectedId,
  onSelect,
}: OptionGroupProps<T>) {
  return (
    <View style={styles.groupBlock}>
      <Text style={styles.groupTitle}>{title}</Text>
      <View style={styles.chipsWrap}>
        {options.map((opt) => {
          const active = opt.id === selectedId;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionChip, active && styles.optionChipActive]}
              onPress={() => onSelect(opt.id)}
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${title}: ${opt.label}`}
            >
              {opt.previewHex && (
                <View style={styles.swatchCircleWrap}>
                  <View style={[styles.swatchCircle, { backgroundColor: opt.previewHex }]} />
                  {opt.secondaryHex && (
                    <View
                      style={[
                        styles.swatchSecondaryDot,
                        { backgroundColor: opt.secondaryHex },
                      ]}
                    />
                  )}
                </View>
              )}
              <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export const TamagotchiWardrobeModal: React.FC<TamagotchiWardrobeModalProps> = ({
  visible,
  entrySource,
  characterName,
  characterClass,
  raceSlug,
  imageUrl,
  currentAppearance,
  saving = false,
  onRequestClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<WardrobeTabKey>(
    entrySource === 'mirror' ? 'face' : 'outfit'
  );
  const [draft, setDraft] = useState<TamagotchiAppearance>(
    () => normalizeTamagotchiAppearance(currentAppearance) ?? {}
  );
  const [poseMode, setPoseMode] = useState<PreviewPoseMode>('idle');
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setActiveTab(entrySource === 'mirror' ? 'face' : 'outfit');
    setDraft(normalizeTamagotchiAppearance(currentAppearance) ?? {});
    setPoseMode('idle');
    setFacing('right');
  }, [visible, entrySource, currentAppearance]);

  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % 8);
    }, 360);
    return () => clearInterval(timer);
  }, [visible]);

  const archetype = useMemo(() => resolveClassArchetype(characterClass), [characterClass]);
  const race = useMemo(() => resolveRaceTrait(raceSlug), [raceSlug]);
  const normalizedDraft = useMemo(() => normalizeTamagotchiAppearance(draft), [draft]);

  const palette = useMemo(
    () =>
      buildCharacterSpritePalette({
        characterName,
        imageUrl,
        characterClass,
        raceSlug,
        appearance: normalizedDraft ?? null,
      }),
    [characterName, imageUrl, characterClass, raceSlug, normalizedDraft]
  );

  const previewPose: SpritePose = useMemo(() => {
    if (poseMode === 'walk') return frame % 2 === 0 ? 'walk_a' : 'walk_b';
    if (poseMode === 'happy') return 'happy';
    if (poseMode === 'rest') return 'rest';
    return frame % 2 === 0 ? 'idle_a' : 'idle_b';
  }, [poseMode, frame]);

  const hasChanges = !areAppearancesEqual(currentAppearance, normalizedDraft);
  const isAlreadyDefault = !normalizedDraft;

  const updateField = <K extends keyof TamagotchiAppearance>(
    key: K,
    value: TamagotchiAppearance[K] | 'auto'
  ) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (!value || value === 'auto') {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (saving) return;
    if (!hasChanges) {
      onRequestClose();
      return;
    }
    const res = await onSave(normalizedDraft ?? null);
    if (res.applied) {
      onRequestClose();
    }
  };

  const headerTitle =
    activeTab === 'face' || activeTab === 'hair'
      ? 'SPECCHIO DELLA LOCANDA'
      : 'BAULE DELL’AVVENTURIERO';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              <Text style={styles.headerSub} numberOfLines={1}>
                {characterName} · Aspetto cosmetico 48×48 (nessun effetto sulla scheda D&D)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onRequestClose}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Chiudi personalizzazione"
            >
              <X size={18} color={colors.parchmentLight} />
            </TouchableOpacity>
          </View>

          {/* Live 48x48 Hero Preview Stage */}
          <View style={styles.previewStage}>
            <View style={styles.spriteBox}>
              <RetroTamagotchiSprite
                palette={palette}
                archetype={archetype}
                race={race}
                pose={previewPose}
                facing={facing}
                size={126}
                appearance={normalizedDraft ?? null}
                frame={frame}
              />
              <View style={styles.previewShadow} />
            </View>

            <View style={styles.previewControls}>
              <Text style={styles.previewHintLabel}>PROVA ANIMAZIONE</Text>
              <View style={styles.poseGrid}>
                {POSE_MODES.map((p) => {
                  const active = poseMode === p.key;
                  return (
                    <TouchableOpacity
                      key={p.key}
                      style={[styles.poseBtn, active && styles.poseBtnActive]}
                      onPress={() => setPoseMode(p.key)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Posa ${p.label}`}
                    >
                      <Text style={[styles.poseBtnText, active && styles.poseBtnTextActive]}>
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.flipBtn}
                onPress={() => setFacing((f) => (f === 'right' ? 'left' : 'right'))}
                accessibilityRole="button"
                accessibilityLabel="Specchia direzione personaggio"
              >
                <ArrowLeftRight size={13} color={colors.brassLight} />
                <Text style={styles.flipBtnText}>
                  Direzione: {facing === 'right' ? 'Destra' : 'Sinistra'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Tabs */}
          <View style={styles.tabRow}>
            {TABS.map((t) => {
              const active = activeTab === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tabPill, active && styles.tabPillActive]}
                  onPress={() => setActiveTab(t.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.tabPillText, active && styles.tabPillTextActive]} numberOfLines={1}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Options Scroll */}
          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'face' && (
              <>
                <OptionGroup
                  title="CARNAGIONE / SQUAME"
                  options={SKIN_SWATCH_OPTIONS}
                  selectedId={draft.skinSwatch ?? 'auto'}
                  onSelect={(id) => updateField('skinSwatch', id)}
                />
                <OptionGroup
                  title="COLORE OCCHI"
                  options={EYE_SWATCH_OPTIONS}
                  selectedId={draft.eyeSwatch ?? 'auto'}
                  onSelect={(id) => updateField('eyeSwatch', id)}
                />
                <OptionGroup
                  title="BARBA & TRATTI DEL VISO"
                  options={FACIAL_FEATURE_OPTIONS}
                  selectedId={draft.facialFeature ?? 'auto'}
                  onSelect={(id) => updateField('facialFeature', id)}
                />
              </>
            )}

            {activeTab === 'hair' && (
              <>
                <OptionGroup
                  title="ACCONCIATURA"
                  options={HAIR_STYLE_OPTIONS}
                  selectedId={draft.hairStyle ?? 'auto'}
                  onSelect={(id) => updateField('hairStyle', id)}
                />
                <OptionGroup
                  title="COLORE CAPELLI & BARBA"
                  options={HAIR_SWATCH_OPTIONS}
                  selectedId={draft.hairSwatch ?? 'auto'}
                  onSelect={(id) => updateField('hairSwatch', id)}
                />
              </>
            )}

            {activeTab === 'outfit' && (
              <>
                <OptionGroup
                  title="COLORE VESTITI / ARMATURA"
                  options={OUTFIT_SWATCH_OPTIONS}
                  selectedId={draft.outfitSwatch ?? 'auto'}
                  onSelect={(id) => updateField('outfitSwatch', id)}
                />
                <OptionGroup
                  title="COLORE MANTELLO & FINITURE"
                  options={ACCENT_SWATCH_OPTIONS}
                  selectedId={draft.accentSwatch ?? 'auto'}
                  onSelect={(id) => updateField('accentSwatch', id)}
                />
                <OptionGroup
                  title="COPRICAPO / ELMO"
                  options={HEADGEAR_OPTIONS}
                  selectedId={draft.headgear ?? 'auto'}
                  onSelect={(id) => updateField('headgear', id)}
                />
                <OptionGroup
                  title="MANTELLO / SCIARPA"
                  options={CAPE_STYLE_OPTIONS}
                  selectedId={draft.capeStyle ?? 'auto'}
                  onSelect={(id) => updateField('capeStyle', id)}
                />
              </>
            )}

            {activeTab === 'weapons' && (
              <>
                <OptionGroup
                  title="ARMA / STRUMENTO (MANO DESTRA)"
                  options={MAIN_HAND_OPTIONS}
                  selectedId={draft.mainHand ?? 'auto'}
                  onSelect={(id) => updateField('mainHand', id)}
                />
                <OptionGroup
                  title="SCUDO / OGGETTO (MANO SINISTRA)"
                  options={OFF_HAND_OPTIONS}
                  selectedId={draft.offHand ?? 'auto'}
                  onSelect={(id) => updateField('offHand', id)}
                />
              </>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.resetBtn, (isAlreadyDefault || saving) && styles.btnDisabled]}
              onPress={() => setDraft({})}
              disabled={isAlreadyDefault || saving}
              accessibilityRole="button"
              accessibilityLabel="Ripristina aspetto predefinito di classe e razza"
            >
              <RotateCcw size={15} color={colors.parchmentLight} />
              <Text style={styles.resetBtnText}>Predefinito</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={() => {
                void handleConfirm();
              }}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Applica e salva personalizzazione"
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.void} />
              ) : (
                <>
                  <Sparkles size={15} color={colors.void} />
                  <Text style={styles.saveBtnText}>
                    {hasChanges ? 'Indossa Aspetto' : 'Chiudi'}
                  </Text>
                </>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#17120E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1.5,
    borderColor: colors.brassDark,
    maxHeight: '90%',
    paddingTop: 14,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  headerSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewStage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#120E0B',
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.24)',
  },
  spriteBox: {
    width: 134,
    height: 134,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B140F',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.18)',
  },
  previewShadow: {
    width: 54,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    marginTop: -6,
  },
  previewControls: {
    flex: 1,
    gap: 8,
  },
  previewHintLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.6,
  },
  poseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  poseBtn: {
    width: '47%',
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  poseBtnActive: {
    backgroundColor: 'rgba(197, 155, 39, 0.22)',
    borderColor: colors.brassLight,
  },
  poseBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  poseBtnTextActive: {
    color: colors.brassLight,
    fontWeight: '800',
  },
  flipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.28)',
    paddingHorizontal: 8,
  },
  flipBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  tabPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 9,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabPillActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  tabPillTextActive: {
    color: colors.void,
    fontWeight: '900',
  },
  optionsScroll: {
    maxHeight: 270,
  },
  optionsContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 14,
  },
  groupBlock: {
    gap: 7,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.24)',
  },
  optionChipActive: {
    backgroundColor: 'rgba(197, 155, 39, 0.22)',
    borderColor: colors.brassLight,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  optionChipTextActive: {
    color: colors.brassLight,
    fontWeight: '900',
  },
  swatchCircleWrap: {
    width: 16,
    height: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCircle: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  swatchSecondaryDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#120E0B',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 155, 39, 0.18)',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: 11,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: colors.brassBase,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.void,
  },
  btnDisabled: {
    opacity: 0.48,
  },
});
