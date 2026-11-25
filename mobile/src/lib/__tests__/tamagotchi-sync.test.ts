import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DICE_REWARD_HAPPINESS_COMPLETE,
  DICE_REWARD_HAPPINESS_WIN,
  applyTamagotchiAction,
  applyTamagotchiDecay,
  applyTamagotchiDiceReward,
  createInitialTamagotchiState,
  getTamagotchiActionCooldownRemainingMs,
  normalizeTamagotchiState,
  type TamagotchiState,
} from '../character-tamagotchi';
import {
  MAX_QUEUE_LENGTH,
  TamagotchiStorageAdapter,
  TamagotchiTransport,
  classifyHttpStatus,
  enqueueAndFlushMutation,
  readPendingQueue,
  syncTamagotchiState,
  writePendingQueue,
  writeServerSnapshot,
  type PendingTamagotchiMutation,
} from '../tamagotchi-sync';
import {
  extractRawStateVersion,
  parseTamagotchiPostBody,
  processTamagotchiPostMutation,
  type TamagotchiCasStore,
} from '../tamagotchi-mutation-processor';

function createMemoryStorage(opts?: { failNextQueueWrite?: boolean }): TamagotchiStorageAdapter & {
  data: Map<string, string>;
  failNextQueueWrite: boolean;
} {
  const data = new Map<string, string>();
  const adapter = {
    data,
    failNextQueueWrite: Boolean(opts?.failNextQueueWrite),
    async getItem(key: string) {
      return data.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      if (adapter.failNextQueueWrite && key.startsWith('bd_tamagotchi_q_')) {
        adapter.failNextQueueWrite = false;
        throw new Error('SecureStore write failed');
      }
      data.set(key, value);
    },
    async deleteItem(key: string) {
      data.delete(key);
    },
  };
  return adapter;
}

class InMemoryServerBackend {
  rawState: unknown;
  characterName = 'Eldrin';
  lowpolyAvatarUrl: string | null = 'https://cdn.example/eldrin.png';
  failNextPostWith: 'network' | 'lost_response' | 'auth_401' | 'auth_403' | null = null;
  forceOneCasConflict = false;
  postDelayMs = 0;
  postCalls = 0;

  constructor(initialState: TamagotchiState | null) {
    this.rawState = initialState ? JSON.parse(JSON.stringify(initialState)) : null;
  }

  createCasStore(): TamagotchiCasStore {
    let conflictedOnce = false;
    return {
      readRawState: async () => ({
        rawState: this.rawState ? JSON.parse(JSON.stringify(this.rawState)) : null,
      }),
      compareAndSwap: async (expectedStateVersion, nextState) => {
        if (this.forceOneCasConflict && !conflictedOnce) {
          conflictedOnce = true;
          this.forceOneCasConflict = false;
          return { swapped: false };
        }
        const currentVersion = extractRawStateVersion(this.rawState);
        if (currentVersion !== expectedStateVersion) {
          return { swapped: false };
        }
        this.rawState = JSON.parse(JSON.stringify(nextState));
        return { swapped: true };
      },
    };
  }

  createTransport(getNowIso: () => string): TamagotchiTransport {
    return {
      getState: async () => {
        const nowIso = getNowIso();
        const canonical = normalizeTamagotchiState(this.rawState, nowIso);
        return {
          ok: true,
          state: applyTamagotchiDecay(canonical, nowIso),
          canonicalState: canonical,
          lowpolyAvatarUrl: this.lowpolyAvatarUrl,
        };
      },
      postMutation: async (_characterId, mutation: PendingTamagotchiMutation) => {
        this.postCalls += 1;
        if (this.postDelayMs > 0) {
          await new Promise((r) => setTimeout(r, this.postDelayMs));
        }
        const mode = this.failNextPostWith;
        this.failNextPostWith = null;

        if (mode === 'network') {
          return { ok: false, errorKind: 'retryable', status: 0, errorCode: 'network_error' };
        }
        if (mode === 'auth_401') {
          return { ok: false, errorKind: 'auth_expired', status: 401, errorCode: 'unauthorized' };
        }
        if (mode === 'auth_403') {
          return { ok: false, errorKind: 'auth_rejected', status: 403, errorCode: 'long_campaign_only' };
        }

        const parsed = parseTamagotchiPostBody(
          mutation.payload.kind === 'care_game_reward'
            ? {
                kind: 'care_game_reward',
                stat: mutation.payload.stat,
                excellent: mutation.payload.excellent,
                mutationId: mutation.mutationId,
                occurredAt: mutation.occurredAt,
              }
            : mutation.payload.kind === 'innkeeper_trophy'
              ? {
                  kind: 'innkeeper_trophy',
                  mutationId: mutation.mutationId,
                  occurredAt: mutation.occurredAt,
                }
              : mutation.payload.kind === 'set_appearance'
                ? {
                    kind: 'set_appearance',
                    appearance: mutation.payload.appearance,
                    mutationId: mutation.mutationId,
                    occurredAt: mutation.occurredAt,
                  }
                : mutation.payload.kind === 'dice_reward'
                ? {
                    kind: 'dice_reward',
                    won: mutation.payload.won,
                    mutationId: mutation.mutationId,
                    occurredAt: mutation.occurredAt,
                  }
                : {
                    kind: 'action',
                    action: mutation.payload.action,
                    mutationId: mutation.mutationId,
                    occurredAt: mutation.occurredAt,
                  }
        );
        assert.ok(parsed, 'parsed payload should be valid');

        const res = await processTamagotchiPostMutation({
          initialRawState: this.rawState ? JSON.parse(JSON.stringify(this.rawState)) : null,
          characterName: this.characterName,
          lowpolyAvatarUrl: this.lowpolyAvatarUrl,
          parsed,
          store: this.createCasStore(),
          serverNowIso: getNowIso(),
        });

        if (mode === 'lost_response') {
          return { ok: false, errorKind: 'retryable', status: 0, errorCode: 'network_timeout' };
        }

        if (res.status !== 200) {
          return { ok: false, errorKind: 'retryable', status: res.status, errorCode: res.body.error };
        }

        return {
          ok: true,
          state: res.body.state,
          canonicalState: res.body.canonicalState,
          applied: res.body.applied,
          deduplicated: res.body.deduplicated,
          cooldownRemainingMs: res.body.cooldownRemainingMs,
          message: res.body.message,
          lowpolyAvatarUrl: res.body.lowpolyAvatarUrl,
          ...(res.body.before !== undefined ? { before: res.body.before } : {}),
          ...(res.body.after !== undefined ? { after: res.body.after } : {}),
          ...(res.body.trophyUnlocked !== undefined ? { trophyUnlocked: res.body.trophyUnlocked } : {}),
        };
      },
    };
  }
}

