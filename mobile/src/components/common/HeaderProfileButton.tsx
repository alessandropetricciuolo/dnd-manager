import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Crown, User } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../contexts/AuthContext';

export const HeaderProfileButton: React.FC = () => {
  const navigation = useNavigation<any>();
  const { role, activeMode } = useAuth();
  const isGmActive = (role === 'gm' || role === 'admin') && activeMode === 'gm';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Account')}
        activeOpacity={0.78}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel={isGmActive ? 'Apri Profilo Game Master' : 'Apri Profilo Giocatore'}
      >
        {isGmActive ? (
          <Crown size={15} color={colors.brassLight} />
        ) : (
          <User size={15} color={colors.brassLight} />
        )}
        <Text style={styles.label}>Profilo</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  button: {
    minHeight: 38,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.stoneSurface,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: {
    color: colors.parchmentLight,
    fontSize: 12,
    fontWeight: '800',
  },
});

export default HeaderProfileButton;
