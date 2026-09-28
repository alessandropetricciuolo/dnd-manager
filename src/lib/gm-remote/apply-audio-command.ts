import type { GmAudioForgeControls } from "@/lib/gm-audio-forge/use-gm-audio-forge";
import { GM_AUDIO_SPOTIFY_REMOTE_SELECT_EVENT, GM_AUDIO_SPOTIFY_REMOTE_TOGGLE_EVENT } from "@/lib/gm-audio-forge/audio-events";

function num01(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(1, Math.max(0, v));
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function int0_11(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isInteger(v)) return null;
  if (v < 0 || v > 11) return null;
  return v;
}

/**
 * Applica un comando audio ricevuto via Realtime sullo stato del GM screen (HTMLAudio sul PC).
 */
export function applyRemoteAudioCommand(forge: GmAudioForgeControls, type: string, payload: Record<string, unknown>): void {
  switch (type) {
    case "audio.music_play_pause":
      forge.toggleMusicPlayback();
      return;
    case "audio.music_next":
      forge.skipMusicTrack(1);
      return;
    case "audio.music_prev":
      forge.skipMusicTrack(-1);
      return;
    case "audio.music_select_track": {
      const categoryId = str(payload.category_id);
      const trackId = str(payload.track_id);
      if (categoryId && trackId) forge.playMusicByTrackId(categoryId, trackId);
      return;
    }
    case "audio.music_master_volume": {
      const value = num01(payload.value);
      if (value !== null) forge.setMusicMaster(value);
      return;
    }
    case "audio.music_mute": {
      const muted = payload.muted === true;
      forge.setMusicMuted(muted);
      return;
    }
    case "audio.atmos_master_volume": {
      const value = num01(payload.value);
      if (value !== null) forge.setAtmosMaster(value);
      return;
    }
    case "audio.sfx_master_volume": {
      const value = num01(payload.value);
      if (value !== null) forge.setSfxMaster(value);
      return;
    }
    case "audio.sfx_pad_slot": {
      const slot = int0_11(payload.slot_index);
      if (slot === null) return;
      const lib = forge.library;
      const s = lib.sfxPad.slots.find((x) => x.slotIndex === slot);
      const url = s?.trackUrl?.trim() ?? "";
      if (url) forge.playSfxUrl(url);
      return;
    }
    case "audio.sfx_category_random": {
      const categoryId = str(payload.category_id);
      if (categoryId) forge.playSfxRandom(categoryId);
      return;
    }
    case "audio.music_play_global_catalog": {
      const globalTrackId = str(payload.global_track_id);
      if (globalTrackId) forge.playGlobalCatalogMusicByTrackId(globalTrackId, str(payload.title) ?? undefined);
      return;
    }
    case "audio.spotify_playlist_select": {
      const playlistId = str(payload.playlist_id);
      if (!playlistId || !/^[a-zA-Z0-9]{10,50}$/.test(playlistId)) return;
      forge.stopMusic();
      window.dispatchEvent(new CustomEvent(GM_AUDIO_SPOTIFY_REMOTE_SELECT_EVENT, { detail: playlistId }));
      return;
    }
    case "audio.spotify_play_pause":
      window.dispatchEvent(new Event(GM_AUDIO_SPOTIFY_REMOTE_TOGGLE_EVENT));
      return;
    case "audio.stop_all":
      forge.stopAll();
      return;
    default:
      return;
  }
}
