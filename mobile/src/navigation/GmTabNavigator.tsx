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
  User,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { GmCampaignProvider } from '../contexts/GmCampaignContext';
import { CampaignHeaderBar } from '../components/common/CampaignHeaderBar';
import { GmHomeScreen } from '../screens/gm/GmHomeScreen';
import { GmXpAttendanceScreen } from '../screens/gm/GmXpAttendanceScreen';
import { GmCombatTrackerScreen } from '../screens/gm/GmCombatTrackerScreen';
import { GmAudioRemoteScreen } from '../screens/gm/GmAudioRemoteScreen';
import { GmWhispersInboxScreen } from '../screens/gm/GmWhispersInboxScreen';
import { AccountScreen } from '../screens/account/AccountScreen';

export type GmTabParamList = {
  GmHome: undefined;
  GmXpAttendance: { notificationSessionId?: string } | undefined;
  GmCombat: undefined;
  GmAudioRemote: undefined;
  GmWhispers: undefined;
  Account: undefined;
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
      <Tab.Screen
        name="GmHome"
        component={GmHomeScreen}
        options={{
          title: 'Regia',
          tabBarLabel: 'Regia',
          headerTitle: 'Quartier Generale GM',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size ?? 22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="GmXpAttendance"
        component={GmXpAttendanceScreen}
        options={{
          title: 'Presenze & XP',
          tabBarLabel: 'Presenze & XP',
          headerTitle: 'Registro Sessione & XP',
          tabBarIcon: ({ color, size }) => (
            <Award size={size ?? 22} color={color} />
          ),
        }}
      />
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
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account',
          tabBarLabel: 'Account',
          headerTitle: 'Account e privacy',
          tabBarIcon: ({ color, size }) => <User size={size ?? 22} color={color} />,
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
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.8,
  },
  gmBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 14,
    backgroundColor: colors.stoneSurface,
    borderWidth: 1,
    borderColor: colors.brassDark,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gmBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.brassLight,
    letterSpacing: 0.5,
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
