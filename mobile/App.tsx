import { Buffer } from 'buffer';
(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, Theme } from '@react-navigation/native';
import { colors } from './src/theme/colors';
import { AuthProvider } from './src/contexts/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';
import { PushNotificationsProvider, usePushNotifications } from './src/contexts/PushNotificationsContext';
import { mobileNavigationRef } from './src/notifications/PushNotificationRouter';

const defaultFonts = {
  regular: { fontFamily: 'System', fontWeight: '400' as const },
  medium: { fontFamily: 'System', fontWeight: '500' as const },
  bold: { fontFamily: 'System', fontWeight: '700' as const },
  heavy: { fontFamily: 'System', fontWeight: '900' as const },
};

const BarberDragonsNavTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.brassBase,
    background: colors.void,
    card: colors.stoneSurface,
    text: colors.parchmentLight,
    border: colors.stoneBorder,
    notification: colors.crimson,
  },
  fonts: defaultFonts,
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <PushNotificationsProvider>
        <MobileNavigation />
        </PushNotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function MobileNavigation() {
  const { setNavigationReady } = usePushNotifications();
  return <NavigationContainer ref={mobileNavigationRef} onReady={setNavigationReady} theme={BarberDragonsNavTheme}>
    <RootNavigator />
  </NavigationContainer>;
}
