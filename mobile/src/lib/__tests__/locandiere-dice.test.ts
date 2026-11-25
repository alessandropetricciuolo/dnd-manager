import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOUBLE_BONUS_POINTS,
  INNKEEPER_BANK_THRESHOLD,
  INNKEEPER_MAX_ROLLS_PER_TURN,
  TOTAL_TURNS,
  bankCurrentTurn,
  canBankCurrentTurn,
  createLocandiereMatch,
  playInnkeeperTurn,
  rollCurrentTurn,
  shouldInnkeeperRollAgain,
} from '../locandiere-dice';

function sequenceRng(faces: number[]): () => number {
  let cursor = 0;
  return () => {
    const face = faces[cursor] ?? faces[faces.length - 1] ?? 1;
    cursor += 1;
    return (face - 1) / 6 + 0.01;
  };
}

test('createLocandiereMatch starts on player turn 1 with zero scores (6 total turns)', () => {
  const match = createLocandiereMatch(1);
  assert.equal(TOTAL_TURNS, 6);
  assert.equal(match.phase, 'playing');
  assert.equal(match.turnNumber, 1);
  assert.equal(match.activeActor, 'player');
  assert.equal(match.playerScore, 0);
  assert.equal(match.innkeeperScore, 0);
  assert.equal(match.turnPoints, 0);
  assert.equal(match.lastDice, null);
  assert.equal(canBankCurrentTurn(match), false);
  assert.equal(match.outcome, null);
});

test('rolling 2d6 accumulates turnPoints, doubles add +4 bonus, and banking passes turn', () => {
  const rng = sequenceRng([4, 5, 3, 3]);
  let match = createLocandiereMatch(2);
  match = rollCurrentTurn(match, rng);
  assert.equal(match.turnPoints, 9);
  assert.deepEqual(match.lastDice, [4, 5]);
  assert.equal(match.lastEvent, 'rolled');
  assert.equal(canBankCurrentTurn(match), true);

  match = rollCurrentTurn(match, rng);
  assert.equal(match.turnPoints, 9 + 6 + DOUBLE_BONUS_POINTS);
  assert.equal(match.lastEvent, 'double_bonus');
  assert.deepEqual(match.turnRolls, [4, 5, 3, 3]);

  match = bankCurrentTurn(match);
  assert.equal(match.playerScore, 19);
  assert.equal(match.turnPoints, 0);
  assert.equal(match.turnNumber, 2);
  assert.equal(match.activeActor, 'innkeeper');
  assert.equal(match.lastEvent, 'banked');
});

test('single 1 halves turnPoints while double 1 busts and passes turn', () => {
  let match = createLocandiereMatch(3);
  // Turn 1 (player): roll 5+4 = 9, then 1+6 -> halves to 4, stays on player turn 1
  match = rollCurrentTurn(match, sequenceRng([5, 4]));
  assert.equal(match.turnPoints, 9);
  match = rollCurrentTurn(match, sequenceRng([1, 6]));
  assert.equal(match.turnPoints, 4);
  assert.equal(match.lastEvent, 'halved');
  assert.equal(match.turnNumber, 1);
  match = bankCurrentTurn(match);
  assert.equal(match.playerScore, 4);

  // Turn 2 (innkeeper): rolls 3+4 (=7), then double 1 -> busts to 0 and passes turn
  match = rollCurrentTurn(match, sequenceRng([3, 4]));
  assert.equal(match.turnPoints, 7);
  match = rollCurrentTurn(match, sequenceRng([1, 1]));
  assert.equal(match.innkeeperScore, 0);
  assert.equal(match.turnPoints, 0);
  assert.equal(match.lastEvent, 'busted');
  assert.equal(match.turnNumber, 3);
  assert.equal(match.activeActor, 'player');
});

test('innkeeper strategy banks at threshold on first turn', () => {
  let match = createLocandiereMatch(4);
  match = bankCurrentTurn(rollCurrentTurn(match, sequenceRng([5, 4])));

  // Turn 2 (innkeeper): 4+5 (=9) + 3+4 (=7) => 16 >= INNKEEPER_BANK_THRESHOLD (14) -> banks
  assert.equal(INNKEEPER_BANK_THRESHOLD, 14);
  match = playInnkeeperTurn(match, sequenceRng([4, 5, 3, 4, 6, 6]));
  assert.equal(match.innkeeperScore, 16);
  assert.equal(match.turnNumber, 3);
  assert.equal(match.activeActor, 'player');
  assert.equal(match.lastEvent, 'banked');
});

