import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isRemoteCombatCommandContextCurrent,
  isRemoteCombatCommandFresh,
  parseRemoteCombatCommandConfirm,
  parseRemoteCombatCommandRequest,
} from '../combat-command-remote';

const request = {
  request_id: 'b2e3a338-79b1-4e5c-9b99-837412ca8adc',
  text: 'Goblin 1 subisce 8 danni',
  mode: 'local',
  campaign_id: '8c662f39-6aab-4169-a51c-a7f0108729de',
  session_id: '0f7cde70-3e9b-40f5-9a63-9aa0d7d9ab8e',
  match_id: null,
  state_signature: 'fight-signature-v1',
};

test('combat request parser rejects unknown, oversized, and malformed payload fields', () => {
  assert.equal(parseRemoteCombatCommandRequest(request)?.text, request.text);
  assert.equal(parseRemoteCombatCommandRequest({ ...request, token: 'leaked-token' }), null);
  assert.equal(parseRemoteCombatCommandRequest({ ...request, mode: 'automatic' }), null);
  assert.equal(parseRemoteCombatCommandRequest({ ...request, text: ' '.repeat(2001) }), null);
  assert.equal(parseRemoteCombatCommandRequest({ ...request, match_id: 'tournament-match' }), null);
});

test('confirm parser accepts only bounded unique operation identifiers', () => {
  const confirm = {
    request_id: request.request_id,
    proposal_id: 'proposal-17',
    operation_ids: ['op-a', 'op-b'],
    campaign_id: request.campaign_id,
    session_id: request.session_id,
    match_id: null,
    state_signature: request.state_signature,
  };
  assert.deepEqual(parseRemoteCombatCommandConfirm(confirm)?.operation_ids, ['op-a', 'op-b']);
  assert.equal(parseRemoteCombatCommandConfirm({ ...confirm, operation_ids: ['op-a', 'op-a'] }), null);
  assert.equal(parseRemoteCombatCommandConfirm({ ...confirm, extra: true }), null);
});

test('requests expire and proposals are scoped to campaign, remote pairing, session, match, and fight signature', () => {
  const now = Date.now();
  assert.equal(isRemoteCombatCommandFresh(new Date(now - 29_000).toISOString(), now), true);
  assert.equal(isRemoteCombatCommandFresh(new Date(now - 31_000).toISOString(), now), false);
  assert.equal(isRemoteCombatCommandFresh(new Date(now + 6_000).toISOString(), now), false);
  const proposal = {
    requestId: request.request_id,
    proposalId: 'proposal-17',
    status: 'proposal' as const,
    campaignId: request.campaign_id,
    remoteSessionPublicId: 'remote-1',
    sessionId: request.session_id,
    matchId: null,
    stateSignature: request.state_signature,
  };
  const current = {
    campaignId: request.campaign_id,
    remoteSessionPublicId: 'remote-1',
    sessionId: request.session_id,
    matchId: null,
    stateSignature: request.state_signature,
  };
  assert.equal(isRemoteCombatCommandContextCurrent(proposal, current), true);
  assert.equal(isRemoteCombatCommandContextCurrent(proposal, { ...current, remoteSessionPublicId: 'remote-2' }), false);
  assert.equal(isRemoteCombatCommandContextCurrent(proposal, { ...current, sessionId: 'other-session' }), false);
  assert.equal(isRemoteCombatCommandContextCurrent(proposal, { ...current, stateSignature: 'changed' }), false);
});
