import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  CalendarCheck,
  AlertTriangle,
  Sparkles,
  Users,
  Swords,
  Compass,
  Star,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useCampaign } from '../../contexts/CampaignContext';
import { usePlayerSessions } from '../../hooks/usePlayerSessions';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { PlayerSessionDetailModal } from '../../components/player/PlayerSessionDetailModal';
import { SessionFeedbackModal } from '../../components/player/SessionFeedbackModal';
import { RichMarkdownView } from '../../components/common/RichMarkdownView';
import { normalizeSessionPartyBadge } from '../../lib/session-booking';
import { PlayerSession } from '../../types';

type FilterType = 'all' | 'mine' | 'available' | 'completed';

export const SessionsCalendarScreen: React.FC = () => {
  const route = useRoute<any>();
  const notificationSessionId: string | undefined = route?.params?.notificationSessionId;
  const { activeCampaign, gmNamesByCampaignId, sessionDirectoryMeta } = useCampaign();
  const {
    sessions,
    allSessions,
    feedbackBySessionId,
    pendingFeedbackSessions,
    filterByCampaign,
    setFilterByCampaign,
    loading,
    error,
    refresh,
    signUpForSession,
    cancelSignUp,
    submitFeedback,
  } = usePlayerSessions();

  const [filter, setFilter] = useState<FilterType>('all');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState<boolean>(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [highlightedSessionId, setHighlightedSessionId] = useState<string | null>(null);
  const [notificationUnavailable, setNotificationUnavailable] = useState<boolean>(false);
  const [expandedSummaryIds, setExpandedSummaryIds] = useState<Record<string, boolean>>({});
  const [detailSession, setDetailSession] = useState<PlayerSession | null>(null);
  const [feedbackSession, setFeedbackSession] = useState<PlayerSession | null>(null);

  useEffect(() => {
    if (!notificationSessionId || loading) return;
    const target = allSessions.find((s) => s.id === notificationSessionId);
    if (target) {
      setNotificationUnavailable(false);
      setHighlightedSessionId(target.id);
      setFilter('all');
      if (target.campaign_id && target.campaign_id !== activeCampaign?.id) {
        setFilterByCampaign(false);
      }
    } else {
      setHighlightedSessionId(null);
      setNotificationUnavailable(true);
    }
  }, [notificationSessionId, loading, allSessions, activeCampaign?.id, setFilterByCampaign]);

  const toggleSummary = (sessionId: string) => {
    setExpandedSummaryIds((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }));
  };

  // Format date and time in Italian
  const formatSessionDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return {
          dateLabel: 'Data da definire',
          timeLabel: 'Orario serale',
        };
      }

      const days = [
        'Domenica',
        'Lunedì',
        'Martedì',
        'Mercoledì',
        'Giovedì',
        'Venerdì',
        'Sabato',
      ];
      const months = [
        'Gennaio',
        'Febbraio',
        'Marzo',
        'Aprile',
        'Maggio',
        'Giugno',
        'Luglio',
        'Agosto',
        'Settembre',
        'Ottobre',
        'Novembre',
        'Dicembre',
      ];

      const dayName = days[d.getDay()];
      const dayNum = d.getDate();
      const monthName = months[d.getMonth()];
      const year = d.getFullYear();

      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');

      return {
        dateLabel: `${dayName} ${dayNum} ${monthName} ${year}`,
        timeLabel: `Ore ${hours}:${minutes}`,
      };
    } catch {
      return {
        dateLabel: 'Data della sessione',
        timeLabel: '21:00',
      };
    }
  };

  // Filtered session list (sort completed descending by date, scheduled ascending)
  const filteredSessions = useMemo(() => {
    const list = sessions.filter((s) => {
      if (filter === 'mine') {
        return Boolean(s.isConfirmed || s.isWaitlist);
      }
      if (filter === 'available') {
        return s.status === 'scheduled' && !s.isFull && !s.isConfirmed;
      }
      if (filter === 'completed') {
        return s.status === 'completed';
      }
      return true;
    });

    if (filter === 'completed') {
      list.sort(
        (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
      );
    }

    if (!highlightedSessionId) return list;
    const idx = list.findIndex((s) => s.id === highlightedSessionId);
    if (idx <= 0) return list;
    return [list[idx], ...list.slice(0, idx), ...list.slice(idx + 1)];
  }, [sessions, filter, highlightedSessionId]);

  const completedCount = useMemo(
    () => sessions.filter((s) => s.status === 'completed').length,
    [sessions]
  );

  // Direct signup from detail modal
  const handleDirectSignUp = async (session: PlayerSession) => {
    setActionInProgressId(session.id);
    const res = await signUpForSession(session.id);
    setActionInProgressId(null);

    if (res.success) {
      Alert.alert(
        'Iscrizione Registrata!',
        res.status === 'waitlist'
          ? 'Sei in lista d’attesa. Ti informeremo se un compagno rinuncia.'
          : 'La tua presenza al tavolo è confermata. Prepara dadi e scheda!'
      );
    } else {
      Alert.alert('Attenzione', res.error || 'Impossibile completare l’iscrizione');
    }
  };

  // Handle Signup Confirmation
  const handleSignUpPrompt = (session: PlayerSession) => {
    const isFull = (session.confirmedCount ?? 0) >= (session.max_players ?? 6);
    const titleText = isFull ? 'Lista d’Attesa Tavolo' : 'Conferma Iscrizione';
    const messageText = isFull
      ? `Il tavolo per "${session.title}" è attualmente al completo (${session.confirmedCount}/${session.max_players}). Desideri iscriverti alla Lista d'Attesa della Taverna? Sarai avvisato se si libera un posto.`
      : `Vuoi confermare la tua presenza alla sessione "${session.title}"? Il tuo posto al tavolo della taverna sarà riservato.`;

    Alert.alert(titleText, messageText, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: isFull ? 'Entra in Attesa' : 'Conferma Presenza',
        onPress: () => {
          void handleDirectSignUp(session);
        },
      },
    ]);
  };

  // Handle Cancellation Prompt
  const handleCancelPrompt = (session: PlayerSession) => {
    Alert.alert(
      'Disdetta Presenza',
      `Sei sicuro di voler annullare l'iscrizione a "${session.title}"? Il tuo posto tornerà immediatamente disponibile ad altri avventurieri della Gilda.`,
      [
        { text: 'Rimani Iscritto', style: 'cancel' },
        {
          text: 'Disdici',
          style: 'destructive',
          onPress: async () => {
            setActionInProgressId(session.id);
            const res = await cancelSignUp(session.id);
            setActionInProgressId(null);

            if (res.success) {
              Alert.alert(
                'Disdetta Effettuata',
                'Il tuo posto è stato liberato correttamente.'
              );
            } else {
              Alert.alert('Errore', res.error || 'Impossibile disdire la sessione.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={colors.brassLight}
            colors={[colors.brassBase]}
          />
        }
      >
        {/* Header Intro */}
        <View style={styles.header}>
          <Text style={styles.title}>CALENDARIO TAVOLI</Text>
          <Text style={styles.subtitle}>
            Appuntamenti, cronaca sessioni e disponibilità al tavolo della taverna.
          </Text>
        </View>

        {/* Campaign Scope Bar */}
        <View style={styles.campaignScopeRow}>
          <TouchableOpacity
            style={[
              styles.campaignScopeChip,
              filterByCampaign && styles.campaignScopeChipActive,
            ]}
            onPress={() => setFilterByCampaign(true)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: filterByCampaign }}
          >
            <Swords size={12} color={filterByCampaign ? colors.void : colors.brassLight} />
            <Text
              style={[
                styles.campaignScopeChipText,
                filterByCampaign && styles.campaignScopeChipTextActive,
              ]}
              numberOfLines={1}
            >
              {activeCampaign?.name || 'Campagna Attiva'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.campaignScopeChip,
              !filterByCampaign && styles.campaignScopeChipActive,
            ]}
            onPress={() => setFilterByCampaign(false)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: !filterByCampaign }}
          >
            <Compass size={12} color={!filterByCampaign ? colors.void : colors.parchmentMuted} />
            <Text
              style={[
                styles.campaignScopeChipText,
                !filterByCampaign && styles.campaignScopeChipTextActive,
              ]}
            >
              Tutte le Campagne
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeCampaignIconBtn}
            onPress={() => setIsCampaignModalOpen(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cambia campagna attiva"
          >
            <Text style={styles.changeCampaignIconBtnText}>Cambia ▾</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Post-Session Feedback Banner */}
        {pendingFeedbackSessions.length > 0 && (
          <TouchableOpacity
            style={styles.feedbackPromptCard}
            onPress={() => setFeedbackSession(pendingFeedbackSessions[0])}
            activeOpacity={0.85}
          >
            <Star size={18} color={colors.brassLight} fill={colors.brassBase} />
            <View style={{ flex: 1 }}>
              <Text style={styles.feedbackPromptTitle}>
                {pendingFeedbackSessions.length === 1
                  ? '1 sessione giocata attende il tuo feedback'
                  : `${pendingFeedbackSessions.length} sessioni giocate attendono il tuo feedback`}
              </Text>
              <Text style={styles.feedbackPromptSub} numberOfLines={1}>
                Tocca per valutare «{pendingFeedbackSessions[0].title || 'Sessione'}»
              </Text>
            </View>
            <Text style={styles.feedbackPromptCta}>Valuta ›</Text>
          </TouchableOpacity>
        )}

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === 'all' }}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'all' && styles.filterTextActive,
              ]}
            >
              Tutte ({sessions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'mine' && styles.filterChipActive]}
            onPress={() => setFilter('mine')}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === 'mine' }}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'mine' && styles.filterTextActive,
              ]}
            >
              Le Mie Sessioni
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filter === 'available' && styles.filterChipActive,
            ]}
            onPress={() => setFilter('available')}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === 'available' }}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'available' && styles.filterTextActive,
              ]}
            >
              Posti Liberi
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              filter === 'completed' && styles.filterChipActive,
            ]}
            onPress={() => setFilter('completed')}
            accessibilityRole="tab"
            accessibilityState={{ selected: filter === 'completed' }}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'completed' && styles.filterTextActive,
              ]}
            >
              Concluse ({completedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {notificationUnavailable && (
          <View style={styles.emptyCard} accessibilityRole="alert">
            <AlertTriangle size={28} color={colors.brassLight} />
            <Text style={styles.emptyTitle}>Sessione non più accessibile</Text>
            <Text style={styles.emptySubtitle}>
              La sessione collegata alla notifica potrebbe essere stata rimossa o non essere più disponibile per il tuo account.
            </Text>
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => setNotificationUnavailable(false)}
            >
              <Text style={styles.resetFilterBtnText}>Chiudi avviso</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && !loading && (
          <View style={styles.emptyCard} accessibilityRole="alert">
            <AlertTriangle size={28} color={colors.crimsonLight} />
            <Text style={styles.emptyTitle}>Errore di caricamento</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
            <TouchableOpacity style={styles.resetFilterBtn} onPress={() => { void refresh(); }}>
              <Text style={styles.resetFilterBtnText}>Riprova</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {filteredSessions.length === 0 && !loading && !error && (
          <View style={styles.emptyCard}>
            <CalendarCheck size={36} color={colors.parchmentMuted} />
            <Text style={styles.emptyTitle}>Nessuna sessione trovata</Text>
            <Text style={styles.emptySubtitle}>
              Non ci sono appuntamenti con i filtri selezionati. Modifica il filtro o
              aggiorna il calendario.
            </Text>
            <TouchableOpacity style={styles.resetFilterBtn} onPress={() => setFilter('all')}>
              <Text style={styles.resetFilterBtnText}>Mostra Tutte</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sessions List */}
        {filteredSessions.map((session) => {
          const isScheduled = session.status === 'scheduled';
          const isCompleted = session.status === 'completed';
          const isAttended = session.mySignup?.status === 'attended';
          const { dateLabel, timeLabel } = formatSessionDateTime(session.scheduled_at);
          const isBusy = actionInProgressId === session.id;

          const campaignName =
            session.campaigns?.name || 'Campagna Barber & Dragons';
          const partyBadge = normalizeSessionPartyBadge(session.campaign_parties);
          const directoryEntry = sessionDirectoryMeta[session.id];
          const dmName =
            directoryEntry?.dmName ||
            (session.campaign_id ? gmNamesByCampaignId[session.campaign_id] : null) ||
            'Master di Gilda';
          const participantNames = directoryEntry?.participants ?? [];

          const confirmed = session.confirmedCount ?? 0;
          const maxPlayers = session.max_players ?? 6;
          const existingFeedback = feedbackBySessionId[session.id] ?? null;
          const isSummaryExpanded = Boolean(expandedSummaryIds[session.id]);

          return (
            <View
              key={session.id}
              style={[
                styles.sessionCard,
                highlightedSessionId === session.id && {
                  borderColor: colors.brassBase,
                  borderWidth: 2,
                },
              ]}
            >
              {/* Card Top: Campaign / Party Badges & Signup Status */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeftBadges}>
                  <View style={styles.campaignBadge}>
                    <Text style={styles.campaignBadgeText} numberOfLines={1}>
                      {campaignName}
                    </Text>
                  </View>

                  {partyBadge && (
                    <View
                      style={[
                        styles.partyBadge,
                        { borderColor: partyBadge.color },
                      ]}
                    >
                      <Text style={[styles.partyBadgeText, { color: partyBadge.color }]}>
                        {partyBadge.name}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Status Badges */}
                {isScheduled && session.isConfirmed && (
                  <View style={styles.statusBadgeConfirmed}>
                    <CheckCircle2 size={12} color={colors.void} />
                    <Text style={styles.statusTextConfirmed}>SEI ISCRITTO</Text>
                  </View>
                )}

                {isScheduled && session.isWaitlist && (
                  <View style={styles.statusBadgeWaitlist}>
                    <Clock size={12} color={colors.brassLight} />
                    <Text style={styles.statusTextWaitlist}>IN ATTESA</Text>
                  </View>
                )}

                {!session.isConfirmed && !session.isWaitlist && isScheduled && (
                  <View
                    style={
                      session.isFull
                        ? styles.statusBadgeFull
                        : styles.statusBadgeAvailable
                    }
                  >
                    <CalendarCheck
                      size={12}
                      color={session.isFull ? colors.parchmentMuted : colors.emerald}
                    />
                    <Text
                      style={
                        session.isFull
                          ? styles.statusTextFull
                          : styles.statusTextAvailable
                      }
                    >
                      {session.isFull ? 'COMPLETO' : 'POSTI LIBERI'}
                    </Text>
                  </View>
                )}

                {isCompleted && (
                  <View style={styles.statusBadgeCompleted}>
                    <CheckCircle2 size={12} color={colors.emerald} />
                    <Text style={styles.statusTextCompleted}>COMPLETATA</Text>
                  </View>
                )}
              </View>

              {/* Tappable Title & Chapter */}
              <TouchableOpacity
                onPress={() => setDetailSession(session)}
                activeOpacity={0.75}
              >
                {session.chapter_title ? (
                  <View style={styles.chapterRow}>
                    <BookOpen size={12} color={colors.brassBase} />
                    <Text style={styles.chapterText}>{session.chapter_title}</Text>
                  </View>
                ) : null}
                <Text style={styles.sessionTitle}>
                  {session.title || 'Sessione Ufficiale'}
                </Text>
              </TouchableOpacity>

              {/* Scheduled Notes */}
              {!isCompleted && session.notes ? (
                <Text style={styles.sessionNotes} numberOfLines={2}>
                  {session.notes}
                </Text>
              ) : null}

              {/* Completed Expandable Summary */}
              {isCompleted && session.session_summary ? (
                <View style={styles.summaryBox}>
                  <TouchableOpacity
                    style={styles.summaryToggleRow}
                    onPress={() => toggleSummary(session.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.summaryToggleLabel}>RIASSUNTO DELLA CRONACA</Text>
                    <View style={styles.summaryToggleAction}>
                      <Text style={styles.summaryToggleCta}>
                        {isSummaryExpanded ? 'Riduci' : 'Leggi tutto'}
                      </Text>
                      {isSummaryExpanded ? (
                        <ChevronUp size={14} color={colors.brassLight} />
                      ) : (
                        <ChevronDown size={14} color={colors.brassLight} />
                      )}
                    </View>
                  </TouchableOpacity>
                  {isSummaryExpanded ? (
                    <View style={{ marginTop: 8 }}>
                      <RichMarkdownView markdown={session.session_summary} />
                    </View>
                  ) : (
                    <Text style={styles.summaryPreviewText} numberOfLines={3}>
                      {session.session_summary.replace(/^#{1,6}\s+/gm, '').trim()}
                    </Text>
                  )}
                </View>
              ) : null}

              {/* Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Calendar size={14} color={colors.brassBase} />
                  <Text style={styles.detailText}>{dateLabel}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Clock size={14} color={colors.parchmentMuted} />
                  <Text style={styles.detailText}>{timeLabel}</Text>
                </View>

                <View style={styles.detailItem}>
                  <MapPin size={14} color={colors.brassLight} />
                  <Text style={styles.detailText}>
                    {session.location || 'Taverna Barber & Dragons'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <User size={14} color={colors.parchmentMuted} />
                  <Text style={styles.detailText}>DM: {dmName}</Text>
                </View>

                {isScheduled && participantNames.length > 0 && (
                  <View style={styles.detailItem}>
                    <Users size={14} color={colors.brassLight} />
                    <Text style={styles.detailParticipantsText} numberOfLines={2}>
                      Al tavolo: {participantNames.join(', ')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Card Footer: Player Capacity & Actions */}
              <View style={styles.cardFooter}>
                {isScheduled && (
                  <View style={styles.actionContainer}>
                    <TouchableOpacity
                      style={styles.playersInfo}
                      onPress={() => setDetailSession(session)}
                      activeOpacity={0.7}
                    >
                      <Users size={14} color={colors.parchmentMuted} />
                      <Text style={styles.playersCount}>
                        {confirmed}/{maxPlayers} Avventurieri
                      </Text>
                      {confirmed >= maxPlayers && (
                        <Text style={styles.fullNoticeText}>(Pieno)</Text>
                      )}
                    </TouchableOpacity>

                    {/* Action Buttons based on status */}
                    {session.isConfirmed ? (
                      <TouchableOpacity
                        style={[
                          styles.cancelBtn,
                          isBusy && styles.actionBtnDisabled,
                        ]}
                        onPress={() => handleCancelPrompt(session)}
                        disabled={isBusy}
                      >
                        <Text style={styles.cancelBtnText}>
                          {isBusy ? 'Aggiornamento...' : 'Disdici Presenza'}
                        </Text>
                      </TouchableOpacity>
                    ) : session.isWaitlist ? (
                      <TouchableOpacity
                        style={[
                          styles.cancelBtn,
                          isBusy && styles.actionBtnDisabled,
                        ]}
                        onPress={() => handleCancelPrompt(session)}
                        disabled={isBusy}
                      >
                        <Text style={styles.cancelBtnText}>
                          {isBusy ? 'Aggiornamento...' : 'Abbandona Attesa'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          session.isFull ? styles.waitlistBtn : styles.signUpBtn,
                          isBusy && styles.actionBtnDisabled,
                        ]}
                        onPress={() => handleSignUpPrompt(session)}
                        disabled={isBusy}
                      >
                        <Sparkles
                          size={13}
                          color={session.isFull ? colors.brassLight : colors.void}
                        />
                        <Text
                          style={
                            session.isFull
                              ? styles.waitlistBtnText
                              : styles.signUpBtnText
                          }
                        >
                          {isBusy
                            ? 'Attendi...'
                            : session.isFull
                            ? 'Entra in Attesa'
                            : 'Iscriviti al Tavolo'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {isCompleted && (
                  <View style={styles.completedInfo}>
                    <View style={styles.attendedBadge}>
                      <Text
                        style={[
                          styles.attendedText,
                          !isAttended && { color: colors.parchmentMuted },
                        ]}
                      >
                        {isAttended ? 'Presenza Registrata' : 'Archivio Campagna'}
                      </Text>
                    </View>

                    {isAttended ? (
                      <TouchableOpacity
                        style={[
                          styles.feedbackActionBtn,
                          existingFeedback && styles.feedbackActionBtnSaved,
                        ]}
                        onPress={() => setFeedbackSession(session)}
                        activeOpacity={0.8}
                      >
                        <Star
                          size={12}
                          color={existingFeedback ? colors.brassLight : colors.void}
                          fill={existingFeedback ? colors.brassBase : colors.void}
                        />
                        <Text
                          style={[
                            styles.feedbackActionBtnText,
                            existingFeedback && styles.feedbackActionBtnTextSaved,
                          ]}
                        >
                          {existingFeedback
                            ? `Feedback ★ ${existingFeedback.session_rating}/5`
                            : 'Valuta Sessione'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.detailLinkBtn}
                        onPress={() => setDetailSession(session)}
                      >
                        <Text style={styles.detailLinkBtnText}>Dettagli ›</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Session Detail Modal */}
      <PlayerSessionDetailModal
        visible={Boolean(detailSession)}
        session={detailSession}
        existingFeedback={detailSession ? feedbackBySessionId[detailSession.id] ?? null : null}
        onClose={() => setDetailSession(null)}
        onSignUp={handleDirectSignUp}
        onCancelSignUp={handleCancelPrompt}
        onOpenFeedback={(sess) => setFeedbackSession(sess)}
      />

      {/* Post-Session Feedback Modal */}
      <SessionFeedbackModal
        visible={Boolean(feedbackSession)}
        session={feedbackSession}
        existingFeedback={feedbackSession ? feedbackBySessionId[feedbackSession.id] ?? null : null}
        onClose={() => setFeedbackSession(null)}
        onSubmit={submitFeedback}
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
  },
  campaignScopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  campaignScopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    maxWidth: 160,
  },
  campaignScopeChipActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  campaignScopeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  campaignScopeChipTextActive: {
    color: colors.void,
    fontWeight: '800',
  },
  changeCampaignIconBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  changeCampaignIconBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  feedbackPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  feedbackPromptTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassLight,
  },
  feedbackPromptSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 1,
  },
  feedbackPromptCta: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.brassBase,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.parchmentMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  filterChipActive: {
    backgroundColor: colors.brassBase,
    borderColor: colors.brassLight,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  filterTextActive: {
    color: colors.void,
  },
  emptyCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetFilterBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassBase,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brassLight,
  },
  sessionCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  headerLeftBadges: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  campaignBadge: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    maxWidth: '100%',
  },
  campaignBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  partyBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
  },
  partyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.emerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusTextConfirmed: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.void,
    letterSpacing: 0.5,
  },
  statusBadgeWaitlist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassBase,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusTextWaitlist: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassLight,
  },
  statusBadgeAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.emerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusTextAvailable: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.emerald,
  },
  statusBadgeFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusTextFull: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  statusBadgeCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.emerald,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusTextCompleted: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.emerald,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  chapterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassBase,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 8,
  },
  sessionNotes: {
    fontSize: 12,
    color: colors.parchmentMuted,
    marginBottom: 10,
    lineHeight: 16,
  },
  summaryBox: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  summaryToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryToggleLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassBase,
    letterSpacing: 0.6,
  },
  summaryToggleAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  summaryToggleCta: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
  summaryPreviewText: {
    fontSize: 12,
    color: colors.parchmentMuted,
    lineHeight: 17,
    marginTop: 6,
  },
  detailsGrid: {
    gap: 8,
    marginBottom: 14,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: colors.parchmentLight,
  },
  detailParticipantsText: {
    flex: 1,
    fontSize: 12,
    color: colors.brassLight,
    fontWeight: '600',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 12,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playersCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentMuted,
  },
  fullNoticeText: {
    fontSize: 10,
    color: colors.crimsonLight,
  },
  signUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.brassLight,
  },
  signUpBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  waitlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.stone,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.brassBase,
  },
  waitlistBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
  },
  cancelBtn: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.crimson,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.crimsonLight,
  },
  actionBtnDisabled: {
    opacity: 0.5,
  },
  completedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  attendedBadge: {
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  attendedText: {
    fontSize: 10,
    color: colors.emerald,
    fontWeight: '700',
  },
  feedbackActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.brassLight,
  },
  feedbackActionBtnSaved: {
    backgroundColor: colors.stone,
    borderColor: 'rgba(212, 175, 55, 0.45)',
  },
  feedbackActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  feedbackActionBtnTextSaved: {
    color: colors.brassLight,
  },
  detailLinkBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detailLinkBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
  },
});

export default SessionsCalendarScreen;
