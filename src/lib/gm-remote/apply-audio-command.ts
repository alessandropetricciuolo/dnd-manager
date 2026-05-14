import type { GmAudioForgeControls } from "@/lib/gm-audio-forge/use-gm-audio-forge";

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
    case "audio.spotify_select_playlist":
      // gestito in GmRemoteCommandBridge
      return;
    case "audio.music_play_global_catalog": {
      const globalTrackId = str(payload.global_track_id);
      if (globalTrackId) forge.playGlobalCatalogMusicByTrackId(globalTrackId);
      return;
    }
    case "audio.stop_all":
      forge.stopAll();
      return;
    default:
      return;
  }
}
