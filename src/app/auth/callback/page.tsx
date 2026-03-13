import { AuthCallbackClient } from "@/components/auth/auth-callback-client";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

/**
 * Callback dopo magic link / recovery password / OAuth.
 *
 * Usiamo una PAGE (non route.ts) perché Supabase può inviare i token in due modi:
 * - Hash (#access_token=...&refresh_token=...): il server non riceve l'hash, solo il client può leggerlo.
 * - Query (?code=...): flusso PKCE; exchangeCodeForSession(code) viene eseguito nel client e poi redirect a `next`.
 *
 * In entrambi i casi la sessione viene impostata nel browser e l'utente viene reindirizzato a /update-password.
 */
export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-barber-dark">
          <p className="text-barber-paper/80">Caricamento...</p>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
