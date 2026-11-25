import {
  TamagotchiAppearance,
  areAppearancesEqual,
  normalizeTamagotchiAppearance,
} from './tamagotchi-appearance';

export { areAppearancesEqual, normalizeTamagotchiAppearance };
export type { TamagotchiAppearance };

export type TamagotchiAction = 'feed' | 'play' | 'rest' | 'clean' | 'pet';

export type TamagotchiLogAction = TamagotchiAction | 'wardrobe';

export type TamagotchiCareStat = 'hunger' | 'energy' | 'happiness' | 'hygiene';

export type TamagotchiMood = 'radioso' | 'sereno' | 'affamato' | 'assonnato' | 'trascurato' | 'annoiato';

export type NonDiceCareStat = 'hunger' | 'energy' | 'hygiene';

export const CARE_TROPHY_THRESHOLD = 3;

export const CARE_TROPHY_META: Record<
  NonDiceCareStat,
  { id: string; name: string }
> = {
  hunger: { id: 'silver_ladle', name: 'Mestolo d’Argento' },
  energy: { id: 'ancient_flint', name: 'Pietra Focaia' },
  hygiene: { id: 'runic_brush', name: 'Spazzola Runica' },
};

export interface TamagotchiLogEntry {
  id: string;
  action: TamagotchiLogAction;
  text: string;
  at: string;
}

export interface TamagotchiMutationOutcomeRecord {
  applied: boolean;
  message: string;
  cooldownRemainingMs: number;
  before?: number;
  after?: number;
  trophyUnlocked?: boolean;
}

export interface TamagotchiState {
  hunger: number;      // 0..100 (100 = sazio)
  happiness: number;   // 0..100 (100 = felice)
  energy: number;      // 0..100 (100 = riposato)
  hygiene: number;     // 0..100 (100 = curato/pulito)
  interactionsCount: number;
  lastInteractionAt: string;
  lastUpdatedAt: string;
  lastActionByType: Partial<Record<TamagotchiAction, string>>;
  lastCareGameRewardByStat?: Partial<Record<TamagotchiCareStat, string>>;
  recentLogs: TamagotchiLogEntry[];
  stateVersion?: number;
  appliedMutationIds?: string[];
  appliedMutationOutcomes?: Record<string, TamagotchiMutationOutcomeRecord>;
  innkeeperTrophyUnlockedAt?: string;
  careExcellentCounts?: Partial<Record<NonDiceCareStat, number>>;
  unlockedCareTrophies?: Partial<Record<NonDiceCareStat, string>>;
  appearance?: TamagotchiAppearance;
}

export const TAMAGOTCHI_COOLDOWN_MS: Record<TamagotchiAction, number> = {
  feed: 20 * 60 * 1000,   // 20 min
  play: 15 * 60 * 1000,   // 15 min
  rest: 30 * 60 * 1000,   // 30 min
  clean: 20 * 60 * 1000,  // 20 min
  pet: 10 * 60 * 1000,    // 10 min
};

const DECAY_PER_HOUR = {
  hunger: 4.5,
  happiness: 3.5,
  energy: 3.0,
  hygiene: 2.5,
};

const ACTION_DELTAS: Record<
  TamagotchiAction,
  { hunger: number; happiness: number; energy: number; hygiene: number }
> = {
  feed: { hunger: 12, happiness: 3, energy: 2, hygiene: -2 },
  play: { hunger: -4, happiness: 10, energy: -5, hygiene: -2 },
  rest: { hunger: -3, happiness: 3, energy: 12, hygiene: 0 },
  clean: { hunger: 0, happiness: 3, energy: -2, hygiene: 12 },
  pet: { hunger: 0, happiness: 4, energy: 1, hygiene: 0 },
};

