"use client";

let sharedAudioCtx: AudioContext | null = null;
let lastBellPlayedTimestamp = 0;
const BELL_DEBOUNCE_MS = 2500;

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
 * Struttura acustica di una grande campana in bronzo accordata sul Do2 (C2 del pianoforte = 65.41 Hz).
 * Parziali armonici naturali di campana:
 * - Hum note (sub-basso profondo): Do2 (65.41 Hz)
 * - Fondamentale / Prime: Do3 (130.81 Hz)
 * - Terza minore (Tierce tipica delle campane da cattedrale): Mib3 (155.56 Hz)
 * - Quinta (Quint): Sol3 (196.00 Hz)
 * - Ottava nominale (Nominal): Do4 (261.63 Hz)
 * - Decima minore (Decime): Mib4 (311.13 Hz)
 * - Dodicesima (Duodecime): Sol4 (392.00 Hz)
 * - Doppia ottava (Double octave): Do5 (523.25 Hz)
 * - Transiente percussivo battaglio: Do6 (1046.50 Hz)
 */
export const BELL_C2_PARTIALS: ReadonlyArray<{
  freq: number;
  gain: number;
  decay: number;
  type: OscillatorType;
}> = [
  { freq: 65.41, gain: 0.55, decay: 4.8, type: "sine" },     // Hum sub-basso profondo e cavernoso (Do2)
  { freq: 130.81, gain: 0.45, decay: 4.0, type: "sine" },    // Prime fondamentale tonale (Do3)
  { freq: 155.56, gain: 0.28, decay: 3.4, type: "sine" },    // Terza minore solenne da cattedrale (Mib3)
  { freq: 196.00, gain: 0.24, decay: 3.0, type: "triangle" },// Quinta risonante in bronzo (Sol3)
  { freq: 261.63, gain: 0.18, decay: 2.4, type: "sine" },    // Ottava nominale (Do4)
  { freq: 311.13, gain: 0.12, decay: 1.8, type: "triangle" },// Overtone brillante (Mib4)
  { freq: 392.00, gain: 0.10, decay: 1.5, type: "sine" },    // Quinta superiore (Sol4)
  { freq: 523.25, gain: 0.08, decay: 1.2, type: "sine" },    // Brillantezza metallica (Do5)
  { freq: 1046.50, gain: 0.14, decay: 0.09, type: "triangle" }, // Impatto percussivo secco del battaglio (Do6)
];

/**
 * Schedula un singolo rintocco di campana a partire da startTime.
 */
function scheduleBellToll(
  ctx: AudioContext,
  destination: AudioNode,
  startTime: number,
  volumeScale = 1.0
): void {
  for (const p of BELL_C2_PARTIALS) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = p.type;
    osc.frequency.setValueAtTime(p.freq, startTime);

    const peakGain = Math.max(0.0001, p.gain * volumeScale);

    // Attacco percussivo quasi istantaneo del battaglio (4 millisecondi)
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.004);

    // Decadimento esponenziale naturale che sfuma dolcemente nel silenzio
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + p.decay);

    osc.connect(gain);
    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + p.decay);
  }
}

/**
 * Sintetizza 2 rintocchi di campana solenni per il termine del timer.
 * Nota fondamentale: Do2 del pianoforte (65.41 Hz).
 * Intervallo tra i due rintocchi: 1.35 secondi.
 */
export function playDeepBellSound(options?: { force?: boolean }): void {
  try {
    const nowTime = Date.now();

    // Se non forzato, previene duplicati tra schede concorrenti (GM Screen e Fight Projection aperte insieme)
    if (!options?.force) {
      if (typeof sessionStorage !== "undefined") {
        try {
          const lastStored = Number(sessionStorage.getItem("bnd_last_bell_time") || "0");
          if (nowTime - lastStored < BELL_DEBOUNCE_MS) {
            return;
          }
          sessionStorage.setItem("bnd_last_bell_time", String(nowTime));
        } catch {
          // sessionStorage non accessibile: usa in-memory debounce
        }
      }
      if (nowTime - lastBellPlayedTimestamp < BELL_DEBOUNCE_MS) {
        return;
      }
    }
    lastBellPlayedTimestamp = nowTime;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    // Master gain con compressore per bilanciamento dinamico limpido senza distorsioni
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.85, now);

    let destinationNode: AudioNode = masterGain;
    try {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-6, now);
      compressor.knee.setValueAtTime(10, now);
      compressor.ratio.setValueAtTime(4, now);
      compressor.attack.setValueAtTime(0.003, now);
      compressor.release.setValueAtTime(0.25, now);

      masterGain.connect(compressor);
      compressor.connect(ctx.destination);
      destinationNode = masterGain;
    } catch {
      masterGain.connect(ctx.destination);
    }

    // 1° Rintocco: immediato
    scheduleBellToll(ctx, destinationNode, now, 1.0);

    // 2° Rintocco: dopo 1.35 secondi (cadenza classica campanile cattedrale)
    scheduleBellToll(ctx, destinationNode, now + 1.35, 0.95);
  } catch (err) {
    console.warn("[playDeepBellSound] Impossibile riprodurre il suono:", err);
  }
}

