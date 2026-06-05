export type Torneo2TimerMode = "turn" | "match" | "both" | "none";

export type Torneo2TimerState = {
  timer_mode: Torneo2TimerMode;
  turn_seconds: number;
  match_seconds: number | null;
  timer_running: boolean;
  timer_started_at: string | null;
  timer_paused_elapsed_ms: number;
  timer_label: string | null;
};

export type Torneo2TimerColumns = Pick<
  Torneo2TimerState,
  | "timer_mode"
  | "turn_seconds"
  | "match_seconds"
  | "timer_running"
  | "timer_started_at"
  | "timer_paused_elapsed_ms"
  | "timer_label"
>;

export type Torneo2TimerView = {
  mode: Torneo2TimerMode;
  durationSec: number;
  remainingSec: number;
  elapsedSec: number;
  running: boolean;
  expired: boolean;
  label: string | null;
};

export const TORNEO2_DEFAULT_TURN_SECONDS = 120;

export function emptyTorneo2TimerState(): Torneo2TimerState {
  return {
    timer_mode: "turn",
    turn_seconds: TORNEO2_DEFAULT_TURN_SECONDS,
    match_seconds: null,
    timer_running: false,
    timer_started_at: null,
    timer_paused_elapsed_ms: 0,
    timer_label: null,
  };
}

/** Durata del countdown primario in base alla modalità. */
export function primaryDurationSec(state: Pick<Torneo2TimerState, "timer_mode" | "turn_seconds" | "match_seconds">): number {
  if (state.timer_mode === "match" && state.match_seconds && state.match_seconds > 0) {
    return state.match_seconds;
  }
  return state.turn_seconds > 0 ? state.turn_seconds : TORNEO2_DEFAULT_TURN_SECONDS;
}

/** Millisecondi trascorsi nel segmento corrente, tenendo conto di pausa. */
function elapsedMs(state: Torneo2TimerState, nowMs: number): number {
  const base = Math.max(0, state.timer_paused_elapsed_ms);
  if (state.timer_running && state.timer_started_at) {
    const started = Date.parse(state.timer_started_at);
    if (Number.isFinite(started)) {
      return base + Math.max(0, nowMs - started);
    }
  }
  return base;
}

/** Vista timer calcolata localmente: nessun tick proveniente dalla rete. */
export function computeTorneo2TimerView(state: Torneo2TimerState, nowMs: number): Torneo2TimerView {
  const durationSec = primaryDurationSec(state);
  const elapsed = elapsedMs(state, nowMs);
  const elapsedSec = Math.floor(elapsed / 1000);
  const remainingSec = Math.max(0, durationSec - elapsedSec);
  return {
    mode: state.timer_mode,
    durationSec,
    remainingSec,
    elapsedSec,
    running: state.timer_running && remainingSec > 0,
    expired: durationSec > 0 && remainingSec <= 0,
    label: state.timer_label,
  };
}

export type Torneo2TimerPatch = Partial<
  Pick<
    Torneo2TimerState,
    | "timer_mode"
    | "turn_seconds"
    | "match_seconds"
    | "timer_running"
    | "timer_started_at"
    | "timer_paused_elapsed_ms"
    | "timer_label"
  >
>;

/** Avvia/riavvia il countdown da zero (nuovo turno o nuovo incontro). */
export function startTimerPatch(label: string | null, nowIso: string): Torneo2TimerPatch {
  return {
    timer_running: true,
    timer_started_at: nowIso,
    timer_paused_elapsed_ms: 0,
    timer_label: label,
  };
}

/**
 * Prepara il countdown a tempo pieno ma in PAUSA: il GM lo fa partire manualmente.
 * Usato all'avvio incontro e a ogni cambio turno per non far partire il timer da solo.
 */
export function primeTimerPatch(label: string | null): Torneo2TimerPatch {
  return {
    timer_running: false,
    timer_started_at: null,
    timer_paused_elapsed_ms: 0,
    timer_label: label,
  };
}

/** Mette in pausa: congela l'elapsed corrente. */
export function pauseTimerPatch(state: Torneo2TimerState, nowMs: number): Torneo2TimerPatch {
  return {
    timer_running: false,
    timer_started_at: null,
    timer_paused_elapsed_ms: elapsedMs(state, nowMs),
  };
}

/** Riprende dopo la pausa: riparte da started_at mantenendo l'elapsed accumulato. */
export function resumeTimerPatch(state: Torneo2TimerState, nowIso: string): Torneo2TimerPatch {
  return {
    timer_running: true,
    timer_started_at: nowIso,
    timer_paused_elapsed_ms: Math.max(0, state.timer_paused_elapsed_ms),
  };
}

/** Toggle pausa/ripresa. */
export function togglePauseTimerPatch(state: Torneo2TimerState, nowMs: number, nowIso: string): Torneo2TimerPatch {
  return state.timer_running ? pauseTimerPatch(state, nowMs) : resumeTimerPatch(state, nowIso);
}

/** Ferma e azzera il timer. */
export function stopTimerPatch(): Torneo2TimerPatch {
  return {
    timer_running: false,
    timer_started_at: null,
    timer_paused_elapsed_ms: 0,
    timer_label: null,
  };
}

export function formatTorneo2Time(totalSeconds: number): string {
  const safe = Math.max(0, Math.trunc(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
