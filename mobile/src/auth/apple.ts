import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import { createClient } from '@supabase/supabase-js';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../api/supabase';
import { signInWithBrowser } from './browser-oauth';

const endpoint = `${(process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://barberanddragons.com').replace(/\/$/, '')}/api/mobile/apple-sign-in`;
const failed = 'Accesso con Apple non riuscito. Riprova.';
const finalizeLinkError = 'Non è stato possibile completare il collegamento con Apple. Riprova da Account.';

export function useAppleSignInAvailability() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    const controller = new AbortController();
    const load = async () => {
      try {
        if (Platform.OS === 'ios' && !await AppleAuthentication.isAvailableAsync()) return;
        if (controller.signal.aborted) return;
        const response = await fetch(endpoint, { signal: controller.signal });
        const data = response.ok ? await response.json() as { enabled?: boolean; webEnabled?: boolean } : null;
        if (!controller.signal.aborted) setAvailable(Platform.OS === 'ios' ? data?.enabled === true : data?.webEnabled === true);
      } catch {
        // Email login remains available when the endpoint is unreachable.
      }
    };
    void load();
    return () => controller.abort();
  }, []);
  return available;
}

async function authorizeApple() {
  const nonce = randomUUID();
  const hashedNonce = await digestStringAsync(CryptoDigestAlgorithm.SHA256, nonce);
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: hashedNonce,
  });
  if (!credential.identityToken || !credential.authorizationCode) throw new Error(failed);
  return { code: credential.authorizationCode, identityToken: credential.identityToken, nonce };
}

function wasCancelled(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_REQUEST_CANCELED';
}

async function signInWithAppleInBrowser() {
  // Hold the browser result in memory until its Apple authorization is saved server-side.
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  return signInWithBrowser('apple', client, async ({ access_token, refresh_token, provider_refresh_token }) => {
    const response = await fetch(`${endpoint}/web`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
      body: JSON.stringify({ refreshToken: provider_refresh_token ?? null }),
    });
    if (!response.ok) return false;
    return !(await supabase.auth.setSession({ access_token, refresh_token })).error;
  });
}

export async function signInWithApple(): Promise<{ error?: string }> {
  if (Platform.OS === 'android') return signInWithAppleInBrowser();
  try {
    const { code, identityToken, nonce } = await authorizeApple();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, identityToken, nonce }),
    });
    const data = await response.json() as {
      error?: string;
      session?: { access_token: string; refresh_token: string };
    };
    if (!response.ok || !data.session) return { error: data.error ?? failed };
    const { error } = await supabase.auth.setSession(data.session);
    return error ? { error: failed } : {};
  } catch (error) {
    return wasCancelled(error) ? {} : { error: failed };
  }
}

export async function linkAppleIdentity(): Promise<{ linked: boolean; error?: string }> {
  try {
    const credential = await authorizeApple();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { linked: false, error: 'Accedi prima con la tua email.' };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(credential),
    });
    const data = await response.json() as {
      error?: string;
      session?: { access_token: string; refresh_token: string };
    };
    if (!response.ok) return { linked: false, error: data.error ?? finalizeLinkError };
    if (data.session && (await supabase.auth.setSession(data.session)).error) {
      return { linked: false, error: finalizeLinkError };
    }
    return { linked: true };
  } catch (error) {
    return wasCancelled(error) ? { linked: false } : { linked: false, error: finalizeLinkError };
  }
}
