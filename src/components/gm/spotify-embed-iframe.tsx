"use client";

import { spotifyPlaylistEmbedSrc } from "@/lib/spotify/playlist-id";
import { cn } from "@/lib/utils";

type Props = {
  playlistId: string;
  height?: number;
  className?: string;
};

/**
 * Embed ufficiale Spotify: l’utente può accedere dall’interfaccia del player (pulsante Accedi).
 * Per riproduzione completa serve account Premium collegato nel browser o via OAuth dell’app.
 */
export function SpotifyEmbedIframe({ playlistId, height = 380, className }: Props) {
  const id = playlistId.trim();
  if (!id) return null;

  return (
    <iframe
      key={id}
      title="Spotify"
      src={spotifyPlaylistEmbedSrc(id)}
      width="100%"
      height={height}
      className={cn("block w-full bg-black", className)}
      style={{ border: 0, minHeight: height }}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}
