import type { SpotifyEmbedController } from "@/lib/spotify/spotify-iframe-api";

type Active = { owner: symbol; controller: SpotifyEmbedController };

let active: Active | null = null;

export function registerSpotifyEmbedController(owner: symbol, controller: SpotifyEmbedController): void {
  active = { owner, controller };
}

export function unregisterSpotifyEmbedController(owner: symbol): void {
  if (active?.owner === owner) active = null;
}

/** true se c’è un embed Spotify controllabile via iFrame API. */
export function spotifyEmbedHasController(): boolean {
  return Boolean(active?.controller?.togglePlay);
}

/**
 * Play/pause sull’embed Spotify (iFrame API). Non tocca la musica HTML del mixer.
 * @returns true se il comando è stato inviato all’embed
 */
export function spotifyEmbedTogglePlay(): boolean {
  const c = active?.controller;
  if (!c?.togglePlay) return false;
  try {
    c.togglePlay();
    return true;
  } catch {
    return false;
  }
}
