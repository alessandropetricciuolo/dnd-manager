import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPRITE_GRID_SIZE,
  buildCharacterSpritePalette,
  buildRetroSpritePixels,
  deriveAutonomousBehavior,
  poseForAction,
  resolveClassArchetype,
  resolveRaceTrait,
} from '../retro-sprite';
import {
  ACCENT_SWATCH_OPTIONS,
  CAPE_STYLE_OPTIONS,
  EYE_SWATCH_OPTIONS,
  FACIAL_FEATURE_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HAIR_SWATCH_OPTIONS,
  HEADGEAR_OPTIONS,
  MAIN_HAND_OPTIONS,
  OFF_HAND_OPTIONS,
  OUTFIT_SWATCH_OPTIONS,
  SKIN_SWATCH_OPTIONS,
  areAppearancesEqual,
  isValidAppearancePayload,
  normalizeTamagotchiAppearance,
} from '../tamagotchi-appearance';

test('resolveClassArchetype and resolveRaceTrait map D&D 5e Italian/English labels', () => {
  assert.equal(resolveClassArchetype('Mago'), 'mage');
  assert.equal(resolveClassArchetype('Ladro'), 'rogue');
  assert.equal(resolveClassArchetype('Barbaro'), 'barbarian');
  assert.equal(resolveClassArchetype('Guerriero'), 'warrior');

  assert.equal(resolveRaceTrait('elf-high'), 'elf');
  assert.equal(resolveRaceTrait('tiefling'), 'tiefling');
  assert.equal(resolveRaceTrait('dragonborn'), 'dragonborn');
  assert.equal(resolveRaceTrait('nano'), 'dwarf');
});

test('buildRetroSpritePixels produces valid 48x48 rects for all poses, races, and archetypes', () => {
  assert.equal(SPRITE_GRID_SIZE, 48);
  const poses = ['idle_a', 'idle_b', 'walk_a', 'walk_b', 'happy', 'eat', 'rest', 'clean', 'droop'] as const;
  const races = ['human', 'elf', 'dwarf', 'tiefling', 'dragonborn', 'orc', 'small'] as const;
  const archetypes = ['warrior', 'mage', 'rogue', 'cleric', 'bard', 'barbarian', 'ranger', 'monk'] as const;

  const palette = buildCharacterSpritePalette({
    characterName: 'Thorin',
    imageUrl: 'https://example.com/thorin.png',
    characterClass: 'Guerriero',
    raceSlug: 'dwarf',
  });

  for (const pose of poses) {
    const rects = buildRetroSpritePixels({
      palette,
      archetype: 'warrior',
      race: 'dwarf',
      pose,
      frame: 2,
    });
    assert.ok(rects.length > 40, `expected 48x48 rects for pose ${pose}`);
    for (const r of rects) {
      assert.ok(r.x >= 0 && r.x + r.w <= SPRITE_GRID_SIZE, `x out of bounds for ${pose}`);
      assert.ok(r.y >= 0 && r.y + r.h <= SPRITE_GRID_SIZE, `y out of bounds for ${pose}`);
    }
  }

  for (const race of races) {
    for (const archetype of archetypes) {
      const rects = buildRetroSpritePixels({
        palette,
        archetype,
        race,
        pose: 'idle_a',
      });
      assert.ok(rects.length > 40, `expected rects for ${race}/${archetype}`);
      for (const r of rects) {
        assert.ok(r.x >= 0 && r.x + r.w <= SPRITE_GRID_SIZE);
        assert.ok(r.y >= 0 && r.y + r.h <= SPRITE_GRID_SIZE);
      }
    }
  }
});

