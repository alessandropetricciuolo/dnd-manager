import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInitiativeDraftState,
  applyCombatHpMutation,
  startCombatantConcentration,
  breakCombatantConcentration,
  addCombatEffectInstances,
  removeCombatEffectInstance,
  resolvePendingConcentrationCheck,
  computeEffectiveArmorClass,
  reconcileEntryEffectsAndConditions,
  toggleMobileConcentrationOnEntry,
} from "../state-transitions";
import {
  emptyInitiativeTrackerState,
  initiativeStateSyncSignature,
  sanitizeInitiativeTrackerState,
  type InitiativeEntry,
  type InitiativeTrackerState,
} from "@/components/gm/initiative-tracker";
import {
  isValidInitiativeRemotePayload,
  applyInitiativeRemoteCommand,
  adjustInitiativeHp,
} from "@/lib/gm-remote/initiative-commands";

function makeEntry(partial: Partial<InitiativeEntry> & { id: string; name: string }): InitiativeEntry {
  const { id, name, ...rest } = partial;
  return {
    id,
    name,
    initiative: 10,
    armorClass: 14,
    hp: 30,
    maxHp: 30,
    tempHp: 0,
    type: "pc",
    conditions: [],
    activeEffects: [],
    activeConcentration: null,
    savingThrowsSource: "sheet",
    savingThrows: { for: 0, des: 2, cos: 3, int: 0, sag: 1, car: 0 },
    damageDealt: 0,
    damageTaken: 0,
    ...rest,
  };
}

function makeState(entries: InitiativeEntry[]): InitiativeTrackerState {
  return {
    roundNumber: 1,
    currentTurnIndex: 0,
    turnElapsedSeconds: 0,
    isTurnTimerRunning: false,
    entries,
    pendingConcentrationChecks: [],
  };
}

test("1. Stessa condizione applicata da due fonti distinte: rimuoverne una mantiene l'altra", () => {
  const spider1 = makeEntry({ id: "spider-1", name: "Ragno 1", type: "monster" });
  const spider2 = makeEntry({ id: "spider-2", name: "Ragno 2", type: "monster" });
  const fighter = makeEntry({ id: "fighter-1", name: "Guerriero" });

  let state = makeState([spider1, spider2, fighter]);

  // Ragno 1 avvelena il guerriero
  state = addCombatEffectInstances(state, {
    statusId: "avvelenato",
    targetIds: [fighter.id],
    sourceCasterId: spider1.id,
    sourceName: spider1.name,
  });

  const fighterAfterFirst = state.entries.find((e) => e.id === fighter.id)!;
  assert.equal(fighterAfterFirst.activeEffects?.length, 1);
  assert.ok(fighterAfterFirst.conditions?.includes("avvelenato"));
  const firstEffectId = fighterAfterFirst.activeEffects![0].effectId;

  // Anche Ragno 2 avvelena il guerriero (due fonti distinte)
  state = addCombatEffectInstances(state, {
    statusId: "avvelenato",
    targetIds: [fighter.id],
    sourceCasterId: spider2.id,
    sourceName: spider2.name,
  });

  const fighterAfterSecond = state.entries.find((e) => e.id === fighter.id)!;
  assert.equal(fighterAfterSecond.activeEffects?.length, 2);
  assert.ok(fighterAfterSecond.conditions?.includes("avvelenato"));

  // Rimuoviamo l'effetto del Ragno 1
  state = removeCombatEffectInstance(state, fighter.id, firstEffectId);

  // L'effetto del Ragno 2 rimane ancora attivo!
  const fighterAfterRemove = state.entries.find((e) => e.id === fighter.id)!;
  assert.equal(fighterAfterRemove.activeEffects?.length, 1);
  assert.equal(fighterAfterRemove.activeEffects![0].sourceCasterId, spider2.id);
  assert.ok(fighterAfterRemove.conditions?.includes("avvelenato"));

  // Rimuoviamo anche quello del Ragno 2
  const secondEffectId = fighterAfterRemove.activeEffects![0].effectId;
  state = removeCombatEffectInstance(state, fighter.id, secondEffectId);

  const fighterClean = state.entries.find((e) => e.id === fighter.id)!;
  assert.equal(fighterClean.activeEffects?.length, 0);
  assert.ok(!fighterClean.conditions?.includes("avvelenato"));
});

