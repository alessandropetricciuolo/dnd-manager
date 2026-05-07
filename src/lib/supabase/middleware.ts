import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rotte di autenticazione: se l'utente è loggato, va reindirizzato a /dashboard.
 *
 * NOTA: /update-password è ESCLUSO di proposito.
 * Dopo il click sul link di recupero password vogliamo che l'utente,
 * anche se già autenticato, possa sempre vedere la pagina per cambiare password.
 */
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

/** Prefissi delle rotte protette: se l'utente non è loggato, va reindirizzato a /login */
const PROTECTED_PREFIXES = ["/dashboard", "/campaigns", "/profile", "/admin"];

/** Percorsi sempre accessibili (tutti) */
const PUBLIC_PATHS = ["/", "/privacy"];

/** Esportate per test di policy auth sui path (middleware). */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isPublicPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return PUBLIC_PATHS.includes(normalized);
}

function redirectWithSupabaseCookies(redirectUrl: URL, supabaseResponse: NextResponse) {
  const res = NextResponse.redirect(redirectUrl);
  const setCookie = supabaseResponse.headers.get("set-cookie");
  if (setCookie) {
    // Preserve cookie attributes emitted by Supabase (Secure/HttpOnly/SameSite/etc).
    res.headers.set("set-cookie", setCookie);
  }
  return res;
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Le pagine pubbliche non devono leggere la sessione: evita set-cookie inutili
  // e permette alla CDN di cacheare HTML marketing/statico.
  const isApiPath = pathname === "/api" || pathname.startsWith("/api/");
  if (!isApiPath && (isPublicPath(pathname) || (!isAuthRoute(pathname) && !isProtectedRoute(pathname)))) {
    return NextResponse.next({ request });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options as object)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Caso A: Utente loggato che accede a pagine di auth → redirect a /dashboard
  if (user && isAuthRoute(pathname)) {
    const redirectUrl = new URL("/dashboard", request.url);
    return redirectWithSupabaseCookies(redirectUrl, supabaseResponse);
  }

  // Caso B: Utente ospite che accede a rotte protette → redirect a /login
  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return redirectWithSupabaseCookies(redirectUrl, supabaseResponse);
  }

  return supabaseResponse;
}
