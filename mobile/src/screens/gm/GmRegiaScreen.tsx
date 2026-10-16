import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Crown,
  Play,
  Users,
  Radio,
  MessageSquare,
  Award,
  ChevronRight,
  ShieldAlert,
  Heart,
  Shield,
  ChevronDown,
  Calendar,
  Sparkles,
  Activity,
  Skull,
  Clock,
  MapPin,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { useGmLive } from '../../contexts/GmLiveContext';
import { useIsFocused } from '@react-navigation/native';
import { GmQrScannerModal } from '../../components/gm/GmQrScannerModal';
import { QrCode } from 'lucide-react-native';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { parseGmRemoteQr } from '../../utils/qrParser';

function computeCountdown(scheduledAt: string): { label: string; isImminent: boolean } {
  try {
    const now = new Date().getTime();
    const target = new Date(scheduledAt).getTime();
    const diffMs = target - now;

    if (diffMs <= 0) {
      return { label: 'In corso adesso!', isImminent: true };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    const remainingHours = diffHours % 24;

    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
        return { label: `Tra ${diffMins} minuti!`, isImminent: true };
      }
      return { label: `Oggi · Tra ${diffHours} ore`, isImminent: true };
    } else if (diffDays === 1) {
      return { label: `Domani (${remainingHours}h)`, isImminent: false };
    } else {
      return { label: `Tra ${diffDays} gg e ${remainingHours} ore`, isImminent: false };
    }
  } catch {
    return { label: 'In arrivo', isImminent: false };
  }
}