test("snapshot bozza long-session conserva reminder e undo come il percorso chiamante", () => {
  const state = makeState([makeEntry({ id: "pc-1", name: "Valeros" })]);
  const reminder = {
    reminderId: "rem-1", effectId: "eff-1", targetId: "pc-1", targetName: "Valeros",
    statusId: "avvelenato", label: "Avvelenato", ability: "cos" as const, dc: 12,
    timing: "turn_end" as const, saveBonus: 2, roundNumber: 1, turnIndex: 0, createdAt: 1,
  };
  const undo = { previousTurnIndex: 0, previousRoundNumber: 1, expectedPostSignature: "sig", previousState: state, timestamp: 2 };
  const callSiteState: InitiativeTrackerState = { ...state, pendingSaveReminders: [reminder], lastAdvanceUndoSnapshot: undo };
  callSiteState.appliedProposalIds = ["proposal-draft"];
  callSiteState.lastCommandUndoSnapshot = { proposalId: "proposal-draft", expectedPostSignature: "sig", previousState: state, appliedAt: 3 };
  const draft = buildInitiativeDraftState({
    entries: callSiteState.entries,
    currentTurnIndex: callSiteState.currentTurnIndex,
    roundNumber: callSiteState.roundNumber,
    isTurnTimerRunning: callSiteState.isTurnTimerRunning,
    pendingConcentrationChecks: callSiteState.pendingConcentrationChecks,
    pendingSaveReminders: callSiteState.pendingSaveReminders,
    lastAdvanceUndoSnapshot: callSiteState.lastAdvanceUndoSnapshot,
    appliedProposalIds: callSiteState.appliedProposalIds,
    lastCommandUndoSnapshot: callSiteState.lastCommandUndoSnapshot,
  });
  assert.deepEqual(draft.pendingSaveReminders, [reminder]);
  assert.deepEqual(draft.lastAdvanceUndoSnapshot, undo);
  assert.deepEqual(draft.appliedProposalIds, ["proposal-draft"]);
  assert.deepEqual(draft.lastCommandUndoSnapshot, callSiteState.lastCommandUndoSnapshot);
});

test("2. Stesso caster con effetti a concentrazione ed effetti indipendenti: interrompere la concentrazione rimuove solo quelli a concentrazione", () => {
  const wizard = makeEntry({ id: "wiz-1", name: "Mago" });
  const rogue = makeEntry({ id: "rogue-1", name: "Ladro" });
  let state = makeState([wizard, rogue]);

  // Mago attiva concentrazione su 'Ingrandire' per il Ladro
  state = startCombatantConcentration(state, {
    casterId: wizard.id,
    spellName: "Ingrandire",
    targetIds: [rogue.id],
    effectStatusId: "ingrandire",
  });

  // Mago applica anche Ispirazione Bardica (effetto indipendente, non a concentrazione)
  state = addCombatEffectInstances(state, {
    statusId: "ispirazione-bardica",
    targetIds: [rogue.id],
    sourceCasterId: wizard.id,
    sourceName: wizard.name,
    linkToConcentration: false,
  });

  const rogueBeforeBreak = state.entries.find((e) => e.id === rogue.id)!;
  assert.equal(rogueBeforeBreak.activeEffects?.length, 2);

  const wizardBeforeBreak = state.entries.find((e) => e.id === wizard.id)!;
  assert.equal(wizardBeforeBreak.activeConcentration?.spellName, "Ingrandire");

  // Interrompiamo la concentrazione del Mago
  state = breakCombatantConcentration(state, wizard.id);

  const wizardAfterBreak = state.entries.find((e) => e.id === wizard.id)!;
  const rogueAfterBreak = state.entries.find((e) => e.id === rogue.id)!;

  assert.equal(wizardAfterBreak.activeConcentration, null);
  // L'effetto a concentrazione 'ingrandire' è stato rimosso, ma 'ispirazione-bardica' rimane!
  assert.equal(rogueAfterBreak.activeEffects?.length, 1);
  assert.equal(rogueAfterBreak.activeEffects![0].statusId, "ispirazione-bardica");
});

