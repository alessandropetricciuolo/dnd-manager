import React, { useState, useMemo, useCallback } from 'react';
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
  Repeat,
  Swords,
  ChevronRight,
  Check,
  Calendar,
  Sparkles,
  Users,
  Activity,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';
import { useGmCampaigns } from '../../hooks/useGmCampaigns';
import { CAMPAIGN_TYPE_BADGES } from '../../contexts/CampaignContext';
import { GridCalendar } from '../../components/common/GridCalendar';
import { ExpandableCampaignCard } from '../../components/common/ExpandableCampaignCard';
import { GmCreateSessionModal } from '../../components/gm/GmCreateSessionModal';
import { GmSessionSignupsModal } from '../../components/gm/GmSessionSignupsModal';
import { GmSessionsManagerModal } from '../../components/gm/GmSessionsManagerModal';
import { Campaign, CampaignType, Session } from '../../types';

type CampaignFilter = 'all' | 'oneshot' | 'quest' | 'long' | 'torneo';

export const GmHomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { profile, user, role, switchMode } = useAuth();
  const {
    campaigns,
    activeCampaign,
    selectCampaign,
    sessions,
    allGuildSessions,
    characters,
    isRefreshing,
    refreshSessionData,
    refreshCampaigns,
  } = useGmCampaigns();

  // Filters state
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>('all');

  // Modals state
  const [createSessionModalVisible, setCreateSessionModalVisible] = useState<boolean>(false);
  const [signupsModalVisible, setSignupsModalVisible] = useState<boolean>(false);
  const [sessionsManagerModalVisible, setSessionsManagerModalVisible] = useState<boolean>(false);
  const [selectedSessionForSignups, setSelectedSessionForSignups] = useState<Session | null>(null);

  const gmName =
    profile?.display_name ||
    profile?.nickname ||
    user?.email?.split('@')[0] ||
    'Game Master';

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshCampaigns(), refreshSessionData()]);
  }, [refreshCampaigns, refreshSessionData]);

  // Statistics
  const totalSessionsList = allGuildSessions && allGuildSessions.length > 0 ? allGuildSessions : sessions;
  const completedSessionsCount = totalSessionsList.filter((s) => s.status === 'completed').length;
  const scheduledSessionsCount = totalSessionsList.filter((s) => s.status === 'scheduled').length;

  // Filtered Campaigns
  const filteredCampaigns = useMemo(() => {
    if (campaignFilter === 'all') return campaigns;
    return campaigns.filter((c) => c.type === campaignFilter);
  }, [campaigns, campaignFilter]);

  const handleSelectCampaign = async (camp: Campaign) => {
    if (camp.id === activeCampaign?.id) return;
    try {
      await selectCampaign(camp.id);
      Alert.alert('Campagna Selezionata', `"${camp.name}" è ora la campagna attiva per la Regia.`);
    } catch {
      Alert.alert('Errore', 'Impossibile selezionare la campagna.');
    }
  };

  const handleOpenSignups = (sess: Session) => {
    setSelectedSessionForSignups(sess);
    setSignupsModalVisible(true);
  };

  const handleSelectSession = (sess: Session) => {
    if (sess.campaign_id && sess.campaign_id !== activeCampaign?.id) {
      void selectCampaign(sess.campaign_id);
    }
    handleOpenSignups(sess);
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
          {(role === 'admin' || role === 'gm') && (
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
              <Text style={styles.roleBadgeText}>PLANCIA DI GILDA</Text>
            </View>
            <View style={styles.fameBadge}>
              <Sparkles size={12} color={colors.brassBase} />
              <Text style={styles.fameBadgeText}>{campaigns.length} Campagne</Text>
            </View>
          </View>

          <Text style={styles.welcomeTitle}>Salute a te, Master {gmName}</Text>
          <Text style={styles.welcomeSubtitle}>
            Consulta il calendario a griglia di tutte le sessioni e seleziona le campagne della Gilda.
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
              <Calendar size={14} color={colors.emerald} />
              <Text style={styles.statVal}>{scheduledSessionsCount}</Text>
              <Text style={styles.statDesc}>In Programma</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Sparkles size={14} color={colors.brassLight} />
              <Text style={styles.statVal}>{completedSessionsCount}</Text>
              <Text style={styles.statDesc}>Concluse</Text>
            </View>
          </View>
        </View>

        {/* Quick Link to Dedicated Regia Page */}
        <TouchableOpacity
          style={styles.regiaBanner}
          onPress={() => navigation.navigate('GmRegia')}
          activeOpacity={0.85}
        >
          <View style={styles.regiaBannerIconBox}>
            <Activity size={22} color={colors.brassLight} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.regiaBadgeRow}>
              <Text style={styles.regiaBadgeText}>PLANCIA LIVE DEDICATA</Text>
            </View>
            <Text style={styles.regiaBannerTitle}>Regia Live del Master</Text>
            <Text style={styles.regiaBannerSub}>
              Sessione e party in sola lettura, più combattimento e audio collegati al GM Screen
            </Text>
          </View>
          <ChevronRight size={18} color={colors.brassLight} />
        </TouchableOpacity>

        {/* 1. VERO CALENDARIO A GRIGLIA DELLE SESSIONI */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Calendar size={18} color={colors.brassBase} />
            <Text style={styles.sectionTitle}>CALENDARIO SESSIONI DELLA GILDA</Text>
          </View>
        </View>

        <GridCalendar
          sessions={allGuildSessions && allGuildSessions.length > 0 ? allGuildSessions : sessions}
          activeCampaignId={activeCampaign?.id}
          isGmView={true}
          onSelectSession={handleSelectSession}
          onGmManageSession={handleOpenSignups}
          onGmCreateSession={() => setCreateSessionModalVisible(true)}
        />

        {/* 2. PANORAMICA DI TUTTE LE CAMPAGNE DELLA GILDA */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Swords size={18} color={colors.brassBase} />
            <Text style={styles.sectionTitle}>PANORAMICA DI TUTTE LE CAMPAGNE</Text>
          </View>
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

        {/* Elenco Campagne con Copertina ed Espansione al Tap */}
        <View style={styles.campaignsGrid}>
          {filteredCampaigns.map((camp) => {
            const isActive = camp.id === activeCampaign?.id;
            const nextCampSession = (allGuildSessions || []).find(
              (s) => s.campaign_id === camp.id && s.status === 'scheduled'
            );

            return (
              <ExpandableCampaignCard
                key={camp.id}
                campaign={camp}
                isActive={isActive}
                onSelect={handleSelectCampaign}
                isGmView={true}
                onNavigateRegia={() => navigation.navigate('Regia')}
                upcomingSession={nextCampSession}
              />
            );
          })}
        </View>
      </ScrollView>

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
    marginBottom: 14,
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
  regiaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.brassBase,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  regiaBannerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regiaBadgeRow: {
    alignSelf: 'flex-start',
    backgroundColor: colors.stone,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
  },
  regiaBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: colors.brassLight,
    letterSpacing: 0.5,
  },
  regiaBannerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.parchmentLight,
    marginBottom: 2,
  },
  regiaBannerSub: {
    fontSize: 10,
    color: colors.parchmentMuted,
    lineHeight: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 1,
  },
  campaignFiltersScroll: {
    gap: 6,
    paddingBottom: 8,
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
  campaignsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
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
});

export default GmHomeScreen;
