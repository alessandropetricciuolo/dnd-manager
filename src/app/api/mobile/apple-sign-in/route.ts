import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { exchangeAppleAuthorizationCode, isAppleSignInConfigured, readAppleIdentityClaims } from "@/lib/apple-sign-in";
import { isAppleWebSignInConfigured } from "@/lib/auth/apple-web-session";
import { accountSafetyClient } from "@/utils/supabase/account-safety";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unavailable = "L’accesso con Apple è temporaneamente non disponibile.";
const existingAccountRequired = "Accedi prima con la tua email e collega Apple da Account. Puoi usare anche Nascondi la mia email.";
const failed = "Accesso con Apple non riuscito. Riprova.";

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function matchesAppleIdentity(user: User, subject: string) {
  return user.identities?.some((identity) =>
    identity.provider === "apple" && identity.identity_data?.sub === subject);
}

export async function GET() {
  let enabled = false;
  let webEnabled = false;
  if (isAppleSignInConfigured()) {
    try {
      const tokens = accountSafetyClient(createSupabaseAdminClient()).from("apple_sign_in_tokens");
      const { error } = await tokens.select("user_id", { head: true }).limit(1);
      enabled = !error;
      if (enabled && isAppleWebSignInConfigured()) {
        const web = await tokens.select("encrypted_web_refresh_token", { head: true }).limit(1);
        webEnabled = !web.error;
      }
    } catch {
      // Email login remains available during configuration or rollout.
    }
  }
  return NextResponse.json({ enabled, webEnabled }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey || !isAppleSignInConfigured()) return errorResponse(unavailable, 503);

  let payload: { code?: unknown; identityToken?: unknown; nonce?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 8192) return errorResponse(failed, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return errorResponse(failed, 400);
    payload = parsed;
  } catch {
    return errorResponse(failed, 400);
  }
  if (typeof payload.code !== "string" || !payload.code || payload.code.length > 2048) {
    return errorResponse(failed, 400);
  }

  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (typeof payload.identityToken !== "string" || !payload.identityToken ||
    typeof payload.nonce !== "string" || !payload.nonce || payload.nonce.length > 128) {
    return errorResponse(failed, 400);
  }

  try {
    const auth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      ...(bearer ? { global: { headers: { Authorization: `Bearer ${bearer}` } } } : {}),
    });
    const admin = accountSafetyClient(createSupabaseAdminClient());
    const existingUser = bearer ? (await auth.auth.getUser(bearer)).data.user : null;
    if (bearer && !existingUser) return errorResponse(failed, 401);

    const apple = await exchangeAppleAuthorizationCode(payload.code);
    if (!apple || readAppleIdentityClaims(payload.identityToken)?.subject !== apple.subject) return errorResponse(failed, 400);

    let user = existingUser;
    let session: { access_token: string; refresh_token: string } | null = null;
    const credential = { provider: "apple" as const, token: payload.identityToken, nonce: payload.nonce };
    if (!existingUser) {
      const { data: known, error: lookupError } = await admin.rpc("has_existing_apple_account", {
        p_subject: apple.subject, p_verified_email: apple.verifiedEmail,
      });
      if (lookupError) return errorResponse(unavailable, 503);
      if (!known) return errorResponse(existingAccountRequired, 403);
      const { data, error } = await auth.auth.signInWithIdToken(credential);
      if (error || !data.user || !data.session) return errorResponse(failed, 401);
      user = data.user;
      session = { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
    } else if (!matchesAppleIdentity(existingUser, apple.subject)) {
      if (existingUser.identities?.some((identity) => identity.provider === "apple")) {
        return errorResponse("A questo profilo è già collegato un altro account Apple.", 409);
      }
      const { data, error } = await auth.auth.linkIdentity({
        provider: "apple", token: credential.token, nonce: credential.nonce,
      });
      if (error || !data.user || !data.session || data.user.id !== existingUser.id) {
        return errorResponse("Impossibile collegare Apple. Riprova o verifica che non sia già associato a un altro profilo.", 409);
      }
      user = data.user;
      session = { access_token: data.session.access_token, refresh_token: data.session.refresh_token };
    }
    if (!user || !matchesAppleIdentity(user, apple.subject)) return errorResponse(failed, 403);

    const { error: saveError } = await admin.from("apple_sign_in_tokens").upsert({
      user_id: user.id, encrypted_refresh_token: apple.encryptedRefreshToken,
    });
    if (saveError) {
      console.error("[apple sign in] token storage", saveError.code);
      return errorResponse(unavailable, 503);
    }
    return NextResponse.json({ session }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return errorResponse(unavailable, 503);
  }
}
