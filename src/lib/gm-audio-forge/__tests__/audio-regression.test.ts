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
