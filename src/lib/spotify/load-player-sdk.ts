/** Carica lo script Spotify Web Playback SDK una sola volta. */

export type SpotifyWebPlayerInstance = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  togglePlay: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  getCurrentState: () => Promise<SpotifyPlaybackState | null>;
  addListener: (event: string, cb: (state: unknown) => void) => void;
  removeListener: (event: string, cb: (state: unknown) => void) => void;
};

export type SpotifyPlaybackState = {
  paused: boolean;
  track_window?: {
    current_track?: {
      name?: string;
      artists?: { name: string }[];
    };
  };
};

type SpotifyPlayerCtor = new (options: {
  name: string;
  getOAuthToken: (cb: (token: string) => void) => void;
  volume?: number;
}) => SpotifyWebPlayerInstance;

declare global {
  interface Window {
    Spotify?: { Player: SpotifyPlayerCtor };
  }
}

let loadPromise: Promise<void> | null = null;

export function loadSpotifyPlayerSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Spotify SDK: solo client."));
  }
  if (window.Spotify?.Player) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-spotify-player-sdk="1"]');
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("sdk_load_failed")));
        return;
      }
      const s = document.createElement("script");
      s.src = "https://sdk.scdn.co/spotify-player.js";
      s.async = true;
      s.dataset.spotifyPlayerSdk = "1";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("sdk_load_failed"));
      document.body.appendChild(s);
    });
  }
  return loadPromise;
}

export function createWebPlayer(
  getToken: () => Promise<string | null>,
  name = "Barber & Dragons GM"
): SpotifyWebPlayerInstance {
  if (!window.Spotify?.Player) throw new Error("sdk_not_loaded");
  return new window.Spotify.Player({
    name,
    volume: 0.85,
    getOAuthToken: (cb) => {
      void getToken().then((t) => {
        if (t) cb(t);
      });
    },
  });
}
