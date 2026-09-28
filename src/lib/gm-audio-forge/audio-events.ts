export const GM_AUDIO_STOP_ALL_EVENT = "gm-audio-stop-all";
export const GM_AUDIO_SPOTIFY_SELECTED_EVENT = "gm-audio-spotify-selected";
export const GM_AUDIO_SPOTIFY_REMOTE_SELECT_EVENT = "gm-audio-spotify-remote-select";
export const GM_AUDIO_SPOTIFY_REMOTE_TOGGLE_EVENT = "gm-audio-spotify-remote-toggle";
export const GM_AUDIO_SPOTIFY_STATE_EVENT = "gm-audio-spotify-state";

export type GmSpotifyPlayerState = { ready: boolean; playing: boolean; trackLabel: string | null };

export function stopOtherGmAudioSources(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(GM_AUDIO_STOP_ALL_EVENT));
}

export function resumeGmSpotifyPlayer(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(GM_AUDIO_SPOTIFY_SELECTED_EVENT));
}
