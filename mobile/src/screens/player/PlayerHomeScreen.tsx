import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield,
  Calendar,
  Sparkles,
  Award,
  ChevronRight,
  Repeat,
  AlertCircle,
  Dices,
  Clock,
  Heart,
  Swords,
  Coins,
  MapPin,
  CheckCircle2,
  Users,
  Compass,
  Check,
  BookOpen,
  MessageSquare,
  Flame,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign, CAMPAIGN_TYPE_BADGES, CAMPAIGN_TYPE_LABELS } from '../../contexts/CampaignContext';
import { usePlayerCharacter } from '../../hooks/usePlayerCharacter';
import { usePlayerSessions } from '../../hooks/usePlayerSessions';
import { DiceRollerModal } from '../../components/player/DiceRollerModal';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { GridCalendar } from '../../components/common/GridCalendar';
import { ExpandableCampaignCard } from '../../components/common/ExpandableCampaignCard';
import { RoleModeSwitcher } from '../../components/common/RoleModeSwitcher';
import { PlayerSessionDetailModal } from '../../components/player/PlayerSessionDetailModal';
import { CampaignGuideModal } from '../../components/player/CampaignGuideModal';
import { ELDARIA_CAMPAIGN_ID } from '../../lib/long-campaign-helpers';
import { Campaign, CampaignType, PlayerSession, Session } from '../../types';

type SessionFilter = 'all' | 'mine' | 'available';
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

