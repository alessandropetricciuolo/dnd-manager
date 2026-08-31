import assert from "node:assert/strict";
import test from "node:test";
import { emptyInitiativeTrackerState } from "@/components/gm/initiative-tracker";
import { resolveTorneoCompletionDamageTotals } from "@/lib/torneo/complete-match-damage";

const match = {
  team_a_id: "team-a",
  team_b_id: "team-b",
};

const snapshot = {
  ...emptyInitiativeTrackerState(),
  entries: [
    {
      id: "a1",
      name: "A",
      type: "pc" as const,
      playerId: "char-a",
      armorClass: 10,
      hp: 10,
      maxHp: 10,
      initiative: 12,
      teamId: "team-a",
      damageDealt: 17,
    },
    {
      id: "b1",
      name: "B",
      type: "pc" as const,
      playerId: "char-b",
      armorClass: 10,
      hp: 10,
      maxHp: 10,
      initiative: 11,
      teamId: "team-b",
      damageDealt: 9,
    },
  ],
};

test("resolveTorneoCompletionDamageTotals usa snapshot se il payload fallback e zero", () => {
  assert.deepEqual(
    resolveTorneoCompletionDamageTotals(
      { teamADamageTotal: 0, teamBDamageTotal: 0 },
      match,
      snapshot
    ),
    { teamA: 17, teamB: 9 }
  );
});

test("resolveTorneoCompletionDamageTotals preserva payload non-zero piu fresco", () => {
  assert.deepEqual(
    resolveTorneoCompletionDamageTotals(
      { teamADamageTotal: 21, teamBDamageTotal: 3 },
      match,
      snapshot
    ),
    { teamA: 21, teamB: 3 }
  );
});

test("resolveTorneoCompletionDamageTotals normalizza payload quando manca snapshot", () => {
  assert.deepEqual(
    resolveTorneoCompletionDamageTotals(
      { teamADamageTotal: -1, teamBDamageTotal: 4.9 },
      match,
      null
    ),
    { teamA: 0, teamB: 4 }
  );
});
