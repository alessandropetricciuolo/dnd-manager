import * as SecureStore from 'expo-secure-store';
import { supabase } from '../api/supabase';

const key = 'bd.push.device';
let suspended = false;
let requests = Promise.resolve();
function serial(task: () => Promise<void>) {
  const result = requests.catch(() => undefined).then(task);
  requests = result.catch(() => undefined);
  return result;
}
export function allowPushRegistration() { suspended = false; }
export const pushPreferencesKey = (userId: string) => `bd.push.preferences.${userId}`;
export async function readPushDevice(): Promise<{ token: string; userId: string } | null> {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export async function storePushDevice(token: string, userId: string) {
  await SecureStore.setItemAsync(key, JSON.stringify({ token, userId }));
}
export function registerPushDevice(body: { token: string; platform: string; enabled: boolean; whispers: boolean; sessions: boolean }, userId: string) {
  return serial(async () => {
    if (suspended) throw new Error('Le notifiche sono state disattivate su questo dispositivo.');
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.id !== userId) throw new Error('Account cambiato. Riprova.');
    await pushDeviceRequest('PUT', body);
    await storePushDevice(body.token, userId);
  });
}
export async function pushDeviceRequest(method: 'PUT' | 'DELETE', body: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Accesso scaduto. Accedi di nuovo.');
  const base = (process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '');
  const response = await fetch(`${base}/api/mobile/push/device`, {
    method, headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Impossibile aggiornare le notifiche. Controlla la connessione e riprova.');
}
export async function unregisterCurrentPushDevice(): Promise<void> {
  suspended = true;
  return serial(async () => {
    const device = await readPushDevice();
    if (!device) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.id === device.userId) await pushDeviceRequest('DELETE', { token: device.token });
    // Also persist opt-out so a subsequent login does not re-register without consent.
    const raw = await SecureStore.getItemAsync(pushPreferencesKey(device.userId));
    const preferences = raw ? JSON.parse(raw) : { whispers: true, sessions: true };
    await SecureStore.setItemAsync(pushPreferencesKey(device.userId), JSON.stringify({ ...preferences, enabled: false }));
    await SecureStore.deleteItemAsync(key);
  });
}