test('innkeeper final turn catches up only until ahead, respecting max rolls', () => {
  // Case A: stops as soon as ahead of player
  let matchA = createLocandiereMatch(5);
  matchA = bankCurrentTurn(rollCurrentTurn(matchA, sequenceRng([4, 5]))); // P: 9
  matchA = playInnkeeperTurn(matchA, sequenceRng([4, 5, 3, 4])); // I: 16
  matchA = bankCurrentTurn(rollCurrentTurn(matchA, sequenceRng([5, 6]))); // P: 20
  matchA = playInnkeeperTurn(matchA, sequenceRng([1, 1])); // I busts -> 16
  matchA = bankCurrentTurn(rollCurrentTurn(matchA, sequenceRng([2, 3]))); // P: 25
  // Turn 6 (innkeeper needs > 25 from 16, so >= 10): rolls 5+6 (=11 -> 27 > 25) -> banks immediately
  matchA = playInnkeeperTurn(matchA, sequenceRng([5, 6, 6, 6]));
  assert.equal(matchA.phase, 'finished');
  assert.equal(matchA.innkeeperScore, 27);
  assert.equal(matchA.outcome, 'innkeeper_win');

  // Case B: hits max rolls limit when trying to catch up
  let matchB = createLocandiereMatch(6);
  matchB = bankCurrentTurn(rollCurrentTurn(matchB, sequenceRng([6, 5]))); // P: 11
  matchB = rollCurrentTurn(matchB, sequenceRng([1, 1])); // I: 0
  matchB = bankCurrentTurn(rollCurrentTurn(matchB, sequenceRng([6, 5]))); // P: 22
  matchB = rollCurrentTurn(matchB, sequenceRng([1, 1])); // I: 0
  matchB = bankCurrentTurn(rollCurrentTurn(matchB, sequenceRng([6, 5]))); // P: 33
  // Turn 6: innkeeper rolls four (2+3)=5 (=20 <= 33) and stops at INNKEEPER_MAX_ROLLS_PER_TURN
  matchB = playInnkeeperTurn(matchB, sequenceRng([2, 3, 2, 3, 2, 3, 2, 3, 6, 6]));
  assert.equal(matchB.phase, 'finished');
  assert.equal(matchB.innkeeperScore, INNKEEPER_MAX_ROLLS_PER_TURN * 5);
  assert.equal(matchB.outcome, 'player_win');
});

test('six turns finish with explicit draw when scores are equal', () => {
  let match = createLocandiereMatch(7);
  match = bankCurrentTurn(rollCurrentTurn(match, sequenceRng([5, 4]))); // P: 9
  match = playInnkeeperTurn(match, sequenceRng([4, 5, 3, 4])); // I: 16
  match = bankCurrentTurn(rollCurrentTurn(match, sequenceRng([3, 4]))); // P: 16
  match = playInnkeeperTurn(match, sequenceRng([1, 1])); // I busts -> 16
  match = bankCurrentTurn(rollCurrentTurn(match, sequenceRng([2, 3]))); // P: 21
  // T6 Innkeeper: 2+3=5 -> 21 -> still <= 21, next roll 1+1 busts -> 16? Wait: let's bust after 5+0:
  // Actually: P banks 16 total (0+16), I has 16 total, T5 P banks 2+3=5? No, make P=16, I=16:
  let drawMatch = createLocandiereMatch(70);
  drawMatch = bankCurrentTurn(rollCurrentTurn(drawMatch, sequenceRng([4, 5]))); // P: 9
  drawMatch = playInnkeeperTurn(drawMatch, sequenceRng([4, 5, 3, 4])); // I: 16
  drawMatch = bankCurrentTurn(rollCurrentTurn(drawMatch, sequenceRng([3, 4]))); // P: 16
  drawMatch = playInnkeeperTurn(drawMatch, sequenceRng([1, 1])); // I: 16
  drawMatch = bankCurrentTurn(rollCurrentTurn(drawMatch, sequenceRng([1, 1]))); // Bust! Actually rollCurrentTurn([1,1]) advances turn!
  drawMatch = playInnkeeperTurn(drawMatch, sequenceRng([1, 1])); // I: 16

  assert.equal(drawMatch.phase, 'finished');
  assert.equal(drawMatch.playerScore, 16);
  assert.equal(drawMatch.innkeeperScore, 16);
  assert.equal(drawMatch.outcome, 'draw');
  assert.equal(shouldInnkeeperRollAgain(drawMatch), false);
});

test('finished match ignores further rolls and banks', () => {
  let match = createLocandiereMatch(8);
  match = bankCurrentTurn(rollCurrentTurn(match, sequenceRng([6, 5])));
  match = rollCurrentTurn(match, sequenceRng([1, 1]));
  match = bankCurrentTurn(rollCurrentTurn(match, sequenceRng([6, 5])));
  match = rollCurrentTurn(match, sequenceRng([1, 1]));
  match = bankCurrentTurn(rollCurrentTurn(match, sequenceRng([6, 5])));
  match = rollCurrentTurn(match, sequenceRng([1, 1]));

  assert.equal(match.phase, 'finished');
  assert.equal(match.outcome, 'player_win');
  assert.equal(rollCurrentTurn(match, sequenceRng([6, 6])), match);
  assert.equal(bankCurrentTurn(match), match);
});
