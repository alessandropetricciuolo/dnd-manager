import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyTorneo2CombatState,
  sanitizeTorneo2CombatState,
  torneo2AliveBySide,
  torneo2CombatSignature,
  torneo2CombatStatesEqual,
  torneo2DamageBySide,
  type Torneo2CombatState,
} from "@/lib/torneo2/combat-state";

function combatant(over: Record<string, unknown>) {
  return {
    id: "x",
    name: "Tizio",
    side: "a",
    armorClass: 15,
    hp: 20,
    maxHp: 20,
    initiative: 10,
    damageDealt: 0,
    damageTaken: 0,
    conditions: [],
    deathSaves: { success: 0, fail: 0, stable: false },
    isDead: false,
    noteText: "",
    usedReaction: false,
    usedBonus: false,
    ...over,
  };
}

test("sanitize scarta combattenti senza id o nome", () => {
  const raw = {
    combatants: [combatant({ id: "a", name: "Valido" }), combatant({ id: "", name: "X" }), { foo: 1 }],
  };
  const state = sanitizeTorneo2CombatState(raw);
  assert.equal(state.combatants.length, 1);
  assert.equal(state.combatants[0].id, "a");
});

test("sanitize limita HP a maxHp e death saves a 3", () => {
  const raw = {
    combatants: [
      combatant({ id: "a", name: "A", hp: 999, maxHp: 30, deathSaves: { success: 9, fail: 9, stable: true } }),
    ],
  };
  const state = sanitizeTorneo2CombatState(raw);
  assert.equal(state.combatants[0].hp, 30);
  assert.equal(state.combatants[0].deathSaves.success, 3);
  assert.equal(state.combatants[0].deathSaves.fail, 3);
  assert.equal(state.combatants[0].deathSaves.stable, true);
});

test("sanitize deduplica condizioni e normalizza il turno", () => {
  const raw = {
    combatants: [combatant({ id: "a", name: "A", conditions: ["Prono", "Prono", " ", "Avvelenato"] })],
    currentTurnIndex: 50,
    roundNumber: 0,
  };
  const state = sanitizeTorneo2CombatState(raw);
  assert.deepEqual(state.combatants[0].conditions, ["Prono", "Avvelenato"]);
  assert.equal(state.currentTurnIndex, 0);
  assert.equal(state.roundNumber, 1);
});

test("la firma cambia con i dati ma non con l'ordine identico", () => {
  const a = sanitizeTorneo2CombatState({ combatants: [combatant({ id: "a", name: "A", hp: 10 })] });
  const b = sanitizeTorneo2CombatState({ combatants: [combatant({ id: "a", name: "A", hp: 10 })] });
  assert.equal(torneo2CombatSignature(a), torneo2CombatSignature(b));
  assert.ok(torneo2CombatStatesEqual(a, b));

  const c = sanitizeTorneo2CombatState({ combatants: [combatant({ id: "a", name: "A", hp: 5 })] });
  assert.notEqual(torneo2CombatSignature(a), torneo2CombatSignature(c));
});

test("danni e vivi per lato", () => {
  const state: Torneo2CombatState = sanitizeTorneo2CombatState({
    combatants: [
      combatant({ id: "1", name: "A1", side: "a", damageDealt: 12, hp: 5 }),
      combatant({ id: "2", name: "A2", side: "a", damageDealt: 3, hp: 0 }),
      combatant({ id: "3", name: "B1", side: "b", damageDealt: 7, hp: 8 }),
      combatant({ id: "4", name: "B2", side: "b", damageDealt: 0, hp: 9, isDead: true }),
    ],
  });
  assert.deepEqual(torneo2DamageBySide(state), { a: 15, b: 7 });
  assert.deepEqual(torneo2AliveBySide(state), { a: 1, b: 1 });
});

test("empty state è valido", () => {
  const s = emptyTorneo2CombatState();
  assert.equal(s.combatants.length, 0);
  assert.equal(s.roundNumber, 1);
});
