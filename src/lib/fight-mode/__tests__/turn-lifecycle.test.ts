import { test } from "node:test";
import assert from "node:assert/strict";
import {
  transitionNextTurn,
  undoAdvanceTurn,
  addCombatEffectInstances,
  startCombatantConcentration,
  removeCombatantFromState,
  applyCombatHpMutation,
  resolvePendingSaveReminder,
  consumeSingleUseEffect,
} from "../state-transitions";
import type { InitiativeTrackerState } from "@/components/gm/initiative-tracker";

function buildTestCombatState(): InitiativeTrackerState {
  return {
    entries: [
      {
        id: "pc-1",
        name: "Valeros",
        type: "pc",
        hp: 30,
        maxHp: 30,
        armorClass: 16,
        initiative: 20,
        conditions: [],
        activeEffects: [],
      },
      {
        id: "pc-2",
        name: "Kyra",
        type: "pc",
        hp: 25,
        maxHp: 25,
        armorClass: 14,
        initiative: 15,
        conditions: [],
        activeEffects: [],
      },
      {
        id: "goblin-1",
        name: "Goblin 1",
        type: "monster",
        hp: 7,
        maxHp: 7,
        armorClass: 13,
        initiative: 10,
        conditions: [],
        activeEffects: [],
      },
    ],
    currentTurnIndex: 0,
    roundNumber: 1,
    turnElapsedSeconds: 120,
    isTurnTimerRunning: false,
    pendingConcentrationChecks: [],
    pendingSaveReminders: [],
    lastAdvanceUndoSnapshot: null,
  };
}

test("1. Durate ancorate: decrementano SOLO all'inizio/fine del turno dell'ancora corretta", () => {
  let state = buildTestCombatState();

  // Applica Scudo (durata 1 turno, tickOn: turn_start ancorato a pc-1)
  state = addCombatEffectInstances(state, {
    targetIds: ["pc-1"],
    statusId: "scudo",
    customLabel: "Scudo (+5 CA)",
    remainingTurns: 1,
    tickOn: "turn_start",
    sourceCasterId: "pc-1",
  });

  const eff1 = state.entries[0].activeEffects?.[0];
  assert.equal(eff1?.duration?.remainingTurns, 1);
  assert.equal(eff1?.duration?.tickOn, "turn_start");
  assert.equal(eff1?.duration?.anchorCombatantId, "pc-1");

  // Avanza turno: pc-1 termina il turno, tocca a pc-2.
  // Poiché Scudo scade a 'turn_start' di pc-1, l'effetto NON deve scadere ora.
  state = transitionNextTurn(state);
  assert.equal(state.currentTurnIndex, 1, "Tocca a Kyra (pc-2)");
  const effAfterPc1End = state.entries[0].activeEffects?.find((e) => e.statusId === "scudo");
  assert.ok(effAfterPc1End, "Scudo deve essere ancora attivo durante il turno di Kyra");
  assert.equal(effAfterPc1End.duration?.remainingTurns, 1);

  // Avanza turno: tocca a goblin-1. Ancora non scade.
  state = transitionNextTurn(state);
  assert.equal(state.currentTurnIndex, 2, "Tocca a goblin-1");
  const effDuringGoblin = state.entries[0].activeEffects?.find((e) => e.statusId === "scudo");
  assert.ok(effDuringGoblin, "Scudo deve essere ancora attivo durante il turno del goblin");

  // Avanza turno: si chiude il round 1, tocca di nuovo a pc-1 all'inizio del round 2!
  // Qui scatta il 'turn_start' dell'ancora pc-1: Scudo (1 turno) scade e viene rimosso!
  state = transitionNextTurn(state);
  assert.equal(state.currentTurnIndex, 0, "Torna il turno di pc-1");
  assert.equal(state.roundNumber, 2, "Inizio Round 2");
  const effAfterRound = state.entries[0].activeEffects?.find((e) => e.statusId === "scudo");
  assert.equal(effAfterRound, undefined, "Scudo deve essere scaduto e rimosso a inizio turno del caster");
});

