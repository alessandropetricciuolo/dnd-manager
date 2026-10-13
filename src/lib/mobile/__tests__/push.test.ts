import test from 'node:test';
import assert from 'node:assert/strict';
import { pushDeviceSchema, pushPayload, retryAt, ticketOutcome, type PushJob } from '../push';
import { createMobilePushDeviceHandlers } from '../push-device-http';
import { createPushDispatchGetHandler } from '../push-dispatch-http';
import { dispatchMobilePushes, type PushDispatchDependencies } from '../push-dispatch';

test('device registration cannot choose actor or accept arbitrary token', () => {
  const device = { token: 'ExpoPushToken[abc_123]', platform: 'ios', enabled: true, whispers: true, sessions: false };
  assert.equal(pushDeviceSchema.safeParse(device).success, true);
  assert.equal(pushDeviceSchema.safeParse({ ...device, user_id: 'another-user' }).success, false);
  assert.equal(pushDeviceSchema.safeParse({ ...device, token: 'https://evil.example' }).success, false);
});
test('lock screen payload is generic and contains only navigation identifiers', () => {
  const job: PushJob = { id: 1, user_id: 'user', token: 'ExpoPushToken[abc]', kind: 'whisper', campaign_id: 'campaign', session_id: null, source_id: 'message', attempts: 1 };
  const payload = pushPayload(job);
  assert.equal(payload.body, 'Hai ricevuto un nuovo sussurro.');
  assert.deepEqual(payload.data, { kind: 'whisper', campaignId: 'campaign', sessionId: null, recipientId: 'user' });
  assert.equal('message' in payload.data, false);
});
test('tickets distinguish accepted, transient failure and invalid devices; retry bounded', () => {
  assert.equal(ticketOutcome({ status: 'ok', id: 'receipt' }, 1).status, 'ticket');
  assert.equal(ticketOutcome(undefined, 1).status, 'pending');
  assert.equal(ticketOutcome(undefined, 5).status, 'failed');
  assert.equal(ticketOutcome({ status: 'error', details: { error: 'DeviceNotRegistered' } }, 1).status, 'failed');
  assert.equal(Date.parse(retryAt(20, 0)), 3600000);
});

const sampleDevice = { token: 'ExpoPushToken[abc_123]', platform: 'ios' as const, enabled: true, whispers: true, sessions: false };

test('device routes reject invalid bearer before creating a database client', async () => {
  let created = 0;
  const handlers = createMobilePushDeviceHandlers(() => { created++; throw new Error('must not initialize'); });
  const request = new Request('https://local/api/mobile/push/device', { method: 'PUT', body: JSON.stringify(sampleDevice) });
  assert.equal((await handlers.PUT(request)).status, 401);
  assert.equal(created, 0);
});

test('device registration derives ownership from the authenticated actor, and DELETE is actor scoped', async () => {
  const registered: unknown[] = [];
  const deleted: unknown[] = [];
  const handlers = createMobilePushDeviceHandlers(() => ({
    getUser: async (accessToken) => accessToken === 'valid' ? { id: 'actor-1' } : null,
    upsertDevice: async (userId, device) => { registered.push({ userId, device }); },
    deleteDevice: async (userId, token) => { deleted.push({ userId, token }); },
  }));

  const forged = new Request('https://local/api/mobile/push/device', {
    method: 'PUT', headers: { authorization: 'Bearer valid', 'content-type': 'application/json' },
    body: JSON.stringify({ ...sampleDevice, user_id: 'victim' }),
  });
  assert.equal((await handlers.PUT(forged)).status, 400);
  assert.equal(registered.length, 0);

  const valid = new Request('https://local/api/mobile/push/device', {
    method: 'PUT', headers: { authorization: 'Bearer valid', 'content-type': 'application/json' }, body: JSON.stringify(sampleDevice),
  });
  assert.equal((await handlers.PUT(valid)).status, 200);
  assert.deepEqual(registered, [{ userId: 'actor-1', device: sampleDevice }]);

  const remove = new Request('https://local/api/mobile/push/device', {
    method: 'DELETE', headers: { authorization: 'Bearer valid', 'content-type': 'application/json' }, body: JSON.stringify({ token: sampleDevice.token }),
  });
  assert.equal((await handlers.DELETE(remove)).status, 200);
  assert.deepEqual(deleted, [{ userId: 'actor-1', token: sampleDevice.token }]);
});

