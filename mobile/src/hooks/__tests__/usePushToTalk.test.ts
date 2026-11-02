import test from 'node:test';
import assert from 'node:assert/strict';
import type { ExpoSpeechRecognitionNativeEventMap } from 'expo-speech-recognition';
import { finalTranscriptFromResultEvent, shouldCancelVoiceOnAppStateChange } from '../usePushToTalk';

test('native final result event is read from the official isFinal/results shape', () => {
  const event: ExpoSpeechRecognitionNativeEventMap['result'] = {
    isFinal: true,
    results: [{ transcript: 'Goblin 1 subisce otto danni', confidence: 0.98, segments: [] }],
  };
  assert.equal(finalTranscriptFromResultEvent(event), 'Goblin 1 subisce otto danni');
});

test('partial or empty recognition events never enter the editable final text', () => {
  const partial: ExpoSpeechRecognitionNativeEventMap['result'] = {
    isFinal: false,
    results: [{ transcript: 'Goblin', confidence: 0, segments: [] }],
  };
  const empty: ExpoSpeechRecognitionNativeEventMap['result'] = { isFinal: true, results: [] };
  assert.equal(finalTranscriptFromResultEvent(partial), null);
  assert.equal(finalTranscriptFromResultEvent(empty), null);
});


test('Android permission activity does not cancel a pending microphone permission request', () => {
  assert.equal(shouldCancelVoiceOnAppStateChange('requesting', 'background'), false);
  assert.equal(shouldCancelVoiceOnAppStateChange('requesting', 'inactive'), false);
});

test('capture is cancelled when the app leaves foreground, but not on return', () => {
  for (const state of ['starting', 'listening', 'stopping'] as const) {
    assert.equal(shouldCancelVoiceOnAppStateChange(state, 'background'), true);
    assert.equal(shouldCancelVoiceOnAppStateChange(state, 'active'), false);
  }
  assert.equal(shouldCancelVoiceOnAppStateChange('idle', 'background'), false);
});
