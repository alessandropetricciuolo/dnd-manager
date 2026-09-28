export const GM_AUDIO_STOP_ALL_EVENT = "gm-audio-stop-all";
export const GM_AUDIO_SPOTIFY_SELECTED_EVENT = "gm-audio-spotify-selected";

export function resumeGmSpotifyPlayer(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(GM_AUDIO_SPOTIFY_SELECTED_EVENT));
}
