import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultSfxPad } from "@/lib/gm-audio-forge/types";
import { parseSfxPadRemoteSnapshot, toSfxPadRemoteSnapshot } from "../sfx-pad-snapshot";

test("remote pad marks configured slots without exposing their audio URLs", () => {
  const pad = createDefaultSfxPad();
  pad.slots[0]!.trackUrl = "https://example.com/bell.mp3";
  const snapshot = toSfxPadRemoteSnapshot(pad);

  assert.equal(snapshot.slots[0]?.configured, true);
  assert.equal(snapshot.slots[1]?.configured, false);
  assert.equal(JSON.stringify(snapshot).includes("bell.mp3"), false);
  assert.equal(parseSfxPadRemoteSnapshot(snapshot)?.slots[0]?.configured, true);
});
