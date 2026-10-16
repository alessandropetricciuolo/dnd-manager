import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Shield } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { CampaignProvider } from '../contexts/CampaignContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { PlayerTabNavigator } from './PlayerTabNavigator';
import { GmTabNavigator } from './GmTabNavigator';
import { PushNotificationRouter } from '../notifications/PushNotificationRouter';

export const RootNavigator: React.FC = () => {
  const { user, loading, activeMode, role, refreshProfile, signOut } = useAuth();

  // Splash / Loading Screen while checking Supabase session
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCrest}>
          <Shield size={42} color={colors.brassLight} />
        </View>
        <Text style={styles.loadingTitle}>BARBER & DRAGONS</Text>
        <Text style={styles.loadingSubtitle}>PREPARAZIONE TAVOLO DA GIOCO...</Text>
        <ActivityIndicator
          size="small"
          color={colors.brassBase}
          style={styles.spinner}
        />
      </View>
    );
  }

  // Not authenticated -> Show dark fantasy login screen
  if (!user) {
    return <LoginScreen />;
  }

  if (!role) {
    return (
      <View style={styles.loadingContainer}>
        <Shield size={36} color={colors.brassLight} />
        <Text style={styles.blockedTitle}>Profilo non disponibile</Text>
        <Text style={styles.blockedText}>
          Non possiamo verificare il ruolo del tuo account. L’accesso alle funzioni resta bloccato finché il profilo non è disponibile.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { void refreshProfile(); }}>
          <Text style={styles.retryButtonText}>Riprova</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { void signOut().then(result => { if (result.error) Alert.alert('Impossibile uscire', result.error); }); }}>
          <Text style={styles.signOutText}>Esci dall’account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Role view navigation:
  // - Admin and GM can switch between GM Plancia and Player view
  // - Player is locked to Player view
  const effectiveMode = (role === 'admin' || role === 'gm') ? activeMode : 'player';

  // Authenticated: Wrap with CampaignProvider and route according to effective mode
  return (
    <CampaignProvider>
      <PushNotificationRouter />
      {effectiveMode === 'gm' ? <GmTabNavigator /> : <PlayerTabNavigator />}
    </CampaignProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.void,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingCrest: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.stoneSurface,
    borderWidth: 2,
    borderColor: colors.brassBase,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: colors.brassBase,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 2,
    marginBottom: 6,
  },
  loadingSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brassLight,
    letterSpacing: 1.5,
    marginBottom: 24,
  },
  spinner: {
    marginTop: 8,
  },
  blockedTitle: { color: colors.parchmentLight, fontSize: 20, fontWeight: '800', marginTop: 16 },
  blockedText: { color: colors.parchmentMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 340 },
  retryButton: { backgroundColor: colors.brassBase, borderRadius: 8, paddingHorizontal: 26, paddingVertical: 12, marginTop: 22, marginBottom: 14 },
  retryButtonText: { color: colors.void, fontWeight: '800' },
  signOutText: { color: colors.parchmentMuted, textDecorationLine: 'underline', padding: 10 },
});

export default RootNavigator;
