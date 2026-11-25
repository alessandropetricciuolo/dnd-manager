import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Dices, RefreshCw, RotateCcw, Trophy, X } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import {
  DieValue,
  LocandiereMatchState,
  TOTAL_TURNS,
  bankCurrentTurn,
  canBankCurrentTurn,
  createLocandiereMatch,
  rollCurrentTurn,
  shouldInnkeeperRollAgain,
} from '../../lib/locandiere-dice';
import {
  BrassDieTrophy,
  InnkeeperMood,
  InnkeeperSprite,
  PippedDieFace,
} from './InnkeeperSprite';

export interface LocandiereCompletionResult {
  applied: boolean;
  message: string;
  before?: number;
  after?: number;
  queued?: boolean;
  trophyUnlocked?: boolean;
}

export interface LocandiereMatchSummary {
  outcome: 'player_win' | 'innkeeper_win' | 'draw';
  applied: boolean;
  trophyUnlocked: boolean;
  queued?: boolean;
  before?: number;
  after?: number;
  message?: string;
}

interface LocandiereDiceModalProps {
  visible: boolean;
  characterName: string;
  hasTrophy: boolean;
  onRequestClose: () => void;
  onComplete: (excellent: boolean) => Promise<LocandiereCompletionResult>;
  onMatchConcluded?: (summary: LocandiereMatchSummary) => void;
}

type CompletionSaveStatus = 'idle' | 'pending' | 'saved' | 'queued' | 'cooldown' | 'error';

