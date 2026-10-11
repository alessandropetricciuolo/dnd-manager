"use client";

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === "suspended") {
    void sharedAudioCtx.resume();
  }
  return sharedAudioCtx;
}

/**
 * Sintetizza un rintocco di campana molto grave (campana da cattedrale medievale / cupo rintocco in bronzo).
 * Frequenza fondamentale a 65.4 Hz (C2) e 110 Hz (A2) con parziali armonici in decadimento naturale di 4.5 secondi.
 */
export function playDeepBellSound(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    // Struttura acustica di una grande campana di bronzo (fondamentale ultra-grave, sub-basso, terze e quinte)
    const bellPartials: Array<{
      freq: number;
      gain: number;
      decay: number;
      type: OscillatorType;
    }> = [
      { freq: 65.41, gain: 0.65, decay: 5.0, type: "sine" },     // Sub-bass Hum profondo e cavernoso (C2)
      { freq: 110.0, gain: 0.55, decay: 4.5, type: "sine" },     // Fondamentale tonale (A2)
      { freq: 130.81, gain: 0.35, decay: 3.8, type: "sine" },    // Terza minore metallica (C3)
      { freq: 164.81, gain: 0.28, decay: 3.2, type: "triangle" },// Quinta (E3)
      { freq: 220.0, gain: 0.22, decay: 2.6, type: "sine" },     // Ottava nominale (A3)
      { freq: 330.0, gain: 0.15, decay: 1.8, type: "triangle" }, // Overtone brillante (E4)
      { freq: 554.37, gain: 0.12, decay: 1.0, type: "sine" },    // Attacco metallico del battaglio
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, now);
    masterGain.connect(ctx.destination);

    for (const p of bellPartials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = p.type;
      osc.frequency.setValueAtTime(p.freq, now);

      // Attacco percussivo quasi istantaneo del battaglio (4 millisecondi)
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(p.gain, now + 0.004);

      // Decadimento esponenziale profondo e naturale che sfuma dolcemente nel silenzio
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(now + p.decay);
    }
  } catch (err) {
    console.warn("[playDeepBellSound] Impossibile riprodurre il suono:", err);
  }
}
