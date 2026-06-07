export function torneo2EndMatchPatch() {
  return {
    status: "pending",
    timer_running: false,
    timer_started_at: null,
    timer_paused_elapsed_ms: 0,
    timer_label: null,
  } as const;
}