describe('Tamagotchi offline queue, persistence, replay, and deduplication', () => {
  it('retains care actions when the server returns a generic 404 for the route', async () => {
    const storage = createMemoryStorage();
    const nowIso = '2026-11-23T10:00:00.000Z';
    const backend = new InMemoryServerBackend(null);
    const missingRoute = async () => ({
      ok: false as const,
      errorKind: classifyHttpStatus(404),
      status: 404,
    });
    const params = {
      storage,
      transport: { getState: missingRoute, postMutation: missingRoute },
      characterName: 'Eldrin',
      userId: 'user-1',
      characterId: 'char-1',
      nowIso,
    };

    for (const action of ['feed', 'rest', 'clean'] as const) {
      const result = await enqueueAndFlushMutation({
        ...params,
        payload: { kind: 'action', action },
      });
      assert.equal(result.applied, true);
      assert.match(result.message, /salvato offline/);
    }
    const offline = await syncTamagotchiState(params);
    assert.equal(offline.pendingCount, 3);
    assert.equal(offline.projectedState.interactionsCount, 3);

    const online = await syncTamagotchiState({
      ...params,
      transport: backend.createTransport(() => nowIso),
    });
    assert.equal(online.pendingCount, 0);
    assert.equal(online.projectedState.interactionsCount, 3);
    assert.equal(classifyHttpStatus(404, 'not_found'), 'auth_rejected');
  });

  it('queues, projects, syncs via CAS, and resets set_appearance mutations offline and online', async () => {
    const storage = createMemoryStorage();
    let nowIso = '2026-11-23T11:00:00.000Z';
    const backend = new InMemoryServerBackend(null);
    const transport = backend.createTransport(() => nowIso);
    const params = {
      storage,
      transport,
      characterName: 'Eldrin',
      userId: 'user-1',
      characterId: 'char-1',
    };

    backend.failNextPostWith = 'network';
    const customLook = {
      skinSwatch: 'moon_elf' as const,
      eyeSwatch: 'emerald' as const,
      hairStyle: 'ponytail' as const,
      outfitSwatch: 'ranger_green' as const,
      facialFeature: 'eyepatch' as const,
      mainHand: 'bow' as const,
      offHand: 'dagger' as const,
    };

    const offlineSave = await enqueueAndFlushMutation({
      ...params,
      nowIso,
      payload: { kind: 'set_appearance', appearance: customLook },
    });
    assert.equal(offlineSave.applied, true);
    assert.equal(offlineSave.queued, true);
    assert.equal(offlineSave.pendingCount, 1);
    assert.deepEqual(offlineSave.projectedState.appearance, customLook);

    // Syncs cleanly once online even across a CAS retry
    backend.forceOneCasConflict = true;
    const synced = await syncTamagotchiState({ ...params, nowIso });
    assert.equal(synced.pendingCount, 0);
    assert.deepEqual(synced.projectedState.appearance, customLook);

    // Rejects invalid appearance payloads at parser boundary
    assert.equal(
      parseTamagotchiPostBody({ kind: 'set_appearance', appearance: { mainHand: 'lightsaber' } }),
      null
    );

    // Resetting appearance back to null clears server state
    nowIso = '2026-11-23T11:05:00.000Z';
    const resetRes = await enqueueAndFlushMutation({
      ...params,
      nowIso,
      payload: { kind: 'set_appearance', appearance: null },
    });
    assert.equal(resetRes.applied, true);
    assert.equal(resetRes.pendingCount, 0);
    assert.equal(resetRes.projectedState.appearance, undefined);
  });

  it('preserves the original spacing of the first offline actions without a server snapshot', async () => {
    const storage = createMemoryStorage();
    const backend = new InMemoryServerBackend(null);
    let nowIso = '2026-11-23T10:00:00.000Z';
    const params = {
      storage,
      transport: backend.createTransport(() => nowIso),
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
    };
    const reward = { kind: 'dice_reward', won: true } as const;
    backend.failNextPostWith = 'network';
    const first = await enqueueAndFlushMutation({ ...params, payload: reward, nowIso });
    assert.equal(first.pendingCount, 1);

    nowIso = '2026-11-23T10:16:00.000Z';
    backend.failNextPostWith = 'network';
    const second = await enqueueAndFlushMutation({ ...params, payload: reward, nowIso });
    assert.equal(second.pendingCount, 2);
    assert.equal(second.projectedState.interactionsCount, 2);

    nowIso = '2026-11-23T11:00:00.000Z';
    const result = await syncTamagotchiState({ ...params, nowIso });
    assert.equal(result.pendingCount, 0);
    assert.equal(result.projectedState.interactionsCount, 2);
    assert.equal(result.projectedState.lastActionByType.play, '2026-11-23T10:16:00.000Z');
  });

  it('persists offline actions, survives GET/reopen without loss, and preserves offline cooldowns via canonicalState', async () => {
    const storage = createMemoryStorage();
    const t0 = '2026-11-23T10:00:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), hunger: 50, happiness: 50 };
    const backend = new InMemoryServerBackend(initial);
    let nowIso = t0;
    const transport = backend.createTransport(() => nowIso);

    const sync0 = await syncTamagotchiState({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
      nowIso,
    });
    assert.equal(sync0.syncSource, 'server');
    assert.equal(sync0.projectedState.hunger, 50);

    // Go offline: POST fails with network error
    nowIso = '2026-11-23T10:05:00.000Z';
    backend.failNextPostWith = 'network';
    const offlineAction = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
      payload: { kind: 'action', action: 'feed' },
      nowIso,
    });

    assert.equal(offlineAction.applied, true);
    assert.equal(offlineAction.syncSource, 'local');
    assert.equal(offlineAction.pendingCount, 1);
    assert.match(offlineAction.message, /offline/i);

    // Refresh while POST still fails: GET returns non-decayed canonicalState (lastUpdatedAt = 10:00),
    // so local projection still places 'feed' at 10:05 (NOT promoted to 10:15!)
    nowIso = '2026-11-23T10:15:00.000Z';
    backend.failNextPostWith = 'network';
    const reopenOffline = await syncTamagotchiState({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
      nowIso,
    });
    assert.equal(reopenOffline.pendingCount, 1);
    assert.equal(reopenOffline.projectedState.lastActionByType.feed, '2026-11-23T10:05:00.000Z');

    // Network returns at 10:30: replay commits 'feed' at 10:05, so 20-min cooldown is already expired
    nowIso = '2026-11-23T10:30:00.000Z';
    const reconnect = await syncTamagotchiState({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
      nowIso,
    });
    assert.equal(reconnect.pendingCount, 0);
    assert.equal(reconnect.syncSource, 'server');
    assert.equal(reconnect.serverState?.interactionsCount, 1);
    assert.equal(getTamagotchiActionCooldownRemainingMs(reconnect.projectedState, 'feed', nowIso), 0);
  });

  it('deduplicates atomically on lost response so retry does not double-apply', async () => {
    const storage = createMemoryStorage();
    const t0 = '2026-11-23T11:00:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), happiness: 40 };
    const backend = new InMemoryServerBackend(initial);
    const transport = backend.createTransport(() => t0);
    await writeServerSnapshot(storage, 'user-1', 'char-1', {
      state: initial,
      lowpolyAvatarUrl: null,
      syncedAt: t0,
    });

    backend.failNextPostWith = 'lost_response';
    const firstAttempt = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
      payload: { kind: 'action', action: 'pet' },
      nowIso: t0,
    });

    assert.equal(firstAttempt.pendingCount, 1);
    assert.equal(normalizeTamagotchiState(backend.rawState, t0).interactionsCount, 1);
    assert.equal(normalizeTamagotchiState(backend.rawState, t0).happiness, 44);

    const retrySync = await syncTamagotchiState({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
      nowIso: t0,
    });

    assert.equal(retrySync.pendingCount, 0);
    assert.equal(retrySync.syncSource, 'server');
    assert.equal(retrySync.serverState?.interactionsCount, 1);
    assert.equal(retrySync.serverState?.happiness, 44);
  });

  it('persists idempotent applied=false receipt on cooldown rejection without promoting lastUpdatedAt', async () => {
    const t0 = '2026-11-23T11:00:00.000Z';
    const t5 = '2026-11-23T11:05:00.000Z';
    const t30 = '2026-11-23T11:30:00.000Z';
    const initial = applyTamagotchiAction(createInitialTamagotchiState(t0), 'feed', 'Eldrin', t0).state;
    const backend = new InMemoryServerBackend(initial);

    const parsed = parseTamagotchiPostBody({
      kind: 'action',
      action: 'feed',
      mutationId: 'mut-cooldown-1',
      occurredAt: t5,
    });
    assert.ok(parsed);

    // First attempt at t5 hits cooldown: persisted receipt has applied=false, lastUpdatedAt stays t0
    const res1 = await processTamagotchiPostMutation({
      initialRawState: backend.rawState,
      characterName: 'Eldrin',
      lowpolyAvatarUrl: null,
      parsed,
      store: backend.createCasStore(),
      serverNowIso: t5,
    });
    assert.equal(res1.status, 200);
    if (res1.status === 200) {
      assert.equal(res1.body.applied, false);
      assert.equal(res1.body.deduplicated, false);
      assert.equal(res1.body.canonicalState.lastUpdatedAt, t0);
    }

    // Retry of the SAME mutationId even at t30 (after cooldown expired!) returns the idempotent applied=false receipt
    const res2 = await processTamagotchiPostMutation({
      initialRawState: backend.rawState,
      characterName: 'Eldrin',
      lowpolyAvatarUrl: null,
      parsed,
      store: backend.createCasStore(),
      serverNowIso: t30,
    });
    assert.equal(res2.status, 200);
    if (res2.status === 200) {
      assert.equal(res2.body.applied, false);
      assert.equal(res2.body.deduplicated, true);
    }
  });

  it('keeps pending queue on 401 auth_expired, but clears queue on 403 auth_rejected', async () => {
    const storage = createMemoryStorage();
    const t0 = '2026-11-23T12:00:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), hunger: 50 };
    const backend = new InMemoryServerBackend(initial);
    const transport = backend.createTransport(() => t0);
    await writeServerSnapshot(storage, 'user-1', 'char-1', {
      state: initial,
      lowpolyAvatarUrl: null,
      syncedAt: t0,
    });

    // 401 preserves pending queue and asks user to sign in again
    backend.failNextPostWith = 'auth_401';
    const res401 = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
      payload: { kind: 'action', action: 'feed' },
      nowIso: t0,
    });
    assert.equal(res401.pendingCount, 1);
    assert.match(res401.message, /Sessione scaduta/i);

    // 403 clears queue and reverts projection
    backend.failNextPostWith = 'auth_403';
    const res403 = await syncTamagotchiState({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
      nowIso: t0,
    });
    assert.equal(res403.pendingCount, 0);
    assert.match(res403.feedback ?? '', /Long/i);
  });

  it('serializes overlapping sync and enqueue so neither overwrites the queue', async () => {
    const storage = createMemoryStorage();
    const t0 = '2026-11-23T12:30:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), hunger: 50, happiness: 50 };
    const backend = new InMemoryServerBackend(initial);
    backend.postDelayMs = 15;
    const transport = backend.createTransport(() => t0);
    await writeServerSnapshot(storage, 'user-1', 'char-1', {
      state: initial,
      lowpolyAvatarUrl: null,
      syncedAt: t0,
    });

    // Seed one pending item so sync starts flushing
    await writePendingQueue(storage, 'user-1', 'char-1', [
      {
        mutationId: 'mut-pre-1',
        payload: { kind: 'action', action: 'feed' },
        occurredAt: t0,
        enqueuedAt: t0,
        attempts: 0,
      },
    ]);

    // Launch sync and a new enqueue concurrently
    const [syncRes, enqRes] = await Promise.all([
      syncTamagotchiState({
        storage,
        transport,
        userId: 'user-1',
        characterId: 'char-1',
        characterName: 'Eldrin',
        nowIso: t0,
      }),
      enqueueAndFlushMutation({
        storage,
        transport,
        userId: 'user-1',
        characterId: 'char-1',
        characterName: 'Eldrin',
        payload: { kind: 'action', action: 'pet' },
        nowIso: t0,
      }),
    ]);

    assert.equal(syncRes.pendingCount, 0);
    assert.equal(enqRes.pendingCount, 0);
    assert.equal(normalizeTamagotchiState(backend.rawState, t0).interactionsCount, 2);
  });

  it('fails explicitly without claiming saved when queue persistence fails or queue is full', async () => {
    const storage = createMemoryStorage({ failNextQueueWrite: true });
    const t0 = '2026-11-23T12:45:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), hunger: 50 };
    const backend = new InMemoryServerBackend(initial);
    const transport = backend.createTransport(() => t0);
    await writeServerSnapshot(storage, 'user-1', 'char-1', {
      state: initial,
      lowpolyAvatarUrl: null,
      syncedAt: t0,
    });

    const storageFail = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
      payload: { kind: 'action', action: 'feed' },
      nowIso: t0,
    });
    assert.equal(storageFail.applied, false);
    assert.equal(storageFail.pendingCount, 0);
    assert.match(storageFail.message, /Impossibile salvare/i);

    // Fill queue to MAX_QUEUE_LENGTH and verify oldest item is NOT dropped
    const fullQueue: PendingTamagotchiMutation[] = Array.from({ length: MAX_QUEUE_LENGTH }, (_, i) => ({
      mutationId: `mut-fill-${i}`,
      payload: { kind: 'action', action: 'clean' },
      occurredAt: t0,
      enqueuedAt: t0,
      attempts: 0,
    }));
    await writePendingQueue(storage, 'user-1', 'char-1', fullQueue);

    const fullRes = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-1',
      characterName: 'Eldrin',
      payload: { kind: 'action', action: 'feed' },
      nowIso: t0,
    });
    assert.equal(fullRes.applied, false);
    assert.match(fullRes.message, /piena/i);
    const afterQueue = await readPendingQueue(storage, 'user-1', 'char-1');
    assert.equal(afterQueue.length, MAX_QUEUE_LENGTH);
    assert.equal(afterQueue[0]?.mutationId, 'mut-fill-0');
  });

  it('retries scalar stateVersion CAS conflict and supports legacy clients without mutationId', async () => {
    const t0 = '2026-11-23T13:00:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), hunger: 50 };
    const backend = new InMemoryServerBackend(initial);
    backend.forceOneCasConflict = true;

    const legacyParsed = parseTamagotchiPostBody({ action: 'feed' });
    assert.ok(legacyParsed);
    assert.equal(legacyParsed.mutationId, undefined);

    const res = await processTamagotchiPostMutation({
      initialRawState: backend.rawState,
      characterName: 'Eldrin',
      lowpolyAvatarUrl: null,
      parsed: legacyParsed,
      store: backend.createCasStore(),
      serverNowIso: t0,
    });

    assert.equal(res.status, 200);
    if (res.status === 200) {
      assert.equal(res.body.applied, true);
      assert.equal(res.body.state.hunger, 62);
      assert.equal(res.body.canonicalState.stateVersion, 1);
    }
  });
});

