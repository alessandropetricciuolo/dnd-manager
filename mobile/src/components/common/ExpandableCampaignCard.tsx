import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  ChevronDown,
  ChevronUp,
  Shield,
  Crown,
  Check,
  Calendar,
  Sparkles,
  Compass,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { CAMPAIGN_TYPE_BADGES, CAMPAIGN_TYPE_LABELS } from '../../contexts/CampaignContext';
import { Campaign, CampaignType, Session } from '../../types';
import { resolveImageUrl } from '../../utils/imageUrl';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExpandableCampaignCardProps {
  campaign: Campaign;
  isActive: boolean;
  onSelect: (campaign: Campaign) => void;
  isGmView?: boolean;
  onNavigateRegia?: () => void;
  upcomingSession?: Session | null;
}

export const ExpandableCampaignCard: React.FC<ExpandableCampaignCardProps> = ({
  campaign,
  isActive,
  onSelect,
  isGmView = false,
  onNavigateRegia,
  upcomingSession,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);

  const cType: CampaignType = campaign.type || 'quest';
  const badgeMeta = CAMPAIGN_TYPE_BADGES[cType] || CAMPAIGN_TYPE_BADGES.quest;
  const imageUrl = resolveImageUrl(campaign.image_url);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  // ================= COLLAPSED SQUARE PREVIEW (2 PER ROW) =================
  if (!isExpanded) {
    return (
      <TouchableOpacity
        style={[styles.squareCard, isActive && styles.squareCardActive]}
        onPress={toggleExpand}
        activeOpacity={0.85}
      >
        {imageUrl && !imageError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.squareImage}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.squareFallback}>
            <Shield size={36} color="rgba(212, 175, 55, 0.3)" />
          </View>
        )}

        {/* Gradient Overlay for Legibility */}
        <View style={styles.squareOverlay} />

        {/* Top Badges */}
        <View style={styles.squareTopRow}>
          <View
            style={[
              styles.squareBadgePill,
              { backgroundColor: badgeMeta.bg, borderColor: badgeMeta.border },
            ]}
          >
            <Text style={[styles.squareBadgeText, { color: badgeMeta.text }]}>
              {badgeMeta.label}
            </Text>
          </View>

          {isActive && (
            <View style={styles.squareActiveBadge}>
              <Check size={10} color={colors.void} strokeWidth={3} />
            </View>
          )}
        </View>

        {/* Bottom Campaign Title & Hint */}
        <View style={styles.squareBottomBox}>
          <Text style={styles.squareTitle} numberOfLines={2}>
            {campaign.name}
          </Text>
          <View style={styles.squareHintRow}>
            <Text style={styles.squareHintText}>Dettagli</Text>
            <ChevronDown size={11} color={colors.brassLight} />
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ================= EXPANDED FULL-WIDTH CARD =================
  return (
    <View style={[styles.expandedCard, isActive && styles.expandedCardActive]}>
      {/* Banner Touchable to collapse */}
      <TouchableOpacity
        style={styles.expandedBannerTouchable}
        onPress={toggleExpand}
        activeOpacity={0.9}
      >
        <View style={styles.expandedBannerWrapper}>
          {imageUrl && !imageError ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.expandedBannerImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.fallbackCover}>
              <Shield size={40} color="rgba(212, 175, 55, 0.3)" />
              <Text style={styles.fallbackCoverText}>{campaign.name}</Text>
            </View>
          )}

          <View style={styles.darkOverlay} />

          {/* Top Row: Type Badge + Controls */}
          <View style={styles.coverTopRow}>
            <View
              style={[
                styles.badgePill,
                { backgroundColor: badgeMeta.bg, borderColor: badgeMeta.border },
              ]}
            >
              <Text style={[styles.badgeText, { color: badgeMeta.text }]}>
                {badgeMeta.label}
              </Text>
            </View>

            <View style={styles.topRightControls}>
              {isActive && (
                <View style={styles.activePill}>
                  <Check size={11} color={colors.void} strokeWidth={3} />
                  <Text style={styles.activePillText}>IN USO</Text>
                </View>
              )}

              <View style={styles.chevronPill}>
                <ChevronUp size={16} color={colors.parchmentLight} />
              </View>
            </View>
          </View>

          {/* Banner Title */}
          <View style={styles.coverBottomTitleRow}>
            <Text style={styles.campaignTitle}>{campaign.name}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Expanded Details Panel */}
      <View style={styles.expandedPanel}>
        {/* Full Synopsis */}
        {campaign.description ? (
          <View style={styles.descSection}>
            <Text style={styles.sectionSubtitle}>LORE &amp; INTRODUZIONE</Text>
            <Text style={styles.fullDescText}>{campaign.description}</Text>
          </View>
        ) : (
          <Text style={styles.noDescText}>Nessuna descrizione specificata per questa campagna.</Text>
        )}

        {/* Meta Info Grid */}
        <View style={styles.metaBox}>
          <View style={styles.metaRow}>
            <Compass size={15} color={colors.brassLight} />
            <Text style={styles.metaLabel}>FORMATO:</Text>
            <Text style={styles.metaValue}>{CAMPAIGN_TYPE_LABELS[cType] || cType}</Text>
          </View>

          {upcomingSession && (
            <View style={styles.upcomingRow}>
              <Calendar size={15} color={colors.emerald} />
              <Text style={styles.metaLabel}>PROSSIMA SESSIONE:</Text>
              <Text style={styles.upcomingValue}>
                {new Date(upcomingSession.scheduled_at).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          {isActive ? (
            <View style={styles.alreadyActiveBtn}>
              <Check size={16} color={colors.emerald} />
              <Text style={styles.alreadyActiveText}>Campagna Attiva</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => onSelect(campaign)}
              activeOpacity={0.8}
            >
              <Sparkles size={15} color={colors.void} />
              <Text style={styles.selectBtnText}>Imposta come Attiva</Text>
            </TouchableOpacity>
          )}

          {isGmView && onNavigateRegia && (
            <TouchableOpacity
              style={styles.regiaDirectBtn}
              onPress={onNavigateRegia}
              activeOpacity={0.8}
            >
              <Crown size={15} color={colors.brassLight} />
              <Text style={styles.regiaDirectText}>Apri Regia</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ============= SQUARE COLLAPSED (2 PER ROW) =============
  squareCard: {
    width: '48.2%',
    aspectRatio: 1,
    backgroundColor: colors.stone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(200, 157, 73, 0.25)',
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 10,
    marginBottom: 12,
  },
  squareCardActive: {
    borderColor: colors.brassBase,
    borderWidth: 2,
    backgroundColor: colors.stoneSurface,
  },
  squareImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  squareFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.stoneSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 9, 8, 0.62)',
  },
  squareTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  squareBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  squareBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  squareActiveBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareBottomBox: {
    zIndex: 2,
  },
  squareTitle: {
    color: colors.parchmentLight,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  squareHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  squareHintText: {
    color: colors.brassLight,
    fontSize: 10,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ============= EXPANDED FULL WIDTH =============
  expandedCard: {
    width: '100%',
    backgroundColor: colors.stone,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(200, 157, 73, 0.25)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  expandedCardActive: {
    borderColor: colors.brassBase,
    borderWidth: 1.5,
    backgroundColor: colors.stoneSurface,
  },
  expandedBannerTouchable: {
    width: '100%',
  },
  expandedBannerWrapper: {
    width: '100%',
    height: 145,
    backgroundColor: colors.stoneHighlight,
    position: 'relative',
    justifyContent: 'space-between',
    padding: 12,
  },
  expandedBannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  fallbackCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.stoneSurface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  fallbackCoverText: {
    color: colors.parchmentMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 9, 8, 0.55)',
  },
  coverTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    color: colors.void,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chevronPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  coverBottomTitleRow: {
    zIndex: 2,
  },
  campaignTitle: {
    color: colors.parchmentLight,
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  expandedPanel: {
    padding: 16,
    backgroundColor: colors.stone,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 157, 73, 0.15)',
  },
  descSection: {
    marginBottom: 14,
  },
  sectionSubtitle: {
    color: colors.brassBase,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  fullDescText: {
    color: colors.parchmentLight,
    fontSize: 13,
    lineHeight: 20,
  },
  noDescText: {
    color: colors.parchmentMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  metaBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    color: colors.parchmentMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  metaValue: {
    color: colors.parchmentLight,
    fontSize: 12,
    fontWeight: '600',
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  upcomingValue: {
    color: colors.emerald,
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectBtn: {
    flex: 1,
    backgroundColor: colors.brassBase,
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  selectBtnText: {
    color: colors.void,
    fontSize: 13,
    fontWeight: '800',
  },
  alreadyActiveBtn: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  alreadyActiveText: {
    color: colors.emerald,
    fontSize: 13,
    fontWeight: '700',
  },
  regiaDirectBtn: {
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: colors.brassBase,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  regiaDirectText: {
    color: colors.brassLight,
    fontSize: 13,
    fontWeight: '700',
  },
});
