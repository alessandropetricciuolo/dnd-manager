import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countConfirmedSignups,
  enrichPlayerSession,
  resolveSignupTargetStatus,
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