const ACTION_MESSAGES: Record<TamagotchiAction, string[]> = {
  feed: [
    'ha divorato uno stufato di cinghiale fumante.',
    'ha brindato con un boccale d’idromele e pane caldo.',
    'ha gustato una razione del viandante vicino al camino.',
  ],
  play: [
    'ha vinto una mano a dadi contro il locandiere.',
    'si è allenato al manichino di legno nel cortile.',
    'ha raccontato storie di dungeon davanti al fuoco.',
  ],
  rest: [
    'ha schiacciato un pisolino rigenerante nella sua branda.',
    'si è disteso ad ascoltare il crepitio del camino.',
    'ha meditato in silenzio recuperando le forze.',
  ],
  clean: [
    'ha lucidato l’armatura e affilato la lama.',
    'ha spolverato il mantello e sistemato lo zaino.',
    'si è rinfrescato alla fontana della taverna.',
  ],
  pet: [
    'ha sorriso con rinnovato spirito d’avventura!',
    'si sente sostenuto dal legame con il suo giocatore.',
    'ha fatto un cenno fiero pronto per la prossima impresa.',
  ],
};

function clampStat(val: number): number {
  if (!Number.isFinite(val)) return 50;
  return Math.max(0, Math.min(100, Math.round(val)));
}

export function createInitialTamagotchiState(nowIso = new Date().toISOString()): TamagotchiState {
  return {
    hunger: 65,
    happiness: 65,
    energy: 70,
    hygiene: 70,
    interactionsCount: 0,
    lastInteractionAt: nowIso,
    lastUpdatedAt: nowIso,
    lastActionByType: {},
    recentLogs: [],
  };
}

const MAX_APPLIED_MUTATION_IDS = 50;
const MAX_APPLIED_MUTATION_OUTCOMES = 25;
const MAX_OFFLINE_BACKDATE_MS = 72 * 60 * 60 * 1000; // 72h

export const DICE_REWARD_HAPPINESS_COMPLETE = 16;
export const DICE_REWARD_HAPPINESS_WIN = 24;

export const CARE_GAME_COOLDOWN_MS = 15 * 60 * 1000; // 15 min per stat
export const CARE_GAME_REWARD_BASE = 16;
export const CARE_GAME_REWARD_EXCELLENT = 24;

export const VALID_CARE_STATS: readonly TamagotchiCareStat[] = [
  'hunger',
  'energy',
  'happiness',
  'hygiene',
];

export function isTamagotchiCareStat(value: unknown): value is TamagotchiCareStat {
  return (
    value === 'hunger' ||
    value === 'energy' ||
    value === 'happiness' ||
    value === 'hygiene'
  );
}

const CARE_STAT_META: Record<
  TamagotchiCareStat,
  { label: string; action: TamagotchiAction; activity: string }
> = {
  hunger: { label: 'Sazietà', action: 'feed', activity: 'la pentola della taverna' },
  energy: { label: 'Energia', action: 'rest', activity: 'il fuoco della branda' },
  happiness: { label: 'Umore', action: 'play', activity: 'la sfida a dadi col locandiere' },
  hygiene: { label: 'Cura', action: 'clean', activity: 'la pulizia dell’equipaggiamento' },
};

function normalizeLastCareGameRewardByStat(
  raw: unknown
): Partial<Record<TamagotchiCareStat, string>> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const result: Partial<Record<TamagotchiCareStat, string>> = {};
  let count = 0;
  for (const stat of VALID_CARE_STATS) {
    const val = obj[stat];
    if (typeof val === 'string' && val.trim().length > 0 && Number.isFinite(Date.parse(val))) {
      result[stat] = val;
      count += 1;
    }
  }
  return count > 0 ? result : undefined;
}

function normalizeAppliedMutationIds(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim().length > 0 && !seen.has(item)) {
      seen.add(item);
      cleaned.push(item);
    }
  }
  if (cleaned.length === 0) return undefined;
  return cleaned.slice(-MAX_APPLIED_MUTATION_IDS);
}

