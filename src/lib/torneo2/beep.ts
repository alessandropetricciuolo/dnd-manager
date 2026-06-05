"use client";

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  if (sharedCtx.state === "suspended") void sharedCtx.resume();
  return sharedCtx;
}

/**
 * Segnale acustico (tripla nota) da riprodurre quando scade il tempo.
 * Richiede una precedente interazione utente sul documento per la policy autoplay;
 * fallisce silenziosamente se l'audio non è disponibile.
 */
export function playTimerExpiredBeep(): void {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      const start = now + i * 0.28;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.26);
    }
  } catch {
    // audio non disponibile: ignora
  }
}
