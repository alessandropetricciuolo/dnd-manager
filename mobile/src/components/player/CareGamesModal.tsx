import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Check,
  Clock,
  Flame,
  RefreshCw,
  RotateCcw,
  Shield,
  Sparkles,
  Utensils,
  Wind,
  X,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import {
  CAULDRON_SERVE_MAX,
  CAULDRON_SERVE_MIN,
  CARE_STAT_META,
  CareGameCompletionResult,
  CareGameStat,
  CauldronGameState,
  GEAR_ITEMS,
  HearthGameState,
  HygieneGameState,
  PANTRY_INGREDIENTS,
  cleanHygieneStain,
  createCauldronGame,
  createHearthGame,
  createHygieneGame,
  finishHygieneGame,
  getHearthRoundConfig,
  getHygieneProgress,
  getIngredientById,
  pickCauldronIngredient,
  recordHearthPuff,
  selectHygieneItem,
  serveCauldronMeal,
  startCauldronCooking,
} from '../../lib/care-mini-games';
import {
  CauldronScene,
  GearWorkbenchScene,
  HearthScene,
  IngredientIcon,
} from './CareGameArtwork';

export interface CareGamesModalProps {
  visible: boolean;
  stat: 'hunger' | 'energy' | 'hygiene';
  characterName: string;
  onRequestClose: () => void;
  onComplete: (excellent: boolean) => Promise<CareGameCompletionResult>;
}

type SaveStatus = 'idle' | 'pending' | 'done' | 'error';

const BLOW_TICK_MS = 32;
const BLOW_FILL_PER_SECOND = 0.72;

