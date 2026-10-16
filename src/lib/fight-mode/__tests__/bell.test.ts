import test from "node:test";
import assert from "node:assert/strict";
import { BELL_C2_PARTIALS, playDeepBellSound } from "../bell";

test("BELL_C2_PARTIALS: la nota fondamentale equivale al Do2 del pianoforte (65.41 Hz)", () => {
  const fundamental = BELL_C2_PARTIALS[0];
  assert.ok(fundamental, "La lista parziali non deve essere vuota");
  // Do2 standard pianoforte = 65.4064 Hz ≈ 65.41 Hz
  assert.equal(fundamental.freq, 65.41);
  assert.equal(fundamental.type, "sine");
});

test("BELL_C2_PARTIALS: tutte le armoniche e gli overtoni appartengono alla campana in Do (nessuna nota La o Do#)", () => {
  const allowedFrequencies = [
    65.41,   // Do2 (hum sub-bass)
    130.81,  // Do3 (prime fondamentale)
    155.56,  // Mib3 (tierce minore campana)
    196.00,  // Sol3 (quinta)
    261.63,  // Do4 (ottava nominale)
    311.13,  // Mib4 (decima minore)
    392.00,  // Sol4 (dodicesima)
    523.25,  // Do5 (doppia ottava)
    1046.50, // Do6 (battaglio)
  ];

  for (const p of BELL_C2_PARTIALS) {
    assert.ok(
      allowedFrequencies.includes(p.freq),
      `Frequenza inattesa: ${p.freq} Hz non corrisponde all'accordo di campana in Do`
    );
    // Verifica assenza di note discordanti della vecchia versione (La 110/220 Hz, Do# 554 Hz)
    assert.notEqual(p.freq, 110.0, "Non deve contenere La2 (110 Hz)");
    assert.notEqual(p.freq, 220.0, "Non deve contenere La3 (220 Hz)");
    assert.notEqual(p.freq, 554.37, "Non deve contenere Do#5 (554.37 Hz)");
  }
});

test("playDeepBellSound: gestisce SSR o assenza di AudioContext senza sollevare errori", () => {
  assert.doesNotThrow(() => {
    playDeepBellSound();
  });
});

test("playDeepBellSound: sintetizza esattamente 2 rintocchi distanziati con mock AudioContext", () => {
  const scheduledOscillators: Array<{
    freq: number;
    startTime: number;
    stopTime: number;
    type: OscillatorType;
  }> = [];

  class MockGainNode {
    gain = {
      setValueAtTime: () => {},
      linearRampToValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    };
    connect() {}
  }

  class MockCompressorNode {
    threshold = { setValueAtTime: () => {} };
    knee = { setValueAtTime: () => {} };
    ratio = { setValueAtTime: () => {} };
    attack = { setValueAtTime: () => {} };
    release = { setValueAtTime: () => {} };
    connect() {}
  }

  class MockOscillatorNode {
    type: OscillatorType = "sine";
    frequency = {
      value: 0,
      setValueAtTime: (val: number) => {
        this.frequency.value = val;
      },
    };
    private _startTime = 0;
    connect() {}
    start(t: number) {
      this._startTime = t;
    }
    stop(t: number) {
      scheduledOscillators.push({
        freq: this.frequency.value,
        startTime: this._startTime,
        stopTime: t,
        type: this.type,
      });
    }
  }

  class MockAudioContext {
    currentTime = 10.0;
    state: AudioContextState = "running";
    destination = {};
    createGain() {
      return new MockGainNode();
    }
    createOscillator() {
      return new MockOscillatorNode();
    }
    createDynamicsCompressor() {
      return new MockCompressorNode();
    }
    resume() {
      return Promise.resolve();
    }
  }

  // Inject mock window & AudioContext
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  (globalThis as unknown as { window: unknown }).window = {
    AudioContext: MockAudioContext,
  };

  try {
    playDeepBellSound({ force: true });

    // 9 parziali * 2 rintocchi = 18 oscillatori
    assert.equal(scheduledOscillators.length, BELL_C2_PARTIALS.length * 2);

    // 1° rintocco parte al tempo corrente (10.0)
    const toll1 = scheduledOscillators.filter((o) => Math.abs(o.startTime - 10.0) < 0.001);
    assert.equal(toll1.length, BELL_C2_PARTIALS.length, "Il primo rintocco deve contenere tutti i parziali");

    // 2° rintocco parte a 10.0 + 1.35 = 11.35
    const toll2 = scheduledOscillators.filter((o) => Math.abs(o.startTime - 11.35) < 0.001);
    assert.equal(toll2.length, BELL_C2_PARTIALS.length, "Il secondo rintocco deve contenere tutti i parziali a 1.35s");

    // Entrambi i rintocchi hanno come fondamentale C2 (65.41 Hz)
    assert.equal(toll1[0]?.freq, 65.41);
    assert.equal(toll2[0]?.freq, 65.41);
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as unknown as { window?: unknown }).window;
    } else {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    }
  }
});
