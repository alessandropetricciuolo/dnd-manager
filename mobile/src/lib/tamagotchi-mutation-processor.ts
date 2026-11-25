import {
  applyTamagotchiAction,
  applyTamagotchiAppearance,
  applyTamagotchiCareGameReward,
  applyTamagotchiDecay,
  applyTamagotchiDiceReward,
  applyTamagotchiInnkeeperTrophy,
  isTamagotchiCareStat,
  normalizeTamagotchiAppearance,
  normalizeTamagotchiState,
  recordAppliedMutation,
  resolveEffectiveMutationTimestamp,
  type TamagotchiAction,
  type TamagotchiAppearance,
  type TamagotchiCareStat,
  type TamagotchiMutationOutcomeRecord,
  type TamagotchiState,
} from './character-tamagotchi';
import { isValidAppearancePayload } from './tamagotchi-appearance';

const VALID_ACTIONS = new Set<TamagotchiAction>(['feed', 'play', 'rest', 'clean', 'pet']);
const MAX_CAS_ATTEMPTS = 5;

export type ParsedTamagotchiPostBody =
  | { kind: 'action'; action: TamagotchiAction; mutationId?: string; occurredAt?: string }
  | { kind: 'care_game_reward'; stat: TamagotchiCareStat; excellent: boolean; mutationId?: string; occurredAt?: string }
  | { kind: 'dice_reward'; won: boolean; mutationId?: string; occurredAt?: string }
  | { kind: 'innkeeper_trophy'; mutationId?: string; occurredAt?: string }
  | { kind: 'set_appearance'; appearance: TamagotchiAppearance | null; mutationId?: string; occurredAt?: string };

export function parseTamagotchiPostBody(body: unknown): ParsedTamagotchiPostBody | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const obj = body as Record<string, unknown>;

  let mutationId: string | undefined;
  if (obj.mutationId !== undefined && obj.mutationId !== null) {
    if (typeof obj.mutationId !== 'string') return null;
    const trimmed = obj.mutationId.trim();
    if (!trimmed || trimmed.length > 128) return null;
    mutationId = trimmed;
  }

  let occurredAt: string | undefined;
  if (obj.occurredAt !== undefined && obj.occurredAt !== null) {
    if (typeof obj.occurredAt !== 'string' || !Number.isFinite(Date.parse(obj.occurredAt))) {
      return null;
    }
    occurredAt = obj.occurredAt;
  }

  if (obj.kind === 'care_game_reward') {
    if (!isTamagotchiCareStat(obj.stat) || typeof obj.excellent !== 'boolean') {
      return null;
    }
    return {
      kind: 'care_game_reward',
      stat: obj.stat,
      excellent: obj.excellent,
      mutationId,
      occurredAt,
    };
  }

  if (obj.kind === 'innkeeper_trophy') {
    return { kind: 'innkeeper_trophy', mutationId, occurredAt };
  }

  if (obj.kind === 'set_appearance') {
    if (!('appearance' in obj) || !isValidAppearancePayload(obj.appearance)) {
      return null;
    }
    const normalized = normalizeTamagotchiAppearance(obj.appearance);
    return {
      kind: 'set_appearance',
      appearance: normalized ?? null,
      mutationId,
      occurredAt,
    };
  }

  if (obj.kind === 'dice_reward') {
    if (typeof obj.won !== 'boolean') return null;
    return { kind: 'dice_reward', won: obj.won, mutationId, occurredAt };
  }

  if (obj.kind !== undefined && obj.kind !== 'action') {
    return null;
  }

  // Default / legacy client payload: { action: 'feed' | ... }
  const action = obj.action;
  if (typeof action !== 'string' || !VALID_ACTIONS.has(action as TamagotchiAction)) {
    return null;
  }
  return { kind: 'action', action: action as TamagotchiAction, mutationId, occurredAt };
}

export function extractRawStateVersion(rawState: unknown): string | null {
  if (!rawState || typeof rawState !== 'object' || Array.isArray(rawState)) {
    return null;
  }
  const version = (rawState as Record<string, unknown>).stateVersion;
  if (typeof version === 'number' && Number.isInteger(version) && version >= 0) {
    return String(version);
  }
  if (typeof version === 'string' && /^\d+$/.test(version)) {
    return version;
  }
  return null;
}

export interface TamagotchiCasStore {
  readRawState(): Promise<{ rawState: unknown; error?: string }>;
  compareAndSwap(
    expectedStateVersion: string | null,
    nextState: TamagotchiState
  ): Promise<{ swapped: boolean; error?: string }>;
}

export async function processTamagotchiPostMutation(params: {
  initialRawState: unknown;
  characterName: string;
  lowpolyAvatarUrl: string | null;
  parsed: ParsedTamagotchiPostBody;
  store: TamagotchiCasStore;
  serverNowIso?: string;
}): Promise<
  | {
      status: 200;
      body: {
        state: TamagotchiState;
        canonicalState: TamagotchiState;
        applied: boolean;
        deduplicated: boolean;
        cooldownRemainingMs: number;
        message: string;
        lowpolyAvatarUrl: string | null;
        before?: number;
        after?: number;
        trophyUnlocked?: boolean;
      };
    }
  | { status: 409 | 500; body: { error: string } }
