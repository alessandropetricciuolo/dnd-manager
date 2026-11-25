export const TOTAL_TURNS = 6;
export const TURNS_PER_ACTOR = 3;
export const INNKEEPER_BANK_THRESHOLD = 14;
export const INNKEEPER_MAX_ROLLS_PER_TURN = 4;
export const DOUBLE_BONUS_POINTS = 4;

export type DieValue = 1 | 2 | 3 | 4 | 5 | 6;
export type TurnActor = 'player' | 'innkeeper';
export type MatchPhase = 'playing' | 'finished';
export type MatchOutcome = 'player_win' | 'innkeeper_win' | 'draw' | null;
export type MatchLastEvent =
  | 'start'
  | 'rolled'
  | 'halved'
  | 'busted'
  | 'double_bonus'
  | 'banked';

export interface LocandiereMatchState {
  id: number;
  phase: MatchPhase;
  turnNumber: number; // 1..6
  activeActor: TurnActor;
  playerScore: number;
  innkeeperScore: number;
  turnPoints: number;
  turnRolls: DieValue[];
  lastDie: DieValue | null;
  lastDice: [DieValue, DieValue] | null;
  lastEvent: MatchLastEvent;
  lastActor: TurnActor | null;
  outcome: MatchOutcome;
}

export type DiceRng = () => number;

export function rollD6(rng: DiceRng = Math.random): DieValue {
  const raw = rng();
  const normalized = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 0.999999999) : 0;
  return (Math.floor(normalized * 6) + 1) as DieValue;
}

export function getActorForTurn(turnNumber: number): TurnActor {
  return turnNumber % 2 === 1 ? 'player' : 'innkeeper';
}

export function getRoundForTurn(turnNumber: number): number {
  return Math.ceil(turnNumber / 2);
}

export function computeMatchOutcome(playerScore: number, innkeeperScore: number): Exclude<MatchOutcome, null> {
  if (playerScore > innkeeperScore) return 'player_win';
  if (innkeeperScore > playerScore) return 'innkeeper_win';
  return 'draw';
}

export function createLocandiereMatch(id: number): LocandiereMatchState {
  return {
    id,
    phase: 'playing',
    turnNumber: 1,
    activeActor: 'player',
    playerScore: 0,
    innkeeperScore: 0,
    turnPoints: 0,
    turnRolls: [],
    lastDie: null,
    lastDice: null,
    lastEvent: 'start',
    lastActor: null,
    outcome: null,
  };
}

function advanceTurn(
  state: LocandiereMatchState,
  nextPlayerScore: number,
  nextInnkeeperScore: number,
  lastDie: DieValue | null,
  lastDice: [DieValue, DieValue] | null,
  lastEvent: 'busted' | 'banked'
): LocandiereMatchState {
  if (state.turnNumber >= TOTAL_TURNS) {
    return {
      ...state,
      phase: 'finished',
      playerScore: nextPlayerScore,
      innkeeperScore: nextInnkeeperScore,
      turnPoints: 0,
      turnRolls: [],
      lastDie,
      lastDice,
      lastEvent,
      lastActor: state.activeActor,
      outcome: computeMatchOutcome(nextPlayerScore, nextInnkeeperScore),
    };
  }

  const nextTurnNumber = state.turnNumber + 1;
  return {
    ...state,
    turnNumber: nextTurnNumber,
    activeActor: getActorForTurn(nextTurnNumber),
    playerScore: nextPlayerScore,
    innkeeperScore: nextInnkeeperScore,
    turnPoints: 0,
    turnRolls: [],
    lastDie,
    lastDice,
    lastEvent,
    lastActor: state.activeActor,
  };
}

export function canBankCurrentTurn(state: LocandiereMatchState): boolean {
  return state.phase === 'playing' && state.turnPoints > 0;
}

export function rollCurrentTurn(
  state: LocandiereMatchState,
  rng: DiceRng = Math.random
): LocandiereMatchState {
  if (state.phase !== 'playing') {
    return state;
  }

  const d1 = rollD6(rng);
  const d2 = rollD6(rng);
  const pair: [DieValue, DieValue] = [d1, d2];

  if (d1 === 1 && d2 === 1) {
    return advanceTurn(state, state.playerScore, state.innkeeperScore, 1, pair, 'busted');
  }

  if (d1 === 1 || d2 === 1) {
    const halved = Math.floor(state.turnPoints / 2);
    return {
      ...state,
      turnPoints: halved,
      turnRolls: [...state.turnRolls, d1, d2],
      lastDie: 1,
      lastDice: pair,
      lastEvent: 'halved',
      lastActor: state.activeActor,
    };
  }

  const isDouble = d1 === d2;
  const gained = d1 + d2 + (isDouble ? DOUBLE_BONUS_POINTS : 0);

  return {
    ...state,
    turnPoints: state.turnPoints + gained,
    turnRolls: [...state.turnRolls, d1, d2],
    lastDie: d2,
    lastDice: pair,
    lastEvent: isDouble ? 'double_bonus' : 'rolled',
    lastActor: state.activeActor,
  };
}

export function bankCurrentTurn(state: LocandiereMatchState): LocandiereMatchState {
  if (!canBankCurrentTurn(state)) {
    return state;
  }

  const nextPlayerScore =
    state.activeActor === 'player' ? state.playerScore + state.turnPoints : state.playerScore;
  const nextInnkeeperScore =
    state.activeActor === 'innkeeper'
      ? state.innkeeperScore + state.turnPoints
      : state.innkeeperScore;

  return advanceTurn(state, nextPlayerScore, nextInnkeeperScore, state.lastDie, state.lastDice, 'banked');
}

export function shouldInnkeeperRollAgain(state: LocandiereMatchState): boolean {
  if (state.phase !== 'playing' || state.activeActor !== 'innkeeper') {
    return false;
  }

  const rollsMade = Math.floor(state.turnRolls.length / 2);
  if (rollsMade === 0) {
    return true;
  }

  if (rollsMade >= INNKEEPER_MAX_ROLLS_PER_TURN) {
    return false;
  }

  const isFinalTurn = state.turnNumber === TOTAL_TURNS;
  if (isFinalTurn) {
    const projectedScore = state.innkeeperScore + state.turnPoints;
    return projectedScore <= state.playerScore;
  }

  return state.turnPoints < INNKEEPER_BANK_THRESHOLD;
}

export function playInnkeeperTurn(
  state: LocandiereMatchState,
  rng: DiceRng = Math.random
): LocandiereMatchState {
  if (state.phase !== 'playing' || state.activeActor !== 'innkeeper') {
    return state;
  }

  const startingTurn = state.turnNumber;
  let current = state;

  while (
    current.phase === 'playing' &&
    current.activeActor === 'innkeeper' &&
    current.turnNumber === startingTurn
  ) {
    if (!shouldInnkeeperRollAgain(current)) {
      current = bankCurrentTurn(current);
      break;
    }
    current = rollCurrentTurn(current, rng);
  }

  return current;
}
