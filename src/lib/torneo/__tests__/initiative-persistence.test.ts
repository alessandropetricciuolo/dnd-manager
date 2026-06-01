import test from "node:test";
import assert from "node:assert/strict";
import {
  hasTorneoInitiativeEntries,
  parseStoredTorneoInitiativeState,
  preferRestorableTorneoInitiativeState,
} from "@/lib/torneo/initiative-persistence";
import {
  emptyInitiativeTrackerState,
  type InitiativeTrackerState,
} from "@/components/gm/initiative-tracker";

function stateWithEntries(name: string): InitiativeTrackerState {
  return {
    ...emptyInitiativeTrackerState(),
    entries: [
      {
        id: `entry-${name}`,
        name,
        type: "pc",
        armorClass: 12,
        hp: 7,
        maxHp: 10,
        initiative: 15,
        playerId: `char-${name}`,
        damageDealt: 4,
        damageTaken: 3,
      },
    ],
  };
}

test("preferRestorableTorneoInitiativeState uses non-empty remote snapshots first", () => {
  const remote = stateWithEntries("remote");
  const stored = JSON.stringify(stateWithEntries("stored"));

  assert.equal(preferRestorableTorneoInitiativeState(remote, stored), remote);
});

test("preferRestorableTorneoInitiativeState falls back to local state when remote snapshot is empty", () => {
  const stored = stateWithEntries("stored");
  const restored = preferRestorableTorneoInitiativeState(
    emptyInitiativeTrackerState(),
    JSON.stringify(stored)
  );

  assert.ok(restored);
  assert.equal(restored.entries[0]?.id, stored.entries[0]?.id);
  assert.equal(restored.entries[0]?.hp, 7);
  assert.equal(restored.entries[0]?.damageTaken, 3);
});

test("preferRestorableTorneoInitiativeState returns null when neither source can restore combatants", () => {
  assert.equal(
    preferRestorableTorneoInitiativeState(emptyInitiativeTrackerState(), JSON.stringify(emptyInitiativeTrackerState())),
    null
  );
  assert.equal(preferRestorableTorneoInitiativeState(null, "not json"), null);
});

test("parseStoredTorneoInitiativeState sanitizes stored snapshots", () => {
  const parsed = parseStoredTorneoInitiativeState(
    JSON.stringify({
      entries: [{ id: "e1", name: "A", type: "pc", armorClass: 10, hp: 5, maxHp: 5, initiative: 12 }],
      currentTurnIndex: 99,
    })
  );

  assert.ok(hasTorneoInitiativeEntries(parsed));
  assert.equal(parsed.currentTurnIndex, 0);
  assert.equal(parsed.roundNumber, 1);
});