export const PlayerHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { profile, user, role } = useAuth();

  const {
    campaigns,
    activeCampaign,
    activeCampaignId,
    selectCampaign,
    refreshCampaigns,
    assignedCharactersMap,
    gmNamesByCampaignId,
    sessionDirectoryMeta,
    confirmedGuideCampaignIds,
    confirmCampaignGuide,
    joinedCampaignIds,
    isLongCampaignActive,
    isMemberOfActiveCampaign,
    hasJoinedLongCampaign,
    canAccessCharacterSheet,
    joinLongCampaign,
  } = useCampaign();
  const [joiningLong, setJoiningLong] = useState(false);
  const [guideCampaign, setGuideCampaign] = useState<Campaign | null>(null);

  const {
    safeCharacter,
    hasAssignedCharacter,
    loading: charLoading,
    refresh: refreshCharacter,
  } = usePlayerCharacter();

  const {
    sessions,
    allSessions,
    nextConfirmedSession,
    loading: sessionsLoading,
    error: sessionsError,
    refresh: refreshSessions,
    signUpForSession,
    cancelSignUp,
  } = usePlayerSessions();

  // Filters state
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all');
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>('all');
  const [showAllCampaigns, setShowAllCampaigns] = useState<boolean>(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Modals state
  const [isDiceModalOpen, setIsDiceModalOpen] = useState<boolean>(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState<boolean>(false);
  const [selectedSessionIdForDetail, setSelectedSessionIdForDetail] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const selectedSessionForDetail = useMemo<PlayerSession | null>(() => {
    if (!selectedSessionIdForDetail) return null;
    return (
      allSessions.find((s) => s.id === selectedSessionIdForDetail) ||
      sessions.find((s) => s.id === selectedSessionIdForDetail) ||
      null
    );
  }, [selectedSessionIdForDetail, allSessions, sessions]);

  const displayName =
    profile?.display_name ||
    profile?.nickname ||
    user?.email?.split('@')[0] ||
    'Avventuriero';

  const isRefreshing = charLoading || sessionsLoading;

  const onRefresh = useCallback(async () => {
    refreshCharacter();
    await Promise.all([refreshCampaigns(), refreshSessions()]);
  }, [refreshCharacter, refreshCampaigns, refreshSessions]);

  // Next session details
  const targetSession = nextConfirmedSession;
  const countdownInfo = useMemo(() => {
    if (!targetSession?.scheduled_at) return null;
    return computeCountdown(targetSession.scheduled_at);
  }, [targetSession?.scheduled_at]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    let list = [...sessions];
    const nowIso = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    list = list.filter((s) => s.scheduled_at >= nowIso);

    if (sessionFilter === 'mine') {
      list = list.filter((s) => s.isConfirmed);
    } else if (sessionFilter === 'available') {
      list = list.filter((s) => !s.isFull && !s.isConfirmed);
    }

    return list.sort((a, b) => (a.scheduled_at > b.scheduled_at ? 1 : -1));
  }, [sessions, sessionFilter]);

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    if (campaignFilter === 'all') return campaigns;
    return campaigns.filter((c) => c.type === campaignFilter);
  }, [campaigns, campaignFilter]);

  const upcomingSessionByCampaignId = useMemo(() => {
    const map = new Map<string, Session>();
    const cutoff = Date.now() - 3600 * 1000;
    for (const s of allSessions || []) {
      if (s.campaign_id && !map.has(s.campaign_id) && new Date(s.scheduled_at).getTime() >= cutoff) {
        map.set(s.campaign_id, s);
      }
    }
    return map;
  }, [allSessions]);

  const visibleCampaigns = useMemo(() => {
    if (showAllCampaigns || filteredCampaigns.length <= 6) return filteredCampaigns;
    const initial = filteredCampaigns.slice(0, 6);
    if (activeCampaignId && !initial.some((c) => c.id === activeCampaignId)) {
      const activeInFiltered = filteredCampaigns.find((c) => c.id === activeCampaignId);
      if (activeInFiltered) {
        return [activeInFiltered, ...initial.slice(0, 5)];
      }
    }
    return initial;
  }, [filteredCampaigns, showAllCampaigns, activeCampaignId]);

  const campType: CampaignType = activeCampaign?.type || 'quest';
  const campBadge = CAMPAIGN_TYPE_BADGES[campType] || CAMPAIGN_TYPE_BADGES.quest;

  // Session Sign Up / Cancellation
  const handleSignUp = async (session: PlayerSession) => {
    try {
      setActionInProgressId(session.id);
      const res = await signUpForSession(session.id);
      if (!res.success) {
        Alert.alert(
          'Prenotazione non riuscita',
          res.error || 'Impossibile completare la prenotazione.',
          [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Riprova', onPress: () => { void handleSignUp(session); } },
          ]
        );
      } else if (res.status === 'waitlist') {
        Alert.alert(
          'Sei in Lista d’Attesa',
          `Il tavolo per "${session.title || session.campaigns?.name || 'la sessione'}" è al completo. Verrai avvisato se si libera un posto.`
        );
      } else {
        Alert.alert(
          'Posto al Tavolo Riservato!',
          `Sei registrato per "${session.title || session.campaigns?.name || 'la sessione'}". Il Master riceverà la conferma.`
        );
      }
    } catch {
      Alert.alert(
        'Errore',
        'Impossibile completare la prenotazione.',
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Riprova', onPress: () => { void handleSignUp(session); } },
        ]
      );
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleCancelSignUp = (session: PlayerSession) => {
    Alert.alert(
      'Annulla Prenotazione',
      'Sei sicuro di voler rinunciare al tuo posto al tavolo per questa sessione?',
      [
        { text: 'Resta Iscritto', style: 'cancel' },
        {
          text: 'Conferma Rinuncia',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionInProgressId(session.id);
              const res = await cancelSignUp(session.id);
              if (!res.success) {
                Alert.alert(
                  'Disdetta non riuscita',
                  res.error || 'Impossibile annullare l’iscrizione.',
                  [
                    { text: 'Chiudi', style: 'cancel' },
                    { text: 'Riprova', onPress: () => handleCancelSignUp(session) },
                  ]
                );
              } else {
                Alert.alert('Iscrizione Annullata', 'Il tuo posto è stato liberato.');
              }
            } catch {
              Alert.alert('Errore', 'Impossibile annullare l’iscrizione. Riprova.');
            } finally {
              setActionInProgressId(null);
            }
          },
        },
      ]
    );
  };

  const handleSelectCampaign = useCallback(async (camp: Campaign) => {
    if (camp.id === activeCampaignId) return;
    try {
      await selectCampaign(camp.id);
      Alert.alert('Campagna Attiva', `"${camp.name}" è ora la tua campagna selezionata.`);
    } catch {
      Alert.alert('Errore', 'Impossibile selezionare la campagna.');
    }
  }, [activeCampaignId, selectCampaign]);

  const handleJoinLongCampaign = useCallback(async () => {
    if (!activeCampaign?.id || joiningLong) return;
    setJoiningLong(true);
    try {
      const res = await joinLongCampaign(activeCampaign.id);
      Alert.alert(res.success ? 'Iscrizione completata' : 'Iscrizione non riuscita', res.message);
    } finally {
      setJoiningLong(false);
    }
  }, [activeCampaign?.id, joiningLong, joinLongCampaign]);

  const handleOpenSessionDetail = (session: PlayerSession | any) => {
    setSelectedSessionIdForDetail(session?.id ?? null);
    setIsDetailModalOpen(true);
  };

  const handleSelectSession = (session: PlayerSession | Session) => {
    if (session.campaign_id && session.campaign_id !== activeCampaignId) {
      void selectCampaign(session.campaign_id);
    }
    handleOpenSessionDetail(session);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
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
        {/* Guild Adventurer Header */}
        <View style={styles.headerCard}>
          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Shield size={12} color={colors.brassLight} />
              <Text style={styles.roleBadgeText}>AVVENTURIERO DELLA TAVERNA</Text>
            </View>
            <View style={styles.fameBadge}>
              <Award size={12} color={colors.brassBase} />
              <Text style={styles.fameBadgeText}>
                Fama: {profile?.fame_score ?? 10}
              </Text>
            </View>
          </View>

          <Text style={styles.welcomeTitle}>Salute a te, {displayName}</Text>
          <Text style={styles.welcomeSubtitle}>
            Il dado del destino è pronto. Consulta il tuo eroe e i tavoli da gioco della Gilda.
          </Text>

          {/* Player Quick Stats */}
          <View style={styles.profileStatsRow}>
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatVal}>{profile?.fame_score ?? 10}</Text>
              <Text style={styles.profileStatLabel}>Punti Fama</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatVal}>
                {profile?.sessions_attended_count ?? 1}
              </Text>
              <Text style={styles.profileStatLabel}>Sessioni Giocate</Text>
            </View>
            <View style={styles.profileStatDivider} />
            <View style={styles.profileStatItem}>
              <Text style={styles.profileStatVal}>
                {hasAssignedCharacter ? `Lv. ${safeCharacter.level ?? '—'}` : '-'}
              </Text>
              <Text style={styles.profileStatLabel}>Grado Eroe</Text>
            </View>
          </View>

          <RoleModeSwitcher />
        </View>

        {/* Promemoria Eldaria «Inizia qui» (come sul sito: si chiude dopo conferma lettura) */}
        {activeCampaign?.id === ELDARIA_CAMPAIGN_ID &&
          isMemberOfActiveCampaign &&
          Boolean(activeCampaign.player_primer?.trim()) &&
          !confirmedGuideCampaignIds.includes(ELDARIA_CAMPAIGN_ID) && (
            <View style={styles.guideReminderBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BookOpen size={18} color={colors.brassLight} />
                <Text style={styles.guideReminderTitle}>Benvenuto in Eldaria · Inizia qui</Text>
              </View>
              <Text style={styles.guideReminderSub}>
                Prima della tua prima serata al tavolo, leggi la presentazione del mondo, le 3 voci Wiki base e il regolamento, poi conferma la lettura.
              </Text>
              <TouchableOpacity
                style={styles.browseSessionsBtn}
                onPress={() => setGuideCampaign(activeCampaign)}
                activeOpacity={0.85}
              >
                <BookOpen size={14} color={colors.void} />
                <Text style={styles.browseSessionsBtnText}>Apri «Inizia qui»</Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Accesso rapido Guida del Giocatore per la campagna Long attiva */}
        {isLongCampaignActive &&
          activeCampaign &&
          Boolean(activeCampaign.player_primer?.trim()) &&
          (activeCampaign.id !== ELDARIA_CAMPAIGN_ID ||
            isMemberOfActiveCampaign ||
            role === 'gm' ||
            role === 'admin') &&
          (activeCampaign.id !== ELDARIA_CAMPAIGN_ID ||
            confirmedGuideCampaignIds.includes(ELDARIA_CAMPAIGN_ID)) && (
            <TouchableOpacity
              style={styles.activePrimerStrip}
              onPress={() => setGuideCampaign(activeCampaign)}
              activeOpacity={0.85}
            >
              <BookOpen size={16} color={colors.brassLight} />
              <View style={{ flex: 1 }}>
                <Text style={styles.activePrimerTitle}>
                  {activeCampaign.id === ELDARIA_CAMPAIGN_ID
                    ? 'Inizia qui · Guida di Eldaria'
                    : `Guida del Giocatore · ${activeCampaign.name}`}
                </Text>
                <Text style={styles.activePrimerSub}>
                  {activeCampaign.gm_id && gmNamesByCampaignId[activeCampaign.id]
                    ? `Master · ${gmNamesByCampaignId[activeCampaign.id]}`
                    : 'Consulta ambientazione, regole di casa e preparazione'}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.brassBase} />
            </TouchableOpacity>
          )}

        {/* Banner Iscrizione Campagna Long (quando il giocatore non è ancora membro) */}
        {isLongCampaignActive && !isMemberOfActiveCampaign && activeCampaign && (
          <View style={styles.noSessionCard}>
            <Text style={styles.noSessionTitle}>
              {activeCampaign.id === ELDARIA_CAMPAIGN_ID
                ? 'Eldaria: Ammissione dal Vivo'
                : 'Campagna Long: Iscrizione Richiesta'}
            </Text>
            <Text style={styles.noSessionSubtitle}>
              {activeCampaign.id === ELDARIA_CAMPAIGN_ID
                ? 'Dopo il colloquio dal vivo, il GM aggiunge il tuo account a Eldaria.'
                : activeCampaign.long_registrations_open === false
                  ? `Le iscrizioni autonome per "${activeCampaign.name}" sono chiuse. Contatta il GM per essere aggiunto.`
                  : `Per prenotare le sessioni e accedere a Diario, Wiki, Mappe e Missioni di "${activeCampaign.name}", iscriviti prima alla campagna.`}
            </Text>
            {activeCampaign.id !== ELDARIA_CAMPAIGN_ID && activeCampaign.long_registrations_open !== false && (
              <TouchableOpacity
                style={[styles.browseSessionsBtn, joiningLong && { opacity: 0.6 }]}
                onPress={handleJoinLongCampaign}
                disabled={joiningLong}
                accessibilityRole="button"
                accessibilityLabel="Iscriviti alla campagna Long"
              >
                {joiningLong ? (
                  <ActivityIndicator size="small" color={colors.void} />
                ) : (
                  <CheckCircle2 size={14} color={colors.void} />
                )}
                <Text style={styles.browseSessionsBtnText}>
                  {joiningLong ? 'Iscrizione in corso...' : 'Iscriviti alla Campagna'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 1. SPOTLIGHT PROSSIMA SESSIONE */}
        <View style={styles.sectionHeader}>
          <Calendar size={18} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>PROSSIMA SESSIONE AL TAVOLO</Text>
        </View>

        {targetSession ? (
          <View style={styles.sessionCard}>
            <View style={styles.sessionTopRow}>
              <View style={styles.campaignTag}>
                <Text style={styles.campaignTagText}>
                  {targetSession.campaigns?.name || 'CAMPAGNA IN CORSO'}
                </Text>
              </View>

              {targetSession.isConfirmed ? (
                <View style={styles.statusLive}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>CONFERMATA</Text>
                </View>
              ) : targetSession.isWaitlist ? (
                <View style={styles.statusWaitlist}>
                  <Clock size={11} color={colors.brassLight} />
                  <Text style={styles.statusWaitlistText}>IN ATTESA</Text>
                </View>
              ) : (
                <View style={styles.statusOpen}>
                  <Text style={styles.statusOpenText}>POSTI LIBERI</Text>
                </View>
              )}
            </View>

            <Text style={styles.sessionTitle}>{targetSession.title || 'Sessione Ufficiale al Tavolo'}</Text>

            <View style={styles.sessionDetailsRow}>
              <View style={styles.sessionDetailItem}>
                <MapPin size={13} color={colors.brassLight} />
                <Text style={styles.sessionInfoText}>
                  {targetSession.location || 'Barber & Dragons · Tavolo Taverna'}
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

            <View style={styles.sessionDivider} />

            <View style={styles.sessionFooter}>
              <Text style={styles.dmLabel}>
                Game Master:{' '}
                <Text style={styles.dmName}>
                  {sessionDirectoryMeta[targetSession.id]?.dmName ||
                    (targetSession.campaign_id ? gmNamesByCampaignId[targetSession.campaign_id] : null) ||
                    (targetSession.dm_id?.startsWith('dm-')
                      ? targetSession.dm_id.replace('dm-', '').toUpperCase()
                      : 'Master di Gilda')}
                </Text>
              </Text>
              <TouchableOpacity
                style={styles.sessionDetailsLink}
                onPress={() => navigation.navigate('Sessions')}
              >
                <Text style={styles.sessionDetailsText}>Tutti i Tavoli</Text>
                <ChevronRight size={14} color={colors.brassLight} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.noSessionCard}>
            <Text style={styles.noSessionTitle}>Nessun Tavolo Prenotato</Text>
            <Text style={styles.noSessionSubtitle}>
              Non hai ancora confermato la tua presenza per le prossime serate.
            </Text>
            <TouchableOpacity
              style={styles.browseSessionsBtn}
              onPress={() => navigation.navigate('Sessions')}
            >
              <Calendar size={14} color={colors.void} />
              <Text style={styles.browseSessionsBtnText}>Consulta Calendario Tavoli</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. CALENDARIO A GRIGLIA DELLE SESSIONI DI GILDA */}
        <View style={styles.sectionHeader}>
          <Calendar size={18} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>CALENDARIO SESSIONI DELLA GILDA</Text>
        </View>

        {sessionsError ? (
          <View style={styles.noSessionCard} accessibilityRole="alert">
            <Text style={styles.noSessionTitle}>Impossibile caricare le sessioni</Text>
            <Text style={styles.noSessionSubtitle}>{sessionsError}</Text>
            <TouchableOpacity
              style={styles.browseSessionsBtn}
              onPress={() => { void refreshSessions(); }}
              accessibilityRole="button"
              accessibilityLabel="Riprova caricamento sessioni"
            >
              <Repeat size={14} color={colors.void} />
              <Text style={styles.browseSessionsBtnText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <GridCalendar
            sessions={allSessions.length > 0 ? allSessions : sessions}
            activeCampaignId={activeCampaignId}
            onSelectSession={handleSelectSession}
            onPlayerOpenSession={handleOpenSessionDetail}
            onSignUp={handleSignUp}
            onCancelSignUp={handleCancelSignUp}
            actionInProgressId={actionInProgressId}
          />
        )}

        {/* 3. PANORAMICA DI TUTTE LE CAMPAGNE (COME SUL SITO) */}
        <View style={styles.sectionHeader}>
          <Swords size={18} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>TUTTE LE CAMPAGNE DELLA GILDA</Text>
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

        {/* Griglia/Carosello Campagne Expandabili 2 per riga */}
        <View style={styles.campaignsGrid}>
          {visibleCampaigns.map((camp) => (
            <ExpandableCampaignCard
              key={camp.id}
              campaign={camp}
              isActive={camp.id === activeCampaignId}
              onSelect={handleSelectCampaign}
              upcomingSession={upcomingSessionByCampaignId.get(camp.id) ?? null}
              gmName={gmNamesByCampaignId[camp.id] ?? null}
              isMember={
                role === 'gm' || role === 'admin' || joinedCampaignIds.includes(camp.id)
              }
              assignedCharacter={(assignedCharactersMap[camp.id] ?? [])[0] ?? null}
              onOpenGuide={(c) => setGuideCampaign(c)}
            />
          ))}
        </View>

        {filteredCampaigns.length > 6 && (
          <TouchableOpacity
            style={styles.showMoreCampaignsBtn}
            onPress={() => setShowAllCampaigns((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Text style={styles.showMoreCampaignsText}>
              {showAllCampaigns
                ? 'Mostra meno campagne'
                : `Mostra tutte le campagne (${filteredCampaigns.length})`}
            </Text>
          </TouchableOpacity>
        )}

        {/* 4. QUICK DICE ROLLER LAUNCH BANNER */}
        <TouchableOpacity
          style={styles.diceLauncherCard}
          onPress={() => setIsDiceModalOpen(true)}
          activeOpacity={0.85}
        >
          <View style={styles.diceLauncherLeft}>
            <Dices size={24} color={colors.brassLight} />
            <View>
              <Text style={styles.diceLauncherTitle}>Lancia i Dadi al Volo</Text>
              <Text style={styles.diceLauncherSub}>
                Tira d20 con vantaggio, d12, d6, o moneta della Taverna
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color={colors.brassLight} />
        </TouchableOpacity>

        {/* 6. ACCESSO RAPIDO A TUTTE LE SEZIONI DI GIOCO */}
        <View style={styles.sectionHeader}>
          <Compass size={18} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>ACCESSO RAPIDO ALLA GILDA</Text>
        </View>

        <View style={styles.quickGrid}>
          {canAccessCharacterSheet && (
            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => navigation.navigate('CharacterSheet')}
            >
              <Shield size={22} color={colors.brassBase} />
              <Text style={styles.quickTileTitle}>Scheda PG</Text>
              <Text style={styles.quickTileSub}>Gestione Eroe</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('Sessions')}
          >
            <Calendar size={22} color={colors.brassBase} />
            <Text style={styles.quickTileTitle}>Tavoli</Text>
            <Text style={styles.quickTileSub}>Prenotazioni</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('PlayerWhisper')}
          >
            <MessageSquare size={22} color={colors.brassBase} />
            <Text style={styles.quickTileTitle}>Whisper</Text>
            <Text style={styles.quickTileSub}>Sussurri DM</Text>
          </TouchableOpacity>

          {hasJoinedLongCampaign && (
            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => navigation.navigate('LoreMissions')}
            >
              <BookOpen size={22} color={colors.brassBase} />
              <Text style={styles.quickTileTitle}>Bacheca</Text>
              <Text style={styles.quickTileSub}>Lore & Diario</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Avvisi e Note del Barbiere */}
        <View style={styles.infoBox}>
          <AlertCircle size={18} color={colors.brassLight} style={{ marginTop: 2 }} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Bacheca della Taverna</Text>
            <Text style={styles.infoText}>
              Verifica le monete e gli slot incantesimo prima dell&apos;inizio della sessione.
              Tutti i whispers inviati al GM dalla tab Whisper sono cifrati e visibili solo alla Regia.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Embedded Dice Roller Modal */}
      <DiceRollerModal
        visible={isDiceModalOpen}
        onClose={() => setIsDiceModalOpen(false)}
        initialDie="d20"
        initialModifier={0}
        initialLabel="Tiro Rapido Taverna"
      />

      {/* Campaign Selector Modal */}
      <CampaignSelectorModal
        visible={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
      />

      {/* Player Session Detail & Sign-Up Modal */}
      <PlayerSessionDetailModal
        visible={isDetailModalOpen}
        session={selectedSessionForDetail}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSessionIdForDetail(null);
        }}
        onSignUp={handleSignUp}
        onCancelSignUp={handleCancelSignUp}
      />

      {/* Native Player Primer / Eldaria «Inizia qui» Modal */}
      <CampaignGuideModal
        visible={guideCampaign !== null}
        campaign={guideCampaign}
        canConfirmRead={
          Boolean(guideCampaign) &&
          role !== 'gm' &&
          role !== 'admin' &&
          joinedCampaignIds.includes(guideCampaign!.id)
        }
        isConfirmedRead={
          Boolean(guideCampaign) && confirmedGuideCampaignIds.includes(guideCampaign!.id)
        }
        onConfirmRead={confirmCampaignGuide}
        onClose={() => setGuideCampaign(null)}
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
    gap: 14,
  },
  headerCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 16,
    gap: 10,
  },
  guideReminderBanner: {
    backgroundColor: 'rgba(200, 157, 73, 0.14)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    padding: 14,
    gap: 8,
  },
  guideReminderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brassLight,
  },
  guideReminderSub: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.parchmentLight,
  },
  activePrimerStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  activePrimerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brassLight,
  },
  activePrimerSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.5,
  },
  fameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(197, 155, 39, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  fameBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassBase,
  },
  welcomeTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.4,
  },
  welcomeSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.parchmentMuted,
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 10,
    marginTop: 2,
  },
  profileStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  profileStatVal: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  profileStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  profileStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.stoneBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionHeaderRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },

  // SPOTLIGHT SESSION
  sessionCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    padding: 14,
    gap: 8,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  campaignTag: {
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  campaignTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  statusLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.emerald,
  },
  statusWaitlist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusWaitlistText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  statusOpen: {
    backgroundColor: colors.stone,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusOpenText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  sessionDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  sessionInfoText: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  countdownTextImminent: {
    color: colors.void,
  },
  sessionDivider: {
    height: 1,
    backgroundColor: colors.stoneBorder,
    marginVertical: 2,
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dmLabel: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  dmName: {
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  sessionDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sessionDetailsText: {
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
    gap: 6,
  },
  noSessionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  noSessionSubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  browseSessionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  browseSessionsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },

  // MINI SESSIONS CALENDAR
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  campaignFiltersScroll: {
    gap: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  filterPill: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  filterPillTextActive: {
    color: colors.void,
    fontWeight: '800',
  },
  miniSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 10,
    gap: 10,
  },
  miniSessionDateBox: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stone,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  miniSessionDayNum: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.brassLight,
  },
  miniSessionMonth: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    textTransform: 'uppercase',
  },
  miniSessionTime: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginTop: 1,
  },
  miniSessionInfo: {
    flex: 1,
    gap: 2,
  },
  miniSessionCampName: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassBase,
  },
  miniSessionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  miniSessionOccupancy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniSessionOccupancyText: {
    fontSize: 10.5,
    color: colors.parchmentMuted,
    fontWeight: '600',
  },
  miniSessionAction: {
    justifyContent: 'center',
  },
  joinSessionBtn: {
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  joinSessionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  cancelSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  cancelSessionBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.emerald,
  },
  fullBadge: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  fullBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },

  // CAMPAIGNS OVERVIEW
  campaignsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  showMoreCampaignsBtn: {
    marginTop: -2,
    marginBottom: 4,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreCampaignsText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.4,
  },
  campaignCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    overflow: 'hidden',
  },
  campaignCardActive: {
    borderColor: colors.brassBase,
    borderWidth: 1.5,
  },
  campaignCardBody: {
    padding: 12,
    gap: 6,
  },
  campaignCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  campaignTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  campaignTypeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activePillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
    borderWidth: 1,
    borderColor: colors.brassBase,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activePillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  campaignCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  campaignCardDesc: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.parchmentMuted,
  },
  campaignCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  selectCampBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectCampBtnActive: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
  },
  selectCampBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.void,
  },
  selectCampBtnActiveText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.brassLight,
  },

  // HERO PREVIEW CARD
  characterPreviewCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 14,
    gap: 12,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCrest: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.stone,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.brassLight,
  },
  characterDetails: {
    flex: 1,
  },
  characterName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  characterClass: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  openSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  openSheetBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
  },
  quickHpSection: {
    backgroundColor: colors.stone,
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  quickHpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hpLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quickHpTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.5,
  },
  quickHpValues: {
    fontSize: 13,
    fontWeight: '800',
  },
  quickHpTrack: {
    height: 6,
    backgroundColor: colors.void,
    borderRadius: 3,
    overflow: 'hidden',
  },
  quickHpFill: {
    height: '100%',
    borderRadius: 3,
  },
  quickHpButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  quickStepBtn: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 6,
    borderRadius: 6,
  },
  quickStepBtnDamageText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  quickStepBtnHealText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.emerald,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.stone,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.parchmentMuted,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 2,
  },
  noCharacterCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  noCharacterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  noCharacterSub: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  selectOtherCampaignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    marginTop: 4,
  },
  selectOtherCampaignBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },

  // DICE LAUNCHER
  diceLauncherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 14,
  },
  diceLauncherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  diceLauncherTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brassLight,
  },
  diceLauncherSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },

  // QUICK GRID
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickTile: {
    width: '48%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 14,
    gap: 4,
  },
  quickTileTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 4,
  },
  quickTileSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },

  // INFO BOX
  infoBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(197, 155, 39, 0.08)',
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  infoContent: {
    flex: 1,
    gap: 3,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.parchmentMuted,
  },
});

export default PlayerHomeScreen;