test("3. Concentrazione senza bersagli, sostituzione e pulizia dei check obsoleti", () => {
  const cleric = makeEntry({ id: "cleric-1", name: "Chierico", hp: 40 });
  let state = makeState([cleric]);

  // Avvia concentrazione senza bersagli (es. Guardiani Spirituali)
  state = startCombatantConcentration(state, {
    casterId: cleric.id,
    spellName: "Guardiani Spirituali",
  });

  const clericWithConc = state.entries.find((e) => e.id === cleric.id)!;
  const firstConcId = clericWithConc.activeConcentration!.concentrationId;
  assert.equal(clericWithConc.activeConcentration?.spellName, "Guardiani Spirituali");

  // Subisce 24 danni -> CD = max(10, 12) = 12
  state = applyCombatHpMutation(state, { targetId: cleric.id, kind: "damage", amount: 24 });
  assert.equal(state.pendingConcentrationChecks?.length, 1);
  assert.equal(state.pendingConcentrationChecks![0].concentrationId, firstConcId);
  assert.equal(state.pendingConcentrationChecks![0].dc, 12);

  // Il chierico decide di lanciare un nuovo incantesimo a concentrazione (Benedizione)
  // Sostituire la concentrazione deve invalidare/eliminare i check della vecchia concentrazione!
  state = startCombatantConcentration(state, {
    casterId: cleric.id,
    spellName: "Benedizione",
  });

  const clericWithNewConc = state.entries.find((e) => e.id === cleric.id)!;
  assert.equal(clericWithNewConc.activeConcentration?.spellName, "Benedizione");
  assert.notEqual(clericWithNewConc.activeConcentration?.concentrationId, firstConcId);
  // Il check pendente della vecchia concentrazione deve essere stato ripulito!
  assert.equal(state.pendingConcentrationChecks?.length, 0);

  // Risolvere un check con vecchio checkId non deve toccare la nuova concentrazione
  const staleState = resolvePendingConcentrationCheck(state, "old-check-id", "failed");
  const staleCleric = staleState.entries.find((e) => e.id === cleric.id)!;
  assert.equal(staleCleric.activeConcentration?.spellName, "Benedizione");
});

test("3b. Un combattente incapacitato non può iniziare o sostituire una concentrazione", () => {
  const statusIds = ["incapacitato", "paralizzato", "stordito", "pietrificato", "privo-di-sensi"];
  for (const statusId of statusIds) {
    const caster = makeEntry({
      id: `caster-${statusId}`,
      name: "Caster",
      activeEffects: [{
        effectId: `effect-${statusId}`,
        statusId,
        label: statusId,
        targetId: `caster-${statusId}`,
      }],
      conditions: statusId === "privo-di-sensi" ? ["privo-di-sensi"] : [statusId as NonNullable<InitiativeEntry["conditions"]>[number]],
    });
    const state = makeState([caster]);
    const started = startCombatantConcentration(state, { casterId: caster.id, spellName: "Nuova concentrazione" });
    assert.equal(started.entries[0].activeConcentration, null, `non deve concentrare con ${statusId}`);
    const linked = addCombatEffectInstances(state, {
      statusId: "benedizione",
      targetIds: [caster.id],
      sourceCasterId: caster.id,
      linkToConcentration: true,
      concentrationSpellName: "Benedizione",
    });
    assert.equal(linked.entries[0].activeConcentration, null, `non deve creare concentrazione con ${statusId}`);
  }

  for (const caster of [
    makeEntry({ id: "dead", name: "Morto", hp: 10, isDead: true }),
    makeEntry({ id: "zero", name: "A zero PF", hp: 0 }),
  ]) {
    const state = makeState([caster]);
    assert.equal(startCombatantConcentration(state, { casterId: caster.id, spellName: "No" }).entries[0].activeConcentration, null);
  }

  const alreadyConcentrating = makeEntry({
    id: "incapacitated-existing",
    name: "Caster incapacitato",
    activeEffects: [{ effectId: "paralysis", statusId: "paralizzato", label: "Paralizzato", targetId: "incapacitated-existing" }],
    activeConcentration: {
      concentrationId: "preserve-this",
      casterId: "incapacitated-existing",
      spellName: "Vecchia",
      startedRound: 1,
      linkedEffectIds: [],
    },
  });
  const preserved = startCombatantConcentration(makeState([alreadyConcentrating]), {
    casterId: alreadyConcentrating.id,
    spellName: "Nuova",
  });
  assert.equal(preserved.entries[0].activeConcentration?.concentrationId, "preserve-this");
});

