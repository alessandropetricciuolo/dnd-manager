import test from "node:test";
import assert from "node:assert/strict";
import {
  canTorneo2RemoteMutateMatch,
  getTorneo2RemoteStationForMatch,
} from "@/lib/torneo2/remote-access";

test("remote writes are allowed only for active station matches", () => {
  const live = { station1_match_id: "match-a", station2_match_id: "match-b" };

  assert.equal(canTorneo2RemoteMutateMatch(live, { id: "match-a", status: "active" }), true);
  assert.equal(canTorneo2RemoteMutateMatch(live, { id: "match-b", status: "active" }), true);
  assert.equal(canTorneo2RemoteMutateMatch(live, { id: "match-c", status: "active" }), false);
  assert.equal(canTorneo2RemoteMutateMatch(live, { id: "match-a", status: "pending" }), false);
  assert.equal(canTorneo2RemoteMutateMatch(live, { id: "match-a", status: "completed" }), false);
  assert.equal(canTorneo2RemoteMutateMatch(null, { id: "match-a", status: "active" }), false);
});

test("remote station lookup distinguishes both live stations", () => {
  const live = { station1_match_id: "match-a", station2_match_id: "match-b" };

  assert.equal(getTorneo2RemoteStationForMatch(live, "match-a"), 1);
  assert.equal(getTorneo2RemoteStationForMatch(live, "match-b"), 2);
  assert.equal(getTorneo2RemoteStationForMatch(live, "match-c"), null);
});
