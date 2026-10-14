import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Crown,
  Play,
  Users,
  Swords,
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
  Plus,
  Skull,
  Clock,
  MapPin,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { GmCreateSessionModal } from '../../components/gm/GmCreateSessionModal';
import { GmSessionSignupsModal } from '../../components/gm/GmSessionSignupsModal';
import { GmSessionsManagerModal } from '../../components/gm/GmSessionsManagerModal';
import { Session } from '../../types';

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
    characters,
    isLoading,
    isRefreshing,
    updateCharacterHp,
    refreshSessionData,
    refreshCampaigns,
  } = useGmCampaigns();

  // Modals state
  const [campaignModalVisible, setCampaignModalVisible] = useState<boolean>(false);
  const [createSessionModalVisible, setCreateSessionModalVisible] = useState<boolean>(false);
  const [signupsModalVisible, setSignupsModalVisible] = useState<boolean>(false);
  const [sessionsManagerModalVisible, setSessionsManagerModalVisible] = useState<boolean>(false);
  const [selectedSessionForSignups, setSelectedSessionForSignups] = useState<Session | null>(null);

  // HP modifications pending states
  const [pendingHpIds, setPendingHpIds] = useState<Set<string>>(new Set());
  const pendingHpIdsRef = useRef<Set<string>>(new Set());

  const gmName =
    profile?.display_name ||
    profile?.nickname ||
    user?.email?.split('@')[0] ||
    'Game Master';

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshCampaigns(), refreshSessionData()]);
  }, [refreshCampaigns, refreshSessionData]);

  // Statistics
  const completedSessionsCount = sessions.filter((s) => s.status === 'completed').length;
  const criticalCharacters = characters.filter((c) => {
    const maxHp = c.hit_points || 30;
    const currentHp = typeof c.hit_points === 'number' ? c.hit_points : 30;
    return currentHp < maxHp * 0.3;
  });
  const avgLevel =
    characters.length > 0
      ? Math.round(characters.reduce((acc, c) => acc + (c.level || 1), 0) / characters.length)
      : 1;

  // Next session countdown
  const countdownInfo = useMemo(() => {
    if (!activeSession?.scheduled_at) return null;
    return computeCountdown(activeSession.scheduled_at);
  }, [activeSession?.scheduled_at]);

  const handleAdjustHp = async (characterId: string, currentHp: number, delta: number) => {
    if (pendingHpIdsRef.current.has(characterId)) return;
    const nextHp = Math.max(0, currentHp + delta);
    const nextPending = new Set(pendingHpIdsRef.current);
    nextPending.add(characterId);
    pendingHpIdsRef.current = nextPending;
    setPendingHpIds(nextPending);
    try {
      const saved = await updateCharacterHp(characterId, nextHp);
      if (!saved) {
        Alert.alert('Salvataggio non riuscito', 'I PF non sono stati aggiornati. Aggiorna la campagna e riprova.');
      }
    } finally {
      const remaining = new Set(pendingHpIdsRef.current);
      remaining.delete(characterId);
      pendingHpIdsRef.current = remaining;
      setPendingHpIds(remaining);
    }
  };

  const openSignupsForSession = (sess: Session) => {
    setSelectedSessionForSignups(sess);
    setSignupsModalVisible(true);
  };

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

        {/* 1. SESSIONE ATTIVA / TAVOLO LIVE */}
        <View style={styles.sectionHeader}>
          <Calendar size={18} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>TAVOLO DI GIOCO ATTIVO</Text>
        </View>

        {activeSession ? (
          <View style={styles.sessionCard}>
            <View style={styles.sessionTopRow}>
              <View style={styles.statusLive}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>
                  {activeSession.status === 'scheduled' ? 'PROGRAMMATA' : 'IN CORSO'}
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
              {activeSession.title || 'Sessione Ufficiale al Tavolo'}
            </Text>

            <View style={styles.sessionDetailsRow}>
              <View style={styles.sessionDetailItem}>
                <MapPin size={13} color={colors.brassLight} />
                <Text style={styles.sessionInfoText}>
                  {activeSession.location || 'Barber & Dragons · Tavolo Taverna'}
                </Text>
              </View>

              <View style={styles.sessionDetailItem}>
                <Users size={13} color={colors.brassLight} />
                <Text style={styles.sessionInfoText}>
                  Max {activeSession.max_players ?? 6} posti
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
                <Text style={styles.launchCombatBtnText}>Avvia Regia (Iniziativa)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.manageSignupsActionBtn}
                onPress={() => openSignupsForSession(activeSession)}
                activeOpacity={0.8}
              >
                <Users size={13} color={colors.brassLight} />
                <Text style={styles.manageSignupsActionText}>Iscritti</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noSessionCard}>
            <Calendar size={24} color={colors.parchmentMuted} />
            <Text style={styles.noSessionTitle}>Nessuna Sessione Programmata</Text>
            <Text style={styles.noSessionSub}>
              Crea un nuovo tavolo per consentire ai giocatori di prenotarsi.
            </Text>
            <TouchableOpacity
              style={styles.createSessionInlineBtn}
              onPress={() => setCreateSessionModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={13} color={colors.void} />
              <Text style={styles.createSessionInlineText}>+ Nuovo Tavolo</Text>
            </TouchableOpacity>
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
            <Text style={styles.sectionTitle}>MONITOR VITALI DEL PARTY (LIVE)</Text>
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
              const maxHp = char.hit_points || 30;
              const currentHp = typeof char.hit_points === 'number' ? char.hit_points : 30;
              const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
              const isDead = currentHp === 0;
              const isDanger = currentHp < maxHp * 0.3;

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
                  <View style={styles.hpBarContainer}>
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
                        {currentHp} / {maxHp} HP
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

                  {/* Quick in-line HP Adjusters */}
                  <View style={styles.quickHpAdjustRow}>
                    <TouchableOpacity
                      style={styles.quickHpBtnMinus}
                      disabled={pendingHpIds.has(char.id)}
                      onPress={() => handleAdjustHp(char.id, currentHp, -5)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickHpMinusText}>-5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickHpBtnMinus}
                      disabled={pendingHpIds.has(char.id)}
                      onPress={() => handleAdjustHp(char.id, currentHp, -1)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickHpMinusText}>-1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickHpBtnPlus}
                      disabled={pendingHpIds.has(char.id)}
                      onPress={() => handleAdjustHp(char.id, currentHp, +1)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickHpPlusText}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickHpBtnPlus}
                      disabled={pendingHpIds.has(char.id)}
                      onPress={() => handleAdjustHp(char.id, currentHp, +5)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickHpPlusText}>+5</Text>
                    </TouchableOpacity>
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
          {/* Initiative Combat Tracker Shortcut */}
          <TouchableOpacity
            style={styles.toolTile}
            onPress={() => navigation.navigate('GmCombat')}
            activeOpacity={0.8}
          >
            <View style={styles.toolTileIcon}>
              <Swords size={22} color={colors.brassLight} />
            </View>
            <Text style={styles.toolTileTitle}>Combattimento</Text>
            <Text style={styles.toolTileDesc}>Iniziativa, Mostri & Condizioni</Text>
            <View style={styles.toolTileGo}>
              <ChevronRight size={14} color={colors.brassLight} />
            </View>
          </TouchableOpacity>

          {/* XP & Attendance Shortcut */}
          <TouchableOpacity
            style={styles.toolTile}
            onPress={() => navigation.navigate('GmXpAttendance')}
            activeOpacity={0.8}
          >
            <View style={styles.toolTileIcon}>
              <Award size={22} color={colors.brassLight} />
            </View>
            <Text style={styles.toolTileTitle}>Presenze & XP</Text>
            <Text style={styles.toolTileDesc}>Erogazione & Registro Gilda</Text>
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

          {/* Sessions & Signups Hub Shortcut */}
          <TouchableOpacity
            style={styles.toolTile}
            onPress={() => setSessionsManagerModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.toolTileIcon}>
              <Calendar size={22} color={colors.brassLight} />
            </View>
            <Text style={styles.toolTileTitle}>Tavoli & Iscritti</Text>
            <Text style={styles.toolTileDesc}>Gestisci iscrizioni e orari</Text>
            <View style={styles.toolTileGo}>
              <ChevronRight size={14} color={colors.brassLight} />
            </View>
          </TouchableOpacity>

          {/* Create Session Shortcut */}
          <TouchableOpacity
            style={styles.toolTile}
            onPress={() => setCreateSessionModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.toolTileIcon}>
              <Plus size={22} color={colors.brassLight} />
            </View>
            <Text style={styles.toolTileTitle}>+ Nuovo Tavolo</Text>
            <Text style={styles.toolTileDesc}>Crea e apri le iscrizioni</Text>
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

      {/* Create New Session Modal */}
      <GmCreateSessionModal
        visible={createSessionModalVisible}
        onClose={() => setCreateSessionModalVisible(false)}
        campaignId={activeCampaign?.id}
        onSessionCreated={() => {
          refreshSessionData();
        }}
      />

      {/* Session Signups Modal */}
      {selectedSessionForSignups && (
        <GmSessionSignupsModal
          visible={signupsModalVisible}
          onClose={() => {
            setSignupsModalVisible(false);
            setSelectedSessionForSignups(null);
          }}
          session={selectedSessionForSignups}
          onSignupsUpdated={() => {
            refreshSessionData();
          }}
        />
      )}

      {/* All Sessions Calendar & Signups Manager */}
      <GmSessionsManagerModal
        visible={sessionsManagerModalVisible}
        onClose={() => setSessionsManagerModalVisible(false)}
        campaignId={activeCampaign?.id}
        campaignTitle={activeCampaign?.name}
        onRequestCreateSession={() => {
          setCreateSessionModalVisible(true);
        }}
      />
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