test("4. Danni, PF temporanei, cura, rettifica manuale, zero PF e check pendenti", () => {
  // Caster con 30 PF e 10 tempHp
  const caster = makeEntry({ id: "c-1", name: "Caster", hp: 30, tempHp: 10 });
  let state = makeState([caster]);

  state = startCombatantConcentration(state, {
    casterId: caster.id,
    spellName: "Muro di Fuoco",
  });

  // Subisce 5 danni: assorbiti interamente dai tempHp (10 -> 5).
  // RAW 5e: subire danno mentre concentrati innesca check di concentrazione (CD 10).
  state = applyCombatHpMutation(state, { targetId: caster.id, kind: "damage", amount: 5 });
  let currentCaster = state.entries.find((e) => e.id === caster.id)!;
  assert.equal(currentCaster.tempHp, 5);
  assert.equal(currentCaster.hp, 30);
  assert.equal(state.pendingConcentrationChecks?.length, 1);
  assert.equal(state.pendingConcentrationChecks![0].dc, 10);

  // Risolviamo il check con successo
  state = resolvePendingConcentrationCheck(state, state.pendingConcentrationChecks![0].checkId, "passed");
  assert.equal(state.pendingConcentrationChecks?.length, 0);

  // Subisce 26 danni: 5 assorbiti da tempHp (tempHp -> 0), 21 ai PF reali (30 -> 9).
  // Danno totale subito = 26 -> CD = max(10, floor(26/2)) = 13
  state = applyCombatHpMutation(state, { targetId: caster.id, kind: "damage", amount: 26 });
  currentCaster = state.entries.find((e) => e.id === caster.id)!;
  assert.equal(currentCaster.tempHp, 0);
  assert.equal(currentCaster.hp, 9);
  assert.equal(state.pendingConcentrationChecks?.length, 1);
  assert.equal(state.pendingConcentrationChecks![0].dc, 13);

  // Subisce altri 26 danni senza tempHp.
  // 9 - 26 <= 0 PF! Portare a 0 PF deve rompere la concentrazione e azzerare i check pendenti!
  state = applyCombatHpMutation(state, { targetId: caster.id, kind: "damage", amount: 26 });
  currentCaster = state.entries.find((e) => e.id === caster.id)!;
  assert.equal(currentCaster.hp, 0);
  assert.equal(currentCaster.activeConcentration, null);
  assert.equal(state.pendingConcentrationChecks?.length, 0);

  // Cura: incrementa i PF fino al max
  state = applyCombatHpMutation(state, { targetId: caster.id, kind: "heal", amount: 15 });
  currentCaster = state.entries.find((e) => e.id === caster.id)!;
  assert.equal(currentCaster.hp, 15);
  assert.equal(state.pendingConcentrationChecks?.length, 0);

  // Rettifica manuale (set_exact): imposta il valore esatto senza innescare check
  state = applyCombatHpMutation(state, { targetId: caster.id, kind: "set_exact", exactHp: 25 });
  currentCaster = state.entries.find((e) => e.id === caster.id)!;
  assert.equal(currentCaster.hp, 25);
  assert.equal(state.pendingConcentrationChecks?.length, 0);
});

