import { AuthCallbackClient } from "@/components/auth/auth-callback-client";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

/**
 * Callback dopo magic link / recovery password / OAuth.
 * I token possono arrivare in hash (#access_token=...) o in query (?code=).
 * Solo il client può leggere l'hash, quindi la logica è in AuthCallbackClient.
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
