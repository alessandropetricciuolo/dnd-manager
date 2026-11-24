import test from 'node:test';
import assert from 'node:assert/strict';
import {
  containsObjectionableContent,
  filterWhispersByBlockedUsers,
  reconcileConfirmedWhisper,
  reconcileRealtimeWhisper,
  removeOptimisticWhisper,
} from '../whisper-state';
import { WhisperMessage } from '../../types';

const baseMsg = (overrides: Partial<WhisperMessage>): WhisperMessage => ({
  id: 'msg-1',
  campaign_id: 'camp-1',
  sender_id: 'player-1',
  receiver_id: 'gm-1',
  message: 'Apro la porta di nascosto',
  image_url: null,
  created_at: '2026-11-22T18:00:00.000Z',
  ...overrides,
});

test('deduplicates when realtime INSERT arrives before insert response', () => {
  const optimistic = baseMsg({ id: 'optimistic-1' });
  const persisted = baseMsg({ id: 'db-uuid-1' });

  const afterRealtime = reconcileRealtimeWhisper([optimistic], persisted);
  assert.equal(afterRealtime.length, 1);
  assert.equal(afterRealtime[0].id, 'db-uuid-1');

  const afterInsert = reconcileConfirmedWhisper(afterRealtime, 'optimistic-1', persisted);
  assert.equal(afterInsert.length, 1);
  assert.equal(afterInsert[0].id, 'db-uuid-1');
});

test('deduplicates when insert response arrives before realtime INSERT', () => {
  const optimistic = baseMsg({ id: 'optimistic-1' });
  const persisted = baseMsg({ id: 'db-uuid-1' });

  const afterInsert = reconcileConfirmedWhisper([optimistic], 'optimistic-1', persisted);
  assert.equal(afterInsert.length, 1);
  assert.equal(afterInsert[0].id, 'db-uuid-1');

  const afterRealtime = reconcileRealtimeWhisper(afterInsert, persisted);
  assert.equal(afterRealtime.length, 1);
  assert.equal(afterRealtime[0].id, 'db-uuid-1');
});

test('removes optimistic message when Supabase rejects or network fails', () => {
  const existing = baseMsg({ id: 'db-uuid-0', message: 'Ciao' });
  const optimistic = baseMsg({ id: 'optimistic-2', message: 'Messaggio bloccato' });

  const afterRollback = removeOptimisticWhisper([existing, optimistic], 'optimistic-2');
  assert.equal(afterRollback.length, 1);
  assert.equal(afterRollback[0].id, 'db-uuid-0');
});

test('filters out messages from or to blocked users immediately', () => {
  const m1 = baseMsg({ id: 'm1', sender_id: 'bad-user', receiver_id: 'me' });
  const m2 = baseMsg({ id: 'm2', sender_id: 'good-user', receiver_id: 'me' });
  const blocked = new Set(['bad-user']);

  const visible = filterWhispersByBlockedUsers([m1, m2], blocked);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].id, 'm2');
});

test('detects objectionable content in whispers', () => {
  assert.equal(containsObjectionableContent('Faccio un tiro di Furtività'), false);
  assert.equal(containsObjectionableContent('Sei un vaffanculo totale'), true);
});