test("4b. Caster integro che subisce 26 danni effettivi genera CD 13 (max(10, 26/2))", () => {
  // Verifica CD 13 corretta: caster con 40 PF, nessun tempHp, 26 danni -> resta a 14 PF, CD 13
  const caster = makeEntry({ id: "c-tank", name: "Caster Robusto", hp: 40, tempHp: 0 });
  let state = makeState([caster]);

  state = startCombatantConcentration(state, {
    casterId: caster.id,
    spellName: "Pelle di Pietra",
  });

  state = applyCombatHpMutation(state, { targetId: caster.id, kind: "damage", amount: 26 });
  const currentCaster = state.entries.find((e) => e.id === caster.id)!;
  assert.equal(currentCaster.hp, 14);
  assert.equal(state.pendingConcentrationChecks?.length, 1);
  assert.equal(state.pendingConcentrationChecks![0].dc, 13); // 26 / 2 = 13!
});

test("4c. Più check di concentrazione in coda FIFO e risoluzione", () => {
  const wizard = makeEntry({ id: "wiz-2", name: "Mago Robusto", hp: 50 });
  let state = makeState([wizard]);

  state = startCombatantConcentration(state, {
    casterId: wizard.id,
    spellName: "Velocità",
  });

  // Due colpi distinti da 8 e 24 danni
  state = applyCombatHpMutation(state, { targetId: wizard.id, kind: "damage", amount: 8 });
  state = applyCombatHpMutation(state, { targetId: wizard.id, kind: "damage", amount: 24 });

  assert.equal(state.pendingConcentrationChecks?.length, 2);
  assert.equal(state.pendingConcentrationChecks![0].dc, 10); // max(10, 4)
  assert.equal(state.pendingConcentrationChecks![1].dc, 12); // max(10, 12)

  // Risolviamo il primo con successo: la concentrazione resta attiva
  const check1Id = state.pendingConcentrationChecks![0].checkId;
  state = resolvePendingConcentrationCheck(state, check1Id, "passed");
  assert.equal(state.pendingConcentrationChecks?.length, 1);
  let currentWizard = state.entries.find((e) => e.id === wizard.id)!;
  assert.equal(currentWizard.activeConcentration?.spellName, "Velocità");

  // Risolviamo il secondo con fallimento: la concentrazione cade!
  const check2Id = state.pendingConcentrationChecks![0].checkId;
  state = resolvePendingConcentrationCheck(state, check2Id, "failed");
  assert.equal(state.pendingConcentrationChecks?.length, 0);
  currentWizard = state.entries.find((e) => e.id === wizard.id)!;
  assert.equal(currentWizard.activeConcentration, null);
});

test("5. Calcolo della CA effettiva: deduplicazione dello stesso bonus e mutua esclusività coperture", () => {
  let target = makeEntry({ id: "t-1", name: "Bersaglio", armorClass: 15 });
  let state = makeState([target]);

  // Nessun effetto: CA base 15
  let acRes = computeEffectiveArmorClass(target.armorClass, target.activeEffects);
  assert.equal(acRes.effectiveAc, 15);
  assert.equal(acRes.flatDelta, 0);
  assert.equal(acRes.coverBonus, 0);

  // Aggiungiamo Scudo della Fede (+2)
  state = addCombatEffectInstances(state, {
    statusId: "scudo-della-fede",
    targetIds: [target.id],
  });
  target = state.entries.find((e) => e.id === target.id)!;
  acRes = computeEffectiveArmorClass(target.armorClass, target.activeEffects);
  assert.equal(acRes.effectiveAc, 17);

  // Aggiungiamo un secondo Scudo della Fede da un altro alleato: non deve sommarsi a +4
  state = addCombatEffectInstances(state, {
    statusId: "scudo-della-fede",
    targetIds: [target.id],
    sourceCasterId: "ally-2",
  });
  target = state.entries.find((e) => e.id === target.id)!;
  acRes = computeEffectiveArmorClass(target.armorClass, target.activeEffects);
  assert.equal(acRes.effectiveAc, 17); // Deduplicato!

  // Aggiungiamo mezza copertura (+2) e tre quarti di copertura (+5)
  // Non devono sommarsi (+7): si applica solo la copertura maggiore (+5)
  state = addCombatEffectInstances(state, {
    statusId: "copertura-mezza",
    targetIds: [target.id],
  });
  state = addCombatEffectInstances(state, {
    statusId: "copertura-tre-quarti",
    targetIds: [target.id],
  });
  target = state.entries.find((e) => e.id === target.id)!;
  acRes = computeEffectiveArmorClass(target.armorClass, target.activeEffects);

  // Base (15) + Scudo della fede (2) + Tre quarti di copertura (5) = 22
  assert.equal(acRes.effectiveAc, 22);
  assert.equal(acRes.coverBonus, 5);
  assert.equal(acRes.flatDelta, 2);
});

