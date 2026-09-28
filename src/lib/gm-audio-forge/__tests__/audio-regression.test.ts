import assert from "node:assert/strict";
import test from "node:test";
import { parseGmAudioForgeLibrary } from "../storage";
import { applyRemoteAudioCommand } from "@/lib/gm-remote/apply-audio-command";
import type { GmAudioForgeControls } from "../use-gm-audio-forge";

test("la libreria locale v1 conserva le categorie durante la migrazione al formato condiviso", () => {
  const migrated = parseGmAudioForgeLibrary({
    version: 1,
    categories: [{
      id: "music-1", name: "Combattimento", kind: "music", tracks: [
        { id: "track-1", label: "Scontro", url: "https://example.com/scontro.mp3" },
      ],
    }],
  });
  assert.equal(migrated?.version, 2);
  assert.equal(migrated?.categories[0]?.tracks[0]?.label, "Scontro");
  assert.equal(migrated?.sfxPad.slots.length, 12);
});

test("il telecomando mantiene titolo del brano e stop globale sul PC", () => {
  const calls: string[] = [];
  const forge = {
    playGlobalCatalogMusicByTrackId: (id: string, title?: string) => calls.push(`${id}:${title}`),
    stopAll: () => calls.push("stop"),
  } as unknown as GmAudioForgeControls;
  applyRemoteAudioCommand(forge, "audio.music_play_global_catalog", { global_track_id: "track-1", title: "Scontro" });
  applyRemoteAudioCommand(forge, "audio.stop_all", {});
  assert.deepEqual(calls, ["track-1:Scontro", "stop"]);
});

test("il pad conserva atmosfere e SFX e il telecomando usa il canale corretto", () => {
  const parsed = parseGmAudioForgeLibrary({
    version: 2,
    categories: [],
    sfxPad: { slots: [
      { slotIndex: 0, iconKey: "Wind", etichetta: "Pioggia", trackUrl: "/pioggia.mp3", trackKind: "atmosphere", libraryRef: "cat-1|track-1" },
      { slotIndex: 1, iconKey: "Zap", etichetta: "Tuono", trackUrl: "/tuono.mp3" },
    ] },
  });
  assert.equal(parsed?.sfxPad.slots[0]?.trackKind, "atmosphere");
  const calls: string[] = [];
  const forge = {
    library: parsed,
    togglePadAtmosphere: (categoryId: string, trackId: string) => calls.push(`atmos:${categoryId}:${trackId}`),
    playSfxUrl: (url: string) => calls.push(`sfx:${url}`),
  } as unknown as GmAudioForgeControls;
  applyRemoteAudioCommand(forge, "audio.sfx_pad_slot", { slot_index: 0 });
  applyRemoteAudioCommand(forge, "audio.sfx_pad_slot", { slot_index: 1 });
  assert.deepEqual(calls, ["atmos:cat-1:track-1", "sfx:/tuono.mp3"]);
});
