import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLocalCombatCommand } from '@/lib/fight-mode/command-parser';
import { applyCombatHpMutation, initiativeStateSyncSignature } from '@/lib/fight-mode/state-transitions';
import type { InitiativeTrackerState } from '@/components/gm/initiative-tracker';
import { createRemoteCombatCommandController } from '../combat-command-controller';

const campaignId = '8c662f39-6aab-4169-a51c-a7f0108729de';
const sessionId = '0f7cde70-3e9b-40f5-9a63-9aa0d7d9ab8e';
const requestId = 'b2e3a338-79b1-4e5c-9b99-837412ca8adc';
const remoteId = 'remote-session-1';

function combatState(): InitiativeTrackerState {
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
    entries: [{
      id: 'pc-1', name: 'Kaelen', type: 'pc', hp: 30, maxHp: 30, tempHp: 5,
      armorClass: 16, initiative: 18, conditions: [], activeEffects: [], activeConcentration: null,
      damageTaken: 0,
    }],
  };
}

function requestPayload(state: InitiativeTrackerState, mode: 'local' | 'ai' = 'local', id = requestId) {
  return {
    request_id: id,
    text: 'infliggi 12 danni a Kaelen',
    mode,
    campaign_id: campaignId,
    session_id: sessionId,
    match_id: null,
    state_signature: initiativeStateSyncSignature(state),
  };
}

function makeController(options: { parseAi?: (text: string, state: InitiativeTrackerState, signature: string) => Promise<{ success: true; proposal: ReturnType<typeof parseLocalCombatCommand> }> } = {}) {
  let state = combatState();
  let context = { campaignId, sessionId, remoteSessionPublicId: remoteId, matchId: null as string | null };
  let snapshot: ReturnType<ReturnType<typeof createRemoteCombatCommandController>['getSnapshot']> = null;
  let appliedTransitions = 0;
  const commitState = (next: InitiativeTrackerState) => { state = next; appliedTransitions += 1; };
  const controller = createRemoteCombatCommandController({
    getContext: () => context,
    getState: () => state,
    setState: commitState,
    onChange: (next) => { snapshot = next; },
    parseAi: options.parseAi ?? (async (text, current, signature) => ({
      success: true,
      proposal: parseLocalCombatCommand(text, current.entries.map(({ id, name, type }) => ({ id, name, type })), signature),
    })),
  });
  return {
    controller,
    get state() { return state; },
    set state(next: InitiativeTrackerState) { state = next; },
    updateState(update: (current: InitiativeTrackerState) => InitiativeTrackerState) { commitState(update(state)); },
    get context() { return context; },
    set context(next: typeof context) { context = next; },
    get snapshot() { return snapshot; },
    get appliedTransitions() { return appliedTransitions; },
  };
}

test('request -> proposal -> phone/PC race applies once through the shared transition and publishes an applied receipt', async () => {
  const harness = makeController();
  await harness.controller.request(requestPayload(harness.state), remoteId);
  const firstProposal = harness.snapshot;
  await harness.controller.request(requestPayload(harness.state), remoteId);
  assert.equal(harness.snapshot?.proposalId, firstProposal?.proposalId, 'a retry with the same request ID must reuse its proposal');
  const proposalSnapshot = harness.snapshot;
  assert.equal(proposalSnapshot?.status, 'proposal');
  assert.ok(proposalSnapshot?.proposal);

  const payload = {
    request_id: requestId,
    proposal_id: proposalSnapshot!.proposalId,
    operation_ids: proposalSnapshot!.proposal!.operations.map(({ id }) => id),
    campaign_id: campaignId,
    session_id: sessionId,
    match_id: null,
    state_signature: initiativeStateSyncSignature(harness.state),
  };
  harness.controller.confirm(payload, remoteId);
  harness.controller.confirmOnPc();
  harness.controller.confirm(payload, remoteId);

  assert.equal(harness.appliedTransitions, 1);
  assert.equal(harness.snapshot?.status, 'applied');
  assert.ok(harness.snapshot?.receipt?.appliedAt);
  const kaelen = harness.state.entries[0];
  assert.equal(kaelen.tempHp, 0);
  assert.equal(kaelen.hp, 23);
  assert.equal(kaelen.damageTaken, 12);
});

test('stale state and changed session reject confirmation without a second transition', async () => {
  const harness = makeController();
  await harness.controller.request(requestPayload(harness.state), remoteId);
  const pending = harness.snapshot!;
  harness.updateState((current) => applyCombatHpMutation(current, { targetId: 'pc-1', kind: 'damage', amount: 1 }));
  const transitionCountAfterExternalMutation = harness.appliedTransitions;
  harness.controller.confirm({
    request_id: requestId,
    proposal_id: pending.proposalId,
    operation_ids: pending.proposal!.operations.map(({ id }) => id),
    campaign_id: campaignId,
    session_id: sessionId,
    match_id: null,
    state_signature: initiativeStateSyncSignature(harness.state),
  }, remoteId);
  assert.equal(harness.appliedTransitions, transitionCountAfterExternalMutation, 'stale confirmation must not apply another transition');
  assert.equal(harness.snapshot?.status, 'rejected');

  harness.state = combatState();
  await harness.controller.request(requestPayload(harness.state, 'local', '5c9bfb64-5e75-4f4d-8f50-37d021c55d96'), remoteId);
  harness.context = { ...harness.context, sessionId: '21df0bef-0813-49de-a782-34848ad59c87' };
  harness.controller.onSessionContextChange(harness.context.sessionId);
  assert.equal(harness.snapshot?.status, 'rejected');
});

test('session change during an AI request invalidates the late response', async () => {
  let resolveAi!: (value: { success: true; proposal: ReturnType<typeof parseLocalCombatCommand> }) => void;
  const aiPromise = new Promise<{ success: true; proposal: ReturnType<typeof parseLocalCombatCommand> }>((resolve) => { resolveAi = resolve; });
  const harness = makeController({ parseAi: async () => aiPromise });
  const pendingRequest = harness.controller.request(requestPayload(harness.state, 'ai'), remoteId);
  assert.equal(harness.snapshot?.status, 'awaiting');
  harness.context = { ...harness.context, sessionId: '21df0bef-0813-49de-a782-34848ad59c87' };
  harness.controller.onSessionContextChange(harness.context.sessionId);
  resolveAi({
    success: true,
    proposal: parseLocalCombatCommand('infliggi 12 danni a Kaelen', [{ id: 'pc-1', name: 'Kaelen', type: 'pc' }], initiativeStateSyncSignature(harness.state)),
  });
  await pendingRequest;
  assert.equal(harness.snapshot?.status, 'rejected');
  assert.equal(harness.snapshot?.proposal, undefined);
  assert.equal(harness.appliedTransitions, 0);
});
