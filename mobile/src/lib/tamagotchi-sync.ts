import {
  TamagotchiAction,
  TamagotchiAppearance,
  TamagotchiCareStat,
  TamagotchiState,
  applyTamagotchiAction,
  applyTamagotchiAppearance,
  applyTamagotchiCareGameReward,
  applyTamagotchiDecay,
  applyTamagotchiDiceReward,
  applyTamagotchiInnkeeperTrophy,
  createInitialTamagotchiState,
  isTamagotchiCareStat,
  normalizeTamagotchiAppearance,
  normalizeTamagotchiState,
  resolveEffectiveMutationTimestamp,
} from './character-tamagotchi';
import { isValidAppearancePayload } from './tamagotchi-appearance';

export type TamagotchiMutationPayload =
  | { kind: 'action'; action: TamagotchiAction }
  | { kind: 'care_game_reward'; stat: TamagotchiCareStat; excellent: boolean }
  | { kind: 'dice_reward'; won: boolean }
  | { kind: 'innkeeper_trophy' }
  | { kind: 'set_appearance'; appearance: TamagotchiAppearance | null };

export interface PendingTamagotchiMutation {
  mutationId: string;
  payload: TamagotchiMutationPayload;
  occurredAt: string;
  enqueuedAt: string;
  attempts: number;
}

export interface TamagotchiServerSnapshot {
  state: TamagotchiState;
  lowpolyAvatarUrl: string | null;
  syncedAt: string;
}

export interface TamagotchiStorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem?(key: string): Promise<void>;
}

export type TamagotchiTransportErrorKind =
  | 'retryable'
  | 'auth_expired'
  | 'auth_rejected'
  | 'invalid_request';

export interface TamagotchiPostResponse {
  ok: true;
  state: TamagotchiState;
  canonicalState?: TamagotchiState;
  applied: boolean;
  deduplicated?: boolean;
  cooldownRemainingMs: number;
  message: string;
  lowpolyAvatarUrl: string | null;
  before?: number;
  after?: number;
  trophyUnlocked?: boolean;
}

export interface TamagotchiPostError {
  ok: false;
  errorKind: TamagotchiTransportErrorKind;
  status: number;
  errorCode?: string;
}

export type TamagotchiPostResult = TamagotchiPostResponse | TamagotchiPostError;

export interface TamagotchiGetResponse {
  ok: true;
  state: TamagotchiState;
  canonicalState?: TamagotchiState;
  lowpolyAvatarUrl: string | null;
}

export interface TamagotchiGetError {
  ok: false;
  errorKind: TamagotchiTransportErrorKind;
  status: number;
  errorCode?: string;
}

export type TamagotchiGetResult = TamagotchiGetResponse | TamagotchiGetError;

export interface TamagotchiTransport {
  getState(characterId: string): Promise<TamagotchiGetResult>;
  postMutation(
    characterId: string,
    mutation: PendingTamagotchiMutation
  ): Promise<TamagotchiPostResult>;
}

export const MAX_QUEUE_LENGTH = 40;

