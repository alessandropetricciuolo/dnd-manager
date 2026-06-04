import test from "node:test";
import assert from "node:assert/strict";
import {
  computeTorneo2TimerView,
  emptyTorneo2TimerState,
  pauseTimerPatch,
  primaryDurationSec,
  resumeTimerPatch,
  startTimerPatch,
  stopTimerPatch,
  type Torneo2TimerState,
} from "@/lib/torneo2/timer";

test("primaryDurationSec usa turn_seconds in modalità turn", () => {
  const s = { ...emptyTorneo2TimerState(), timer_mode: "turn" as const, turn_seconds: 90 };
  assert.equal(primaryDurationSec(s), 90);
});

test("primaryDurationSec usa match_seconds in modalità match", () => {
  const s = {
    ...emptyTorneo2TimerState(),
    timer_mode: "match" as const,
    turn_seconds: 90,
    match_seconds: 600,
  };
  assert.equal(primaryDurationSec(s), 600);
});

test("computeTorneo2TimerView calcola il rimanente dal timestamp", () => {
  const startedMs = 1_000_000;
  const state: Torneo2TimerState = {
    ...emptyTorneo2TimerState(),
    timer_mode: "turn",
    turn_seconds: 120,
    timer_running: true,
    timer_started_at: new Date(startedMs).toISOString(),
    timer_paused_elapsed_ms: 0,
  };
  const view = computeTorneo2TimerView(state, startedMs + 30_000);
  assert.equal(view.remainingSec, 90);
  assert.equal(view.running, true);
  assert.equal(view.expired, false);
});

test("computeTorneo2TimerView va in expired a fine tempo", () => {
  const startedMs = 1_000_000;
  const state: Torneo2TimerState = {
    ...emptyTorneo2TimerState(),
    timer_mode: "turn",
    turn_seconds: 10,
    timer_running: true,
    timer_started_at: new Date(startedMs).toISOString(),
  };
  const view = computeTorneo2TimerView(state, startedMs + 15_000);
  assert.equal(view.remainingSec, 0);
  assert.equal(view.expired, true);
  assert.equal(view.running, false);
});

test("pausa congela l'elapsed e resume lo mantiene", () => {
  const startedMs = 1_000_000;
  const state: Torneo2TimerState = {
    ...emptyTorneo2TimerState(),
    timer_mode: "turn",
    turn_seconds: 120,
    timer_running: true,
    timer_started_at: new Date(startedMs).toISOString(),
    timer_paused_elapsed_ms: 0,
  };
  const pause = pauseTimerPatch(state, startedMs + 40_000);
  assert.equal(pause.timer_running, false);
  assert.equal(pause.timer_paused_elapsed_ms, 40_000);

  const paused: Torneo2TimerState = { ...state, ...pause } as Torneo2TimerState;
  // Dopo 1 minuto di pausa, riprende: l'elapsed resta 40s.
  const resumeMs = startedMs + 100_000;
  const resume = resumeTimerPatch(paused, new Date(resumeMs).toISOString());
  assert.equal(resume.timer_running, true);
  assert.equal(resume.timer_paused_elapsed_ms, 40_000);

  const resumed: Torneo2TimerState = { ...paused, ...resume } as Torneo2TimerState;
  const view = computeTorneo2TimerView(resumed, resumeMs + 10_000);
  // 40s (pausa) + 10s = 50s trascorsi → 70 rimanenti.
  assert.equal(view.remainingSec, 70);
});

test("startTimerPatch e stopTimerPatch azzerano correttamente", () => {
  const start = startTimerPatch("Turno 1", new Date().toISOString());
  assert.equal(start.timer_running, true);
  assert.equal(start.timer_paused_elapsed_ms, 0);
  assert.equal(start.timer_label, "Turno 1");

  const stop = stopTimerPatch();
  assert.equal(stop.timer_running, false);
  assert.equal(stop.timer_paused_elapsed_ms, 0);
  assert.equal(stop.timer_started_at, null);
});
