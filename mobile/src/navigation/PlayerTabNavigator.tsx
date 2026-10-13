import React from 'react';
import { Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
import { CampaignHeaderBar } from '../components/common/CampaignHeaderBar';
import { GuildHomeScreen } from '../screens/home/GuildHomeScreen';
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
      {/* 1. HOME - Calendario Sessioni + Panoramica Campagne */}
      <Tab.Screen
        name="PlayerHome"
        component={GuildHomeScreen}
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

      {/* SCHERMATA SESSIONI (Accessibile via deep link o push, nascosta dalla barra principale a 5 tasti) */}
      <Tab.Screen
        name="Sessions"
        component={SessionsCalendarScreen}
        options={{
          title: 'Sessioni',
          headerTitle: 'Tavoli di Gioco',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
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
