import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
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
import { Campaign, CampaignType, PlayerSession } from '../../types';

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
  const { profile, user, role, switchMode } = useAuth();
  const isAdmin = role === 'admin';

  const {
    campaigns,
    activeCampaign,
    activeCampaignId,
    selectCampaign,
    refreshCampaigns,
  } = useCampaign();

  const {
    activeCharacter,
    safeCharacter,
    hasAssignedCharacter,
    loading: charLoading,
    updateHp,
    refresh: refreshCharacter,
  } = usePlayerCharacter();

  const {
    sessions,
    nextConfirmedSession,
    loading: sessionsLoading,
    refresh: refreshSessions,
    signUpForSession,
    cancelSignUp,
  } = usePlayerSessions();

  // Filters state
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all');
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>('all');
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  // Modals state
  const [isDiceModalOpen, setIsDiceModalOpen] = useState<boolean>(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState<boolean>(false);

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

  // Active hero vitals
  const currentHp = safeCharacter.hit_points ?? 0;
  const maxHp = safeCharacter.rules_snapshot?.max_hp ?? 42;
  const hpPercent = Math.max(0, Math.min(100, Math.round((currentHp / maxHp) * 100)));
  const hpColor =
    hpPercent > 50
      ? colors.emerald
      : hpPercent > 20
      ? colors.brassBase
      : colors.crimsonLight;

  const campType: CampaignType = activeCampaign?.type || 'quest';
  const campBadge = CAMPAIGN_TYPE_BADGES[campType] || CAMPAIGN_TYPE_BADGES.quest;

  // Session Sign Up / Cancellation
  const handleSignUp = async (session: PlayerSession) => {
    try {
      setActionInProgressId(session.id);
      const res = await signUpForSession(session.id);
      if (res.error) {
        Alert.alert('Prenotazione non riuscita', res.error);
      } else {
        Alert.alert(
          'Posto al Tavolo Riservato!',
          `Sei registrato per "${session.title || session.campaigns?.name || 'la sessione'}". Il Master riceverà la conferma.`
        );
      }
    } catch {
      Alert.alert('Errore', 'Impossibile completare la prenotazione. Riprova.');
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
              if (res.error) {
                Alert.alert('Errore', res.error);
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

  const handleSelectCampaign = async (camp: Campaign) => {
    if (camp.id === activeCampaignId) return;
    try {
      await selectCampaign(camp.id);
      Alert.alert('Campagna Attiva', `"${camp.name}" è ora la tua campagna selezionata.`);
    } catch {
      Alert.alert('Errore', 'Impossibile selezionare la campagna.');
    }
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
        {/* GM Mode Switcher Notice (Admin Only) */}
        {isAdmin && (
          <View style={styles.gmNoticeBanner}>
            <View style={styles.gmNoticeLeft}>
              <Repeat size={16} color={colors.brassBase} />
              <Text style={styles.gmNoticeText}>
                Stai visualizzando come <Text style={styles.boldText}>Giocatore</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.gmSwitchButton}
              onPress={() => switchMode('gm')}
              activeOpacity={0.8}
            >
              <Text style={styles.gmSwitchButtonText}>Torna alla Regia</Text>
            </TouchableOpacity>
          </View>
        )}

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
                {hasAssignedCharacter ? `Lv. ${safeCharacter.level}` : '-'}
              </Text>
              <Text style={styles.profileStatLabel}>Grado Eroe</Text>
            </View>
          </View>
        </View>

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
                  {targetSession.dm_id?.startsWith('dm-')
                    ? targetSession.dm_id.replace('dm-', '').toUpperCase()
                    : 'Master di Gilda'}
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

        {/* 2. CALENDARIO SESSIONI DELLA GILDA (COME SUL SITO) */}
        <View style={styles.sectionHeaderWithAction}>
          <View style={styles.sectionHeaderRowInline}>
            <Calendar size={18} color={colors.brassBase} />
            <Text style={styles.sectionTitle}>CALENDARIO SESSIONI SUL SITO</Text>
          </View>
          <TouchableOpacity
            style={styles.viewAllLink}
            onPress={() => navigation.navigate('Sessions')}
          >
            <Text style={styles.viewAllLinkText}>Vedi tutte</Text>
            <ChevronRight size={12} color={colors.brassLight} />
          </TouchableOpacity>
        </View>

        {/* Filtri Sessioni */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.filterPill, sessionFilter === 'all' && styles.filterPillActive]}
            onPress={() => setSessionFilter('all')}
          >
            <Text style={[styles.filterPillText, sessionFilter === 'all' && styles.filterPillTextActive]}>
              Tutti i Tavoli ({sessions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, sessionFilter === 'mine' && styles.filterPillActive]}
            onPress={() => setSessionFilter('mine')}
          >
            <Text style={[styles.filterPillText, sessionFilter === 'mine' && styles.filterPillTextActive]}>
              I Miei Tavoli
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, sessionFilter === 'available' && styles.filterPillActive]}
            onPress={() => setSessionFilter('available')}
          >
            <Text style={[styles.filterPillText, sessionFilter === 'available' && styles.filterPillTextActive]}>
              Posti Liberi
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista Rapida Sessioni in evidenza */}
        {filteredSessions.slice(0, 3).map((session) => {
          const dateMeta = formatSessionDate(session.scheduled_at);
          const isFull = session.isFull;
          const isConfirmed = session.isConfirmed;
          const isBusy = actionInProgressId === session.id;

          return (
            <View key={session.id} style={styles.miniSessionCard}>
              <View style={styles.miniSessionDateBox}>
                <Text style={styles.miniSessionDayNum}>{dateMeta.dayNum}</Text>
                <Text style={styles.miniSessionMonth}>{dateMeta.month}</Text>
                <Text style={styles.miniSessionTime}>{dateMeta.time}</Text>
              </View>

              <View style={styles.miniSessionInfo}>
                <Text style={styles.miniSessionCampName}>
                  {session.campaigns?.name || 'CAMPAGNA'}
                </Text>
                <Text style={styles.miniSessionTitle} numberOfLines={1}>
                  {session.title || 'Sessione di Gioco'}
                </Text>
                <View style={styles.miniSessionOccupancy}>
                  <Users size={11} color={colors.brassLight} />
                  <Text style={styles.miniSessionOccupancyText}>
                    {session.confirmedCount ?? 0}/{session.max_players ?? 6} posti
                  </Text>
                </View>
              </View>

              <View style={styles.miniSessionAction}>
                {isBusy ? (
                  <ActivityIndicator size="small" color={colors.brassBase} />
                ) : isConfirmed ? (
                  <TouchableOpacity
                    style={styles.cancelSessionBtn}
                    onPress={() => handleCancelSignUp(session)}
                  >
                    <CheckCircle2 size={12} color={colors.emerald} />
                    <Text style={styles.cancelSessionBtnText}>Iscritto</Text>
                  </TouchableOpacity>
                ) : isFull ? (
                  <View style={styles.fullBadge}>
                    <Text style={styles.fullBadgeText}>Pieno</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.joinSessionBtn}
                    onPress={() => handleSignUp(session)}
                  >
                    <Text style={styles.joinSessionBtnText}>Prenota</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

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

        {/* Griglia/Carosello Campagne */}
        {filteredCampaigns.slice(0, 4).map((camp) => {
          const cType: CampaignType = camp.type || 'quest';
          const badgeMeta = CAMPAIGN_TYPE_BADGES[cType] || CAMPAIGN_TYPE_BADGES.quest;
          const isActive = camp.id === activeCampaignId;

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

                  {isActive && (
                    <View style={styles.activePillBadge}>
                      <Check size={11} color={colors.brassLight} />
                      <Text style={styles.activePillBadgeText}>Campagna in Uso</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.campaignCardTitle}>{camp.name}</Text>

                {camp.description ? (
                  <Text style={styles.campaignCardDesc} numberOfLines={2}>
                    {camp.description}
                  </Text>
                ) : null}

                <View style={styles.campaignCardFooter}>
                  <TouchableOpacity
                    style={[styles.selectCampBtn, isActive && styles.selectCampBtnActive]}
                    onPress={() => handleSelectCampaign(camp)}
                    activeOpacity={0.8}
                  >
                    {isActive ? (
                      <>
                        <Check size={13} color={colors.brassLight} />
                        <Text style={styles.selectCampBtnActiveText}>Selezionata</Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.selectCampBtnText}>Imposta come Attiva</Text>
                        <ChevronRight size={13} color={colors.void} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {/* 4. SCHEDA PG RAPIDA LIVE CON BARRA HP INTERATTIVA */}
        <View style={styles.sectionHeader}>
          <Sparkles size={18} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>IL TUO EROE ATTIVO</Text>
        </View>

        {hasAssignedCharacter ? (
          <View style={styles.characterPreviewCard}>
            <View style={styles.characterHeader}>
              <View style={styles.avatarCrest}>
                <Text style={styles.avatarLetter}>
                  {safeCharacter.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.characterDetails}>
                <Text style={styles.characterName}>{safeCharacter.name}</Text>
                <Text style={styles.characterClass}>
                  {safeCharacter.character_class} Livello {safeCharacter.level} •{' '}
                  {safeCharacter.background || 'Eroe di Faerûn'}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.openSheetBtn}
                onPress={() => navigation.navigate('CharacterSheet')}
              >
                <Text style={styles.openSheetBtnText}>Scheda</Text>
                <ChevronRight size={12} color={colors.brassLight} />
              </TouchableOpacity>
            </View>

            {/* Quick HP Bar and Buttons */}
            <View style={styles.quickHpSection}>
              <View style={styles.quickHpHeader}>
                <View style={styles.hpLabelLeft}>
                  <Heart size={14} color={hpColor} />
                  <Text style={styles.quickHpTitle}>PUNTI FERITA</Text>
                </View>
                <Text style={[styles.quickHpValues, { color: hpColor }]}>
                  {currentHp} / {maxHp} HP
                </Text>
              </View>

              <View style={styles.quickHpTrack}>
                <View
                  style={[
                    styles.quickHpFill,
                    { width: `${hpPercent}%`, backgroundColor: hpColor },
                  ]}
                />
              </View>

              <View style={styles.quickHpButtonsRow}>
                <TouchableOpacity
                  style={styles.quickStepBtn}
                  onPress={() => updateHp(Math.max(0, currentHp - 5))}
                >
                  <Text style={styles.quickStepBtnDamageText}>-5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickStepBtn}
                  onPress={() => updateHp(Math.max(0, currentHp - 1))}
                >
                  <Text style={styles.quickStepBtnDamageText}>-1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickStepBtn}
                  onPress={() => updateHp(Math.min(maxHp, currentHp + 1))}
                >
                  <Text style={styles.quickStepBtnHealText}>+1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickStepBtn}
                  onPress={() => updateHp(Math.min(maxHp, currentHp + 5))}
                >
                  <Text style={styles.quickStepBtnHealText}>+5</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Core Stat Boxes */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>CA</Text>
                <Text style={styles.statValue}>{safeCharacter.armor_class ?? 15}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>INIZIATIVA</Text>
                <Text style={styles.statValue}>+2</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>MONETE (MO)</Text>
                <Text style={styles.statValue}>{safeCharacter.coins_gp ?? 0}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.noCharacterCard}>
            <Shield size={28} color={colors.brassBase} style={{ marginBottom: 6 }} />
            <Text style={styles.noCharacterTitle}>Nessun Personaggio Assegnato</Text>
            <Text style={styles.noCharacterSub}>
              Non hai ancora una scheda PG assegnata per "{activeCampaign?.name}". Seleziona un'altra campagna per vedere le altre tue schede, oppure il DM ti assegnerà un eroe al tavolo.
            </Text>
            <TouchableOpacity
              style={styles.selectOtherCampaignBtn}
              onPress={() => setIsCampaignModalOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.selectOtherCampaignBtnText}>Seleziona un'altra Campagna</Text>
              <ChevronRight size={13} color={colors.void} />
            </TouchableOpacity>
          </View>
        )}

        {/* 5. QUICK DICE ROLLER LAUNCH BANNER */}
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
          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('CharacterSheet')}
          >
            <Shield size={22} color={colors.brassBase} />
            <Text style={styles.quickTileTitle}>Scheda PG</Text>
            <Text style={styles.quickTileSub}>Gestione Eroe</Text>
          </TouchableOpacity>

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

          <TouchableOpacity
            style={styles.quickTile}
            onPress={() => navigation.navigate('LoreMissions')}
          >
            <BookOpen size={22} color={colors.brassBase} />
            <Text style={styles.quickTileTitle}>Bacheca</Text>
            <Text style={styles.quickTileSub}>Lore & Diario</Text>
          </TouchableOpacity>
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
  gmNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  gmNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gmNoticeText: {
    fontSize: 12,
    color: colors.parchmentLight,
  },
  boldText: {
    fontWeight: '800',
    color: colors.brassLight,
  },
  gmSwitchButton: {
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  gmSwitchButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  headerCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 16,
    gap: 10,
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
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  filterPillActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  filterPillTextActive: {
    color: colors.void,
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
    fontSize: 9,
    fontWeight: '800',
    color: colors.parchmentMuted,
    textTransform: 'uppercase',
  },
  miniSessionTime: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginTop: 1,
  },
  miniSessionInfo: {
    flex: 1,
    gap: 2,
  },
  miniSessionCampName: {
    fontSize: 9,
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
    fontSize: 10,
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
    fontSize: 10,
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
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },

  // CAMPAIGNS OVERVIEW
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
    fontSize: 9,
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
    fontSize: 9,
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
    fontSize: 10,
    fontWeight: '800',
    color: colors.void,
  },
  selectCampBtnActiveText: {
    fontSize: 10,
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
    fontSize: 10,
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
    fontSize: 9,
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
