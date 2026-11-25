import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CAULDRON_RECIPE_LENGTH,
  GEAR_ITEMS,
  HEARTH_TOTAL_PUFFS,
  PANTRY_INGREDIENTS,
  cleanHygieneStain,
  createCauldronGame,
  createHearthGame,
  createHygieneGame,
  evaluatePuffLevel,
  finishHygieneGame,
  getHearthRoundConfig,
  getHygieneProgress,
  pickCauldronIngredient,
  recordHearthPuff,
  selectHygieneItem,
  serveCauldronMeal,
  startCauldronCooking,
} from '../care-mini-games';

// ============================================================================
// 1. La pentola della Taverna (hunger)
// ============================================================================

test('createCauldronGame generates 3 distinct pantry ingredients in memorizing phase and transitions to cooking', () => {
  const initial = createCauldronGame(() => 0);
  assert.equal(initial.phase, 'memorizing');
  assert.equal(initial.recipe.length, CAULDRON_RECIPE_LENGTH);
  assert.equal(new Set(initial.recipe).size, CAULDRON_RECIPE_LENGTH);
  assert.equal(initial.added.length, 0);
  assert.equal(initial.mistakes, 0);

  const cooking = startCauldronCooking(initial);
  assert.equal(cooking.phase, 'cooking');
});

test('cauldron: 3 correct ingredients + green zone serve yields excellent', () => {
  let game = startCauldronCooking(createCauldronGame(() => 0.1));
  const [i1, i2, i3] = game.recipe;

  game = pickCauldronIngredient(game, i1);
  assert.equal(game.added.length, 1);
  assert.equal(game.mistakes, 0);
  assert.equal(game.phase, 'cooking');

  game = pickCauldronIngredient(game, i2);
  assert.equal(game.added.length, 2);
  assert.equal(game.phase, 'cooking');

  game = pickCauldronIngredient(game, i3);
  assert.equal(game.added.length, 3);
  assert.equal(game.phase, 'ready_to_serve');

  game = serveCauldronMeal(game, 0.52);
  assert.equal(game.phase, 'completed');
  assert.equal(game.excellent, true);
});

test('cauldron: wrong ingredient or missed serve timing marks non-excellent without softlock', () => {
  let game = startCauldronCooking(createCauldronGame(() => 0.2));
  const [i1, i2, i3] = game.recipe;
  const wrongIngredient = PANTRY_INGREDIENTS.find((p) => p.id !== i1)!.id;

  game = pickCauldronIngredient(game, wrongIngredient);
  assert.equal(game.mistakes, 1);
  assert.equal(game.added.length, 0);
  assert.equal(game.phase, 'cooking');
  assert.equal(game.lastFeedback.kind, 'wrong');

  // Player can recover and finish normally
  game = pickCauldronIngredient(game, i1);
  game = pickCauldronIngredient(game, i2);
  game = pickCauldronIngredient(game, i3);
  assert.equal(game.phase, 'ready_to_serve');

  game = serveCauldronMeal(game, 0.5);
  assert.equal(game.phase, 'completed');
  assert.equal(game.excellent, false);

  // Perfect ingredients but missed serve timing also yields excellent=false
  let missedTiming = startCauldronCooking(createCauldronGame(() => 0.2));
  for (const id of missedTiming.recipe) {
    missedTiming = pickCauldronIngredient(missedTiming, id);
  }
  missedTiming = serveCauldronMeal(missedTiming, 0.95);
  assert.equal(missedTiming.phase, 'completed');
  assert.equal(missedTiming.excellent, false);
});

test('cauldron: serveCauldronMeal is ignored before all 3 ingredients are added', () => {
  const game = startCauldronCooking(createCauldronGame(() => 0.5));
  const same = serveCauldronMeal(game);
  assert.equal(same, game);
  assert.equal(same.phase, 'cooking');
});

// ============================================================================
// 2. Il fuoco della branda (energy)
// ============================================================================

