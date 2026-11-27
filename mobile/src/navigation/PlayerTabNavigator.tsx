import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Compass,
  Flame,
  MessageSquare,
  Shield,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useCampaign } from '../contexts/CampaignContext';
import { HeaderProfileButton } from '../components/common/HeaderProfileButton';
import { PlayerHomeScreen } from '../screens/player/PlayerHomeScreen';
import { CharacterSheetScreen } from '../screens/player/CharacterSheetScreen';
import { SessionsCalendarScreen } from '../screens/player/SessionsCalendarScreen';
import { CampaignLoreScreen } from '../screens/player/CampaignLoreScreen';
import { CharacterTamagotchiScreen } from '../screens/player/CharacterTamagotchiScreen';
import { PlayerWhisperScreen } from '../screens/player/PlayerWhisperScreen';
import { AccountScreen } from '../screens/account/AccountScreen';

export type PlayerTabParamList = {
  PlayerHome: undefined;
  CharacterSheet: undefined;
  LoreMissions: undefined;
  CharacterTamagotchi: undefined;
  PlayerWhisper: undefined;
  Account: undefined;
  Sessions: undefined;
};

export type PlayerStackParamList = {
  PlayerTabs: undefined;
  Account: undefined;
  Sessions: undefined;
};

const Tab = createBottomTabNavigator<PlayerTabParamList>();
const Stack = createNativeStackNavigator<PlayerStackParamList>();

const PlayerTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  const { hasJoinedLongCampaign, canAccessCharacterSheet } = useCampaign();

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
        headerShadowVisible: false,
        headerTitleStyle: styles.headerTitle,
        headerRight: () => <HeaderProfileButton />,
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
      {canAccessCharacterSheet && (
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
      )}

      {/* 3. DIARIO & LORE (Solo Campagna Long) */}
      {hasJoinedLongCampaign && (
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
      )}

      {/* 4. TAVERNA / TAMAGOTCHI PG (Solo Campagna Long) */}
      {hasJoinedLongCampaign && (
        <Tab.Screen
          name="CharacterTamagotchi"
          component={CharacterTamagotchiScreen}
          options={{
            title: 'Taverna',
            tabBarLabel: 'Taverna',
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Flame size={size ?? 22} color={color} />,
          }}
        />
      )}

      {/* 5. SUSSURRI SEGRETI (Massimo 5 tab totali in Long) */}
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
    </Tab.Navigator>
  );
};

export const PlayerTabNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlayerTabs" component={PlayerTabs} />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerShown: true,
          title: 'Profilo Giocatore',
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
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  header: {
    backgroundColor: colors.stone,
    borderBottomWidth: 1,
    borderBottomColor: colors.stoneBorder,
  },
  headerTitle: {
    color: colors.parchmentLight,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});

export default PlayerTabNavigator;
