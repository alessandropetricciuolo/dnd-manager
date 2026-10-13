import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import {
  X,
  Search,
  Check,
  Shield,
  Crown,
  Compass,
  Sparkles,
  ChevronRight,
  User,
  Swords,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useCampaign, CAMPAIGN_TYPE_BADGES } from '../../contexts/CampaignContext';
import { useAuth } from '../../contexts/AuthContext';
import { Campaign, CampaignType } from '../../types';

interface CampaignSelectorModalProps {
  visible: boolean;
  onClose: () => void;
}

type FilterTab = 'all' | 'long' | 'quest' | 'oneshot' | 'torneo';

export const CampaignSelectorModal: React.FC<CampaignSelectorModalProps> = ({
  visible,
  onClose,
}) => {
  const { user, role, activeMode } = useAuth();
  const {
    campaigns,
    activeCampaignId,
    selectCampaign,
    assignedCharactersMap,
  } = useCampaign();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Filter campaigns by search text and tab
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // Type filter
      if (activeTab !== 'all' && c.type !== activeTab) {
        return false;
      }
      // Search filter
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = c.name?.toLowerCase().includes(query);
        const matchesDesc = c.description?.toLowerCase().includes(query);
        return matchesName || matchesDesc;
      }
      return true;
    });
  }, [campaigns, activeTab, searchQuery]);

  const handleSelect = async (campaignId: string) => {
    await selectCampaign(campaignId);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconWrap}>
                <Compass size={18} color={colors.brassLight} />
              </View>
              <View>
                <Text style={styles.headerSubtitle}>TAVOLI & REGISTRO DI GILDA</Text>
                <Text style={styles.headerTitle}>Seleziona Campagna</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <X size={20} color={colors.parchmentMuted} />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Search size={16} color={colors.brassBase} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca per titolo o descrizione..."
              placeholderTextColor={colors.parchmentMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>

          {/* Type Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsRow}
          >
            <TouchableOpacity
              style={[styles.filterPill, activeTab === 'all' && styles.filterPillActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'all' && styles.filterPillTextActive,
                ]}
              >
                Tutte ({campaigns.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTab === 'long' && styles.filterPillActive]}
              onPress={() => setActiveTab('long')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'long' && styles.filterPillTextActive,
                ]}
              >
                Campagne Long
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTab === 'quest' && styles.filterPillActive]}
              onPress={() => setActiveTab('quest')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'quest' && styles.filterPillTextActive,
                ]}
              >
                Quest
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTab === 'oneshot' && styles.filterPillActive]}
              onPress={() => setActiveTab('oneshot')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'oneshot' && styles.filterPillTextActive,
                ]}
              >
                One Shot
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, activeTab === 'torneo' && styles.filterPillActive]}
              onPress={() => setActiveTab('torneo')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'torneo' && styles.filterPillTextActive,
                ]}
              >
                Torneo
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Campaigns List */}
          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredCampaigns.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Compass size={32} color={colors.parchmentMuted} />
                <Text style={styles.emptyTitle}>Nessuna Campagna Trovata</Text>
                <Text style={styles.emptySub}>
                  Nessuna campagna corrisponde ai filtri di ricerca selezionati.
                </Text>
              </View>
            ) : (
              filteredCampaigns.map((camp) => {
                const isActive = camp.id === activeCampaignId;
                const isGmOfThis = camp.gm_id === user?.id || role === 'admin';
                const assignedChars = assignedCharactersMap[camp.id] || [];
                const firstChar = assignedChars[0] || null;
                const badgeInfo = camp.type
                  ? CAMPAIGN_TYPE_BADGES[camp.type]
                  : CAMPAIGN_TYPE_BADGES.quest;

                return (
                  <TouchableOpacity
                    key={camp.id}
                    style={[styles.campaignCard, isActive && styles.campaignCardActive]}
                    onPress={() => handleSelect(camp.id)}
                    activeOpacity={0.8}
                  >
                    {/* Top Row: Type Badge + Active Indicator */}
                    <View style={styles.cardHeaderRow}>
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor: badgeInfo.bg,
                            borderColor: badgeInfo.border,
                          },
                        ]}
                      >
                        <Text style={[styles.typeBadgeText, { color: badgeInfo.text }]}>
                          {badgeInfo.label}
                        </Text>
                      </View>

                      {isActive && (
                        <View style={styles.activeCheckBadge}>
                          <Check size={12} color={colors.void} />
                          <Text style={styles.activeCheckText}>ATTIVA</Text>
                        </View>
                      )}
                    </View>

                    {/* Campaign Name & Description */}
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {camp.name}
                    </Text>

                    {camp.description ? (
                      <Text style={styles.cardDesc} numberOfLines={2}>
                        {camp.description}
                      </Text>
                    ) : null}

                    {/* Footer Row: Status & Assigned PG */}
                    <View style={styles.cardFooter}>
                      {isGmOfThis && activeMode === 'gm' ? (
                        <View style={styles.gmRoleTag}>
                          <Crown size={12} color={colors.brassBase} />
                          <Text style={styles.gmRoleTagText}>La tua Regia</Text>
                        </View>
                      ) : firstChar ? (
                        <View style={styles.pgAssignedTag}>
                          <Shield size={12} color={colors.emerald} />
                          <Text style={styles.pgAssignedTagText} numberOfLines={1}>
                            PG: {firstChar.name} (Lv. {firstChar.level ?? 1}{' '}
                            {firstChar.character_class ?? 'Guerriero'})
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.noPgTag}>
                          <User size={12} color={colors.parchmentMuted} />
                          <Text style={styles.noPgTagText}>Nessun PG Assegnato</Text>
                        </View>
                      )}

                      <ChevronRight size={16} color={isActive ? colors.brassLight : colors.parchmentMuted} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.stoneSurface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.brassDark,
    overflow: 'hidden',
    shadowColor: colors.brassBase,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.stone,
    borderWidth: 1,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.brassBase,
    letterSpacing: 1.2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.stone,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.stoneBorder,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stone,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    paddingHorizontal: 10,
    height: 38,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: colors.parchmentLight,
    fontWeight: '500',
  },
  filterTabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.stone,
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
  listContainer: {
    maxHeight: 420,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginTop: 4,
  },
  emptySub: {
    fontSize: 11,
    color: colors.parchmentMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
  campaignCard: {
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 12,
  },
  campaignCardActive: {
    borderColor: colors.brassBase,
    backgroundColor: 'rgba(197, 155, 39, 0.08)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activeCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeCheckText: {
    fontSize: 9,
    fontWeight: '900',
    color: colors.void,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.parchmentLight,
    marginBottom: 4,
    lineHeight: 19,
  },
  cardDesc: {
    fontSize: 11,
    color: colors.parchmentMuted,
    lineHeight: 16,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 8,
    marginTop: 2,
  },
  gmRoleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(197, 155, 39, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gmRoleTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
  },
  pgAssignedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    marginRight: 8,
  },
  pgAssignedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.emerald,
  },
  noPgTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  noPgTagText: {
    fontSize: 10,
    color: colors.parchmentMuted,
    fontStyle: 'italic',
  },
});

export default CampaignSelectorModal;
