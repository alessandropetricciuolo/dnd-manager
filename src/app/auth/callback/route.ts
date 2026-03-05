import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabase/server";

/** Solo path locali (evita open redirect). */
function isAllowedNext(next: string): boolean {
  const path = next.trim();
  return path.startsWith("/") && !path.startsWith("//");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/update-password";
  const next = isAllowedNext(nextParam) ? nextParam : "/update-password";

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

    const baseUrl = new URL(request.url).origin;
    return NextResponse.redirect(new URL(next, baseUrl));
  } catch (e) {
    console.error("[auth/callback]", e);
    return NextResponse.redirect(new URL("/login?error=callback_failed", request.url));
  }
}