test("2. Effetto applicato durante il turno dell'ancora non scade immediatamente all'uscita dal turno", () => {
  let state = buildTestCombatState();
  assert.equal(state.currentTurnIndex, 0, "Attivo: pc-1 nel round 1");

  // Durante il suo turno (round 1, turn 0), pc-1 applica un buff di 1 turno con tickOn: 'turn_end'
  state = addCombatEffectInstances(state, {
    targetIds: ["pc-2"],
    statusId: "schivata",
    remainingTurns: 1,
    tickOn: "turn_end",
    sourceCasterId: "pc-1",
  });

  // Avanza subito il turno: finisce il turno di pc-1 in cui l'effetto è stato applicato.
  // NON deve decrementare immediatamente a 0 turni!
  state = transitionNextTurn(state);
  const buffOnPc2 = state.entries[1].activeEffects?.find((e) => e.statusId === "schivata");
  assert.ok(buffOnPc2, "Il buff non deve scadere immediatamente all'uscita dal turno di applicazione");
  assert.equal(buffOnPc2.duration?.remainingTurns, 1);
});

test("3. Mostri morti saltati: il ciclo dei turni esegue comunque i tick delle durate ancorate a loro", () => {
  let state = buildTestCombatState();
  // Il goblin ha 0 PF (morto)
  state.entries[2].hp = 0;
  state.entries[2].isDead = true;

  // Il goblin prima di morire ha avvelenato pc-1 per 1 turno con fine ancorata al turno del goblin
  state = addCombatEffectInstances(state, {
    targetIds: ["pc-1"],
    statusId: "avvelenato",
    remainingTurns: 1,
    tickOn: "turn_end",
    sourceCasterId: "goblin-1",
  });

  // Da pc-1 avanziamo a pc-2
  state = transitionNextTurn(state);
  assert.equal(state.currentTurnIndex, 1);

  // Da pc-2 avanziamo: il goblin è morto, quindi l'indice attivo deve saltare direttamente a pc-1 (round 2),
  // ma il passaggio del goblin morto deve comunque processare i tick ancorati a lui!
  state = transitionNextTurn(state);
  assert.equal(state.currentTurnIndex, 0, "Ha saltato il goblin morto tornando a pc-1");
  assert.equal(state.roundNumber, 2);

  // L'effetto ancorato al goblin è stato tickato e rimosso
  const poison = state.entries[0].activeEffects?.find((e) => e.statusId === "avvelenato");
  assert.equal(poison, undefined, "Il veleno ancorato al mostro morto deve scadere anche se il turno è stato saltato");
});

test("4. Rimozione combattente: gli effetti ancorati a lui hanno anchorRemoved: true e sospendono l'automatismo", () => {
  let state = buildTestCombatState();

  // pc-2 applica un effetto NON a concentrazione (Santuario) su goblin-1 ancorato a pc-2
  state = addCombatEffectInstances(state, {
    targetIds: ["goblin-1"],
    statusId: "santuario",
    remainingTurns: 3,
    tickOn: "turn_end",
    sourceCasterId: "pc-2",
  });

  // Rimuoviamo pc-2 dal combattimento (fuga o eliminazione)
  state = removeCombatantFromState(state, "pc-2");

  const sanctuary = state.entries.find((e) => e.id === "goblin-1")?.activeEffects?.[0];
  assert.ok(sanctuary, "L'effetto resta presente sul bersaglio");
  assert.equal(sanctuary.duration?.anchorRemoved, true, "Deve essere marcato anchorRemoved: true");
  assert.equal(sanctuary.duration?.remainingTurns, 3, "I turni residui non vengono alterati o riassegnati arbitrariamente");
});