test('evaluatePuffLevel classifies weak, ideal, and strong accurately per round', () => {
  const r1 = getHearthRoundConfig(1);
  assert.equal(evaluatePuffLevel(r1.min - 0.05, 1), 'too_weak');
  assert.equal(evaluatePuffLevel(r1.min, 1), 'ideal');
  assert.equal(evaluatePuffLevel((r1.min + r1.max) / 2, 1), 'ideal');
  assert.equal(evaluatePuffLevel(r1.max, 1), 'ideal');
  assert.equal(evaluatePuffLevel(r1.max + 0.05, 1), 'too_strong');

  const r3 = getHearthRoundConfig(3);
  assert.ok(r3.fillPerSecond > r1.fillPerSecond);
  assert.equal(evaluatePuffLevel(0.55, 3), 'too_weak');
});

test('hearth: 3 ideal puffs complete with excellent=true', () => {
  let game = createHearthGame();

  for (let i = 0; i < HEARTH_TOTAL_PUFFS; i += 1) {
    game = recordHearthPuff(game, 0.71);
  }

  assert.equal(game.phase, 'completed');
  assert.equal(game.puffs.length, HEARTH_TOTAL_PUFFS);
  assert.equal(game.excellent, true);
  assert.equal(game.fireLevel, HEARTH_TOTAL_PUFFS);
});

test('hearth: missed puff still progresses without lock and completes with excellent=false', () => {
  let game = createHearthGame();
  const mid = 0.71;

  game = recordHearthPuff(game, 0.2); // too_weak
  assert.equal(game.lastOutcome, 'too_weak');
  assert.equal(game.round, 2);
  assert.equal(game.phase, 'ready');

  game = recordHearthPuff(game, 0.98); // too_strong
  assert.equal(game.lastOutcome, 'too_strong');
  assert.equal(game.round, 3);

  game = recordHearthPuff(game, mid); // ideal
  assert.equal(game.phase, 'completed');
  assert.equal(game.excellent, false);

  // Further puffs after completion are ignored
  assert.equal(recordHearthPuff(game, mid), game);
});

// ============================================================================
// 3. Armatura da ripulire (hygiene)
// ============================================================================

test('hygiene: requires at least 1 stain per item before finish is allowed', () => {
  let game = createHygieneGame();
  assert.equal(getHygieneProgress(game).canFinish, false);
  assert.equal(finishHygieneGame(game), game);

  // Clean 1 stain on armor and 1 on boots, none on cloak -> still cannot finish
  const armorStain = game.stains.find((s) => s.itemId === 'armor' && s.kind === 'dust')!;
  const bootsStain = game.stains.find((s) => s.itemId === 'boots' && s.kind === 'dust')!;
  const cloakStain = game.stains.find((s) => s.itemId === 'cloak' && s.kind === 'dust')!;

  game = cleanHygieneStain(game, armorStain.id);
  game = selectHygieneItem(game, 'boots');
  game = cleanHygieneStain(game, bootsStain.id);
  assert.equal(getHygieneProgress(game).canFinish, false);

  // Clean 1 on cloak -> now canFinish = true, but not excellent
  game = selectHygieneItem(game, 'cloak');
  game = cleanHygieneStain(game, cloakStain.id);
  const progress = getHygieneProgress(game);
  assert.equal(progress.canFinish, true);
  assert.equal(progress.allClean, false);

  game = finishHygieneGame(game);
  assert.equal(game.phase, 'completed');
  assert.equal(game.excellent, false);
});

test('hygiene: cleaning all stains (including 3-hit crusts) across all 3 items yields excellent=true', () => {
  let game = createHygieneGame();
  assert.equal(GEAR_ITEMS.length, 3);

  for (const stain of game.stains) {
    for (let hit = 0; hit < stain.maxHits; hit += 1) {
      game = cleanHygieneStain(game, stain.id);
    }
  }

  const progress = getHygieneProgress(game);
  assert.equal(progress.allClean, true);
  assert.equal(progress.canFinish, true);
  assert.equal(progress.remaining, 0);

  game = finishHygieneGame(game);
  assert.equal(game.phase, 'completed');
  assert.equal(game.excellent, true);
});
