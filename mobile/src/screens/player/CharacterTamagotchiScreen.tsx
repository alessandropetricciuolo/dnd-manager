import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Utensils,
  Dices,
  BedDouble,
  Sparkles,
  Shield,
  Compass,
  ScrollText,
  RefreshCw,
  Play,
  X,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign } from '../../contexts/CampaignContext';
import { usePlayerCharacter } from '../../hooks/usePlayerCharacter';
import { useCharacterTamagotchi } from '../../hooks/useCharacterTamagotchi';
import { TamagotchiAction, TamagotchiAppearance } from '../../lib/character-tamagotchi';
import { TamagotchiStage } from '../../components/player/TamagotchiStage';
import {
  TamagotchiWardrobeModal,
  WardrobeEntrySource,
} from '../../components/player/TamagotchiWardrobeModal';
import {
  LocandiereCompletionResult,
  LocandiereDiceModal,
  LocandiereMatchSummary,
} from '../../components/player/LocandiereDiceModal';
import { CareGamesModal } from '../../components/player/CareGamesModal';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';

type CareStat = 'hunger' | 'energy' | 'happiness' | 'hygiene';
type NonDiceCareStat = 'hunger' | 'energy' | 'hygiene';
type ActiveGameModal = null | { kind: 'dice' } | { kind: 'care'; stat: NonDiceCareStat };

const STAT_BARS: readonly {
  key: CareStat;
  label: string;
  icon: string;
  gameLabel: string;
}[] = [
  { key: 'hunger', label: 'Sazietà', icon: '🍖', gameLabel: 'pentola della Taverna' },
  { key: 'happiness', label: 'Umore', icon: '🎭', gameLabel: 'sfida a dadi contro il Locandiere' },
  { key: 'energy', label: 'Energia', icon: '⚡', gameLabel: 'fuoco della branda' },
  { key: 'hygiene', label: 'Cura', icon: '✨', gameLabel: 'pulizia dell’equipaggiamento' },
];

const STAT_TO_BURST_ACTION: Record<CareStat, TamagotchiAction> = {
  hunger: 'feed',
  happiness: 'play',
  energy: 'rest',
  hygiene: 'clean',
};

const ACTIONS: {
  action: TamagotchiAction;
  label: string;
  sub: string;
  Icon: typeof Utensils;
}[] = [
  { action: 'feed', label: 'Nutri', sub: '+Sazietà', Icon: Utensils },
  { action: 'play', label: 'Gioca', sub: 'Sfida', Icon: Dices },
  { action: 'rest', label: 'Riposa', sub: '+Energia', Icon: BedDouble },
  { action: 'clean', label: 'Pulisci', sub: '+Cura', Icon: Sparkles },
];

function getStatColor(value: number): string {
  if (value >= 65) return colors.emerald;
  if (value >= 35) return colors.brassBase;
  return colors.crimsonLight;
}

