import { NextResponse, type NextRequest } from "next/server";
import { getAppleWebClientId } from "@/lib/apple-sign-in";
import { isAppleWebSignInConfigured } from "@/lib/auth/apple-web-session";
import { getLoginDestination } from "@/lib/auth/login-destination";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const unavailable = () => NextResponse.redirect(new URL("/login?error=apple_unavailable", origin), 303);

  if (!isAppleWebSignInConfigured()) return unavailable();

  try {
    const callback = new URL("/auth/callback/apple", origin);
    const next = getLoginDestination(searchParams.get("next"));
    if (next !== "/dashboard") callback.searchParams.set("next", next);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: callback.href, skipBrowserRedirect: true },
    });
    if (error || !data.url) return unavailable();

    const response = await fetch(data.url, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(5000) });
    const location = response.headers.get("location");
    if (!location || response.status !== 302) return unavailable();
    const apple = new URL(location);
    if (apple.origin !== "https://appleid.apple.com" || apple.pathname !== "/auth/authorize" ||
      apple.searchParams.get("client_id") !== getAppleWebClientId()) return unavailable();
    return NextResponse.redirect(apple, 303);
  } catch {
    return unavailable();
  }
}
