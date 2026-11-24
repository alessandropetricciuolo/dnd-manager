import type { User } from "@supabase/supabase-js";
import { getAppleWebClientId, isAppleSignInConfigured, validateAndEncryptAppleWebToken } from "@/lib/apple-sign-in";
import { accountSafetyClient } from "@/utils/supabase/account-safety";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

export function isAppleWebSignInConfigured() {
  return isAppleSignInConfigured() && Boolean(getAppleWebClientId());
}

export async function saveAppleWebAuthorization(user: User, refreshToken?: string | null) {
  const subjects = (user.identities ?? []).filter(({ provider }) => provider === "apple")
    .map(({ identity_data }) => identity_data?.sub)
    .filter((subject): subject is string => typeof subject === "string");

  if (!subjects.length) return false;
  const admin = accountSafetyClient(createSupabaseAdminClient());
  if (!refreshToken) {
    const { data, error } = await admin.from("apple_sign_in_tokens")
      .select("user_id").eq("user_id", user.id).not("encrypted_web_refresh_token", "is", null).maybeSingle();
    return !error && Boolean(data);
  }

  const encrypted = await validateAndEncryptAppleWebToken(refreshToken, subjects);
  if (!encrypted) return false;
  const { error } = await admin.from("apple_sign_in_tokens")
    .upsert({ user_id: user.id, encrypted_web_refresh_token: encrypted });
  return !error;
}
