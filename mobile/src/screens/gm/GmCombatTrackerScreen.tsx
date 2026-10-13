import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {
  Swords,
  Shield,
  Heart,
  FastForward,
  RotateCcw,
  Plus,
  Minus,
  Skull,
  Play,
  Users,
  UserPlus,
  Trash2,
  Sparkles,
  Dices,
  X,
  Check,
  ChevronDown,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { useAuth } from '../../contexts/AuthContext';
import { Combatant, CombatCondition } from '../../types';
import {
  createCombatStorageWritePlan,
  getCombatStorageKey,
  parseCombatSnapshot,
  parseCombatStorageManifest,
} from '../../lib/combat-storage';

// D&D 5e Conditions definitions with thematic colors
const DND_CONDITIONS: Array<{ key: CombatCondition; label: string; color: string; bg: string }> = [
  { key: 'Avvelenato', label: 'Avvelenato', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' },
  { key: 'Barcollante', label: 'Barcollante', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' },
  { key: 'Invisibile', label: 'Invisibile', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' },
  { key: 'Paralizzato', label: 'Paralizzato', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.15)' },
  { key: 'Privo di sensi', label: 'Privo di sensi', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.2)' },
  { key: 'Prono', label: 'Prono', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)' },
  { key: 'Stordito', label: 'Stordito', color: '#FACC15', bg: 'rgba(250, 204, 21, 0.15)' },
  { key: 'Trattenuto', label: 'Trattenuto', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.15)' },
];

export const GmCombatTrackerScreen: React.FC = () => {
  const { characters, updateCharacterHp, activeCampaign, isLoading } = useGmCampaigns();
  const { user } = useAuth();

  const [round, setRound] = useState<number>(1);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [activeConditionsCombatantId, setActiveConditionsCombatantId] = useState<string | null>(null);

  // New combatant form state
  const [newName, setNewName] = useState<string>('');
  const [newHp, setNewHp] = useState<string>('25');
  const [newAc, setNewAc] = useState<string>('14');
  const [newInitiative, setNewInitiative] = useState<string>('12');
  const [newIsEnemy, setNewIsEnemy] = useState<boolean>(true);

  // Combatants state initialized from real campaign characters
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [pendingCharacterHpIds, setPendingCharacterHpIds] = useState<Set<string>>(new Set());
  const pendingCharacterHpRef = useRef<Set<string>>(new Set());
  const [restoredStorageKey, setRestoredStorageKey] = useState<string | null>(null);
  const [storageKeyNeedingPartySeed, setStorageKeyNeedingPartySeed] = useState<string | null>(null);
  const [restoreFailedStorageKey, setRestoreFailedStorageKey] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const activeCampaignId = activeCampaign?.id ?? null;
  const activeStorageKey = getCombatStorageKey(user?.id, activeCampaignId);
  const activeStorageKeyRef = useRef<string | null>(activeStorageKey);
  activeStorageKeyRef.current = activeStorageKey;

  // Keep encounters separate by signed-in user and campaign on this device.
  useEffect(() => {
    setCombatants([]);
    setRound(1);
    setCurrentTurnIndex(0);
    setRestoredStorageKey(null);
    setStorageKeyNeedingPartySeed(null);
    setRestoreFailedStorageKey(null);
    setStorageError(null);

    if (!activeStorageKey) return;

    let cancelled = false;
    const storageKey = activeStorageKey;
    void (async () => {
      try {
        const manifestValue = await SecureStore.getItemAsync(storageKey);
        if (cancelled) return;
        if (manifestValue) {
          const manifest = parseCombatStorageManifest(manifestValue);
          const pieces = await Promise.all(
            Array.from({ length: manifest.chunks }, (_, index) =>
              SecureStore.getItemAsync(`${storageKey}_${manifest.revision}_${index}`)
            )
          );
          if (cancelled) return;
          if (pieces.some((piece) => piece === null)) {
            throw new Error('A combat state chunk is missing.');
          }
          const snapshot = parseCombatSnapshot(pieces.join(''));
          if (cancelled) return;
          setCombatants(snapshot.combatants);
          setRound(snapshot.round);
          setCurrentTurnIndex(snapshot.currentTurnIndex);
        } else {
          setStorageKeyNeedingPartySeed(storageKey);
        }
        setRestoredStorageKey(storageKey);
      } catch (error: unknown) {
        console.warn('[GmCombatTracker] Could not restore local combat state:', error);
        if (!cancelled) {
          setRestoreFailedStorageKey(storageKey);
          setStorageError('Non ho potuto recuperare lo scontro salvato su questo dispositivo.');
          setRestoredStorageKey(storageKey);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeStorageKey]);

  useEffect(() => {
    if (!activeStorageKey || restoredStorageKey !== activeStorageKey) return;
    if (
      restoreFailedStorageKey === activeStorageKey &&
      combatants.length === 0 &&
      round === 1 &&
      currentTurnIndex === 0
    ) return;
    const storageKey = activeStorageKey;
    let plan: ReturnType<typeof createCombatStorageWritePlan>;
    try {
      plan = createCombatStorageWritePlan(
        storageKey,
        { combatants, round, currentTurnIndex },
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
      );
    } catch (error: unknown) {
      console.warn('[GmCombatTracker] Could not prepare local combat state:', error);
      setStorageError('Questo scontro è troppo grande per il salvataggio locale.');
      return;
    }

    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const previousManifestValue = await SecureStore.getItemAsync(storageKey);
        await Promise.all(plan.chunks.map((chunk) => SecureStore.setItemAsync(chunk.key, chunk.value)));
        await SecureStore.setItemAsync(storageKey, JSON.stringify(plan.manifest));
        if (previousManifestValue) {
          try {
            const previousManifest = parseCombatStorageManifest(previousManifestValue);
            if (previousManifest.revision !== plan.manifest.revision) {
              try {
                await Promise.all(
                  Array.from({ length: previousManifest.chunks }, (_, index) =>
                    SecureStore.deleteItemAsync(`${storageKey}_${previousManifest.revision}_${index}`)
                  )
                );
              } catch (error: unknown) {
                // The new manifest already points to a complete committed revision.
                console.warn('[GmCombatTracker] Could not clean up old combat snapshot:', error);
              }
            }
          } catch {
            // The previous value was not a valid chunk manifest.
          }
        }
        if (activeStorageKeyRef.current === storageKey) {
          setStorageError(null);
          setRestoreFailedStorageKey((previous) => previous === storageKey ? null : previous);
        }
      })
      .catch((error: unknown) => {
        console.warn('[GmCombatTracker] Could not save local combat state:', error);
        if (activeStorageKeyRef.current === storageKey) {
          setStorageError('Non ho potuto salvare lo scontro su questo dispositivo.');
        }
      });
  }, [activeStorageKey, restoredStorageKey, restoreFailedStorageKey, combatants, round, currentTurnIndex]);

  // Automatically populate real characters when loaded
  useEffect(() => {
    if (
      !isLoading &&
      activeCampaignId &&
      activeStorageKey &&
      restoredStorageKey === activeStorageKey &&
      storageKeyNeedingPartySeed === activeStorageKey &&
      restoreFailedStorageKey !== activeStorageKey &&
      characters.length > 0 &&
      characters.every((character) => character.campaign_id === activeCampaignId) &&
      combatants.length === 0
    ) {
      const initialParty: Combatant[] = characters.map((c, index) => {
        const charDexMod = (c.rules_snapshot as any)?.abilities?.dex
          ? Math.floor(((c.rules_snapshot as any).abilities.dex - 10) / 2)
          : 0;
        const maxHp = (c.rules_snapshot as any)?.max_hp ?? c.hit_points ?? 20;
        const init = 12 + charDexMod - index;
        return {
          id: `c-party-${c.id}`,
          characterId: c.id,
          name: `${c.name}${c.character_class ? ` (${c.character_class})` : ''}`,
          initiative: init,
          hp: c.hit_points ?? maxHp,
          maxHp,
          ac: c.armor_class ?? 12,
          isEnemy: false,
          conditions: [],
        };
      });
      setCombatants(initialParty);
      setStorageKeyNeedingPartySeed(null);
    }
  }, [activeCampaignId, activeStorageKey, characters, combatants.length, isLoading, restoredStorageKey, storageKeyNeedingPartySeed, restoreFailedStorageKey]);

  // Sorted combatants by initiative descending
  const sortedCombatants = useMemo(() => {
    return [...combatants].sort((a, b) => b.initiative - a.initiative);
  }, [combatants]);

  // Advance turn forward
  const advanceTurn = () => {
    if (sortedCombatants.length === 0) return;
    if (currentTurnIndex + 1 >= sortedCombatants.length) {
      setCurrentTurnIndex(0);
      setRound((r) => r + 1);
    } else {
      setCurrentTurnIndex((idx) => idx + 1);
    }
  };

  // Move turn backward
  const previousTurn = () => {
    if (sortedCombatants.length === 0) return;
    if (currentTurnIndex - 1 < 0) {
      setCurrentTurnIndex(sortedCombatants.length - 1);
      setRound((r) => Math.max(1, r - 1));
    } else {
      setCurrentTurnIndex((idx) => idx - 1);
    }
  };

  // Reset combat tracker
  const resetCombat = () => {
    Alert.alert(
      'Azzera Combattimento',
      'Vuoi reimpostare il contatore al Round 1 e ripartire dall’inizio dell’iniziativa?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Azzera Turni',
          style: 'destructive',
          onPress: () => {
            setRound(1);
            setCurrentTurnIndex(0);
          },
        },
      ]
    );
  };

  // Adjust HP of combatant (+1, +5, -1, -5, K.O.)
  const adjustHp = async (id: string, delta: number | 'ko') => {
    const combatant = combatants.find((entry) => entry.id === id);
    if (!combatant || pendingCharacterHpRef.current.has(id)) return;

    const nextHp = delta === 'ko'
      ? 0
      : Math.max(0, Math.min(combatant.maxHp, combatant.hp + delta));
    if (combatant.characterId) {
      const nextPending = new Set(pendingCharacterHpRef.current);
      nextPending.add(id);
      pendingCharacterHpRef.current = nextPending;
      setPendingCharacterHpIds(nextPending);
      try {
        const saved = await updateCharacterHp(combatant.characterId, nextHp);
        if (!saved) {
          Alert.alert(
            'Salvataggio non riuscito',
            'I PF non sono stati aggiornati. Aggiorna la campagna e riprova.'
          );
          return;
        }
      } finally {
        const remaining = new Set(pendingCharacterHpRef.current);
        remaining.delete(id);
        pendingCharacterHpRef.current = remaining;
        setPendingCharacterHpIds(remaining);
      }
    }

    setCombatants((previous) => previous.map((entry) => {
      if (entry.id !== id) return entry;
      let nextConditions = [...entry.conditions];
      if (nextHp === 0 && !nextConditions.includes('Privo di sensi')) {
        nextConditions.push('Privo di sensi');
      } else if (nextHp > 0 && nextConditions.includes('Privo di sensi')) {
        nextConditions = nextConditions.filter((condition) => condition !== 'Privo di sensi');
      }
      return { ...entry, hp: nextHp, conditions: nextConditions };
    }));
  };

  // Toggle condition on a combatant
  const toggleCondition = (combatantId: string, condition: CombatCondition) => {
    setCombatants((prev) =>
      prev.map((c) => {
        if (c.id !== combatantId) return c;
        const exists = c.conditions.includes(condition);
        const nextConditions = exists
          ? c.conditions.filter((item) => item !== condition)
          : [...c.conditions, condition];
        return { ...c, conditions: nextConditions };
      })
    );
  };

  // Remove a combatant from the tracker
  const removeCombatant = (id: string) => {
    setCombatants((prev) => prev.filter((c) => c.id !== id));
    if (currentTurnIndex >= sortedCombatants.length - 1) {
      setCurrentTurnIndex(0);
    }
  };

  // Import characters from active campaign with 1 click
  const handleImportCampaignParty = () => {
    if (characters.length === 0) {
      Alert.alert('Nessun Personaggio', 'Nessun personaggio trovato nella campagna attiva.');
      return;
    }

    const existingCharIds = new Set(combatants.map((c) => c.characterId).filter(Boolean));
    const charsToAdd = characters.filter((c) => !existingCharIds.has(c.id));

    if (charsToAdd.length === 0) {
      Alert.alert('Già Presenti', 'Tutti i PG della campagna sono già nell’ordine di iniziativa.');
      return;
    }

    const importedCombatants: Combatant[] = charsToAdd.map((c) => {
      // Roll initiative: d20 + (dex modifier or 10)
      const rolledInit = Math.floor(Math.random() * 20) + 1 + 2;
      const maxHp = (c.rules_snapshot as any)?.max_hp ?? c.hit_points ?? 30;
      return {
        id: `c-party-${c.id}`,
        characterId: c.id,
        name: c.name,
        initiative: rolledInit,
        hp: c.hit_points ?? maxHp,
        maxHp,
        ac: c.armor_class ?? 14,
        isEnemy: false,
        conditions: [],
      };
    });

    setCombatants((prev) => [...prev, ...importedCombatants]);
    Alert.alert(
      'Party Importato',
      `Aggiunti ${importedCombatants.length} eroi con iniziativa tirata automaticamente!`
    );
  };

  // Roll d20 for modal initiative
  const rollModalInit = () => {
    const roll = Math.floor(Math.random() * 20) + 1 + 2;
    setNewInitiative(roll.toString());
  };

  // Add custom monster / NPC
  const handleAddCombatant = () => {
    if (!newName.trim()) {
      Alert.alert('Nome Obbligatorio', 'Inserisci il nome del mostro o combattente.');
      return;
    }

    const hpNum = Math.max(1, parseInt(newHp, 10) || 20);
    const acNum = Math.max(5, parseInt(newAc, 10) || 12);
    const initNum = parseInt(newInitiative, 10) || 10;

    const newEntry: Combatant = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      initiative: initNum,
      hp: hpNum,
      maxHp: hpNum,
      ac: acNum,
      isEnemy: newIsEnemy,
      conditions: [],
    };

    setCombatants((prev) => [...prev, newEntry]);
    setNewName('');
    setNewHp('25');
    setNewAc('14');
    setNewInitiative('12');
    setAddModalVisible(false);
  };

  // Quick preset templates for monsters
  const applyMonsterPreset = (name: string, hp: number, ac: number, init: number) => {
    setNewName(name);
    setNewHp(hp.toString());
    setNewAc(ac.toString());
    setNewInitiative(init.toString());
    setNewIsEnemy(true);
  };

  const activeCombatant = sortedCombatants[currentTurnIndex];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {storageError && (
          <View style={styles.storageWarning} accessibilityRole="alert">
            <Text style={styles.storageWarningText}>{storageError}</Text>
          </View>
        )}
        {/* Round & Turn Commander Bar */}
        <View style={styles.roundCard}>
          <View style={styles.roundLeft}>
            <Swords size={22} color={colors.brassLight} />
            <View>
              <Text style={styles.roundLabel}>BATTAGLIA ATTIVA</Text>
              <Text style={styles.roundCount}>Round {round}</Text>
            </View>
          </View>

          <View style={styles.turnNavGroup}>
            <TouchableOpacity
              style={styles.prevTurnBtn}
              onPress={previousTurn}
              activeOpacity={0.8}
            >
              <Text style={styles.prevTurnText}>◄ Prec</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextTurnBtn}
              onPress={advanceTurn}
              activeOpacity={0.8}
            >
              <FastForward size={14} color={colors.void} />
              <Text style={styles.nextTurnText}>Prossimo Turno ►</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={resetCombat}
              activeOpacity={0.7}
            >
              <RotateCcw size={14} color={colors.parchmentMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Bar: Import Party & Add NPC */}
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionBtnHero}
            onPress={handleImportCampaignParty}
            activeOpacity={0.8}
          >
            <Users size={15} color={colors.brassLight} />
            <Text style={styles.actionBtnHeroText}>
              Importa PG Campagna ({characters.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnMonster}
            onPress={() => setAddModalVisible(true)}
            activeOpacity={0.8}
          >
            <Plus size={15} color={colors.void} />
            <Text style={styles.actionBtnMonsterText}>+ Mostro / NPC</Text>
          </TouchableOpacity>
        </View>

        {/* Active Combatant Spotlight */}
        {activeCombatant && (
          <View style={styles.spotlightCard}>
            <View style={styles.spotlightTop}>
              <View style={styles.spotlightBadge}>
                <Play size={10} color={colors.void} />
                <Text style={styles.spotlightBadgeText}>È IL TURNO DI:</Text>
              </View>
              <Text style={styles.spotlightInit}>Iniziativa: {activeCombatant.initiative}</Text>
            </View>
            <Text
              style={[
                styles.spotlightName,
                activeCombatant.isEnemy ? styles.enemyName : styles.heroName,
              ]}
              numberOfLines={1}
            >
              {activeCombatant.name}
            </Text>
            <View style={styles.spotlightStatsRow}>
              <View style={styles.spotlightStat}>
                <Shield size={13} color={colors.parchmentMuted} />
                <Text style={styles.spotlightStatText}>CA {activeCombatant.ac}</Text>
              </View>
              <View style={styles.spotlightStat}>
                <Heart size={13} color={colors.crimsonLight} />
                <Text style={styles.spotlightStatText}>
                  {activeCombatant.hp} / {activeCombatant.maxHp} HP
                </Text>
              </View>
              {activeCombatant.conditions.length > 0 && (
                <View style={styles.spotlightConditions}>
                  {activeCombatant.conditions.map((c) => (
                    <Text key={c} style={styles.spotlightCondText}>
                      • {c}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Combatants Queue Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ORDINE DI INIZIATIVA ({sortedCombatants.length})</Text>
          <Text style={styles.combatantsCount}>
            {sortedCombatants.filter((c) => c.hp > 0).length} Combattenti in Piedi
          </Text>
        </View>

        {/* Combatants List */}
        {sortedCombatants.length === 0 ? (
          <View style={styles.emptyCard}>
            <Swords size={36} color={colors.parchmentMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Nessun Combattente nell'Iniziativa</Text>
            <Text style={styles.emptySubtitle}>
              Tocca "Importa PG Campagna" per caricare gli eroi di questa campagna o usa "+ Mostro / NPC" per iniziare lo scontro.
            </Text>
          </View>
        ) : (
          sortedCombatants.map((c, index) => {
          const isActive = index === currentTurnIndex;
          const isDead = c.hp <= 0;
          const showConditionsTray = activeConditionsCombatantId === c.id;

          return (
            <View
              key={c.id}
              style={[
                styles.combatantCard,
                isActive && styles.combatantCardActive,
                isDead && styles.combatantCardDead,
              ]}
            >
              {isActive && <View style={styles.activeTurnIndicator} />}

              {/* Initiative Badge */}
              <View style={[styles.initBadge, isActive && styles.initBadgeActive]}>
                <Text style={[styles.initNumber, isActive && styles.initNumberActive]}>
                  {c.initiative}
                </Text>
                <Text style={styles.initLabel}>INIZ</Text>
              </View>

              {/* Main Combatant Details */}
              <View style={styles.combatantMain}>
                <View style={styles.nameRow}>
                  <Text
                    style={[
                      styles.combatantName,
                      c.isEnemy ? styles.enemyName : styles.heroName,
                      isDead && styles.deadText,
                    ]}
                    numberOfLines={1}
                  >
                    {c.name}
                  </Text>

                  {isDead && (
                    <View style={styles.deadBadge}>
                      <Skull size={10} color={colors.crimsonLight} />
                      <Text style={styles.deadBadgeText}>K.O. / A TERRA</Text>
                    </View>
                  )}

                  {isActive && !isDead && (
                    <View style={styles.turnBadge}>
                      <Play size={9} color={colors.void} />
                      <Text style={styles.turnBadgeText}>ATTIVO</Text>
                    </View>
                  )}
                </View>

                {/* Stats & Condition Chips Row */}
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Shield size={11} color={colors.parchmentMuted} />
                    <Text style={styles.statChipText}>CA {c.ac}</Text>
                  </View>

                  <View style={styles.statChip}>
                    <Heart
                      size={11}
                      color={c.hp < c.maxHp * 0.3 ? colors.crimsonLight : colors.emerald}
                    />
                    <Text
                      style={[
                        styles.statChipText,
                        c.hp < c.maxHp * 0.3 && { color: colors.crimsonLight, fontWeight: '800' },
                      ]}
                    >
                      {c.hp} / {c.maxHp} HP
                    </Text>
                  </View>

                  {/* Conditions Pills Preview */}
                  {c.conditions.map((cond) => {
                    const meta = DND_CONDITIONS.find((d) => d.key === cond);
                    return (
                      <View
                        key={cond}
                        style={[
                          styles.activeCondBadge,
                          { backgroundColor: meta?.bg || 'rgba(255,255,255,0.1)' },
                        ]}
                      >
                        <Text style={[styles.activeCondText, { color: meta?.color || '#fff' }]}>
                          {cond}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Controls Column: Quick HP & Conditions */}
              <View style={styles.cardRightControls}>
                {/* HP Adjust Buttons (+1, +5, -1, -5, K.O.) */}
                <View style={styles.hpButtonGrid}>
                  <TouchableOpacity
                    style={styles.hpBtn}
                    disabled={pendingCharacterHpIds.has(c.id)}
                    onPress={() => adjustHp(c.id, -5)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.hpBtnText, { color: colors.crimsonLight }]}>-5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.hpBtn}
                    disabled={pendingCharacterHpIds.has(c.id)}
                    onPress={() => adjustHp(c.id, -1)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.hpBtnText, { color: colors.crimsonLight }]}>-1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.hpBtn}
                    disabled={pendingCharacterHpIds.has(c.id)}
                    onPress={() => adjustHp(c.id, +1)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.hpBtnText, { color: colors.emerald }]}>+1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.hpBtn}
                    disabled={pendingCharacterHpIds.has(c.id)}
                    onPress={() => adjustHp(c.id, +5)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.hpBtnText, { color: colors.emerald }]}>+5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.hpBtn, styles.koBtn]}
                    disabled={pendingCharacterHpIds.has(c.id)}
                    onPress={() => adjustHp(c.id, 'ko')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.koBtnText}>K.O.</Text>
                  </TouchableOpacity>
                </View>

                {/* Conditions Tray Toggle & Trash */}
                <View style={styles.rowBelowHp}>
                  <TouchableOpacity
                    style={[
                      styles.toggleCondBtn,
                      showConditionsTray && styles.toggleCondBtnActive,
                    ]}
                    onPress={() =>
                      setActiveConditionsCombatantId(
                        showConditionsTray ? null : c.id
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <Sparkles size={11} color={colors.brassLight} />
                    <Text style={styles.toggleCondBtnText}>
                      Condizioni ({c.conditions.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => removeCombatant(c.id)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={13} color={colors.parchmentMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Conditions Tray (Expandable when tapped) */}
              {showConditionsTray && (
                <View style={styles.conditionsTray}>
                  <Text style={styles.conditionsTrayTitle}>
                    STATI & CONDIZIONI D&D 5E PER {c.name.toUpperCase()}:
                  </Text>
                  <View style={styles.conditionsGrid}>
                    {DND_CONDITIONS.map((cond) => {
                      const isSelected = c.conditions.includes(cond.key);
                      return (
                        <TouchableOpacity
                          key={cond.key}
                          style={[
                            styles.conditionPill,
                            { borderColor: cond.color },
                            isSelected && { backgroundColor: cond.bg },
                          ]}
                          onPress={() => toggleCondition(c.id, cond.key)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.condCheckDot,
                              isSelected && { backgroundColor: cond.color },
                            ]}
                          />
                          <Text
                            style={[
                              styles.conditionPillText,
                              { color: isSelected ? cond.color : colors.parchmentMuted },
                            ]}
                          >
                            {cond.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        }))}
      </ScrollView>

      {/* Add Custom Combatant Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAddModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Swords size={18} color={colors.brassLight} />
                <Text style={styles.modalTitle}>AGGIUNGI COMBATTENTE</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={18} color={colors.parchmentMuted} />
              </TouchableOpacity>
            </View>

            {/* Quick Templates */}
            <Text style={styles.templateLabel}>Template Rapidi:</Text>
            <View style={styles.templateRow}>
              <TouchableOpacity
                style={styles.templateChip}
                onPress={() => applyMonsterPreset('Goblin Arciere', 7, 13, 14)}
              >
                <Text style={styles.templateChipText}>Goblin (7 HP)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.templateChip}
                onPress={() => applyMonsterPreset('Orco Guerriero', 15, 13, 11)}
              >
                <Text style={styles.templateChipText}>Orco (15 HP)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.templateChip}
                onPress={() => applyMonsterPreset('Scheletro Guerriero', 13, 13, 12)}
              >
                <Text style={styles.templateChipText}>Scheletro (13 HP)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.templateChip}
                onPress={() => applyMonsterPreset('Cultista dell’Ombra', 32, 14, 15)}
              >
                <Text style={styles.templateChipText}>Cultista (32 HP)</Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nome Combattente:</Text>
              <TextInput
                style={styles.formInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Es. Boss Manticora o Guardia"
                placeholderTextColor={colors.parchmentMuted}
              />
            </View>

            <View style={styles.formThreeRow}>
              <View style={styles.formCol}>
                <Text style={styles.formLabel}>HP Max:</Text>
                <TextInput
                  style={styles.formInputSmall}
                  value={newHp}
                  onChangeText={setNewHp}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formCol}>
                <Text style={styles.formLabel}>Classe Arm. (CA):</Text>
                <TextInput
                  style={styles.formInputSmall}
                  value={newAc}
                  onChangeText={setNewAc}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formCol}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.formLabel}>Iniziativa:</Text>
                  <TouchableOpacity onPress={rollModalInit}>
                    <Text style={{ fontSize: 10, color: colors.brassLight }}>🎲 Roll</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.formInputSmall}
                  value={newInitiative}
                  onChangeText={setNewInitiative}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Enemy or Ally Toggle */}
            <View style={styles.enemyToggleRow}>
              <Text style={styles.formLabel}>Fazione:</Text>
              <View style={styles.factionOptions}>
                <TouchableOpacity
                  style={[styles.factionChip, newIsEnemy && styles.factionChipEnemy]}
                  onPress={() => setNewIsEnemy(true)}
                >
                  <Text style={[styles.factionChipText, newIsEnemy && styles.factionTextActive]}>
                    Nemico / Mostro
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.factionChip, !newIsEnemy && styles.factionChipAlly]}
                  onPress={() => setNewIsEnemy(false)}
                >
                  <Text style={[styles.factionChipText, !newIsEnemy && styles.factionTextActive]}>
                    Alleato / PG
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.addSubmitBtn}
              onPress={handleAddCombatant}
              activeOpacity={0.85}
            >
              <Plus size={16} color={colors.void} />
              <Text style={styles.addSubmitBtnText}>INSERISCI NELL’INIZIATIVA</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  storageWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  storageWarningText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
  },
  roundCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 14,
    marginBottom: 14,
  },
  roundLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.8,
  },
  roundCount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brassLight,
  },
  turnNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  prevTurnBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 6,
  },
  prevTurnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  nextTurnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  nextTurnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.void,
  },
  resetBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 8,
    borderRadius: 6,
  },
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  actionBtnHero: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnHeroText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  actionBtnMonster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionBtnMonsterText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  spotlightCard: {
    backgroundColor: '#1E2530',
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  spotlightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  spotlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  spotlightBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.5,
  },
  spotlightInit: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  spotlightName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  spotlightStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  spotlightStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotlightStatText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  spotlightConditions: {
    flexDirection: 'row',
    gap: 6,
  },
  spotlightCondText: {
    fontSize: 10,
    color: colors.brassLight,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.parchmentMuted,
  },
  combatantsCount: {
    fontSize: 10,
    color: colors.brassLight,
    fontWeight: '700',
  },
  combatantCard: {
    position: 'relative',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 10,
    marginBottom: 10,
  },
  combatantCardActive: {
    borderColor: colors.brassBase,
    backgroundColor: '#1E2430',
  },
  combatantCardDead: {
    opacity: 0.5,
  },
  activeTurnIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.brassBase,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  initBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: colors.stone,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 7,
    paddingVertical: 5,
    alignItems: 'center',
    minWidth: 38,
  },
  initBadgeActive: {
    borderColor: colors.brassBase,
    backgroundColor: colors.brassDark,
  },
  initNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  initNumberActive: {
    color: colors.brassLight,
  },
  initLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  combatantMain: {
    marginLeft: 46,
    marginRight: 110,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  combatantName: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '90%',
  },
  heroName: {
    color: colors.parchmentLight,
  },
  enemyName: {
    color: '#F87171',
  },
  deadText: {
    textDecorationLine: 'line-through',
  },
  deadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.crimson,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  deadBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  turnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  turnBadgeText: {
    fontSize: 7,
    fontWeight: '800',
    color: colors.void,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statChipText: {
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  activeCondBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activeCondText: {
    fontSize: 8,
    fontWeight: '700',
  },
  cardRightControls: {
    position: 'absolute',
    right: 10,
    top: 8,
    bottom: 8,
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 110,
  },
  hpButtonGrid: {
    flexDirection: 'row',
    gap: 3,
    marginBottom: 6,
  },
  hpBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 4,
    minWidth: 22,
    alignItems: 'center',
  },
  hpBtnText: {
    fontSize: 9,
    fontWeight: '800',
  },
  koBtn: {
    borderColor: colors.crimson,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  koBtnText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  rowBelowHp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleCondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  toggleCondBtnActive: {
    backgroundColor: colors.brassDark,
  },
  toggleCondBtnText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.brassLight,
  },
  deleteBtn: {
    padding: 3,
  },
  conditionsTray: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  conditionsTrayTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  conditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conditionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.stone,
  },
  condCheckDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.stoneBorder,
  },
  conditionPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  templateLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentMuted,
    marginBottom: 6,
  },
  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  templateChip: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  templateChipText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.parchmentLight,
  },
  formGroup: {
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.parchmentLight,
  },
  formThreeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  formCol: {
    flex: 1,
  },
  formInputSmall: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.brassLight,
    textAlign: 'center',
  },
  enemyToggleRow: {
    marginBottom: 16,
  },
  factionOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  factionChip: {
    flex: 1,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  factionChipEnemy: {
    borderColor: colors.crimson,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  factionChipAlly: {
    borderColor: colors.brassLight,
    backgroundColor: 'rgba(243, 210, 122, 0.15)',
  },
  factionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  factionTextActive: {
    color: colors.parchmentLight,
  },
  addSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addSubmitBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.8,
  },
  emptyCard: {
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default GmCombatTrackerScreen;
