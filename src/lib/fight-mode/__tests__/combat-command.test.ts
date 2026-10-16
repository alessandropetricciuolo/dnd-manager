import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLocalCombatCommand,
  resolveTargetCombatants,
  type SimpleCombatantRef,
} from "@/lib/fight-mode/command-parser";
import {
  applyCombatCommandProposal,
  undoLastCommand,
  initiativeStateSyncSignature,
  applyCombatHpMutation,
  startCombatantConcentration,
} from "@/lib/fight-mode/state-transitions";
import { sanitizeInitiativeTrackerState, type InitiativeTrackerState } from "@/components/gm/initiative-tracker";
import type { CombatCommandProposal } from "@/lib/fight-mode/types";
import { validateCombatCommandProposal } from "../combat-command-proposal-schema";

function createMockCombatState(): InitiativeTrackerState {
  return {
    currentTurnIndex: 0,
    roundNumber: 1,
    turnElapsedSeconds: 0,
    isTurnTimerRunning: false,
    pendingConcentrationChecks: [],
    pendingSaveReminders: [],
    lastAdvanceUndoSnapshot: null,
    appliedProposalIds: [],
    lastCommandUndoSnapshot: null,
    entries: [
      {
        id: "pc-1",
        name: "Kaelen",
        type: "pc",
        hp: 30,
        maxHp: 30,
        armorClass: 16,
        initiative: 18,
        conditions: [],
        activeEffects: [],
        activeConcentration: null,
      },
      {
        id: "pc-2",
        name: "Thorin",
        type: "pc",
        hp: 45,
        maxHp: 45,
        armorClass: 18,
        initiative: 15,
        conditions: [],
        activeEffects: [],
        activeConcentration: null,
      },
      {
        id: "mob-1",
        name: "Goblin 1",
        type: "monster",
        hp: 12,
        maxHp: 12,
        armorClass: 13,
        initiative: 12,
        conditions: [],
        activeEffects: [],
        activeConcentration: null,
      },
      {
        id: "mob-2",
        name: "Goblin 2",
        type: "monster",
        hp: 12,
        maxHp: 12,
        armorClass: 13,
        initiative: 10,
        conditions: [],
        activeEffects: [],
        activeConcentration: null,
      },
    ],
  };
}

test("1. Risoluzione combattenti: esatta, ambigua e collettiva", () => {
  const combatants: SimpleCombatantRef[] = [
    { id: "pc-1", name: "Kaelen", type: "pc" },
    { id: "pc-2", name: "Thorin", type: "pc" },
    { id: "mob-1", name: "Goblin 1", type: "monster" },
    { id: "mob-2", name: "Goblin 2", type: "monster" },
  ];

  // Esatta per ID
  const resId = resolveTargetCombatants("pc-1", combatants);
  assert.equal(resId.status, "resolved");
  if (resId.status === "resolved") {
    assert.equal(resId.targets[0].id, "pc-1");
  }

  // Esatta per nome
  const resName = resolveTargetCombatants("Thorin", combatants);
  assert.equal(resName.status, "resolved");
  if (resName.status === "resolved") {
    assert.equal(resName.targets[0].name, "Thorin");
  }

  // Ambigua: "Goblin" combacia sia con Goblin 1 che Goblin 2 senza intento collettivo
  const resAmbiguous = resolveTargetCombatants("Goblin", combatants);
  assert.equal(resAmbiguous.status, "ambiguous");
  if (resAmbiguous.status === "ambiguous") {
    assert.equal(resAmbiguous.candidates.length, 2);
  }

  // Collettiva esplicita: "tutti i goblin"
  const resAllGoblins = resolveTargetCombatants("tutti i goblin", combatants);
  assert.equal(resAllGoblins.status, "resolved");
  if (resAllGoblins.status === "resolved") {
    assert.equal(resAllGoblins.targets.length, 2);
  }

  // Collettiva esplicita: "tutti i mostri"
  const resAllMonsters = resolveTargetCombatants("tutti i mostri", combatants);
  assert.equal(resAllMonsters.status, "resolved");
  if (resAllMonsters.status === "resolved") {
    assert.equal(resAllMonsters.targets.length, 2);
  }

  // Collettiva esplicita: "tutti i pg"
  const resAllPcs = resolveTargetCombatants("tutti i pg", combatants);
  assert.equal(resAllPcs.status, "resolved");
  if (resAllPcs.status === "resolved") {
    assert.equal(resAllPcs.targets.length, 2);
  }
});

