import test from "node:test";
import assert from "node:assert/strict";
import {
  computeTeamStandings,
  finalistCharacterIds,
  winningTeamIds,
} from "@/lib/torneo2/standings";
import type { Torneo2Match, Torneo2Team } from "@/lib/torneo2/types";

function team(id: string, members: string[]): Torneo2Team {
  return {
    id,
    campaignId: "c",
    name: `Squadra ${id}`,
    color: "#fff",
    sortOrder: 0,
    members: members.map((cid, i) => ({
      id: `${id}-m${i}`,
      characterId: cid,
      name: `PG ${cid}`,
      characterClass: null,
      classSubclass: null,
      level: 1,
      armorClass: 12,
      hitPoints: 20,
      imageUrl: null,
      rulesSnapshot: null,
    })),
  };
}

function match(over: Partial<Torneo2Match>): Torneo2Match {
  return {
    id: "m",
    campaignId: "c",
    label: null,
    sortOrder: 0,
    kind: "team",
    status: "pending",
    teamAId: null,
    teamBId: null,
    timerMode: "turn",
    turnSeconds: 120,
    matchSeconds: null,
    timerRunning: false,
    timerStartedAt: null,
    timerPausedElapsedMs: 0,
    timerLabel: null,
    combatState: null,
    combatSeq: 0,
    combatOrigin: null,
    combatUpdatedAt: null,
    winnerTeamId: null,
    winnerCharacterId: null,
    completedAt: null,
    notes: null,
    bracketRound: null,
    bracketPosition: 0,
    roundLabel: null,
    feedsMatchId: null,
    feedsSlot: null,
    ...over,
  };
}

test("winningTeamIds considera solo incontri squadra completati con vincitore", () => {
  const matches = [
    match({ id: "1", teamAId: "A", teamBId: "B", status: "completed", winnerTeamId: "A" }),
    match({ id: "2", teamAId: "C", teamBId: "D", status: "active", winnerTeamId: null }),
    match({ id: "3", teamAId: "C", teamBId: "D", status: "completed", winnerTeamId: "D" }),
    match({ id: "4", kind: "final_ffa", status: "completed", winnerCharacterId: "z" }),
  ];
  assert.deepEqual(winningTeamIds(matches).sort(), ["A", "D"]);
});

test("finalistCharacterIds raccoglie i PG delle squadre vincitrici", () => {
  const teams = [team("A", ["a1", "a2"]), team("B", ["b1"]), team("D", ["d1", "d2"])];
  const matches = [
    match({ id: "1", teamAId: "A", teamBId: "B", status: "completed", winnerTeamId: "A" }),
    match({ id: "2", teamAId: "B", teamBId: "D", status: "completed", winnerTeamId: "D" }),
  ];
  assert.deepEqual(finalistCharacterIds(matches, teams).sort(), ["a1", "a2", "d1", "d2"]);
});

test("computeTeamStandings calcola vittorie e sconfitte", () => {
  const teams = [team("A", []), team("B", []), team("C", [])];
  const matches = [
    match({ id: "1", teamAId: "A", teamBId: "B", status: "completed", winnerTeamId: "A" }),
    match({ id: "2", teamAId: "A", teamBId: "C", status: "completed", winnerTeamId: "A" }),
    match({ id: "3", teamAId: "B", teamBId: "C", status: "completed", winnerTeamId: "C" }),
  ];
  const standings = computeTeamStandings(matches, teams);
  const a = standings.find((s) => s.teamId === "A")!;
  const b = standings.find((s) => s.teamId === "B")!;
  const c = standings.find((s) => s.teamId === "C")!;
  assert.equal(a.wins, 2);
  assert.equal(a.losses, 0);
  assert.equal(a.played, 2);
  assert.equal(b.wins, 0);
  assert.equal(b.losses, 2);
  assert.equal(c.wins, 1);
  assert.equal(c.losses, 1);
  // Classifica ordinata per vittorie.
  assert.equal(standings[0].teamId, "A");
});
