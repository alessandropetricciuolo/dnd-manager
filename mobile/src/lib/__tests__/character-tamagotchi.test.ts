import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARE_TROPHY_THRESHOLD,
  applyTamagotchiAction,
  applyTamagotchiAppearance,
  applyTamagotchiCareGameReward,
  applyTamagotchiDecay,
  applyTamagotchiInnkeeperTrophy,
  createInitialTamagotchiState,
  deriveTamagotchiMood,
  getTamagotchiActionCooldownRemainingMs,
  normalizeTamagotchiState,
} from '../character-tamagotchi';

test('applyTamagotchiDecay reduces stats over elapsed hours within 0..100 bounds', () => {
  const t0 = '2026-11-22T10:00:00.000Z';
  const t1 = '2026-11-22T20:00:00.000Z'; // +10 hours
  const initial = createInitialTamagotchiState(t0);

  const decayed = applyTamagotchiDecay(initial, t1);
  assert.ok(decayed.hunger < initial.hunger);
  assert.ok(decayed.happiness < initial.happiness);
  assert.ok(decayed.energy < initial.energy);
  assert.ok(decayed.hygiene < initial.hygiene);
  assert.ok(decayed.hunger >= 0 && decayed.hunger <= 100);
});

test('applyTamagotchiAction updates stats, enforces cooldown, and logs event', () => {
  const t0 = '2026-11-22T10:00:00.000Z';
  const base = { ...createInitialTamagotchiState(t0), hunger: 40 };

  const first = applyTamagotchiAction(base, 'feed', 'Thorin', '2026-11-22T10:05:00.000Z');
  assert.equal(first.applied, true);
  assert.equal(first.state.hunger, 52);
  assert.equal(first.state.recentLogs.length, 1);
  assert.match(first.state.recentLogs[0].text, /Thorin/);

  // Immediate repeat triggers cooldown
  const second = applyTamagotchiAction(first.state, 'feed', 'Thorin', '2026-11-22T10:06:00.000Z');
  assert.equal(second.applied, false);
  assert.ok(second.cooldownRemainingMs > 0);
});

test('deriveTamagotchiMood prioritizes urgent needs, bored happiness, and radiant state', () => {
  const hungry = { ...createInitialTamagotchiState(), hunger: 20 };
  assert.equal(deriveTamagotchiMood(hungry).mood, 'affamato');

  const bored = { ...createInitialTamagotchiState(), hunger: 60, energy: 60, hygiene: 60, happiness: 25 };
  assert.equal(deriveTamagotchiMood(bored).mood, 'annoiato');

  const radiant = { ...createInitialTamagotchiState(), hunger: 90, happiness: 90, energy: 90, hygiene: 90 };
  assert.equal(deriveTamagotchiMood(radiant).mood, 'radioso');
});

test('applyTamagotchiCareGameReward unlocks permanent care trophy after 3 excellent completions', () => {
  let state = { ...createInitialTamagotchiState('2026-11-22T10:00:00.000Z'), hunger: 30 };
  const times = [
    '2026-11-22T10:05:00.000Z',
    '2026-11-22T10:25:00.000Z',
    '2026-11-22T10:45:00.000Z',
  ];

  for (let i = 0; i < CARE_TROPHY_THRESHOLD; i += 1) {
    const res = applyTamagotchiCareGameReward(state, 'hunger', true, 'Thorin', times[i]);
    assert.equal(res.applied, true);
    state = res.state;
    if (i < CARE_TROPHY_THRESHOLD - 1) {
      assert.equal(res.trophyUnlocked, false);
    } else {
      assert.equal(res.trophyUnlocked, true);
      assert.equal(state.unlockedCareTrophies?.hunger, times[i]);
    }
  }
});

