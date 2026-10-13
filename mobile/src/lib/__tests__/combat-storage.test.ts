import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createCombatStorageWritePlan,
  getCombatStorageKey,
  parseCombatSnapshot,
  parseCombatStorageManifest,
  CombatSnapshot,
} from '../combat-storage';

const snapshot: CombatSnapshot = {
  combatants: [
    {
      id: 'hero-1',
      name: 'Mira',
      initiative: 14,
      hp: 0,
      maxHp: 24,
      ac: 15,
      isEnemy: false,
      conditions: ['Privo di sensi'],
      characterId: 'character-1',
    },
  ],
  round: 3,
  currentTurnIndex: 0,
};

test('combat storage keys separate both account and campaign', () => {
  assert.notEqual(getCombatStorageKey('user-a', 'campaign-1'), getCombatStorageKey('user-b', 'campaign-1'));
  assert.notEqual(getCombatStorageKey('user-a', 'campaign-1'), getCombatStorageKey('user-a', 'campaign-2'));
  assert.equal(getCombatStorageKey(null, 'campaign-1'), null);
});

test('snapshot validation round-trips zero HP and rejects malformed indexes or rounds', () => {
  assert.deepEqual(parseCombatSnapshot(JSON.stringify(snapshot)), snapshot);
  assert.throws(() => parseCombatSnapshot(JSON.stringify({ ...snapshot, round: 1.5 })), /invalid_combat_snapshot/);
  assert.throws(() => parseCombatSnapshot(JSON.stringify({ ...snapshot, currentTurnIndex: 1 })), /invalid_combat_snapshot/);
  assert.throws(() => parseCombatSnapshot(JSON.stringify({ ...snapshot, combatants: null })), /invalid_combat_snapshot/);
});

test('revision manifests point only to a bounded, complete chunk set', () => {
  const plan = createCombatStorageWritePlan('bnd_combat_v2_user_campaign', snapshot, 'rev-a');
  assert.equal(plan.manifest.version, 2);
  assert.equal(plan.manifest.chunks, plan.chunks.length);
  assert.ok(plan.chunks.every((chunk) => chunk.key.includes('_rev-a_')));
  assert.deepEqual(parseCombatStorageManifest(JSON.stringify(plan.manifest)), plan.manifest);
  assert.throws(
    () => parseCombatStorageManifest(JSON.stringify({ version: 2, revision: 'r', chunks: 1001 })),
    /invalid_combat_manifest/
  );
});
