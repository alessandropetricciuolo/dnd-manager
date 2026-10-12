import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTurnTimerState, startTurnTimer, pauseTurnTimer, setTurnTimerDuration } from "../turn-timer";

test("countdown advances without a mounted view and resumes from the remaining time", () => {
  const originalNow = Date.now;
  let now = 100_000;
  Date.now = () => now;
  try {
    const id = "test-unmounted-countdown";
    setTurnTimerDuration(id, 30);
    startTurnTimer(id);
    now += 12_000;
    assert.equal(loadTurnTimerState(id).remainingSeconds, 18);
    pauseTurnTimer(id);
    now += 60_000;
    assert.equal(loadTurnTimerState(id).remainingSeconds, 18);
    startTurnTimer(id);
    now += 18_000;
    assert.equal(loadTurnTimerState(id).remainingSeconds, 0);
  } finally {
    Date.now = originalNow;
  }
});

test("a paused expired timer reloads as zero rather than resetting the duration", () => {
  const originalWindow = globalThis.window;
  const originalStorage = globalThis.localStorage;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: () => JSON.stringify({ isRunning: false, endsAt: null, remainingSeconds: 0, durationSeconds: 30 }),
  } });
  try {
    assert.equal(loadTurnTimerState("test-paused-zero-from-storage").remainingSeconds, 0);
  } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalStorage });
  }
});