function normalizeAppliedMutationOutcomes(
  raw: unknown,
  allowedIds?: string[]
): Record<string, TamagotchiMutationOutcomeRecord> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, any>;
  const keys = allowedIds ? allowedIds.slice(-MAX_APPLIED_MUTATION_OUTCOMES) : Object.keys(obj).slice(-MAX_APPLIED_MUTATION_OUTCOMES);
  const result: Record<string, TamagotchiMutationOutcomeRecord> = {};
  let count = 0;
  for (const key of keys) {
    const entry = obj[key];
    if (entry && typeof entry === 'object' && typeof entry.message === 'string') {
      const normalizedEntry: TamagotchiMutationOutcomeRecord = {
        applied: Boolean(entry.applied),
        message: entry.message,
        cooldownRemainingMs:
          typeof entry.cooldownRemainingMs === 'number' && Number.isFinite(entry.cooldownRemainingMs)
            ? Math.max(0, entry.cooldownRemainingMs)
            : 0,
      };
      if (typeof entry.before === 'number' && Number.isFinite(entry.before)) {
        normalizedEntry.before = clampStat(entry.before);
      }
      if (typeof entry.after === 'number' && Number.isFinite(entry.after)) {
        normalizedEntry.after = clampStat(entry.after);
      }
      if (typeof entry.trophyUnlocked === 'boolean') {
        normalizedEntry.trophyUnlocked = entry.trophyUnlocked;
      }
      result[key] = normalizedEntry;
      count += 1;
    }
  }
  return count > 0 ? result : undefined;
}

const NON_DICE_CARE_STATS: readonly NonDiceCareStat[] = ['hunger', 'energy', 'hygiene'];

function normalizeCareExcellentCounts(
  raw: unknown
): Partial<Record<NonDiceCareStat, number>> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const result: Partial<Record<NonDiceCareStat, number>> = {};
  let count = 0;
  for (const stat of NON_DICE_CARE_STATS) {
    const val = obj[stat];
    if (typeof val === 'number' && Number.isInteger(val) && val >= 0) {
      result[stat] = Math.min(val, 9999);
      count += 1;
    }
  }
  return count > 0 ? result : undefined;
}

function normalizeUnlockedCareTrophies(
  raw: unknown
): Partial<Record<NonDiceCareStat, string>> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const result: Partial<Record<NonDiceCareStat, string>> = {};
  let count = 0;
  for (const stat of NON_DICE_CARE_STATS) {
    const val = obj[stat];
    if (typeof val === 'string' && val.trim().length > 0 && Number.isFinite(Date.parse(val))) {
      result[stat] = val;
      count += 1;
    }
  }
  return count > 0 ? result : undefined;
}

