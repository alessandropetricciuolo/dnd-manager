import assert from "node:assert/strict";
import test from "node:test";
import { selectTorneoPublishTarget } from "@/lib/torneo/publish-target";

test("selectTorneoPublishTarget uses table 1 when no remote focus is set", () => {
  const target = selectTorneoPublishTarget({
    focusedMatchId: null,
    station1MatchId: "match-1",
    station1State: "state-1",
    station1Scoreboard: "score-1",
    station2MatchId: "match-2",
    station2State: "state-2",
    station2Scoreboard: "score-2",
  });

  assert.deepEqual(target, {
    matchId: "match-1",
    state: "state-1",
    scoreboard: "score-1",
  });
});

test("selectTorneoPublishTarget uses the focused loaded table", () => {
  const target = selectTorneoPublishTarget({
    focusedMatchId: "match-2",
    station1MatchId: "match-1",
    station1State: "state-1",
    station1Scoreboard: "score-1",
    station2MatchId: "match-2",
    station2State: "state-2",
    station2Scoreboard: "score-2",
  });

  assert.deepEqual(target, {
    matchId: "match-2",
    state: "state-2",
    scoreboard: "score-2",
  });
});

test("selectTorneoPublishTarget does not fall back when focus is not loaded", () => {
  const target = selectTorneoPublishTarget({
    focusedMatchId: "match-3",
    station1MatchId: "match-1",
    station1State: "state-1",
    station1Scoreboard: "score-1",
    station2MatchId: "match-2",
    station2State: "state-2",
    station2Scoreboard: "score-2",
  });

  assert.equal(target, null);
});
