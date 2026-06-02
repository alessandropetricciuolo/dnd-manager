import assert from "node:assert/strict";
import test from "node:test";
import { buildEightTeamBracketPlan } from "@/lib/torneo/bracket";
import {
  baseTorneoMatchResetPatch,
  bracketSlotKey,
  bracketSlotResetPatch,
  planSlotsByKey,
} from "@/lib/torneo/reset-torneo-state";
import type { TorneoTeamWithMembers } from "@/lib/torneo/types";

function mockTeams(): TorneoTeamWithMembers[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `team-${i + 1}`,
    campaign_id: "c1",
    name: `Squadra ${i + 1}`,
    color: "#000",
    sort_order: i,
    members: [],
  }));
}

test("bracketSlotKey identifica slot tabellone", () => {
  assert.equal(bracketSlotKey("bracket", 1, 0), "bracket:1:0");
  assert.equal(bracketSlotKey("triello", 4, 0), "triello:4:0");
});

test("planSlotsByKey ripristina quarti con squadre reali", () => {
  const plan = buildEightTeamBracketPlan(mockTeams());
  const byKey = planSlotsByKey(plan);
  const q1 = byKey.get("bracket:1:0");
  assert.ok(q1?.teamAId);
  assert.ok(q1?.teamBId);
  const patch = bracketSlotResetPatch(q1!);
  assert.equal(patch.status, "pending");
  assert.equal(patch.timer_started_at, null);
  assert.equal(patch.initiative_snapshot, null);
});

test("baseTorneoMatchResetPatch azzera combattimento", () => {
  const p = baseTorneoMatchResetPatch();
  assert.equal(p.status, "pending");
  assert.equal(p.winner_team_id, null);
  assert.equal(p.team_a_damage_total, 0);
});