export function normalizeTamagotchiState(raw: unknown, nowIso = new Date().toISOString()): TamagotchiState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return createInitialTamagotchiState(nowIso);
  }
  const obj = raw as Record<string, any>;
  const appliedMutationIds = normalizeAppliedMutationIds(obj.appliedMutationIds);
  const appliedMutationOutcomes = normalizeAppliedMutationOutcomes(obj.appliedMutationOutcomes, appliedMutationIds);
  const lastCareGameRewardByStat = normalizeLastCareGameRewardByStat(obj.lastCareGameRewardByStat);
  const careExcellentCounts = normalizeCareExcellentCounts(obj.careExcellentCounts);
  const unlockedCareTrophies = normalizeUnlockedCareTrophies(obj.unlockedCareTrophies);
  const appearance = normalizeTamagotchiAppearance(obj.appearance);
  const state: TamagotchiState = {
    hunger: typeof obj.hunger === 'number' ? clampStat(obj.hunger) : 65,
    happiness: typeof obj.happiness === 'number' ? clampStat(obj.happiness) : 65,
    energy: typeof obj.energy === 'number' ? clampStat(obj.energy) : 70,
    hygiene: typeof obj.hygiene === 'number' ? clampStat(obj.hygiene) : 70,
    interactionsCount: Number.isInteger(obj.interactionsCount) && obj.interactionsCount >= 0 ? obj.interactionsCount : 0,
    lastInteractionAt: typeof obj.lastInteractionAt === 'string' ? obj.lastInteractionAt : nowIso,
    lastUpdatedAt: typeof obj.lastUpdatedAt === 'string' ? obj.lastUpdatedAt : nowIso,
    lastActionByType:
      obj.lastActionByType && typeof obj.lastActionByType === 'object' && !Array.isArray(obj.lastActionByType)
        ? obj.lastActionByType
        : {},
    recentLogs: Array.isArray(obj.recentLogs) ? obj.recentLogs.slice(0, 8) : [],
  };
  if (lastCareGameRewardByStat) {
    state.lastCareGameRewardByStat = lastCareGameRewardByStat;
  }
  if (typeof obj.stateVersion === 'number' && Number.isInteger(obj.stateVersion) && obj.stateVersion >= 0) {
    state.stateVersion = obj.stateVersion;
  }
  if (appliedMutationIds) {
    state.appliedMutationIds = appliedMutationIds;
  }
  if (appliedMutationOutcomes) {
    state.appliedMutationOutcomes = appliedMutationOutcomes;
  }
  if (
    typeof obj.innkeeperTrophyUnlockedAt === 'string' &&
    obj.innkeeperTrophyUnlockedAt.trim().length > 0 &&
    Number.isFinite(Date.parse(obj.innkeeperTrophyUnlockedAt))
  ) {
    state.innkeeperTrophyUnlockedAt = obj.innkeeperTrophyUnlockedAt;
  }
  if (careExcellentCounts) {
    state.careExcellentCounts = careExcellentCounts;
  }
  if (unlockedCareTrophies) {
    state.unlockedCareTrophies = unlockedCareTrophies;
  }
  if (appearance) {
    state.appearance = appearance;
  }
  return state;
}

/**
 * Resolves the effective timestamp for an offline/replayed mutation so time and
 * cooldowns remain coherent while preventing future-dating or time-traveling
 * before the state's lastUpdatedAt.
 */
export function resolveEffectiveMutationTimestamp(
  state: TamagotchiState | null,
  occurredAtIso: string | undefined,
  serverNowIso = new Date().toISOString()
): string {
  const serverNowMs = Date.parse(serverNowIso);
  if (!Number.isFinite(serverNowMs)) return new Date().toISOString();

  if (!occurredAtIso) return serverNowIso;
  const occurredMs = Date.parse(occurredAtIso);
  if (!Number.isFinite(occurredMs)) return serverNowIso;

  const lastUpdatedMs = state ? Date.parse(state.lastUpdatedAt) : NaN;
  const minAllowedMs = Math.max(
    serverNowMs - MAX_OFFLINE_BACKDATE_MS,
    Number.isFinite(lastUpdatedMs) ? lastUpdatedMs : 0
  );
  const clampedMs = Math.min(serverNowMs, Math.max(minAllowedMs, occurredMs));
  return new Date(clampedMs).toISOString();
}

export function recordAppliedMutation(
  state: TamagotchiState,
  mutationId: string,
  outcome: TamagotchiMutationOutcomeRecord
): TamagotchiState {
  const prevIds = state.appliedMutationIds ?? [];
  const nextIds = [...prevIds.filter((id) => id !== mutationId), mutationId].slice(-MAX_APPLIED_MUTATION_IDS);
  const prevOutcomes = state.appliedMutationOutcomes ?? {};
  const mergedOutcomes: Record<string, TamagotchiMutationOutcomeRecord> = {
    ...prevOutcomes,
    [mutationId]: outcome,
  };
  const trimmedOutcomes: Record<string, TamagotchiMutationOutcomeRecord> = {};
  for (const id of nextIds.slice(-MAX_APPLIED_MUTATION_OUTCOMES)) {
    if (mergedOutcomes[id]) {
      trimmedOutcomes[id] = mergedOutcomes[id];
    }
  }
  return {
    ...state,
    stateVersion: (state.stateVersion ?? 0) + 1,
    appliedMutationIds: nextIds,
    appliedMutationOutcomes: trimmedOutcomes,
  };
}

