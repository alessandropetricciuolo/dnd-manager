import React from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Crown, Shield } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../theme/colors';

interface RoleModeSwitcherProps {
  style?: StyleProp<ViewStyle>;
}

export const RoleModeSwitcher: React.FC<RoleModeSwitcherProps> = ({ style }) => {
  const { role, activeMode, switchMode } = useAuth();

  if (role !== 'gm' && role !== 'admin') {
    return null;
  }

  const isGm = activeMode === 'gm';
  const isPlayer = !isGm;

  return (
    <View
      style={[styles.track, style]}
      accessibilityRole="tablist"
      accessibilityLabel="Selettore modalità vista"
    >
      <TouchableOpacity
        style={[styles.segment, isPlayer && styles.segmentActive]}
        onPress={() => {
          if (!isPlayer) switchMode('player');
        }}
        activeOpacity={0.8}
        accessibilityRole="tab"
        accessibilityState={{ selected: isPlayer }}
        accessibilityLabel={
          isPlayer ? 'Vista Giocatore attiva' : 'Passa alla vista Giocatore'
        }
      >
        <Shield
          size={14}
          color={isPlayer ? colors.brassLight : colors.parchmentDim}
        />
        <Text
          style={[styles.segmentText, isPlayer && styles.segmentTextActive]}
          numberOfLines={1}
        >
          Giocatore
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, isGm && styles.segmentActive]}
        onPress={() => {
          if (!isGm) switchMode('gm');
        }}
        activeOpacity={0.8}
        accessibilityRole="tab"
        accessibilityState={{ selected: isGm }}
        accessibilityLabel={
          isGm ? 'Regia Game Master attiva' : 'Passa alla Regia Game Master'
        }
      >
        <Crown
          size={14}
          color={isGm ? colors.brassLight : colors.parchmentDim}
        />
        <Text
          style={[styles.segmentText, isGm && styles.segmentTextActive]}
          numberOfLines={1}
        >
          Regia GM
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.stone,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.stoneBorder,
    padding: 3,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentActive: {
    backgroundColor: 'rgba(200, 157, 73, 0.18)',
    borderColor: colors.brassBase,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.parchmentMuted,
    letterSpacing: 0.2,
  },
  segmentTextActive: {
    fontWeight: '800',
    color: colors.brassLight,
  },
});

export default RoleModeSwitcher;
