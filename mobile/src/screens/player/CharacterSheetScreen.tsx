import React, { useState, useMemo, useEffect } from 'react';
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
  Image,
} from 'react-native';
import {
  Shield,
  Heart,
  Zap,
  Footprints,
  Coins,
  Sparkles,
  Swords,
  Dices,
  RotateCcw,
  Plus,
  Minus,
  Skull,
  X,
  Check,
  ChevronDown,
  ChevronRight,
  Flame,
  BookOpen,
  Backpack,
  Eye,
  Award,
  Target,
  Wand2,
  Compass,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign } from '../../contexts/CampaignContext';
import { usePlayerCharacter } from '../../hooks/usePlayerCharacter';
import { CharacterSheetV1 } from '../../lib/character-sheet';
import { parseWeaponDamage } from '../../lib/weapon-damage';
import { DiceRollerModal } from '../../components/player/DiceRollerModal';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import {
  AbilityKey,
  AbilityScoreEntry,
  DieType,
  SkillEntry,
  SavingThrowEntry,
  WeaponAttackEntry,
  ClassFeatureEntry,
  SpellEntry,
  InventoryItemEntry,
  PlayerCharacter,
} from '../../types';

type SheetTab = 'combat' | 'stats' | 'spells' | 'features' | 'inventory';