> {
  const serverNowIso = params.serverNowIso ?? new Date().toISOString();
  let rawState = params.initialRawState;

  for (let attempt = 0; attempt < MAX_CAS_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      const fresh = await params.store.readRawState();
      if (fresh.error) {
        return { status: 500, body: { error: 'database_error' } };
      }
      rawState = fresh.rawState;
    }

    const expectedVersion = extractRawStateVersion(rawState);
    const initialTime = rawState == null
      ? resolveEffectiveMutationTimestamp(null, params.parsed.occurredAt, serverNowIso)
      : serverNowIso;
    const current = normalizeTamagotchiState(rawState, initialTime);

    // Deduplicate already-processed mutationId (both applied=true and applied=false cooldown receipts)
    if (
      params.parsed.mutationId &&
      current.appliedMutationIds?.includes(params.parsed.mutationId)
    ) {
      const recorded = current.appliedMutationOutcomes?.[params.parsed.mutationId];
      return {
        status: 200,
        body: {
          state: applyTamagotchiDecay(current, serverNowIso),
          canonicalState: current,
          applied: recorded ? recorded.applied : true,
          deduplicated: true,
          cooldownRemainingMs: recorded?.cooldownRemainingMs ?? 0,
          message: recorded?.message ?? '',
          lowpolyAvatarUrl: params.lowpolyAvatarUrl,
          ...(recorded?.before !== undefined ? { before: recorded.before } : {}),
          ...(recorded?.after !== undefined ? { after: recorded.after } : {}),
          ...(recorded?.trophyUnlocked !== undefined ? { trophyUnlocked: recorded.trophyUnlocked } : {}),
        },
      };
    }

    const effectiveNowIso = resolveEffectiveMutationTimestamp(
      current,
      params.parsed.occurredAt,
      serverNowIso
    );

    const outcome: {
      state: TamagotchiState;
      applied: boolean;
      cooldownRemainingMs: number;
      message: string;
      before?: number;
      after?: number;
      trophyUnlocked?: boolean;
    } =
      params.parsed.kind === 'care_game_reward'
        ? applyTamagotchiCareGameReward(
            current,
            params.parsed.stat,
            params.parsed.excellent,
            params.characterName || 'Eroe',
            effectiveNowIso
          )
        : params.parsed.kind === 'innkeeper_trophy'
          ? applyTamagotchiInnkeeperTrophy(
              current,
              params.characterName || 'Eroe',
              effectiveNowIso
            )
          : params.parsed.kind === 'set_appearance'
            ? applyTamagotchiAppearance(
                current,
                params.parsed.appearance,
                params.characterName || 'Eroe',
                effectiveNowIso
              )
            : params.parsed.kind === 'dice_reward'
            ? applyTamagotchiDiceReward(
                current,
                params.parsed.won,
                params.characterName || 'Eroe',
                effectiveNowIso
              )
            : applyTamagotchiAction(
                current,
                params.parsed.action,
                params.characterName || 'Eroe',
                effectiveNowIso
              );

    const extraOutcomeFields = {
      ...(outcome.before !== undefined ? { before: outcome.before } : {}),
      ...(outcome.after !== undefined ? { after: outcome.after } : {}),
      ...(outcome.trophyUnlocked !== undefined ? { trophyUnlocked: outcome.trophyUnlocked } : {}),
    };

    if (!outcome.applied) {
      // Legacy client without mutationId: no DB write needed on cooldown rejection
      if (!params.parsed.mutationId) {
        return {
          status: 200,
          body: {
            state: applyTamagotchiDecay(current, serverNowIso),
            canonicalState: current,
            applied: false,
            deduplicated: false,
            cooldownRemainingMs: outcome.cooldownRemainingMs,
            message: outcome.message,
            lowpolyAvatarUrl: params.lowpolyAvatarUrl,
            ...extraOutcomeFields,
          },
        };
      }

      // New client with mutationId: persist applied=false receipt on un-decayed `current`
      // without promoting lastUpdatedAt or persisting simulated decay
      const rejectionRecord: TamagotchiMutationOutcomeRecord = {
        applied: false,
        message: outcome.message,
        cooldownRemainingMs: outcome.cooldownRemainingMs,
        ...extraOutcomeFields,
      };
      const rejectionState = recordAppliedMutation(current, params.parsed.mutationId, rejectionRecord);

      const swapRes = await params.store.compareAndSwap(expectedVersion, rejectionState);
      if (swapRes.error) {
        return { status: 500, body: { error: 'database_error' } };
      }
      if (swapRes.swapped) {
        return {
          status: 200,
          body: {
            state: applyTamagotchiDecay(rejectionState, serverNowIso),
            canonicalState: rejectionState,
            applied: false,
            deduplicated: false,
            cooldownRemainingMs: outcome.cooldownRemainingMs,
            message: outcome.message,
            lowpolyAvatarUrl: params.lowpolyAvatarUrl,
            ...extraOutcomeFields,
          },
        };
      }
      // CAS conflict: retry loop
      continue;
    }

    const appliedRecord: TamagotchiMutationOutcomeRecord = {
      applied: true,
      message: outcome.message,
      cooldownRemainingMs: outcome.cooldownRemainingMs,
      ...extraOutcomeFields,
    };
    const stateToPersist: TamagotchiState = params.parsed.mutationId
      ? recordAppliedMutation(outcome.state, params.parsed.mutationId, appliedRecord)
      : {
          ...outcome.state,
          stateVersion: (outcome.state.stateVersion ?? 0) + 1,
        };

    const swapRes = await params.store.compareAndSwap(expectedVersion, stateToPersist);
    if (swapRes.error) {
      return { status: 500, body: { error: 'database_error' } };
    }
    if (swapRes.swapped) {
      return {
        status: 200,
        body: {
          state: applyTamagotchiDecay(stateToPersist, serverNowIso),
          canonicalState: stateToPersist,
          applied: true,
          deduplicated: false,
          cooldownRemainingMs: outcome.cooldownRemainingMs,
          message: outcome.message,
          lowpolyAvatarUrl: params.lowpolyAvatarUrl,
          ...extraOutcomeFields,
        },
      };
    }
    // CAS conflict: another concurrent writer updated tamagotchi_state; retry loop
  }

  return { status: 409, body: { error: 'conflict_retry' } };
}