describe('Tamagotchi dice reward and shared play cooldown', () => {
  it('awards +16 happiness on hand completion and +24 on victory with diary entry', () => {
    const t0 = '2026-11-23T14:00:00.000Z';
    const base = { ...createInitialTamagotchiState(t0), happiness: 50 };

    const completeRes = applyTamagotchiDiceReward(base, false, 'Eldrin', t0);
    assert.equal(completeRes.applied, true);
    assert.equal(completeRes.state.happiness, 50 + DICE_REWARD_HAPPINESS_COMPLETE);
    assert.equal(completeRes.state.recentLogs[0]?.action, 'play');
    assert.match(completeRes.state.recentLogs[0]?.text ?? '', /\+16 Umore/);

    const winRes = applyTamagotchiDiceReward(base, true, 'Eldrin', t0);
    assert.equal(winRes.applied, true);
    assert.equal(winRes.state.happiness, 50 + DICE_REWARD_HAPPINESS_WIN);
    assert.match(winRes.state.recentLogs[0]?.text ?? '', /vinto.*\+24 Umore/i);
  });

  it('shares the 15-minute cooldown between play action and dice reward', () => {
    const t0 = '2026-11-23T15:00:00.000Z';
    const t5min = '2026-11-23T15:05:00.000Z';
    const t16min = '2026-11-23T15:16:00.000Z';
    const base = { ...createInitialTamagotchiState(t0), happiness: 50 };

    const diceRes = applyTamagotchiDiceReward(base, true, 'Eldrin', t0);
    assert.equal(diceRes.applied, true);
    assert.ok(getTamagotchiActionCooldownRemainingMs(diceRes.state, 'play', t5min) > 0);

    const blockedDice = applyTamagotchiDiceReward(diceRes.state, true, 'Eldrin', t5min);
    assert.equal(blockedDice.applied, false);
    assert.equal(blockedDice.state.interactionsCount, diceRes.state.interactionsCount);

    const blockedPlay = applyTamagotchiAction(diceRes.state, 'play', 'Eldrin', t5min);
    assert.equal(blockedPlay.applied, false);

    const afterCooldown = applyTamagotchiDiceReward(diceRes.state, false, 'Eldrin', t16min);
    assert.equal(afterCooldown.applied, true);
  });
});

