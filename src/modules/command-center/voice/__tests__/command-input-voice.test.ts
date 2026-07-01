import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCommandInputFromVoice,
  mergeTranscriptSegments,
  normalizeVoiceTranscript,
} from "@/modules/command-center/voice/command-input-voice";

test("normalizeVoiceTranscript collapses whitespace", () => {
  assert.equal(normalizeVoiceTranscript("  ciao   mondo  "), "ciao mondo");
});

test("mergeTranscriptSegments joins finals", () => {
  assert.equal(mergeTranscriptSegments(["Crea", "un task"]), "Crea un task");
});

test("buildCommandInputFromVoice sets voice source and metadata", () => {
  const payload = buildCommandInputFromVoice("Nuova oneshot", { durationMs: 1200 });
  assert.equal(payload.source, "voice");
  assert.equal(payload.rawContent, "Nuova oneshot");
  assert.equal(payload.transcript, "Nuova oneshot");
  assert.equal(payload.metadata?.engine, "web_speech_api");
  assert.equal(payload.metadata?.durationMs, 1200);
});