export const LocandiereDiceModal: React.FC<LocandiereDiceModalProps> = ({
  visible,
  characterName,
  hasTrophy,
  onRequestClose,
  onComplete,
  onMatchConcluded,
}) => {
  const matchIdCounterRef = useRef(1);
  const activeMatchIdRef = useRef(1);
  const mountedRef = useRef(true);
  const submittedMatchIdRef = useRef<number | null>(null);
  const inFlightMatchIdRef = useRef<number | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const isRollingRef = useRef(false);

  const [match, setMatch] = useState<LocandiereMatchState>(() => createLocandiereMatch(1));
  const [isRolling, setIsRolling] = useState(false);
  const [rollingOwner, setRollingOwner] = useState<'player' | 'innkeeper'>('player');
  const [displayedDice, setDisplayedDice] = useState<[DieValue, DieValue]>([6, 6]);
  const [reduceMotion, setReduceMotion] = useState(false);

  const [completionStatus, setCompletionStatus] = useState<CompletionSaveStatus>('idle');
  const [completionResult, setCompletionResult] = useState<LocandiereCompletionResult | null>(null);
  const [trophyUnlockedInModal, setTrophyUnlockedInModal] = useState(false);

  const dieTranslateX = useRef(new Animated.Value(0)).current;
  const dieTranslateY = useRef(new Animated.Value(0)).current;
  const dieRotate = useRef(new Animated.Value(0)).current;
  const dieScale = useRef(new Animated.Value(1)).current;

  const clearAllTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current = [];
  }, []);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current = timersRef.current.filter((t) => t !== id);
      fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mountedRef.current) setReduceMotion(enabled);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (enabled) => {
      if (mountedRef.current) setReduceMotion(enabled);
    });

    return () => {
      mountedRef.current = false;
      clearAllTimers();
      sub?.remove?.();
    };
  }, [clearAllTimers]);

  const resetDieTransform = useCallback(() => {
    dieTranslateX.stopAnimation();
    dieTranslateY.stopAnimation();
    dieRotate.stopAnimation();
    dieScale.stopAnimation();
    dieTranslateX.setValue(0);
    dieTranslateY.setValue(0);
    dieRotate.setValue(0);
    dieScale.setValue(1);
  }, [dieTranslateX, dieTranslateY, dieRotate, dieScale]);

  const startFreshMatch = useCallback(() => {
    clearAllTimers();
    resetDieTransform();
    matchIdCounterRef.current += 1;
    const nextId = matchIdCounterRef.current;
    activeMatchIdRef.current = nextId;
    submittedMatchIdRef.current = null;
    inFlightMatchIdRef.current = null;
    isRollingRef.current = false;

    setMatch(createLocandiereMatch(nextId));
    setIsRolling(false);
    setRollingOwner('player');
    setDisplayedDice([6, 6]);
    setCompletionStatus('idle');
    setCompletionResult(null);
  }, [clearAllTimers, resetDieTransform]);

  useEffect(() => {
    if (visible) {
      startFreshMatch();
    } else {
      clearAllTimers();
      isRollingRef.current = false;
      inFlightMatchIdRef.current = null;
      setIsRolling(false);
    }
  }, [visible, startFreshMatch, clearAllTimers]);

  const submitMatchCompletion = useCallback(
    async (matchId: number, outcome: 'player_win' | 'innkeeper_win' | 'draw') => {
      if (activeMatchIdRef.current !== matchId) return;
      if (inFlightMatchIdRef.current === matchId) return;

      inFlightMatchIdRef.current = matchId;
      setCompletionStatus('pending');
      setCompletionResult(null);

      const excellent = outcome === 'player_win';

      try {
        const res = await onComplete(excellent);
        if (!mountedRef.current || activeMatchIdRef.current !== matchId) return;

        inFlightMatchIdRef.current = null;
        setCompletionResult(res);

        const newlyUnlockedTrophy = Boolean(res.trophyUnlocked);
        if (newlyUnlockedTrophy) {
          setTrophyUnlockedInModal(true);
        }

        const isErrorMessage =
          !res.applied &&
          !newlyUnlockedTrophy &&
          /impossibile salvare|errore/i.test(res.message || '');

        if (isErrorMessage) {
          setCompletionStatus('error');
        } else if (res.queued) {
          setCompletionStatus('queued');
        } else if (res.applied) {
          setCompletionStatus('saved');
        } else {
          setCompletionStatus('cooldown');
        }

        onMatchConcluded?.({
          outcome,
          applied: res.applied,
          trophyUnlocked: newlyUnlockedTrophy,
          queued: res.queued,
          before: res.before,
          after: res.after,
          message: res.message,
        });
      } catch {
        if (!mountedRef.current || activeMatchIdRef.current !== matchId) return;
        inFlightMatchIdRef.current = null;
        setCompletionStatus('error');
        setCompletionResult({
          applied: false,
          message: 'Impossibile salvare il risultato della sfida. Puoi riprovare qui sotto.',
        });
      }
    },
    [onComplete, onMatchConcluded]
  );

  // Trigger onComplete once for every concluded hand (win, loss, or draw)
  useEffect(() => {
    if (!visible || match.phase !== 'finished' || !match.outcome) return;
    const matchId = match.id;
    if (submittedMatchIdRef.current === matchId) return;

    submittedMatchIdRef.current = matchId;
    void submitMatchCompletion(matchId, match.outcome);
  }, [visible, match.phase, match.outcome, match.id, submitMatchCompletion]);

  const animateDieRoll = useCallback(
    (
      owner: 'player' | 'innkeeper',
      finalFaces: [DieValue, DieValue],
      matchId: number,
      onComplete: () => void
    ) => {
      setRollingOwner(owner);
      setDisplayedDice(finalFaces);

      if (reduceMotion) {
        resetDieTransform();
        scheduleTimer(() => {
          if (!mountedRef.current || activeMatchIdRef.current !== matchId) return;
          onComplete();
        }, 90);
        return;
      }

      const startX = owner === 'player' ? -44 : 44;
      const startY = owner === 'player' ? 14 : -14;

      dieTranslateX.setValue(startX);
      dieTranslateY.setValue(startY);
      dieRotate.setValue(0);
      dieScale.setValue(0.86);

      Animated.parallel([
        Animated.timing(dieTranslateX, {
          toValue: 0,
          duration: 310,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(dieTranslateY, {
            toValue: -14,
            duration: 130,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dieTranslateY, {
            toValue: 3,
            duration: 100,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(dieTranslateY, {
            toValue: 0,
            duration: 80,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(dieRotate, {
          toValue: owner === 'player' ? 1 : -1,
          duration: 310,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(dieScale, {
            toValue: 1.12,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(dieScale, {
            toValue: 1,
            duration: 160,
            useNativeDriver: true,
          }),
        ]),
      ]).start(({ finished }) => {
        if (!mountedRef.current || activeMatchIdRef.current !== matchId) return;
        if (finished) {
          onComplete();
        }
      });
    },
    [reduceMotion, resetDieTransform, scheduleTimer, dieTranslateX, dieTranslateY, dieRotate, dieScale]
  );

  const handlePlayerRoll = useCallback(() => {
    if (isRollingRef.current) return;
    if (match.phase !== 'playing' || match.activeActor !== 'player') return;

    const matchId = match.id;
    const nextState = rollCurrentTurn(match);
    const rolledDice: [DieValue, DieValue] = nextState.lastDice ?? [1, 1];

    isRollingRef.current = true;
    setIsRolling(true);

    animateDieRoll('player', rolledDice, matchId, () => {
      if (!mountedRef.current || activeMatchIdRef.current !== matchId) return;
      setMatch(nextState);
      isRollingRef.current = false;
      setIsRolling(false);
    });
  }, [match, animateDieRoll]);

  const handlePlayerBank = useCallback(() => {
    if (isRollingRef.current) return;
    if (match.phase !== 'playing' || match.activeActor !== 'player') return;
    if (!canBankCurrentTurn(match)) return;

    setMatch((prev) => bankCurrentTurn(prev));
  }, [match]);

  // Autonomous Innkeeper turn loop (step-by-step animated real rolls)
  useEffect(() => {
    if (!visible) return;
    if (match.phase !== 'playing' || match.activeActor !== 'innkeeper') return;
    if (isRollingRef.current) return;

    const matchId = match.id;
    const delayMs = match.turnRolls.length === 0 ? 520 : 460;

    const timer = scheduleTimer(() => {
      if (!mountedRef.current || activeMatchIdRef.current !== matchId) return;
      if (isRollingRef.current) return;

      if (!shouldInnkeeperRollAgain(match)) {
        setMatch((prev) => {
          if (prev.id !== matchId || prev.activeActor !== 'innkeeper') return prev;
          return bankCurrentTurn(prev);
        });
        return;
      }

      const nextState = rollCurrentTurn(match);
      const rolledDice: [DieValue, DieValue] = nextState.lastDice ?? [1, 1];

      isRollingRef.current = true;
      setIsRolling(true);

      animateDieRoll('innkeeper', rolledDice, matchId, () => {
        if (!mountedRef.current || activeMatchIdRef.current !== matchId) return;
        setMatch(nextState);
        isRollingRef.current = false;
        setIsRolling(false);
      });
    }, delayMs);
    return () => clearTimeout(timer);
  }, [visible, match, scheduleTimer, animateDieRoll]);

  const showBrassTrophyOnCounter = hasTrophy || trophyUnlockedInModal;
  const hasStatDelta =
    completionResult !== null &&
    typeof completionResult.before === 'number' &&
    typeof completionResult.after === 'number';
  const statDelta = hasStatDelta
    ? (completionResult.after as number) - (completionResult.before as number)
    : 0;
  const isPlayerTurn = match.phase === 'playing' && match.activeActor === 'player';
  const isInnkeeperTurn = match.phase === 'playing' && match.activeActor === 'innkeeper';
  const isFinished = match.phase === 'finished';

  const innkeeperMood: InnkeeperMood = isRolling && rollingOwner === 'innkeeper'
    ? 'rolling'
    : isFinished
      ? match.outcome === 'innkeeper_win'
        ? 'happy'
        : match.outcome === 'player_win'
          ? 'grumpy'
          : 'idle'
      : 'idle';

  const dieSpin = dieRotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  const dieOwnerForDisplay: 'player' | 'innkeeper' = isRolling
    ? rollingOwner
    : match.lastActor ?? match.activeActor;

  const isBustedDisplay =
    !isRolling && match.lastEvent === 'busted' && displayedDice[0] === 1 && displayedDice[1] === 1;

  const statusAnnouncement = (() => {
    if (isFinished) {
      if (match.outcome === 'player_win') {
        return `Vittoria di ${characterName}! ${match.playerScore} a ${match.innkeeperScore} contro il Locandiere.`;
      }
      if (match.outcome === 'innkeeper_win') {
        return `Vince il Locandiere ${match.innkeeperScore} a ${match.playerScore}.`;
      }
      return `Pareggio ${match.playerScore} a ${match.innkeeperScore}. Nessun trofeo assegnato.`;
    }
    if (isRolling) {
      return rollingOwner === 'player'
        ? `${characterName} lancia i 2d6 sul bancone...`
        : 'Il Locandiere lancia i 2d6...';
    }
    if (match.lastEvent === 'busted') {
      return match.lastActor === 'player'
        ? 'Doppio 1 (Occhi di Serpente)! Turno azzerato, mano al Locandiere.'
        : 'Il Locandiere fa doppio 1 e perde il turno! Tocca a te.';
    }
    if (match.lastEvent === 'halved') {
      return match.lastActor === 'player'
        ? 'È uscito un 1: punti del turno dimezzati! Tira ancora o incassa.'
        : 'Il Locandiere ha fatto un 1 e dimezza il turno.';
    }
    if (match.lastEvent === 'double_bonus') {
      return match.lastActor === 'player'
        ? 'Doppio! +4 punti bonus nel piatto del turno.'
        : 'Il Locandiere fa doppio (+4 bonus)!';
    }
    if (match.lastEvent === 'banked') {
      return match.lastActor === 'player'
        ? 'Punti incassati! Ora tocca al Locandiere.'
        : 'Il Locandiere incassa. Tocca a te!';
    }
    if (isInnkeeperTurn) {
      return 'Il Locandiere sta valutando il prossimo lancio...';
    }
    if (match.turnPoints > 0) {
      return 'Tira ancora 2d6 o incassa.';
    }
    return 'Lancia 2d6 per iniziare il turno.';
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Dices size={18} color={colors.brassBase} />
              <Text style={styles.title}>SFIDA IL LOCANDIERE</Text>
            </View>
            <TouchableOpacity
              onPress={onRequestClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Chiudi sfida e torna in Taverna"
            >
              <X size={18} color={colors.parchmentMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* One-line Rule & First-Victory Prize */}
            <Text style={styles.ruleLine}>
              3 turni a testa · 2d6: un 1 dimezza, doppio 1 azzera, doppi 2–6 +4 bonus.
            </Text>
            {!showBrassTrophyOnCounter && (
              <View style={styles.prizeBanner}>
                <BrassDieTrophy size={16} />
                <Text style={styles.prizeBannerText}>
                  Prima vittoria: sblocca il Dado d&apos;Ottone sul bancone.
                </Text>
              </View>
            )}

            {/* Scoreboard */}
            <View style={styles.scoreboard}>
              <View style={[styles.scoreCard, isPlayerTurn && styles.scoreCardActive]}>
                <Text style={styles.scoreActor} numberOfLines={1}>
                  {characterName}
                </Text>
                <Text style={styles.scoreValue}>{match.playerScore}</Text>
              </View>

              <View style={styles.turnCenterBox}>
                <Text style={styles.turnBadge}>
                  {isFinished ? 'FINE' : `TURNO ${match.turnNumber}/${TOTAL_TURNS}`}
                </Text>
                {!isFinished && <Text style={styles.roundSub}>{isPlayerTurn ? 'Tocca a te' : 'Tocca a lui'}</Text>}
              </View>

              <View style={[styles.scoreCard, isInnkeeperTurn && styles.scoreCardActive]}>
                <Text style={styles.scoreActor} numberOfLines={1}>
                  Locandiere
                </Text>
                <Text style={styles.scoreValue}>{match.innkeeperScore}</Text>
              </View>
            </View>

            {/* Innkeeper Behind Wooden Counter + Animated Die Arena */}
            <View style={styles.counterArena}>
              <View style={styles.innkeeperBackRow}>
                <InnkeeperSprite size={54} mood={innkeeperMood} />
                <View style={styles.innkeeperDialogueBox}>
                  <Text style={styles.innkeeperName}>LOCANDIERE</Text>
                  <Text style={styles.innkeeperQuote} numberOfLines={2}>
                    {isFinished
                      ? match.outcome === 'player_win'
                        ? '«Bel colpo! Quel dado è meritato.»'
                        : match.outcome === 'draw'
                          ? '«Pari! Nessuno si porta via il premio.»'
                          : '«Il bancone vince ancora, riprova!»'
                      : isInnkeeperTurn
                        ? '«Vediamo se la sorte sta con me...»'
                        : '«Tira o incassa, la mano è tua.»'}
                  </Text>
                </View>
              </View>

              {/* Wooden Counter Surface */}
              <View style={styles.woodCounterTop}>
                {showBrassTrophyOnCounter && (
                  <View
                    style={styles.counterTrophyBadge}
                    accessibilityLabel="Dado d'Ottone sul bancone"
                  >
                    <BrassDieTrophy size={18} />
                  </View>
                )}

                <View style={styles.dieStage}>
                  {!isRolling && match.lastDie === null ? (
                    <View style={styles.dieWaiting} accessibilityLabel="Dado pronto al primo lancio" />
                  ) : (
                  <Animated.View
                    style={{
                      flexDirection: 'row',
                      gap: 10,
                      transform: [
                        { translateX: dieTranslateX },
                        { translateY: dieTranslateY },
                        { rotate: dieSpin },
                        { scale: dieScale },
                      ],
                    }}
                  >
                    <PippedDieFace
                      value={displayedDice[0]}
                      owner={dieOwnerForDisplay}
                      size={56}
                      busted={isBustedDisplay || (!isRolling && displayedDice[0] === 1 && match.lastEvent === 'halved')}
                    />
                    <PippedDieFace
                      value={displayedDice[1]}
                      owner={dieOwnerForDisplay}
                      size={56}
                      busted={isBustedDisplay || (!isRolling && displayedDice[1] === 1 && match.lastEvent === 'halved')}
                    />
                  </Animated.View>
                  )}
                </View>

                {/* Turn Points & Roll Trail */}
                <View style={styles.turnPotRow}>
                  <Text style={styles.turnPotLabel}>
                    Punti da incassare:{' '}
                    <Text style={styles.turnPotValue}>+{match.turnPoints}</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Live Status / Outcome Banner */}
            <View
              style={[
                styles.statusBox,
                isFinished && match.outcome === 'player_win' && styles.statusBoxWin,
                isFinished && match.outcome === 'innkeeper_win' && styles.statusBoxLoss,
                isFinished && match.outcome === 'draw' && styles.statusBoxDraw,
              ]}
              accessibilityLiveRegion="polite"
            >
              <View style={styles.statusHeaderRow}>
                {isFinished && match.outcome === 'player_win' && (
                  <Trophy size={15} color={colors.emerald} />
                )}
                <Text
                  style={[
                    styles.statusText,
                    isFinished && match.outcome === 'player_win' && styles.statusTextWin,
                    isFinished && match.outcome === 'innkeeper_win' && styles.statusTextLoss,
                    isFinished && match.outcome === 'draw' && styles.statusTextDraw,
                  ]}
                >
                  {statusAnnouncement}
                </Text>
              </View>
            </View>

            {/* Completion Reward & Trophy Status */}
            {isFinished && completionStatus !== 'idle' && (
              <View style={styles.trophyBox} accessibilityLiveRegion="polite">
                {completionStatus === 'pending' ? (
                  <View style={styles.trophyRow}>
                    <ActivityIndicator size="small" color={colors.brassLight} />
                    <Text style={styles.trophyPendingText}>
                      Salvataggio risultato in corso...
                    </Text>
                  </View>
                ) : completionStatus === 'error' ? (
                  <View style={styles.trophyErrorCol}>
                    <Text style={styles.trophyErrorText}>
                      {completionResult?.message || 'Salvataggio non riuscito. Riprova.'}
                    </Text>
                    <TouchableOpacity
                      style={styles.retryBtn}
                      onPress={() => {
                        if (match.outcome) {
                          void submitMatchCompletion(match.id, match.outcome);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="Riprova salvataggio risultato"
                    >
                      <RefreshCw size={13} color={colors.void} />
                      <Text style={styles.retryBtnText}>Riprova salvataggio</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.rewardCol}>
                    {hasStatDelta && completionResult && (completionResult.applied || statDelta !== 0) && (
                      <View style={styles.deltaPill}>
                        <Text style={styles.deltaLabel}>🎭 Umore</Text>
                        <Text style={styles.deltaNumbers}>
                          {completionResult.before}% → {completionResult.after}%
                        </Text>
                        <Text
                          style={[
                            styles.deltaBadge,
                            statDelta > 0 ? styles.deltaBadgePositive : styles.deltaBadgeNeutral,
                          ]}
                        >
                          {statDelta > 0 ? `+${statDelta}` : `${statDelta}`}
                        </Text>
                      </View>
                    )}

                    {completionResult?.trophyUnlocked && (
                      <View style={styles.trophyRow}>
                        <BrassDieTrophy size={16} />
                        <Text style={styles.trophySavedText}>
                          {completionStatus === 'queued'
                            ? 'Dado d’Ottone sbloccato (in coda offline).'
                            : 'Dado d’Ottone sbloccato e esposto sul bancone!'}
                        </Text>
                      </View>
                    )}

                    {Boolean(completionResult?.message) && (
                      <Text
                        style={
                          completionStatus === 'queued'
                            ? styles.trophyQueuedText
                            : completionStatus === 'cooldown'
                              ? styles.cooldownText
                              : styles.rewardMessageText
                        }
                      >
                        {completionResult?.message}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Controls */}
            {!isFinished ? (
              <View style={styles.actionsCol}>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.primaryBtn,
                      (!isPlayerTurn || isRolling) && styles.btnDisabled,
                    ]}
                    onPress={handlePlayerRoll}
                    disabled={!isPlayerTurn || isRolling}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Lancia il dado"
                  >
                    <Dices size={15} color={colors.void} />
                    <Text style={styles.primaryBtnText}>
                      {isRolling && rollingOwner === 'player' ? 'Lancio...' : 'Lancia d6'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.secondaryBtn,
                      (!isPlayerTurn || isRolling || !canBankCurrentTurn(match)) &&
                        styles.btnDisabled,
                    ]}
                    onPress={handlePlayerBank}
                    disabled={!isPlayerTurn || isRolling || !canBankCurrentTurn(match)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Incassa ${match.turnPoints} punti`}
                  >
                    <Text
                      style={[
                        styles.secondaryBtnText,
                        (!isPlayerTurn || isRolling || !canBankCurrentTurn(match)) &&
                          styles.btnTextDisabled,
                      ]}
                    >
                      Incassa (+{match.turnPoints})
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={onRequestClose}
                  accessibilityRole="button"
                  accessibilityLabel="Esci dalla sfida senza premio"
                >
                  <Text style={styles.ghostBtnText}>
                    Torna in Taverna (uscita anticipata: nessun premio)
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, completionStatus === 'pending' && styles.btnDisabled]}
                  onPress={startFreshMatch}
                  disabled={completionStatus === 'pending'}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Inizia una nuova sfida"
                >
                  <RotateCcw size={14} color={colors.void} />
                  <Text style={styles.primaryBtnText}>Nuova sfida</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  scrollContent: {
    gap: 10,
    paddingTop: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 155, 39, 0.16)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  ruleLine: {
    fontSize: 11.5,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  prizeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(197, 155, 39, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.3)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  prizeBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  scoreboard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreCard: {
    flex: 1,
    backgroundColor: '#14100D',
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  scoreCardActive: {
    borderColor: colors.brassBase,
    backgroundColor: 'rgba(197, 155, 39, 0.14)',
  },
  scoreActor: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.parchmentLight,
  },
  turnCenterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 74,
  },
  turnBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.brassLight,
    letterSpacing: 0.6,
  },
  roundSub: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  counterArena: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.28)',
    backgroundColor: '#16110D',
  },
  innkeeperBackRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 2,
    backgroundColor: '#1A130E',
  },
  innkeeperDialogueBox: {
    flex: 1,
    paddingBottom: 6,
  },
  innkeeperName: {
    fontSize: 9.5,
    fontWeight: '900',
    color: colors.brassBase,
    letterSpacing: 0.6,
  },
  innkeeperQuote: {
    fontSize: 11.5,
    fontStyle: 'italic',
    color: colors.parchmentLight,
    lineHeight: 15,
    marginTop: 2,
  },
  woodCounterTop: {
    backgroundColor: '#4A2F1D',
    borderTopWidth: 3,
    borderTopColor: '#784E32',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
  },
  counterTrophyBadge: {
    position: 'absolute',
    top: 8,
    right: 10,
    backgroundColor: 'rgba(20, 15, 11, 0.55)',
    borderRadius: 6,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(245, 196, 81, 0.45)',
  },
  dieStage: {
    height: 76,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dieWaiting: {
    width: 56,
    height: 56,
    borderRadius: 11,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#B59465',
  },
  turnPotRow: {
    alignItems: 'center',
    gap: 2,
  },
  turnPotLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F5ECD7',
  },
  turnPotValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FDE68A',
  },
  statusBox: {
    backgroundColor: '#130F0C',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  statusBoxWin: {
    borderColor: colors.emerald,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusBoxLoss: {
    borderColor: colors.crimsonLight,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
  },
  statusBoxDraw: {
    borderColor: colors.brassBase,
    backgroundColor: 'rgba(197, 155, 39, 0.12)',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.parchmentLight,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 17,
  },
  statusTextWin: {
    color: colors.emerald,
    fontWeight: '800',
  },
  statusTextLoss: {
    color: colors.crimsonLight,
    fontWeight: '700',
  },
  statusTextDraw: {
    color: colors.brassLight,
    fontWeight: '800',
  },
  trophyBox: {
    backgroundColor: '#14100D',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.35)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  trophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  trophyPendingText: {
    fontSize: 11.5,
    color: colors.brassLight,
    fontWeight: '700',
  },
  trophySavedText: {
    fontSize: 11.5,
    color: colors.emerald,
    fontWeight: '800',
    flexShrink: 1,
  },
  trophyQueuedText: {
    fontSize: 11.5,
    color: colors.brassLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  rewardCol: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  deltaLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  deltaNumbers: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  deltaBadge: {
    fontSize: 11.5,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  deltaBadgePositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.22)',
    color: colors.emerald,
  },
  deltaBadgeNeutral: {
    backgroundColor: 'rgba(197, 155, 39, 0.2)',
    color: colors.brassLight,
  },
  rewardMessageText: {
    fontSize: 11.5,
    color: colors.parchmentLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  cooldownText: {
    fontSize: 11.5,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  trophyErrorCol: {
    alignItems: 'center',
    gap: 8,
  },
  trophyErrorText: {
    fontSize: 11.5,
    color: colors.crimsonLight,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.void,
  },
  actionsCol: {
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.brassBase,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: colors.void,
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#14100D',
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: colors.brassLight,
    fontSize: 13,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.45,
  },
  btnTextDisabled: {
    color: colors.parchmentMuted,
  },
  ghostBtn: {
    paddingVertical: 5,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontSize: 11,
    color: colors.parchmentMuted,
    fontWeight: '600',
  },
});
