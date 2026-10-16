import React from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Compass,
  Shield,
  BookOpen,
  MessageSquare,
  Crown,
  LogOut,
  User,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { PlayerHomeScreen } from '../screens/player/PlayerHomeScreen';
import { CharacterSheetScreen } from '../screens/player/CharacterSheetScreen';
import { SessionsCalendarScreen } from '../screens/player/SessionsCalendarScreen';
import { CampaignLoreScreen } from '../screens/player/CampaignLoreScreen';
import { PlayerWhisperScreen } from '../screens/player/PlayerWhisperScreen';
import { AccountScreen } from '../screens/account/AccountScreen';

export type PlayerTabParamList = {
  PlayerHome: undefined;
  CharacterSheet: undefined;
  LoreMissions: undefined;
  PlayerWhisper: undefined;
  Account: undefined;
  Sessions: undefined;
};

export type PlayerStackParamList = {
  PlayerTabs: undefined;
  Sessions: undefined;
};

const Tab = createBottomTabNavigator<PlayerTabParamList>();
const Stack = createNativeStackNavigator<PlayerStackParamList>();

const PlayerTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const { role, switchMode, signOut } = useAuth();
  const canAccessGm = role === 'admin' || role === 'gm';

  return (
    <Tab.Navigator
      initialRouteName="PlayerHome"
      screenOptions={{
        tabBarActiveTintColor: colors.brassBase,
        tabBarInactiveTintColor: colors.parchmentMuted,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 56 + bottomInset,
            paddingBottom: bottomInset,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            {canAccessGm && (
              <TouchableOpacity
                style={styles.gmSwitchButton}
                onPress={() => switchMode('gm')}
                activeOpacity={0.8}
              >
                <Crown size={14} color={colors.void} />
                <Text style={styles.gmSwitchButtonText}>Regia</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={async () => {
                const result = await signOut();
                if (result.error) Alert.alert('Impossibile uscire', result.error);
              }}
              activeOpacity={0.7}
            >
              <LogOut size={16} color={colors.parchmentMuted} />
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      {/* 1. HOME - Calendario Sessioni + Panoramica Campagne + Vitals Eroe */}
      <Tab.Screen
        name="PlayerHome"
        component={PlayerHomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerTitle: 'Plancia di Gilda',
          tabBarIcon: ({ color, size }) => <Compass size={size ?? 22} color={color} />,
        }}
      />

      {/* 2. SCHEDA PERSONAGGIO */}
      <Tab.Screen
        name="CharacterSheet"
        component={CharacterSheetScreen}
        options={{
          title: 'Scheda PG',
          tabBarLabel: 'Scheda PG',
          headerTitle: 'Scheda Personaggio',
          tabBarIcon: ({ color, size }) => <Shield size={size ?? 22} color={color} />,
        }}
      />

      {/* 3. LORE & MISSIONI */}
      <Tab.Screen
        name="LoreMissions"
        component={CampaignLoreScreen}
        options={{
          title: 'Bacheca',
          tabBarLabel: 'Diario & Lore',
          headerTitle: 'Archivio & Missioni',
          tabBarIcon: ({ color, size }) => <BookOpen size={size ?? 22} color={color} />,
        }}
      />

      {/* 4. SUSSURRI SEGRETI */}
      <Tab.Screen
        name="PlayerWhisper"
        component={PlayerWhisperScreen}
        options={{
          title: 'Whisper',
          tabBarLabel: 'Whisper',
          headerTitle: 'Sussurri Segreti',
          tabBarIcon: ({ color, size }) => <MessageSquare size={size ?? 22} color={color} />,
        }}
      />

      {/* 5. PROFILO GIOCATORE / ACCOUNT */}
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Profilo',
          tabBarLabel: 'Profilo',
          headerTitle: 'Profilo Giocatore',
          tabBarIcon: ({ color, size }) => <User size={size ?? 22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const PlayerTabNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlayerTabs" component={PlayerTabs} />
      <Stack.Screen
        name="Sessions"
        component={SessionsCalendarScreen}
        options={{
          headerShown: true,
          title: 'Tavoli di Gioco',
          headerStyle: styles.header,
          headerTintColor: colors.parchmentLight,
          headerTitleStyle: { color: colors.parchmentLight, fontWeight: '700' },
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.stoneSurface,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  header: {
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  headerTitle: {
    color: colors.parchmentLight,
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 14,
  },
  gmSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  gmSwitchButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  signOutButton: {
    padding: 6,
  },
});

export default PlayerTabNavigator;
