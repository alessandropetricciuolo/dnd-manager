import { NextResponse, type NextRequest } from "next/server";
import { getLoginDestination } from "@/lib/auth/login-destination";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  if (code && !searchParams.has("error")) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) {
        return NextResponse.redirect(new URL(getLoginDestination(searchParams.get("next")), origin), 303);
      }
    } catch {
      // Show the same retry message if the auth service cannot be reached.
    }
  }

  const requiresAccount = searchParams.get("error_description")?.includes("social_signup_requires_existing_account");
  return NextResponse.redirect(new URL(`/login?error=${requiresAccount ? "google_account_required" : "google_failed"}`, origin), 303);
}
