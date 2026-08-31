import assert from "node:assert/strict";
import test from "node:test";
import { emptyInitiativeTrackerState } from "@/components/gm/initiative-tracker";
import {
  initiativeMatchesMatchRoster,
  isAuthoritativeMegatimerInitiativeClear,
  parseEntryCountHintFromTimerLabel,
  parseInitiativeSnapshotField,
  pickInitiativeForMegatimer,
} from "@/lib/torneo/megatimer-initiative";

test("parseEntryCountHintFromTimerLabel estrae il totale turni", () => {
  assert.equal(parseEntryCountHintFromTimerLabel("Turno 1 · 3/6"), 6);
  assert.equal(parseEntryCountHintFromTimerLabel("Turno 2 · 2/3"), 3);
});

test("initiativeMatchesMatchRoster rifiuta PG fuori roster", () => {
  const state = {
    ...emptyInitiativeTrackerState(),
    entries: [
      {
        id: "1",
        name: "Edric Valemont",
        type: "pc" as const,
        playerId: "edric-id",
        armorClass: 10,
        hp: 10,
        maxHp: 10,
        initiative: 10,
      },
    ],
  };
  assert.equal(initiativeMatchesMatchRoster(state, ["saryx-id", "selene-id"]), false);
  assert.equal(initiativeMatchesMatchRoster(state, ["edric-id", "saryx-id"]), true);
});

test("pickInitiativeForMegatimer preferisce snapshot coerente con timer (3 vs 6)", () => {
  const roster = ["a", "b", "c", "d", "e", "f"];
  const staleSix = {
    ...emptyInitiativeTrackerState(),
    currentTurnIndex: 2,
    entries: [
      { id: "1", name: "A", type: "pc" as const, playerId: "a", armorClass: 10, hp: 10, maxHp: 10, initiative: 1 },
      { id: "2", name: "B", type: "pc" as const, playerId: "b", armorClass: 10, hp: 10, maxHp: 10, initiative: 2 },
      { id: "3", name: "Edric", type: "pc" as const, playerId: "c", armorClass: 10, hp: 10, maxHp: 10, initiative: 3 },
      { id: "4", name: "D", type: "pc" as const, playerId: "d", armorClass: 10, hp: 10, maxHp: 10, initiative: 4 },
      { id: "5", name: "E", type: "pc" as const, playerId: "e", armorClass: 10, hp: 10, maxHp: 10, initiative: 5 },
      { id: "6", name: "F", type: "pc" as const, playerId: "f", armorClass: 10, hp: 10, maxHp: 10, initiative: 6 },
    ],
  };
  const freshThree = {
    ...emptyInitiativeTrackerState(),
    currentTurnIndex: 2,
    entries: [
      { id: "1", name: "Brokk", type: "pc" as const, playerId: "a", armorClass: 10, hp: 10, maxHp: 10, initiative: 1 },
      { id: "2", name: "Selene", type: "pc" as const, playerId: "b", armorClass: 10, hp: 10, maxHp: 10, initiative: 2 },
      { id: "3", name: "Saryx", type: "pc" as const, playerId: "c", armorClass: 10, hp: 10, maxHp: 10, initiative: 3 },
    ],
  };

  const picked = pickInitiativeForMegatimer(
    [
      { state: staleSix, updatedAt: "2020-01-01T00:00:00Z", priority: 100 },
      { state: freshThree, updatedAt: "2026-01-01T00:00:00Z", priority: 90 },
    ],
    roster,
    "Turno 1 · 3/3"
  );

  assert.equal(picked?.entries.length, 3);
  assert.equal(picked?.entries[2]?.name, "Saryx");
});

test("parseInitiativeSnapshotField ignora snapshot vuoto", () => {
  assert.equal(parseInitiativeSnapshotField(null), null);
  assert.equal(parseInitiativeSnapshotField({ entries: [] }), null);
});

test("isAuthoritativeMegatimerInitiativeClear tratta null inattivo come reset", () => {
  assert.equal(isAuthoritativeMegatimerInitiativeClear(null, "pending"), true);
  assert.equal(isAuthoritativeMegatimerInitiativeClear(null, null), true);
  assert.equal(isAuthoritativeMegatimerInitiativeClear(null, "active"), false);
  assert.equal(isAuthoritativeMegatimerInitiativeClear({ entries: [] }, "pending"), false);
});
