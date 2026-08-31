import test from "node:test";
import assert from "node:assert/strict";
import { torneo2EndMatchPatch } from "@/lib/torneo2/match-lifecycle";

test("end-match patch resets active matches to pending and stops the timer", () => {
  assert.deepEqual(torneo2EndMatchPatch(), {
    status: "pending",
    timer_running: false,
    timer_started_at: null,
    timer_paused_elapsed_ms: 0,
    timer_label: null,
  });
});
