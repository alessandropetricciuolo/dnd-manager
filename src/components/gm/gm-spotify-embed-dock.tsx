"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyEmbedIframe } from "./spotify-embed-iframe";
import { useSpotifyWebPlayer } from "@/hooks/use-spotify-web-player";
import { buildAuthorizeUrl, isSpotifyOAuthConfigured } from "@/lib/spotify/oauth-pkce";
import { GM_AUDIO_SPOTIFY_SELECTED_EVENT, GM_AUDIO_STOP_ALL_EVENT } from "@/lib/gm-audio-forge/audio-events";

type Props = { playlistId: string | null };

/** Resta montato nel foglio Audio anche quando il foglio viene chiuso. */
export function GmSpotifyEmbedDock({ playlistId }: Props) {
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [embedStopped, setEmbedStopped] = useState(false);
  const spotify = useSpotifyWebPlayer();
  const { connected, status, playback, error, pause, playPlaylist, togglePlay, disconnect } = spotify;
  const oauthConfigured = isSpotifyOAuthConfigured();

  useEffect(() => {
    const stop = () => {
      setEmbedStopped(true);
      void pause().catch(() => {});
    };
    window.addEventListener(GM_AUDIO_STOP_ALL_EVENT, stop);
    return () => window.removeEventListener(GM_AUDIO_STOP_ALL_EVENT, stop);
  }, [pause]);

  useEffect(() => { setEmbedStopped(false); }, [playlistId]);

  useEffect(() => {
    const resume = () => setEmbedStopped(false);
    window.addEventListener(GM_AUDIO_SPOTIFY_SELECTED_EVENT, resume);
    return () => window.removeEventListener(GM_AUDIO_SPOTIFY_SELECTED_EVENT, resume);
  }, []);

  useEffect(() => {
    if (playlistId && connected && status === "ready" && !embedStopped) void playPlaylist(playlistId);
  }, [playlistId, connected, status, embedStopped, playPlaylist]);

  const startLogin = async () => {
    setLoginPending(true);
    setLoginError(false);
    try {
      window.location.assign(await buildAuthorizeUrl());
    } catch {
      setLoginPending(false);
      setLoginError(true);
    }
  };

  const track = playback?.track_window?.current_track;
  const trackLabel = track ? `${track.name ?? "Brano"}${track.artists?.length ? ` · ${track.artists.map((artist) => artist.name).join(", ")}` : ""}` : null;

  return (
    <div className="space-y-3">
      {connected ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-sm text-zinc-200">{trackLabel ?? (status === "ready" ? "Account Spotify collegato" : "Connessione al player Spotify…")}</p>
          <Button type="button" size="sm" variant="outline" disabled={status !== "ready"} onClick={() => void togglePlay()} aria-label={playback?.paused === false ? "Metti Spotify in pausa" : "Riprendi Spotify"}>
            {playback?.paused === false ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4" />}
            {playback?.paused === false ? "Pausa" : "Riprendi"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={disconnect}><LogOut className="mr-1.5 h-4 w-4" />Scollega</Button>
        </div>
      ) : oauthConfigured ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-sm text-zinc-400">Collega Spotify per ascoltare le playlist dal PC del GM.</p>
          <Button type="button" size="sm" disabled={loginPending} onClick={() => void startLogin()} className="bg-[#1DB954] text-black hover:bg-[#1ed760]">
            <LogIn className="mr-1.5 h-4 w-4" />Collega Spotify
          </Button>
        </div>
      ) : (
        <p className="text-sm text-amber-200">Il collegamento account non è ancora configurato per questa installazione. Puoi usare Accedi nel player Spotify qui sotto.</p>
      )}

      {loginError ? <p role="alert" className="text-sm text-red-400">Impossibile avviare il collegamento. Riprova.</p> : null}
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      {playlistId ? (
        connected && status === "ready" ? (
          <Button type="button" size="sm" variant="outline" onClick={() => { setEmbedStopped(false); void playPlaylist(playlistId); }}>
            <Play className="mr-1.5 h-4 w-4" />Riproduci playlist selezionata
          </Button>
        ) : embedStopped ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setEmbedStopped(false)}>Apri player Spotify</Button>
        ) : (
          <SpotifyEmbedIframe playlistId={playlistId} height={352} className="rounded-lg" />
        )
      ) : (
        <p className="text-sm text-zinc-500">Seleziona una playlist per iniziare.</p>
      )}
    </div>
  );
}