test('all unlocked customization options render within 48x48 bounds and alter palette/pixels', () => {
  const defaultPalette = buildCharacterSpritePalette({
    characterName: 'Lyra',
    characterClass: 'Guerriero',
    raceSlug: 'human',
  });
  const customAppearance = {
    skinSwatch: 'indigo_tiefling' as const,
    eyeSwatch: 'ruby' as const,
    hairStyle: 'ponytail' as const,
    hairSwatch: 'silver' as const,
    facialFeature: 'eyepatch' as const,
    outfitSwatch: 'brass_gold' as const,
    accentSwatch: 'violet' as const,
    headgear: 'crown' as const,
    capeStyle: 'long_cape' as const,
    mainHand: 'greatsword' as const,
    offHand: 'lantern' as const,
  };
  const customPalette = buildCharacterSpritePalette({
    characterName: 'Lyra',
    characterClass: 'Guerriero',
    raceSlug: 'human',
    appearance: customAppearance,
  });

  assert.notEqual(defaultPalette.skin, customPalette.skin);
  assert.notEqual(defaultPalette.iris, customPalette.iris);
  assert.notEqual(defaultPalette.hair, customPalette.hair);
  assert.notEqual(defaultPalette.primary, customPalette.primary);
  assert.notEqual(defaultPalette.accent, customPalette.accent);

  const defaultRects = buildRetroSpritePixels({
    palette: defaultPalette,
    archetype: 'warrior',
    race: 'human',
    pose: 'idle_a',
  });
  const customRects = buildRetroSpritePixels({
    palette: customPalette,
    archetype: 'warrior',
    race: 'human',
    pose: 'idle_a',
    appearance: customAppearance,
  });
  assert.notDeepEqual(defaultRects, customRects);

  // Stress-test every mainHand, offHand, headgear, facialFeature, hairStyle, and capeStyle
  for (const mainOpt of MAIN_HAND_OPTIONS) {
    for (const offOpt of OFF_HAND_OPTIONS) {
      const app = normalizeTamagotchiAppearance({
        mainHand: mainOpt.id,
        offHand: offOpt.id,
      });
      const rects = buildRetroSpritePixels({
        palette: customPalette,
        archetype: 'warrior',
        race: 'tiefling',
        pose: 'happy',
        appearance: app,
      });
      for (const r of rects) {
        assert.ok(r.x >= 0 && r.x + r.w <= SPRITE_GRID_SIZE);
        assert.ok(r.y >= 0 && r.y + r.h <= SPRITE_GRID_SIZE);
      }
    }
  }

  for (const hg of HEADGEAR_OPTIONS) {
    for (const ff of FACIAL_FEATURE_OPTIONS) {
      for (const hs of HAIR_STYLE_OPTIONS) {
        for (const cs of CAPE_STYLE_OPTIONS) {
          const app = normalizeTamagotchiAppearance({
            headgear: hg.id,
            facialFeature: ff.id,
            hairStyle: hs.id,
            capeStyle: cs.id,
          });
          const rects = buildRetroSpritePixels({
            palette: customPalette,
            archetype: 'mage',
            race: 'elf',
            pose: 'walk_a',
            appearance: app,
            frame: 1,
          });
          assert.ok(rects.length > 40);
        }
      }
    }
  }

  // Verify swatch catalogs have options
  assert.ok(SKIN_SWATCH_OPTIONS.length >= 10);
  assert.ok(EYE_SWATCH_OPTIONS.length >= 8);
  assert.ok(HAIR_SWATCH_OPTIONS.length >= 8);
  assert.ok(OUTFIT_SWATCH_OPTIONS.length >= 9);
  assert.ok(ACCENT_SWATCH_OPTIONS.length >= 8);
});

test('normalizeTamagotchiAppearance, isValidAppearancePayload, and areAppearancesEqual validate cleanly', () => {
  assert.equal(normalizeTamagotchiAppearance(null), undefined);
  assert.equal(normalizeTamagotchiAppearance({ skinSwatch: 'auto', mainHand: 'auto' }), undefined);
  assert.deepEqual(
    normalizeTamagotchiAppearance({ skinSwatch: 'moon_elf', mainHand: 'bow', hairStyle: 'auto' }),
    { skinSwatch: 'moon_elf', mainHand: 'bow' }
  );

  assert.equal(isValidAppearancePayload(null), true);
  assert.equal(isValidAppearancePayload({ skinSwatch: 'moon_elf', mainHand: 'bow' }), true);
  assert.equal(isValidAppearancePayload({ skinSwatch: 'invalid_color' }), false);
  assert.equal(isValidAppearancePayload({ unknownSlot: 'sword' }), false);

  assert.equal(areAppearancesEqual(undefined, { skinSwatch: undefined }), true);
  assert.equal(
    areAppearancesEqual({ skinSwatch: 'fair', mainHand: 'sword' }, { mainHand: 'sword', skinSwatch: 'fair' }),
    true
  );
  assert.equal(areAppearancesEqual({ mainHand: 'sword' }, { mainHand: 'axe' }), false);
});

test('deriveAutonomousBehavior reacts to low hunger, energy, hygiene, and happiness', () => {
  const hungry = deriveAutonomousBehavior({ hunger: 25, happiness: 80, energy: 80, hygiene: 80 });
  assert.equal(hungry.urgentNeed, 'hunger');
  assert.equal(hungry.jittery, true);
  assert.equal(hungry.thoughtTag, 'food');

  const sleepy = deriveAutonomousBehavior({ hunger: 80, happiness: 80, energy: 20, hygiene: 80 });
  assert.equal(sleepy.urgentNeed, 'energy');
  assert.ok(sleepy.restChance >= 0.5);
  assert.equal(sleepy.thoughtTag, 'sleep');

  const dirty = deriveAutonomousBehavior({ hunger: 80, happiness: 80, energy: 80, hygiene: 35 });
  assert.equal(dirty.urgentNeed, 'hygiene');
  assert.equal(dirty.thoughtTag, 'clean');

  const sad = deriveAutonomousBehavior({ hunger: 80, happiness: 25, energy: 80, hygiene: 80 });
  assert.equal(sad.urgentNeed, 'happiness');
  assert.equal(sad.thoughtTag, 'bored');

  const happy = deriveAutonomousBehavior({ hunger: 90, happiness: 90, energy: 90, hygiene: 90 });
  assert.equal(happy.urgentNeed, null);
  assert.equal(happy.thoughtTag, 'happy');
});

test('poseForAction maps commands to animated poses', () => {
  assert.equal(poseForAction('feed', 0), 'eat');
  assert.equal(poseForAction('play', 0), 'happy');
  assert.equal(poseForAction('rest', 0), 'rest');
  assert.equal(poseForAction('clean', 0), 'clean');
  assert.equal(poseForAction('pet', 0), 'happy');
});
