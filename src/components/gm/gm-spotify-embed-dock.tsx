"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, LogIn, LogOut, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyEmbedIframe } from "@/components/gm/spotify-embed-iframe";
import { useSpotifyWebPlayer } from "@/hooks/use-spotify-web-player";
import { buildAuthorizeUrl, isSpotifyOAuthConfigured, readStoredTokens } from "@/lib/spotify/oauth-pkce";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Props = {
  playlistId: string | null;
  audioSheetOpen?: boolean;
};

/** Player Spotify sul GM screen (solo PC). OAuth opzionale per riproduzione completa Premium. */
export function GmSpotifyEmbedDock({ playlistId, audioSheetOpen }: Props) {
  const [open, setOpen] = useState(true);
  const [loginPending, setLoginPending] = useState(false);
  const spotify = useSpotifyWebPlayer();

  useEffect(() => {
    if (readStoredTokens()) spotify.markConnected();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap sessione una volta
  }, []);

  // spotify dall'hook ha identità instabile; dipendenze granulari evitano loop.
  useEffect(() => {
    if (!playlistId || !spotify.connected || spotify.status !== "ready") return;
    void spotify.playPlaylist(playlistId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- spotify
  }, [playlistId, spotify.connected, spotify.status, spotify.playPlaylist]);

  if (!playlistId) return null;

  const oauthConfigured = isSpotifyOAuthConfigured();
  const track = spotify.playback?.track_window?.current_track;
  const trackLabel = track
    ? `${track.name ?? "—"}${track.artists?.length ? ` · ${track.artists.map((a) => a.name).join(", ")}` : ""}`
    : null;

  const startLogin = () => {
    if (!oauthConfigured) {
      toast.message("Configura NEXT_PUBLIC_SPOTIFY_CLIENT_ID oppure accedi dal pulsante nel player embed.");
      return;
    }
    setLoginPending(true);
    void buildAuthorizeUrl()
      .then((url) => {
        window.location.href = url;
      })
      .catch(() => {
        setLoginPending(false);
        toast.error("Impossibile avviare l’accesso Spotify.");
      });
  };

  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-3 right-3 flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-1",
        audioSheetOpen ? "z-[60]" : "z-40"
      )}
    >
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-7 border-amber-800/50 bg-zinc-900 text-[10px] text-amber-100"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronUp className="mr-1 h-3 w-3" />}
        Spotify
      </Button>
      <div
        className={cn(
          "w-[min(100vw-24px,400px)] overflow-hidden rounded-xl border border-amber-800/50 bg-black/90 shadow-2xl",
          open
            ? "relative"
            : "pointer-events-none fixed left-[-10000px] top-0 z-0 h-[380px] w-[400px] opacity-0"
        )}
        aria-hidden={!open}
      >
        <div className="space-y-2 border-b border-amber-900/40 bg-zinc-950/90 px-3 py-2">
          {spotify.connected ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-400/90">
                Account collegato
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 border-amber-800/50 px-2 text-[11px]"
                disabled={spotify.status !== "ready"}
                onClick={() => void spotify.togglePlay()}
              >
                {spotify.playback?.paused !== false ? (
                  <Play className="mr-1 h-3 w-3" />
                ) : (
                  <Pause className="mr-1 h-3 w-3" />
                )}
                Play / Pause
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-[11px] text-zinc-400"
                onClick={spotify.disconnect}
              >
                <LogOut className="mr-1 h-3 w-3" />
                Esci
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] leading-snug text-zinc-400">
                Senza accesso senti solo anteprime. Collega il tuo account Spotify Premium per la musica completa.
              </p>
              {oauthConfigured ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 w-full bg-[#1DB954] text-xs font-medium text-black hover:bg-[#1ed760]"
                  disabled={loginPending}
                  onClick={startLogin}
                >
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  Collega account Spotify
                </Button>
              ) : (
                <p className="text-[10px] text-zinc-500">
                  Oppure usa <strong className="text-zinc-400">Accedi</strong> nel player qui sotto (Premium).
                </p>
              )}
            </div>
          )}
          {trackLabel ? <p className="truncate text-[11px] text-amber-100/80">{trackLabel}</p> : null}
          {spotify.error ? <p className="text-[10px] text-red-400">{spotify.error}</p> : null}
        </div>

        {!spotify.connected || spotify.status !== "ready" ? (
          <SpotifyEmbedIframe playlistId={playlistId} height={340} />
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 bg-zinc-950 px-4 py-8 text-center">
            <p className="text-sm text-amber-100/90">Riproduzione dal tuo account Spotify</p>
            <p className="text-[11px] text-zinc-500">
              Cambia playlist dal foglio Audio. I controlli sono nella barra sopra.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2 border-amber-800/50"
              onClick={() => void spotify.playPlaylist(playlistId)}
            >
              Riproduci playlist attiva
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
