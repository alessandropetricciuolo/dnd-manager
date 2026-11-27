import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMonsterStatInteger, WikiLruCache } from '../wiki-cache';

test('WikiLruCache evicts least recently used entry and supports prefix invalidation', () => {
  const cache = new WikiLruCache<string>(3);
  cache.set('u1:c1:a', 'A');
  cache.set('u1:c1:b', 'B');
  cache.set('u1:c2:c', 'C');

  // Touch 'a' so 'b' becomes oldest
  assert.equal(cache.get('u1:c1:a'), 'A');
  cache.set('u1:c2:d', 'D');

  assert.equal(cache.get('u1:c1:b'), undefined);
  assert.equal(cache.get('u1:c1:a'), 'A');

  cache.invalidatePrefix('u1:c1:');
  assert.equal(cache.get('u1:c1:a'), undefined);
  assert.equal(cache.get('u1:c2:c'), 'C');
});

test('parseMonsterStatInteger extracts leading integer from D&D stat strings', () => {
  assert.equal(parseMonsterStatInteger('135 (18d10 + 36)', 10), 135);
  assert.equal(parseMonsterStatInteger('17 (armatura naturale)', 12), 17);
  assert.equal(parseMonsterStatInteger('', 14), 14);
  assert.equal(parseMonsterStatInteger(undefined, 10), 10);
});