/**
 * Computes time-based decay from `state.lastUpdatedAt` up to `nowIso`.
 * Pure & deterministic.
 */
export function applyTamagotchiDecay(state: TamagotchiState, nowIso = new Date().toISOString()): TamagotchiState {
  const prevMs = Date.parse(state.lastUpdatedAt);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(prevMs) || !Number.isFinite(nowMs) || nowMs <= prevMs) {
    return state;
  }

  const elapsedHours = Math.min(72, (nowMs - prevMs) / (1000 * 60 * 60));
  if (elapsedHours < 0.05) {
    return state;
  }

  return {
    ...state,
    hunger: clampStat(state.hunger - elapsedHours * DECAY_PER_HOUR.hunger),
    happiness: clampStat(state.happiness - elapsedHours * DECAY_PER_HOUR.happiness),
    energy: clampStat(state.energy - elapsedHours * DECAY_PER_HOUR.energy),
    hygiene: clampStat(state.hygiene - elapsedHours * DECAY_PER_HOUR.hygiene),
    lastUpdatedAt: nowIso,
  };
}

export function getTamagotchiActionCooldownRemainingMs(
  state: TamagotchiState,
  action: TamagotchiAction,
  nowIso = new Date().toISOString()
): number {
  const lastAt = state.lastActionByType?.[action];
  if (!lastAt) return 0;
  const lastMs = Date.parse(lastAt);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(lastMs) || !Number.isFinite(nowMs)) return 0;
  const remaining = TAMAGOTCHI_COOLDOWN_MS[action] - (nowMs - lastMs);
  return Math.max(0, remaining);
}

export function applyTamagotchiAction(
  currentRaw: TamagotchiState,
  action: TamagotchiAction,
  characterName: string,
  nowIso = new Date().toISOString()
): { state: TamagotchiState; applied: boolean; cooldownRemainingMs: number; message: string } {
  const decayed = applyTamagotchiDecay(currentRaw, nowIso);
  const cooldownRemainingMs = getTamagotchiActionCooldownRemainingMs(decayed, action, nowIso);
  if (cooldownRemainingMs > 0) {
    const mins = Math.ceil(cooldownRemainingMs / 60000);
    return {
      state: decayed,
      applied: false,
      cooldownRemainingMs,
      message: `${characterName} ha bisogno di un attimo prima di ripetere questa azione (${mins} min).`,
    };
  }

  const deltas = ACTION_DELTAS[action];
  const pool = ACTION_MESSAGES[action];
  const phrase = pool[decayed.interactionsCount % pool.length];
  const logText = `${characterName} ${phrase}`;

  const nextLog: TamagotchiLogEntry = {
    id: `${action}-${Date.now()}-${decayed.interactionsCount}`,
    action,
    text: logText,
    at: nowIso,
  };

  const nextState: TamagotchiState = {
    ...decayed,
    hunger: clampStat(decayed.hunger + deltas.hunger),
    happiness: clampStat(decayed.happiness + deltas.happiness),
    energy: clampStat(decayed.energy + deltas.energy),
    hygiene: clampStat(decayed.hygiene + deltas.hygiene),
    interactionsCount: decayed.interactionsCount + 1,
    lastInteractionAt: nowIso,
    lastUpdatedAt: nowIso,
    lastActionByType: {
      ...decayed.lastActionByType,
      [action]: nowIso,
    },
    recentLogs: [nextLog, ...decayed.recentLogs].slice(0, 6),
  };

  return {
    state: nextState,
    applied: true,
    cooldownRemainingMs: 0,
    message: logText,
  };
}

/**
 * Applies the Taverna dice mini-game reward (+8 Umore on hand completion,
 * +12 Umore on victory). Shares the 15-minute cooldown with 'play' and has
 * no link to D&D sheet stats or XP.
 */
