import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEightTeamBracketPlan,
  getBracketMatchReadiness,
  type BracketReadinessMatch,
} from "@/lib/torneo/bracket";
import type { TorneoTeamWithMembers } from "@/lib/torneo/types";

function teams(): TorneoTeamWithMembers[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `team-${i + 1}`,
    campaign_id: "campaign-1",
    name: `Team ${i + 1}`,
    color: "#f59e0b",
    sort_order: i,
    members: [],
  }));
}

function rowsFromPlan(): BracketReadinessMatch[] {
  const plan = buildEightTeamBracketPlan(teams());
  return plan.map((slot, index) => ({
    id: `match-${index}`,
    team_a_id: slot.teamAId!,
    team_b_id: slot.teamBId!,
    match_kind: slot.matchKind,
    bracket_round: slot.round,
    advances_to_match_id:
      slot.advancesToMatchIndex == null ? null : `match-${slot.advancesToMatchIndex}`,
    advances_to_slot: slot.advancesToSlot,
    winner_team_id: null,
    status: "pending",
  }));
}

test("semifinals are not ready until both feeder matches are completed and advanced", () => {
  const matches = rowsFromPlan();
  const semi = matches[4]!;

  assert.deepEqual(getBracketMatchReadiness(semi, matches), {
    ready: false,
    reason: "Completa prima gli incontri precedenti del tabellone.",
  });

  matches[0] = { ...matches[0]!, status: "completed", winner_team_id: "team-1" };
  matches[1] = { ...matches[1]!, status: "completed", winner_team_id: "team-4" };

  assert.deepEqual(getBracketMatchReadiness(semi, matches), {
    ready: false,
    reason: "Il tabellone non ha ancora ricevuto il vincitore corretto.",
  });

  matches[4] = { ...semi, team_a_id: "team-1", team_b_id: "team-4" };
  assert.deepEqual(getBracketMatchReadiness(matches[4]!, matches), { ready: true });
});

test("triello is not ready until the final winner has been advanced", () => {
  const matches = rowsFromPlan();
  const final = matches[6]!;
  const triello = matches[7]!;

  assert.deepEqual(getBracketMatchReadiness(triello, matches), {
    ready: false,
    reason: "Completa prima gli incontri precedenti del tabellone.",
  });

  matches[6] = { ...final, status: "completed", winner_team_id: "team-2" };
  assert.deepEqual(getBracketMatchReadiness(triello, matches), {
    ready: false,
    reason: "Il tabellone non ha ancora ricevuto il vincitore corretto.",
  });

  matches[7] = { ...triello, team_a_id: "team-2", team_b_id: "team-2" };
  assert.deepEqual(getBracketMatchReadiness(matches[7]!, matches), { ready: true });
});
