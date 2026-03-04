import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/update-password";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession", error);
      return NextResponse.redirect(new URL("/login?error=exchange_failed", request.url));
    }

    const redirectUrl = next.startsWith("/") ? new URL(next, request.url) : new URL("/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  } catch (e) {
    console.error("[auth/callback]", e);
    return NextResponse.redirect(new URL("/login?error=callback_failed", request.url));
  }
}
