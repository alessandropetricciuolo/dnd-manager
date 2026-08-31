import test from "node:test";
import assert from "node:assert/strict";
import { torneo2StationForMatch, type Torneo2RemoteLiveRow } from "@/lib/torneo2/remote-session";

const live: Torneo2RemoteLiveRow = {
  station1_match_id: "match-1",
  station2_match_id: "match-2",
  remote_session_public_id: "remote-1",
};

test("torneo2StationForMatch riconosce solo gli incontri sui tavoli live", () => {
  assert.equal(torneo2StationForMatch(live, "match-1"), 1);
  assert.equal(torneo2StationForMatch(live, "match-2"), 2);
  assert.equal(torneo2StationForMatch(live, "archived-match"), null);
  assert.equal(torneo2StationForMatch(live, ""), null);
});