test("5. Concentrazione temporizzata scaduta: interrompe concentrazione e pulisce effetti collegati", () => {
  let state = buildTestCombatState();

  // pc-1 inizia Benedizione con durata 1 turno ancorata a pc-1 (turn_end)
  state = startCombatantConcentration(state, {
    casterId: "pc-1",
    spellName: "Benedizione",
    targetIds: ["pc-1", "pc-2"],
    effectStatusId: "benedizione",
  });

  const effId = state.entries[0].activeEffects?.[0]?.effectId;
  assert.ok(effId, "Effetto creato sul caster");
  state.entries[0].activeEffects![0].duration = {
    remainingTurns: 1,
    tickOn: "turn_end",
    anchorCombatantId: "pc-1",
    appliedAtRound: 0, // simuliamo applicazione round precedente per tickare all'uscita
    appliedAtTurnIndex: 0,
  };

  assert.ok(state.entries[0].activeConcentration, "Caster è concentrato");
  assert.equal(state.entries[1].activeEffects?.length, 1, "Bersaglio ha Benedizione");

  // Avanza turno: pc-1 finisce il turno, l'effetto da 1 turno scade!
  state = transitionNextTurn(state);

  // La scadenza del singolo effetto non interrompe una concentrazione dalla durata indipendente.
  assert.ok(state.entries[0].activeConcentration, "La concentrazione resta attiva");
  assert.ok(
    state.entries[1].activeEffects?.find((e) => e.statusId === "benedizione"),
    "La scadenza dell'istanza sul caster non deve rimuovere il diverso effetto sul bersaglio"
  );
});

test("concentrazione temporizzata senza effetti collegati scade al successivo turno del caster", () => {
  let state = buildTestCombatState();
  state = startCombatantConcentration(state, { casterId: "pc-1", spellName: "Guardiani Spirituali", remainingTurns: 1 });
  assert.equal(state.entries[0].activeConcentration?.remainingTurns, 1);
  state = transitionNextTurn(state);
  state = transitionNextTurn(state);
  assert.ok(state.entries[0].activeConcentration, "Resta attiva fino al turno successivo del caster");
  state = transitionNextTurn(state);
  assert.equal(state.entries[0].activeConcentration, null, "Scade una volta terminato il turno di durata");
});

test("timer concentrazione autoritativo rimuove gli effetti collegati anche se durano più a lungo", () => {
  let state = buildTestCombatState();
  state = startCombatantConcentration(state, {
    casterId: "pc-1", spellName: "Benedizione", targetIds: ["pc-2"],
    effectStatusId: "benedizione", remainingTurns: 1,
  });
  const linked = state.entries[1].activeEffects![0]!;
  state.entries[1].activeEffects![0] = {
    ...linked,
    duration: { remainingTurns: 5, tickOn: "turn_end", anchorCombatantId: "pc-1", appliedAtRound: 0, appliedAtTurnIndex: 0 },
  };
  state = transitionNextTurn(state);
  state = transitionNextTurn(state);
  state = transitionNextTurn(state);
  assert.equal(state.entries[0].activeConcentration, null);
  assert.equal(state.entries[1].activeEffects?.some((effect) => effect.statusId === "benedizione"), false);
});