test("2. Parser locale: distinzione tra danno, cura e rettifica esatta PF", () => {
  const state = createMockCombatState();
  const combatants: SimpleCombatantRef[] = state.entries.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
  }));
  const sig = initiativeStateSyncSignature(state);

  // Danno
  const pDamage = parseLocalCombatCommand("infliggi 10 danni a Goblin 1", combatants, sig);
  assert.equal(pDamage.operations.length, 1);
  assert.equal(pDamage.operations[0].kind, "damage");
  if (pDamage.operations[0].kind === "damage") {
    assert.equal(pDamage.operations[0].amount, 10);
    assert.equal(pDamage.operations[0].targetId, "mob-1");
  }

  // Cura
  const pHeal = parseLocalCombatCommand("cura 8 pf a Thorin", combatants, sig);
  assert.equal(pHeal.operations.length, 1);
  assert.equal(pHeal.operations[0].kind, "heal");
  if (pHeal.operations[0].kind === "heal") {
    assert.equal(pHeal.operations[0].amount, 8);
    assert.equal(pHeal.operations[0].targetId, "pc-2");
  }

  // Rettifica esatta PF (imposta pf a 20)
  const pExact = parseLocalCombatCommand("imposta pf di Kaelen a 20", combatants, sig);
  assert.equal(pExact.operations.length, 1);
  assert.equal(pExact.operations[0].kind, "set_exact_hp");
  if (pExact.operations[0].kind === "set_exact_hp") {
    assert.equal(pExact.operations[0].exactHp, 20);
    assert.equal(pExact.operations[0].targetId, "pc-1");
  }
});

test("3. Parser locale: condizioni, concentrazione e comandi composti", () => {
  const state = createMockCombatState();
  const combatants: SimpleCombatantRef[] = state.entries.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
  }));
  const sig = initiativeStateSyncSignature(state);

  // Applicazione condizione canonica
  const pCond = parseLocalCombatCommand("applica prono a Goblin 1", combatants, sig);
  assert.equal(pCond.operations.length, 1);
  assert.equal(pCond.operations[0].kind, "add_effect");
  if (pCond.operations[0].kind === "add_effect") {
    assert.equal(pCond.operations[0].statusId, "prono");
  }

  // Concentrazione
  const pConc = parseLocalCombatCommand("Kaelen si concentra su Benedizione", combatants, sig);
  assert.equal(pConc.operations.length, 1);
  assert.equal(pConc.operations[0].kind, "start_concentration");
  if (pConc.operations[0].kind === "start_concentration") {
    assert.equal(pConc.operations[0].casterId, "pc-1");
    assert.equal(pConc.operations[0].spellName, "Benedizione");
  }

  // Interruzione concentrazione
  const pBreak = parseLocalCombatCommand("Kaelen perde concentrazione", combatants, sig);
  assert.equal(pBreak.operations.length, 1);
  assert.equal(pBreak.operations[0].kind, "break_concentration");
  if (pBreak.operations[0].kind === "break_concentration") {
    assert.equal(pBreak.operations[0].casterId, "pc-1");
  }

  // Comando composto
  const pCompound = parseLocalCombatCommand(
    "10 danni a Goblin 1; cura 5 a Thorin",
    combatants,
    sig
  );
  assert.equal(pCompound.operations.length, 2);
  assert.equal(pCompound.operations[0].kind, "damage");
  assert.equal(pCompound.operations[1].kind, "heal");
});

test("4. Gestione dati mancanti e query ambigue nel parser", () => {
  const state = createMockCombatState();
  const combatants: SimpleCombatantRef[] = state.entries.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
  }));
  const sig = initiativeStateSyncSignature(state);

  // Bersaglio ambiguo ("Goblin")
  const pAmb = parseLocalCombatCommand("infliggi 6 danni a Goblin", combatants, sig);
  assert.equal(pAmb.operations.length, 0);
  assert.equal(pAmb.unresolvedTargets.length, 1);
  assert.equal(pAmb.unresolvedTargets[0].reason, "ambiguous");
  assert.equal(pAmb.unresolvedTargets[0].candidates?.length, 2);
  assert.deepEqual(pAmb.unresolvedTargets[0].intent, { kind: "damage", amount: 6 });

  // Ammontare mancante ("danno a Thorin")
  const pMissing = parseLocalCombatCommand("danno a Thorin", combatants, sig);
  assert.equal(pMissing.operations.length, 1);
  assert.equal(pMissing.missingData.length, 1);
  assert.equal(pMissing.missingData[0].field, "amount");
  assert.equal(pMissing.operations[0].kind, "damage");
  const missingHeal = parseLocalCombatCommand("cura a Thorin", combatants, sig);
  assert.equal(missingHeal.operations[0].kind, "heal");
  assert.equal(missingHeal.missingData[0].field, "amount");

  const bless = parseLocalCombatCommand("applica benedizione a Thorin", combatants, sig);
  assert.equal(bless.operations.length, 1);
  assert.equal(bless.operations[0].kind, "add_effect");
  assert.equal(bless.operations[0].kind === "add_effect" && bless.operations[0].linkToConcentration, true);
  assert.equal(bless.missingData[0].field, "sourceCasterId");
});

