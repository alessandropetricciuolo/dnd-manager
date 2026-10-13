import React from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  LayoutDashboard,
  Award,
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
import { GuildHomeScreen } from '../screens/home/GuildHomeScreen';
import { GmXpAttendanceScreen } from '../screens/gm/GmXpAttendanceScreen';
import { GmCombatTrackerScreen } from '../screens/gm/GmCombatTrackerScreen';
import { GmAudioRemoteScreen } from '../screens/gm/GmAudioRemoteScreen';
import { GmWhispersInboxScreen } from '../screens/gm/GmWhispersInboxScreen';
import { AccountScreen } from '../screens/account/AccountScreen';

export type GmTabParamList = {
  GmHome: undefined;
  GmCombat: undefined;
  GmAudioRemote: undefined;
  GmWhispers: undefined;
  Account: undefined;
  GmXpAttendance: { notificationSessionId?: string } | undefined;
};

const Tab = createBottomTabNavigator<GmTabParamList>();

export const GmTabNavigator: React.FC = () => {
  const { role, switchMode, signOut } = useAuth();

  return (
    <GmCampaignProvider>
      <Tab.Navigator
        initialRouteName="GmHome"
        screenOptions={{
          tabBarActiveTintColor: colors.brassLight,
          tabBarInactiveTintColor: colors.parchmentMuted,
          tabBarStyle: styles.tabBar,
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
        {/* 1. HOME - Calendario Sessioni + Panoramica Campagne */}
        <Tab.Screen
          name="GmHome"
          component={GuildHomeScreen}
          options={{
            title: 'Home',
            tabBarLabel: 'Home',
            headerTitle: 'Plancia di Gilda',
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

        {/* 5. PROFILO GM - Profilo Master, Presenze & XP, Impostazioni */}
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

        {/* SCHERMATA PRESENZE & XP (Accessibile via Profilo GM o push notification, nascosta dalla barra principale a 5 tasti) */}
        <Tab.Screen
          name="GmXpAttendance"
          component={GmXpAttendanceScreen}
          options={{
            title: 'Presenze & XP',
            headerTitle: 'Registro Sessione & XP',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
      </Tab.Navigator>
    </GmCampaignProvider>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0E1117',
    borderTopWidth: 1.5,
    borderTopColor: colors.brassDark,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  header: {
    backgroundColor: '#0E1117',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.brassDark,
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
