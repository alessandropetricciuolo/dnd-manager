import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { profile, user } = useAuth();
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
  const [showAllCampaigns, setShowAllCampaigns] = useState<boolean>(false);

  // Modals state
  const [createSessionModalVisible, setCreateSessionModalVisible] = useState<boolean>(false);
  const [signupsModalVisible, setSignupsModalVisible] = useState<boolean>(false);
  const [sessionsManagerModalVisible, setSessionsManagerModalVisible] = useState<boolean>(false);
  const [selectedSessionForSignups, setSelectedSessionForSignups] = useState<Session | null>(null);

  const rawGmName =
    profile?.display_name ||
    profile?.nickname ||
    user?.email?.split('@')[0] ||
    'Game Master';
  const gmName = rawGmName.replace(/^master\s+/i, '');

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

  const upcomingSessionByCampaignId = useMemo(() => {
    const map = new Map<string, Session>();
    for (const s of allGuildSessions || []) {
      if (s.campaign_id && s.status === 'scheduled' && !map.has(s.campaign_id)) {
        map.set(s.campaign_id, s);
      }
    }
    return map;
  }, [allGuildSessions]);

  const visibleCampaigns = useMemo(() => {
    if (showAllCampaigns || filteredCampaigns.length <= 6) return filteredCampaigns;
    const initial = filteredCampaigns.slice(0, 6);
    if (activeCampaign?.id && !initial.some((c) => c.id === activeCampaign.id)) {
      const activeInFiltered = filteredCampaigns.find((c) => c.id === activeCampaign.id);
      if (activeInFiltered) {
        return [activeInFiltered, ...initial.slice(0, 5)];
      }
    }
    return initial;
  }, [filteredCampaigns, showAllCampaigns, activeCampaign?.id]);

  const handleSelectCampaign = useCallback(async (camp: Campaign) => {
    if (camp.id === activeCampaign?.id) return;
    try {
      await selectCampaign(camp.id);
      Alert.alert('Campagna Selezionata', `"${camp.name}" è ora la campagna attiva per la Regia.`);
    } catch {
      Alert.alert('Errore', 'Impossibile selezionare la campagna.');
    }
  }, [activeCampaign?.id, selectCampaign]);

  const handleNavigateRegia = useCallback((camp: Campaign) => {
    if (camp.id !== activeCampaign?.id) {
      void handleSelectCampaign(camp);
    }
    navigation.navigate('GmRegia');
  }, [activeCampaign?.id, handleSelectCampaign, navigation]);

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
          {visibleCampaigns.map((camp) => (
            <ExpandableCampaignCard
              key={camp.id}
              campaign={camp}
              isActive={camp.id === activeCampaign?.id}
              onSelect={handleSelectCampaign}
              isGmView={true}
              onNavigateRegia={handleNavigateRegia}
              upcomingSession={upcomingSessionByCampaignId.get(camp.id) ?? null}
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
    fontSize: 10.5,
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
    fontSize: 11,
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
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 2,
  },
  statDesc: {
    fontSize: 10.5,
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
    fontSize: 10,
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
    fontSize: 11,
    color: colors.parchmentMuted,
    lineHeight: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 1,
  },
  campaignFiltersScroll: {
    gap: 8,
    paddingBottom: 10,
    alignItems: 'center',
  },
  filterPill: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.brassDark,
    borderColor: colors.brassBase,
  },
  filterPillText: {
    fontSize: 11.5,
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
  showMoreCampaignsBtn: {
    marginTop: 4,
    marginBottom: 8,
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