export function serverStorageKeyFor(userId: string, characterId: string): string {
  return `bd_tamagotchi_${userId}_${characterId}`.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function queueStorageKeyFor(userId: string, characterId: string): string {
  return `bd_tamagotchi_q_${userId}_${characterId}`.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function createMutationId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  const rand = Math.random().toString(36).slice(2, 12);
  const rand2 = Math.random().toString(36).slice(2, 8);
  return `mut_${Date.now().toString(36)}_${rand}${rand2}`;
}

export function classifyHttpStatus(status: number, errorCode?: string): TamagotchiTransportErrorKind {
  if (status === 401) {
    return 'auth_expired';
  }
  if (
    (status === 403 && (errorCode === 'forbidden' || errorCode === 'long_campaign_only')) ||
    (status === 404 && errorCode === 'not_found')
  ) {
    return 'auth_rejected';
  }
  if (status === 400 || status === 422) {
    return 'invalid_request';
  }
  return 'retryable';
}

export function formatSyncRejectionMessage(status: number, errorCode?: string): string {
  if (status === 401) {
    return 'Sessione scaduta: accedi nuovamente per sincronizzare le azioni in taverna.';
  }
  if (errorCode === 'long_campaign_only') {
    return 'La taverna è disponibile solo nelle campagne Long.';
  }
  if (status === 403) {
    return 'Non hai i permessi per modificare questo personaggio.';
  }
  if (status === 404) {
    return 'Personaggio non trovato sul server.';
  }
  return 'Azione non valida o rifiutata dal server.';
}

export async function readServerSnapshot(
  storage: TamagotchiStorageAdapter,
  userId: string,
  characterId: string
): Promise<TamagotchiServerSnapshot | null> {
  try {
    const raw = await storage.getItem(serverStorageKeyFor(userId, characterId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    if ('state' in parsed && parsed.state && typeof parsed.state === 'object') {
      return {
        state: normalizeTamagotchiState(parsed.state),
        lowpolyAvatarUrl: typeof parsed.lowpolyAvatarUrl === 'string' ? parsed.lowpolyAvatarUrl : null,
        syncedAt: typeof parsed.syncedAt === 'string' ? parsed.syncedAt : new Date().toISOString(),
      };
    }

    return {
      state: normalizeTamagotchiState(parsed),
      lowpolyAvatarUrl: null,
      syncedAt: typeof parsed.lastUpdatedAt === 'string' ? parsed.lastUpdatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function writeServerSnapshot(
  storage: TamagotchiStorageAdapter,
  userId: string,
  characterId: string,
  snapshot: TamagotchiServerSnapshot
): Promise<boolean> {
  try {
    await storage.setItem(serverStorageKeyFor(userId, characterId), JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

function isValidPendingMutation(raw: unknown): raw is PendingTamagotchiMutation {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const obj = raw as Record<string, any>;
  if (typeof obj.mutationId !== 'string' || !obj.mutationId.trim()) return false;
  if (typeof obj.occurredAt !== 'string' || !obj.payload || typeof obj.payload !== 'object') return false;
  if (obj.payload.kind === 'action' && typeof obj.payload.action === 'string') return true;
  if (
    obj.payload.kind === 'care_game_reward' &&
    isTamagotchiCareStat(obj.payload.stat) &&
    typeof obj.payload.excellent === 'boolean'
  ) {
    return true;
  }
  if (obj.payload.kind === 'dice_reward' && typeof obj.payload.won === 'boolean') return true;
  if (obj.payload.kind === 'innkeeper_trophy') return true;
  if (
    obj.payload.kind === 'set_appearance' &&
    'appearance' in obj.payload &&
    isValidAppearancePayload(obj.payload.appearance)
  ) {
    return true;
  }
  return false;
}

export async function readPendingQueue(
  storage: TamagotchiStorageAdapter,
  userId: string,
  characterId: string
): Promise<PendingTamagotchiMutation[]> {
  const raw = await storage.getItem(queueStorageKeyFor(userId, characterId));
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Invalid Tamagotchi queue');
  return parsed.filter(isValidPendingMutation);
}

export async function writePendingQueue(
  storage: TamagotchiStorageAdapter,
  userId: string,
  characterId: string,
  queue: PendingTamagotchiMutation[]
): Promise<boolean> {
  try {
    await storage.setItem(queueStorageKeyFor(userId, characterId), JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

export function applyMutationPayload(
  currentState: TamagotchiState,
  payload: TamagotchiMutationPayload,
  characterName: string,
  nowIso: string
): {
  state: TamagotchiState;
  applied: boolean;
  cooldownRemainingMs: number;
  message: string;
  before?: number;
  after?: number;
  trophyUnlocked?: boolean;
} {
  if (payload.kind === 'care_game_reward') {
    return applyTamagotchiCareGameReward(currentState, payload.stat, payload.excellent, characterName, nowIso);
  }
  if (payload.kind === 'innkeeper_trophy') {
    return applyTamagotchiInnkeeperTrophy(currentState, characterName, nowIso);
  }
  if (payload.kind === 'set_appearance') {
    return applyTamagotchiAppearance(
      currentState,
      normalizeTamagotchiAppearance(payload.appearance) ?? null,
      characterName,
      nowIso
    );
  }
  if (payload.kind === 'dice_reward') {
    return applyTamagotchiDiceReward(currentState, payload.won, characterName, nowIso);
  }
  return applyTamagotchiAction(currentState, payload.action, characterName, nowIso);
}

/**
 * Projects the effective UI state from the last confirmed canonical server state plus
 * any locally queued offline mutations, keeping timestamps and cooldowns coherent.
 */
export function projectTamagotchiState(
  serverState: TamagotchiState | null,
  pendingQueue: PendingTamagotchiMutation[],
  characterName: string,
  nowIso = new Date().toISOString()
): TamagotchiState {
  const firstActionAt = resolveEffectiveMutationTimestamp(null, pendingQueue[0]?.occurredAt, nowIso);
  let current = serverState
    ? normalizeTamagotchiState(serverState, nowIso)
    : createInitialTamagotchiState(firstActionAt);
  const appliedIds = new Set(current.appliedMutationIds ?? []);

  for (const item of pendingQueue) {
    if (appliedIds.has(item.mutationId)) {
      continue;
    }
    const effectiveAt = resolveEffectiveMutationTimestamp(current, item.occurredAt, nowIso);
    const outcome = applyMutationPayload(current, item.payload, characterName || 'Eroe', effectiveAt);
    current = outcome.state;
  }

  return applyTamagotchiDecay(current, nowIso);
}

// Per-{userId, characterId} promise-chain mutex so enqueue/flush/sync transactions never interleave
const characterLocks = new Map<string, Promise<unknown>>();

export function withCharacterSyncLock<T>(
  userId: string,
  characterId: string,
  task: () => Promise<T>
): Promise<T> {
  const key = `${userId}::${characterId}`;
  const previous = characterLocks.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  const cleanup = next.then(
    () => {
      if (characterLocks.get(key) === cleanup) {
        characterLocks.delete(key);
      }
    },
    () => {
      if (characterLocks.get(key) === cleanup) {
        characterLocks.delete(key);
      }
    }
  );
  characterLocks.set(key, cleanup);
  return next;
}

export interface FlushQueueResult {
  serverState: TamagotchiState | null;
  lowpolyAvatarUrl: string | null;
  remainingQueue: PendingTamagotchiMutation[];
  syncedCount: number;
  lastServerMessage: string | null;
  lastApplied: boolean | null;
  lastBefore?: number;
  lastAfter?: number;
  lastTrophyUnlocked?: boolean;
  rejectedError: { status: number; errorCode?: string; message: string } | null;
  authExpiredError: { status: number; errorCode?: string; message: string } | null;
  hadRetryableError: boolean;
}

async function flushPendingMutationsUnlocked(params: {
  storage: TamagotchiStorageAdapter;
  transport: TamagotchiTransport;
  userId: string;
  characterId: string;
  initialServerState: TamagotchiState | null;
  initialLowpolyAvatarUrl: string | null;
  nowIso: string;
}): Promise<FlushQueueResult> {
  let queue = await readPendingQueue(params.storage, params.userId, params.characterId);
  let serverState = params.initialServerState;
  let lowpolyAvatarUrl = params.initialLowpolyAvatarUrl;
  let syncedCount = 0;
  let lastServerMessage: string | null = null;
  let lastApplied: boolean | null = null;
  let lastBefore: number | undefined;
  let lastAfter: number | undefined;
  let lastTrophyUnlocked: boolean | undefined;
  let rejectedError: { status: number; errorCode?: string; message: string } | null = null;
  let authExpiredError: { status: number; errorCode?: string; message: string } | null = null;
  let hadRetryableError = false;

  while (queue.length > 0) {
    const head = queue[0];
    const res = await params.transport.postMutation(params.characterId, head);

    if (res.ok) {
      // Prefer non-decayed canonicalState so local projection preserves exact cooldown timestamps
      serverState = normalizeTamagotchiState(res.canonicalState ?? res.state, params.nowIso);
      lowpolyAvatarUrl = res.lowpolyAvatarUrl ?? lowpolyAvatarUrl;
      lastServerMessage = res.message || lastServerMessage;
      lastApplied = res.applied;
      lastBefore = res.before;
      lastAfter = res.after;
      lastTrophyUnlocked = res.trophyUnlocked;
      syncedCount += 1;

      // Write confirmed server snapshot FIRST, then remove head from queue (crash-safe via dedup)
      const savedSnapshot = await writeServerSnapshot(params.storage, params.userId, params.characterId, {
        state: serverState,
        lowpolyAvatarUrl,
        syncedAt: new Date().toISOString(),
      });
      if (!savedSnapshot) {
        hadRetryableError = true;
        break;
      }
      queue = queue.slice(1);
      await writePendingQueue(params.storage, params.userId, params.characterId, queue);
      continue;
    }

    if (res.errorKind === 'auth_expired') {
      // 401: KEEP pending mutations, suspend replay, invite user to re-authenticate
      authExpiredError = {
        status: res.status,
        errorCode: res.errorCode,
        message: formatSyncRejectionMessage(res.status, res.errorCode),
      };
      break;
    }

    if (res.errorKind === 'auth_rejected') {
      // 403 / 404: authorization/entity rejection is not retryable; clear queue and report
      queue = [];
      await writePendingQueue(params.storage, params.userId, params.characterId, queue);
      rejectedError = {
        status: res.status,
        errorCode: res.errorCode,
        message: formatSyncRejectionMessage(res.status, res.errorCode),
      };
      break;
    }

    if (res.errorKind === 'invalid_request') {
      queue = queue.slice(1);
      await writePendingQueue(params.storage, params.userId, params.characterId, queue);
      rejectedError = {
        status: res.status,
        errorCode: res.errorCode,
        message: formatSyncRejectionMessage(res.status, res.errorCode),
      };
      continue;
    }

    // Retryable error: keep head in queue (incrementing attempts) and stop to preserve ordering
    hadRetryableError = true;
    queue = [{ ...head, attempts: head.attempts + 1 }, ...queue.slice(1)];
    await writePendingQueue(params.storage, params.userId, params.characterId, queue);
    break;
  }

  return {
    serverState,
    lowpolyAvatarUrl,
    remainingQueue: queue,
    syncedCount,
    lastServerMessage,
    lastApplied,
    lastBefore,
    lastAfter,
    lastTrophyUnlocked,
    rejectedError,
    authExpiredError,
    hadRetryableError,
  };
}

export function enqueueAndFlushMutation(params: {
  storage: TamagotchiStorageAdapter;
  transport: TamagotchiTransport;
  userId: string;
  characterId: string;
  characterName: string;
  payload: TamagotchiMutationPayload;
  nowIso?: string;
}): Promise<{
  projectedState: TamagotchiState;
  serverState: TamagotchiState | null;
  lowpolyAvatarUrl: string | null;
  pendingCount: number;
  applied: boolean;
  message: string;
  syncSource: 'server' | 'local';
  before?: number;
  after?: number;
  queued?: boolean;
  trophyUnlocked?: boolean;
}> {
  return withCharacterSyncLock(params.userId, params.characterId, async () => {
    const nowIso = params.nowIso ?? new Date().toISOString();
    const storedSnapshot = await readServerSnapshot(params.storage, params.userId, params.characterId);
    const currentServerState = storedSnapshot?.state ?? null;
    const currentLowpolyAvatarUrl = storedSnapshot?.lowpolyAvatarUrl ?? null;
    const existingQueue = await readPendingQueue(params.storage, params.userId, params.characterId);

    const currentProjected = projectTamagotchiState(
      currentServerState,
      existingQueue,
      params.characterName,
      nowIso
    );

    // Validate locally first (e.g. cooldown check) so we never enqueue no-op actions during cooldown
    const localOutcome = applyMutationPayload(
      currentProjected,
      params.payload,
      params.characterName || 'Eroe',
      nowIso
    );
    if (!localOutcome.applied) {
      return {
        projectedState: localOutcome.state,
        serverState: currentServerState,
        lowpolyAvatarUrl: currentLowpolyAvatarUrl,
        pendingCount: existingQueue.length,
        applied: false,
        message: localOutcome.message,
        syncSource: existingQueue.length === 0 && currentServerState ? 'server' : 'local',
        before: localOutcome.before,
        after: localOutcome.after,
        queued: false,
        trophyUnlocked: localOutcome.trophyUnlocked,
      };
    }

    // Do not drop older queued items when queue is full
    if (existingQueue.length >= MAX_QUEUE_LENGTH) {
      return {
        projectedState: currentProjected,
        serverState: currentServerState,
        lowpolyAvatarUrl: currentLowpolyAvatarUrl,
        pendingCount: existingQueue.length,
        applied: false,
        message: 'Coda offline piena: riconnettiti per sincronizzare le azioni precedenti.',
        syncSource: 'local',
        queued: false,
      };
    }

    const mutation: PendingTamagotchiMutation = {
      mutationId: createMutationId(),
      payload: params.payload,
      occurredAt: nowIso,
      enqueuedAt: nowIso,
      attempts: 0,
    };

    const nextQueue = [...existingQueue, mutation];
    const persisted = await writePendingQueue(params.storage, params.userId, params.characterId, nextQueue);
    if (!persisted) {
      return {
        projectedState: currentProjected,
        serverState: currentServerState,
        lowpolyAvatarUrl: currentLowpolyAvatarUrl,
        pendingCount: existingQueue.length,
        applied: false,
        message: 'Impossibile salvare l’azione in locale. Riprova.',
        syncSource: existingQueue.length === 0 && currentServerState ? 'server' : 'local',
        queued: false,
      };
    }

    const flushRes = await flushPendingMutationsUnlocked({
      storage: params.storage,
      transport: params.transport,
      userId: params.userId,
      characterId: params.characterId,
      initialServerState: currentServerState,
      initialLowpolyAvatarUrl: currentLowpolyAvatarUrl,
      nowIso,
    });

    const projectedState = projectTamagotchiState(
      flushRes.serverState,
      flushRes.remainingQueue,
      params.characterName,
      nowIso
    );

    if (flushRes.authExpiredError) {
      return {
        projectedState,
        serverState: flushRes.serverState,
        lowpolyAvatarUrl: flushRes.lowpolyAvatarUrl,
        pendingCount: flushRes.remainingQueue.length,
        applied: true,
        message: `${localOutcome.message} (${flushRes.authExpiredError.message})`,
        syncSource: 'local',
        before: localOutcome.before,
        after: localOutcome.after,
        queued: flushRes.remainingQueue.length > 0,
        trophyUnlocked: localOutcome.trophyUnlocked,
      };
    }

    if (flushRes.rejectedError) {
      return {
        projectedState,
        serverState: flushRes.serverState,
        lowpolyAvatarUrl: flushRes.lowpolyAvatarUrl,
        pendingCount: flushRes.remainingQueue.length,
        applied: false,
        message: flushRes.rejectedError.message,
        syncSource: flushRes.serverState ? 'server' : 'local',
        queued: false,
      };
    }

    if (flushRes.hadRetryableError || flushRes.remainingQueue.length > 0) {
      return {
        projectedState,
        serverState: flushRes.serverState,
        lowpolyAvatarUrl: flushRes.lowpolyAvatarUrl,
        pendingCount: flushRes.remainingQueue.length,
        applied: true,
        message: `${localOutcome.message} (salvato offline, sincronizzazione in coda)`,
        syncSource: 'local',
        before: localOutcome.before,
        after: localOutcome.after,
        queued: true,
        trophyUnlocked: localOutcome.trophyUnlocked,
      };
    }

    return {
      projectedState,
      serverState: flushRes.serverState,
      lowpolyAvatarUrl: flushRes.lowpolyAvatarUrl,
      pendingCount: 0,
      applied: flushRes.lastApplied ?? true,
      message: flushRes.lastServerMessage || localOutcome.message,
      syncSource: 'server',
      before: flushRes.lastBefore ?? localOutcome.before,
      after: flushRes.lastAfter ?? localOutcome.after,
      queued: false,
      trophyUnlocked: flushRes.lastTrophyUnlocked ?? localOutcome.trophyUnlocked,
    };
  });
}

export function syncTamagotchiState(params: {
  storage: TamagotchiStorageAdapter;
  transport: TamagotchiTransport;
  userId: string;
  characterId: string;
  characterName: string;
  nowIso?: string;
}): Promise<{
  projectedState: TamagotchiState;
  serverState: TamagotchiState | null;
  lowpolyAvatarUrl: string | null;
  pendingCount: number;
  syncSource: 'server' | 'local';
  feedback: string | null;
}> {
  return withCharacterSyncLock(params.userId, params.characterId, async () => {
    const nowIso = params.nowIso ?? new Date().toISOString();
    const storedSnapshot = await readServerSnapshot(params.storage, params.userId, params.characterId);
    let serverState = storedSnapshot?.state ?? null;
    let lowpolyAvatarUrl = storedSnapshot?.lowpolyAvatarUrl ?? null;
    let feedback: string | null = null;

    // 1. Replay pending queue first inside the lock
    const flushRes = await flushPendingMutationsUnlocked({
      storage: params.storage,
      transport: params.transport,
      userId: params.userId,
      characterId: params.characterId,
      initialServerState: serverState,
      initialLowpolyAvatarUrl: lowpolyAvatarUrl,
      nowIso,
    });

    serverState = flushRes.serverState ?? serverState;
    lowpolyAvatarUrl = flushRes.lowpolyAvatarUrl ?? lowpolyAvatarUrl;

    if (flushRes.authExpiredError) {
      feedback = flushRes.authExpiredError.message;
    } else if (flushRes.rejectedError) {
      feedback = flushRes.rejectedError.message;
    } else if (flushRes.syncedCount > 0 && flushRes.remainingQueue.length === 0) {
      feedback =
        flushRes.syncedCount === 1
          ? '1 azione offline sincronizzata con la taverna.'
          : `${flushRes.syncedCount} azioni offline sincronizzate con la taverna.`;
    }

    // 2. Fetch latest canonical server state via GET (skip GET if 401 already suspended replay)
    let getSucceeded = false;
    if (!flushRes.authExpiredError) {
      const getRes = await params.transport.getState(params.characterId);
      if (getRes.ok) {
        getSucceeded = true;
        serverState = normalizeTamagotchiState(getRes.canonicalState ?? getRes.state, nowIso);
        lowpolyAvatarUrl = getRes.lowpolyAvatarUrl ?? lowpolyAvatarUrl;
        await writeServerSnapshot(params.storage, params.userId, params.characterId, {
          state: serverState,
          lowpolyAvatarUrl,
          syncedAt: new Date().toISOString(),
        });
      } else if ((getRes.errorKind === 'auth_expired' || getRes.errorKind === 'auth_rejected') && !feedback) {
        feedback = formatSyncRejectionMessage(getRes.status, getRes.errorCode);
      }
    }

    // 3. Project remaining queue on top of canonical serverState
    const remainingQueue = await readPendingQueue(params.storage, params.userId, params.characterId);
    const projectedState = projectTamagotchiState(
      serverState,
      remainingQueue,
      params.characterName,
      nowIso
    );

    const isFullySynced = remainingQueue.length === 0 && (getSucceeded || flushRes.syncedCount > 0);
    return {
      projectedState,
      serverState,
      lowpolyAvatarUrl,
      pendingCount: remainingQueue.length,
      syncSource: isFullySynced ? 'server' : 'local',
      feedback,
    };
  });
}
