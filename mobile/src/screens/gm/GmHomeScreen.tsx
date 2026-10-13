import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  Crown,
  Repeat,
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
  Check,
  Calendar,
  Sparkles,
  Activity,
  Plus,
  Minus,
  Skull,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { GmCreateSessionModal } from '../../components/gm/GmCreateSessionModal';
import { GmSessionSignupsModal } from '../../components/gm/GmSessionSignupsModal';
import { GmSessionsManagerModal } from '../../components/gm/GmSessionsManagerModal';
import type { GmTabParamList } from '../../navigation/GmTabNavigator';

export const GmHomeScreen: React.FC = () => {
  const navigation = useNavigation<BottomTabNavigationProp<GmTabParamList>>();
  const { profile, user, role, switchMode } = useAuth();
  const {
    campaigns,
    activeCampaign,
    selectCampaign,
    sessions,
    activeSession,
    characters,
    isLoading,
    updateCharacterHp,
    refreshSessionData,
  } = useGmCampaigns();

  const [campaignModalVisible, setCampaignModalVisible] = useState<boolean>(false);
  const [createSessionModalVisible, setCreateSessionModalVisible] = useState<boolean>(false);
  const [signupsModalVisible, setSignupsModalVisible] = useState<boolean>(false);
  const [sessionsManagerModalVisible, setSessionsManagerModalVisible] = useState<boolean>(false);
  const [pendingHpIds, setPendingHpIds] = useState<Set<string>>(new Set());
  const pendingHpIdsRef = useRef<Set<string>>(new Set());

  const gmName =
    profile?.display_name ||
    profile?.nickname ||
    user?.email?.split('@')[0] ||
    'Game Master';

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

  const formatSessionDate = (dateStr?: string) => {
    if (!dateStr) return 'Prossimamente';
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('it-IT', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
  };

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* GM Mode Switcher Banner */}
        <View style={styles.switcherBanner}>
          <View style={styles.switchBannerLeft}>
            <Crown size={18} color={colors.brassLight} />
            <View>
              <Text style={styles.switchBannerTitle}>MODALITÀ GAME MASTER</Text>
              <Text style={styles.switchBannerSub}>Benvenuto, Master {gmName}</Text>
            </View>
          </View>
          {role === 'admin' && (
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => switchMode('player')}
              activeOpacity={0.8}
            >
              <Repeat size={13} color={colors.void} />
              <Text style={styles.switchButtonText}>Vista Giocatore</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Master Active Campaign Card */}
        <View style={styles.directorCard}>
          <View style={styles.directorTopRow}>
            <Text style={styles.campaignStatus}>CAMPAGNA ATTIVA</Text>
            {campaigns.length > 1 && (
              <TouchableOpacity
                style={styles.switchCampaignBtn}
                onPress={() => setCampaignModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.switchCampaignText}>Cambia</Text>
                <ChevronDown size={13} color={colors.brassLight} />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.campaignName}>
            {activeCampaign?.name || 'Caricamento Campagna...'}
          </Text>

          <Text style={styles.campaignDescription} numberOfLines={2}>
            {activeCampaign?.description || 'Nessuna descrizione per questa campagna.'}
          </Text>

          {/* Quick Campaign Stats Strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statBox}>
              <Users size={14} color={colors.brassLight} />
              <Text style={styles.statVal}>{characters.length}</Text>
              <Text style={styles.statDesc}>Eroi al Tavolo</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Activity size={14} color={colors.emerald} />
              <Text style={styles.statVal}>Liv. {avgLevel}</Text>
              <Text style={styles.statDesc}>Livello Medio</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Award size={14} color={colors.brassLight} />
              <Text style={styles.statVal}>{completedSessionsCount}</Text>
              <Text style={styles.statDesc}>Sessioni Svolte</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Active / Next Session Info */}
          <View style={styles.activeSessionRow}>
            <View style={styles.sessionStatusBadge}>
              <View
                style={[
                  styles.pulseDot,
                  { backgroundColor: activeSession?.status === 'scheduled' ? colors.emerald : colors.brassLight },
                ]}
              />
              <View style={{ flex: 1, paddingRight: 6 }}>
                <Text style={styles.sessionStatusText} numberOfLines={1}>
                  {activeSession?.title || 'Sessione da programmare'}
                </Text>
                <Text style={styles.sessionTimeText} numberOfLines={1}>
                  {formatSessionDate(activeSession?.scheduled_at)}
                  {activeSession?.location ? ` • ${activeSession.location}` : ''}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.launchSessionBtn}
              onPress={() => navigation.navigate('GmCombat')}
              activeOpacity={0.85}
            >
              <Play size={13} color={colors.void} />
              <Text style={styles.launchSessionText}>Avvia Regia</Text>
            </TouchableOpacity>
          </View>

          {/* Session Management Quick Bar */}
          <View style={styles.sessionManageBar}>
            {activeSession ? (
              <TouchableOpacity
                style={styles.manageSignupsBtn}
                onPress={() => setSignupsModalVisible(true)}
                activeOpacity={0.75}
              >
                <Users size={13} color={colors.brassLight} />
                <Text style={styles.manageSignupsBtnText}>Gestisci Iscritti</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.createSessionPillBtn}
              onPress={() => setCreateSessionModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={13} color={colors.void} />
              <Text style={styles.createSessionPillText}>+ Nuova Sessione</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.calendarAllBtn}
              onPress={() => setSessionsManagerModalVisible(true)}
              activeOpacity={0.75}
            >
              <Calendar size={13} color={colors.parchmentMuted} />
              <Text style={styles.calendarAllBtnText}>Tutti i Tavoli ({sessions.length})</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Party Vitals Warning Bar if someone is bleeding/KO */}
        {criticalCharacters.length > 0 && (
          <View style={styles.criticalNoticeBanner}>
            <ShieldAlert size={16} color={colors.crimsonLight} />
            <Text style={styles.criticalNoticeText}>
              Attenzione: {criticalCharacters.length} personaggio/i a rischio K.O.!
            </Text>
          </View>
        )}

        {/* Live Party Vitals Monitor */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Activity size={16} color={colors.brassBase} />
            <Text style={styles.sectionTitle}>MONITOR VITALI DEL PARTY IN TEMPO REALE</Text>
          </View>
          <Text style={styles.sectionSubCount}>{characters.length} Eroi</Text>
        </View>

        <View style={styles.partyGrid}>
          {characters.length === 0 ? (
            <View style={styles.emptyPartyBox}>
              <Text style={styles.emptyPartyText}>Nessun personaggio associato.</Text>
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

        {/* Quick Tools Grid (Shortcuts to Tabs) */}
        <View style={styles.sectionHeader}>
          <Crown size={16} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>STRUMENTI RAPIDI REGIA TAVOLO</Text>
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
            <Text style={styles.toolTileDesc}>Calendario e lista giocatori</Text>
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

      {/* Active Session Signups Modal */}
      {activeSession && (
        <GmSessionSignupsModal
          visible={signupsModalVisible}
          onClose={() => setSignupsModalVisible(false)}
          session={activeSession}
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
  switcherBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  switchBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  switchBannerTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  switchBannerSub: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  switchButtonText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.void,
  },
  directorCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.stoneBorder,
    padding: 16,
    marginBottom: 16,
  },
  directorTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  campaignStatus: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 1,
  },
  switchCampaignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  switchCampaignText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brassLight,
  },
  campaignName: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 4,
  },
  campaignDescription: {
    fontSize: 11,
    color: colors.parchmentMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.stone,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 2,
  },
  statDesc: {
    fontSize: 8,
    color: colors.parchmentMuted,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.stoneBorder,
    alignSelf: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.stoneBorder,
    marginVertical: 12,
  },
  activeSessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  sessionTimeText: {
    fontSize: 9,
    color: colors.parchmentMuted,
  },
  launchSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  launchSessionText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  sessionManageBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    alignItems: 'center',
  },
  manageSignupsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
  },
  manageSignupsBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  createSessionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createSessionPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.void,
  },
  calendarAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  calendarAllBtnText: {
    fontSize: 10,
    color: colors.parchmentMuted,
    fontWeight: '600',
  },
  criticalNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: colors.crimson,
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  criticalNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.crimsonLight,
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
    letterSpacing: 1.1,
    color: colors.parchmentMuted,
  },
  sectionSubCount: {
    fontSize: 10,
    color: colors.brassLight,
    fontWeight: '700',
  },
  partyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  emptyPartyBox: {
    width: '100%',
    padding: 20,
    backgroundColor: colors.stoneSurface,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyPartyText: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  partyMemberCard: {
    width: '48%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 10,
    justifyContent: 'space-between',
  },
  cardKo: {
    borderColor: colors.crimson,
    opacity: 0.6,
  },
  cardDanger: {
    borderColor: colors.crimsonLight,
  },
  partyMemberTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 4,
  },
  charName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  charNameDead: {
    textDecorationLine: 'line-through',
  },
  charClass: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  caBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.stone,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  caText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  hpBarContainer: {
    height: 4,
    backgroundColor: colors.stone,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 6,
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 2,
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
    gap: 2,
    backgroundColor: colors.crimson,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  koBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  quickHpAdjustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 6,
  },
  quickHpBtnMinus: {
    flex: 1,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
  },
  quickHpMinusText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  quickHpBtnPlus: {
    flex: 1,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 3,
    borderRadius: 4,
    alignItems: 'center',
  },
  quickHpPlusText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.emerald,
  },
  toolsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolTile: {
    position: 'relative',
    width: '48%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
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
  modalTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  modalOptionActive: {
    backgroundColor: colors.stone,
    borderRadius: 6,
  },
  modalOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  modalOptionTextActive: {
    color: colors.brassLight,
  },
  modalOptionSub: {
    fontSize: 10,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
});

export default GmHomeScreen;