test("6. Snapshot legacy e sincronizzazione: stabilità della firma di uguaglianza", () => {
  // Uno scontro salvato in formato legacy con solo 'conditions: ["accecato"]'
  const legacyState: InitiativeTrackerState = {
    ...emptyInitiativeTrackerState(),
    roundNumber: 1,
    currentTurnIndex: 0,
    turnElapsedSeconds: 60,
    isTurnTimerRunning: false,
    entries: [
      {
        id: "leg-1",
        name: "Eroe Legacy",
        initiative: 15,
        armorClass: 16,
        hp: 20,
        maxHp: 20,
        type: "pc",
        conditions: ["accecato"],
      },
    ],
  };

  // Normalizziamo lo stato
  const sanitizedState = sanitizeInitiativeTrackerState(legacyState);

  // La firma di sincronizzazione deve essere deterministica ed equivalente tra lo stato prima e dopo sanitizzazione
  const sigLegacy = initiativeStateSyncSignature(legacyState);
  const sigSanitized = initiativeStateSyncSignature(sanitizedState);
  assert.equal(sigLegacy, sigSanitized);

  // Verifichiamo che i nuovi campi viaggino correttamente attraverso JSON roundtrip
  const stateWithNewFields: InitiativeTrackerState = {
    ...legacyState,
    entries: [
      {
        ...sanitizedState.entries[0],
        tempHp: 8,
        activeConcentration: {
          concentrationId: "conc-abc",
          casterId: "leg-1",
          spellName: "Benedizione",
          startedRound: 1,
          startedTurnIndex: 0,
          remainingTurns: 4,
          linkedEffectIds: ["eff-1"],
        },
        activeEffects: [
          {
            effectId: "eff-1",
            statusId: "benedizione",
            label: "Benedizione",
            targetId: "leg-1",
            concentrationId: "conc-abc",
          },
        ],
      },
    ],
    pendingConcentrationChecks: [
      {
        checkId: "check-1",
        casterId: "leg-1",
        casterName: "Eroe Legacy",
        concentrationId: "conc-abc",
        spellName: "Benedizione",
        damageTaken: 12,
        dc: 10,
        conSaveBonus: 3,
        createdAt: Date.now(),
      },
    ],
  };

  const json = JSON.stringify(stateWithNewFields);
  const reloaded = JSON.parse(json) as InitiativeTrackerState;
  const reloadedSanitized = sanitizeInitiativeTrackerState(reloaded);

  assert.equal(reloadedSanitized.entries[0].tempHp, 8);
  assert.equal(reloadedSanitized.entries[0].activeConcentration?.spellName, "Benedizione");
  assert.equal(reloadedSanitized.entries[0].activeConcentration?.startedTurnIndex, 0);
  assert.equal(reloadedSanitized.entries[0].activeConcentration?.remainingTurns, 4);
  const concentrationTicked = {
    ...reloadedSanitized,
    entries: reloadedSanitized.entries.map((entry) => entry.id === "leg-1"
      ? { ...entry, activeConcentration: { ...entry.activeConcentration!, remainingTurns: 3 } }
      : entry),
  };
  assert.notEqual(
    initiativeStateSyncSignature(reloadedSanitized),
    initiativeStateSyncSignature(concentrationTicked),
    "Il tick della concentrazione cambia la firma autorevole anche senza altri cambiamenti"
  );
  assert.equal(reloadedSanitized.entries[0].activeEffects?.length, 1);
  assert.equal(reloadedSanitized.pendingConcentrationChecks?.length, 1);
});

