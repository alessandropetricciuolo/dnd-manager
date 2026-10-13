import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  CalendarCheck,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Users,
  Swords,
  Compass,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useCampaign } from '../../contexts/CampaignContext';
import { usePlayerSessions } from '../../hooks/usePlayerSessions';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { PlayerSession } from '../../types';

type FilterType = 'all' | 'mine' | 'available' | 'completed';

export const SessionsCalendarScreen: React.FC = () => {
  const { activeCampaign } = useCampaign();
  const {
    sessions,
    filterByCampaign,
    setFilterByCampaign,
    loading,
    refresh,
    signUpForSession,
    cancelSignUp,
  } = usePlayerSessions();

  const [filter, setFilter] = useState<FilterType>('all');
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState<boolean>(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

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

  // Filtered session list
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
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
  }, [sessions, filter]);

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
        onPress: async () => {
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
    <SafeAreaView style={styles.safeArea}>
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
            Appuntamenti, campagne e disponibilità al tavolo da gioco della taverna.
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
          >
            <Text style={styles.changeCampaignIconBtnText}>Cambia ▾</Text>
          </TouchableOpacity>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
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
          >
            <Text
              style={[
                styles.filterText,
                filter === 'completed' && styles.filterTextActive,
              ]}
            >
              Concluse
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Empty State */}
        {filteredSessions.length === 0 && !loading && (
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
          const { dateLabel, timeLabel } = formatSessionDateTime(session.scheduled_at);
          const isBusy = actionInProgressId === session.id;

          const campaignName =
            session.campaigns?.name || 'Campagna Barber & Dragons';
          const dmName = session.dm_id?.startsWith('dm-')
            ? session.dm_id.replace('dm-', '').toUpperCase()
            : 'Guglielmo Il Barbiere';

          const confirmed = session.confirmedCount ?? 0;
          const maxPlayers = session.max_players ?? 6;

          return (
            <View key={session.id} style={styles.sessionCard}>
              {/* Card Top: Campaign Badge & Signup Status */}
              <View style={styles.cardHeader}>
                <View style={styles.campaignBadge}>
                  <Text style={styles.campaignBadgeText}>{campaignName}</Text>
                </View>

                {/* Status Badges */}
                {session.isConfirmed && (
                  <View style={styles.statusBadgeConfirmed}>
                    <CheckCircle2 size={12} color={colors.void} />
                    <Text style={styles.statusTextConfirmed}>SEI ISCRITTO</Text>
                  </View>
                )}

                {session.isWaitlist && (
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

              {/* Session Title */}
              <Text style={styles.sessionTitle}>{session.title}</Text>

              {/* Notes or Summary */}
              {(session.notes || session.session_summary) && (
                <Text style={styles.sessionNotes} numberOfLines={2}>
                  {session.notes || session.session_summary}
                </Text>
              )}

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
                    {session.location || 'Taverna Barber & Dragons - Tavolo Est'}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <User size={14} color={colors.parchmentMuted} />
                  <Text style={styles.detailText}>DM: {dmName}</Text>
                </View>
              </View>

              {/* Card Footer: Player Capacity & Actions */}
              <View style={styles.cardFooter}>
                {isScheduled && (
                  <View style={styles.actionContainer}>
                    <View style={styles.playersInfo}>
                      <Users size={14} color={colors.parchmentMuted} />
                      <Text style={styles.playersCount}>
                        {confirmed}/{maxPlayers} Avventurieri
                      </Text>
                      {confirmed >= maxPlayers && (
                        <Text style={styles.fullNoticeText}>(Tavolo Pieno)</Text>
                      )}
                    </View>

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
                    <Text style={styles.xpGained}>
                      Ricompensa della Serata: +450 XP
                    </Text>
                    <View style={styles.attendedBadge}>
                      <Text style={styles.attendedText}>Presenza Registrata</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

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
    alignItems: 'center',
    marginBottom: 10,
  },
  campaignBadge: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    maxWidth: '60%',
  },
  campaignBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
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
  sessionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 6,
  },
  sessionNotes: {
    fontSize: 12,
    color: colors.parchmentMuted,
    marginBottom: 10,
    lineHeight: 16,
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
  },
  xpGained: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brassLight,
  },
  attendedBadge: {
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  attendedText: {
    fontSize: 10,
    color: colors.emerald,
    fontWeight: '600',
  },
});

export default SessionsCalendarScreen;
