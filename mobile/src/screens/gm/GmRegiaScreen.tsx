import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import {
  Activity,
  Award,
  BookOpen,
  Calendar,
  ChevronDown,
  Clock,
  Heart,
  MapPin,
  Mic,
  Plus,
  QrCode,
  Radio,
  RotateCcw,
  Shield,
  ShieldAlert,
  Skull,
  Swords,
  Trash2,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { useGmLive, type GmLiveEntry } from '../../contexts/GmLiveContext';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { GmQrScannerModal } from '../../components/gm/GmQrScannerModal';
import { GmSessionSignupsModal } from '../../components/gm/GmSessionSignupsModal';
import { GmVoiceCommandSheet } from '../../components/gm/GmVoiceCommandSheet';
import { GmQuickAudioSheet } from '../../components/gm/GmQuickAudioSheet';
import {
  GmAddCombatantModal,
  GmCombatConditionsSheet,
  GmPartyDossierModal,
  LIVE_CONDITION_LABELS,
} from '../../components/gm/GmRegiaModals';
import { parseGmRemoteQr } from '../../utils/qrParser';
import {
  resolveCharacterMaxHp,
  resolveEffectiveCharacterFields,
} from '../../lib/character-sheet';
import type { Character } from '../../types';

type RegiaSubMode = 'combat' | 'table';

function computeCountdown(scheduledAt: string): { label: string; isImminent: boolean } {
  try {
    const now = Date.now();
    const target = new Date(scheduledAt).getTime();
    const diffMs = target - now;
    if (diffMs <= 0) return { label: 'In corso adesso!', isImminent: true };
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;
    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
        return { label: `Tra ${diffMins} minuti!`, isImminent: true };
      }
      return { label: `Oggi · Tra ${diffHours} ore`, isImminent: true };
    }
    if (diffDays === 1) return { label: `Domani (${remainingHours}h)`, isImminent: false };
    return { label: `Tra ${diffDays} gg e ${remainingHours} ore`, isImminent: false };
  } catch {
    return { label: 'In arrivo', isImminent: false };
  }
}

