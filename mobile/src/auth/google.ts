import { Buffer } from 'buffer';
import type { CryptoDigestAlgorithm } from 'expo-crypto';
import { supabase } from '../api/supabase';

const redirectTo = 'com.barberanddragons.mobile://auth/callback';
const googleError = 'Accesso con Google non riuscito. Riprova con l’email del tuo account.';

async function ensurePkceCrypto() {
  // Supabase uses Web Crypto for S256. Use Expo's native crypto on runtimes
  // without Web Crypto so auth-js never falls back to a plain challenge.
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto?.subtle?.digest) {
    const { digest, getRandomValues } = await import('expo-crypto');
    const crypto = {
      getRandomValues,
      subtle: {
        digest: (algorithm: CryptoDigestAlgorithm, data: Uint8Array<ArrayBuffer>) => digest(algorithm, data),
      },
    };
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: crypto });
  }
  globalThis.TextEncoder ??= class {
    encode(text: string) {
      return Uint8Array.from(Buffer.from(text, 'utf8'));
    }
  } as typeof TextEncoder;
  globalThis.btoa ??= (text) => Buffer.from(text, 'latin1').toString('base64');
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
    const { openAuthSessionAsync } = await import('expo-web-browser');
    await ensurePkceCrypto();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { error: googleError };

    const result = await openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'cancel' || result.type === 'dismiss') return {};
    if (result.type !== 'success') return { error: googleError };

    const [callback, hash] = result.url.split('#', 2);
    const [destination, query] = callback.split('?', 2);
    if (destination !== redirectTo) return { error: googleError };

    const params = new URLSearchParams(query);
    const fragment = new URLSearchParams(hash);
    const details = params.get('error_description') ?? fragment.get('error_description');
    if (details?.includes('social_signup_requires_existing_account')) {
      return { error: 'Per accedere con Google, registrati sul sito con lo stesso indirizzo email.' };
    }
    const callbackError = params.get('error') ?? fragment.get('error');
    if (callbackError === 'access_denied') return {};

    const code = params.get('code');
    if (callbackError || !code) return { error: googleError };

    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    return sessionError || !sessionData.session ? { error: googleError } : {};
  } catch {
    return { error: googleError };
  }
}
