import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  Compass,
  MessageSquare,
  Swords,
} from 'lucide-react-native';
import { colors } from '../theme/colors';
import { GmCampaignProvider } from '../contexts/GmCampaignContext';
import { GmLiveProvider } from '../contexts/GmLiveContext';
import { HeaderProfileButton } from '../components/common/HeaderProfileButton';
import { GmHomeScreen } from '../screens/gm/GmHomeScreen';
import { GmRegiaScreen } from '../screens/gm/GmRegiaScreen';
import { GmWikiScreen } from '../screens/gm/GmWikiScreen';
import { GmAudioRemoteScreen } from '../screens/gm/GmAudioRemoteScreen';
import { GmWhispersInboxScreen } from '../screens/gm/GmWhispersInboxScreen';
import { AccountScreen } from '../screens/account/AccountScreen';
import { GmXpAttendanceScreen } from '../screens/gm/GmXpAttendanceScreen';
import { SessionsCalendarScreen } from '../screens/player/SessionsCalendarScreen';

export type GmTabParamList = {
  GmHome: undefined;
  GmRegia: undefined;
  GmWiki: { initialQuery?: string } | undefined;
  GmWhispers: { targetPlayerId?: string } | undefined;
  Account: undefined;
  GmAudioRemote: undefined;
  GmXpAttendance: { notificationSessionId?: string } | undefined;
  Sessions: undefined;
};

export type GmStackParamList = {
  GmTabs: undefined;
  Account: undefined;
  GmAudioRemote: undefined;
  GmXpAttendance: { notificationSessionId?: string } | undefined;
  Sessions: undefined;
};

const Tab = createBottomTabNavigator<GmTabParamList>();
const Stack = createNativeStackNavigator<GmStackParamList>();

const GmTabs: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);

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
        headerRight: () => <HeaderProfileButton />,
      }}
    >
      {/* 1. HOME - Calendario a Griglia + Panoramica Campagne */}
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

      {/* 2. REGIA UNIFICATA - Iniziativa Live + Tavolo & Vitali Party + Dock Voce/Audio */}
      <Tab.Screen
        name="GmRegia"
        component={GmRegiaScreen}
        options={{
          title: 'Regia',
          tabBarLabel: 'Regia',
          headerTitle: 'Console di Regia Live',
          tabBarIcon: ({ color, size }) => (
            <Swords size={size ?? 22} color={color} />
          ),
        }}
      />

      {/* 3. WIKI & ATLANTE MULTI-CAMPAGNA */}
      <Tab.Screen
        name="GmWiki"
        component={GmWikiScreen}
        options={{
          title: 'Wiki',
          tabBarLabel: 'Wiki',
          headerTitle: 'Wiki & Atlante Master',
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size ?? 22} color={color} />
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
          headerTitle: 'Sussurri Segreti',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size ?? 22} color={color} />
          ),
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
            name="Account"
            component={AccountScreen}
            options={{
              headerShown: true,
              title: 'Profilo Game Master',
              headerStyle: styles.header,
              headerTintColor: colors.parchmentLight,
              headerTitleStyle: styles.headerTitle,
            }}
          />
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

export default GmTabNavigator;
