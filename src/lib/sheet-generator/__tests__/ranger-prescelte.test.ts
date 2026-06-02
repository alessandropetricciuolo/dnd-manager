import test from "node:test";
import assert from "node:assert/strict";
import {
  favoredEnemyCountForLevel,
  favoredTerrainCountForLevel,
  injectRangerPrescelteChoices,
  pickRangerFavoredEnemies,
  pickRangerFavoredTerrains,
} from "@/lib/sheet-generator/ranger-meta";

test("ranger prescelte: conteggio scelte per livello", () => {
  assert.equal(favoredEnemyCountForLevel(5), 1);
  assert.equal(favoredEnemyCountForLevel(6), 2);
  assert.equal(favoredEnemyCountForLevel(14), 3);
  assert.equal(favoredTerrainCountForLevel(5), 1);
  assert.equal(favoredTerrainCountForLevel(6), 2);
  assert.equal(favoredTerrainCountForLevel(10), 3);
});

test("ranger prescelte: scelte stabili e distinte", () => {
  const seed = "Ranger|Cael|elfo||forestiero|Cacciatore|5";
  const a = pickRangerFavoredEnemies(seed, 5);
  const b = pickRangerFavoredEnemies(seed, 5);
  assert.deepEqual(a, b);
  assert.equal(a.length, 1);
  const t = pickRangerFavoredTerrains(seed, 5);
  assert.equal(t.length, 1);
  const at6 = pickRangerFavoredEnemies(seed, 6);
  assert.equal(at6.length, 2);
  assert.notDeepEqual(at6[0], at6[1]);
});

test("injectRangerPrescelteChoices inserisce Scelta nei blocchi", () => {
  const md = `### NEMICO PRESCELTO

Testo nemico.

### ESPLORATORE NATO

Testo terreno.`;
  const out = injectRangerPrescelteChoices(md, "seed", 5);
  assert.match(out, /### NEMICO PRESCELTO[\s\S]*\*\*Scelta:\*\*/i);
  assert.match(out, /### ESPLORATORE NATO[\s\S]*\*\*Scelta:\*\*/i);
});