export const CharacterSheetScreen: React.FC = () => {
  const { profile, user } = useAuth();
  const { activeCampaign, assignedCharactersMap, selectCampaign } = useCampaign();

  const otherCharacters = useMemo(() => {
    const list: { char: PlayerCharacter; campaignId: string; campaignName: string }[] = [];
    for (const [campId, chars] of Object.entries(assignedCharactersMap)) {
      if (campId !== activeCampaign?.id) {
        for (const ch of chars) {
          list.push({
            char: ch,
            campaignId: campId,
            campaignName: ch.campaigns?.name || 'Altra Campagna',
          });
        }
      }
    }
    return list;
  }, [assignedCharactersMap, activeCampaign?.id]);
  const {
    characters,
    activeCharacter,
    safeCharacter,
    hasAssignedCharacter,
    selectCharacter,
    abilityScores,
    proficiencyBonus,
    passivePerception,
    savingThrows,
    skills,
    updateHp,
    useFeature,
    shortRest,
    updateSpellSlot,
    updateCoins,
    updateDeathSaves,
    longRest,
    shortRestWithHitDie,
    refresh,
    saveError,
    isSaving,
  } = usePlayerCharacter();

  useEffect(() => {
    if (!saveError) return;
    const conflicted = saveError.includes('cambiata su un altro dispositivo');
    Alert.alert('Salvataggio non riuscito', saveError, conflicted
      ? [{ text: 'Dopo', style: 'cancel' }, { text: 'Aggiorna scheda', onPress: () => { void refresh(); } }]
      : [{ text: 'OK' }]);
  }, [saveError, refresh]);

  const [activeTab, setActiveTab] = useState<SheetTab>('combat');

  // Modal states
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState<boolean>(false);
  const [isDiceModalOpen, setIsDiceModalOpen] = useState<boolean>(false);
  const [diceInitialDie, setDiceInitialDie] = useState<DieType>('d20');
  const [diceInitialCount, setDiceInitialCount] = useState<number>(1);
  const [diceInitialMod, setDiceInitialMod] = useState<number>(0);
  const [diceInitialLabel, setDiceInitialLabel] = useState<string | undefined>(undefined);

  // Character Selector Modal state
  const [isCharSelectorOpen, setIsCharSelectorOpen] = useState<boolean>(false);

  // Custom HP Adjust Modal state
  const [isCustomHpModalOpen, setIsCustomHpModalOpen] = useState<boolean>(false);
  const [customHpInput, setCustomHpInput] = useState<string>('5');
  const [customHpAction, setCustomHpAction] = useState<'heal' | 'damage'>('heal');

  // Temp HP Modal state
  const [isTempHpModalOpen, setIsTempHpModalOpen] = useState<boolean>(false);
  const [tempHpInput, setTempHpInput] = useState<string>('5');

  // Coins Modal state
  const [isCoinsModalOpen, setIsCoinsModalOpen] = useState<boolean>(false);
  const [coinsGpInput, setCoinsGpInput] = useState<string>('');
  const [coinsSpInput, setCoinsSpInput] = useState<string>('');
  const [coinsCpInput, setCoinsCpInput] = useState<string>('');

  // Character stats
  const currentHp = safeCharacter.hit_points ?? 0;
  const maxHp = safeCharacter.rules_snapshot?.max_hp;
  const tempHp = safeCharacter.rules_snapshot?.temp_hp ?? 0;
  const deathSaves = safeCharacter.rules_snapshot?.death_saves ?? {
    successes: 0,
    failures: 0,
  };
  const hitDice = safeCharacter.rules_snapshot?.hit_dice;
  const spellSlots = safeCharacter.rules_snapshot?.spellSlots ?? [];
  const usedSpellSlots = safeCharacter.rules_snapshot?.usedSpellSlots as Record<number, number> | undefined;
  const weapons: WeaponAttackEntry[] = safeCharacter.rules_snapshot?.weapons ?? [];
  const features: ClassFeatureEntry[] = safeCharacter.rules_snapshot?.features ?? [];
  const spells: SpellEntry[] = safeCharacter.rules_snapshot?.spells ?? [];
  const proficiencies = (safeCharacter.rules_snapshot?.proficiencies ?? {}) as {
    armor?: string[]; weapons?: string[]; tools?: string[]; languages?: string[];
  };
  const inventory: InventoryItemEntry[] = safeCharacter.rules_snapshot?.inventory ?? [];
  const personality = safeCharacter.rules_snapshot?.personality as {
    traits?: string; ideals?: string; bonds?: string; flaws?: string;
  } | undefined;
  const sheet = safeCharacter.rules_snapshot?.character_sheet as CharacterSheetV1 | undefined;
  const legacySpellcasting = safeCharacter.rules_snapshot?.spellcasting as {
    ability?: AbilityKey; saveDc?: number; attackBonus?: number;
  } | undefined;
  const spellAbility = sheet?.spellcastingAbility ?? legacySpellcasting?.ability;
  const spellAbilityLabel: Record<AbilityKey, string> = { str: 'FOR', dex: 'DES', con: 'COS', int: 'INT', wis: 'SAG', cha: 'CAR' };
  const spellSaveDc = sheet?.spellSaveDc ?? legacySpellcasting?.saveDc;
  const spellAttackBonus = sheet?.spellAttackBonus ?? legacySpellcasting?.attackBonus;

  const hpPercent = maxHp ? Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100))) : 0;

  // Dynamic HP Bar color
  const hpBarColor = useMemo(() => {
    if (hpPercent > 50) return colors.emerald;
    if (hpPercent > 20) return colors.brassBase;
    return colors.crimsonLight;
  }, [hpPercent]);

  // Dice roll triggers
  const rollAbility = (ab: AbilityScoreEntry) => {
    if (ab.modifier === undefined) return;
    setDiceInitialDie('d20');
    setDiceInitialCount(1);
    setDiceInitialMod(ab.modifier);
    setDiceInitialLabel(`Prova di ${ab.name} (${ab.label} ${ab.modifier >= 0 ? '+' : ''}${ab.modifier})`);
    setIsDiceModalOpen(true);
  };

  const rollSavingThrow = (st: SavingThrowEntry) => {
    if (st.bonus === undefined) return;
    setDiceInitialDie('d20');
    setDiceInitialCount(1);
    setDiceInitialMod(st.bonus);
    setDiceInitialLabel(`Tiro Salvezza su ${st.name} (${st.label} ${st.bonus >= 0 ? '+' : ''}${st.bonus})`);
    setIsDiceModalOpen(true);
  };

  const rollSkill = (sk: SkillEntry) => {
    if (sk.bonus === undefined) return;
    setDiceInitialDie('d20');
    setDiceInitialCount(1);
    setDiceInitialMod(sk.bonus);
    setDiceInitialLabel(`Prova di ${sk.name} [${sk.abilityLabel}] (${sk.bonus >= 0 ? '+' : ''}${sk.bonus})`);
    setIsDiceModalOpen(true);
  };

  const rollInitiative = () => {
    const initMod = safeCharacter.rules_snapshot?.initiative;
    if (typeof initMod !== 'number') return;
    setDiceInitialDie('d20');
    setDiceInitialCount(1);
    setDiceInitialMod(initMod);
    setDiceInitialLabel(`Tiro Iniziativa (${initMod >= 0 ? '+' : ''}${initMod})`);
    setIsDiceModalOpen(true);
  };

  const rollWeaponAttack = (wp: WeaponAttackEntry) => {
    if (wp.attackBonus === undefined) {
      Alert.alert('Tiro per colpire non disponibile', 'Il bonus per colpire non è compilato nella scheda.');
      return;
    }
    setDiceInitialDie('d20');
    setDiceInitialCount(1);
    setDiceInitialMod(wp.attackBonus);
    setDiceInitialLabel(`Attacco: ${wp.name} (${wp.attackBonus >= 0 ? '+' : ''}${wp.attackBonus})`);
    setIsDiceModalOpen(true);
  };

  const rollWeaponDamage = (wp: WeaponAttackEntry) => {
    const abilityMods = Object.fromEntries(abilityScores.flatMap((ability) => ability.modifier === undefined ? [] : [[ability.key, ability.modifier]])) as Partial<Record<AbilityKey, number>>;
    const roll = parseWeaponDamage(wp.damage, safeCharacter.rules_snapshot?.abilities, abilityMods);
    if (!roll) {
      Alert.alert('Danno non calcolabile', `La formula “${wp.damage}” non è completa oppure richiede un modificatore non presente nella scheda.`);
      return;
    }
    setDiceInitialDie(roll.die);
    setDiceInitialCount(roll.diceCount);
    setDiceInitialMod(roll.modifier);
    setDiceInitialLabel(`Danni: ${wp.name} (${wp.damage} ${wp.damageType})`);
    setIsDiceModalOpen(true);
  };

  const rollDeathSave = () => {
    const roll = Math.floor(Math.random() * 20) + 1;
    if (roll === 20) {
      updateHp(1);
      Alert.alert('NAT 20! COLPO DI CODA EROICO!', 'Ti risvegli miracolosamente a 1 Punto Ferita!');
    } else if (roll === 1) {
      const nextFailures = Math.min(3, deathSaves.failures + 2);
      updateDeathSaves(deathSaves.successes, nextFailures);
      Alert.alert('NAT 1! FALLIMENTO CRITICO!', `Subisci 2 fallimenti ai TS Morte! (${deathSaves.successes}/3 succ, ${nextFailures}/3 fall)`);
    } else if (roll >= 10) {
      const nextSucc = Math.min(3, deathSaves.successes + 1);
      updateDeathSaves(nextSucc, deathSaves.failures);
      Alert.alert(`Successo! (${roll})`, `Tiro Salvezza contro la morte superato! (${nextSucc}/3 successi)`);
    } else {
      const nextFail = Math.min(3, deathSaves.failures + 1);
      updateDeathSaves(deathSaves.successes, nextFail);
      Alert.alert(`Fallimento! (${roll})`, `Tiro Salvezza contro la morte fallito! (${nextFail}/3 fallimenti)`);
    }
  };

  const handleSpendHitDie = async () => {
    if (hitDice && hitDice.current <= 0) {
      Alert.alert('Dadi Vita Esauriti', 'Non hai più Dadi Vita disponibili per questo riposo.');
      return;
    }
    if (!hitDice || maxHp === undefined || safeCharacter.hit_points === null) {
      Alert.alert('Dadi Vita non disponibili', 'Il numero di Dadi Vita o i PF massimi non sono compilati nella scheda.');
      return;
    }
    const dieFaces = Number.parseInt(hitDice.die.match(/d(\d+)/i)?.[1] ?? '', 10);
    if (!Number.isFinite(dieFaces) || dieFaces < 2) {
      Alert.alert('Dado Vita non valido', `Controlla il dado registrato nella scheda (${hitDice.die}).`);
      return;
    }
    const conMod = abilityScores.find((a) => a.key === 'con')?.modifier;
    if (conMod === undefined) {
      Alert.alert('Modificatore mancante', 'Il modificatore di Costituzione non è compilato: non posso calcolare la cura del Dado Vita.');
      return;
    }
    const roll = Math.floor(Math.random() * dieFaces) + 1;
    const healAmount = Math.max(1, roll + conMod);

    const saved = await shortRestWithHitDie(Math.min(maxHp, currentHp + healAmount));
    if (!saved) return;
    Alert.alert(
      'Riposo Breve: Dado Vita Speso',
      `Hai tirato 1${hitDice.die} (${roll}) + Mod. Costituzione (${conMod >= 0 ? '+' : ''}${conMod}) = +${healAmount} PF recuperati!`
    );
  };

  // Quick HP delta
  const handleQuickHp = (delta: number) => {
    if (maxHp === undefined) return;
    if (delta < 0 && tempHp > 0) {
      const damage = Math.abs(delta);
      if (tempHp >= damage) {
        updateHp(currentHp, tempHp - damage);
        return;
      } else {
        const remainingDamage = damage - tempHp;
        updateHp(Math.max(0, currentHp - remainingDamage), 0);
        return;
      }
    }
    updateHp(Math.max(0, Math.min(maxHp, currentHp + delta)));
  };

  const handleCustomHpSubmit = () => {
    const val = parseInt(customHpInput, 10);
    if (isNaN(val) || val <= 0) {
      setIsCustomHpModalOpen(false);
      return;
    }
    if (maxHp === undefined) {
      setIsCustomHpModalOpen(false);
      return;
    }
    if (customHpAction === 'heal') {
      updateHp(Math.min(maxHp, currentHp + val));
    } else {
      handleQuickHp(-val);
    }
    setIsCustomHpModalOpen(false);
  };

  const handleTempHpSubmit = () => {
    if (maxHp === undefined) {
      setIsTempHpModalOpen(false);
      return;
    }
    const val = parseInt(tempHpInput, 10);
    if (!isNaN(val) && val >= 0) {
      updateHp(currentHp, val);
    }
    setIsTempHpModalOpen(false);
  };

  const handleCoinsSubmit = () => {
    const gp = parseInt(coinsGpInput, 10);
    const sp = parseInt(coinsSpInput, 10);
    const cp = parseInt(coinsCpInput, 10);

    updateCoins(
      isNaN(gp) ? safeCharacter.coins_gp ?? 0 : gp,
      isNaN(sp) ? safeCharacter.coins_sp ?? 0 : sp,
      isNaN(cp) ? safeCharacter.coins_cp ?? 0 : cp
    );
    setIsCoinsModalOpen(false);
  };

  const confirmLongRest = () => {
    Alert.alert(
      'Riposo Lungo (8 Ore)',
      'Recuperi tutti i Punti Ferita, resetti gli HP Temporanei, ripristini metà dei Dadi Vita massimi, tutti gli Slot Incantesimo e le capacità giornaliere.',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Conferma Riposo', style: 'default', onPress: longRest },
      ]
    );
  };

  const confirmShortRest = () => {
    Alert.alert(
      'Riposo Breve (1 Ora)',
      'Recuperi le capacità con ricarica a riposo breve (come Secondo Fiato e Azione Impetuosa). Vuoi anche spendere Dadi Vita per curarti?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Spendi 1 Dado Vita', onPress: handleSpendHitDie },
        { text: 'Solo Ricarica Capacità', onPress: shortRest },
      ]
    );
  };

  if (!hasAssignedCharacter) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.noCharContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.noCharIconWrap}>
            <Shield size={44} color={colors.brassBase} />
          </View>
          <Text style={styles.noCharTitle}>Nessuna Scheda Assegnata</Text>
          <Text style={styles.noCharCampaignName}>
            Tavolo: {activeCampaign?.name || 'Campagna Selezionata'}
          </Text>
          <Text style={styles.noCharDescription}>
            Non hai ancora una scheda PG assegnata a questo tavolo ({activeCampaign?.type ? activeCampaign.type.toUpperCase() : 'CAMPAGNA'}). Nel portale Barber & Dragons, il Game Master assegna le schede dei personaggi per ogni singola campagna.
          </Text>
          <TouchableOpacity
            style={styles.selectCampaignMainBtn}
            onPress={() => setIsCampaignModalOpen(true)}
            activeOpacity={0.8}
          >
            <Compass size={16} color={colors.void} />
            <Text style={styles.selectCampaignMainBtnText}>Sfoglia Tutte le Campagne</Text>
          </TouchableOpacity>

          {otherCharacters.length > 0 && (
            <View style={styles.otherCharsSection}>
              <Text style={styles.otherCharsSectionTitle}>
                LE TUE SCHEDE IN ALTRE CAMPAGNE ({otherCharacters.length})
              </Text>
              <Text style={styles.otherCharsSectionSubtitle}>
                Tocca un tuo eroe per passare subito al suo tavolo e consultare la scheda:
              </Text>
              {otherCharacters.map(({ char, campaignId, campaignName }) => (
                <TouchableOpacity
                  key={char.id}
                  style={styles.otherCharCard}
                  onPress={() => selectCampaign(campaignId)}
                  activeOpacity={0.8}
                >
                  <View style={styles.otherCharAvatarWrap}>
                    {char.image_url ? (
                      <Image source={{ uri: char.image_url }} style={styles.otherCharAvatar} />
                    ) : (
                      <Shield size={18} color={colors.brassLight} />
                    )}
                  </View>
                  <View style={styles.otherCharInfo}>
                    <Text style={styles.otherCharName}>{char.name}</Text>
                    <Text style={styles.otherCharSub}>
                      {char.character_class || 'Classe non compilata'} • Lv. {char.level ?? '—'}
                    </Text>
                    <View style={styles.otherCharCampBadge}>
                      <Text style={styles.otherCharCampText}>{campaignName}</Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.brassBase} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <CampaignSelectorModal
          visible={isCampaignModalOpen}
          onClose={() => setIsCampaignModalOpen(false)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Hero Sticky Header */}
      <View style={styles.heroHeader}>
        <View style={styles.heroRow}>
          {/* Avatar & Level Badge */}
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setIsCharSelectorOpen(true)}
            activeOpacity={0.8}
          >
            {safeCharacter.image_url ? (
              <Image source={{ uri: safeCharacter.image_url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Shield size={24} color={colors.brassLight} />
              </View>
            )}
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>Lv {sheet?.level ?? safeCharacter.level ?? '—'}</Text>
            </View>
          </TouchableOpacity>

          {/* Name & Class / Subclass / Race */}
          <View style={styles.heroInfo}>
            <TouchableOpacity
              style={styles.characterSelectTrigger}
              onPress={() => setIsCharSelectorOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.heroName} numberOfLines={1}>
                {safeCharacter.name}
              </Text>
              {(characters.length > 1 || otherCharacters.length > 0) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {otherCharacters.length > 0 && (
                    <View style={styles.multiCharPill}>
                      <Text style={styles.multiCharPillText}>+{otherCharacters.length}</Text>
                    </View>
                  )}
                  <ChevronDown size={14} color={colors.brassBase} />
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.heroDetails} numberOfLines={1}>
              {[safeCharacter.character_class && `${safeCharacter.character_class}${safeCharacter.class_subclass ? ` (${safeCharacter.class_subclass})` : ''}`, sheet?.raceLabel ?? (safeCharacter.race_slug ? safeCharacter.race_slug.replace('-', ' ') : null), sheet?.subraceLabel]
                .filter(Boolean).join(' • ') || 'Dati identità non compilati'}
            </Text>
            {sheet?.source && <Text style={styles.campaignSubtitle}>Scheda: {sheet.source === 'recovered' ? 'recuperata da documento' : sheet.source === 'generator' ? 'generatore' : 'compilata dal Master'}</Text>}

            <TouchableOpacity
              style={styles.campaignSelectBtn}
              onPress={() => setIsCampaignModalOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.campaignSubtitle} numberOfLines={1}>
                {activeCampaign?.name ?? safeCharacter.campaigns?.name ?? 'Barber & Dragons'} ▾
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Rest Buttons Bar */}
        <View style={styles.quickRestRow}>
          {isSaving && <Text style={styles.restPillText}>Salvataggio…</Text>}
          <TouchableOpacity style={styles.restPill} onPress={confirmShortRest} disabled={isSaving} activeOpacity={0.7}>
            <RotateCcw size={12} color={colors.parchmentLight} />
            <Text style={styles.restPillText}>Riposo Breve</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.restPill, styles.restPillLong]} onPress={confirmLongRest} disabled={isSaving || maxHp === undefined} activeOpacity={0.7}>
            <Sparkles size={12} color={colors.brassLight} />
            <Text style={styles.restPillTextLong}>Riposo Lungo</Text>
          </TouchableOpacity>

          {/* XP Pill */}
          <View style={styles.xpPill}>
            <Text style={styles.xpPillText}>
              <Text style={styles.xpBold}>{safeCharacter.current_xp ?? 0}</Text> XP
            </Text>
          </View>
        </View>

        {/* Navigation Tabs Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'combat' && styles.tabButtonActive]}
            onPress={() => setActiveTab('combat')}
          >
            <Swords size={14} color={activeTab === 'combat' ? colors.brassLight : colors.parchmentMuted} />
            <Text style={[styles.tabText, activeTab === 'combat' && styles.tabTextActive]}>Combattimento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'stats' && styles.tabButtonActive]}
            onPress={() => setActiveTab('stats')}
          >
            <Target size={14} color={activeTab === 'stats' ? colors.brassLight : colors.parchmentMuted} />
            <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Statistiche</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'spells' && styles.tabButtonActive]}
            onPress={() => setActiveTab('spells')}
          >
            <Wand2 size={14} color={activeTab === 'spells' ? colors.brassLight : colors.parchmentMuted} />
            <Text style={[styles.tabText, activeTab === 'spells' && styles.tabTextActive]}>Incantesimi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'features' && styles.tabButtonActive]}
            onPress={() => setActiveTab('features')}
          >
            <Award size={14} color={activeTab === 'features' ? colors.brassLight : colors.parchmentMuted} />
            <Text style={[styles.tabText, activeTab === 'features' && styles.tabTextActive]}>Privilegi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'inventory' && styles.tabButtonActive]}
            onPress={() => setActiveTab('inventory')}
          >
            <Backpack size={14} color={activeTab === 'inventory' ? colors.brassLight : colors.parchmentMuted} />
            <Text style={[styles.tabText, activeTab === 'inventory' && styles.tabTextActive]}>Inventario</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* ================= TAB 1: COMBATTIMENTO & VITALI ================= */}
        {activeTab === 'combat' && (
          <View style={styles.tabContent}>
            {sheet?.source === 'recovered' && (
              (sheet.level !== undefined && safeCharacter.level !== null && sheet.level !== safeCharacter.level) ||
              (sheet.characterName && sheet.characterName !== safeCharacter.name)
            ) && <Text style={styles.emptyNotice}>{sheet.characterName && sheet.characterName !== safeCharacter.name ? `Nel PDF recuperato il nome è “${sheet.characterName}”; il record campagna riporta “${safeCharacter.name}”. ` : ''}{sheet.level !== undefined && safeCharacter.level !== null && sheet.level !== safeCharacter.level ? `Il PDF riporta livello ${sheet.level}; il record campagna riporta ${safeCharacter.level}. ` : ''}La scheda conserva e mostra i dati del PDF senza modificare il record campagna.</Text>}
            {/* Primary Vitals Triad: CA, Iniziativa, Velocità, Competenza */}
            <View style={styles.vitalsRow}>
              <View style={styles.vitalCard}>
                <Shield size={18} color={colors.brassBase} />
                <Text style={styles.vitalValue}>{safeCharacter.armor_class ?? '—'}</Text>
                <Text style={styles.vitalLabel}>CLASSE ARMATURA</Text>
              </View>

              <TouchableOpacity style={styles.vitalCard} onPress={rollInitiative} disabled={typeof safeCharacter.rules_snapshot?.initiative !== 'number'} activeOpacity={0.75}>
                <Zap size={18} color={colors.brassLight} />
                <Text style={styles.vitalValue}>
                  {typeof safeCharacter.rules_snapshot?.initiative === 'number'
                    ? `${safeCharacter.rules_snapshot.initiative >= 0 ? '+' : ''}${safeCharacter.rules_snapshot.initiative}`
                    : '—'}
                </Text>
                <Text style={styles.vitalLabel}>INIZIATIVA (TIRA)</Text>
              </TouchableOpacity>

              <View style={styles.vitalCard}>
                <Footprints size={18} color={colors.parchmentLight} />
                <Text style={styles.vitalValue}>{safeCharacter.rules_snapshot?.speed ?? '—'}</Text>
                <Text style={styles.vitalLabel}>VELOCITÀ</Text>
              </View>

              <View style={styles.vitalCard}>
                <Award size={18} color={colors.emerald} />
                <Text style={styles.vitalValue}>{proficiencyBonus === undefined ? '—' : `+${proficiencyBonus}`}</Text>
                <Text style={styles.vitalLabel}>COMPETENZA</Text>
              </View>
            </View>

            {/* Health & Hit Points Card */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Heart size={18} color={colors.crimsonLight} />
                  <Text style={styles.cardSectionTitle}>PUNTI FERITA (SALUTE)</Text>
                </View>
                <View style={styles.hpValuesPill}>
                  <Text style={[styles.hpCurrentText, { color: hpBarColor }]}>{safeCharacter.hit_points ?? '—'}</Text>
                  <Text style={styles.hpMaxText}> / {maxHp ?? '—'} PF</Text>
                  {tempHp > 0 && <Text style={styles.tempHpBadge}> +{tempHp} TEMP</Text>}
                </View>
              </View>

              {/* Visual HP Bar */}
              <View style={styles.hpTrack}>
                <View style={[styles.hpFill, { width: `${hpPercent}%`, backgroundColor: hpBarColor }]} />
              </View>

              {/* Quick Health Buttons */}
              <View style={styles.hpControlsRow}>
                <TouchableOpacity style={styles.hpDeltaBtn} onPress={() => handleQuickHp(-5)} disabled={isSaving || maxHp === undefined}>
                  <Text style={styles.hpDeltaDamageText}>-5</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.hpDeltaBtn} onPress={() => handleQuickHp(-1)} disabled={isSaving || maxHp === undefined}>
                  <Text style={styles.hpDeltaDamageText}>-1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.hpActionBtn}
                  disabled={isSaving || maxHp === undefined}
                  onPress={() => {
                    setCustomHpAction('damage');
                    setIsCustomHpModalOpen(true);
                  }}
                >
                  <Text style={styles.hpActionBtnDamageText}>Danno</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.hpActionBtn}
                  disabled={isSaving || maxHp === undefined}
                  onPress={() => {
                    setCustomHpAction('heal');
                    setIsCustomHpModalOpen(true);
                  }}
                >
                  <Text style={styles.hpActionBtnHealText}>Cura</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.hpDeltaBtn} onPress={() => handleQuickHp(1)} disabled={isSaving || maxHp === undefined}>
                  <Text style={styles.hpDeltaHealText}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.hpDeltaBtn} onPress={() => handleQuickHp(5)} disabled={isSaving || maxHp === undefined}>
                  <Text style={styles.hpDeltaHealText}>+5</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.tempHpBtn} onPress={() => setIsTempHpModalOpen(true)} disabled={isSaving}>
                  <Text style={styles.tempHpBtnText}>Temp</Text>
                </TouchableOpacity>
              </View>

              {/* Hit Dice Bar */}
              <View style={styles.hitDiceRow}>
                <View style={styles.hitDiceLeft}>
                  <Text style={styles.hitDiceTitle}>DADI VITA</Text>
                  <Text style={styles.hitDiceSub}>
                    {hitDice ? <>Disponibili: <Text style={styles.textWhite}>{hitDice.current} di {hitDice.total}</Text> ({hitDice.die})</> : sheet?.hitDie ? `Risorse non salvate · ${sheet.hitDiceTotal ?? '—'} dadi ${sheet.hitDie}` : 'Dati Dadi Vita non compilati'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.spendHitDieBtn} onPress={handleSpendHitDie} disabled={isSaving || !hitDice || maxHp === undefined} activeOpacity={0.75}>
                  <Text style={styles.spendHitDieBtnText}>Spendi Dado{hitDice?.die ? ` (${hitDice.die})` : ''}</Text>
                </TouchableOpacity>
              </View>

              {/* Death Saves (Visible always or prominent when HP == 0) */}
              <View style={[styles.deathSavesContainer, currentHp === 0 && styles.deathSavesActiveAlert]}>
                <View style={styles.deathSavesHeader}>
                  <View style={styles.deathSavesTitleRow}>
                    <Skull size={16} color={currentHp === 0 ? colors.crimsonLight : colors.parchmentMuted} />
                    <Text style={[styles.deathSavesTitle, currentHp === 0 && styles.deathSavesTitleAlert]}>
                      TIRI SALVEZZA CONTRO LA MORTE (0 PF)
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.rollDeathSaveBtn} onPress={rollDeathSave} disabled={isSaving}>
                    <Text style={styles.rollDeathSaveText}>Tira TS Morte (d20)</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.deathSavesRows}>
                  {/* Successes */}
                  <View style={styles.deathSaveTrackerRow}>
                    <Text style={styles.deathSaveTrackLabel}>SUCCESS</Text>
                    <View style={styles.deathDotsRow}>
                      {[1, 2, 3].map((idx) => {
                        const isFilled = deathSaves.successes >= idx;
                        return (
                          <TouchableOpacity
                            key={`succ-${idx}`}
                            style={[styles.deathDot, isFilled && styles.deathDotSuccess]}
                            disabled={isSaving}
                            onPress={() => updateDeathSaves(isFilled ? idx - 1 : idx, deathSaves.failures)}
                          >
                            {isFilled && <Check size={12} color={colors.void} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Failures */}
                  <View style={styles.deathSaveTrackerRow}>
                    <Text style={styles.deathSaveTrackLabel}>FALLITI</Text>
                    <View style={styles.deathDotsRow}>
                      {[1, 2, 3].map((idx) => {
                        const isFilled = deathSaves.failures >= idx;
                        return (
                          <TouchableOpacity
                            key={`fail-${idx}`}
                            style={[styles.deathDot, isFilled && styles.deathDotFailure]}
                            disabled={isSaving}
                            onPress={() => updateDeathSaves(deathSaves.successes, isFilled ? idx - 1 : idx)}
                          >
                            {isFilled && <X size={12} color={colors.parchmentLight} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Weapon Attacks & Combat Actions */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderLeft}>
                <Swords size={18} color={colors.brassBase} />
                <Text style={styles.cardSectionTitle}>ATTACCHI & AZIONI CON ARMI</Text>
              </View>

              {weapons.length > 0 ? (
                weapons.map((wp) => (
                  <View key={wp.id} style={styles.weaponCard}>
                    <View style={styles.weaponHeader}>
                      <Text style={styles.weaponName}>{wp.name}</Text>
                      {wp.range && <Text style={styles.weaponRange}>{wp.range}</Text>}
                    </View>

                    {wp.properties && <Text style={styles.weaponProps}>{wp.properties}</Text>}
                    {wp.notes && <Text style={styles.weaponNotes}>{wp.notes}</Text>}

                    <View style={styles.weaponActionButtonsRow}>
                      <TouchableOpacity style={styles.weaponHitBtn} onPress={() => rollWeaponAttack(wp)} disabled={wp.attackBonus === undefined}>
                        <Target size={14} color={colors.void} />
                        <Text style={styles.weaponHitBtnText}>
                          COLPISCI ({wp.attackBonus === undefined ? '—' : `${wp.attackBonus >= 0 ? '+' : ''}${wp.attackBonus}`})
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.weaponDmgBtn} onPress={() => rollWeaponDamage(wp)}>
                        <Dices size={14} color={colors.brassLight} />
                        <Text style={styles.weaponDmgBtnText}>DANNO ({wp.damage})</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyNotice}>Nessun attacco registrato.</Text>
              )}
            </View>
          </View>
        )}

        {/* ================= TAB 2: STATISTICHE & ABILITÀ ================= */}
        {activeTab === 'stats' && (
          <View style={styles.tabContent}>
            {/* 6 Core Abilities Grid */}
            <Text style={styles.categorySubhead}>CARATTERISTICHE PRIMARIE D&D 5E</Text>
            <View style={styles.abilityGrid}>
              {abilityScores.map((ab) => (
                <TouchableOpacity
                  key={ab.key}
                  style={styles.abilityCard}
                  onPress={() => rollAbility(ab)}
                  disabled={ab.modifier === undefined}
                  activeOpacity={0.75}
                >
                  <Text style={styles.abilityLabel}>{ab.label}</Text>
                  <Text style={styles.abilityName}>{ab.name}</Text>
                  <Text style={styles.abilityModifier}>
                    {ab.modifier === undefined ? '—' : `${ab.modifier >= 0 ? '+' : ''}${ab.modifier}`}
                  </Text>
                  <View style={styles.abilityScorePill}>
                    <Text style={styles.abilityScoreText}>{ab.score ?? '—'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* 6 Saving Throws */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>TIRI SALVEZZA</Text>
              {savingThrows.every((st) => st.bonus === undefined) && <Text style={styles.emptyNotice}>Tiri salvezza non ancora compilati.</Text>}
              {savingThrows.some((st) => st.bonus !== undefined && st.proficient === undefined) && <Text style={styles.emptyNotice}>Bonus recuperato dal documento; la competenza non è leggibile per tutte le voci.</Text>}
              <View style={styles.savesGrid}>
                {savingThrows.map((st) => (
                  <TouchableOpacity
                    key={st.key}
                    style={styles.saveRow}
                    onPress={() => rollSavingThrow(st)}
                    disabled={st.bonus === undefined}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.profDot, st.proficient && styles.profDotActive]} />
                    <Text style={styles.saveName}>{st.name}</Text>
                    <Text style={[styles.saveBonus, st.proficient && styles.textGold]}>
                      {st.bonus === undefined ? '—' : `${st.bonus >= 0 ? '+' : ''}${st.bonus}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 18 Skills */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardSectionTitle}>TUTTE LE 18 ABILITÀ</Text>
                <Text style={styles.passivePerceptionLabel}>Percezione Passiva: {passivePerception ?? '—'}</Text>
              </View>

              <View style={styles.skillsList}>
                {skills.some((sk) => sk.bonus !== undefined && (sk.proficient === undefined || sk.expertise === undefined)) && <Text style={styles.emptyNotice}>Alcuni bonus sono salvati, ma gli indicatori di competenza o expertise non sono disponibili.</Text>}
                {skills.map((sk) => (
                  <TouchableOpacity
                    key={sk.key}
                    style={styles.skillRow}
                    onPress={() => rollSkill(sk)}
                    disabled={sk.bonus === undefined}
                    activeOpacity={0.7}
                  >
                    <View style={styles.skillLeft}>
                      <View
                        style={[
                          styles.profDot,
                          sk.proficient && styles.profDotActive,
                          sk.expertise && styles.profDotExpertise,
                        ]}
                      />
                      <Text style={styles.skillName}>{sk.name}</Text>
                      <View style={styles.skillAbilityBadge}>
                        <Text style={styles.skillAbilityBadgeText}>{sk.abilityLabel}</Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.skillBonus,
                        sk.proficient && styles.textGold,
                        sk.expertise && styles.textCyan,
                      ]}
                    >
                      {sk.bonus === undefined ? '—' : `${sk.bonus >= 0 ? '+' : ''}${sk.bonus}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ================= TAB 3: INCANTESIMI ================= */}
        {activeTab === 'spells' && (
          <View style={styles.tabContent}>
            {/* Spellcasting Summary */}
            <View style={styles.spellHeaderRow}>
              <View style={styles.vitalCard}>
                <Text style={styles.vitalValue}>{spellAbility ? spellAbilityLabel[spellAbility] : '—'}</Text>
                <Text style={styles.vitalLabel}>CARATTERISTICA</Text>
              </View>
              <View style={styles.vitalCard}>
                <Text style={styles.vitalValue}>{spellSaveDc === undefined || spellSaveDc === null ? '—' : `CD ${spellSaveDc}`}</Text>
                <Text style={styles.vitalLabel}>CD SALVEZZA</Text>
              </View>
              <View style={styles.vitalCard}>
                <Text style={styles.vitalValue}>{spellAttackBonus === undefined || spellAttackBonus === null ? '—' : `${spellAttackBonus >= 0 ? '+' : ''}${spellAttackBonus}`}</Text>
                <Text style={styles.vitalLabel}>ATTACCO MAGICO</Text>
              </View>
            </View>
            {sheet?.spellcastingClass && <Text style={styles.emptyNotice}>Classe incantatrice: {sheet.spellcastingClass}{sheet.spellsPrepared !== undefined ? ` · ${sheet.spellsPrepared} incantesimi preparati` : ''}{sheet.cantripsKnown !== undefined ? ` · ${sheet.cantripsKnown} trucchetti` : ''}</Text>}

            {/* Spell Slots by Level */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>SLOT INCANTESIMI DISPONIBILI</Text>
              {spellSlots.length > 0 ? (
                <View style={styles.spellSlotsGrid}>
                  {usedSpellSlots === undefined && <Text style={styles.emptyNotice}>Gli slot massimi sono compilati, ma i consumi attuali non risultano salvati. Verificali col Master.</Text>}
                  {spellSlots.map((slot) => {
                    const used = usedSpellSlots?.[slot.level] ?? 0;
                    return (
                      <View key={`slot-${slot.level}`} style={styles.slotLevelCard}>
                        <Text style={styles.slotLevelTitle}>Livello {slot.level}°</Text>
                        <Text style={styles.slotLevelCount}>
                          {slot.count - used} di {slot.count} rimasti
                        </Text>
                        <View style={styles.slotDotsRow}>
                          {Array.from({ length: slot.count }).map((_, idx) => {
                            const isSlotUsed = idx < used;
                            return (
                              <TouchableOpacity
                                key={`dot-${slot.level}-${idx}`}
                                style={[styles.slotDot, isSlotUsed && styles.slotDotUsed]}
                                onPress={() => updateSpellSlot(slot.level, isSlotUsed ? used - 1 : used + 1)}
                                disabled={isSaving}
                              />
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.noSpellsBox}>
                  <Text style={styles.noSpellsText}>
                    Slot e incantesimi non ancora compilati.
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>INCANTESIMI CONOSCIUTI / PREPARATI</Text>
              {spells.length === 0 ? <Text style={styles.emptyNotice}>Elenco incantesimi non ancora compilato.</Text> : spells.map((spell) => (
                <View key={spell.id} style={styles.featureCard}>
                  <View style={styles.featureHeader}>
                    <Text style={styles.featureName}>{spell.name}</Text>
                    <Text style={styles.featureSourceText}>{spell.level === 0 ? 'TRUCCHETTO' : `LIVELLO ${spell.level}`}</Text>
                  </View>
                          {spell.summary && <Text style={styles.featureDesc}>{spell.summary}</Text>}
                          {spell.description && spell.description !== spell.summary && <Text style={styles.featureDesc}>{spell.description}</Text>}
                          {spell.components !== undefined && <Text style={styles.weaponProps}>Componenti: {spell.components || 'Nessuno indicato'}</Text>}
                  {(spell.ritual || spell.concentration) && <Text style={styles.weaponProps}>{[spell.ritual && 'Rituale', spell.concentration && 'Concentrazione'].filter(Boolean).join(' • ')}</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================= TAB 4: PRIVILEGI & TRATTI ================= */}
        {activeTab === 'features' && (
          <View style={styles.tabContent}>
            {/* Features with Uses/Rest counters */}
            <Text style={styles.categorySubhead}>CAPACITÀ ATTIVE & RISORSE SPECIALI</Text>
            {features.length === 0 && <Text style={styles.emptyNotice}>Privilegi e tratti non ancora compilati.</Text>}
            {features.map((feat) => {
              const hasUses = feat.usesMax !== undefined;
              return (
                <View key={feat.id} style={styles.featureCard}>
                  <View style={styles.featureHeader}>
                    <Text style={styles.featureName}>{feat.name}</Text>
                    <View style={styles.featureSourceBadge}>
                      <Text style={styles.featureSourceText}>{feat.source.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.featureDesc}>{feat.description}</Text>

                  {hasUses && (
                    <View style={styles.featureUsesRow}>
                      <Text style={styles.featureUsesLabel}>
                        Usi rimanenti: <Text style={styles.textGold}>{feat.usesCurrent ?? 0}</Text> di {feat.usesMax}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.useFeatureBtn,
                          (feat.usesCurrent ?? 0) <= 0 && styles.useFeatureBtnDisabled,
                        ]}
                        disabled={(feat.usesCurrent ?? 0) <= 0 || isSaving}
                        onPress={() => useFeature(feat.id)}
                      >
                        <Text style={styles.useFeatureBtnText}>Attiva Capacità</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Proficiencies & Languages */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>COMPETENZE & LINGUAGGI</Text>
              <View style={styles.profBlock}>
                <Text style={styles.profTitle}>ARMATURE:</Text>
                <Text style={styles.profValue}>{proficiencies.armor?.join(', ') || 'Non compilato'}</Text>
              </View>
              <View style={styles.profBlock}>
                <Text style={styles.profTitle}>ARMI:</Text>
                <Text style={styles.profValue}>{proficiencies.weapons?.join(', ') || 'Non compilato'}</Text>
              </View>
              <View style={styles.profBlock}>
                <Text style={styles.profTitle}>STRUMENTI:</Text>
                <Text style={styles.profValue}>{proficiencies.tools?.join(', ') || 'Non compilato'}</Text>
              </View>
              <View style={styles.profBlock}>
                <Text style={styles.profTitle}>LINGUAGGI:</Text>
                <Text style={styles.profValue}>{proficiencies.languages?.join(', ') || 'Non compilato'}</Text>
              </View>
              {sheet?.proficiencies !== undefined && <View style={styles.profBlock}>
                <Text style={styles.profTitle}>ALTRE COMPETENZE:</Text>
                <Text style={styles.profValue}>{sheet.proficiencies.join(', ') || 'Nessuna indicata'}</Text>
              </View>}
            </View>
          </View>
        )}

        {/* ================= TAB 5: EQUIPAGGIAMENTO & BIO ================= */}
        {activeTab === 'inventory' && (
          <View style={styles.tabContent}>
            {/* Coins Purse */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderLeft}>
                  <Coins size={18} color={colors.brassBase} />
                  <Text style={styles.cardSectionTitle}>BORSELLO MONETE</Text>
                </View>
                <TouchableOpacity style={styles.editCoinsBtn} onPress={() => setIsCoinsModalOpen(true)} disabled={isSaving}>
                  <Text style={styles.editCoinsBtnText}>Modifica Monete</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.coinsGrid}>
                <View style={styles.coinCard}>
                  <Text style={styles.coinAmountGold}>{safeCharacter.coins_gp ?? 0}</Text>
                  <Text style={styles.coinLabel}>ORO (MO)</Text>
                </View>
                <View style={styles.coinCard}>
                  <Text style={styles.coinAmountSilver}>{safeCharacter.coins_sp ?? 0}</Text>
                  <Text style={styles.coinLabel}>ARGENTO (MA)</Text>
                </View>
                <View style={styles.coinCard}>
                  <Text style={styles.coinAmountCopper}>{safeCharacter.coins_cp ?? 0}</Text>
                  <Text style={styles.coinLabel}>RAME (MR)</Text>
                </View>
              </View>
            </View>

            {/* Inventory Items List */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderLeft}>
                <Backpack size={18} color={colors.parchmentLight} />
                <Text style={styles.cardSectionTitle}>ZAINO & OGGETTI EQUIPAGGIATI</Text>
              </View>

              <View style={styles.inventoryList}>
                {inventory.length === 0 && <Text style={styles.emptyNotice}>Inventario non ancora compilato.</Text>}
                {inventory.map((item) => (
                  <View key={item.id} style={styles.inventoryRow}>
                    <View style={styles.inventoryLeft}>
                      <Text style={styles.inventoryName}>{item.name}</Text>
                      <View style={styles.inventoryMeta}>
                        {item.quantity !== undefined && <Text style={styles.inventoryQty}>Q.tà: {item.quantity}</Text>}
                        {item.weight && <Text style={styles.inventoryWeight}>• {item.weight}</Text>}
                        {item.notes && <Text style={styles.inventoryNotes}>• {item.notes}</Text>}
                      </View>
                    </View>
                    {item.equipped && (
                      <View style={styles.equippedBadge}>
                        <Text style={styles.equippedBadgeText}>INDOSSATO</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Roleplay & Personality */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardSectionTitle}>PERSONALITÀ & RETROSCENA D&D 5E</Text>
              {sheet?.alignment && <BioRow title="ALLINEAMENTO" text={sheet.alignment} />}
              {sheet?.age && <BioRow title="ETÀ" text={sheet.age} />}
              {sheet?.height && <BioRow title="ALTEZZA" text={sheet.height} />}
              {sheet?.weight && <BioRow title="PESO" text={sheet.weight} />}
              {sheet?.sex && <BioRow title="SESSO" text={sheet.sex} />}
              {personality?.traits && <BioRow title="TRATTI CARATTERIALI" text={personality.traits} />}
              {personality?.ideals && <BioRow title="IDEALE" text={personality.ideals} />}
              {personality?.bonds && <BioRow title="LEGAME" text={personality.bonds} />}
              {personality?.flaws && <BioRow title="DIFETTO" text={personality.flaws} />}
              {sheet?.backgroundLabel && <BioRow title="BACKGROUND" text={sheet.backgroundLabel} />}
              {(sheet?.backgroundMd || (sheet?.backgroundLabel ? null : safeCharacter.background)) && (
                <View style={styles.bioBlock}>
                  <Text style={styles.bioTitle}>{sheet?.backgroundMd ? 'DESCRIZIONE DEL BACKGROUND:' : 'BACKGROUND:'}</Text>
                  <Text style={styles.bioText}>{sheet?.backgroundMd || safeCharacter.background}</Text>
                </View>
              )}
              {!sheet?.alignment && !sheet?.age && !sheet?.height && !sheet?.weight && !sheet?.sex && !personality?.traits && !personality?.ideals && !personality?.bonds && !personality?.flaws && !sheet?.backgroundLabel && !sheet?.backgroundMd && !safeCharacter.background && <Text style={styles.emptyNotice}>Dati personali e background non ancora compilati.</Text>}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button (FAB) for Dice Roller */}
      <TouchableOpacity
        style={styles.fabDice}
        onPress={() => {
          setDiceInitialDie('d20');
          setDiceInitialCount(1);
          setDiceInitialMod(0);
          setDiceInitialLabel('Tiro Libero Taverna');
          setIsDiceModalOpen(true);
        }}
        activeOpacity={0.85}
      >
        <Dices size={28} color={colors.void} />
      </TouchableOpacity>

      {/* Dice Roller Modal */}
      <DiceRollerModal
        visible={isDiceModalOpen}
        onClose={() => setIsDiceModalOpen(false)}
        initialDie={diceInitialDie}
        initialDiceCount={diceInitialCount}
        initialModifier={diceInitialMod}
        initialLabel={diceInitialLabel}
      />

      {/* Custom HP Modal */}
      <Modal visible={isCustomHpModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {customHpAction === 'heal' ? 'CURA PUNTI FERITA' : 'INFLIGGI DANNO'}
            </Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={customHpInput}
              onChangeText={setCustomHpInput}
              autoFocus
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsCustomHpModalOpen(false)}>
                <Text style={styles.modalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  customHpAction === 'heal' ? styles.btnHeal : styles.btnDamage,
                ]}
                onPress={handleCustomHpSubmit}
                disabled={isSaving}
              >
                <Text style={styles.modalConfirmText}>Applica</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Temp HP Modal */}
      <Modal visible={isTempHpModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>PUNTI FERITA TEMPORANEI</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="number-pad"
              value={tempHpInput}
              onChangeText={setTempHpInput}
              autoFocus
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsTempHpModalOpen(false)}>
                <Text style={styles.modalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, styles.btnGold]} onPress={handleTempHpSubmit} disabled={isSaving}>
                <Text style={styles.modalConfirmTextDark}>Imposta Temp HP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Coins Modal */}
      <Modal visible={isCoinsModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>AGGIORNA BORSELLO</Text>
            <View style={styles.coinInputGroup}>
              <Text style={styles.coinInputLabel}>Oro (MO):</Text>
              <TextInput
                style={styles.coinInputField}
                keyboardType="number-pad"
                defaultValue={String(safeCharacter.coins_gp ?? 0)}
                onChangeText={setCoinsGpInput}
              />
            </View>
            <View style={styles.coinInputGroup}>
              <Text style={styles.coinInputLabel}>Argento (MA):</Text>
              <TextInput
                style={styles.coinInputField}
                keyboardType="number-pad"
                defaultValue={String(safeCharacter.coins_sp ?? 0)}
                onChangeText={setCoinsSpInput}
              />
            </View>
            <View style={styles.coinInputGroup}>
              <Text style={styles.coinInputLabel}>Rame (MR):</Text>
              <TextInput
                style={styles.coinInputField}
                keyboardType="number-pad"
                defaultValue={String(safeCharacter.coins_cp ?? 0)}
                onChangeText={setCoinsCpInput}
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsCoinsModalOpen(false)}>
                <Text style={styles.modalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmBtn, styles.btnGold]} onPress={handleCoinsSubmit} disabled={isSaving}>
                <Text style={styles.modalConfirmTextDark}>Salva Borsello</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Character Selector Modal */}
      <Modal visible={isCharSelectorOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.charSelectCard}>
            <View style={styles.charSelectHeader}>
              <Text style={styles.charSelectTitle}>I TUOI EROI</Text>
              <TouchableOpacity onPress={() => setIsCharSelectorOpen(false)}>
                <X size={20} color={colors.parchmentLight} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {characters.length > 0 && (
                <>
                  <Text style={styles.charSelectGroupTitle}>
                    CAMPAGNA ATTIVA ({activeCampaign?.name ?? 'Tavolo'})
                  </Text>
                  {characters.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.charSelectRow,
                        c.id === safeCharacter.id && styles.charSelectRowActive,
                      ]}
                      onPress={() => {
                        selectCharacter(c.id);
                        setIsCharSelectorOpen(false);
                      }}
                    >
                      <View style={styles.charSelectInfo}>
                        <Text style={styles.charSelectName}>{c.name}</Text>
                        <Text style={styles.charSelectSub}>
                          {c.character_class || 'Classe non compilata'} Lv.{c.level ?? '—'} • {c.campaigns?.name ?? activeCampaign?.name}
                        </Text>
                      </View>
                      {c.id === safeCharacter.id && <Check size={18} color={colors.brassBase} />}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {otherCharacters.length > 0 && (
                <>
                  <Text style={[styles.charSelectGroupTitle, { marginTop: 14 }]}>
                    IN ALTRE CAMPAGNE ({otherCharacters.length})
                  </Text>
                  {otherCharacters.map(({ char, campaignId, campaignName }) => (
                    <TouchableOpacity
                      key={char.id}
                      style={styles.charSelectRow}
                      onPress={async () => {
                        setIsCharSelectorOpen(false);
                        await selectCampaign(campaignId);
                      }}
                    >
                      <View style={styles.charSelectInfo}>
                        <Text style={styles.charSelectName}>{char.name}</Text>
                        <Text style={styles.charSelectSub}>
                          {char.character_class || 'Classe non compilata'} Lv.{char.level ?? '—'} • {campaignName}
                        </Text>
                      </View>
                      <ChevronRight size={16} color={colors.brassBase} />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Campaign Selector Modal */}
      <CampaignSelectorModal
        visible={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
      />
    </SafeAreaView>
  );
};

function BioRow({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.bioBlock}>
      <Text style={styles.bioTitle}>{title}:</Text>
      <Text style={styles.bioText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  noCharContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  noCharIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.stoneSurface,
    borderWidth: 2,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: colors.brassBase,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  noCharTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 6,
    textAlign: 'center',
  },
  noCharCampaignName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brassLight,
    marginBottom: 14,
    textAlign: 'center',
  },
  noCharDescription: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
    maxWidth: 320,
  },
  selectCampaignMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: colors.brassBase,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  selectCampaignMainBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.5,
  },
  campaignSelectBtn: {
    paddingVertical: 2,
  },
  heroHeader: {
    backgroundColor: colors.stoneSurface,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.stoneBorder,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.stone,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.void,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.void,
  },
  heroInfo: {
    flex: 1,
  },
  characterSelectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.parchmentLight,
  },
  heroDetails: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brassLight,
    marginTop: 1,
  },
  campaignSubtitle: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  quickRestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  restPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  restPillLong: {
    borderColor: colors.brassDark,
    backgroundColor: 'rgba(197, 155, 39, 0.1)',
  },
  restPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  restPillTextLong: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  xpPill: {
    marginLeft: 'auto',
  },
  xpPillText: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  xpBold: {
    fontWeight: '700',
    color: colors.brassLight,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  tabButtonActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.brassBase,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.parchmentMuted,
  },
  tabTextActive: {
    color: colors.brassLight,
    fontWeight: '800',
  },
  contentContainer: {
    padding: 16,
  },
  tabContent: {
    gap: 14,
  },
  vitalsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  vitalCard: {
    flex: 1,
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.parchmentLight,
    marginVertical: 2,
  },
  vitalLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.parchmentMuted,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.brassLight,
  },
  hpValuesPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  hpCurrentText: {
    fontSize: 20,
    fontWeight: '900',
  },
  hpMaxText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  tempHpBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#06B6D4',
  },
  hpTrack: {
    height: 12,
    backgroundColor: colors.stone,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  hpFill: {
    height: '100%',
    borderRadius: 6,
  },
  hpControlsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  hpDeltaBtn: {
    flex: 1,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
  },
  hpDeltaDamageText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  hpDeltaHealText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.emerald,
  },
  hpActionBtn: {
    flex: 1.5,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
  },
  hpActionBtnDamageText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  hpActionBtnHealText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.emerald,
  },
  tempHpBtn: {
    flex: 1.2,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    paddingVertical: 7,
    alignItems: 'center',
  },
  tempHpBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
  },
  hitDiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  hitDiceLeft: {
    flex: 1,
  },
  hitDiceTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.parchmentMuted,
  },
  hitDiceSub: {
    fontSize: 12,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  spendHitDieBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassBase,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  spendHitDieBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  deathSavesContainer: {
    marginTop: 14,
    padding: 10,
    backgroundColor: colors.stone,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  deathSavesActiveAlert: {
    borderColor: colors.crimson,
    backgroundColor: 'rgba(153, 27, 27, 0.15)',
  },
  deathSavesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deathSavesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deathSavesTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.5,
  },
  deathSavesTitleAlert: {
    color: colors.crimsonLight,
  },
  rollDeathSaveBtn: {
    backgroundColor: colors.crimson,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  rollDeathSaveText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  deathSavesRows: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  deathSaveTrackerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deathSaveTrackLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.parchmentMuted,
  },
  deathDotsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  deathDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deathDotSuccess: {
    backgroundColor: colors.emerald,
    borderColor: colors.emerald,
  },
  deathDotFailure: {
    backgroundColor: colors.crimson,
    borderColor: colors.crimsonLight,
  },
  weaponCard: {
    backgroundColor: colors.stone,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 10,
    marginBottom: 10,
  },
  weaponHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weaponName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  weaponRange: {
    fontSize: 10,
    color: colors.brassLight,
  },
  weaponProps: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  weaponNotes: {
    fontSize: 10,
    fontStyle: 'italic',
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  weaponActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  weaponHitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingVertical: 7,
    borderRadius: 6,
  },
  weaponHitBtnText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.void,
  },
  weaponDmgBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingVertical: 7,
    borderRadius: 6,
  },
  weaponDmgBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
  },
  categorySubhead: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.brassLight,
    marginTop: 4,
  },
  abilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  abilityCard: {
    width: '31.5%',
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  abilityLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.brassBase,
  },
  abilityName: {
    fontSize: 9,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  abilityModifier: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.parchmentLight,
    marginVertical: 4,
  },
  abilityScorePill: {
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  abilityScoreText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  savesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  saveRow: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stone,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  saveName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.parchmentLight,
    marginLeft: 8,
  },
  saveBonus: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentMuted,
  },
  skillsList: {
    gap: 6,
    marginTop: 8,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.stone,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  skillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.parchmentMuted,
  },
  profDotActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  profDotExpertise: {
    backgroundColor: '#06B6D4',
    borderColor: '#22D3EE',
    borderWidth: 2,
  },
  skillName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.parchmentLight,
  },
  skillAbilityBadge: {
    backgroundColor: colors.stoneSurface,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  skillAbilityBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  skillBonus: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentMuted,
  },
  passivePerceptionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  spellHeaderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  spellSlotsGrid: {
    gap: 8,
    marginTop: 8,
  },
  slotLevelCard: {
    backgroundColor: colors.stone,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  slotLevelTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
  },
  slotLevelCount: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginVertical: 4,
  },
  slotDotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  slotDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brassBase,
    borderWidth: 1.5,
    borderColor: colors.brassLight,
  },
  slotDotUsed: {
    backgroundColor: colors.stoneSurface,
    borderColor: colors.stoneBorder,
  },
  noSpellsBox: {
    backgroundColor: colors.stone,
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
  },
  noSpellsText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.parchmentMuted,
    fontStyle: 'italic',
  },
  featureCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    marginBottom: 8,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  featureName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brassLight,
  },
  featureSourceBadge: {
    backgroundColor: colors.stone,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featureSourceText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.parchmentMuted,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.parchmentLight,
  },
  featureUsesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  featureUsesLabel: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  useFeatureBtn: {
    backgroundColor: colors.brassBase,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  useFeatureBtnDisabled: {
    opacity: 0.4,
  },
  useFeatureBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  profBlock: {
    marginBottom: 8,
  },
  profTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  profValue: {
    fontSize: 12,
    color: colors.parchmentLight,
    marginTop: 2,
  },
  coinsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  coinCard: {
    flex: 1,
    backgroundColor: colors.stone,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 10,
    alignItems: 'center',
  },
  coinAmountGold: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.brassLight,
  },
  coinAmountSilver: {
    fontSize: 18,
    fontWeight: '900',
    color: '#CBD5E1',
  },
  coinAmountCopper: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F97316',
  },
  coinLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  editCoinsBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  editCoinsBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  inventoryList: {
    gap: 6,
    marginTop: 8,
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.stone,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  inventoryLeft: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  inventoryMeta: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  inventoryQty: {
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  inventoryWeight: {
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  inventoryNotes: {
    fontSize: 10,
    color: colors.brassLight,
    fontStyle: 'italic',
  },
  equippedBadge: {
    backgroundColor: colors.brassDark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  equippedBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.brassLight,
  },
  bioBlock: {
    marginBottom: 10,
  },
  bioTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  bioText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.parchmentLight,
    marginTop: 2,
  },
  fabDice: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brassLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 2,
    borderColor: colors.brassLight,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 20,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    fontSize: 22,
    fontWeight: '800',
    color: colors.parchmentLight,
    textAlign: 'center',
    paddingVertical: 10,
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.stone,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnHeal: {
    backgroundColor: colors.emerald,
  },
  btnDamage: {
    backgroundColor: colors.crimson,
  },
  btnGold: {
    backgroundColor: colors.brassBase,
  },
  modalConfirmText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  modalConfirmTextDark: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.void,
  },
  coinInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  coinInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  coinInputField: {
    width: 100,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: colors.parchmentLight,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  charSelectCard: {
    width: '100%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 16,
  },
  charSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  charSelectTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brassLight,
  },
  charSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  charSelectRowActive: {
    backgroundColor: 'rgba(197, 155, 39, 0.1)',
    borderRadius: 6,
  },
  charSelectInfo: {
    flex: 1,
  },
  charSelectName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  charSelectSub: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  emptyNotice: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.parchmentMuted,
    textAlign: 'center',
    paddingVertical: 10,
  },
  multiCharPill: {
    backgroundColor: 'rgba(197, 155, 39, 0.2)',
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  multiCharPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassLight,
  },
  charSelectGroupTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.brassLight,
    marginBottom: 6,
    marginTop: 4,
  },
  otherCharsSection: {
    width: '100%',
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
  },
  otherCharsSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: colors.brassLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  otherCharsSectionSubtitle: {
    fontSize: 11,
    color: colors.parchmentMuted,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 16,
  },
  otherCharCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  otherCharAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  otherCharAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  otherCharInfo: {
    flex: 1,
  },
  otherCharName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  otherCharSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  otherCharCampBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197, 155, 39, 0.1)',
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  otherCharCampText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brassLight,
  },
  textGold: {
    color: colors.brassLight,
    fontWeight: '800',
  },
  textCyan: {
    color: '#06B6D4',
    fontWeight: '800',
  },
  textWhite: {
    color: colors.parchmentLight,
    fontWeight: '800',
  },
});

export default CharacterSheetScreen;
