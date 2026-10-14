import React from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  Swords,
  Radio,
  MessageSquare,
  Repeat,
  LogOut,
  Crown,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { GmCampaignProvider } from '../contexts/GmCampaignContext';
import { CampaignHeaderBar } from '../components/common/CampaignHeaderBar';
import { GmHomeScreen } from '../screens/gm/GmHomeScreen';
import { GmCombatTrackerScreen } from '../screens/gm/GmCombatTrackerScreen';
import { GmAudioRemoteScreen } from '../screens/gm/GmAudioRemoteScreen';
import { GmWhispersInboxScreen } from '../screens/gm/GmWhispersInboxScreen';
import { AccountScreen } from '../screens/account/AccountScreen';
import { GmXpAttendanceScreen } from '../screens/gm/GmXpAttendanceScreen';
import { SessionsCalendarScreen } from '../screens/player/SessionsCalendarScreen';

export type GmTabParamList = {
  GmHome: undefined;
  GmCombat: undefined;
  GmAudioRemote: undefined;
  GmWhispers: undefined;
  Account: undefined;
  GmXpAttendance: { notificationSessionId?: string } | undefined;
  Sessions: undefined;
};

export type GmStackParamList = {
  GmTabs: undefined;
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
        headerTitle: '',
        headerLeft: () => (
          <View style={styles.headerLeftContainer}>
            <CampaignHeaderBar compact />
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            {role === 'admin' && (
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
      {/* 1. HOME - Plancia Regia: Calendario + Panoramica Campagne + Live Party Vitals */}
      <Tab.Screen
        name="GmHome"
        component={GmHomeScreen}
        options={{
          title: 'Regia',
          tabBarLabel: 'Regia',
          headerTitle: 'Regia Master',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size ?? 22} color={color} />
          ),
        }}
      />

      {/* 2. INIZIATIVA - Combat Tracker */}
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

      {/* 3. AUDIO - Telecomando Sonoro con QR pairing */}
      <Tab.Screen
        name="GmAudioRemote"
        component={GmAudioRemoteScreen}
        options={{
          title: 'Telecomando',
          tabBarLabel: 'Audio',
          headerTitle: 'Telecomando Sonoro',
          tabBarIcon: ({ color, size }) => (
            <Radio size={size ?? 22} color={color} />
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="GmTabs" component={GmTabs} />
        <Stack.Screen
          name="GmXpAttendance"
          component={GmXpAttendanceScreen}
          options={{
            headerShown: true,
            title: 'Registro Sessione & XP',
            headerStyle: styles.header,
            headerTintColor: colors.parchmentLight,
            headerTitleStyle: { color: colors.parchmentLight, fontWeight: '700' },
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
            headerTitleStyle: { color: colors.parchmentLight, fontWeight: '700' },
          }}
        />
      </Stack.Navigator>
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
  headerLeftContainer: {
    marginLeft: 12,
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
