import test from 'node:test';
import assert from 'node:assert/strict';
import { computeQuickHpOutcome } from '../character-hp';

test('damage absorbs temp HP before reducing current HP', () => {
  assert.deepEqual(computeQuickHpOutcome(20, 30, 5, -3), { hitPoints: 20, tempHp: 2 });
  assert.deepEqual(computeQuickHpOutcome(20, 30, 5, -8), { hitPoints: 17, tempHp: 0 });
});

test('healing caps at max HP and leaves temp HP untouched', () => {
  assert.deepEqual(computeQuickHpOutcome(27, 30, 5, 5), { hitPoints: 30 });
});