test("le proposte ambigue non perdono intento e stato custom non viene inventato", () => {
  const state = createMockCombatState();
  const combatants = state.entries.map(({ id, name, type }) => ({ id, name, type }));
  const proposal = parseLocalCombatCommand("cura 9 a Goblin", combatants, initiativeStateSyncSignature(state));
  assert.equal(proposal.unresolvedTargets[0].intent?.kind, "heal");
  assert.deepEqual(proposal.unresolvedTargets[0].intent, { kind: "heal", amount: 9 });
  assert.equal(applyCombatCommandProposal(state, proposal).nextState, state);
});

test("5. Applicazione atomica, prevenzione doppia conferma e protezione stale state", () => {
  const state = createMockCombatState();
  const combatants: SimpleCombatantRef[] = state.entries.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
  }));
  const sig = initiativeStateSyncSignature(state);

  const proposal = parseLocalCombatCommand("infliggi 8 danni a Goblin 1", combatants, sig);

  // 1. Applicazione con successo
  const res1 = applyCombatCommandProposal(state, proposal);
  assert.equal(res1.success, true);
  const targetGoblin = res1.nextState.entries.find((e) => e.id === "mob-1");
  assert.equal(targetGoblin?.hp, 4); // 12 - 8 = 4

  // 2. Prevenzione doppia applicazione della STESSA proposta
  const resDouble = applyCombatCommandProposal(res1.nextState, proposal);
  assert.equal(resDouble.success, false);
  assert.match(resDouble.message, /già stata applicata/i);

  // 3. Rilevazione stato obsoleto (stale state)
  // Creiamo un'altra proposta basata su sig, ma mutiamo lo stato nel frattempo
  const stateMutated = applyCombatHpMutation(state, {
    targetId: "pc-1",
    kind: "damage",
    amount: 5,
  });
  const resStale = applyCombatCommandProposal(stateMutated, proposal);
  assert.equal(resStale.success, false);
  assert.match(resStale.message, /cambiato dopo la formulazione/i);
});

test("6. Annullamento ultimo comando (undoLastCommand) e invalidazione su modifiche successive", () => {
  const state = createMockCombatState();
  const combatants: SimpleCombatantRef[] = state.entries.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
  }));
  const sig = initiativeStateSyncSignature(state);

  const proposal = parseLocalCombatCommand("infliggi 6 danni a Goblin 1", combatants, sig);
  const applied = applyCombatCommandProposal(state, proposal);
  assert.equal(applied.success, true);
  assert.equal(applied.nextState.entries.find((e) => e.id === "mob-1")?.hp, 6);

  // Annullamento immediato valido
  const undone = undoLastCommand(applied.nextState);
  assert.equal(undone.undone, true);
  assert.equal(undone.nextState.entries.find((e) => e.id === "mob-1")?.hp, 12);
  assert.ok(undone.nextState.appliedProposalIds?.includes(proposal.proposalId));
  assert.equal(undone.nextState.lastCommandUndoSnapshot, null);
  const reload = sanitizeInitiativeTrackerState(JSON.parse(JSON.stringify(undone.nextState)));
  const replay = applyCombatCommandProposal(reload, proposal);
  assert.equal(replay.success, false);
  assert.equal(reload.entries.find((e) => e.id === "mob-1")?.hp, 12);

  // Se invece intervengono modifiche successive (es. danno a Thorin)
  const applied2 = applyCombatCommandProposal(state, proposal);
  const mutatedAfter = applyCombatHpMutation(applied2.nextState, {
    targetId: "pc-2",
    kind: "damage",
    amount: 10,
  });

  const undoBlocked = undoLastCommand(mutatedAfter);
  assert.equal(undoBlocked.undone, false);
  assert.match(undoBlocked.message, /modifiche successive/i);
});

test("una proposta valida più invalida non applica modifiche parziali", () => {
  const state = createMockCombatState();
  const sig = initiativeStateSyncSignature(state);
  const proposal: CombatCommandProposal = {
    proposalId: "atomic-valid-invalid",
    source: "local",
    rawInput: "test",
    stateSignatureAtCreation: sig,
    unresolvedTargets: [],
    missingData: [],
    operations: [
      { id: "valid", kind: "damage", targetId: "mob-1", targetName: "Goblin 1", amount: 5 },
      { id: "invalid", kind: "heal", targetId: "missing-target", targetName: "Missing", amount: 3 },
    ],
  };
  const result = applyCombatCommandProposal(state, proposal);
  assert.equal(result.success, false);
  assert.equal(result.nextState, state);
  assert.equal(state.entries.find((entry) => entry.id === "mob-1")?.hp, 12);
});