describe('Innkeeper trophy (Dado d’Ottone) sync, offline queue, idempotency, and preservation', () => {
  it('unlocks on first victory offline (even without prior server snapshot), persists on reconnect, and survives GET/sync', async () => {
    const storage = createMemoryStorage();
    const backend = new InMemoryServerBackend(null);
    let nowIso = '2026-11-23T16:00:00.000Z';
    const params = {
      storage,
      transport: backend.createTransport(() => nowIso),
      userId: 'user-1',
      characterId: 'char-trophy-1',
      characterName: 'Eldrin',
    };

    backend.failNextPostWith = 'network';
    const offlineClaim = await enqueueAndFlushMutation({
      ...params,
      payload: { kind: 'innkeeper_trophy' },
      nowIso,
    });
    assert.equal(offlineClaim.applied, true);
    assert.equal(offlineClaim.pendingCount, 1);
    assert.equal(offlineClaim.syncSource, 'local');
    assert.equal(offlineClaim.projectedState.innkeeperTrophyUnlockedAt, '2026-11-23T16:00:00.000Z');
    assert.equal(offlineClaim.projectedState.lastActionByType.play, undefined);

    // Second offline claim while first is still queued is blocked locally without enqueuing a duplicate
    nowIso = '2026-11-23T16:02:00.000Z';
    const secondOfflineClaim = await enqueueAndFlushMutation({
      ...params,
      payload: { kind: 'innkeeper_trophy' },
      nowIso,
    });
    assert.equal(secondOfflineClaim.applied, false);
    assert.equal(secondOfflineClaim.pendingCount, 1);
    assert.match(secondOfflineClaim.message, /già sbloccato/i);

    // Reconnect and sync: trophy is committed on server and persists across subsequent GET sync
    nowIso = '2026-11-23T16:10:00.000Z';
    const reconnect = await syncTamagotchiState({ ...params, nowIso });
    assert.equal(reconnect.pendingCount, 0);
    assert.equal(reconnect.syncSource, 'server');
    assert.equal(reconnect.projectedState.innkeeperTrophyUnlockedAt, '2026-11-23T16:00:00.000Z');
    assert.equal(reconnect.serverState?.innkeeperTrophyUnlockedAt, '2026-11-23T16:00:00.000Z');
    assert.equal(reconnect.serverState?.recentLogs.length, 1);

    // Fresh sync from another session/reopen preserves trophy
    nowIso = '2026-11-23T18:00:00.000Z';
    const reopen = await syncTamagotchiState({ ...params, nowIso });
    assert.equal(reopen.syncSource, 'server');
    assert.equal(reopen.projectedState.innkeeperTrophyUnlockedAt, '2026-11-23T16:00:00.000Z');
  });

  it('is idempotent on lost response, two clients, and even after receipt rotation', async () => {
    const t0 = '2026-11-23T17:00:00.000Z';
    const t1 = '2026-11-23T17:01:00.000Z';
    const t2 = '2026-11-23T17:05:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), hunger: 55, happiness: 60, energy: 65, hygiene: 70 };
    const backend = new InMemoryServerBackend(initial);

    // Client 1 claims trophy, response is lost
    const storage1 = createMemoryStorage();
    await writeServerSnapshot(storage1, 'user-1', 'char-trophy-2', {
      state: initial,
      lowpolyAvatarUrl: null,
      syncedAt: t0,
    });
    backend.failNextPostWith = 'lost_response';
    const firstAttempt = await enqueueAndFlushMutation({
      storage: storage1,
      transport: backend.createTransport(() => t0),
      userId: 'user-1',
      characterId: 'char-trophy-2',
      characterName: 'Eldrin',
      payload: { kind: 'innkeeper_trophy' },
      nowIso: t0,
    });
    assert.equal(firstAttempt.pendingCount, 1);
    assert.equal(normalizeTamagotchiState(backend.rawState, t0).innkeeperTrophyUnlockedAt, t0);

    // Client 1 retries same mutationId -> deduplicated, single diary entry
    const retry1 = await syncTamagotchiState({
      storage: storage1,
      transport: backend.createTransport(() => t0),
      userId: 'user-1',
      characterId: 'char-trophy-2',
      characterName: 'Eldrin',
      nowIso: t0,
    });
    assert.equal(retry1.pendingCount, 0);
    assert.equal(retry1.serverState?.innkeeperTrophyUnlockedAt, t0);
    assert.equal(retry1.serverState?.recentLogs.length, 1);

    // Client 2 (stale snapshot without trophy) tries to claim with a new mutationId -> server rejects cleanly
    const parsedClient2 = parseTamagotchiPostBody({
      kind: 'innkeeper_trophy',
      mutationId: 'client-2-trophy-claim',
      occurredAt: t1,
    });
    assert.ok(parsedClient2);
    const resClient2 = await processTamagotchiPostMutation({
      initialRawState: backend.rawState,
      characterName: 'Eldrin',
      lowpolyAvatarUrl: null,
      parsed: parsedClient2,
      store: backend.createCasStore(),
      serverNowIso: t1,
    });
    assert.equal(resClient2.status, 200);
    if (resClient2.status === 200) {
      assert.equal(resClient2.body.applied, false);
      assert.equal(resClient2.body.deduplicated, false);
      assert.equal(resClient2.body.canonicalState.innkeeperTrophyUnlockedAt, t0);
      assert.equal(resClient2.body.canonicalState.recentLogs.length, 1);
      assert.match(resClient2.body.message, /già sbloccato/i);
    }

    // Rotate appliedMutationIds past 50 entries so original receipt is evicted
    const rotatedState: TamagotchiState = {
      ...normalizeTamagotchiState(backend.rawState, t2),
      appliedMutationIds: Array.from({ length: 50 }, (_, i) => `rotated-mut-${i}`),
      appliedMutationOutcomes: {},
    };
    backend.rawState = rotatedState;

    const parsedAfterRotation = parseTamagotchiPostBody({
      kind: 'innkeeper_trophy',
      mutationId: 'post-rotation-claim',
      occurredAt: t2,
    });
    assert.ok(parsedAfterRotation);
    const resAfterRotation = await processTamagotchiPostMutation({
      initialRawState: backend.rawState,
      characterName: 'Eldrin',
      lowpolyAvatarUrl: null,
      parsed: parsedAfterRotation,
      store: backend.createCasStore(),
      serverNowIso: t2,
    });
    assert.equal(resAfterRotation.status, 200);
    if (resAfterRotation.status === 200) {
      assert.equal(resAfterRotation.body.applied, false);
      assert.equal(resAfterRotation.body.canonicalState.innkeeperTrophyUnlockedAt, t0);
      assert.equal(resAfterRotation.body.canonicalState.recentLogs.length, 1);
      assert.match(resAfterRotation.body.message, /già sbloccato/i);
    }
  });

  it('does not trigger play cooldown or alter bars, and is preserved across normal actions', async () => {
    const t0 = '2026-11-23T19:00:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), hunger: 50, happiness: 50, energy: 50, hygiene: 50 };
    const backend = new InMemoryServerBackend(initial);
    const storage = createMemoryStorage();
    const transport = backend.createTransport(() => t0);
    await writeServerSnapshot(storage, 'user-1', 'char-trophy-3', {
      state: initial,
      lowpolyAvatarUrl: null,
      syncedAt: t0,
    });

    const claim = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-trophy-3',
      characterName: 'Eldrin',
      payload: { kind: 'innkeeper_trophy' },
      nowIso: t0,
    });
    assert.equal(claim.applied, true);
    assert.equal(claim.projectedState.innkeeperTrophyUnlockedAt, t0);
    assert.equal(claim.projectedState.hunger, 50);
    assert.equal(claim.projectedState.happiness, 50);
    assert.equal(claim.projectedState.energy, 50);
    assert.equal(claim.projectedState.hygiene, 50);
    assert.equal(getTamagotchiActionCooldownRemainingMs(claim.projectedState, 'play', t0), 0);

    // Normal 'play' action immediately after succeeds and preserves innkeeperTrophyUnlockedAt
    const playAfter = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-trophy-3',
      characterName: 'Eldrin',
      payload: { kind: 'action', action: 'play' },
      nowIso: t0,
    });
    assert.equal(playAfter.applied, true);
    assert.equal(playAfter.projectedState.innkeeperTrophyUnlockedAt, t0);
    assert.equal(playAfter.serverState?.innkeeperTrophyUnlockedAt, t0);
  });
});