const whisperJob: PushJob = { id: 42, user_id: 'actor-1', token: sampleDevice.token, kind: 'whisper', campaign_id: 'campaign-1', session_id: null, source_id: 'message-1', attempts: 1 };
function dispatchDeps(overrides: Partial<PushDispatchDependencies> = {}): PushDispatchDependencies {
  return {
    listReceiptJobs: async () => [], fetchReceipts: async () => ({}), claimJobs: async () => [whisperJob],
    getPreferences: async () => ({ enabled: true, whispers: true, sessions: true, notificationsDisabled: false }),
    isEligible: async () => true, send: async () => ({ status: 'ok', id: 'ticket-1' }),
    disableDevice: async () => {}, updateJob: async () => {}, ...overrides,
  };
}

test('dispatch skips disabled preferences and jobs whose access changed', async () => {
  for (const deps of [
    dispatchDeps({ getPreferences: async () => ({ enabled: false, whispers: true, sessions: true, notificationsDisabled: false }) }),
    dispatchDeps({ getPreferences: async () => ({ enabled: true, whispers: true, sessions: true, notificationsDisabled: true }) }),
    dispatchDeps({ isEligible: async () => false }),
  ]) {
    const updates: any[] = [];
    let sent = 0;
    const result = await dispatchMobilePushes({ ...deps, send: async () => { sent++; return { status: 'ok', id: 'ticket' }; }, updateJob: async (id, patch) => { updates.push({ id, patch }); } }, 1000);
    assert.equal(result.accepted, 0);
    assert.equal(sent, 0);
    assert.equal(updates[0].patch.status, 'skipped');
  }
});

test('dispatch retries temporary ticket failures and disables only the owning device on DeviceNotRegistered', async () => {
  const updated: any[] = [];
  const disabled: any[] = [];
  await dispatchMobilePushes(dispatchDeps({
    send: async () => undefined,
    updateJob: async (id, patch) => { updated.push({ id, patch }); },
  }), 1000);
  assert.equal(updated[0].patch.status, 'pending');
  assert.equal(updated[0].patch.available_at, retryAt(1, 1000));

  updated.length = 0;
  await dispatchMobilePushes(dispatchDeps({
    send: async () => ({ status: 'error', details: { error: 'DeviceNotRegistered' } }),
    disableDevice: async (userId, token) => { disabled.push({ userId, token }); },
    updateJob: async (id, patch) => { updated.push({ id, patch }); },
  }), 1000);
  assert.deepEqual(disabled, [{ userId: 'actor-1', token: sampleDevice.token }]);
  assert.equal(updated[0].patch.status, 'failed');
});

test('receipt DeviceNotRegistered disables the device within the original actor scope', async () => {
  const disabled: any[] = [];
  const updates: any[] = [];
  const receiptJob = { id: 7, token: sampleDevice.token, user_id: 'old-owner', ticket_id: 'receipt-7', sent_at: new Date(0).toISOString() };
  await dispatchMobilePushes(dispatchDeps({
    listReceiptJobs: async () => [receiptJob],
    fetchReceipts: async () => ({ 'receipt-7': { status: 'error', details: { error: 'DeviceNotRegistered' } } }),
    claimJobs: async () => [],
    disableDevice: async (userId, token) => { disabled.push({ userId, token }); },
    updateJob: async (id, patch) => { updates.push({ id, patch }); },
  }), Date.now());
  assert.deepEqual(disabled, [{ userId: 'old-owner', token: sampleDevice.token }]);
  assert.deepEqual(updates, [{ id: 7, patch: { status: 'failed', last_error: 'DeviceNotRegistered' } }]);
});

test('dispatch cron route rejects invalid bearer without initializing dependencies', async () => {
  let created = 0;
  const handler = createPushDispatchGetHandler(() => 'cron-secret', () => { created++; throw new Error('not expected'); });
  const response = await handler(new Request('https://local/api/mobile/push/dispatch', { headers: { authorization: 'Bearer wrong' } }));
  assert.equal(response.status, 401);
  assert.equal(created, 0);
});
