"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  SPOTIFY_PKCE_VERIFIER_KEY,
  SPOTIFY_RETURN_PATH_KEY,
  exchangeAuthorizationCode,
  writeStoredTokens,
} from "@/lib/spotify/oauth-pkce";

export function SpotifyCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Collegamento a Spotify…");

  useEffect(() => {
    const code = searchParams.get("code");
    const err = searchParams.get("error");
    const returnPath = sessionStorage.getItem(SPOTIFY_RETURN_PATH_KEY) || "/";
    sessionStorage.removeItem(SPOTIFY_RETURN_PATH_KEY);

    if (err) {
      setMessage("Accesso a Spotify annullato.");
      const t = window.setTimeout(() => router.replace(returnPath), 2000);
      return () => window.clearTimeout(t);
    }

    if (!code) {
      setMessage("Codice di autorizzazione mancante.");
      const t = window.setTimeout(() => router.replace(returnPath), 2000);
      return () => window.clearTimeout(t);
    }

    const verifier = sessionStorage.getItem(SPOTIFY_PKCE_VERIFIER_KEY);
    sessionStorage.removeItem(SPOTIFY_PKCE_VERIFIER_KEY);
    if (!verifier) {
      setMessage("Sessione OAuth scaduta. Riprova.");
      const t = window.setTimeout(() => router.replace(returnPath), 2000);
      return () => window.clearTimeout(t);
    }

    void (async () => {
      try {
        const tokens = await exchangeAuthorizationCode(code, verifier);
        writeStoredTokens(tokens);
        router.replace(returnPath);
      } catch {
        setMessage("Errore nel collegamento. Riprova dal GM screen.");
        const t = window.setTimeout(() => router.replace(returnPath), 2500);
        return () => window.clearTimeout(t);
      }
    })();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-300">
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-amber-400" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
