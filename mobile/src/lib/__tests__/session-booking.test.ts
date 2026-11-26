import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canPlayerSeeCompletedSession,
  countConfirmedSignups,
  enrichPlayerSession,
  normalizeSessionPartyBadge,
  resolveSignupTargetStatus,
  validateSessionFeedbackPayload,
} from '../session-booking';

test('resolves confirmed when below capacity and waitlist when full', () => {
  const oneConfirmed = [{ status: 'confirmed' as const }, { status: 'cancelled' as const }];
  assert.equal(countConfirmedSignups(oneConfirmed), 1);
  assert.equal(resolveSignupTargetStatus(oneConfirmed, 2), 'confirmed');

  const twoConfirmed = [{ status: 'confirmed' as const }, { status: 'approved' as const }];
  assert.equal(countConfirmedSignups(twoConfirmed), 2);
  assert.equal(resolveSignupTargetStatus(twoConfirmed, 2), 'waitlist');
});

test('enrichPlayerSession distinguishes confirmed vs waitlist for current user', () => {
  const session = enrichPlayerSession(
    {
      id: 'sess-1',
      max_players: 2,
      session_signups: [
        { id: 's1', session_id: 'sess-1', player_id: 'p1', status: 'confirmed' },
        { id: 's2', session_id: 'sess-1', player_id: 'p2', status: 'approved' },
        { id: 's3', session_id: 'sess-1', player_id: 'me', status: 'waitlist' },
      ],
    },
    'me'
  );

  assert.equal(session.confirmedCount, 2);
  assert.equal(session.isFull, true);
  assert.equal(session.isConfirmed, false);
  assert.equal(session.isWaitlist, true);
});

test('canPlayerSeeCompletedSession mirrors Web Long party visibility rules', () => {
  const memberMap = { 'camp-long': 'party-alpha' };

  // Global completed session in joined Long campaign -> visible
  assert.equal(
    canPlayerSeeCompletedSession(
      {
        status: 'completed',
        campaign_id: 'camp-long',
        party_id: null,
        campaigns: { name: 'Eldaria', type: 'long' },
        isConfirmed: false,
        mySignup: null,
      },
      { isGmOrAdmin: false, memberPartyByCampaignId: memberMap }
    ),
    true
  );

  // Own party completed session -> visible
  assert.equal(
    canPlayerSeeCompletedSession(
      {
        status: 'completed',
        campaign_id: 'camp-long',
        party_id: 'party-alpha',
        campaigns: { name: 'Eldaria', type: 'long' },
        isConfirmed: false,
        mySignup: null,
      },
      { isGmOrAdmin: false, memberPartyByCampaignId: memberMap }
    ),
    true
  );

  // Other party completed session (not attended) -> hidden
  assert.equal(
    canPlayerSeeCompletedSession(
      {
        status: 'completed',
        campaign_id: 'camp-long',
        party_id: 'party-bravo',
        campaigns: { name: 'Eldaria', type: 'long' },
        isConfirmed: false,
        mySignup: null,
      },
      { isGmOrAdmin: false, memberPartyByCampaignId: memberMap }
    ),
    false
  );
});

test('normalizeSessionPartyBadge and validateSessionFeedbackPayload handle inputs safely', () => {
  const badge = normalizeSessionPartyBadge([{ name: 'Compagnia del Corvo', color: '#22c55e' }]);
  assert.deepEqual(badge, { name: 'Compagnia del Corvo', color: '#22c55e' });

  assert.equal(
    validateSessionFeedbackPayload({ sessionRating: 5, campaignRating: 4, comment: ' Ottima! ' }).valid,
    true
  );
  assert.equal(
    validateSessionFeedbackPayload({ sessionRating: 0, campaignRating: 4 }).valid,
    false
  );
});
