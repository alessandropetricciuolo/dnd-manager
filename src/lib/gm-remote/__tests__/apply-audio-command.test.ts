import assert from "node:assert/strict";
import test from "node:test";
import { applyRemoteAudioCommand } from "../apply-audio-command";
import type { GmAudioForgeControls } from "@/lib/gm-audio-forge/use-gm-audio-forge";
import { GM_AUDIO_SPOTIFY_REMOTE_SELECT_EVENT } from "@/lib/gm-audio-forge/audio-events";

test("remote mixer commands reach the PC audio controls", () => {
  const values: number[] = [];
  const forge = {
    setMusicMaster: (value: number) => values.push(value),
    setAtmosMaster: (value: number) => values.push(value),
    setSfxMaster: (value: number) => values.push(value),
  } as unknown as GmAudioForgeControls;

  applyRemoteAudioCommand(forge, "audio.music_master_volume", { value: 0.4 });
  applyRemoteAudioCommand(forge, "audio.atmos_master_volume", { value: 0.6 });
  applyRemoteAudioCommand(forge, "audio.sfx_master_volume", { value: 0.8 });
  assert.deepEqual(values, [0.4, 0.6, 0.8]);
});

test("remote Spotify selection stops mixer music and selects a valid playlist", () => {
  const target = new EventTarget();
  Object.defineProperty(globalThis, "window", { value: target, configurable: true });
  const selected: string[] = [];
  target.addEventListener(GM_AUDIO_SPOTIFY_REMOTE_SELECT_EVENT, (event) => {
    selected.push((event as CustomEvent<string>).detail);
  });
  let stopped = 0;
  const forge = { stopMusic: () => { stopped += 1; } } as GmAudioForgeControls;

  applyRemoteAudioCommand(forge, "audio.spotify_playlist_select", { playlist_id: "37i9dQZF1DX0XUsuxWHRQd" });
  applyRemoteAudioCommand(forge, "audio.spotify_playlist_select", { playlist_id: "invalid" });
  assert.deepEqual(selected, ["37i9dQZF1DX0XUsuxWHRQd"]);
  assert.equal(stopped, 1);
  Reflect.deleteProperty(globalThis, "window");
});