test('applyTamagotchiInnkeeperTrophy unlocks once without bar deltas or play cooldown, and is preserved across normalization, decay, and actions', () => {
  const t0 = '2026-11-22T10:00:00.000Z';
  const t1 = '2026-11-22T10:05:00.000Z';
  const t2 = '2026-11-22T10:06:00.000Z';
  const t3 = '2026-11-22T15:00:00.000Z';
  const base = { ...createInitialTamagotchiState(t0), hunger: 60, happiness: 55, energy: 70, hygiene: 65 };

  const unlocked = applyTamagotchiInnkeeperTrophy(base, 'Thorin', t1);
  assert.equal(unlocked.applied, true);
  assert.equal(unlocked.cooldownRemainingMs, 0);
  assert.equal(unlocked.state.innkeeperTrophyUnlockedAt, t1);
  assert.equal(unlocked.state.hunger, 60);
  assert.equal(unlocked.state.happiness, 55);
  assert.equal(unlocked.state.energy, 70);
  assert.equal(unlocked.state.hygiene, 65);
  assert.equal(unlocked.state.lastActionByType.play, undefined);
  assert.equal(getTamagotchiActionCooldownRemainingMs(unlocked.state, 'play', t1), 0);
  assert.equal(unlocked.state.recentLogs.length, 1);
  assert.match(unlocked.state.recentLogs[0].text, /Dado d’Ottone/);

  // Second claim is idempotent with understandable message and no duplicate diary entry
  const duplicate = applyTamagotchiInnkeeperTrophy(unlocked.state, 'Thorin', t2);
  assert.equal(duplicate.applied, false);
  assert.equal(duplicate.cooldownRemainingMs, 0);
  assert.equal(duplicate.state.innkeeperTrophyUnlockedAt, t1);
  assert.equal(duplicate.state.recentLogs.length, 1);
  assert.match(duplicate.message, /già sbloccato/i);

  // Preserved across normalization, decay, and normal actions (including play immediately after)
  const normalized = normalizeTamagotchiState(unlocked.state, t2);
  assert.equal(normalized.innkeeperTrophyUnlockedAt, t1);

  const afterPlay = applyTamagotchiAction(normalized, 'play', 'Thorin', t2);
  assert.equal(afterPlay.applied, true);
  assert.equal(afterPlay.state.innkeeperTrophyUnlockedAt, t1);

  const afterFeed = applyTamagotchiAction(afterPlay.state, 'feed', 'Thorin', t2);
  assert.equal(afterFeed.applied, true);
  assert.equal(afterFeed.state.innkeeperTrophyUnlockedAt, t1);

  const decayed = applyTamagotchiDecay(afterFeed.state, t3);
  assert.equal(decayed.innkeeperTrophyUnlockedAt, t1);
});

test('applyTamagotchiAppearance updates and resets appearance without altering bars, decay, or cooldowns', () => {
  const t0 = '2026-11-22T10:00:00.000Z';
  const t1 = '2026-11-22T10:05:00.000Z';
  const t2 = '2026-11-22T12:00:00.000Z';
  const base = { ...createInitialTamagotchiState(t0), hunger: 72, happiness: 68, energy: 80, hygiene: 64 };

  const customized = applyTamagotchiAppearance(
    base,
    {
      skinSwatch: 'crimson_tiefling',
      eyeSwatch: 'amber',
      hairStyle: 'long',
      outfitSwatch: 'obsidian',
      mainHand: 'staff',
      offHand: 'tome',
    },
    'Morthos',
    t1
  );

  assert.equal(customized.applied, true);
  assert.equal(customized.cooldownRemainingMs, 0);
  assert.equal(customized.state.hunger, 72);
  assert.equal(customized.state.happiness, 68);
  assert.equal(customized.state.energy, 80);
  assert.equal(customized.state.hygiene, 64);
  assert.equal(customized.state.lastUpdatedAt, t0);
  assert.deepEqual(customized.state.appearance, {
    skinSwatch: 'crimson_tiefling',
    eyeSwatch: 'amber',
    hairStyle: 'long',
    outfitSwatch: 'obsidian',
    mainHand: 'staff',
    offHand: 'tome',
  });

  // Preserved across normalization, actions, and decay
  const normalized = normalizeTamagotchiState(customized.state, t1);
  assert.deepEqual(normalized.appearance, customized.state.appearance);

  const afterClean = applyTamagotchiAction(normalized, 'clean', 'Morthos', t1);
  assert.deepEqual(afterClean.state.appearance, customized.state.appearance);

  const decayed = applyTamagotchiDecay(afterClean.state, t2);
  assert.deepEqual(decayed.appearance, customized.state.appearance);

  // Resetting to null clears appearance cleanly
  const reset = applyTamagotchiAppearance(decayed, null, 'Morthos', t2);
  assert.equal(reset.applied, true);
  assert.equal(reset.state.appearance, undefined);
});
