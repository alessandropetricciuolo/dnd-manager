import test from "node:test";
import assert from "node:assert/strict";
import {
  getTorneo2LiveStationForMatch,
  getTorneo2LiveStationMatchIds,
} from "@/lib/torneo2/live-stations";

test("getTorneo2LiveStationForMatch only returns active station matches", () => {
  const live = { station1_match_id: "match-a", station2_match_id: "match-b" };

  assert.equal(getTorneo2LiveStationForMatch(live, "match-a"), 1);
  assert.equal(getTorneo2LiveStationForMatch(live, "match-b"), 2);
  assert.equal(getTorneo2LiveStationForMatch(live, "match-c"), null);
  assert.equal(getTorneo2LiveStationForMatch(null, "match-a"), null);
});

test("getTorneo2LiveStationMatchIds omits empty station slots", () => {
  assert.deepEqual(getTorneo2LiveStationMatchIds({ station1_match_id: "match-a", station2_match_id: null }), [
    "match-a",
  ]);
  assert.deepEqual(getTorneo2LiveStationMatchIds(null), []);
});