export const CareGamesModal: React.FC<CareGamesModalProps> = ({
  visible,
  stat,
  characterName,
  onRequestClose,
  onComplete,
}) => {
  const meta = CARE_STAT_META[stat];

  const mountedRef = useRef(true);
  const runIdRef = useRef(0);
  const completedRunIdRef = useRef<number | null>(null);
  const inFlightRunIdRef = useRef<number | null>(null);
  const blowIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blowLevelRef = useRef(0);

  const [reduceMotion, setReduceMotion] = useState(false);

  // Per-game states
  const [cauldron, setCauldron] = useState<CauldronGameState>(() =>
    createCauldronGame()
  );
  const [hearth, setHearth] = useState<HearthGameState>(() =>
    createHearthGame()
  );
  const [hygiene, setHygiene] = useState<HygieneGameState>(() =>
    createHygieneGame()
  );

  // Blowing gauge state for energy
  const [isBlowing, setIsBlowing] = useState(false);
  const [blowLevel, setBlowLevel] = useState(0);

  // Cauldron serve timing gauge state
  const [serveLevel, setServeLevel] = useState(0.5);
  const serveLevelRef = useRef(0.5);
  const serveDirRef = useRef(1);

  // Completion / reward persistence state
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveResult, setSaveResult] = useState<CareGameCompletionResult | null>(
    null
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastExcellent, setLastExcellent] = useState(false);

  const stopBlowInterval = useCallback(() => {
    if (blowIntervalRef.current !== null) {
      clearInterval(blowIntervalRef.current);
      blowIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mountedRef.current) setReduceMotion(enabled);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      (enabled) => {
        if (mountedRef.current) setReduceMotion(enabled);
      }
    );

    return () => {
      mountedRef.current = false;
      stopBlowInterval();
      sub?.remove?.();
    };
  }, [stopBlowInterval]);

  const resetGame = useCallback(() => {
    stopBlowInterval();
    runIdRef.current += 1;
    completedRunIdRef.current = null;
    inFlightRunIdRef.current = null;
    blowLevelRef.current = 0;

    setIsBlowing(false);
    setBlowLevel(0);
    setSaveStatus('idle');
    setSaveResult(null);
    setSaveError(null);
    setLastExcellent(false);

    setCauldron(createCauldronGame());
    setHearth(createHearthGame());
    setHygiene(createHygieneGame());
  }, [stopBlowInterval]);

  useEffect(() => {
    if (visible) {
      resetGame();
    } else {
      stopBlowInterval();
      setIsBlowing(false);
    }
  }, [visible, stat, resetGame, stopBlowInterval]);

  const submitCompletion = useCallback(
    async (excellent: boolean, runId: number) => {
      if (runIdRef.current !== runId || inFlightRunIdRef.current === runId) return;
      inFlightRunIdRef.current = runId;
      setSaveStatus('pending');
      setSaveError(null);
      setLastExcellent(excellent);

      try {
        const result = await onComplete(excellent);
        if (!mountedRef.current || runIdRef.current !== runId) return;
        if (!result.applied && !result.queued && result.before === undefined && result.after === undefined) {
          setSaveError(result.message || 'Impossibile registrare il risultato. Riprova.');
          setSaveStatus('error');
          return;
        }
        setSaveResult(result);
        setSaveStatus('done');
      } catch (err) {
        if (!mountedRef.current || runIdRef.current !== runId) return;
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Impossibile registrare il risultato. Riprova.';
        setSaveError(message);
        setSaveStatus('error');
      } finally {
        if (inFlightRunIdRef.current === runId) inFlightRunIdRef.current = null;
      }
    },
    [onComplete]
  );

  const triggerCompletionOnce = useCallback(
    (excellent: boolean) => {
      const currentRunId = runIdRef.current;
      if (completedRunIdRef.current === currentRunId) {
        return;
      }
      completedRunIdRef.current = currentRunId;
      void submitCompletion(excellent, currentRunId);
    },
    [submitCompletion]
  );

  // ============================================================================
  // Handlers: Cauldron (hunger)
  // ============================================================================

  // Auto-hide cauldron recipe after 2.5s memorization window
  useEffect(() => {
    if (!visible || stat !== 'hunger' || cauldron.phase !== 'memorizing') {
      return;
    }
    const id = setTimeout(() => {
      setCauldron((prev) => startCauldronCooking(prev));
    }, 2500);
    return () => clearTimeout(id);
  }, [visible, stat, cauldron.phase]);

  // Oscillate serve timing gauge when cauldron is ready_to_serve
  useEffect(() => {
    if (!visible || stat !== 'hunger' || cauldron.phase !== 'ready_to_serve') {
      return;
    }
    serveLevelRef.current = 0.15;
    serveDirRef.current = 1;
    setServeLevel(0.15);
    const step = reduceMotion ? 0.025 : 0.036;
    const id = setInterval(() => {
      let next = serveLevelRef.current + step * serveDirRef.current;
      if (next >= 1) {
        next = 1;
        serveDirRef.current = -1;
      } else if (next <= 0) {
        next = 0;
        serveDirRef.current = 1;
      }
      serveLevelRef.current = next;
      setServeLevel(next);
    }, 32);
    return () => clearInterval(id);
  }, [visible, stat, cauldron.phase, reduceMotion]);

  const handleStartCookingNow = useCallback(() => {
    setCauldron((prev) => startCauldronCooking(prev));
  }, []);

  const handlePickIngredient = useCallback(
    (ingredientId: (typeof PANTRY_INGREDIENTS)[number]['id']) => {
      setCauldron((prev) => pickCauldronIngredient(prev, ingredientId));
    },
    []
  );

  const handleServeMeal = useCallback(() => {
    setCauldron((prev) => serveCauldronMeal(prev, serveLevelRef.current));
  }, []);

  // ============================================================================
  // Handlers: Hearth (energy)
  // ============================================================================

  const hearthRoundConfig = useMemo(
    () => getHearthRoundConfig(hearth.round),
    [hearth.round]
  );

  const finishPuff = useCallback(
    (level: number) => {
      stopBlowInterval();
      setIsBlowing(false);
      blowLevelRef.current = 0;
      setBlowLevel(0);

      setHearth((prev) => recordHearthPuff(prev, level));
    },
    [stopBlowInterval]
  );

  const startBlowing = useCallback(() => {
    if (hearth.phase !== 'ready' || blowIntervalRef.current !== null) {
      return;
    }

    blowLevelRef.current = 0;
    setBlowLevel(0);
    setIsBlowing(true);

    const cfg = getHearthRoundConfig(hearth.round);
    const step = (cfg.fillPerSecond * BLOW_TICK_MS) / 1000;
    const speedFactor = reduceMotion ? 0.8 : 1;

    blowIntervalRef.current = setInterval(() => {
      const nextLevel = Math.min(1, blowLevelRef.current + step * speedFactor);
      blowLevelRef.current = nextLevel;
      setBlowLevel(nextLevel);

      if (nextLevel >= 1) {
        finishPuff(1);
      }
    }, BLOW_TICK_MS);
  }, [hearth.phase, hearth.round, reduceMotion, finishPuff]);

  const stopBlowing = useCallback(() => {
    if (blowIntervalRef.current === null) {
      return;
    }
    finishPuff(blowLevelRef.current);
  }, [finishPuff]);

  // ============================================================================
  // Handlers: Hygiene (hygiene)
  // ============================================================================

  const hygieneProgress = useMemo(() => getHygieneProgress(hygiene), [hygiene]);

  const handleCleanStain = useCallback((stainId: string) => {
    setHygiene((prev) => cleanHygieneStain(prev, stainId));
  }, []);

  const handleFinishHygiene = useCallback(() => {
    setHygiene(finishHygieneGame);
  }, []);

  // ============================================================================
  // Derived completion state
  // ============================================================================

  const isCompleted =
    (stat === 'hunger' && cauldron.phase === 'completed') ||
    (stat === 'energy' && hearth.phase === 'completed') ||
    (stat === 'hygiene' && hygiene.phase === 'completed');

  const isExcellent =
    (stat === 'hunger' && cauldron.excellent) ||
    (stat === 'energy' && hearth.excellent) ||
    (stat === 'hygiene' && hygiene.excellent);

  useEffect(() => {
    if (visible && isCompleted) triggerCompletionOnce(isExcellent);
  }, [visible, isCompleted, isExcellent, triggerCompletionOnce]);

  const headerIcon =
    stat === 'hunger' ? (
      <Utensils size={16} color={meta.accentColor} />
    ) : stat === 'energy' ? (
      <Flame size={16} color={meta.accentColor} />
    ) : (
      <Shield size={16} color={meta.accentColor} />
    );

  const renderOutcomeCard = () => {
    if (!isCompleted) return null;

    const hasBarNumbers =
      typeof saveResult?.before === 'number' &&
      typeof saveResult?.after === 'number';
    const delta = hasBarNumbers
      ? (saveResult!.after as number) - (saveResult!.before as number)
      : 0;
    const isCooldownOrRefused =
      saveStatus === 'done' && saveResult && !saveResult.applied && !saveResult.queued;

    return (
      <View
        style={[
          styles.outcomeCard,
          isExcellent && styles.outcomeCardExcellent,
        ]}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.outcomeHeader}>
          <Sparkles
            size={15}
            color={isExcellent ? colors.brassLight : colors.emerald}
          />
          <Text style={styles.outcomeTitle}>
            {isExcellent ? 'Risultato Eccellente!' : 'Attività completata'}
          </Text>
        </View>

        {saveStatus === 'pending' && (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={colors.brassLight} />
            <Text style={styles.statusMutedText}>
              Registrazione {meta.statLabel.toLowerCase()} in corso...
            </Text>
          </View>
        )}

        {saveStatus === 'done' && saveResult && (
          <View style={styles.resultBody}>
            {hasBarNumbers && (
              <View style={styles.barComparisonBox}>
                <View style={styles.barLabelRow}>
                  <Text style={styles.barStatLabel}>{meta.statLabel}</Text>
                  <Text style={styles.barNumbers}>
                    {saveResult.before} → {saveResult.after}
                    {delta > 0 ? ` (+${delta})` : ''}
                  </Text>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFillBefore,
                      {
                        width: `${Math.min(100, Math.max(0, saveResult.before!))}%`,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.barFillAfter,
                      {
                        width: `${Math.min(100, Math.max(0, saveResult.after!))}%`,
                        backgroundColor: meta.accentColor,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            <View
              style={[
                styles.messageBanner,
                saveResult.queued && styles.messageBannerQueued,
                isCooldownOrRefused && styles.messageBannerCooldown,
              ]}
            >
              {isCooldownOrRefused && (
                <Clock size={14} color={colors.brassLight} />
              )}
              <Text style={styles.messageText}>
                {saveResult.message}
              </Text>
            </View>
          </View>
        )}

        {saveStatus === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{saveError}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                void submitCompletion(lastExcellent, runIdRef.current);
              }}
              accessibilityRole="button"
              accessibilityLabel="Riprova salvataggio risultato"
            >
              <RefreshCw size={13} color={colors.void} />
              <Text style={styles.retryBtnText}>Riprova salvataggio</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onRequestClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              {headerIcon}
              <Text style={styles.title}>{meta.gameTitle}</Text>
            </View>
            <TouchableOpacity
              onPress={onRequestClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Chiudi attività"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={colors.parchmentMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Short objective */}
            <Text style={styles.objectiveText}>{meta.shortObjective}</Text>

            {/* ================= HUNGER: LA PENTOLA DELLA TAVERNA ================= */}
            {stat === 'hunger' && (
              <View style={styles.gameSection}>
                <CauldronScene
                  addedCount={cauldron.added.length}
                  completed={cauldron.phase === 'completed'}
                  excellent={cauldron.excellent}
                  characterName={characterName}
                />

                {/* Ordered recipe strip */}
                <View style={styles.recipeBox}>
                  <View style={styles.sectionLabelRow}>
                    <Text style={styles.sectionLabel}>
                      RICETTA ({cauldron.added.length}/3)
                    </Text>
                    <Text style={styles.hintLabel}>
                      {cauldron.mistakes === 0
                        ? 'Nessun errore'
                        : `Errori: ${cauldron.mistakes}`}
                    </Text>
                  </View>
                  <View style={styles.recipeRow}>
                    {cauldron.recipe.map((id, idx) => {
                      const item = getIngredientById(id);
                      const done = idx < cauldron.added.length;
                      const revealed =
                        cauldron.phase === 'memorizing' ||
                        cauldron.phase === 'completed' ||
                        done;
                      const isCurrent =
                        cauldron.phase === 'cooking' &&
                        idx === cauldron.added.length;
                      return (
                        <View
                          key={`${id}-${idx}`}
                          style={[
                            styles.recipeSlot,
                            done && styles.recipeSlotDone,
                            isCurrent && styles.recipeSlotCurrent,
                          ]}
                        >
                          <Text style={styles.recipeOrderNum}>{idx + 1}</Text>
                          {revealed ? (
                            <>
                              <IngredientIcon id={id} size={22} />
                              <Text
                                style={[
                                  styles.recipeSlotName,
                                  done && styles.recipeSlotNameDone,
                                ]}
                                numberOfLines={1}
                              >
                                {item.shortLabel}
                              </Text>
                            </>
                          ) : (
                            <>
                              <Text style={styles.recipeHiddenMark}>?</Text>
                              <Text style={styles.recipeSlotName} numberOfLines={1}>
                                Segreto
                              </Text>
                            </>
                          )}
                          {done && <Check size={12} color={colors.emerald} />}
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Live feedback */}
                <View
                  style={[
                    styles.feedbackBox,
                    cauldron.lastFeedback.kind === 'wrong' &&
                      styles.feedbackBoxError,
                    cauldron.lastFeedback.kind === 'correct' &&
                      styles.feedbackBoxSuccess,
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  <Text style={styles.feedbackText}>
                    {cauldron.lastFeedback.message}
                  </Text>
                </View>

                {cauldron.phase === 'memorizing' && (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={handleStartCookingNow}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Ho memorizzato la ricetta, inizia subito"
                  >
                    <Text style={styles.primaryBtnText}>Ho memorizzato — Inizia</Text>
                  </TouchableOpacity>
                )}

                {/* Pantry grid */}
                {cauldron.phase === 'cooking' && (
                  <View style={styles.pantryGrid}>
                    {PANTRY_INGREDIENTS.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.pantryBtn}
                        onPress={() => handlePickIngredient(item.id)}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel={`Aggiungi ${item.name}`}
                      >
                        <IngredientIcon id={item.id} size={26} />
                        <Text style={styles.pantryBtnLabel} numberOfLines={1}>
                          {item.shortLabel}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {cauldron.phase === 'ready_to_serve' && (
                  <View style={styles.gaugeWrapper}>
                    <View style={styles.gaugeTrack}>
                      <View
                        style={[
                          styles.gaugeIdealZone,
                          {
                            left: `${CAULDRON_SERVE_MIN * 100}%`,
                            width: `${(CAULDRON_SERVE_MAX - CAULDRON_SERVE_MIN) * 100}%`,
                            backgroundColor: 'rgba(16, 185, 129, 0.25)',
                            borderColor: 'rgba(16, 185, 129, 0.6)',
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.gaugeFill,
                          {
                            width: `${Math.round(serveLevel * 100)}%`,
                            backgroundColor:
                              serveLevel >= CAULDRON_SERVE_MIN &&
                              serveLevel <= CAULDRON_SERVE_MAX
                                ? colors.emerald
                                : colors.brassBase,
                          },
                        ]}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.primaryBtn}
                      onPress={handleServeMeal}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Servi il pasto al punto giusto"
                    >
                      <Utensils size={15} color={colors.void} />
                      <Text style={styles.primaryBtnText}>Servi al punto giusto!</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ================= ENERGY: IL FUOCO DELLA BRANDA ================= */}
            {stat === 'energy' && (
              <View style={styles.gameSection}>
                <HearthScene
                  fireLevel={hearth.fireLevel}
                  isBlowing={isBlowing}
                  completed={hearth.phase === 'completed'}
                  excellent={hearth.excellent}
                  characterName={characterName}
                />

                {/* Round dots */}
                <View style={styles.puffProgressRow}>
                  <Text style={styles.sectionLabel}>
                    SOFFIATE ({hearth.puffs.length}/{hearth.maxRounds})
                  </Text>
                  <View style={styles.puffDots}>
                    {[0, 1, 2].map((idx) => {
                      const rec = hearth.puffs[idx];
                      return (
                        <View
                          key={idx}
                          style={[
                            styles.puffDot,
                            rec?.outcome === 'ideal' && styles.puffDotIdeal,
                            rec &&
                              rec.outcome !== 'ideal' &&
                              styles.puffDotMiss,
                          ]}
                        >
                          <Text style={styles.puffDotText}>
                            {rec
                              ? rec.outcome === 'ideal'
                                ? '✓'
                                : '•'
                              : idx + 1}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Gauge bar with ideal zone */}
                {hearth.phase === 'ready' && (
                  <View style={styles.gaugeWrapper}>
                    <View style={styles.gaugeTrack}>
                      <View
                        style={[
                          styles.gaugeIdealZone,
                          {
                            left: `${hearthRoundConfig.min * 100}%`,
                            width: `${(hearthRoundConfig.max - hearthRoundConfig.min) * 100}%`,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.gaugeFill,
                          {
                            width: `${Math.round(blowLevel * 100)}%`,
                            backgroundColor:
                              blowLevel >= hearthRoundConfig.min &&
                              blowLevel <= hearthRoundConfig.max
                                ? colors.emerald
                                : blowLevel > hearthRoundConfig.max
                                ? colors.crimsonLight
                                : colors.brassBase,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.gaugeLegendRow}>
                      <Text style={styles.gaugeLegendText}>Debole</Text>
                      <Text style={styles.gaugeLegendIdeal}>Fascia ideale</Text>
                      <Text style={styles.gaugeLegendText}>Forte</Text>
                    </View>
                  </View>
                )}

                {/* Feedback */}
                <View
                  style={[
                    styles.feedbackBox,
                    hearth.lastOutcome === 'ideal' && styles.feedbackBoxSuccess,
                    hearth.lastOutcome &&
                      hearth.lastOutcome !== 'ideal' &&
                      styles.feedbackBoxError,
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  <Text style={styles.feedbackText}>{hearth.lastMessage}</Text>
                </View>

                {/* Hold-to-blow + accessible tap toggle */}
                {hearth.phase === 'ready' && (
                  <View style={styles.hearthControls}>
                    <Pressable
                      onPressIn={startBlowing}
                      onPressOut={stopBlowing}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        (pressed || isBlowing) && styles.primaryBtnActive,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Tieni premuto per soffiare sulle braci e rilascia nella fascia ideale"
                    >
                      <Wind size={16} color={colors.void} />
                      <Text style={styles.primaryBtnText}>
                        {isBlowing
                          ? 'Rilascia ora!'
                          : 'Tieni premuto per soffiare'}
                      </Text>
                    </Pressable>

                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={isBlowing ? stopBlowing : startBlowing}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isBlowing
                          ? 'Ferma il soffio adesso'
                          : 'Avvia soffio con un tocco'
                      }
                    >
                      <Text style={styles.secondaryBtnText}>
                        {isBlowing
                          ? 'Ferma soffio (tocco)'
                          : 'Oppure tocca: Avvia / Ferma'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* ================= HYGIENE: ARMATURA DA RIPULIRE ================= */}
            {stat === 'hygiene' && (
              <View style={styles.gameSection}>
                {/* Gear tabs */}
                <View style={styles.gearTabsRow}>
                  {hygieneProgress.byItem.map((entry) => {
                    const active = hygiene.activeItem === entry.itemId;
                    return (
                      <TouchableOpacity
                        key={entry.itemId}
                        style={[
                          styles.gearTab,
                          active && styles.gearTabActive,
                          entry.isComplete && styles.gearTabDone,
                        ]}
                        onPress={() =>
                          setHygiene((prev) =>
                            selectHygieneItem(prev, entry.itemId)
                          )
                        }
                        disabled={hygiene.phase === 'completed'}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${entry.name}, ${entry.cleaned} su ${entry.total} macchie pulite`}
                      >
                        <Text
                          style={[
                            styles.gearTabLabel,
                            active && styles.gearTabLabelActive,
                          ]}
                        >
                          {entry.name}
                        </Text>
                        <Text style={styles.gearTabCount}>
                          {entry.cleaned}/{entry.total}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <GearWorkbenchScene
                  activeItem={hygiene.activeItem}
                  stains={hygiene.stains}
                  completed={hygiene.phase === 'completed'}
                  excellent={hygiene.excellent}
                  characterName={characterName}
                  onCleanStain={handleCleanStain}
                />

                {/* Feedback */}
                <View
                  style={[
                    styles.feedbackBox,
                    hygieneProgress.allClean && styles.feedbackBoxSuccess,
                  ]}
                  accessibilityLiveRegion="polite"
                >
                  <Text style={styles.feedbackText}>{hygiene.lastMessage}</Text>
                </View>

                {hygiene.phase === 'cleaning' && (
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      !hygieneProgress.canFinish && styles.btnDisabled,
                    ]}
                    onPress={handleFinishHygiene}
                    disabled={!hygieneProgress.canFinish}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={
                      hygieneProgress.canFinish
                        ? 'Finisci pulizia equipaggiamento'
                        : 'Pulisci almeno una macchia per ogni pezzo prima di finire'
                    }
                  >
                    <Check size={15} color={colors.void} />
                    <Text style={styles.primaryBtnText}>
                      {hygieneProgress.allClean
                        ? 'Finisci pulizia (Eccellente)'
                        : hygieneProgress.canFinish
                        ? `Finisci pulizia (${hygieneProgress.cleaned}/${hygieneProgress.total})`
                        : 'Pulisci almeno 1 macchia per pezzo'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Shared Outcome Card */}
            {renderOutcomeCard()}

            {/* Footer Controls */}
            {!isCompleted ? (
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={onRequestClose}
                accessibilityRole="button"
                accessibilityLabel="Torna in Taverna senza premio"
              >
                <Text style={styles.ghostBtnText}>
                  Torna in Taverna (uscita anticipata: nessun premio)
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.footerActionsRow}>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    styles.flexBtn,
                    saveStatus === 'pending' && styles.btnDisabled,
                  ]}
                  onPress={resetGame}
                  disabled={saveStatus === 'pending'}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Rigioca attività"
                >
                  <RotateCcw size={14} color={colors.void} />
                  <Text style={styles.primaryBtnText}>Rigioca</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryBtn, styles.flexBtn]}
                  onPress={onRequestClose}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Torna in Taverna"
                >
                  <Text style={styles.secondaryBtnText}>Torna in Taverna</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    padding: 14,
  },
  card: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 14,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200, 157, 73, 0.2)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.brassBase,
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    gap: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  objectiveText: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  gameSection: {
    gap: 10,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.6,
  },
  hintLabel: {
    fontSize: 11,
    color: colors.parchmentDim,
  },
  recipeBox: {
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 9,
  },
  recipeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  recipeSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: colors.stoneSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 6,
    paddingHorizontal: 5,
  },
  recipeSlotCurrent: {
    borderColor: colors.brassBase,
    backgroundColor: 'rgba(200, 157, 73, 0.12)',
  },
  recipeSlotDone: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  recipeOrderNum: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentDim,
  },
  recipeHiddenMark: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.brassLight,
  },
  recipeSlotName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
    flexShrink: 1,
  },
  recipeSlotNameDone: {
    color: colors.emerald,
  },
  pantryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pantryBtn: {
    width: '31%',
    minHeight: 56,
    backgroundColor: colors.stoneHighlight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorderLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  pantryBtnLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  feedbackBox: {
    backgroundColor: colors.stone,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  feedbackBoxSuccess: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  feedbackBoxError: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
    backgroundColor: 'rgba(148, 33, 33, 0.18)',
  },
  feedbackText: {
    fontSize: 12,
    color: colors.parchmentLight,
    textAlign: 'center',
    lineHeight: 17,
  },
  puffProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  puffDots: {
    flexDirection: 'row',
    gap: 6,
  },
  puffDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  puffDotIdeal: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: colors.emerald,
  },
  puffDotMiss: {
    backgroundColor: 'rgba(200, 157, 73, 0.16)',
    borderColor: colors.brassDark,
  },
  puffDotText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  gaugeWrapper: {
    gap: 5,
  },
  gaugeTrack: {
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorderLight,
    overflow: 'hidden',
    position: 'relative',
  },
  gaugeIdealZone: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(200, 157, 73, 0.3)',
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: colors.brassLight,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 10,
  },
  gaugeLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  gaugeLegendText: {
    fontSize: 10.5,
    color: colors.parchmentDim,
  },
  gaugeLegendIdeal: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.brassLight,
  },
  hearthControls: {
    gap: 8,
  },
  gearTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  gearTab: {
    flex: 1,
    minHeight: 44,
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  gearTabActive: {
    borderColor: colors.brassBase,
    backgroundColor: 'rgba(200, 157, 73, 0.14)',
  },
  gearTabDone: {
    borderColor: 'rgba(16, 185, 129, 0.55)',
  },
  gearTabLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  gearTabLabelActive: {
    color: colors.brassLight,
  },
  gearTabCount: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.parchmentDim,
  },
  outcomeCard: {
    backgroundColor: colors.stone,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorderLight,
    padding: 11,
    gap: 8,
  },
  outcomeCardExcellent: {
    borderColor: colors.brassBase,
    backgroundColor: 'rgba(200, 157, 73, 0.08)',
  },
  outcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  outcomeTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.brassLight,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusMutedText: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  resultBody: {
    gap: 8,
  },
  barComparisonBox: {
    gap: 5,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barStatLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  barNumbers: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.stoneHighlight,
    overflow: 'hidden',
    position: 'relative',
  },
  barFillBefore: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 242, 235, 0.25)',
  },
  barFillAfter: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 5,
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  messageBannerQueued: {
    backgroundColor: 'rgba(200, 157, 73, 0.14)',
  },
  messageBannerCooldown: {
    backgroundColor: 'rgba(84, 70, 60, 0.35)',
  },
  messageText: {
    fontSize: 12,
    color: colors.parchmentLight,
    textAlign: 'center',
    flexShrink: 1,
    lineHeight: 16,
  },
  errorBox: {
    gap: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: colors.crimsonLight,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  retryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.void,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.brassBase,
    borderRadius: 10,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primaryBtnActive: {
    backgroundColor: colors.brassLight,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.void,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.stoneHighlight,
    borderWidth: 1,
    borderColor: colors.stoneBorderLight,
    borderRadius: 10,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  ghostBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    paddingVertical: 6,
  },
  ghostBtnText: {
    fontSize: 11.5,
    color: colors.parchmentDim,
    textAlign: 'center',
  },
  footerActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flexBtn: {
    flex: 1,
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
