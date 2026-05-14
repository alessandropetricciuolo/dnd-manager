/**
 * Carica una sola volta lo script ufficiale Spotify iFrame API e restituisce l'oggetto IFrameAPI.
 * @see https://developer.spotify.com/documentation/embeds/references/iframe-api
 */

export type SpotifyEmbedController = {
  togglePlay: () => void;
  play?: () => void;
  pause?: () => void;
  resume?: () => void;
  loadUri: (uri: string) => void;
  destroy?: () => void;
};

export type SpotifyIFrameAPI = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width?: string | number; height?: string | number },
    callback: (controller: SpotifyEmbedController) => void
  ) => void;
};

declare global {
  interface Window {
    SpotifyIframeApi?: SpotifyIFrameAPI;
    onSpotifyIframeApiReady?: (IFrameAPI: SpotifyIFrameAPI) => void;
  }
}

let iframeApiPromise: Promise<SpotifyIFrameAPI> | null = null;

export function loadSpotifyIframeApi(): Promise<SpotifyIFrameAPI> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Spotify iFrame API: solo lato client."));
  }
  if (window.SpotifyIframeApi) {
    return Promise.resolve(window.SpotifyIframeApi);
  }
  if (!iframeApiPromise) {
    iframeApiPromise = new Promise((resolve) => {
      const previous = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (IFrameAPI: SpotifyIFrameAPI) => {
        window.SpotifyIframeApi = IFrameAPI;
        try {
          previous?.(IFrameAPI);
        } catch {
          /* ignore third-party callback errors */
        }
        resolve(IFrameAPI);
      };
      if (!document.querySelector("script#spotify-iframeapi-script")) {
        const s = document.createElement("script");
        s.id = "spotify-iframeapi-script";
        s.src = "https://open.spotify.com/embed/iframe-api/v1";
        s.async = true;
        document.body.appendChild(s);
      }
    });
  }
  return iframeApiPromise;
}
