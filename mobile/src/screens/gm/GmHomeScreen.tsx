import React, { useState, useRef, useMemo, useCallback } from 'react';
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
  RefreshControl,
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
  Clock,
  MapPin,
  CheckCircle2,
  Compass,
  Flame,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { CAMPAIGN_TYPE_BADGES, CAMPAIGN_TYPE_LABELS } from '../../contexts/CampaignContext';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { GmCreateSessionModal } from '../../components/gm/GmCreateSessionModal';
import { GmSessionSignupsModal } from '../../components/gm/GmSessionSignupsModal';
import { GmSessionsManagerModal } from '../../components/gm/GmSessionsManagerModal';
import type { GmTabParamList } from '../../navigation/GmTabNavigator';
import { Campaign, CampaignType, Session } from '../../types';

type SessionFilter = 'all' | 'scheduled' | 'completed';
type CampaignFilter = 'all' | 'oneshot' | 'quest' | 'long' | 'torneo';

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

function formatSessionDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { dayName: 'Data da definire', dayNum: '', month: '', time: '' };
    }
    const days = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const dayName = days[d.getDay()];
    const dayNum = String(d.getDate());
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return {
      dayName,
      dayNum,
      month,
      time: `${hours}:${mins}`,
    };
  } catch {
    return { dayName: 'Data non valida', dayNum: '', month: '', time: '' };
  }
}

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
    isRefreshing,
    updateCharacterHp,
    refreshSessionData,
    refreshCampaigns,
  } = useGmCampaigns();

  // Filters state
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all');
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>('all');

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
  const scheduledSessionsCount = sessions.filter((s) => s.status === 'scheduled').length;
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

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    let list = [...sessions];
    if (sessionFilter === 'scheduled') {
      list = list.filter((s) => s.status === 'scheduled');
    } else if (sessionFilter === 'completed') {
      list = list.filter((s) => s.status === 'completed');
    }
    return list.sort((a, b) => (a.scheduled_at > b.scheduled_at ? -1 : 1));
  }, [sessions, sessionFilter]);

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    if (campaignFilter === 'all') return campaigns;
    return campaigns.filter((c) => c.type === campaignFilter);
  }, [campaigns, campaignFilter]);

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

  const handleSelectCampaign = async (camp: Campaign) => {
    if (camp.id === activeCampaign?.id) return;
    try {
      await selectCampaign(camp.id);
      Alert.alert('Campagna Attiva', `"${camp.name}" è ora la campagna selezionata per la Regia.`);
    } catch {
      Alert.alert('Errore', 'Impossibile selezionare la campagna.');
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

        {/* Master Quick Stats Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Crown size={12} color={colors.brassLight} />
              <Text style={styles.roleBadgeText}>PLANCIA REGIA DI GILDA</Text>
            </View>
            <View style={styles.fameBadge}>
              <Sparkles size={12} color={colors.brassBase} />
              <Text style={styles.fameBadgeText}>
                {campaigns.length} Campagne
              </Text>
            </View>
          </View>

          <Text style={styles.welcomeTitle}>Regia Master, {gmName}</Text>
          <Text style={styles.welcomeSubtitle}>
            Supervisiona i tavoli di gioco, i vitali del party e organizza le prossime sessioni della Gilda.
          </Text>

          {/* Quick Stats Strip */}
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
        </View>

        {/* 1. SPOTLIGHT PROSSIMA SESSIONE AL TAVOLO */}
        <View style={styles.sectionHeader}>
          <Calendar size={18} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>PROSSIMA SESSIONE IN PROGRAMMA</Text>
        </View>

        {activeSession ? (
          <View style={styles.sessionCard}>
            <View style={styles.sessionTopRow}>
              <View style={styles.campaignTag}>
                <Text style={styles.campaignTagText}>
                  {activeCampaign?.name || 'CAMPAGNA ATTIVA'}
                </Text>
              </View>

              <View style={styles.statusLive}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>
                  {activeSession.status === 'scheduled' ? 'PROGRAMMATA' : 'ATTIVA'}
                </Text>
              </View>
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

              {countdownInfo && (
                <View style={styles.countdownBadge}>
                  <Clock size={12} color={countdownInfo.isImminent ? colors.void : colors.brassLight} />
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

            {/* Quick Action Buttons for Active Session */}
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
            <Calendar size={28} color={colors.parchmentMuted} />
            <Text style={styles.noSessionTitle}>Nessuna Sessione Programmata</Text>
            <Text style={styles.noSessionSub}>
              Crea una nuova sessione per aprire le iscrizioni ai giocatori.
            </Text>
            <TouchableOpacity
              style={styles.createSessionInlineBtn}
              onPress={() => setCreateSessionModalVisible(true)}
              activeOpacity={0.8}
            >
              <Plus size={14} color={colors.void} />
              <Text style={styles.createSessionInlineText}>Crea Sessione Ora</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. CALENDARIO COMPLETO TAVOLI DI GILDA (COME SUL SITO) */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={18} color={colors.brassBase} />
            <Text style={styles.sectionTitle}>CALENDARIO SESSIONI DI GILDA</Text>
          </View>
          <TouchableOpacity
            style={styles.createHeaderBtn}
            onPress={() => setCreateSessionModalVisible(true)}
            activeOpacity={0.8}
          >
            <Plus size={12} color={colors.void} />
            <Text style={styles.createHeaderBtnText}>Nuovo Tavolo</Text>
          </TouchableOpacity>
        </View>

        {/* Filtri Sessioni */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, sessionFilter === 'all' && styles.filterPillActive]}
            onPress={() => setSessionFilter('all')}
          >
            <Text style={[styles.filterPillText, sessionFilter === 'all' && styles.filterPillTextActive]}>
              Tutti ({sessions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, sessionFilter === 'scheduled' && styles.filterPillActive]}
            onPress={() => setSessionFilter('scheduled')}
          >
            <Text style={[styles.filterPillText, sessionFilter === 'scheduled' && styles.filterPillTextActive]}>
              In Programma ({scheduledSessionsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, sessionFilter === 'completed' && styles.filterPillActive]}
            onPress={() => setSessionFilter('completed')}
          >
            <Text style={[styles.filterPillText, sessionFilter === 'completed' && styles.filterPillTextActive]}>
              Conclusi ({completedSessionsCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista Rapida Sessioni del Master */}
        {filteredSessions.slice(0, 4).map((session) => {
          const dateMeta = formatSessionDate(session.scheduled_at);
          const isCompleted = session.status === 'completed';

          return (
            <View key={session.id} style={styles.miniSessionCard}>
              <View style={styles.miniSessionDateBox}>
                <Text style={styles.miniSessionDayNum}>{dateMeta.dayNum}</Text>
                <Text style={styles.miniSessionMonth}>{dateMeta.month}</Text>
                <Text style={styles.miniSessionTime}>{dateMeta.time}</Text>
              </View>

              <View style={styles.miniSessionInfo}>
                <Text style={styles.miniSessionCampName}>
                  {activeCampaign?.name || 'CAMPAGNA'}
                </Text>
                <Text style={styles.miniSessionTitle} numberOfLines={1}>
                  {session.title || 'Sessione di Gioco'}
                </Text>
                <View style={styles.miniSessionOccupancy}>
                  <Users size={11} color={colors.brassLight} />
                  <Text style={styles.miniSessionOccupancyText}>
                    Max {session.max_players ?? 6} posti • {session.location || 'Taverna'}
                  </Text>
                </View>
              </View>

              <View style={styles.miniSessionAction}>
                <TouchableOpacity
                  style={styles.gmManageMiniBtn}
                  onPress={() => openSignupsForSession(session)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.gmManageMiniText}>Gestisci</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {sessions.length > 4 && (
          <TouchableOpacity
            style={styles.viewAllSessionsButton}
            onPress={() => setSessionsManagerModalVisible(true)}
            activeOpacity={0.8}
          >
            <Calendar size={14} color={colors.brassLight} />
            <Text style={styles.viewAllSessionsText}>
              Gestisci Tutti i {sessions.length} Tavoli
            </Text>
            <ChevronRight size={14} color={colors.brassLight} />
          </TouchableOpacity>
        )}

        {/* 3. PANORAMICA DI TUTTE LE CAMPAGNE DELLA GILDA (COME SUL SITO) */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Swords size={18} color={colors.brassBase} />
            <Text style={styles.sectionTitle}>TUTTE LE CAMPAGNE DELLA GILDA</Text>
          </View>
          {campaigns.length > 1 && (
            <TouchableOpacity
              style={styles.switchCampaignBtn}
              onPress={() => setCampaignModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.switchCampaignText}>Selettore</Text>
              <ChevronDown size={13} color={colors.brassLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtri Formato Campagna */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.campaignFiltersScroll}
        >
          <TouchableOpacity
            style={[styles.filterPill, campaignFilter === 'all' && styles.filterPillActive]}
            onPress={() => setCampaignFilter('all')}
          >
            <Text style={[styles.filterPillText, campaignFilter === 'all' && styles.filterPillTextActive]}>
              Tutte ({campaigns.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, campaignFilter === 'oneshot' && styles.filterPillActive]}
            onPress={() => setCampaignFilter('oneshot')}
          >
            <Text style={[styles.filterPillText, campaignFilter === 'oneshot' && styles.filterPillTextActive]}>
              One Shot
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, campaignFilter === 'quest' && styles.filterPillActive]}
            onPress={() => setCampaignFilter('quest')}
          >
            <Text style={[styles.filterPillText, campaignFilter === 'quest' && styles.filterPillTextActive]}>
              Quest
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, campaignFilter === 'long' && styles.filterPillActive]}
            onPress={() => setCampaignFilter('long')}
          >
            <Text style={[styles.filterPillText, campaignFilter === 'long' && styles.filterPillTextActive]}>
              Campagne Long
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, campaignFilter === 'torneo' && styles.filterPillActive]}
            onPress={() => setCampaignFilter('torneo')}
          >
            <Text style={[styles.filterPillText, campaignFilter === 'torneo' && styles.filterPillTextActive]}>
              Torneo
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Griglia/Elenco Campagne */}
        {filteredCampaigns.slice(0, 4).map((camp) => {
          const cType: CampaignType = camp.type || 'quest';
          const badgeMeta = CAMPAIGN_TYPE_BADGES[cType] || CAMPAIGN_TYPE_BADGES.quest;
          const isActive = camp.id === activeCampaign?.id;

          return (
            <View key={camp.id} style={[styles.campaignCard, isActive && styles.campaignCardActive]}>
              <View style={styles.campaignCardBody}>
                <View style={styles.campaignCardHeaderRow}>
                  <View
                    style={[
                      styles.campaignTypeBadge,
                      { backgroundColor: badgeMeta.bg, borderColor: badgeMeta.border },
                    ]}
                  >
                    <Text style={[styles.campaignTypeBadgeText, { color: badgeMeta.text }]}>
                      {badgeMeta.label}
                    </Text>
                  </View>

                  {isActive ? (
                    <View style={styles.activePill}>
                      <Check size={11} color={colors.void} />
                      <Text style={styles.activePillText}>IN REGIA</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.selectCampPill}
                      onPress={() => handleSelectCampaign(camp)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.selectCampPillText}>Seleziona</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.campaignCardTitle}>{camp.name}</Text>
                <Text style={styles.campaignCardDesc} numberOfLines={2}>
                  {camp.description || 'Nessuna descrizione disponibile.'}
                </Text>

                <View style={styles.campaignCardFooter}>
                  <View style={styles.campFooterMeta}>
                    <Crown size={12} color={colors.brassLight} />
                    <Text style={styles.campFooterMetaText}>
                      {camp.is_public ? 'Campagna Pubblica' : 'Campagna Privata'}
                    </Text>
                  </View>

                  <View style={styles.campFooterMeta}>
                    <Users size={12} color={colors.parchmentMuted} />
                    <Text style={styles.campFooterMetaText}>
                      {isActive ? 'In Uso Ora' : 'Disponibile'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* 4. MONITOR VITALI DEL PARTY IN TEMPO REALE */}
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
              <Text style={styles.emptyPartyText}>Nessun personaggio associato alla campagna attiva.</Text>
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

        {/* 5. STRUMENTI RAPIDI REGIA TAVOLO */}
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
  headerCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.stoneBorder,
    padding: 16,
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  fameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  fameBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassBase,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.parchmentLight,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    lineHeight: 17,
    marginBottom: 14,
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.stone,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 2,
  },
  statDesc: {
    fontSize: 9,
    color: colors.parchmentMuted,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.stoneBorder,
    alignSelf: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 14,
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
  createHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  createHeaderBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.void,
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
    marginBottom: 6,
  },
  campaignTag: {
    backgroundColor: colors.stone,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  campaignTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.5,
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
  sessionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 8,
  },
  sessionDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  sessionInfoText: {
    fontSize: 11,
    color: colors.parchmentMuted,
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
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  noSessionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 8,
    marginBottom: 4,
  },
  noSessionSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  createSessionInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createSessionInlineText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  filterPillActive: {
    backgroundColor: colors.brassDark,
    borderColor: colors.brassBase,
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  filterPillTextActive: {
    color: colors.brassLight,
  },
  miniSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  miniSessionDateBox: {
    backgroundColor: colors.stone,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: 'center',
    minWidth: 46,
  },
  miniSessionDayNum: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.brassLight,
    lineHeight: 18,
  },
  miniSessionMonth: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.parchmentMuted,
    textTransform: 'uppercase',
  },
  miniSessionTime: {
    fontSize: 8,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  miniSessionInfo: {
    flex: 1,
  },
  miniSessionCampName: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.brassBase,
    letterSpacing: 0.5,
  },
  miniSessionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 1,
  },
  miniSessionOccupancy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  miniSessionOccupancyText: {
    fontSize: 9,
    color: colors.parchmentMuted,
  },
  miniSessionAction: {
    marginLeft: 4,
  },
  gmManageMiniBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 5,
  },
  gmManageMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  viewAllSessionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  viewAllSessionsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  campaignFiltersScroll: {
    gap: 6,
    paddingBottom: 8,
  },
  campaignCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    marginBottom: 10,
    overflow: 'hidden',
  },
  campaignCardActive: {
    borderColor: colors.brassBase,
  },
  campaignCardBody: {
    padding: 12,
  },
  campaignCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  campaignTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  campaignTypeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.void,
  },
  selectCampPill: {
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  selectCampPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brassLight,
  },
  campaignCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 3,
  },
  campaignCardDesc: {
    fontSize: 10,
    color: colors.parchmentMuted,
    lineHeight: 14,
    marginBottom: 8,
  },
  campaignCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 8,
  },
  campFooterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  campFooterMetaText: {
    fontSize: 10,
    color: colors.parchmentMuted,
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

export default GmHomeScreen;