export const CharacterTamagotchiScreen: React.FC = () => {
  const { role } = useAuth();
  const {
    activeCampaign,
    joinedLongCampaigns,
    isLongCampaignActive,
    isMemberOfActiveCampaign,
    joinLongCampaign,
  } = useCampaign();

  const targetLongCampaign = useMemo(() => {
    if (isLongCampaignActive && isMemberOfActiveCampaign && activeCampaign) {
      return activeCampaign;
    }
    return joinedLongCampaigns[0] ?? activeCampaign;
  }, [isLongCampaignActive, isMemberOfActiveCampaign, activeCampaign, joinedLongCampaigns]);

  const targetIsLong = targetLongCampaign?.type === 'long';
  const targetIsMember =
    role === 'gm' ||
    role === 'admin' ||
    (targetLongCampaign ? joinedLongCampaigns.some((c) => c.id === targetLongCampaign.id) : false);

  const { activeCharacter, hasAssignedCharacter } = usePlayerCharacter(targetLongCampaign?.id ?? null);

  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [wardrobeSource, setWardrobeSource] = useState<WardrobeEntrySource | null>(null);
  const [activeGameModal, setActiveGameModal] = useState<ActiveGameModal>(null);
  const [joiningLong, setJoiningLong] = useState(false);
  const [activeBurst, setActiveBurst] = useState<TamagotchiAction | null>(null);
  const [gameFeedback, setGameFeedback] = useState<string | null>(null);

  const enabled = targetIsLong && targetIsMember && hasAssignedCharacter;

  const activeCharacterId = activeCharacter?.id ?? null;
  const activeCharacterIdRef = useRef<string | null>(activeCharacterId);
  activeCharacterIdRef.current = activeCharacterId;

  const {
    state,
    moodInfo,
    lowpolyAvatarUrl,
    loading,
    actionLoading,
    lastFeedback,
    refresh,
    performAction,
    saveAppearance,
    completeCareGame,
    getCooldownMinutes,
    getCareGameCooldownMinutes,
  } = useCharacterTamagotchi(
    activeCharacterId,
    activeCharacter?.name ?? 'Eroe',
    enabled
  );

  const hasInnkeeperTrophy = Boolean(state.innkeeperTrophyUnlockedAt);

  useEffect(() => {
    setActiveGameModal(null);
    setWardrobeSource(null);
    setGameFeedback(null);
    setActiveBurst(null);
  }, [activeCharacterId]);

  useEffect(() => {
    setGameFeedback(null);
  }, [lastFeedback]);

  const openDiceModal = useCallback(() => {
    setLogModalOpen(false);
    setCampaignModalOpen(false);
    setWardrobeSource(null);
    setActiveGameModal({ kind: 'dice' });
  }, []);

  const openCareGameForStat = useCallback(
    (stat: CareStat) => {
      if (stat === 'happiness') {
        openDiceModal();
        return;
      }
      setLogModalOpen(false);
      setCampaignModalOpen(false);
      setWardrobeSource(null);
      setActiveGameModal({ kind: 'care', stat });
    },
    [openDiceModal]
  );

  const openLogModal = useCallback(() => {
    setActiveGameModal(null);
    setCampaignModalOpen(false);
    setWardrobeSource(null);
    setLogModalOpen(true);
  }, []);

  const openCampaignModal = useCallback(() => {
    setActiveGameModal(null);
    setLogModalOpen(false);
    setWardrobeSource(null);
    setCampaignModalOpen(true);
  }, []);

  const openWardrobe = useCallback((source: WardrobeEntrySource) => {
    setActiveGameModal(null);
    setLogModalOpen(false);
    setCampaignModalOpen(false);
    setWardrobeSource(source);
  }, []);

  const triggerBurst = useCallback((action: TamagotchiAction) => {
    setActiveBurst(action);
    setTimeout(() => setActiveBurst((curr) => (curr === action ? null : curr)), 1350);
  }, []);

  const triggerAction = useCallback(
    async (action: TamagotchiAction) => {
      setGameFeedback(null);
      const res = await performAction(action);
      if (res.applied) {
        triggerBurst(action);
      }
    },
    [performAction, triggerBurst]
  );

  const handleSaveAppearance = useCallback(
    async (nextAppearance: TamagotchiAppearance | null) => {
      setGameFeedback(null);
      const res = await saveAppearance(nextAppearance);
      if (res.applied) {
        triggerBurst('clean');
      }
      return { applied: res.applied, message: res.message };
    },
    [saveAppearance, triggerBurst]
  );

  const handleCompleteCareGame = useCallback(
    async (
      characterId: string,
      stat: CareStat,
      excellent: boolean
    ): Promise<LocandiereCompletionResult> => {
      if (activeCharacterIdRef.current !== characterId) {
        return { applied: false, message: '' };
      }
      const res = await completeCareGame(stat, excellent);
      if (activeCharacterIdRef.current !== characterId) {
        return { applied: false, message: '' };
      }
      if (stat !== 'happiness') {
        if (res.applied) {
          triggerBurst(STAT_TO_BURST_ACTION[stat]);
        }
        if (res.message) {
          setGameFeedback(res.message);
        }
      }
      return res;
    },
    [completeCareGame, triggerBurst]
  );

  const handleDiceMatchConcluded = useCallback(
    (characterId: string, summary: LocandiereMatchSummary) => {
      if (activeCharacterIdRef.current !== characterId) return;
      if (summary.outcome === 'player_win' || summary.applied) {
        triggerBurst('play');
      }
      if (summary.message) {
        setGameFeedback(summary.message);
      } else if (summary.outcome === 'player_win') {
        setGameFeedback(`${activeCharacter?.name ?? 'Eroe'} ha battuto il Locandiere a dadi!`);
      } else if (summary.outcome === 'draw') {
        setGameFeedback('Pareggio al bancone contro il Locandiere.');
      } else {
        setGameFeedback('Il Locandiere vince questa mano. Riprova quando vuoi!');
      }
    },
    [triggerBurst, activeCharacter?.name]
  );

  if (!targetIsLong) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.centerBox}>
          <Compass size={36} color={colors.brassBase} />
          <Text style={styles.emptyTitle}>Taverna riservata alle Campagne Long</Text>
          <Text style={styles.emptySub}>
            Il compagno interattivo del tuo personaggio è disponibile solo nelle campagne lunghe della Gilda.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setCampaignModalOpen(true)}
          >
            <Text style={styles.primaryBtnText}>Seleziona Campagna Long</Text>
          </TouchableOpacity>
        </View>
        <CampaignSelectorModal visible={campaignModalOpen} onClose={() => setCampaignModalOpen(false)} />
      </SafeAreaView>
    );
  }

  if (!targetIsMember && targetLongCampaign) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.centerBox}>
          <Shield size={36} color={colors.brassBase} />
          <Text style={styles.emptyTitle}>Iscrizione richiesta</Text>
          <Text style={styles.emptySub}>
            Iscriviti a &quot;{targetLongCampaign.name}&quot; per sbloccare il tuo eroe in Taverna.
          </Text>
          {targetLongCampaign.long_registrations_open !== false && (
            <TouchableOpacity
              style={[styles.primaryBtn, joiningLong && { opacity: 0.6 }]}
              disabled={joiningLong}
              onPress={async () => {
                setJoiningLong(true);
                try {
                  await joinLongCampaign(targetLongCampaign.id);
                } finally {
                  setJoiningLong(false);
                }
              }}
            >
              <Text style={styles.primaryBtnText}>
                {joiningLong ? 'Iscrizione in corso...' : 'Iscriviti alla Campagna'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (!hasAssignedCharacter || !activeCharacter) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <View style={styles.centerBox}>
          <Shield size={36} color={colors.brassBase} />
          <Text style={styles.emptyTitle}>Nessun Eroe Assegnato</Text>
          <Text style={styles.emptySub}>
            Quando il Game Master ti assegnerà un personaggio in &quot;{activeCampaign?.name}&quot;, potrai prendertene cura qui tra una sessione e l&apos;altra.
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setCampaignModalOpen(true)}
          >
            <Text style={styles.primaryBtnText}>Cambia Campagna</Text>
          </TouchableOpacity>
        </View>
        <CampaignSelectorModal visible={campaignModalOpen} onClose={() => setCampaignModalOpen(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.consoleShell}>
        {/* Integrated Top Bar */}
        <View style={styles.topHud}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle} numberOfLines={1}>
              {activeCharacter.name}
            </Text>
            <Text style={styles.heroSub} numberOfLines={1}>
              {activeCharacter.character_class || 'Avventuriero'} · {activeCampaign?.name}
            </Text>
          </View>
          <View style={styles.topHudActions}>
            <TouchableOpacity
              style={styles.hudIconBtn}
              onPress={() => { void refresh(); }}
              accessibilityRole="button"
              accessibilityLabel="Aggiorna stato"
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.brassLight} />
              ) : (
                <RefreshCw size={15} color={colors.brassLight} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.hudIconBtn}
              onPress={openLogModal}
              accessibilityRole="button"
              accessibilityLabel="Apri diario di Taverna"
            >
              <ScrollText size={15} color={colors.brassLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={openCampaignModal}
              accessibilityRole="button"
              accessibilityLabel="Cambia campagna"
            >
              <Text style={styles.switchBtnText}>Cambia</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Integrated 4 Needs Strip (tappable to open each stat's minigame) */}
        <View style={styles.statsStrip}>
          {STAT_BARS.map(({ key, label, icon, gameLabel }) => {
            const value = state[key];
            const barColor = getStatColor(value);
            const gameCooldownMins = getCareGameCooldownMinutes(key);
            const rewardReady = gameCooldownMins === 0;
            return (
              <TouchableOpacity
                key={key}
                style={styles.statChip}
                onPress={() => openCareGameForStat(key)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={`${label} ${value}%. ${rewardReady ? 'Premio pronto.' : `Premio tra ${gameCooldownMins} minuti.`} Apri minigioco ${gameLabel} per ${activeCharacter.name}`}
              >
                <View style={styles.statChipTop}>
                  <Text style={styles.statChipLabel} numberOfLines={1}>
                    {icon} {label}
                  </Text>
                  <View style={styles.statChipRight}>
                    <Text style={[styles.statChipVal, { color: barColor }]}>{value}%</Text>
                    {rewardReady ? (
                      <View style={[styles.statPlayCue, styles.statPlayCueReady]}>
                        <Play size={8} color={colors.brassLight} fill={colors.brassLight} />
                      </View>
                    ) : (
                      <View style={styles.statCooldownPill}>
                        <Text style={styles.statCooldownText}>{gameCooldownMins}m</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${value}%`, backgroundColor: barColor },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Full-Screen Retro Stage */}
        <ScrollView
          style={styles.stageWrap}
          contentContainerStyle={styles.stageContents}
          showsVerticalScrollIndicator={false}
        >
          <TamagotchiStage
            characterName={activeCharacter.name}
            characterClass={activeCharacter.character_class}
            raceSlug={activeCharacter.race_slug}
            imageUrl={activeCharacter.image_url}
            lowpolyAvatarUrl={lowpolyAvatarUrl ?? activeCharacter.lowpoly_avatar_url ?? null}
            appearance={state.appearance}
            mood={moodInfo.mood}
            moodLabel={moodInfo.label}
            stats={{
              hunger: state.hunger,
              happiness: state.happiness,
              energy: state.energy,
              hygiene: state.hygiene,
            }}
            activeBurst={activeBurst}
            hasInnkeeperTrophy={hasInnkeeperTrophy}
            unlockedCareTrophies={state.unlockedCareTrophies}
            onTapHero={() => { void triggerAction('pet'); }}
            onOpenMirror={() => openWardrobe('mirror')}
            onOpenChest={() => openWardrobe('chest')}
          />
        </ScrollView>

        {/* Integrated Dialogue / Feedback Strip */}
        <View style={styles.dialogueStrip}>
          <Text style={styles.dialogueText} numberOfLines={2}>
            {gameFeedback || lastFeedback || moodInfo.hint}
          </Text>
        </View>

        {/* Integrated Console Control Deck */}
        <View style={styles.controlDeck}>
          {ACTIONS.map(({ action, label, sub, Icon }) => {
            const cooldownMins = getCooldownMinutes(action);
            const isPlayDice = action === 'play';
            const disabled = !isPlayDice && (actionLoading || cooldownMins > 0);
            return (
              <TouchableOpacity
                key={action}
                style={[styles.deckBtn, disabled && styles.deckBtnDisabled]}
                onPress={() => {
                  if (isPlayDice) {
                    openDiceModal();
                    return;
                  }
                  void triggerAction(action);
                }}
                disabled={disabled}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={
                  isPlayDice
                    ? `Sfida il Locandiere a dadi con ${activeCharacter.name}`
                    : `${label} ${activeCharacter.name}`
                }
              >
                <Icon
                  size={18}
                  color={disabled ? colors.parchmentMuted : colors.brassLight}
                />
                <Text style={styles.deckLabel}>{label}</Text>
                <Text style={styles.deckSub}>
                  {isPlayDice
                    ? 'Sfida'
                    : cooldownMins > 0
                      ? `${cooldownMins}m`
                      : sub}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Tavern Log Modal */}
      <Modal
        visible={logModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>DIARIO DI TAVERNA</Text>
              <TouchableOpacity
                onPress={() => setLogModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Chiudi diario"
              >
                <X size={18} color={colors.parchmentMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {state.recentLogs.length === 0 ? (
                <Text style={styles.emptyLogText}>
                  Nessuna attività recente. Offri un pasto o gioca una mano a dadi per iniziare!
                </Text>
              ) : (
                state.recentLogs.map((entry) => (
                  <View key={entry.id} style={styles.logRow}>
                    <Text style={styles.logText}>• {entry.text}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {activeGameModal?.kind === 'dice' && (
        <LocandiereDiceModal
          key={`dice-${activeCharacter.id}`}
          visible
          characterName={activeCharacter.name}
          hasTrophy={hasInnkeeperTrophy}
          onRequestClose={() => setActiveGameModal(null)}
          onComplete={(excellent) =>
            handleCompleteCareGame(activeCharacter.id, 'happiness', excellent)
          }
          onMatchConcluded={(summary) => handleDiceMatchConcluded(activeCharacter.id, summary)}
        />
      )}

      {activeGameModal?.kind === 'care' && (
        <CareGamesModal
          key={`care-${activeCharacter.id}-${activeGameModal.stat}`}
          visible
          stat={activeGameModal.stat}
          characterName={activeCharacter.name}
          onRequestClose={() => setActiveGameModal(null)}
          onComplete={(excellent: boolean) =>
            handleCompleteCareGame(activeCharacter.id, activeGameModal.stat, excellent)
          }
        />
      )}

      <TamagotchiWardrobeModal
        visible={wardrobeSource !== null}
        entrySource={wardrobeSource ?? 'mirror'}
        characterName={activeCharacter.name}
        characterClass={activeCharacter.character_class}
        raceSlug={activeCharacter.race_slug}
        imageUrl={lowpolyAvatarUrl ?? activeCharacter.lowpoly_avatar_url ?? activeCharacter.image_url}
        currentAppearance={state.appearance}
        saving={actionLoading}
        onRequestClose={() => setWardrobeSource(null)}
        onSave={handleSaveAppearance}
      />

      <CampaignSelectorModal
        visible={campaignModalOpen}
        onClose={() => setCampaignModalOpen(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#120E0B',
  },
  consoleShell: {
    flex: 1,
    backgroundColor: '#17120E',
  },
  centerBox: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.parchmentLight,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },
  primaryBtnText: {
    color: colors.void,
    fontWeight: '800',
    fontSize: 13,
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 155, 39, 0.16)',
    backgroundColor: '#120E0B',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  heroSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  topHudActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hudIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchBtn: {
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 32,
    justifyContent: 'center',
  },
  switchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  statsStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#130F0C',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(197, 155, 39, 0.14)',
  },
  statChip: {
    width: '48.8%',
    gap: 4,
    backgroundColor: '#1B1510',
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.24)',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statChipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  statChipLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  statChipRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statChipVal: {
    fontSize: 11,
    fontWeight: '800',
  },
  statPlayCue: {
    width: 15,
    height: 15,
    borderRadius: 4,
    backgroundColor: 'rgba(197, 155, 39, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statPlayCueReady: {
    backgroundColor: 'rgba(197, 155, 39, 0.3)',
    borderColor: colors.brassLight,
  },
  statCooldownPill: {
    paddingHorizontal: 4,
    height: 15,
    borderRadius: 4,
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCooldownText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  barTrack: {
    height: 6,
    backgroundColor: colors.stone,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  stageWrap: {
    flex: 1,
  },
  stageContents: {
    flexGrow: 1,
    minHeight: 264,
  },
  dialogueStrip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#130F0C',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 155, 39, 0.18)',
  },
  dialogueText: {
    fontSize: 12,
    color: colors.parchmentLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  controlDeck: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#120E0B',
    borderTopWidth: 1,
    borderTopColor: 'rgba(197, 155, 39, 0.2)',
  },
  deckBtn: {
    flex: 1,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 64,
  },
  deckBtnDisabled: {
    opacity: 0.5,
    borderColor: colors.stoneBorder,
  },
  deckLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  deckSub: {
    fontSize: 10,
    color: colors.parchmentMuted,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    maxHeight: '65%',
    padding: 16,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.brassBase,
    letterSpacing: 0.8,
  },
  modalBody: {
    maxHeight: 280,
  },
  emptyLogText: {
    fontSize: 12,
    color: colors.parchmentMuted,
    fontStyle: 'italic',
  },
  logRow: {
    paddingVertical: 4,
  },
  logText: {
    fontSize: 12.5,
    color: colors.parchmentLight,
    lineHeight: 18,
  },
});

export default CharacterTamagotchiScreen;
