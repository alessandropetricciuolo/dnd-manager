import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import {
  ChevronDown,
  Sparkles,
  Swords,
  Crown,
  Award,
  Shield,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useCampaign, CAMPAIGN_TYPE_BADGES } from '../../contexts/CampaignContext';
import { CampaignSelectorModal } from './CampaignSelectorModal';
import { CampaignType } from '../../types';

interface CampaignHeaderBarProps {
  compact?: boolean;
}

export const CampaignHeaderBar: React.FC<CampaignHeaderBarProps> = ({ compact = false }) => {
  const { activeCampaign } = useCampaign();
  const [modalVisible, setModalVisible] = useState(false);

  if (!activeCampaign) return null;

  const campaignType: CampaignType = activeCampaign.type || 'quest';
  const badgeInfo = CAMPAIGN_TYPE_BADGES[campaignType] || CAMPAIGN_TYPE_BADGES.quest;

  const renderIcon = () => {
    switch (campaignType) {
      case 'long':
        return <Crown size={12} color={badgeInfo.text} />;
      case 'oneshot':
        return <Sparkles size={12} color={badgeInfo.text} />;
      case 'torneo':
        return <Award size={12} color={badgeInfo.text} />;
      case 'quest':
      default:
        return <Swords size={12} color={badgeInfo.text} />;
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.container, compact && styles.compactContainer]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
      >
        {/* Left type badge icon */}
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: badgeInfo.bg, borderColor: badgeInfo.border },
          ]}
        >
          {renderIcon()}
        </View>

        {/* Campaign name + type label */}
        <View style={styles.textWrap}>
          <Text style={styles.campaignName} numberOfLines={1}>
            {activeCampaign.name}
          </Text>
          {!compact && (
            <Text style={[styles.typeLabel, { color: badgeInfo.text }]}>
              {badgeInfo.label}
            </Text>
          )}
        </View>

        {/* Dropdown Chevron */}
        <ChevronDown size={14} color={colors.brassBase} style={styles.chevron} />
      </TouchableOpacity>

      {/* Campaign Selector Modal */}
      <CampaignSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 240,
    gap: 8,
  },
  compactContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 180,
  },
  iconWrap: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  campaignName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.2,
  },
  typeLabel: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  chevron: {
    marginLeft: 2,
  },
});

export default CampaignHeaderBar;
