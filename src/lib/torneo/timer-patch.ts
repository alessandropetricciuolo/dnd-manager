import type { TorneoMatchTimerPayload } from "@/app/campaigns/torneo-live-actions";

export const DEFAULT_MATCH_TIMER_SEC = 300;

export function buildTimerStartPatch(
  durationSec = DEFAULT_MATCH_TIMER_SEC,
  roundLabel = "Round 1"
): TorneoMatchTimerPayload {
  return {
    timer_duration_sec: durationSec,
    timer_round_label: roundLabel,
    timer_started_at: new Date().toISOString(),
    timer_paused_at: null,
  };
}

export function buildTimerPausePatch(
  fields: TorneoMatchTimerPayload,
  nowMs = Date.now()
): TorneoMatchTimerPayload {
  if (!fields.timer_started_at || fields.timer_paused_at) return fields;
  return { ...fields, timer_paused_at: new Date(nowMs).toISOString() };
}

export function buildTimerResumePatch(fields: TorneoMatchTimerPayload): TorneoMatchTimerPayload {
  if (!fields.timer_started_at || !fields.timer_paused_at) return fields;
  const started = Date.parse(fields.timer_started_at);
  const paused = Date.parse(fields.timer_paused_at);
  if (!Number.isFinite(started) || !Number.isFinite(paused)) return fields;
  const shiftMs = Date.now() - paused;
  return {
    ...fields,
    timer_started_at: new Date(started + shiftMs).toISOString(),
    timer_paused_at: null,
  };
}

export function buildTimerResetPatch(
  durationSec = DEFAULT_MATCH_TIMER_SEC,
  roundLabel = "Round 1"
): TorneoMatchTimerPayload {
  return {
    timer_duration_sec: durationSec,
    timer_round_label: roundLabel,
    timer_started_at: null,
    timer_paused_at: null,
  };
}