export function applyTamagotchiDiceReward(
  currentRaw: TamagotchiState,
  won: boolean,
  characterName: string,
  nowIso = new Date().toISOString()
): { state: TamagotchiState; applied: boolean; cooldownRemainingMs: number; message: string } {
  const decayed = applyTamagotchiDecay(currentRaw, nowIso);
  const cooldownRemainingMs = getTamagotchiActionCooldownRemainingMs(decayed, 'play', nowIso);
  if (cooldownRemainingMs > 0) {
    const mins = Math.ceil(cooldownRemainingMs / 60000);
    return {
      state: decayed,
      applied: false,
      cooldownRemainingMs,
      message: `${characterName} ha già giocato da poco: riprova tra ${mins} min per un altro premio dadi.`,
    };
  }

  const happinessBonus = won ? DICE_REWARD_HAPPINESS_WIN : DICE_REWARD_HAPPINESS_COMPLETE;
  const logText = won
    ? `${characterName} ha vinto a dadi in taverna! (+${happinessBonus} Umore)`
    : `${characterName} ha completato una mano a dadi in taverna. (+${happinessBonus} Umore)`;

  const nextLog: TamagotchiLogEntry = {
    id: `dice-${Date.now()}-${decayed.interactionsCount}`,
    action: 'play',
    text: logText,
    at: nowIso,
  };

  const nextState: TamagotchiState = {
    ...decayed,
    happiness: clampStat(decayed.happiness + happinessBonus),
    interactionsCount: decayed.interactionsCount + 1,
    lastInteractionAt: nowIso,
    lastUpdatedAt: nowIso,
    lastActionByType: {
      ...decayed.lastActionByType,
      play: nowIso,
    },
    recentLogs: [nextLog, ...decayed.recentLogs].slice(0, 6),
  };

  return {
    state: nextState,
    applied: true,
    cooldownRemainingMs: 0,
    message: logText,
  };
}

/**
 * Unlocks the permanent Brass Die ("Dado d'Ottone") trophy on the character's
 * first victory against the innkeeper. Idempotent once unlocked, does not
 * modify mood/bars/play cooldown, and has no link to D&D rules.
 */
export function applyTamagotchiInnkeeperTrophy(
  currentRaw: TamagotchiState,
  characterName: string,
  nowIso = new Date().toISOString()
): { state: TamagotchiState; applied: boolean; cooldownRemainingMs: number; message: string } {
  if (currentRaw.innkeeperTrophyUnlockedAt) {
    return {
      state: currentRaw,
      applied: false,
      cooldownRemainingMs: 0,
      message: `${characterName} ha già sbloccato il Dado d’Ottone del locandiere.`,
    };
  }

  const logText = `${characterName} ha battuto il locandiere a dadi e ha sbloccato il Dado d’Ottone!`;
  const nextLog: TamagotchiLogEntry = {
    id: `trophy-${Date.now()}-${currentRaw.interactionsCount}`,
    action: 'play',
    text: logText,
    at: nowIso,
  };

  const nextState: TamagotchiState = {
    ...currentRaw,
    innkeeperTrophyUnlockedAt: nowIso,
    recentLogs: [nextLog, ...currentRaw.recentLogs].slice(0, 6),
  };

  return {
    state: nextState,
    applied: true,
    cooldownRemainingMs: 0,
    message: logText,
  };
}

/**
 * Updates or resets the character's Tavern cosmetic appearance without altering
 * care bars, decay timestamps, action cooldowns, or D&D 5e sheet rules.
 */
export function applyTamagotchiAppearance(
  currentRaw: TamagotchiState,
  nextAppearanceRaw: TamagotchiAppearance | null | undefined,
  characterName: string,
  nowIso = new Date().toISOString()
): { state: TamagotchiState; applied: boolean; cooldownRemainingMs: number; message: string } {
  const normalizedAppearance = normalizeTamagotchiAppearance(nextAppearanceRaw);
  const logText = normalizedAppearance
    ? `${characterName} ha personalizzato il proprio aspetto tra Specchio e Baule.`
    : `${characterName} è tornato al suo aspetto classico di classe.`;

  const nextLog: TamagotchiLogEntry = {
    id: `wardrobe-${Date.now()}-${currentRaw.interactionsCount}`,
    action: 'wardrobe',
    text: logText,
    at: nowIso,
  };

  const { appearance: _prevAppearance, ...rest } = currentRaw;
  const nextState: TamagotchiState = {
    ...rest,
    ...(normalizedAppearance ? { appearance: normalizedAppearance } : {}),
    recentLogs: [nextLog, ...currentRaw.recentLogs].slice(0, 6),
  };

  return {
    state: nextState,
    applied: true,
    cooldownRemainingMs: 0,
    message: logText,
  };
}

