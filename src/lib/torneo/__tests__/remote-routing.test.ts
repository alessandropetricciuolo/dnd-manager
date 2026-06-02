import test from "node:test";
import assert from "node:assert/strict";
import { resolveRemoteInitiativeTarget } from "@/lib/gm-remote/initiative-target";
import { selectTorneoRemotePublicationTarget } from "@/lib/torneo/remote-publication";

test("selectTorneoRemotePublicationTarget does not publish an unloaded focused match", () => {
  const target = selectTorneoRemotePublicationTarget({
    focusedRemoteMatchId: "match-c",
    station1MatchId: "match-a",
    station2MatchId: "match-b",
  });

  assert.deepEqual(target, { matchId: null, station: null });
});

test("selectTorneoRemotePublicationTarget selects the matching loaded station", () => {
  assert.deepEqual(
    selectTorneoRemotePublicationTarget({
      focusedRemoteMatchId: "match-b",
      station1MatchId: "match-a",
      station2MatchId: "match-b",
    }),
    { matchId: "match-b", station: 2 }
  );
  assert.deepEqual(
    selectTorneoRemotePublicationTarget({
      focusedRemoteMatchId: null,
      station1MatchId: "match-a",
      station2MatchId: "match-b",
    }),
    { matchId: "match-a", station: 1 }
  );
});

test("resolveRemoteInitiativeTarget ignores commands for an unloaded match id", () => {
  const station1 = { id: "station-1" };
  const station2 = { id: "station-2" };

  const target = resolveRemoteInitiativeTarget({
    payloadMatchId: "match-c",
    station1MatchId: "match-a",
    station2MatchId: "match-b",
    station1,
    station2,
  });

  assert.equal(target, null);
});

test("resolveRemoteInitiativeTarget falls back only when command has no match id", () => {
  const station1 = { id: "station-1" };
  const station2 = { id: "station-2" };

  assert.equal(
    resolveRemoteInitiativeTarget({
      payloadMatchId: undefined,
      station1MatchId: "match-a",
      station2MatchId: "match-b",
      station1,
      station2,
    }),
    station1
  );
  assert.equal(
    resolveRemoteInitiativeTarget({
      payloadMatchId: "match-b",
      station1MatchId: "match-a",
      station2MatchId: "match-b",
      station1,
      station2,
    }),
    station2
  );
});
