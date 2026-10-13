import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import {
  Dices,
  X,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Skull,
  History,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { DieType, RollMode, DiceRollResult } from '../../types';

interface DiceRollerModalProps {
  visible: boolean;
  onClose: () => void;
  initialDie?: DieType;
  initialModifier?: number;
  initialLabel?: string;
  initialMode?: RollMode;
}

const DIE_MAX_MAP: Record<DieType, number> = {
  d20: 20,
  d12: 12,
  d10: 10,
  d8: 8,
  d6: 6,
  d4: 4,
  d2: 2,
};

const AVAILABLE_DICE: Array<{ type: DieType; label: string; icon: string }> = [
  { type: 'd20', label: 'd20', icon: '⬡' },
  { type: 'd12', label: 'd12', icon: '⬢' },
  { type: 'd10', label: 'd10', icon: '◆' },
  { type: 'd8', label: 'd8', icon: '◈' },
  { type: 'd6', label: 'd6', icon: '⚅' },
  { type: 'd4', label: 'd4', icon: '▲' },
  { type: 'd2', label: 'Moneta', icon: '🪙' },
];

export const DiceRollerModal: React.FC<DiceRollerModalProps> = ({
  visible,
  onClose,
  initialDie = 'd20',
  initialModifier = 0,
  initialLabel,
  initialMode = 'normal',
}) => {
  const [selectedDie, setSelectedDie] = useState<DieType>(initialDie);
  const [mode, setMode] = useState<RollMode>(initialMode);
  const [modifier, setModifier] = useState<number>(initialModifier);
  const [label, setLabel] = useState<string | undefined>(initialLabel);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [currentResult, setCurrentResult] = useState<DiceRollResult | null>(null);
  const [rollHistory, setRollHistory] = useState<DiceRollResult[]>([]);
  const [displayNumber, setDisplayNumber] = useState<number>(20);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Sync state when opened with new initial props
  useEffect(() => {
    if (visible) {
      setSelectedDie(initialDie);
      setModifier(initialModifier);
      setLabel(initialLabel);
      setMode(initialMode);
    }
  }, [visible, initialDie, initialModifier, initialLabel, initialMode]);

  // Roll execution
  const executeRoll = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);

    // Start wobble & bounce animation
    scaleAnim.setValue(1);
    rotateAnim.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.25,
          duration: 180,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 110,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const max = DIE_MAX_MAP[selectedDie];

    // Rapid shuffle numbers effect
    let count = 0;
    const interval = setInterval(() => {
      const tempRand = Math.floor(Math.random() * max) + 1;
      setDisplayNumber(tempRand);
      count++;
      if (count > 7) {
        clearInterval(interval);

        // Final roll generation
        const r1 = Math.floor(Math.random() * max) + 1;
        const r2 = Math.floor(Math.random() * max) + 1;

        let selectedRoll = r1;
        const rolls = [r1];

        if (mode === 'advantage') {
          rolls.push(r2);
          selectedRoll = Math.max(r1, r2);
        } else if (mode === 'disadvantage') {
          rolls.push(r2);
          selectedRoll = Math.min(r1, r2);
        }

        const isNat20 = selectedDie === 'd20' && selectedRoll === 20;
        const isNat1 = selectedDie === 'd20' && selectedRoll === 1;
        const total = selectedRoll + modifier;

        const now = new Date();
        const timestamp = now.toTimeString().split(' ')[0] ?? 'adesso';

        const result: DiceRollResult = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          die: selectedDie,
          mode,
          modifier,
          rolls,
          selectedRoll,
          total,
          isNat20,
          isNat1,
          label,
          timestamp,
        };

        setDisplayNumber(selectedRoll);
        setCurrentResult(result);
        setRollHistory((prev) => [result, ...prev.slice(0, 4)]);
        setIsRolling(false);
      }
    }, 45);
  }, [isRolling, selectedDie, mode, modifier, label, scaleAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-14deg', '0deg', '14deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e: any) => e?.stopPropagation?.()}>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Dices size={20} color={colors.brassLight} />
                  <Text style={styles.headerTitle}>
                    {label ? label : 'LANCIA I DADI DELLA TAVERNA'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={18} color={colors.parchmentMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Dice Picker Row */}
                <Text style={styles.subSectionTitle}>SELEZIONA DADO</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dicePickerRow}
                >
                  {AVAILABLE_DICE.map((item) => {
                    const isSelected = selectedDie === item.type;
                    return (
                      <TouchableOpacity
                        key={item.type}
                        style={[
                          styles.dieChip,
                          isSelected && styles.dieChipSelected,
                        ]}
                        onPress={() => {
                          setSelectedDie(item.type);
                          setCurrentResult(null);
                        }}
                      >
                        <Text
                          style={[
                            styles.dieChipIcon,
                            isSelected && styles.dieChipIconSelected,
                          ]}
                        >
                          {item.icon}
                        </Text>
                        <Text
                          style={[
                            styles.dieChipLabel,
                            isSelected && styles.dieChipLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Roll Mode (Normal, Advantage, Disadvantage) */}
                <Text style={styles.subSectionTitle}>MODALITÀ DI TIRO</Text>
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[
                      styles.modeBtn,
                      mode === 'normal' && styles.modeBtnActive,
                    ]}
                    onPress={() => setMode('normal')}
                  >
                    <Text
                      style={[
                        styles.modeBtnText,
                        mode === 'normal' && styles.modeBtnTextActive,
                      ]}
                    >
                      Normale
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeBtn,
                      mode === 'advantage' && styles.modeBtnActiveAdv,
                    ]}
                    onPress={() => setMode('advantage')}
                  >
                    <TrendingUp
                      size={14}
                      color={
                        mode === 'advantage' ? colors.void : colors.emerald
                      }
                    />
                    <Text
                      style={[
                        styles.modeBtnText,
                        mode === 'advantage' && styles.modeBtnTextActiveAdv,
                      ]}
                    >
                      Vantaggio
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.modeBtn,
                      mode === 'disadvantage' && styles.modeBtnActiveDis,
                    ]}
                    onPress={() => setMode('disadvantage')}
                  >
                    <TrendingDown
                      size={14}
                      color={
                        mode === 'disadvantage' ? colors.void : colors.crimsonLight
                      }
                    />
                    <Text
                      style={[
                        styles.modeBtnText,
                        mode === 'disadvantage' && styles.modeBtnTextActiveDis,
                      ]}
                    >
                      Svantaggio
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Modifier Selector */}
                <View style={styles.modifierSection}>
                  <Text style={styles.subSectionTitle}>MODIFICATORE (+/-)</Text>
                  <View style={styles.modifierControlRow}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setModifier((m) => m - 5)}
                    >
                      <Text style={styles.stepBtnText}>-5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setModifier((m) => m - 1)}
                    >
                      <Minus size={16} color={colors.parchmentLight} />
                    </TouchableOpacity>

                    <View style={styles.modifierDisplayBox}>
                      <Text style={styles.modifierDisplayText}>
                        {modifier >= 0 ? `+${modifier}` : `${modifier}`}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setModifier((m) => m + 1)}
                    >
                      <Plus size={16} color={colors.parchmentLight} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => setModifier((m) => m + 5)}
                    >
                      <Text style={styles.stepBtnText}>+5</Text>
                    </TouchableOpacity>

                    {modifier !== 0 && (
                      <TouchableOpacity
                        style={styles.resetModBtn}
                        onPress={() => setModifier(0)}
                      >
                        <RotateCcw size={14} color={colors.parchmentMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Big Result / Animation Zone */}
                <View style={styles.rollStageCard}>
                  <Animated.View
                    style={[
                      styles.dieAnimatedCrest,
                      {
                        transform: [{ scale: scaleAnim }, { rotate: spin }],
                      },
                    ]}
                  >
                    <Text style={styles.dieNumberText}>
                      {selectedDie === 'd2'
                        ? displayNumber === 2
                          ? '🪙 TESTA'
                          : '🪙 CROCE'
                        : displayNumber}
                    </Text>
                    <Text style={styles.dieBadgeTag}>{selectedDie.toUpperCase()}</Text>
                  </Animated.View>

                  {/* Natural 20 or Natural 1 Banner */}
                  {currentResult?.isNat20 && (
                    <View style={styles.criticalSuccessBadge}>
                      <Sparkles size={16} color={colors.void} />
                      <Text style={styles.criticalSuccessText}>
                        NAT 20 • COLPO CRITICO!
                      </Text>
                    </View>
                  )}

                  {currentResult?.isNat1 && (
                    <View style={styles.criticalFailureBadge}>
                      <Skull size={16} color={colors.parchmentLight} />
                      <Text style={styles.criticalFailureText}>
                        NAT 1 • FALLIMENTO CRITICO!
                      </Text>
                    </View>
                  )}

                  {/* Breakdown details */}
                  {currentResult && !isRolling && (
                    <View style={styles.resultDetailsBox}>
                      <Text style={styles.resultTotalLabel}>TOTALE FINALE</Text>
                      <Text style={styles.resultTotalValue}>
                        {currentResult.total}
                      </Text>

                      <Text style={styles.resultFormulaText}>
                        {currentResult.mode === 'advantage' &&
                          `Vantaggio [${currentResult.rolls.join(', ')}] ➔ ${currentResult.selectedRoll}`}
                        {currentResult.mode === 'disadvantage' &&
                          `Svantaggio [${currentResult.rolls.join(', ')}] ➔ ${currentResult.selectedRoll}`}
                        {currentResult.mode === 'normal' &&
                          `Dado [${currentResult.selectedRoll}]`}
                        {currentResult.modifier !== 0 &&
                          ` ${currentResult.modifier >= 0 ? '+' : '-'} ${Math.abs(currentResult.modifier)} = ${currentResult.total}`}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Roll Action Button */}
                <TouchableOpacity
                  style={[
                    styles.rollActionButton,
                    isRolling && styles.rollActionButtonDisabled,
                  ]}
                  onPress={executeRoll}
                  activeOpacity={0.85}
                  disabled={isRolling}
                >
                  <Dices size={20} color={colors.void} />
                  <Text style={styles.rollActionButtonText}>
                    {isRolling ? 'IL DADO STA ROTOLANDO...' : 'LANCIA IL DADO'}
                  </Text>
                </TouchableOpacity>

                {/* Roll History (last 5 rolls) */}
                {rollHistory.length > 0 && (
                  <View style={styles.historyContainer}>
                    <View style={styles.historyHeader}>
                      <History size={14} color={colors.brassBase} />
                      <Text style={styles.historyTitle}>
                        ULTIMI {rollHistory.length} TIRI
                      </Text>
                    </View>

                    {rollHistory.map((item) => (
                      <View key={item.id} style={styles.historyRow}>
                        <View style={styles.historyLeft}>
                          <Text style={styles.historyDieBadge}>
                            {item.die.toUpperCase()}
                          </Text>
                          <Text style={styles.historyTime}>{item.timestamp}</Text>
                          {item.label && (
                            <Text style={styles.historyLabel} numberOfLines={1}>
                              {item.label}
                            </Text>
                          )}
                        </View>
                        <View style={styles.historyRight}>
                          {item.isNat20 && (
                            <Text style={styles.historyCritText}>NAT 20</Text>
                          )}
                          {item.isNat1 && (
                            <Text style={styles.historyFumbleText}>NAT 1</Text>
                          )}
                          <Text style={styles.historyFormula}>
                            [{item.rolls.join('/')}]
                            {item.modifier !== 0
                              ? ` ${item.modifier >= 0 ? '+' : ''}${item.modifier}`
                              : ''}
                          </Text>
                          <Text style={styles.historyTotal}>{item.total}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 13, 16, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.stone,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    maxHeight: 560,
  },
  scrollContent: {
    padding: 16,
  },
  subSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  dicePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dieChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  dieChipSelected: {
    backgroundColor: colors.brassDark,
    borderColor: colors.brassLight,
  },
  dieChipIcon: {
    fontSize: 14,
    color: colors.parchmentMuted,
  },
  dieChipIconSelected: {
    color: colors.brassLight,
  },
  dieChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  dieChipLabelSelected: {
    color: colors.parchmentLight,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  modeBtnActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  modeBtnActiveAdv: {
    backgroundColor: colors.emerald,
    borderColor: colors.parchmentLight,
  },
  modeBtnActiveDis: {
    backgroundColor: colors.crimson,
    borderColor: colors.crimsonLight,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  modeBtnTextActive: {
    color: colors.void,
  },
  modeBtnTextActiveAdv: {
    color: colors.void,
  },
  modeBtnTextActiveDis: {
    color: colors.parchmentLight,
  },
  modifierSection: {
    marginBottom: 16,
  },
  modifierControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  modifierDisplayBox: {
    flex: 1,
    height: 36,
    backgroundColor: colors.stone,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modifierDisplayText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brassLight,
  },
  resetModBtn: {
    padding: 8,
  },
  rollStageCard: {
    backgroundColor: colors.stone,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  dieAnimatedCrest: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.stoneSurface,
    borderWidth: 2,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: colors.brassBase,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  dieNumberText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.brassLight,
    letterSpacing: 0.5,
  },
  dieBadgeTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.parchmentMuted,
    marginTop: -2,
  },
  criticalSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  criticalSuccessText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.void,
    letterSpacing: 0.8,
  },
  criticalFailureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.crimson,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  criticalFailureText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.parchmentLight,
    letterSpacing: 0.8,
  },
  resultDetailsBox: {
    alignItems: 'center',
    marginTop: 4,
  },
  resultTotalLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentMuted,
    letterSpacing: 1,
  },
  resultTotalValue: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.parchmentLight,
    marginVertical: 2,
  },
  resultFormulaText: {
    fontSize: 11,
    color: colors.brassLight,
    fontWeight: '600',
  },
  rollActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.brassBase,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.brassLight,
  },
  rollActionButtonDisabled: {
    opacity: 0.6,
  },
  rollActionButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.void,
    letterSpacing: 0.8,
  },
  historyContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stoneBorder,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  historyDieBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassLight,
    backgroundColor: colors.stone,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyTime: {
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  historyLabel: {
    fontSize: 10,
    color: colors.parchmentLight,
    maxWidth: 100,
  },
  historyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyCritText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassLight,
  },
  historyFumbleText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  historyFormula: {
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  historyTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
    minWidth: 20,
    textAlign: 'right',
  },
});

export default DiceRollerModal;