export function getTamagotchiCareGameCooldownRemainingMs(
  state: TamagotchiState,
  stat: TamagotchiCareStat,
  nowIso = new Date().toISOString()
): number {
  const lastAt = state.lastCareGameRewardByStat?.[stat];
  if (!lastAt) return 0;
  const lastMs = Date.parse(lastAt);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(lastMs) || !Number.isFinite(nowMs)) return 0;
  const remaining = CARE_GAME_COOLDOWN_MS - (nowMs - lastMs);
  return Math.max(0, remaining);
}

/**
 * Applies a Taverna care mini-game reward (+8 base, +12 excellent, capped at 100)
 * for a single stat with a 15-minute cooldown independent of other mini-games
 * and quick actions. The first 'happiness' victory (excellent=true) unlocks the
 * permanent Brass Die trophy even if the Umore bonus is on cooldown.
 */
export function applyTamagotchiCareGameReward(
  currentRaw: TamagotchiState,
  stat: TamagotchiCareStat,
  excellent: boolean,
  characterName: string,
  nowIso = new Date().toISOString()
): {
  state: TamagotchiState;
  applied: boolean;
  cooldownRemainingMs: number;
  message: string;
  before: number;
  after: number;
  trophyUnlocked: boolean;
} {
  const decayed = applyTamagotchiDecay(currentRaw, nowIso);
  const meta = CARE_STAT_META[stat];
  const before = decayed[stat];
  const cooldownRemainingMs = getTamagotchiCareGameCooldownRemainingMs(decayed, stat, nowIso);
  const unlocksTrophy = stat === 'happiness' && excellent && !decayed.innkeeperTrophyUnlockedAt;

  if (cooldownRemainingMs > 0) {
    const mins = Math.ceil(cooldownRemainingMs / 60000);
    if (!unlocksTrophy) {
      return {
        state: decayed,
        applied: false,
        cooldownRemainingMs,
        message: `Premio ${meta.label} in attesa: riprova tra ${mins} min.`,
        before,
        after: before,
        trophyUnlocked: false,
      };
    }

    const logText = `${characterName} ha battuto il locandiere a dadi e ha sbloccato il Dado d’Ottone!`;
    const nextLog: TamagotchiLogEntry = {
      id: `care-trophy-${Date.now()}-${decayed.interactionsCount}`,
      action: 'play',
      text: logText,
      at: nowIso,
    };

    const nextState: TamagotchiState = {
      ...decayed,
      innkeeperTrophyUnlockedAt: nowIso,
      recentLogs: [nextLog, ...decayed.recentLogs].slice(0, 6),
    };

    return {
      state: nextState,
      applied: true,
      cooldownRemainingMs,
      message: `${logText} Premio ${meta.label} in attesa (${mins} min).`,
      before,
      after: before,
      trophyUnlocked: true,
    };
  }

  const bonus = excellent ? CARE_GAME_REWARD_EXCELLENT : CARE_GAME_REWARD_BASE;
  const after = clampStat(before + bonus);
  const actualDelta = after - before;
  const deltaSuffix = actualDelta > 0 ? `(+${actualDelta} ${meta.label})` : `(${meta.label} già al massimo)`;

  let nextCareExcellentCounts = decayed.careExcellentCounts;
  let nextUnlockedCareTrophies = decayed.unlockedCareTrophies;
  let unlockedCareTrophyName: string | null = null;

  if (stat !== 'happiness' && excellent) {
    const prevCount = decayed.careExcellentCounts?.[stat] ?? 0;
    const nextCount = prevCount + 1;
    nextCareExcellentCounts = {
      ...decayed.careExcellentCounts,
      [stat]: nextCount,
    };
    if (nextCount >= CARE_TROPHY_THRESHOLD && !decayed.unlockedCareTrophies?.[stat]) {
      nextUnlockedCareTrophies = {
        ...decayed.unlockedCareTrophies,
        [stat]: nowIso,
      };
      unlockedCareTrophyName = CARE_TROPHY_META[stat].name;
    }
  }

  const logText =
    stat === 'happiness' && unlocksTrophy
      ? `${characterName} ha vinto ${meta.activity} e ha sbloccato il Dado d’Ottone! ${deltaSuffix}`
      : unlockedCareTrophyName
        ? `${characterName} ha completato ${meta.activity} con risultato pieno e ha sbloccato ${unlockedCareTrophyName}! ${deltaSuffix}`
        : stat === 'happiness' && excellent
          ? `${characterName} ha vinto ${meta.activity}! ${deltaSuffix}`
          : excellent
            ? `${characterName} ha completato ${meta.activity} con risultato pieno! ${deltaSuffix}`
            : `${characterName} ha completato ${meta.activity}. ${deltaSuffix}`;

  const nextLog: TamagotchiLogEntry = {
    id: `care-${stat}-${Date.now()}-${decayed.interactionsCount}`,
    action: meta.action,
    text: logText,
    at: nowIso,
  };

  const nextState: TamagotchiState = {
    ...decayed,
    [stat]: after,
    interactionsCount: decayed.interactionsCount + 1,
    lastInteractionAt: nowIso,
    lastUpdatedAt: nowIso,
    lastCareGameRewardByStat: {
      ...decayed.lastCareGameRewardByStat,
      [stat]: nowIso,
    },
    ...(nextCareExcellentCounts ? { careExcellentCounts: nextCareExcellentCounts } : {}),
    ...(nextUnlockedCareTrophies ? { unlockedCareTrophies: nextUnlockedCareTrophies } : {}),
    ...(unlocksTrophy ? { innkeeperTrophyUnlockedAt: nowIso } : {}),
    recentLogs: [nextLog, ...decayed.recentLogs].slice(0, 6),
  };

  return {
    state: nextState,
    applied: true,
    cooldownRemainingMs: 0,
    message: logText,
    before,
    after,
    trophyUnlocked: unlocksTrophy || Boolean(unlockedCareTrophyName),
  };
}

