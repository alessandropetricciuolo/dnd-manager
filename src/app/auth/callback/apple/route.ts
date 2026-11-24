import { NextResponse, type NextRequest } from "next/server";
import { saveAppleWebAuthorization } from "@/lib/auth/apple-web-session";
import { getLoginDestination } from "@/lib/auth/login-destination";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code && !searchParams.has("error")) {
    const supabase = await createSupabaseServerClient();
    let signedIn = false;
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session && data.user) {
        signedIn = true;
        const { access_token, refresh_token, provider_refresh_token } = data.session;
        if (await saveAppleWebAuthorization(data.user, provider_refresh_token)) {
          const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!sessionError) {
            return NextResponse.redirect(new URL(getLoginDestination(searchParams.get("next")), origin), 303);
          }
        }
      }
    } catch {
      // Fall through to clear any session that could not be finalized.
    }
    if (signedIn) await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  }

  const requiresAccount = searchParams.get("error_description")?.includes("social_signup_requires_existing_account");
  return NextResponse.redirect(new URL(`/login?error=${requiresAccount ? "apple_account_required" : "apple_failed"}`, origin), 303);
}