test("la selezione parziale applica soltanto l'effetto scelto e una sola concentrazione", () => {
  const state = createMockCombatState();
  const proposal: CombatCommandProposal = {
    proposalId: "partial-bless",
    source: "local",
    rawInput: "Kaelen applica Benedizione a Thorin e Goblin 1",
    stateSignatureAtCreation: initiativeStateSyncSignature(state),
    unresolvedTargets: [],
    missingData: [],
    operations: [
      { id: "bless-thorin", kind: "add_effect", targetId: "pc-2", targetName: "Thorin", statusId: "benedizione", label: "Benedizione", sourceCasterId: "pc-1", sourceName: "Kaelen", linkToConcentration: true, spellName: "Benedizione" },
      { id: "bless-goblin", kind: "add_effect", targetId: "mob-1", targetName: "Goblin 1", statusId: "benedizione", label: "Benedizione", sourceCasterId: "pc-1", sourceName: "Kaelen", linkToConcentration: true, spellName: "Benedizione" },
    ],
  };
  const result = applyCombatCommandProposal(state, proposal, ["bless-thorin"]);
  assert.equal(result.success, true);
  assert.equal(result.nextState.entries.find((entry) => entry.id === "pc-2")?.activeEffects?.length, 1);
  assert.equal(result.nextState.entries.find((entry) => entry.id === "mob-1")?.activeEffects?.length, 0);
  assert.equal(result.nextState.entries.find((entry) => entry.id === "pc-1")?.activeConcentration?.spellName, "Benedizione");
  assert.equal(result.nextState.entries.find((entry) => entry.id === "pc-1")?.activeConcentration?.linkedEffectIds.length, 1);
});

test("validazione runtime rifiuta union malformed, caster sconosciuti e label mancanti senza throw", () => {
  const state = createMockCombatState();
  const sig = initiativeStateSyncSignature(state);
  const base = { proposalId: "runtime-invalid", source: "local", rawInput: "test", stateSignatureAtCreation: sig, unresolvedTargets: [], missingData: [] } as const;
  const malformed = { ...base, operations: [{ id: "x", kind: "future_kind" }] } as unknown as CombatCommandProposal;
  assert.equal(applyCombatCommandProposal(state, malformed).success, false);

  const missingLabel = { ...base, operations: [{ id: "x", kind: "add_effect", targetId: "pc-1", targetName: "Kaelen", statusId: "custom:glow" }] } as unknown as CombatCommandProposal;
  assert.equal(validateCombatCommandProposal(missingLabel), false);
  assert.equal(applyCombatCommandProposal(state, missingLabel).nextState, state);

  const badSource = { ...base, operations: [{ id: "x", kind: "add_effect", targetId: "pc-1", targetName: "Kaelen", statusId: "custom:glow", label: "Glow", sourceCasterId: "missing" }] } as unknown as CombatCommandProposal;
  assert.equal(applyCombatCommandProposal(state, badSource).nextState, state);
});

test("7. Danno applicato tramite proposta gestisce PF temporanei e genera check di concentrazione", () => {
  let state = createMockCombatState();
  // Kaelen ha 5 PF temporanei e concentrazione attiva su "Scudo della Fede"
  state = applyCombatHpMutation(state, {
    targetId: "pc-1",
    kind: "set_temp_hp",
    tempHp: 5,
  });
  state = startCombatantConcentration(state, {
    casterId: "pc-1",
    spellName: "Scudo della Fede",
  });

  const combatants: SimpleCombatantRef[] = state.entries.map((e) => ({
    id: e.id,
    name: e.name,
    type: e.type,
  }));
  const sig = initiativeStateSyncSignature(state);

  // 12 danni effettivi a Kaelen:
  // - 5 assorbiti dai tempHp
  // - 7 scalati dagli HP effettivi (30 - 7 = 23)
  // - CD check concentrazione = max(10, 12/2) = 10
  const proposal = parseLocalCombatCommand("infliggi 12 danni a Kaelen", combatants, sig);
  const applied = applyCombatCommandProposal(state, proposal);
  assert.equal(applied.success, true);

  const kaelen = applied.nextState.entries.find((e) => e.id === "pc-1");
  assert.equal(kaelen?.tempHp, 0);
  assert.equal(kaelen?.hp, 23);

  const checks = applied.nextState.pendingConcentrationChecks ?? [];
  assert.equal(checks.length, 1);
  assert.equal(checks[0].damageTaken, 12);
  assert.equal(checks[0].dc, 10);
});
