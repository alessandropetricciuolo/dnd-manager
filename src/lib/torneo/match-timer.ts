export type TorneoMatchTimerFields = {
  timer_duration_sec: number | null;
  timer_round_label: string | null;
  timer_started_at: string | null;
  timer_paused_at: string | null;
};

export type MatchTimerView = {
  durationSec: number;
  roundLabel: string;
  remainingSec: number;
  elapsedSec: number;
  isRunning: boolean;
  isPaused: boolean;
  isExpired: boolean;
};

export function computeMatchTimerView(
  fields: TorneoMatchTimerFields,
  nowMs: number = Date.now()
): MatchTimerView {
  const durationSec = Math.max(0, fields.timer_duration_sec ?? 0);
  const roundLabel = (fields.timer_round_label ?? "").trim() || "Round";
  const startedAt = fields.timer_started_at ? Date.parse(fields.timer_started_at) : NaN;
  const pausedAt = fields.timer_paused_at ? Date.parse(fields.timer_paused_at) : NaN;

  const hasStarted = Number.isFinite(startedAt);
  const isPaused = hasStarted && Number.isFinite(pausedAt);
  const isRunning = hasStarted && !isPaused;

  let elapsedSec = 0;
  if (hasStarted) {
    const endMs = isPaused ? pausedAt : nowMs;
    elapsedSec = Math.max(0, Math.floor((endMs - startedAt) / 1000));
  }

  const remainingSec = Math.max(0, durationSec - elapsedSec);
  const isExpired = hasStarted && durationSec > 0 && remainingSec <= 0;

  return {
    durationSec,
    roundLabel,
    remainingSec,
    elapsedSec,
    isRunning,
    isPaused,
    isExpired,
  };
}

export function formatTimerMmSs(totalSec: number): string {
  const s = Math.max(0, Math.trunc(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
