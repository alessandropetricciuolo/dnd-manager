import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
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
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useCampaign, CAMPAIGN_TYPE_BADGES } from '../../contexts/CampaignContext';
import { usePlayerCharacter } from '../../hooks/usePlayerCharacter';
import { usePlayerSessions } from '../../hooks/usePlayerSessions';
import { DiceRollerModal } from '../../components/player/DiceRollerModal';
import { CampaignSelectorModal } from '../../components/common/CampaignSelectorModal';
import { CampaignType } from '../../types';

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
      return { label: `Oggi • Tra ${diffHours} ore`, isImminent: true };
    } else if (diffDays === 1) {
      return { label: `Domani (${remainingHours}h)`, isImminent: false };
    } else {
      return { label: `Tra ${diffDays} gg e ${remainingHours} ore`, isImminent: false };
    }
  } catch {
    return { label: 'In arrivo', isImminent: false };
  }
}

export const PlayerHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { profile, user, role, switchMode } = useAuth();
  const { activeCampaign } = useCampaign();
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
  } = usePlayerSessions();

  const isAdmin = role === 'admin';

  // Modal states
  const [isDiceModalOpen, setIsDiceModalOpen] = useState<boolean>(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState<boolean>(false);

  const displayName =
    profile?.display_name ||
    profile?.nickname ||
    user?.email?.split('@')[0] ||
    'Avventuriero';

  const isRefreshing = charLoading || sessionsLoading;

  const onRefresh = () => {
    refreshCharacter();
    refreshSessions();
  };

  // Next session details
  const targetSession = nextConfirmedSession;
  const countdownInfo = useMemo(() => {
    if (!targetSession?.scheduled_at) return null;
    return computeCountdown(targetSession.scheduled_at);
  }, [targetSession?.scheduled_at]);

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

        {/* Tavolo da Gioco / Campagna Attiva */}
        <View style={styles.sectionHeader}>
          <Swords size={18} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>CAMPAGNA ATTIVA</Text>
        </View>

        <View style={styles.campaignActiveCard}>
          <View style={styles.campaignActiveTop}>
            <View style={[styles.campaignTypeBadge, { backgroundColor: campBadge.bg, borderColor: campBadge.border }]}>
              <Text style={[styles.campaignTypeBadgeText, { color: campBadge.text }]}>{campBadge.label}</Text>
            </View>
            <TouchableOpacity
              style={styles.changeCampaignBtn}
              onPress={() => setIsCampaignModalOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.changeCampaignBtnText}>Cambia Campagna</Text>
              <ChevronRight size={13} color={colors.brassLight} />
            </TouchableOpacity>
          </View>

          <Text style={styles.campaignActiveTitle}>{activeCampaign?.name || 'Seleziona Campagna'}</Text>
          {activeCampaign?.description ? (
            <Text style={styles.campaignActiveDesc} numberOfLines={2}>
              {activeCampaign.description}
            </Text>
          ) : null}
        </View>

        {/* Prossima Sessione in Programma con Countdown Live */}
        <View style={styles.sectionHeader}>
          <Calendar size={18} color={colors.brassBase} />
          <Text style={styles.sectionTitle}>PROSSIMA SESSIONE</Text>
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

            <Text style={styles.sessionTitle}>{targetSession.title}</Text>

            <View style={styles.sessionDetailsRow}>
              <View style={styles.sessionDetailItem}>
                <MapPin size={13} color={colors.brassLight} />
                <Text style={styles.sessionInfoText}>
                  {targetSession.location || 'Barber & Dragons - Salone Est'}
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
                    : 'Guglielmo Il Barbiere'}
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
              <Text style={styles.browseSessionsBtnText}>Consulta Calendario</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scheda PG Rapida Live con barra HP interattiva */}
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

        {/* Quick Dice Roller Launch Banner */}
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
    paddingBottom: 36,
  },
  campaignActiveCard: {
    backgroundColor: colors.stone,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    padding: 16,
    marginBottom: 20,
    shadowColor: colors.brassBase,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  campaignActiveTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  campaignTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
  },
  campaignTypeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  changeCampaignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stoneSurface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  changeCampaignBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  campaignActiveTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  campaignActiveDesc: {
    fontSize: 11,
    color: colors.parchmentMuted,
    lineHeight: 16,
  },
  noCharacterCard: {
    backgroundColor: colors.stone,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    marginBottom: 20,
  },
  noCharacterTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 4,
  },
  noCharacterSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 14,
  },
  selectOtherCampaignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  selectOtherCampaignBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  gmNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  gmNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  gmNoticeText: {
    fontSize: 12,
    color: colors.parchmentLight,
  },
  boldText: {
    fontWeight: '700',
    color: colors.brassLight,
  },
  gmSwitchButton: {
    backgroundColor: colors.brassBase,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  gmSwitchButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.void,
  },
  headerCard: {
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
    letterSpacing: 0.5,
  },
  fameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  fameBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.parchmentLight,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: colors.parchmentMuted,
    lineHeight: 18,
    marginBottom: 14,
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 10,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  profileStatLabel: {
    fontSize: 9,
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
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.parchmentMuted,
  },
  sessionCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 16,
    marginBottom: 20,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  campaignTag: {
    backgroundColor: colors.stone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  campaignTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
    letterSpacing: 0.5,
  },
  statusLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.emerald,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.emerald,
    letterSpacing: 0.5,
  },
  statusWaitlist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusWaitlistText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  statusOpen: {
    backgroundColor: colors.stone,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusOpenText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.emerald,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.parchmentLight,
    marginBottom: 6,
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
    gap: 6,
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
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brassLight,
  },
  countdownTextImminent: {
    color: colors.void,
    backgroundColor: colors.brassBase,
  },
  sessionDivider: {
    height: 1,
    backgroundColor: colors.stoneBorder,
    marginBottom: 12,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dmLabel: {
    fontSize: 12,
    color: colors.parchmentMuted,
  },
  dmName: {
    fontWeight: '600',
    color: colors.parchmentLight,
  },
  sessionDetailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionDetailsText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brassLight,
  },
  noSessionCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  noSessionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 4,
  },
  noSessionSubtitle: {
    fontSize: 12,
    color: colors.parchmentMuted,
    textAlign: 'center',
    marginBottom: 14,
  },
  browseSessionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  browseSessionsBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  characterPreviewCard: {
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 16,
    marginBottom: 20,
  },
  characterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarCrest: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.stone,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brassLight,
  },
  characterDetails: {
    flex: 1,
  },
  characterName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.parchmentLight,
  },
  characterClass: {
    fontSize: 12,
    color: colors.brassLight,
    marginTop: 2,
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
    fontWeight: '700',
    color: colors.brassLight,
  },
  quickHpSection: {
    backgroundColor: colors.stone,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
    marginBottom: 12,
  },
  quickHpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hpLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickHpTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.parchmentMuted,
    letterSpacing: 0.8,
  },
  quickHpValues: {
    fontSize: 12,
    fontWeight: '800',
  },
  quickHpTrack: {
    height: 6,
    backgroundColor: colors.stoneSurface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  quickHpFill: {
    height: '100%',
  },
  quickHpButtonsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickStepBtn: {
    flex: 1,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center',
  },
  quickStepBtnDamageText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.crimsonLight,
  },
  quickStepBtnHealText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.emerald,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.stone,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.parchmentMuted,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
  },
  diceLauncherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.stoneSurface,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
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
    color: colors.parchmentLight,
  },
  diceLauncherSub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brassLight,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 11,
    color: colors.parchmentMuted,
    lineHeight: 16,
  },
});

export default PlayerHomeScreen;