test("6b. La bozza condivisa conserva i check pendenti ma azzera il timer transitorio", () => {
  const caster = makeEntry({
    id: "draft-caster",
    name: "Caster",
    activeConcentration: {
      concentrationId: "draft-conc",
      casterId: "draft-caster",
      spellName: "Volare",
      startedRound: 1,
      linkedEffectIds: [],
    },
  });
  const state = {
    ...makeState([caster]),
    turnElapsedSeconds: 39,
    pendingConcentrationChecks: [{
      checkId: "draft-check",
      casterId: caster.id,
      casterName: caster.name,
      concentrationId: "draft-conc",
      spellName: "Volare",
      damageTaken: 8,
      dc: 10,
      conSaveBonus: 3,
      conSaveSource: "sheet" as const,
      createdAt: 1,
    }],
  };

  const draft = buildInitiativeDraftState(state);
  const restored = sanitizeInitiativeTrackerState(JSON.parse(JSON.stringify(draft)));
  assert.equal(draft.turnElapsedSeconds, 0);
  assert.equal(restored.pendingConcentrationChecks?.[0].checkId, "draft-check");
});

test("7. Comando mobile 'concentrato': valida e instrada alla transizione reale", () => {
  // Validazione comando remoto con 'concentrato'
  const validConcentrato = isValidInitiativeRemotePayload("initiative.toggle_condition", {
    entry_id: "ent-1",
    condition: "concentrato",
  });
  assert.equal(validConcentrato, true);

  let routedState = makeState([makeEntry({ id: "mobile-caster", name: "Mago mobile" })]);
  const routed = applyInitiativeRemoteCommand({
    nextTurn: () => {}, prevTurn: () => {}, toggleTurnTimer: () => {}, resetTurnTimer: () => {}, resetRound: () => {},
    adjustDamage: () => {}, adjustDamageTaken: () => {}, setHp: () => {}, adjustHp: () => {}, setConditions: () => {}, toggleCondition: () => {},
    toggleMobileConcentration: (entryId) => { routedState = toggleMobileConcentrationOnEntry(routedState, entryId); },
    addCombatant: () => {}, removeCombatant: () => {},
  }, "initiative.toggle_condition", { entry_id: "mobile-caster", condition: "concentrato" });
  assert.equal(routed, true);
  assert.equal(routedState.entries[0].activeConcentration?.spellName, "Concentrazione");
  const stopped = applyInitiativeRemoteCommand({
    nextTurn: () => {}, prevTurn: () => {}, toggleTurnTimer: () => {}, resetTurnTimer: () => {}, resetRound: () => {},
    adjustDamage: () => {}, adjustDamageTaken: () => {}, setHp: () => {}, adjustHp: () => {}, setConditions: () => {}, toggleCondition: () => {},
    toggleMobileConcentration: (entryId) => { routedState = toggleMobileConcentrationOnEntry(routedState, entryId); },
    addCombatant: () => {}, removeCombatant: () => {},
  }, "initiative.toggle_condition", { entry_id: "mobile-caster", condition: "concentrato" });
  assert.equal(stopped, true);
  assert.equal(routedState.entries[0].activeConcentration, null);

  // Comando con alias non autorizzato deve essere rifiutato
  const invalidAlias = isValidInitiativeRemotePayload("initiative.toggle_condition", {
    entry_id: "ent-1",
    condition: "non-esistente-arbitrario",
  });
  assert.equal(invalidAlias, false);

  // Danno da telecomando via adjustInitiativeHp applica concentrazione check
  let state = makeState([
    makeEntry({
      id: "wiz-remote",
      name: "Mago Remoto",
      hp: 30,
      activeConcentration: {
        concentrationId: "conc-rem",
        casterId: "wiz-remote",
        spellName: "Volare",
        startedRound: 1,
        linkedEffectIds: [],
      },
    }),
  ]);

  state = adjustInitiativeHp(state, "wiz-remote", -14); // -14 danni
  const remoteWiz = state.entries.find((e) => e.id === "wiz-remote")!;
  assert.equal(remoteWiz.hp, 16);
  assert.equal(state.pendingConcentrationChecks?.length, 1);
  assert.equal(state.pendingConcentrationChecks![0].dc, 10);
});