export const GmRegiaScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {
    campaigns,
    activeCampaign,
    sessions,
    activeSession,
    selectSession,
    characters,
    isRefreshing,
    refreshSessionData,
    refreshCampaigns,
  } = useGmCampaigns();

  const isFocused = useIsFocused();
  const live = useGmLive();

  useEffect(() => {
    live.setSnapshotConsumer('regia', isFocused);
    return () => live.setSnapshotConsumer('regia', false);
  }, [isFocused, live.setSnapshotConsumer]);

  const snapshot = live.snapshot;
  const entries = snapshot?.entries ?? [];
  const hasActiveCombat = entries.length > 0;

  const [subMode, setSubMode] = useState<RegiaSubMode>('table');
  const autoSwitchedCombatRef = useRef(false);

  useEffect(() => {
    if (hasActiveCombat && !autoSwitchedCombatRef.current) {
      setSubMode('combat');
      autoSwitchedCombatRef.current = true;
    } else if (!hasActiveCombat) {
      autoSwitchedCombatRef.current = false;
    }
  }, [hasActiveCombat]);

  // Modals & Bottom Sheets
  const [campaignModalVisible, setCampaignModalVisible] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [manualPairingOpen, setManualPairingOpen] = useState(false);
  const [manualPairingInput, setManualPairingInput] = useState('');
  const [manualPairingToken, setManualPairingToken] = useState('');
  const manualPairingInputRef = useRef<TextInputInstance>(null);

  const [voiceSheetOpen, setVoiceSheetOpen] = useState(false);
  const [audioSheetOpen, setAudioSheetOpen] = useState(false);
  const [addCombatantOpen, setAddCombatantOpen] = useState(false);
  const [conditionsTargetId, setConditionsTargetId] = useState<string | null>(null);
  const [signupsModalOpen, setSignupsModalOpen] = useState(false);
  const [selectedPartyChar, setSelectedPartyChar] = useState<Character | null>(null);

  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');

  const liveSession = live.pairing
    ? live.campaignId === activeCampaign?.id && snapshot?.sessionId
      ? sessions.find((s) => s.id === snapshot.sessionId) || null
      : null
    : activeSession;

  useEffect(() => {
    if (live.status === 'online' && snapshot?.sessionId) {
      selectSession(snapshot.sessionId);
    }
  }, [live.status, snapshot?.sessionId, selectSession]);

  useEffect(() => {
    if (!manualPairingOpen) return;
    const t = setTimeout(() => manualPairingInputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [manualPairingOpen]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshCampaigns(), refreshSessionData(), live.refresh()]);
  }, [refreshCampaigns, refreshSessionData, live.refresh]);

  const handleManualPairing = async () => {
    const parsed = parseGmRemoteQr(manualPairingInput);
    const token = manualPairingToken.trim() || parsed?.token || '';
    if (!parsed || !token) {
      Alert.alert('Dati non validi', 'Incolla il link QR completo oppure inserisci Public ID e token.');
      return;
    }
    const paired = await live.pair({ ...parsed, token });
    if (!paired) {
      Alert.alert(
        'Collegamento non riuscito',
        live.error || 'La sessione non è valida per la campagna selezionata.',
      );
      return;
    }
    setManualPairingOpen(false);
    setManualPairingInput('');
    setManualPairingToken('');
  };

  const pcOnline = live.status === 'online' && live.campaignId === activeCampaign?.id;
  const blocked =
    live.status !== 'online' ||
    live.controlsReady === false ||
    snapshot?.controlsReady === false ||
    !snapshot;

  const currentTurnEntry = entries.length
    ? entries[((snapshot?.currentTurnIndex ?? 0) % entries.length + entries.length) % entries.length]
    : null;

  const conditionsTargetEntry = useMemo(
    () => (conditionsTargetId ? entries.find((e) => e.id === conditionsTargetId) ?? null : null),
    [conditionsTargetId, entries],
  );

  const sendLiveCommand = async (type: string, payload: Record<string, unknown> = {}) => {
    setPending(true);
    setNotice('Invio al PC…');
    const scopedPayload = snapshot?.matchId ? { ...payload, match_id: snapshot.matchId } : payload;
    const result = await live.sendCommand(type, scopedPayload);
    setPending(false);
    if (result.ok) {
      setNotice('Comando accodato · sincronizzazione PC in corso');
      void live.refresh();
    } else {
      setNotice(`Comando non inviato: ${result.error || 'errore'}`);
    }
  };

  const adjustHp = (entry: GmLiveEntry, delta: number | 'ko') => {
    if (delta === 'ko') {
      void sendLiveCommand('initiative.set_hp', { entry_id: entry.id, hp: 0 });
      return;
    }
    void sendLiveCommand('initiative.adjust_hp', { entry_id: entry.id, delta });
  };

  const toggleCondition = (entry: GmLiveEntry, conditionId: string) => {
    void sendLiveCommand('initiative.toggle_condition', {
      entry_id: entry.id,
      condition: conditionId,
    });
  };

  const removeEntry = (entry: GmLiveEntry) => {
    Alert.alert('Rimuovi combattente', `Rimuovere ${entry.name} dalla live?`, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Rimuovi',
        style: 'destructive',
        onPress: () => void sendLiveCommand('initiative.remove_combatant', { entry_id: entry.id }),
      },
    ]);
  };

  const handleAddCombatant = (combatant: {
    name: string;
    hp: number;
    ac: number;
    initiative: number;
  }) => {
    const id = `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    void sendLiveCommand('initiative.add_combatant', {
      combatant: {
        id,
        name: combatant.name,
        type: 'monster',
        hp: combatant.hp,
        maxHp: combatant.hp,
        initiative: combatant.initiative,
        ac: combatant.ac,
        conditions: [],
      },
    });
  };

  const criticalCharacters = useMemo(
    () =>
      characters.filter((c) => {
        const maxHp = resolveCharacterMaxHp(c.rules_snapshot);
        return (
          maxHp !== null &&
          maxHp > 0 &&
          typeof c.hit_points === 'number' &&
          c.hit_points < maxHp * 0.3
        );
      }),
    [characters],
  );

  const countdownInfo = useMemo(() => {
    if (!liveSession?.scheduled_at) return null;
    return computeCountdown(liveSession.scheduled_at);
  }, [liveSession?.scheduled_at]);

  const pendingProposal =
    snapshot?.combatCommand?.status === 'proposal' &&
    snapshot.combatCommand.campaignId === live.campaignId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      {/* 1. COMPACT PERSISTENT TOP CONSOLE BAR (Campaign + Unified QR Pairing) */}
      <View style={styles.topConsoleBar}>
        <TouchableOpacity
          style={styles.campaignPill}
          onPress={() => setCampaignModalVisible(true)}
          disabled={campaigns.length <= 1}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Campagna attiva: ${activeCampaign?.name || 'Seleziona'}`}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.campaignEyebrow}>CAMPAGNA IN REGIA</Text>
            <Text style={styles.campaignName} numberOfLines={1}>
              {activeCampaign?.name || 'Seleziona campagna'}
            </Text>
          </View>
          {campaigns.length > 1 ? <ChevronDown size={15} color={colors.brassLight} /> : null}
        </TouchableOpacity>

        <View style={styles.pairingGroup}>
          <TouchableOpacity
            style={[
              styles.pairingPill,
              pcOnline
                ? styles.pairingOnline
                : live.status === 'mismatch' || live.status === 'expired'
                  ? styles.pairingError
                  : styles.pairingIdle,
            ]}
            onPress={() => setScannerModalOpen(true)}
            onLongPress={() => setManualPairingOpen(true)}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={
              pcOnline
                ? 'PC Online, tocca per ricollegare QR'
                : 'Collega GM Screen tramite QR'
            }
          >
            {live.status === 'checking' ? (
              <ActivityIndicator size="small" color={colors.brassLight} />
            ) : pcOnline ? (
              <Wifi size={15} color={colors.emerald} />
            ) : live.pairing ? (
              <WifiOff size={15} color={colors.crimsonLight} />
            ) : (
              <QrCode size={15} color={colors.void} />
            )}
            <Text
              style={[
                styles.pairingPillText,
                !live.pairing && { color: colors.void },
                pcOnline && { color: colors.emerald },
              ]}
            >
              {pcOnline
                ? 'PC Online'
                : live.status === 'mismatch'
                  ? 'Altra Camp.'
                  : live.status === 'expired'
                    ? 'QR Scaduto'
                    : live.pairing
                      ? 'PC Offline'
                      : 'Collega QR'}
            </Text>
          </TouchableOpacity>
          {!pcOnline ? (
            <TouchableOpacity
              onPress={() => setManualPairingOpen(true)}
              style={styles.manualLinkHit}
              accessibilityRole="button"
              accessibilityLabel="Inserisci link QR manuale"
            >
              <Text style={styles.manualLinkText}>Link manuale</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* 2. SEGMENTED SUB-MODE SWITCHER: INIZIATIVA vs TAVOLO & PARTY */}
      <View style={styles.modeTabsWrap}>
        <TouchableOpacity
          style={[styles.modeTabBtn, subMode === 'combat' && styles.modeTabBtnActive]}
          onPress={() => setSubMode('combat')}
          accessibilityRole="tab"
          accessibilityState={{ selected: subMode === 'combat' }}
        >
          <Swords size={15} color={subMode === 'combat' ? colors.void : colors.parchmentMuted} />
          <Text style={[styles.modeTabText, subMode === 'combat' && styles.modeTabTextActive]}>
            Iniziativa{entries.length > 0 ? ` (${entries.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTabBtn, subMode === 'table' && styles.modeTabBtnActive]}
          onPress={() => setSubMode('table')}
          accessibilityRole="tab"
          accessibilityState={{ selected: subMode === 'table' }}
        >
          <Users size={15} color={subMode === 'table' ? colors.void : colors.parchmentMuted} />
          <Text style={[styles.modeTabText, subMode === 'table' && styles.modeTabTextActive]}>
            Tavolo & Party ({characters.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. MAIN SCROLLABLE CONSOLE BODY */}
      <ScrollView
        contentContainerStyle={[
          styles.container,
          subMode === 'combat' && styles.containerWithDock,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.brassLight}
            colors={[colors.brassBase]}
          />
        }
      >
        {/* Status Warnings */}
        {live.status === 'mismatch' ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>
              {live.error || 'La live appartiene a un’altra campagna. Seleziona la campagna corretta o scansiona un nuovo QR.'}
            </Text>
          </View>
        ) : null}
        {live.status === 'offline' && live.pairing ? (
          <View style={styles.warnBanner}>
            <Text style={styles.warnBannerText}>
              Sessione valida, PC momentaneamente non raggiungibile. Lo snapshot visibile può essere superato.
            </Text>
          </View>
        ) : null}
        {live.status === 'online' &&
        (live.controlsReady === false || snapshot?.controlsReady === false) ? (
          <View style={styles.warnBanner}>
            <Text style={styles.warnBannerText}>
              GM Screen online, ma il pannello iniziativa non è pronto sul PC (sola lettura).
            </Text>
          </View>
        ) : null}

        {subMode === 'combat' ? (
          <>
            {/* ROUND & TURN CONTROLS — IMMEDIATELY ABOVE THE FOLD */}
            <View style={styles.roundCard}>
              <View style={styles.roundBadge}>
                <Text style={styles.roundEyebrow}>ROUND</Text>
                <Text style={styles.roundNumber}>{snapshot?.roundNumber ?? '—'}</Text>
              </View>

              <TouchableOpacity
                disabled={pending || blocked || !snapshot}
                style={[styles.turnBtn, (pending || blocked || !snapshot) && styles.disabled]}
                onPress={() => void sendLiveCommand('initiative.prev_turn')}
                accessibilityRole="button"
                accessibilityLabel="Turno precedente"
              >
                <Text style={styles.turnBtnText}>◀ Prec</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={pending || blocked || !snapshot}
                style={[
                  styles.turnBtn,
                  styles.turnBtnPrimary,
                  (pending || blocked || !snapshot) && styles.disabled,
                ]}
                onPress={() => void sendLiveCommand('initiative.next_turn')}
                accessibilityRole="button"
                accessibilityLabel="Prossimo turno"
              >
                <Text style={[styles.turnBtnText, styles.turnBtnPrimaryText]}>Prossimo ▶</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={pending || blocked || !snapshot}
                style={[styles.resetIconBtn, (pending || blocked || !snapshot) && styles.disabled]}
                onPress={() =>
                  Alert.alert('Azzera round', 'Riportare il combattimento al round 1?', [
                    { text: 'Annulla', style: 'cancel' },
                    {
                      text: 'Azzera',
                      style: 'destructive',
                      onPress: () => void sendLiveCommand('initiative.reset_round'),
                    },
                  ])
                }
                accessibilityRole="button"
                accessibilityLabel="Azzera round"
              >
                <RotateCcw size={17} color={colors.parchmentMuted} />
              </TouchableOpacity>
            </View>

            {/* COMPACT TIMER BAR */}
            {snapshot ? (
              <View style={styles.timerRow}>
                <Text style={styles.timerLabel}>
                  ⏱ {snapshot.isTurnTimerRunning ? 'Timer attivo' : 'Timer fermo'} ·{' '}
                  {snapshot.turnElapsedSeconds ?? 0}s
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    style={styles.timerTouch}
                    disabled={pending || blocked}
                    onPress={() => void sendLiveCommand('initiative.toggle_timer')}
                  >
                    <Text style={styles.timerActionText}>
                      {snapshot.isTurnTimerRunning ? 'Pausa' : 'Avvia'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.timerTouch}
                    disabled={pending || blocked}
                    onPress={() => void sendLiveCommand('initiative.reset_turn_timer')}
                  >
                    <Text style={styles.timerActionText}>Azzera</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* SPOTLIGHT ACTIVE TURN */}
            {currentTurnEntry ? (
              <View style={styles.spotlightCard}>
                <Text style={styles.spotlightEyebrow}>È IL TURNO DI</Text>
                <Text style={styles.spotlightName}>{currentTurnEntry.name}</Text>
                <Text style={styles.spotlightMeta}>
                  Iniziativa {currentTurnEntry.initiative} · CA {currentTurnEntry.ac ?? '—'} ·{' '}
                  {currentTurnEntry.hp}/{currentTurnEntry.maxHp} PF
                </Text>
              </View>
            ) : null}

            {/* COMBATANTS LIST */}
            {entries.length === 0 ? (
              <View style={styles.emptyBox}>
                <Swords size={32} color={colors.brassBase} />
                <Text style={styles.emptyTitle}>
                  {live.status === 'unpaired'
                    ? 'Collega il GM Screen dal pulsante QR in alto'
                    : !snapshot
                      ? 'In attesa dello snapshot dal PC'
                      : 'Nessun combattente in iniziativa'}
                </Text>
                <Text style={styles.emptySub}>
                  {live.status === 'unpaired'
                    ? 'Inquadra il QR sul GM Screen web per controllare turni, PF, condizioni, comandi vocali e SFX da questa stessa console.'
                    : 'Aggiungi mostri dalla Wiki della campagna o avvia lo scontro sul GM Screen.'}
                </Text>
                {live.status === 'unpaired' ? (
                  <TouchableOpacity
                    style={styles.primaryCtaBtn}
                    onPress={() => setScannerModalOpen(true)}
                  >
                    <QrCode size={16} color={colors.void} />
                    <Text style={styles.primaryCtaText}>Scansiona QR GM Screen</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              entries.map((entry, idx) => {
                const isTurn = idx === snapshot?.currentTurnIndex;
                const activeConds = entry.conditions ?? [];
                return (
                  <View
                    key={entry.id}
                    style={[styles.entryCard, isTurn && styles.entryCardActive]}
                  >
                    <View style={styles.entryTop}>
                      <View style={styles.initBadge}>
                        <Text style={styles.initVal}>{entry.initiative}</Text>
                        <Text style={styles.initCap}>INIZ</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryName}>{entry.name}</Text>
                        <Text style={styles.entryMeta}>
                          CA {entry.ac ?? '—'} ·{' '}
                          <Text style={{ color: colors.parchmentLight, fontWeight: '800' }}>
                            {entry.hp}/{entry.maxHp} PF
                          </Text>{' '}
                          · inflitti {entry.damageDealt} · subiti {entry.damageTaken}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.iconHit44}
                        onPress={() =>
                          navigation.navigate('GmWiki', { initialQuery: entry.name })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Cerca ${entry.name} nella Wiki`}
                      >
                        <BookOpen size={16} color={colors.brassLight} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={pending || blocked}
                        style={styles.iconHit44}
                        onPress={() => removeEntry(entry)}
                        accessibilityRole="button"
                        accessibilityLabel={`Rimuovi ${entry.name}`}
                      >
                        <Trash2 size={16} color={colors.parchmentMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* WCAG 44pt HP Controls */}
                    <View style={styles.hpControlsRow}>
                      {[-5, -1, 1, 5].map((delta) => (
                        <TouchableOpacity
                          key={delta}
                          disabled={pending || blocked}
                          style={styles.hpBtn44}
                          onPress={() => adjustHp(entry, delta)}
                        >
                          <Text
                            style={[
                              styles.hpBtnText,
                              { color: delta < 0 ? colors.crimsonLight : colors.emerald },
                            ]}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        disabled={pending || blocked}
                        style={[styles.hpBtn44, styles.koBtn]}
                        onPress={() => adjustHp(entry, 'ko')}
                      >
                        <Text style={styles.koBtnText}>K.O.</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Active Conditions + Compact Sheet Trigger */}
                    <View style={styles.condsRow}>
                      {activeConds.map((cid) => (
                        <TouchableOpacity
                          key={cid}
                          disabled={pending || blocked}
                          style={styles.activeCondChip}
                          onPress={() => toggleCondition(entry, cid)}
                        >
                          <Text style={styles.activeCondText}>
                            {LIVE_CONDITION_LABELS[cid] ?? cid} ✕
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        disabled={pending || blocked}
                        style={styles.addCondChip}
                        onPress={() => setConditionsTargetId(entry.id)}
                      >
                        <Text style={styles.addCondText}>
                          + Condizione{activeConds.length > 0 ? ` (${activeConds.length})` : ''}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {!!notice && <Text style={styles.noticeLine}>{notice}</Text>}
            {!!snapshot?.updatedAt && (
              <Text style={styles.updatedLine}>
                Snapshot PC: {new Date(snapshot.updatedAt).toLocaleTimeString()}
              </Text>
            )}
          </>
        ) : (
          /* ================================================================
             SUB-MODE 2: TAVOLO & PARTY (Session Controls + Party Read-Only)
             ================================================================ */
          <>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Calendar size={16} color={colors.brassBase} />
                <Text style={styles.sectionTitle}>TAVOLO DI GIOCO ATTIVO</Text>
              </View>
            </View>

            {liveSession ? (
              <View style={styles.sessionCard}>
                <View style={styles.sessionTopRow}>
                  <View style={styles.statusLive}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>
                      {live.pairing
                        ? live.status === 'online'
                          ? 'LIVE PC'
                          : 'ULTIMA SESSIONE RICEVUTA'
                        : liveSession.status === 'scheduled'
                          ? 'PROGRAMMATA'
                          : 'IN CORSO'}
                    </Text>
                  </View>

                  {countdownInfo ? (
                    <View style={styles.countdownBadge}>
                      <Clock
                        size={12}
                        color={countdownInfo.isImminent ? colors.crimsonLight : colors.brassLight}
                      />
                      <Text
                        style={[
                          styles.countdownText,
                          countdownInfo.isImminent && { color: colors.crimsonLight },
                        ]}
                      >
                        {countdownInfo.label}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.sessionTitle}>
                  {liveSession.title ||
                    (live.pairing
                      ? snapshot?.sessionTitle || 'Sessione sul PC'
                      : 'Sessione campagna')}
                </Text>

                <View style={styles.sessionMetaRow}>
                  <View style={styles.sessionMetaItem}>
                    <MapPin size={13} color={colors.brassLight} />
                    <Text style={styles.sessionMetaText}>
                      {liveSession.location || 'Barber & Dragons · Tavolo Taverna'}
                    </Text>
                  </View>
                  <View style={styles.sessionMetaItem}>
                    <Users size={13} color={colors.brassLight} />
                    <Text style={styles.sessionMetaText}>
                      Max {liveSession.max_players ?? 6} posti
                    </Text>
                  </View>
                </View>

                <View style={styles.sessionCtaRow}>
                  <TouchableOpacity
                    style={styles.secondaryActionBtn}
                    onPress={() => setSignupsModalOpen(true)}
                  >
                    <Users size={15} color={colors.brassLight} />
                    <Text style={styles.secondaryActionText}>Iscritti</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.secondaryActionBtn,
                      !!live.pairing && (!liveSession || live.status !== 'online') && styles.disabled,
                    ]}
                    disabled={!!live.pairing && (!liveSession || live.status !== 'online')}
                    onPress={() =>
                      navigation.navigate('GmXpAttendance', {
                        notificationSessionId: liveSession.id,
                      })
                    }
                  >
                    <Award size={15} color={colors.brassLight} />
                    <Text style={styles.secondaryActionText}>Presenze & XP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.secondaryActionBtn}
                    onPress={() => setAudioSheetOpen(true)}
                  >
                    <Radio size={15} color={colors.brassLight} />
                    <Text style={styles.secondaryActionText}>Audio</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.emptyBox}>
                <Calendar size={26} color={colors.parchmentMuted} />
                <Text style={styles.emptyTitle}>
                  {live.pairing
                    ? 'Nessuna sessione selezionata sul GM Screen'
                    : 'Nessuna sessione programmata'}
                </Text>
                <Text style={styles.emptySub}>
                  {live.pairing
                    ? 'Seleziona una sessione dal GM Screen sul PC oppure scollega la live.'
                    : 'Pianifica o gestisci le sessioni dal calendario nella Home.'}
                </Text>
              </View>
            )}

            {criticalCharacters.length > 0 ? (
              <View style={styles.criticalBanner}>
                <ShieldAlert size={16} color={colors.crimsonLight} />
                <Text style={styles.criticalText}>
                  Attenzione: {criticalCharacters.length} eroe/i sotto il 30% PF!
                </Text>
              </View>
            ) : null}

            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Activity size={16} color={colors.brassBase} />
                <Text style={styles.sectionTitle}>VITALI PARTY · TOCCA PER DOSSIER</Text>
              </View>
              <Text style={styles.sectionCount}>{characters.length} Eroi</Text>
            </View>

            {characters.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptySub}>
                  Nessun personaggio registrato in questa campagna.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {characters.map((char) => {
                  const effective = resolveEffectiveCharacterFields(char);
                  const hasCurrentHp = effective.hitPoints !== null;
                  const currentHp = effective.hitPoints ?? 0;
                  const maxHp = effective.maxHp;
                  const hpPercent =
                    hasCurrentHp && maxHp && maxHp > 0
                      ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100))
                      : 0;
                  const isDead = hasCurrentHp && currentHp === 0;
                  const isDanger =
                    hasCurrentHp && maxHp !== null && maxHp > 0 && currentHp < maxHp * 0.3;

                  return (
                    <TouchableOpacity
                      key={char.id}
                      style={[
                        styles.partyCard,
                        isDead && styles.cardKo,
                        isDanger && !isDead && styles.cardDanger,
                      ]}
                      onPress={() => setSelectedPartyChar(char)}
                      activeOpacity={0.82}
                    >
                      <View style={styles.partyTop}>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.charName, isDead && styles.charNameDead]}
                            numberOfLines={1}
                          >
                            {effective.name || char.name}
                          </Text>
                          <Text style={styles.charClass} numberOfLines={1}>
                            {effective.characterClass || 'Avventuriero'} · Liv{' '}
                            {effective.level || 1}
                          </Text>
                        </View>
                        <View style={styles.caBadge}>
                          <Shield size={12} color={colors.brassLight} />
                          <Text style={styles.caText}>CA {char.armor_class || 14}</Text>
                        </View>
                      </View>

                      {maxHp !== null ? (
                        <View style={styles.hpBarTrack}>
                          <View
                            style={[
                              styles.hpBarFill,
                              {
                                width: `${hpPercent}%`,
                                backgroundColor: isDead
                                  ? colors.crimson
                                  : isDanger
                                    ? colors.crimsonLight
                                    : hpPercent < 60
                                      ? colors.brassBase
                                      : colors.emerald,
                              },
                            ]}
                          />
                        </View>
                      ) : null}

                      <View style={styles.partyBottom}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Heart
                            size={13}
                            color={isDead || isDanger ? colors.crimsonLight : colors.emerald}
                          />
                          <Text
                            style={[
                              styles.charHp,
                              isDanger && { color: colors.crimsonLight, fontWeight: '800' },
                            ]}
                          >
                            {maxHp !== null ? `${currentHp} / ${maxHp} PF` : `${currentHp} PF`}
                          </Text>
                        </View>
                        {isDead ? (
                          <View style={styles.koPill}>
                            <Skull size={10} color={colors.parchmentLight} />
                            <Text style={styles.koPillText}>K.O.</Text>
                          </View>
                        ) : (
                          <Text style={styles.dossierHint}>Dossier →</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* 4. THUMB-REACH FLOATING ACTION DOCK IN COMBAT MODE */}
      {subMode === 'combat' ? (
        <View style={styles.bottomDock}>
          <TouchableOpacity
            style={[styles.dockBtn, pendingProposal && styles.dockBtnHighlight]}
            onPress={() => setVoiceSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Apri comando vocale o IA per il GM Screen"
          >
            <Mic size={17} color={pendingProposal ? colors.void : colors.brassLight} />
            <Text style={[styles.dockBtnText, pendingProposal && { color: colors.void }]}>
              {pendingProposal ? 'Rivedi Proposta' : 'Voce / IA'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dockBtn}
            onPress={() => setAudioSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Apri telecomando rapido audio e SFX"
          >
            <Radio size={17} color={colors.brassLight} />
            <Text style={styles.dockBtnText}>Audio SFX</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={blocked}
            style={[styles.dockBtnPrimary, blocked && styles.disabled]}
            onPress={() => setAddCombatantOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Aggiungi combattente dalla Wiki o manualmente"
          >
            <Plus size={17} color={colors.void} />
            <Text style={styles.dockBtnPrimaryText}>Aggiungi</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* MODALS & SHEETS */}
      <CampaignSelectorModal
        visible={campaignModalVisible}
        onClose={() => setCampaignModalVisible(false)}
      />

      <GmQrScannerModal
        visible={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onScan={(result) => {
          void live.pair(result);
        }}
      />

      <Modal
        visible={manualPairingOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setManualPairingOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
        >
          <View style={styles.manualBackdrop}>
            <View style={styles.manualCard}>
              <Text style={styles.manualTitle}>Collega il GM Screen</Text>
              <Text style={styles.manualDesc}>
                Incolla il link QR completo oppure inserisci Session Public ID e token segreto.
              </Text>
              <TextInput
                ref={manualPairingInputRef}
                style={styles.manualInput}
                placeholder="Link QR o Session Public ID"
                placeholderTextColor={colors.parchmentMuted}
                autoCapitalize="none"
                autoCorrect={false}
                value={manualPairingInput}
                onChangeText={setManualPairingInput}
              />
              <TextInput
                style={styles.manualInput}
                placeholder="Token segreto"
                placeholderTextColor={colors.parchmentMuted}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                value={manualPairingToken}
                onChangeText={setManualPairingToken}
              />
              <View style={styles.manualActions}>
                <TouchableOpacity
                  style={styles.timerTouch}
                  onPress={() => setManualPairingOpen(false)}
                >
                  <Text style={styles.timerActionText}>Annulla</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryCtaBtn}
                  onPress={() => void handleManualPairing()}
                >
                  <Text style={styles.primaryCtaText}>Verifica e collega</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <GmVoiceCommandSheet
        visible={voiceSheetOpen}
        blocked={blocked}
        onClose={() => setVoiceSheetOpen(false)}
        onNotice={setNotice}
      />

      <GmQuickAudioSheet
        visible={audioSheetOpen}
        pcOnline={pcOnline}
        onClose={() => setAudioSheetOpen(false)}
        onOpenFullAudio={() => navigation.navigate('GmAudioRemote')}
      />

      <GmAddCombatantModal
        visible={addCombatantOpen}
        campaignId={activeCampaign?.id ?? null}
        blocked={blocked}
        onAdd={handleAddCombatant}
        onClose={() => setAddCombatantOpen(false)}
      />

      <GmCombatConditionsSheet
        entry={conditionsTargetEntry}
        disabled={pending || blocked}
        onToggleCondition={toggleCondition}
        onClose={() => setConditionsTargetId(null)}
      />

      {liveSession ? (
        <GmSessionSignupsModal
          visible={signupsModalOpen}
          onClose={() => setSignupsModalOpen(false)}
          session={liveSession}
          onSignupsUpdated={refreshSessionData}
        />
      ) : null}

      <GmPartyDossierModal
        character={selectedPartyChar}
        onClose={() => setSelectedPartyChar(null)}
        onWhisperPlayer={(playerId) =>
          navigation.navigate('GmWhispers', { targetPlayerId: playerId })
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.void,
  },
  topConsoleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  campaignPill: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  campaignEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.7,
  },
  campaignName: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.parchmentLight,
  },
  pairingGroup: {
    alignItems: 'flex-end',
    gap: 2,
  },
  pairingPill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  pairingIdle: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassBase,
  },
  pairingOnline: {
    backgroundColor: colors.visibilityPublicBg,
    borderColor: colors.visibilityPublicBorder,
  },
  pairingError: {
    backgroundColor: colors.visibilitySecretBg,
    borderColor: colors.visibilitySecretBorder,
  },
  pairingPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  manualLinkHit: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  manualLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  modeTabsWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  modeTabBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    backgroundColor: colors.stoneSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  modeTabBtnActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassBase,
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentMuted,
  },
  modeTabTextActive: {
    color: colors.void,
  },
  container: {
    padding: 14,
    paddingBottom: 32,
  },
  containerWithDock: {
    paddingBottom: 96,
  },
  errorBanner: {
    backgroundColor: colors.visibilitySecretBg,
    borderWidth: 1,
    borderColor: colors.visibilitySecretBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  errorBannerText: {
    color: colors.visibilitySecret,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  warnBanner: {
    backgroundColor: colors.visibilitySelectiveBg,
    borderWidth: 1,
    borderColor: colors.visibilitySelectiveBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  warnBannerText: {
    color: colors.brassLight,
    fontSize: 12,
    lineHeight: 17,
  },
  roundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 10,
    marginBottom: 8,
  },
  roundBadge: {
    minWidth: 52,
    alignItems: 'center',
  },
  roundEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
  },
  roundNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.brassLight,
  },
  turnBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  turnBtnPrimary: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassBase,
  },
  turnBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  turnBtnPrimaryText: {
    color: colors.void,
    fontWeight: '900',
  },
  resetIconBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  timerLabel: {
    color: colors.parchmentMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  timerTouch: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  timerActionText: {
    color: colors.brassLight,
    fontSize: 12,
    fontWeight: '800',
  },
  spotlightCard: {
    backgroundColor: colors.stoneHighlight,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    padding: 14,
    marginBottom: 12,
  },
  spotlightEyebrow: {
    color: colors.brassLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  spotlightName: {
    color: colors.parchmentLight,
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 3,
  },
  spotlightMeta: {
    color: colors.parchmentMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  entryCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  entryCardActive: {
    borderColor: colors.brassBase,
    borderWidth: 1.5,
    backgroundColor: colors.stoneHighlight,
  },
  entryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  initBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initVal: {
    color: colors.brassLight,
    fontSize: 16,
    fontWeight: '900',
  },
  initCap: {
    color: colors.parchmentMuted,
    fontSize: 9,
    fontWeight: '800',
  },
  entryName: {
    color: colors.parchmentLight,
    fontSize: 15,
    fontWeight: '800',
  },
  entryMeta: {
    color: colors.parchmentMuted,
    fontSize: 12,
    marginTop: 2,
  },
  iconHit44: {
    minWidth: 40,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hpControlsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  hpBtn44: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hpBtnText: {
    fontSize: 13,
    fontWeight: '900',
  },
  koBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: colors.crimson,
  },
  koBtnText: {
    color: colors.crimsonLight,
    fontSize: 12,
    fontWeight: '900',
  },
  condsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  activeCondChip: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.visibilitySelectiveBg,
    borderWidth: 1,
    borderColor: colors.brassBase,
    justifyContent: 'center',
  },
  activeCondText: {
    color: colors.brassLight,
    fontSize: 12,
    fontWeight: '800',
  },
  addCondChip: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    justifyContent: 'center',
  },
  addCondText: {
    color: colors.parchmentMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  noticeLine: {
    color: colors.brassLight,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  updatedLine: {
    color: colors.parchmentMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  bottomDock: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.stone,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
  },
  dockBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  dockBtnHighlight: {
    backgroundColor: colors.brassLight,
    borderColor: colors.brassLight,
  },
  dockBtnText: {
    color: colors.parchmentLight,
    fontSize: 12,
    fontWeight: '800',
  },
  dockBtnPrimary: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: colors.brassBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  dockBtnPrimaryText: {
    color: colors.void,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.9,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  sessionCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 14,
    marginBottom: 16,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.visibilityPublicBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.emerald,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.visibilityPublic,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.parchmentLight,
    marginBottom: 8,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 12,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionMetaText: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  sessionCtaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    color: colors.brassLight,
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.parchmentLight,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  primaryCtaBtn: {
    minHeight: 46,
    paddingHorizontal: 16,
    borderRadius: 9,
    backgroundColor: colors.brassBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  primaryCtaText: {
    color: colors.void,
    fontSize: 13,
    fontWeight: '900',
  },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.visibilitySecretBg,
    borderWidth: 1,
    borderColor: colors.visibilitySecretBorder,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  criticalText: {
    color: colors.visibilitySecret,
    fontSize: 13,
    fontWeight: '800',
  },
  partyCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    gap: 8,
  },
  cardKo: {
    borderColor: colors.crimson,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  cardDanger: {
    borderColor: colors.crimsonLight,
  },
  partyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  charName: {
    color: colors.parchmentLight,
    fontSize: 15,
    fontWeight: '800',
  },
  charNameDead: {
    textDecorationLine: 'line-through',
    color: colors.parchmentMuted,
  },
  charClass: {
    color: colors.parchmentMuted,
    fontSize: 12,
    marginTop: 2,
  },
  caBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  caText: {
    color: colors.parchmentLight,
    fontSize: 12,
    fontWeight: '800',
  },
  hpBarTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.stone,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  partyBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charHp: {
    color: colors.parchmentLight,
    fontSize: 13,
    fontWeight: '700',
  },
  dossierHint: {
    color: colors.brassLight,
    fontSize: 12,
    fontWeight: '700',
  },
  koPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.crimson,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  koPillText: {
    color: colors.parchmentLight,
    fontSize: 10,
    fontWeight: '900',
  },
  manualBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
  },
  manualCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 16,
    gap: 10,
  },
  manualTitle: {
    color: colors.parchmentLight,
    fontSize: 16,
    fontWeight: '900',
  },
  manualDesc: {
    color: colors.parchmentMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  manualInput: {
    minHeight: 46,
    color: colors.parchmentLight,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  manualActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
});

export default GmRegiaScreen;
