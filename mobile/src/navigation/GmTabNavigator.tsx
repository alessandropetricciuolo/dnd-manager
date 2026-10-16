import React from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Compass,
  Crown,
  Swords,
  Radio,
  MessageSquare,
  Repeat,
  LogOut,
  Sparkles,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { GmCampaignProvider } from '../contexts/GmCampaignContext';
import { GmLiveProvider } from '../contexts/GmLiveContext';
import { GmHomeScreen } from '../screens/gm/GmHomeScreen';
import { GmRegiaScreen } from '../screens/gm/GmRegiaScreen';
import { GmCombatTrackerScreen } from '../screens/gm/GmCombatTrackerScreen';
import { GmAudioRemoteScreen } from '../screens/gm/GmAudioRemoteScreen';
import { GmWhispersInboxScreen } from '../screens/gm/GmWhispersInboxScreen';
import { AccountScreen } from '../screens/account/AccountScreen';
import { GmXpAttendanceScreen } from '../screens/gm/GmXpAttendanceScreen';
import { SessionsCalendarScreen } from '../screens/player/SessionsCalendarScreen';

export type GmTabParamList = {
  GmHome: undefined;
  GmRegia: undefined;
  GmCombat: undefined;
  GmWhispers: undefined;
  Account: undefined;
  GmAudioRemote: undefined;
  GmXpAttendance: { notificationSessionId?: string } | undefined;
  Sessions: undefined;
};

export type GmStackParamList = {
  GmTabs: undefined;
  GmAudioRemote: undefined;
  GmXpAttendance: { notificationSessionId?: string } | undefined;
  Sessions: undefined;
};

const Tab = createBottomTabNavigator<GmTabParamList>();
const Stack = createNativeStackNavigator<GmStackParamList>();

const GmTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const { role, switchMode, signOut } = useAuth();

  return (
    <Tab.Navigator
      initialRouteName="GmHome"
      screenOptions={{
        tabBarActiveTintColor: colors.brassLight,
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
        headerShadowVisible: false,
        headerTitleStyle: styles.headerTitle,
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            {(role === 'admin' || role === 'gm') && (
              <TouchableOpacity
                style={styles.playerSwitchButton}
                onPress={() => switchMode('player')}
                activeOpacity={0.8}
              >
                <Repeat size={13} color={colors.void} />
                <Text style={styles.playerSwitchButtonText}>Vista Player</Text>
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
      {/* 1. HOME - Calendario a Griglia di tutte le sessioni + Panoramica Campagne */}
      <Tab.Screen
        name="GmHome"
        component={GmHomeScreen}
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          headerTitle: 'Plancia di Gilda',
          tabBarIcon: ({ color, size }) => (
            <Compass size={size ?? 22} color={color} />
          ),
        }}
      />

      {/* 2. REGIA - Plancia Live Master (Vitali Party, Controlli Sessione, Scorciatoie) */}
      <Tab.Screen
        name="GmRegia"
        component={GmRegiaScreen}
        options={{
          title: 'Regia',
          tabBarLabel: 'Regia',
          headerTitle: 'Plancia di Regia Master',
          tabBarIcon: ({ color, size }) => (
            <Crown size={size ?? 22} color={color} />
          ),
        }}
      />

      {/* 3. INIZIATIVA - Combat Tracker */}
      <Tab.Screen
        name="GmCombat"
        component={GmCombatTrackerScreen}
        options={{
          title: 'Iniziativa',
          tabBarLabel: 'Iniziativa',
          headerTitle: 'Tracker di Combattimento',
          tabBarIcon: ({ color, size }) => (
            <Swords size={size ?? 22} color={color} />
          ),
        }}
      />

      {/* 4. WHISPERS - Inbox Sussurri Segreti */}
      <Tab.Screen
        name="GmWhispers"
        component={GmWhispersInboxScreen}
        options={{
          title: 'Whispers',
          tabBarLabel: 'Whispers',
          headerTitle: 'Inbox Sussurri Segreti',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size ?? 22} color={color} />
          ),
        }}
      />

      {/* 5. PROFILO GM - Profilo Master & Registro Presenze/XP */}
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Profilo GM',
          tabBarLabel: 'Profilo GM',
          headerTitle: 'Profilo Game Master',
          tabBarIcon: ({ color, size }) => <Crown size={size ?? 22} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export const GmTabNavigator: React.FC = () => {
  return (
    <GmCampaignProvider>
      <GmLiveProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="GmTabs" component={GmTabs} />
        <Stack.Screen
          name="GmAudioRemote"
          component={GmAudioRemoteScreen}
          options={{
            headerShown: true,
            title: 'Telecomando Sonoro',
            headerStyle: styles.header,
            headerTintColor: colors.parchmentLight,
            headerTitleStyle: styles.headerTitle,
          }}
        />
        <Stack.Screen
          name="GmXpAttendance"
          component={GmXpAttendanceScreen}
          options={{
            headerShown: true,
            title: 'Registro Sessione & XP',
            headerStyle: styles.header,
            headerTintColor: colors.parchmentLight,
            headerTitleStyle: styles.headerTitle,
          }}
        />
        <Stack.Screen
          name="Sessions"
          component={SessionsCalendarScreen}
          options={{
            headerShown: true,
            title: 'Tavoli di Gioco',
            headerStyle: styles.header,
            headerTintColor: colors.parchmentLight,
            headerTitleStyle: styles.headerTitle,
          }}
        />
      </Stack.Navigator>
      </GmLiveProvider>
    </GmCampaignProvider>
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
  playerSwitchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.brassBase,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  playerSwitchButtonText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.void,
  },
  signOutButton: {
    padding: 6,
  },
});

export default GmTabNavigator;
