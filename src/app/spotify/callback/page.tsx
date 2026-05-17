import { Suspense } from "react";
import { SpotifyCallbackClient } from "./spotify-callback-client";

export default function SpotifyCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">Caricamento…</div>
      }
    >
      <SpotifyCallbackClient />
    </Suspense>
  );
}
