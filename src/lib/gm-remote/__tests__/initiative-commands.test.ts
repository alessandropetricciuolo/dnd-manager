import test from "node:test";
import assert from "node:assert/strict";
import {
  applyInitiativeRemoteCommand,
  adjustInitiativeHp,
  initiativeRemoteSnapshotSignature,
  isValidInitiativeRemotePayload,
  parseInitiativeRemoteSnapshot,
  toInitiativeRemoteSnapshot,
  type InitiativeRemoteCommandHandlers,
} from "../initiative-commands";

test("initiative snapshot publishes armor class and normalized conditions", () => {
  const snapshot = toInitiativeRemoteSnapshot({
    entries: [{
      id: "goblin-1", name: "Goblin", type: "monster", armorClass: 15, hp: 4, maxHp: 7,
      initiative: 12, conditions: ["prono" as never, "invalid" as never],
    }],
    currentTurnIndex: 0,
    roundNumber: 1,
    turnElapsedSeconds: 3,
    isTurnTimerRunning: true,
  });

  assert.equal(snapshot.entries[0]?.ac, 15);
  assert.deepEqual(snapshot.entries[0]?.conditions, ["prono"]);
  assert.deepEqual(parseInitiativeRemoteSnapshot(snapshot)?.entries[0]?.conditions, ["prono"]);
});

test("snapshot signature notices session identity changes but ignores heartbeat timestamps", () => {
  const snapshot = toInitiativeRemoteSnapshot({
    entries: [], currentTurnIndex: 0, roundNumber: 1, turnElapsedSeconds: 0, isTurnTimerRunning: false,
  }, undefined, undefined, "session-a", "Session A");
  const heartbeat = { ...snapshot, updatedAt: "later" };
  const nextSession = { ...snapshot, sessionId: "session-b", sessionTitle: "Session B" };

  assert.equal(initiativeRemoteSnapshotSignature(snapshot), initiativeRemoteSnapshotSignature(heartbeat));
  assert.notEqual(initiativeRemoteSnapshotSignature(snapshot), initiativeRemoteSnapshotSignature(nextSession));
});

test("remote combat commands validate bounded payloads and target the shared tracker", () => {
  const combatant = {
    id: "phone-monster-1", name: "Orco", type: "monster" as const, hp: 12, maxHp: 12,
    initiative: 14, ac: 13, conditions: ["spaventato"],
  };
  assert.equal(isValidInitiativeRemotePayload("initiative.add_combatant", { combatant }), true);
  assert.equal(isValidInitiativeRemotePayload("initiative.set_hp", { entry_id: "goblin-1", hp: 6 }), true);
  assert.equal(isValidInitiativeRemotePayload("initiative.set_hp", { entry_id: "goblin-1", hp: Infinity }), false);
  assert.equal(isValidInitiativeRemotePayload("initiative.set_conditions", { entry_id: "goblin-1", conditions: ["unknown"] }), false);

  const calls: Array<[string, ...unknown[]]> = [];
  const handlers: InitiativeRemoteCommandHandlers = {
    nextTurn: () => calls.push(["next"]),
    prevTurn: () => calls.push(["previous"]),
    toggleTurnTimer: () => calls.push(["toggle_timer"]),
    resetTurnTimer: () => calls.push(["reset_timer"]),
    resetRound: () => calls.push(["reset_round"]),
    adjustDamage: (id, delta) => calls.push(["damage", id, delta]),
    adjustDamageTaken: (id, delta) => calls.push(["damage_taken", id, delta]),
    adjustHp: (id, delta) => calls.push(["adjust_hp", id, delta]),
    setHp: (id, hp) => calls.push(["hp", id, hp]),
    setConditions: (id, conditions) => calls.push(["conditions", id, conditions]),
    toggleCondition: (id, condition) => calls.push(["toggle_condition", id, condition]),
    addCombatant: (entry) => calls.push(["add", entry]),
    removeCombatant: (id) => calls.push(["remove", id]),
  };

  assert.equal(applyInitiativeRemoteCommand(handlers, "initiative.add_combatant", { combatant }), true);
  assert.equal(applyInitiativeRemoteCommand(handlers, "initiative.set_hp", { entry_id: "goblin-1", hp: 2 }), true);
  assert.equal(applyInitiativeRemoteCommand(handlers, "initiative.adjust_hp", { entry_id: "goblin-1", delta: -1 }), true);
  assert.equal(applyInitiativeRemoteCommand(handlers, "initiative.set_conditions", { entry_id: "goblin-1", conditions: ["prono"] }), true);
  assert.equal(applyInitiativeRemoteCommand(handlers, "initiative.toggle_condition", { entry_id: "goblin-1", condition: "prono" }), true);
  assert.equal(applyInitiativeRemoteCommand(handlers, "initiative.remove_combatant", { entry_id: "phone-monster-1" }), true);
  assert.equal(applyInitiativeRemoteCommand(handlers, "initiative.add_combatant", { combatant: { ...combatant, hp: NaN } }), false);
  assert.deepEqual(calls.map(([action]) => action), ["add", "hp", "adjust_hp", "conditions", "toggle_condition", "remove"]);
});

test("consecutive HP deltas apply to the latest state instead of a stale snapshot", () => {
  const start = {
    entries: [{ id: "pc-1", name: "Eroe", type: "pc" as const, armorClass: 15, hp: 20, maxHp: 30, initiative: 12 }],
    currentTurnIndex: 0,
    roundNumber: 1,
    turnElapsedSeconds: 0,
    isTurnTimerRunning: false,
  };
  const afterDamage = adjustInitiativeHp(start, "pc-1", -5);
  const afterHealing = adjustInitiativeHp(afterDamage, "pc-1", 2);
  assert.equal(afterHealing.entries[0]?.hp, 17);
});
