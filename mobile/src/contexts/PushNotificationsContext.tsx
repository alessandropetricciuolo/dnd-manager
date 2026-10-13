import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from './AuthContext';
import { allowPushRegistration, registerPushDevice, pushPreferencesKey, unregisterCurrentPushDevice } from '../notifications/deviceRegistration';

Notifications.setNotificationHandler({ handleNotification: async () => ({
  shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
}) });

type Preferences = { whispers: boolean; sessions: boolean };
type Target = { kind: 'whisper' | 'session_changed' | 'session_reminder'; campaignId: string; sessionId?: string; recipientId: string; id: string };
type PushContext = Preferences & {
  enabled: boolean; preferences: Preferences; loading: boolean; error: string | null;
  enableNotifications: () => Promise<void>; disableNotifications: () => Promise<void>;
  updatePreferences: (next: Partial<Preferences>) => Promise<void>;
  notificationTarget: Target | null; consumeTarget: () => void;
  navigationReady: boolean; setNavigationReady: () => void;
};
const Context = createContext<PushContext | null>(null);
const defaults: Preferences = { whispers: true, sessions: true };

export function PushNotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationTarget, setTarget] = useState<Target | null>(null);
  const [navigationReady, setReady] = useState(false);
  const consumeTarget = useCallback(() => setTarget(null), []);
  const setNavigationReady = useCallback(() => setReady(true), []);
  const actor = useRef(user?.id);
  actor.current = user?.id;
  const consumed = useRef<string | null>(null);
  const generation = useRef(0);

  const register = useCallback(async (prefs: Preferences, ask: boolean, userId: string) => {
    if (!Device.isDevice || Platform.OS === 'web') throw new Error('Le push richiedono una build installata su un dispositivo fisico.');
    const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) throw new Error('Il progetto Expo deve essere collegato prima di attivare le push.');
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('campaigns', { name: 'Campagne e sussurri', importance: Notifications.AndroidImportance.DEFAULT });
    let permission = await Notifications.getPermissionsAsync();
    if (!permission.granted && ask && permission.canAskAgain) permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) throw new Error('Consenti le notifiche nelle impostazioni del dispositivo.');
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (actor.current !== userId) return;
    await registerPushDevice({ token, platform: Platform.OS, enabled: true, ...prefs }, userId);
    if (actor.current !== userId) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    const revision = ++generation.current;
    setEnabled(false); setPreferences(defaults); setError(null); setTarget(null);
    if (!user) return;
    allowPushRegistration();
    const userId = user.id;
    const restore = async () => {
      try {
        const raw = await SecureStore.getItemAsync(pushPreferencesKey(userId));
        if (generation.current !== revision) return;
        if (!raw) return;
        const stored = JSON.parse(raw);
        const prefs = { whispers: stored.whispers !== false, sessions: stored.sessions !== false };
        setPreferences(prefs);
        if (!stored.enabled) return;
        const permission = await Notifications.getPermissionsAsync();
        if (!permission.granted) {
          await unregisterCurrentPushDevice();
          return;
        }
        await register(prefs, false, userId);
      } catch (err) { if (generation.current === revision) setError(err instanceof Error ? err.message : 'Notifiche non disponibili.'); }
    };
    void restore();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void restore(); });
    return () => { generation.current++; subscription.remove(); };
  }, [user?.id, register]);

  useEffect(() => {
    const accept = (response: Notifications.NotificationResponse | null) => {
      if (!response || consumed.current === response.notification.request.identifier) return;
      const data = response.notification.request.content.data;
      if (!data || !actor.current || data.recipientId !== actor.current) return;
      if (!['whisper', 'session_changed', 'session_reminder'].includes(String(data.kind)) || typeof data.campaignId !== 'string') return;
      consumed.current = response.notification.request.identifier;
      setTarget({ ...data, id: consumed.current } as Target);
    };
    void Notifications.getLastNotificationResponseAsync().then(accept);
    const listener = Notifications.addNotificationResponseReceivedListener(accept);
    return () => listener.remove();
  }, [user?.id]);

  const run = async (task: () => Promise<void>) => {
    setLoading(true); setError(null);
    try { await task(); } catch (err) { setError(err instanceof Error ? err.message : 'Notifiche non disponibili.'); throw err; }
    finally { setLoading(false); }
  };
  const enableNotifications = () => run(async () => {
    if (!user) throw new Error('Accesso richiesto.');
    allowPushRegistration();
    await register(preferences, true, user.id);
    await SecureStore.setItemAsync(pushPreferencesKey(user.id), JSON.stringify({ ...preferences, enabled: true }));
  });
  const disableNotifications = () => run(async () => {
    if (!user) return;
    await unregisterCurrentPushDevice();
    await SecureStore.setItemAsync(pushPreferencesKey(user.id), JSON.stringify({ ...preferences, enabled: false }));
    setEnabled(false);
  });
  const updatePreferences = (next: Partial<Preferences>) => run(async () => {
    if (!user) return;
    const prefs = { ...preferences, ...next };
    if (enabled) await register(prefs, false, user.id);
    await SecureStore.setItemAsync(pushPreferencesKey(user.id), JSON.stringify({ ...prefs, enabled }));
    setPreferences(prefs);
  });
  return <Context.Provider value={{ ...preferences, preferences, enabled, loading, error, enableNotifications, disableNotifications,
    updatePreferences, notificationTarget, consumeTarget, navigationReady, setNavigationReady }}>{children}</Context.Provider>;
}
export function usePushNotifications() {
  const context = useContext(Context);
  if (!context) throw new Error('PushNotificationsProvider mancante.');
  return context;
}
