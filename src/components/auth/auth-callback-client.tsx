"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";

/** Path locali ammessi per next (evita open redirect). */
function isAllowedNext(next: string): boolean {
  const path = next.trim();
  return path.startsWith("/") && !path.startsWith("//");
}

/**
 * Gestisce il callback dopo recovery/OAuth.
 * - Se c'è l'hash (#access_token=...): Supabase ha usato implicit flow (es. recovery da email). Leggiamo i token e setSession.
 * - Se c'è ?code=: exchangeCodeForSession (OAuth/PKCE).
 * Poi redirect a next (default /update-password).
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const nextParam = searchParams.get("next") ?? "/update-password";
    const next = isAllowedNext(nextParam) ? nextParam : "/update-password";
    const code = searchParams.get("code");

    const supabase = createSupabaseBrowserClient();

    async function run() {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const hashParams = hash ? new URLSearchParams(hash.slice(1)) : null;
      const accessToken = hashParams?.get("access_token");
      const refreshToken = hashParams?.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error("[auth/callback] setSession from hash", error);
          setStatus("error");
          router.replace(`/login?error=callback_failed`);
          return;
        }
        setStatus("ok");
        router.replace(next);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[auth/callback] exchangeCodeForSession", error);
          setStatus("error");
          router.replace(`/login?error=exchange_failed`);
          return;
        }
        setStatus("ok");
        router.replace(next);
        return;
      }

      setStatus("error");
      router.replace("/login?error=missing_code");
    }

    run();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-barber-dark">
      <div className="flex flex-col items-center gap-4 text-barber-paper">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-barber-gold" />
            <p className="text-sm text-barber-paper/80">Accesso in corso...</p>
          </>
        )}
        {status === "error" && (
          <p className="text-sm text-red-400">Reindirizzamento al login...</p>
        )}
      </div>
    </div>
  );
}
