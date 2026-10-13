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
  Clock,
  Swords,
  MapPin,
  CheckCircle2,
  Users,
  Compass,
  Plus,
  Flame,
  Check,
  AlertCircle,
  Crown,
  BookOpen,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign, CAMPAIGN_TYPE_BADGES, CAMPAIGN_TYPE_LABELS } from '../../contexts/CampaignContext';
import { usePlayerSessions } from '../../hooks/usePlayerSessions';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { GmCreateSessionModal } from '../../components/gm/GmCreateSessionModal';
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

export const GuildHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { profile, user, role } = useAuth();
  const isGmOrAdmin = role === 'gm' || role === 'admin';

  const {
    campaigns,
    activeCampaign,
    activeCampaignId,
    selectCampaign,
    refreshCampaigns,
    isLoading: campaignsLoading,
  } = useCampaign();

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
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState<boolean>(false);
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState<boolean>(false);

  const displayName =
    profile?.display_name ||
    profile?.nickname ||
    user?.email?.split('@')[0] ||
    'Avventuriero';

  const isRefreshing = campaignsLoading || sessionsLoading;

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshCampaigns(), refreshSessions()]);
  }, [refreshCampaigns, refreshSessions]);

  // Spotlight Next Session
  const spotlightSession = useMemo(() => {
    if (nextConfirmedSession) return nextConfirmedSession;
    // For GM: check next scheduled session where user is GM
    if (isGmOrAdmin && user?.id) {
      const now = new Date().toISOString();
      const nextGm = sessions
        .filter((s) => s.dm_id === user.id && s.scheduled_at >= now)
        .sort((a, b) => (a.scheduled_at > b.scheduled_at ? 1 : -1))[0];
      if (nextGm) return nextGm;
    }
    // Fallback: earliest upcoming session
    const now = new Date().toISOString();
    return sessions.filter((s) => s.scheduled_at >= now)[0] ?? null;
  }, [nextConfirmedSession, sessions, isGmOrAdmin, user?.id]);

  const countdown = useMemo(() => {
    if (!spotlightSession?.scheduled_at) return null;
    return computeCountdown(spotlightSession.scheduled_at);
  }, [spotlightSession?.scheduled_at]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    let list = [...sessions];
    const nowIso = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    list = list.filter((s) => s.scheduled_at >= nowIso);

    if (sessionFilter === 'mine') {
      list = list.filter((s) => s.isConfirmed || s.dm_id === user?.id);
    } else if (sessionFilter === 'available') {
      list = list.filter((s) => !s.isFull && !s.isConfirmed);
    }

    return list.sort((a, b) => (a.scheduled_at > b.scheduled_at ? 1 : -1));
  }, [sessions, sessionFilter, user?.id]);

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    if (campaignFilter === 'all') return campaigns;
    return campaigns.filter((c) => c.type === campaignFilter);
  }, [campaigns, campaignFilter]);

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
        {/* HERO ARALDICO DELLA GILDA */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.guildTag}>
              <Flame size={12} color={colors.brassLight} />
              <Text style={styles.guildTagText}>BARBER & DRAGONS · NAPOLI</Text>
            </View>
            <View style={styles.roleTag}>
              {isGmOrAdmin ? (
                <>
                  <Crown size={12} color={colors.brassBase} />
                  <Text style={styles.roleTagText}>GAME MASTER</Text>
                </>
              ) : (
                <>
                  <Shield size={12} color={colors.brassLight} />
                  <Text style={styles.roleTagText}>AVVENTURIERO</Text>
                </>
              )}
            </View>
          </View>

          <Text style={styles.welcomeTitle}>Salute, {displayName}</Text>
          <Text style={styles.welcomeSubtitle}>
            {isGmOrAdmin
              ? 'La plancia di comando della Gilda è pronta. Consulta i tavoli aperti, gestisci le cronache e guida gli avventurieri nella mischia.'
              : 'Benvenuto nel cuore operativo della gilda. Controlla le prossime convocazioni al tavolo e sfoglia tutte le saghe attive.'}
          </Text>

          {/* Ribbon Statistiche Veloci */}
          <View style={styles.statsRibbon}>
            <View style={styles.statBox}>
              <View style={styles.statBoxHeader}>
                <Swords size={12} color={colors.brassBase} />
                <Text style={styles.statBoxLabel}>SAGHE</Text>
              </View>
              <Text style={styles.statBoxVal}>{campaigns.length}</Text>
            </View>

            <View style={styles.statBoxDivider} />

            <View style={styles.statBox}>
              <View style={styles.statBoxHeader}>
                <Calendar size={12} color={colors.brassBase} />
                <Text style={styles.statBoxLabel}>TAVOLI</Text>
              </View>
              <Text style={styles.statBoxVal}>{sessions.length}</Text>
            </View>

            <View style={styles.statBoxDivider} />

            <View style={styles.statBox}>
              <View style={styles.statBoxHeader}>
                <Award size={12} color={colors.brassBase} />
                <Text style={styles.statBoxLabel}>FAMA</Text>
              </View>
              <Text style={styles.statBoxVal}>{profile?.fame_score ?? 10}</Text>
            </View>
          </View>
        </View>

        {/* SPOTLIGHT PROSSIMA CONVOCAZIONE */}
        <View style={styles.sectionHeaderRow}>
          <Calendar size={17} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>PROSSIMA CONVOCAZIONE</Text>
        </View>

        {spotlightSession ? (
          <View style={styles.spotlightCard}>
            <View style={styles.spotlightTopRow}>
              <View style={styles.spotlightCampaignBadge}>
                <Text style={styles.spotlightCampaignText}>
                  ✦ {spotlightSession.campaigns?.name || 'TAVOLO DI GIOCO'}
                </Text>
              </View>
              {countdown && (
                <View
                  style={[
                    styles.countdownBadge,
                    countdown.isImminent && styles.countdownImminent,
                  ]}
                >
                  <Clock size={11} color={countdown.isImminent ? '#FFF' : colors.brassLight} />
                  <Text
                    style={[
                      styles.countdownText,
                      countdown.isImminent && styles.countdownTextImminent,
                    ]}
                  >
                    {countdown.label}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.spotlightTitle}>
              {spotlightSession.title || 'Sessione Ufficiale al Tavolo'}
            </Text>

            <View style={styles.spotlightDetails}>
              <View style={styles.detailRow}>
                <Calendar size={13} color={colors.brassLight} />
                <Text style={styles.detailText}>
                  {formatSessionDate(spotlightSession.scheduled_at).dayName}{' '}
                  {formatSessionDate(spotlightSession.scheduled_at).dayNum}{' '}
                  {formatSessionDate(spotlightSession.scheduled_at).month} · Ore{' '}
                  {formatSessionDate(spotlightSession.scheduled_at).time}
                </Text>
              </View>

              {spotlightSession.location ? (
                <View style={styles.detailRow}>
                  <MapPin size={13} color={colors.brassLight} />
                  <Text style={styles.detailText}>{spotlightSession.location}</Text>
                </View>
              ) : null}

              <View style={styles.detailRow}>
                <Users size={13} color={colors.brassLight} />
                <Text style={styles.detailText}>
                  {spotlightSession.confirmedCount ?? 0} / {spotlightSession.max_players ?? 6} Posti occupati
                </Text>
              </View>
            </View>

            <View style={styles.spotlightFooter}>
              {spotlightSession.isConfirmed ? (
                <View style={styles.confirmedPill}>
                  <CheckCircle2 size={13} color={colors.emerald} />
                  <Text style={styles.confirmedPillText}>Posto Confermato</Text>
                </View>
              ) : spotlightSession.dm_id === user?.id ? (
                <View style={styles.confirmedPill}>
                  <Crown size={13} color={colors.brassLight} />
                  <Text style={styles.confirmedPillText}>Guida come Master</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.spotlightActionBtn}
                  onPress={() => handleSignUp(spotlightSession)}
                  disabled={actionInProgressId === spotlightSession.id || spotlightSession.isFull}
                >
                  <Text style={styles.spotlightActionBtnText}>
                    {spotlightSession.isFull ? 'Tavolo Pieno' : 'Prenota Questo Tavolo'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Compass size={28} color={colors.brassDark} />
            <Text style={styles.emptyTitle}>Nessuna Convocazione Imminente</Text>
            <Text style={styles.emptySubtitle}>
              Consulta il calendario sottostante per iscriverti a una sessione aperta o attendi la convocazione del tuo Master.
            </Text>
          </View>
        )}

        {/* CALENDARIO DELLE SESSIONI SUL SITO */}
        <View style={styles.sectionHeaderWithAction}>
          <View style={styles.sectionHeaderRowInline}>
            <Calendar size={17} color={colors.brassBase} />
            <Text style={styles.sectionTitle}>CALENDARIO SESSIONI</Text>
          </View>

          {isGmOrAdmin && (
            <TouchableOpacity
              style={styles.gmCreateBtn}
              onPress={() => setIsCreateSessionModalOpen(true)}
              activeOpacity={0.8}
            >
              <Plus size={13} color={colors.void} />
              <Text style={styles.gmCreateBtnText}>Nuova Data</Text>
            </TouchableOpacity>
          )}
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

        {/* Lista Sessioni */}
        {filteredSessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Calendar size={26} color={colors.stoneBorder} />
            <Text style={styles.emptySubtitle}>
              Nessuna sessione trovata per questo filtro.
            </Text>
          </View>
        ) : (
          filteredSessions.map((session) => {
            const dateMeta = formatSessionDate(session.scheduled_at);
            const isFull = session.isFull;
            const isConfirmed = session.isConfirmed;
            const isMyDm = session.dm_id === user?.id;
            const isBusy = actionInProgressId === session.id;

            return (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionCardLeftDate}>
                  <Text style={styles.sessionDayNum}>{dateMeta.dayNum}</Text>
                  <Text style={styles.sessionMonth}>{dateMeta.month}</Text>
                  <Text style={styles.sessionTime}>{dateMeta.time}</Text>
                </View>

                <View style={styles.sessionCardCenter}>
                  <View style={styles.sessionCampaignTag}>
                    <Text style={styles.sessionCampaignTagText}>
                      {session.campaigns?.name || 'CAMPAGNA'}
                    </Text>
                  </View>

                  <Text style={styles.sessionCardTitle} numberOfLines={2}>
                    {session.title || 'Sessione di Gioco'}
                  </Text>

                  <View style={styles.sessionCardMetaRow}>
                    <MapPin size={11} color={colors.parchmentMuted} />
                    <Text style={styles.sessionCardMetaText} numberOfLines={1}>
                      {session.location || 'Tavolo Taverna'}
                    </Text>
                  </View>

                  <View style={styles.sessionCardOccupancyRow}>
                    <Users size={11} color={colors.brassLight} />
                    <Text style={styles.sessionCardOccupancyText}>
                      {session.confirmedCount ?? 0}/{session.max_players ?? 6} posti
                    </Text>
                    <View style={styles.occupancyBarBackground}>
                      <View
                        style={[
                          styles.occupancyBarFill,
                          {
                            width: `${Math.min(
                              100,
                              Math.round(
                                ((session.confirmedCount ?? 0) / (session.max_players ?? 6)) * 100
                              )
                            )}%`,
                            backgroundColor: isFull
                              ? colors.crimsonLight
                              : colors.brassBase,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.sessionCardRightAction}>
                  {isBusy ? (
                    <ActivityIndicator size="small" color={colors.brassBase} />
                  ) : isConfirmed ? (
                    <TouchableOpacity
                      style={styles.cancelSessionBtn}
                      onPress={() => handleCancelSignUp(session)}
                    >
                      <CheckCircle2 size={13} color={colors.emerald} />
                      <Text style={styles.cancelSessionBtnText}>Iscritto</Text>
                    </TouchableOpacity>
                  ) : isMyDm ? (
                    <View style={styles.dmBadge}>
                      <Crown size={12} color={colors.brassLight} />
                      <Text style={styles.dmBadgeText}>Tuo Tavolo</Text>
                    </View>
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
                      <ChevronRight size={12} color={colors.void} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}

        {/* PANORAMICA DI TUTTE LE CAMPAGNE (COME SUL SITO) */}
        <View style={styles.sectionHeaderRow}>
          <Swords size={17} color={colors.brassBase} />
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

        {/* Griglia Campagne */}
        {filteredCampaigns.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpen size={26} color={colors.stoneBorder} />
            <Text style={styles.emptySubtitle}>Nessuna campagna in questa categoria.</Text>
          </View>
        ) : (
          filteredCampaigns.map((camp) => {
            const campType: CampaignType = camp.type || 'quest';
            const badgeMeta = CAMPAIGN_TYPE_BADGES[campType] || CAMPAIGN_TYPE_BADGES.quest;
            const isActive = camp.id === activeCampaignId;

            return (
              <View key={camp.id} style={[styles.campaignCard, isActive && styles.campaignCardActive]}>
                {camp.image_url ? (
                  <Image source={{ uri: camp.image_url }} style={styles.campaignCoverImage} />
                ) : (
                  <View style={styles.campaignCoverFallback}>
                    <Shield size={34} color={colors.stoneBorder} />
                  </View>
                )}

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
                        <Text style={styles.activePillBadgeText}>Attiva</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.campaignCardTitle}>{camp.name}</Text>

                  {camp.description ? (
                    <Text style={styles.campaignCardDesc} numberOfLines={3}>
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
                          <Text style={styles.selectCampBtnActiveText}>Campagna in Uso</Text>
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
          })
        )}
      </ScrollView>

      {/* MODALS */}
      <CampaignSelectorModal
        visible={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
      />

      {isGmOrAdmin && (
        <GmCreateSessionModal
          visible={isCreateSessionModalOpen}
          onClose={() => setIsCreateSessionModalOpen(false)}
          campaignId={activeCampaignId || undefined}
          onSessionCreated={() => {
            void refreshSessions();
          }}
        />
      )}
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
    gap: 16,
  },

  // HERO CARD
  heroCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 18,
    gap: 12,
    shadowColor: colors.void,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  guildTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(197, 155, 39, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(197, 155, 39, 0.3)',
  },
  guildTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.8,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.5,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.5,
  },
  welcomeSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.parchmentMuted,
  },

  // STATS RIBBON
  statsRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.stone,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  statBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassBase,
    letterSpacing: 0.6,
  },
  statBoxVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  statBoxDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.stoneBorder,
  },

  // SECTION HEADERS
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  sectionHeaderWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sectionHeaderRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 1,
  },
  gmCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  gmCreateBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },

  // SPOTLIGHT CARD
  spotlightCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    padding: 16,
    gap: 10,
  },
  spotlightTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  spotlightCampaignBadge: {
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.brassDark,
  },
  spotlightCampaignText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.5,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  countdownImminent: {
    backgroundColor: colors.crimson,
    borderColor: colors.crimsonLight,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  countdownTextImminent: {
    color: '#FFF',
  },
  spotlightTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  spotlightDetails: {
    gap: 6,
    backgroundColor: colors.stone,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  detailText: {
    fontSize: 12,
    color: colors.parchmentLight,
    fontWeight: '500',
  },
  spotlightFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  confirmedPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.emerald,
  },
  spotlightActionBtn: {
    backgroundColor: colors.brassBase,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  spotlightActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.void,
  },

  // EMPTY CARD
  emptyCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 17,
  },

  // FILTER PILLS
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  campaignFiltersScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
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

  // SESSION CARD
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    gap: 12,
  },
  sessionCardLeftDate: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stone,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  sessionDayNum: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.brassLight,
  },
  sessionMonth: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.parchmentMuted,
    textTransform: 'uppercase',
  },
  sessionTime: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginTop: 2,
  },
  sessionCardCenter: {
    flex: 1,
    gap: 4,
  },
  sessionCampaignTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(197, 155, 39, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionCampaignTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassLight,
  },
  sessionCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  sessionCardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionCardMetaText: {
    fontSize: 11,
    color: colors.parchmentMuted,
  },
  sessionCardOccupancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  sessionCardOccupancyText: {
    fontSize: 10,
    color: colors.brassLight,
    fontWeight: '700',
  },
  occupancyBarBackground: {
    flex: 1,
    height: 4,
    backgroundColor: colors.stone,
    borderRadius: 2,
    overflow: 'hidden',
  },
  occupancyBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  sessionCardRightAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 70,
  },
  joinSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 7,
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
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cancelSessionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.emerald,
  },
  dmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 6,
  },
  dmBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
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

  // CAMPAIGN CARDS
  campaignCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    overflow: 'hidden',
  },
  campaignCardActive: {
    borderColor: colors.brassBase,
    borderWidth: 1.5,
  },
  campaignCoverImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  campaignCoverFallback: {
    width: '100%',
    height: 80,
    backgroundColor: colors.stone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignCardBody: {
    padding: 14,
    gap: 8,
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
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  campaignCardDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.parchmentMuted,
  },
  campaignCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  selectCampBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  selectCampBtnActive: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
  },
  selectCampBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  selectCampBtnActiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
  },
});

export default GuildHomeScreen;
