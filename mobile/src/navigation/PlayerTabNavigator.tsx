import React from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Compass,
  Shield,
  Calendar,
  BookOpen,
  MessageSquare,
  Crown,
  LogOut,
  User,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { CampaignHeaderBar } from '../components/common/CampaignHeaderBar';
import { PlayerHomeScreen } from '../screens/player/PlayerHomeScreen';
import { CharacterSheetScreen } from '../screens/player/CharacterSheetScreen';
import { SessionsCalendarScreen } from '../screens/player/SessionsCalendarScreen';
import { CampaignLoreScreen } from '../screens/player/CampaignLoreScreen';
import { PlayerWhisperScreen } from '../screens/player/PlayerWhisperScreen';
import { AccountScreen } from '../screens/account/AccountScreen';

export type PlayerTabParamList = {
  PlayerHome: undefined;
  CharacterSheet: undefined;
  Sessions: undefined;
  LoreMissions: undefined;
  PlayerWhisper: undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<PlayerTabParamList>();

export const PlayerTabNavigator: React.FC = () => {
  const { role, switchMode, signOut } = useAuth();
  const isAdmin = role === 'admin';

  return (
    <Tab.Navigator
      initialRouteName="PlayerHome"
      screenOptions={{
        tabBarActiveTintColor: colors.brassBase,
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
            {isAdmin && (
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
      <Tab.Screen
        name="PlayerHome"
        component={PlayerHomeScreen}
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Compass size={size ?? 22} color={color} />,
        }}
      />
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
      <Tab.Screen
        name="Sessions"
        component={SessionsCalendarScreen}
        options={{
          title: 'Sessioni',
          tabBarLabel: 'Sessioni',
          headerTitle: 'Tavoli di Gioco',
          tabBarIcon: ({ color, size }) => <Calendar size={size ?? 22} color={color} />,
        }}
      />
      <Tab.Screen
        name="LoreMissions"
        component={CampaignLoreScreen}
        options={{
          title: 'Lore & Bacheca',
          tabBarLabel: 'Bacheca',
          headerTitle: 'Archivio & Missioni',
          tabBarIcon: ({ color, size }) => <BookOpen size={size ?? 22} color={color} />,
        }}
      />
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
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.stoneSurface,
    borderTopWidth: 1,
    borderTopColor: colors.stoneBorder,
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
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.parchmentLight,
    letterSpacing: 0.8,
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