export const GmRegiaScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { profile, user } = useAuth();
  const {
    campaigns,
    activeCampaign,
    sessions,
    activeSession,
    selectSession,
    characters,
    isLoading,
    isRefreshing,
    refreshSessionData,
    refreshCampaigns,
  } = useGmCampaigns();

  // Campaign selection and QR scan dialogs.
  const [campaignModalVisible, setCampaignModalVisible] = useState<boolean>(false);

  const [scannerModalOpen, setScannerModalOpen] = useState(false);
  const [manualPairingOpen, setManualPairingOpen] = useState(false);
  const [manualPairingInput, setManualPairingInput] = useState('');
  const [manualPairingToken, setManualPairingToken] = useState('');
  const manualPairingInputRef = useRef<TextInput>(null);
  const isFocused = useIsFocused();
  const live = useGmLive();
  useEffect(() => {
    live.setSnapshotConsumer('regia', isFocused);
    return () => live.setSnapshotConsumer('regia', false);
  }, [isFocused, live.setSnapshotConsumer]);

  const liveSession = live.pairing
    ? live.campaignId === activeCampaign?.id && live.snapshot?.sessionId
      ? sessions.find((session) => session.id === live.snapshot?.sessionId) || null
      : null
    : activeSession;
  useEffect(() => {
    if (live.status === 'online' && live.snapshot?.sessionId) selectSession(live.snapshot.sessionId);
  }, [live.status, live.snapshot?.sessionId, selectSession]);

  useEffect(() => {
    if (!manualPairingOpen) return;
    const focusTimer = setTimeout(() => manualPairingInputRef.current?.focus(), 350);
    return () => clearTimeout(focusTimer);
  }, [manualPairingOpen]);

  const gmName =
    profile?.display_name ||
    profile?.nickname ||
    user?.email?.split('@')[0] ||
    'Game Master';

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshCampaigns(), refreshSessionData()]);
  }, [refreshCampaigns, refreshSessionData]);

  const handleManualPairing = async () => {
    const parsed = parseGmRemoteQr(manualPairingInput);
    const token = manualPairingToken.trim() || parsed?.token || '';
    if (!parsed || !token) {
      Alert.alert('Dati non validi', 'Incolla il link QR completo oppure inserisci Public ID e token.');
      return;
    }
    const paired = await live.pair({ ...parsed, token });
    if (!paired) {
      Alert.alert('Collegamento non riuscito', live.error || 'La sessione non è valida per la campagna selezionata.');
      return;
    }
    setManualPairingOpen(false);
    setManualPairingInput('');
    setManualPairingToken('');
  };

  // Statistics
  const completedSessionsCount = sessions.filter((s) => s.status === 'completed').length;
  const criticalCharacters = characters.filter((c) => {
    const maxHp = Number((c.rules_snapshot as any)?.max_hp);
    return Number.isFinite(maxHp) && maxHp > 0 && typeof c.hit_points === 'number' && c.hit_points < maxHp * 0.3;
  });
  const avgLevel =
    characters.length > 0
      ? Math.round(characters.reduce((acc, c) => acc + (c.level || 1), 0) / characters.length)
      : 1;

  // Next session countdown
  const countdownInfo = useMemo(() => {
    if (!liveSession?.scheduled_at) return null;
    return computeCountdown(liveSession.scheduled_at);
  }, [liveSession?.scheduled_at]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
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
        {/* Active Campaign Header Bar */}
        <View style={styles.campaignHeaderBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.campaignHeaderTag}>CAMPAGNA IN REGIA</Text>
            <Text style={styles.campaignHeaderName} numberOfLines={1}>
              {activeCampaign?.name || 'Seleziona una Campagna'}
            </Text>
          </View>
          {campaigns.length > 1 && (
            <TouchableOpacity
              style={styles.switchCampBtn}
              onPress={() => setCampaignModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.switchCampText}>Cambia</Text>
              <ChevronDown size={12} color={colors.brassLight} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.livePairingCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.livePairingTitle}>
              {live.status === 'online' ? 'PC ONLINE' : live.status === 'offline' ? 'PC NON RAGGIUNGIBILE' : live.status === 'mismatch' ? 'CAMPAGNA DIVERSA' : live.status === 'expired' ? 'SESSIONE SCADUTA' : live.status === 'checking' ? 'VERIFICA LIVE…' : 'COLLEGA IL GM SCREEN'}
            </Text>
            <Text style={styles.livePairingText} numberOfLines={2}>
              {live.pairing
                ? `${live.campaignId === activeCampaign?.id ? activeCampaign?.name || 'Campagna collegata' : 'Live collegata a un’altra campagna'}${live.error ? ` · ${live.error}` : ''}`
                : 'Scansiona il QR sul GM Screen per condividere iniziativa e audio tra le schermate.'}
            </Text>
          </View>
          <View style={styles.livePairingActions}>
            <TouchableOpacity style={styles.livePairingButton} onPress={() => setScannerModalOpen(true)} activeOpacity={0.8}>
              <QrCode size={15} color={colors.void} />
              <Text style={styles.livePairingButtonText}>{live.pairing ? 'Ricollega' : 'Scansiona QR'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setManualPairingOpen(true)}>
              <Text style={styles.liveManualPairingLink}>Incolla link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. SESSIONE ATTIVA / TAVOLO LIVE */}
        <View style={styles.sectionHeader}>
          <Calendar size={18} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>TAVOLO DI GIOCO ATTIVO</Text>
        </View>

        {liveSession ? (
          <View style={styles.sessionCard}>
            <View style={styles.sessionTopRow}>
              <View style={styles.statusLive}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>
                  {live.pairing ? live.status === 'online' ? 'LIVE PC' : 'ULTIMA SESSIONE RICEVUTA' : liveSession.status === 'scheduled' ? 'PROGRAMMATA' : 'IN CORSO'}
                </Text>
              </View>

              {countdownInfo && (
                <View style={styles.countdownBadge}>
                  <Clock size={11} color={countdownInfo.isImminent ? colors.void : colors.brassLight} />
                  <Text
                    style={[
                      styles.countdownText,
                      countdownInfo.isImminent && styles.countdownTextImminent,
                    ]}
                  >
                    {countdownInfo.label}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.sessionTitle}>
              {liveSession.title || (live.pairing ? live.snapshot?.sessionTitle || 'Sessione sul PC' : 'Sessione campagna · non collegata')}
            </Text>

            <View style={styles.sessionDetailsRow}>
              <View style={styles.sessionDetailItem}>
                <MapPin size={13} color={colors.brassLight} />
                <Text style={styles.sessionInfoText}>
                  {liveSession.location || 'Barber & Dragons · Tavolo Taverna'}
                </Text>
              </View>

              <View style={styles.sessionDetailItem}>
                <Users size={13} color={colors.brassLight} />
                <Text style={styles.sessionInfoText}>
                  Max {liveSession.max_players ?? 6} posti
                </Text>
              </View>
            </View>

            {/* Main Action Buttons */}
            <View style={styles.sessionActionRow}>
              <TouchableOpacity
                style={styles.launchCombatBtn}
                onPress={() => navigation.navigate('GmCombat')}
                activeOpacity={0.85}
              >
                <Play size={14} color={colors.void} />
                <Text style={styles.launchCombatBtnText}>Iniziativa</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noSessionCard}>
            <Calendar size={24} color={colors.parchmentMuted} />
            <Text style={styles.noSessionTitle}>{live.pairing ? live.snapshot?.sessionId ? 'Sessione live non trovata in questa campagna' : 'Nessuna sessione selezionata sul PC' : 'Nessuna Sessione Programmata'}</Text>
            <Text style={styles.noSessionSub}>
              {live.pairing ? 'Regia mostra solo la sessione effettivamente selezionata dal GM Screen.' : 'Pianifica tavoli e iscrizioni dalla Home.'}
            </Text>
          </View>
        )}

        {/* 2. MONITOR VITALI DEL PARTY IN TEMPO REALE */}
        {criticalCharacters.length > 0 && (
          <View style={styles.criticalNoticeBanner}>
            <ShieldAlert size={16} color={colors.crimsonLight} />
            <Text style={styles.criticalNoticeText}>
              Attenzione: {criticalCharacters.length} personaggio/i a rischio K.O.!
            </Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Activity size={16} color={colors.brassBase} />
            <Text style={styles.sectionTitle}>PARTY CAMPAGNA · SOLA LETTURA</Text>
          </View>
          <Text style={styles.sectionSubCount}>{characters.length} Eroi</Text>
        </View>

        <View style={styles.partyGrid}>
          {characters.length === 0 ? (
            <View style={styles.emptyPartyBox}>
              <Text style={styles.emptyPartyText}>
                Nessun personaggio presente in questa campagna.
              </Text>
            </View>
          ) : (
            characters.map((char) => {
            const currentHp = typeof char.hit_points === 'number' ? char.hit_points : 0;
            const maxHpValue = Number((char.rules_snapshot as any)?.max_hp);
            const maxHp = Number.isFinite(maxHpValue) && maxHpValue > 0 ? maxHpValue : null;
            const hpPercent = maxHp ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
              const isDead = currentHp === 0;
              const isDanger = maxHp !== null && currentHp < maxHp * 0.3;

              return (
                <View
                  key={char.id}
                  style={[
                    styles.partyMemberCard,
                    isDead && styles.cardKo,
                    isDanger && !isDead && styles.cardDanger,
                  ]}
                >
                  <View style={styles.partyMemberTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.charName, isDead && styles.charNameDead]} numberOfLines={1}>
                        {char.name}
                      </Text>
                      <Text style={styles.charClass} numberOfLines={1}>
                        {char.character_class || 'Avventuriero'} • Liv {char.level || 1}
                      </Text>
                    </View>

                    {/* CA Shield */}
                    <View style={styles.caBadge}>
                      <Shield size={11} color={colors.parchmentMuted} />
                      <Text style={styles.caText}>CA {char.armor_class || 14}</Text>
                    </View>
                  </View>

                  {/* HP Health bar */}
                  {maxHp !== null && <View style={styles.hpBarContainer}>
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
                  </View>}

                  {/* HP Numbers & Status */}
                  <View style={styles.hpInfoRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Heart
                        size={12}
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
                      <View style={styles.koBadge}>
                        <Skull size={9} color={colors.parchmentLight} />
                        <Text style={styles.koBadgeText}>K.O.</Text>
                      </View>
                    ) : isDanger ? (
                      <Text style={styles.dangerLabel}>Critico</Text>
                    ) : null}
                  </View>

                </View>
              );
            })
          )}
        </View>

        {/* 3. STRUMENTI RAPIDI REGIA */}
        <View style={styles.sectionHeader}>
          <Crown size={16} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>STRUMENTI RAPIDI REGIA</Text>
        </View>

        <View style={styles.toolsRow}>
          {/* XP & Attendance Shortcut */}
          <TouchableOpacity
            style={styles.toolTile}
            disabled={!!live.pairing && (!liveSession || live.status !== 'online')}
            onPress={() => navigation.navigate('GmXpAttendance', liveSession ? { notificationSessionId: liveSession.id } : undefined)}
            activeOpacity={0.8}
          >
            <View style={styles.toolTileIcon}>
              <Award size={22} color={colors.brassLight} />
            </View>
            <Text style={styles.toolTileTitle}>Presenze & XP</Text>
            <Text style={styles.toolTileDesc}>{live.pairing && !liveSession ? 'In attesa della sessione selezionata sul PC' : 'Erogazione & Registro Gilda'}</Text>
            <View style={styles.toolTileGo}>
              <ChevronRight size={14} color={colors.brassLight} />
            </View>
          </TouchableOpacity>

          {/* Audio Remote Shortcut */}
          <TouchableOpacity
            style={styles.toolTile}
            onPress={() => navigation.navigate('GmAudioRemote')}
            activeOpacity={0.8}
          >
            <View style={styles.toolTileIcon}>
              <Radio size={22} color={colors.brassLight} />
            </View>
            <Text style={styles.toolTileTitle}>Telecomando Audio</Text>
            <Text style={styles.toolTileDesc}>Musica & 12 Pad SFX Realtime</Text>
            <View style={styles.toolTileGo}>
              <ChevronRight size={14} color={colors.brassLight} />
            </View>
          </TouchableOpacity>

          {/* Whispers Shortcut */}
          <TouchableOpacity
            style={styles.toolTile}
            onPress={() => navigation.navigate('GmWhispers')}
            activeOpacity={0.8}
          >
            <View style={styles.toolTileIcon}>
              <MessageSquare size={22} color={colors.brassLight} />
            </View>
            <Text style={styles.toolTileTitle}>Whispers Segreti</Text>
            <Text style={styles.toolTileDesc}>Messaggi privati dai giocatori</Text>
            <View style={styles.toolTileGo}>
              <ChevronRight size={14} color={colors.brassLight} />
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Campaign Selection Modal */}
      <CampaignSelectorModal
        visible={campaignModalVisible}
        onClose={() => setCampaignModalVisible(false)}
      />

      <GmQrScannerModal
        visible={scannerModalOpen}
        onClose={() => setScannerModalOpen(false)}
        onScan={(result) => { void live.pair(result); }}
      />
      <Modal visible={manualPairingOpen} transparent animationType="slide" onRequestClose={() => setManualPairingOpen(false)}>
        <KeyboardAvoidingView style={styles.manualModalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
          <View style={styles.manualModalBackdrop}>
            <View style={styles.manualModalCard}>
            <Text style={styles.manualModalTitle}>Collega il GM Screen</Text>
            <Text style={styles.manualModalDescription}>Incolla il link QR completo, oppure Public ID e token. Il collegamento viene verificato sulla campagna selezionata.</Text>
            <TextInput ref={manualPairingInputRef} style={styles.manualPairingInput} placeholder="Link QR o Session Public ID" placeholderTextColor={colors.parchmentMuted} autoCapitalize="none" autoCorrect={false} autoFocus accessibilityLabel="Link QR o Session Public ID" accessibilityHint="Incolla il link QR completo o inserisci il Public ID" value={manualPairingInput} onChangeText={setManualPairingInput} />
            <TextInput style={styles.manualPairingInput} placeholder="Token segreto" placeholderTextColor={colors.parchmentMuted} autoCapitalize="none" autoCorrect={false} secureTextEntry accessibilityLabel="Token segreto di collegamento" value={manualPairingToken} onChangeText={setManualPairingToken} />
            <View style={styles.manualModalActions}>
              <TouchableOpacity onPress={() => setManualPairingOpen(false)}><Text style={styles.liveManualPairingLink}>Annulla</Text></TouchableOpacity>
              <TouchableOpacity style={styles.livePairingButton} onPress={() => void handleManualPairing()}><Text style={styles.livePairingButtonText}>Verifica e collega</Text></TouchableOpacity>
            </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  livePairingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  livePairingTitle: {
    color: colors.brassLight,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  livePairingText: {
    color: colors.parchmentMuted,
    fontSize: 10,
    lineHeight: 14,
  },
  livePairingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  livePairingButtonText: {
    color: colors.void,
    fontSize: 10,
    fontWeight: '800',
  },
  livePairingActions: { alignItems: 'center', gap: 6 },
  liveManualPairingLink: { color: colors.brassLight, fontSize: 9, fontWeight: '800', padding: 3 },
  manualModalKeyboard: { flex: 1 },
  manualModalBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.72)' },
  manualModalCard: { backgroundColor: colors.stoneSurface, borderWidth: 1, borderColor: colors.brassDark, borderRadius: 12, padding: 16, gap: 10 },
  manualModalTitle: { color: colors.parchmentLight, fontSize: 16, fontWeight: '900' },
  manualModalDescription: { color: colors.parchmentMuted, fontSize: 11, lineHeight: 16 },
  manualPairingInput: { color: colors.parchmentLight, backgroundColor: colors.stone, borderWidth: 1, borderColor: colors.stoneBorder, borderRadius: 7, paddingHorizontal: 10, paddingVertical: 9, fontSize: 11 },
  manualModalActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  campaignHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  campaignHeaderTag: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  campaignHeaderName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.parchmentLight,
    marginTop: 2,
  },
  switchCampBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  switchCampText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 1,
  },
  sectionSubCount: {
    fontSize: 10,
    color: colors.parchmentMuted,
    fontWeight: '700',
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
    gap: 5,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.emerald,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  countdownTextImminent: {
    color: colors.crimsonLight,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 8,
  },
  sessionDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionInfoText: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  sessionActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  launchCombatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingVertical: 8,
    borderRadius: 7,
  },
  launchCombatBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  manageSignupsActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
  },
  manageSignupsActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  noSessionCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  noSessionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 6,
    marginBottom: 2,
  },
  noSessionSub: {
    fontSize: 10,
    color: colors.parchmentMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  createSessionInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createSessionInlineText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.void,
  },
  criticalNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.crimson,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  criticalNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.crimsonLight,
  },
  partyGrid: {
    gap: 8,
    marginBottom: 16,
  },
  emptyPartyBox: {
    backgroundColor: colors.stoneSurface,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
  },
  emptyPartyText: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  partyMemberCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 10,
  },
  cardKo: {
    borderColor: colors.crimson,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  cardDanger: {
    borderColor: colors.crimsonLight,
  },
  partyMemberTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  charName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  charNameDead: {
    color: colors.parchmentMuted,
    textDecorationLine: 'line-through',
  },
  charClass: {
    fontSize: 10,
    color: colors.parchmentMuted,
  },
  caBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.stone,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  caText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  hpBarContainer: {
    height: 6,
    backgroundColor: colors.stone,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  hpInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  charHp: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  dangerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  koBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.crimson,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  koBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.parchmentLight,
  },
  quickHpAdjustRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickHpBtnMinus: {
    flex: 1,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 4,
  },
  quickHpMinusText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  quickHpBtnPlus: {
    flex: 1,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 4,
  },
  quickHpPlusText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.emerald,
  },
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  toolTile: {
    width: '48%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    position: 'relative',
  },
  toolTileIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toolTileTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 2,
  },
  toolTileDesc: {
    fontSize: 9,
    color: colors.brassLight,
    lineHeight: 13,
  },
  toolTileGo: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
});

export default GmRegiaScreen;