describe('Care mini-game rewards (care_game_reward): +8/+12, cap 100, independent cooldowns, trophy, validation, offline/lost-response', () => {
  it('awards +8 base and +12 excellent, caps at 100 with real before/after, and only alters the rewarded bar', async () => {
    const t0 = '2026-11-23T20:00:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), hunger: 50, energy: 95, happiness: 60, hygiene: 40 };
    const backend = new InMemoryServerBackend(initial);
    const storage = createMemoryStorage();
    const transport = backend.createTransport(() => t0);
    await writeServerSnapshot(storage, 'user-1', 'char-care-1', {
      state: initial,
      lowpolyAvatarUrl: null,
      syncedAt: t0,
    });

    // +8 base on hunger: 50 -> 58, other bars untouched
    const hungerRes = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-1',
      characterName: 'Eldrin',
      payload: { kind: 'care_game_reward', stat: 'hunger', excellent: false },
      nowIso: t0,
    });
    assert.equal(hungerRes.applied, true);
    assert.equal(hungerRes.queued, false);
    assert.equal(hungerRes.before, 50);
    assert.equal(hungerRes.after, 66);
    assert.equal(hungerRes.trophyUnlocked, false);
    assert.equal(hungerRes.projectedState.hunger, 66);
    assert.equal(hungerRes.projectedState.energy, 95);
    assert.equal(hungerRes.projectedState.happiness, 60);
    assert.equal(hungerRes.projectedState.hygiene, 40);
    assert.equal(hungerRes.projectedState.recentLogs.length, 1);

    // +24 excellent on energy capped at 100: 95 -> 100 (real delta +5)
    const energyRes = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-1',
      characterName: 'Eldrin',
      payload: { kind: 'care_game_reward', stat: 'energy', excellent: true },
      nowIso: t0,
    });
    assert.equal(energyRes.applied, true);
    assert.equal(energyRes.before, 95);
    assert.equal(energyRes.after, 100);
    assert.equal(energyRes.projectedState.energy, 100);
    assert.equal(energyRes.projectedState.hunger, 66);
    assert.equal(energyRes.projectedState.lastCareGameRewardByStat?.hunger, t0);
    assert.equal(energyRes.projectedState.lastCareGameRewardByStat?.energy, t0);
  });

  it('enforces 15-minute cooldown per stat independently of other mini-games and quick actions', async () => {
    const t0 = '2026-11-23T21:00:00.000Z';
    const t5 = '2026-11-23T21:05:00.000Z';
    const t16 = '2026-11-23T21:16:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), hunger: 50, hygiene: 50 };
    const backend = new InMemoryServerBackend(initial);
    const storage = createMemoryStorage();
    let nowIso = t0;
    const transport = backend.createTransport(() => nowIso);
    await writeServerSnapshot(storage, 'user-1', 'char-care-2', {
      state: initial,
      lowpolyAvatarUrl: null,
      syncedAt: t0,
    });

    // Quick action 'feed' does NOT block 'hunger' care game
    const quickFeed = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-2',
      characterName: 'Eldrin',
      payload: { kind: 'action', action: 'feed' },
      nowIso,
    });
    assert.equal(quickFeed.applied, true);

    const hungerGame1 = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-2',
      characterName: 'Eldrin',
      payload: { kind: 'care_game_reward', stat: 'hunger', excellent: false },
      nowIso,
    });
    assert.equal(hungerGame1.applied, true);
    assert.equal(hungerGame1.before, 62);
    assert.equal(hungerGame1.after, 78);

    // 5 min later: hunger care game is on cooldown (before === after, message mentions wait),
    // but hygiene care game and quick 'clean' action both succeed independently
    nowIso = t5;
    const hungerCooldown = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-2',
      characterName: 'Eldrin',
      payload: { kind: 'care_game_reward', stat: 'hunger', excellent: true },
      nowIso,
    });
    assert.equal(hungerCooldown.applied, false);
    assert.equal(hungerCooldown.before, hungerCooldown.after);
    assert.match(hungerCooldown.message, /10 min/);

    const hygieneGame = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-2',
      characterName: 'Eldrin',
      payload: { kind: 'care_game_reward', stat: 'hygiene', excellent: true },
      nowIso,
    });
    assert.equal(hygieneGame.applied, true);
    assert.equal(hygieneGame.after, (hygieneGame.before ?? 0) + 24);

    const quickClean = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-2',
      characterName: 'Eldrin',
      payload: { kind: 'action', action: 'clean' },
      nowIso,
    });
    assert.equal(quickClean.applied, true);

    // 16 min after t0: hunger care game cooldown expired
    nowIso = t16;
    const hungerGame2 = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-2',
      characterName: 'Eldrin',
      payload: { kind: 'care_game_reward', stat: 'hunger', excellent: false },
      nowIso,
    });
    assert.equal(hungerGame2.applied, true);
    assert.equal(hungerGame2.after, (hungerGame2.before ?? 0) + 16);
  });

  it('unlocks Dado d’Ottone on first happiness victory even during happiness cooldown, idempotently', async () => {
    const t0 = '2026-11-23T22:00:00.000Z';
    const t3 = '2026-11-23T22:03:00.000Z';
    const t6 = '2026-11-23T22:06:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), happiness: 50 };
    const backend = new InMemoryServerBackend(initial);
    const storage = createMemoryStorage();
    let nowIso = t0;
    const transport = backend.createTransport(() => nowIso);
    await writeServerSnapshot(storage, 'user-1', 'char-care-trophy', {
      state: initial,
      lowpolyAvatarUrl: null,
      syncedAt: t0,
    });

    // Loss (excellent: false) gives +8 Umore and starts happiness 15m cooldown, does NOT unlock trophy
    const lossRes = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-trophy',
      characterName: 'Eldrin',
      payload: { kind: 'care_game_reward', stat: 'happiness', excellent: false },
      nowIso,
    });
    assert.equal(lossRes.applied, true);
    assert.equal(lossRes.before, 50);
    assert.equal(lossRes.after, 66);
    assert.equal(lossRes.trophyUnlocked, false);
    assert.equal(lossRes.projectedState.innkeeperTrophyUnlockedAt, undefined);

    // 3 min later (still on cooldown): first victory (excellent: true) unlocks trophy without changing happiness or resetting cooldown
    nowIso = t3;
    const winDuringCooldown = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-trophy',
      characterName: 'Eldrin',
      payload: { kind: 'care_game_reward', stat: 'happiness', excellent: true },
      nowIso,
    });
    assert.equal(winDuringCooldown.applied, true);
    assert.equal(winDuringCooldown.trophyUnlocked, true);
    assert.equal(winDuringCooldown.before, winDuringCooldown.after);
    assert.equal(winDuringCooldown.projectedState.innkeeperTrophyUnlockedAt, t3);
    assert.equal(winDuringCooldown.projectedState.lastCareGameRewardByStat?.happiness, t0);
    assert.match(winDuringCooldown.message, /Dado d’Ottone/);
    assert.match(winDuringCooldown.message, /12 min/);

    // 6 min later (still on cooldown, trophy already unlocked): no-op rejected locally
    nowIso = t6;
    const secondWinDuringCooldown = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-trophy',
      characterName: 'Eldrin',
      payload: { kind: 'care_game_reward', stat: 'happiness', excellent: true },
      nowIso,
    });
    assert.equal(secondWinDuringCooldown.applied, false);
    assert.equal(secondWinDuringCooldown.trophyUnlocked, false);
    assert.equal(secondWinDuringCooldown.before, secondWinDuringCooldown.after);
    assert.equal(secondWinDuringCooldown.projectedState.innkeeperTrophyUnlockedAt, t3);
  });

  it('rejects malformed care_game_reward payloads in parseTamagotchiPostBody', () => {
    assert.equal(parseTamagotchiPostBody({ kind: 'care_game_reward', stat: 'invalid', excellent: true }), null);
    assert.equal(parseTamagotchiPostBody({ kind: 'care_game_reward', stat: 'hunger', excellent: 'yes' }), null);
    assert.equal(parseTamagotchiPostBody({ kind: 'care_game_reward', stat: 'hunger' }), null);
    assert.equal(parseTamagotchiPostBody({ kind: 'unknown_kind', action: 'feed' }), null);
    assert.ok(parseTamagotchiPostBody({ kind: 'care_game_reward', stat: 'hygiene', excellent: false }));
  });

  it('supports offline queue with real before/after + queued flag and deduplicates on lost response', async () => {
    const t0 = '2026-11-23T23:00:00.000Z';
    const initial = { ...createInitialTamagotchiState(t0), happiness: 60 };
    const backend = new InMemoryServerBackend(initial);
    const storage = createMemoryStorage();
    const transport = backend.createTransport(() => t0);
    await writeServerSnapshot(storage, 'user-1', 'char-care-offline', {
      state: initial,
      lowpolyAvatarUrl: null,
      syncedAt: t0,
    });

    // Lost response: server committed +12 and trophy, client keeps mutation queued with real before/after and queued=true
    backend.failNextPostWith = 'lost_response';
    const attempt1 = await enqueueAndFlushMutation({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-offline',
      characterName: 'Eldrin',
      payload: { kind: 'care_game_reward', stat: 'happiness', excellent: true },
      nowIso: t0,
    });
    assert.equal(attempt1.applied, true);
    assert.equal(attempt1.queued, true);
    assert.equal(attempt1.pendingCount, 1);
    assert.equal(attempt1.before, 60);
    assert.equal(attempt1.after, 84);
    assert.equal(attempt1.trophyUnlocked, true);

    // Replay deduplicates without double-applying
    const replay = await syncTamagotchiState({
      storage,
      transport,
      userId: 'user-1',
      characterId: 'char-care-offline',
      characterName: 'Eldrin',
      nowIso: t0,
    });
    assert.equal(replay.pendingCount, 0);
    assert.equal(replay.syncSource, 'server');
    assert.equal(replay.serverState?.happiness, 84);
    assert.equal(replay.serverState?.interactionsCount, 1);
    assert.equal(replay.serverState?.innkeeperTrophyUnlockedAt, t0);
    assert.equal(replay.serverState?.lastCareGameRewardByStat?.happiness, t0);
  });
});
