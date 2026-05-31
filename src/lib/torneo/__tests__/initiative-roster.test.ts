import test from "node:test";
import assert from "node:assert/strict";
import { buildInitiativeEntriesForMatch, buildMatchInitiativeState } from "@/lib/torneo/initiative";
import type { TorneoMatchWithTeams, TorneoTeamWithMembers } from "@/lib/torneo/types";

function mockTeamsWithMembers(): TorneoTeamWithMembers[] {
  return [
    {
      id: "team-a",
      campaign_id: "c",
      name: "Rossi",
      color: "#f00",
      sort_order: 0,
      members: [
        {
          id: "m1",
          character_id: "char-1",
          name: "Tharok",
          character_class: "Guerriero",
          armor_class: 16,
          hit_points: 30,
        },
        {
          id: "m2",
          character_id: "char-2",
          name: "Lyra",
          character_class: "Mago",
          armor_class: 12,
          hit_points: 22,
        },
      ],
    },
    {
      id: "team-b",
      campaign_id: "c",
      name: "Blu",
      color: "#00f",
      sort_order: 1,
      members: [
        {
          id: "m3",
          character_id: "char-3",
          name: "Gorum",
          character_class: "Barbaro",
          armor_class: 14,
          hit_points: 40,
        },
      ],
    },
  ];
}

const quarterMatch: TorneoMatchWithTeams = {
  id: "match-1",
  campaign_id: "c",
  team_a_id: "team-a",
  team_b_id: "team-b",
  team_a_placeholder: null,
  team_b_placeholder: null,
  label: "Quarto 1",
  sort_order: 0,
  status: "pending",
  match_kind: "bracket",
  bracket_round: 1,
  bracket_slot: 0,
  advances_to_match_id: null,
  advances_to_slot: null,
  winner_team_id: null,
  winner_character_id: null,
  team_a_damage_total: 0,
  team_b_damage_total: 0,
  completed_at: null,
  notes: null,
  initiative_updated_at: null,
  timer_round_label: null,
  timer_duration_sec: null,
  timer_started_at: null,
  timer_paused_at: null,
  team_a: { id: "team-a", name: "Rossi", color: "#f00", isPlaceholder: false },
  team_b: { id: "team-b", name: "Blu", color: "#00f", isPlaceholder: false },
};

test("buildInitiativeEntriesForMatch include tutti i PG delle due squadre", () => {
  const entries = buildInitiativeEntriesForMatch(quarterMatch, mockTeamsWithMembers());
  assert.equal(entries.length, 3);
  assert.ok(entries.some((e) => e.playerId === "char-1" && e.teamId === "team-a"));
  assert.ok(entries.some((e) => e.playerId === "char-3" && e.teamId === "team-b"));
});

test("buildInitiativeEntriesForMatch ignora slot placeholder", () => {
  const semi: TorneoMatchWithTeams = {
    ...quarterMatch,
    team_b_id: null,
    team_b: { id: "", name: "Vincitore Q2", color: "#aaa", isPlaceholder: true },
  };
  const entries = buildInitiativeEntriesForMatch(semi, mockTeamsWithMembers());
  assert.equal(entries.length, 2);
  assert.ok(entries.every((e) => e.teamId === "team-a"));
});

test("buildMatchInitiativeState restituisce entries non vuote per quarto", () => {
  const state = buildMatchInitiativeState(quarterMatch, mockTeamsWithMembers());
  assert.equal(state.entries.length, 3);
});