test("6. Promemoria TS (PendingSaveReminder): generati e risolti (passed con onPass vs failed)", () => {
  let state = buildTestCombatState();

  // goblin-1 applica veleno a pc-1 con savePrompt a turn_end
  state = addCombatEffectInstances(state, {
    targetIds: ["pc-1"],
    statusId: "avvelenato",
    savePrompt: {
      ability: "cos",
      dc: 12,
      timing: "turn_end",
      onPass: "remove_effect",
    },
    sourceCasterId: "goblin-1",
  });

  assert.equal(state.pendingSaveReminders?.length, 0);

  // pc-1 finisce il suo turno: scatta l'evento turn_end che emette il PendingSaveReminder!
  state = transitionNextTurn(state);
  assert.equal(state.pendingSaveReminders?.length, 1, "Deve essere emesso un PendingSaveReminder");
  const rem = state.pendingSaveReminders![0];
  assert.equal(rem.targetId, "pc-1");
  assert.equal(rem.ability, "cos");
  assert.equal(rem.dc, 12);
  assert.equal(rem.timing, "turn_end");

  // Caso 1: TS Superato (passed) con onPass === 'remove_effect'
  const statePassed = resolvePendingSaveReminder(state, rem.reminderId, "passed");
  assert.equal(statePassed.pendingSaveReminders?.length, 0, "Reminder risolto e rimosso");
  assert.equal(
    statePassed.entries[0].activeEffects?.find((e) => e.statusId === "avvelenato"),
    undefined,
    "Effetto rimosso in seguito a TS superato"
  );

  // Caso 2: TS Fallito (failed)
  const stateFailed = resolvePendingSaveReminder(state, rem.reminderId, "failed");
  assert.equal(stateFailed.pendingSaveReminders?.length, 0, "Reminder risolto e rimosso");
  assert.ok(
    stateFailed.entries[0].activeEffects?.find((e) => e.statusId === "avvelenato"),
    "Effetto ancora presente in seguito a TS fallito"
  );
});

test("7. Annullamento sicuro avanzamento turno (undoAdvanceTurn): protetto contro mutazioni concorrenti", () => {
  let state = buildTestCombatState();
  assert.equal(state.currentTurnIndex, 0);
  assert.equal(state.roundNumber, 1);

  // 1. Avanzamento turno legittimo
  const advancedState = transitionNextTurn(state);
  assert.equal(advancedState.currentTurnIndex, 1);
  assert.ok(advancedState.lastAdvanceUndoSnapshot, "Snapshot di annullamento presente");

  // 2. Annullamento immediato (nessuna mutazione concorrente) -> successo!
  const undoResult = undoAdvanceTurn(advancedState);
  assert.equal(undoResult.undone, true);
  assert.equal(undoResult.nextState.currentTurnIndex, 0);
  assert.equal(undoResult.nextState.roundNumber, 1);

  // 3. Scenario mutazione concorrente: dopo l'avanzamento arriva un danno o un comando mobile
  const mutatedState = applyCombatHpMutation(advancedState, {
    kind: "damage",
    targetId: "pc-2",
    amount: 5,
  });

  // La signature è cambiata (o lo snapshot è stato invalidato per sicurezza)
  const rejectedUndo = undoAdvanceTurn(mutatedState);
  assert.equal(rejectedUndo.undone, false, "L'annullamento deve essere rifiutato per proteggere le modifiche");
  assert.match(rejectedUndo.message, /impossibile annullare|nessun avanzamento/i);
});

test("8. Consumo manuale di effetto monouso (consumeSingleUseEffect)", () => {
  let state = buildTestCombatState();

  // Applica Ispirazione Bardica (monouso) e Scudo
  state = addCombatEffectInstances(state, {
    targetIds: ["pc-1"],
    statusId: "ispirazione-bardica",
    customLabel: "Ispirazione Bardica (d8)",
    sourceCasterId: "pc-2",
  });
  state = addCombatEffectInstances(state, {
    targetIds: ["pc-1"],
    statusId: "scudo",
    sourceCasterId: "pc-1",
  });

  assert.equal(state.entries[0].activeEffects?.length, 2);
  const bardicEffect = state.entries[0].activeEffects?.find((e) => e.statusId === "ispirazione-bardica");
  assert.ok(bardicEffect);

  // Consuma l'ispirazione bardica
  state = consumeSingleUseEffect(state, "pc-1", bardicEffect.effectId);

  assert.equal(
    state.entries[0].activeEffects?.find((e) => e.statusId === "ispirazione-bardica"),
    undefined,
    "L'ispirazione bardica usata deve essere rimossa"
  );
  assert.ok(
    state.entries[0].activeEffects?.find((e) => e.statusId === "scudo"),
    "Gli altri effetti devono rimanere intatti"
  );
});