export function deriveTamagotchiMood(state: TamagotchiState): {
  mood: TamagotchiMood;
  label: string;
  hint: string;
} {
  if (state.hunger <= 30) {
    return {
      mood: 'affamato',
      label: 'Affamato',
      hint: 'Un pasto caldo in taverna gli farà tornare il sorriso.',
    };
  }
  if (state.energy <= 30) {
    return {
      mood: 'assonnato',
      label: 'Assonnato',
      hint: 'Ha bisogno di riposare vicino al camino.',
    };
  }
  if (state.hygiene <= 30) {
    return {
      mood: 'trascurato',
      label: 'Impolverato',
      hint: 'Armatura e mantello chiedono una bella ripulita.',
    };
  }
  if (state.happiness <= 30) {
    return {
      mood: 'annoiato',
      label: 'Annoiato',
      hint: 'Sfida il Locandiere a dadi per ridargli il sorriso!',
    };
  }
  const avg = (state.hunger + state.happiness + state.energy + state.hygiene) / 4;
  if (avg >= 78 && state.happiness >= 75) {
    return {
      mood: 'radioso',
      label: 'Radioso',
      hint: 'Pronto ad affrontare qualsiasi drago della Gilda!',
    };
  }
  return {
    mood: 'sereno',
    label: 'Sereno',
    hint: 'Si gode la quiete tra una spedizione e l’altra.',
  };
}
