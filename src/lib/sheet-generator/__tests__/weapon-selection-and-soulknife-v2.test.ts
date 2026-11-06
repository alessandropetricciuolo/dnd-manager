import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadRogueEvidence } from '@/lib/server/rogue-source';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';
import {
  WEAPON_CATALOG,
  findWeaponDefinition,
  computeWeaponAttack,
  isCharacterProficientWithWeapon,
  getDefaultWeaponsForClass,
  type CharacterCombatWeaponContext,
} from '../weapon-catalog';
import {
  resolveBuildChoicesPreview,
  validateBuildOverrides,
} from '../build-choices';
import { reconcileV2ExportPayload } from '../reconcile-v2-choices';
import { cleanAndFilterManualFeatureBody } from '../feature-operative-summaries';
import type { CharacterGeneratorInput } from '../types';

function makeInput(overrides: Partial<CharacterGeneratorInput> & { characterName: string; classLabel: string; level: number }): CharacterGeneratorInput {
  return {
    raceSlug: 'umano',
    subraceSlug: null,
    backgroundSlug: 'criminale',
    classSubclass: null,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
    ...overrides,
  };
}

test('Ervin Vane: Soulknife level 5 resources, dice, and Psychic Blades', async () => {
  const result = await buildGeneratedCharacterSheet(
    makeInput({
      characterName: 'Ervin Vane',
      raceSlug: 'mezzelfo',
      classLabel: 'Ladro',
      classSubclass: 'Lama Spirituale',
      backgroundSlug: 'criminale',
      level: 5,
      age: '35',
      height: '180',
      weight: '75',
      sex: 'M',
    })
  );

  const sheet = result.sheet;
  assert.ok(sheet);
  assert.equal(sheet.level, 5);
  assert.equal(sheet.proficiencyBonus, 3);

  // 1. Rogue resources from rogue-source
  const evidence = await loadRogueEvidence(sheet);
  assert.ok(evidence.resources.psionicDice);
  assert.equal(evidence.resources.psionicDice.count, 6);
  assert.equal(evidence.resources.psionicDice.die, 'd8');

  // 2. Psychic blades in weaponRows
  const psychicPrimary = sheet.weaponRows.find((w) => w.name === 'Lama psichica');
  const psychicSecondary = sheet.weaponRows.find((w) => w.name === 'Lama psichica secondaria');
  assert.ok(psychicPrimary, 'Primary psychic blade must exist');
  assert.ok(psychicSecondary, 'Secondary psychic blade must exist');

  // +6 to hit (+3 PB + 3 DEX), 1d6+3 psychic damage
  assert.equal(psychicPrimary.toHit, '+6');
  assert.equal(psychicPrimary.damage, '1d6+DES');
  assert.ok(psychicPrimary.type.includes('psichici'));

  // +6 to hit, 1d4+3 psychic damage
  assert.equal(psychicSecondary.toHit, '+6');
  assert.equal(psychicSecondary.damage, '1d4+DES');
  assert.ok(psychicSecondary.type.includes('psichici'));
  assert.ok(psychicSecondary.type.includes('az. bonus'));

  // Psychic blades must NOT be in physical inventory
  assert.ok(
    !sheet.inventory.some((i) => i.toLowerCase().includes('lama psichica')),
    'Psychic blades must not be in physical inventory'
  );

  // Coexists with physical weapons without duplication
  const stoccoAttacks = sheet.weaponRows.filter((w) => w.name.toLowerCase().includes('stocco'));
  assert.equal(stoccoAttacks.length, 1, 'Physical stocco must appear once without duplicate');

  // 3. OCR cleanups: no "d?" or "dō"
  const rawOcr = 'Questa energia è rappresentata dai suoi dadi di Energia Psionica, ognuno dei quali è un d?.';
  const cleaned = cleanAndFilterManualFeatureBody(rawOcr, 5);
  assert.ok(!cleaned.includes('d?'), 'Must not contain d?');
  assert.ok(!cleaned.includes('dō'), 'Must not contain dō');
  assert.ok(cleaned.includes('d8'), 'Must display level 5 die (d8)');

  // 4. Render to PDF successfully without throw
  const logo = await fs.readFile(path.join(process.cwd(), 'public/logo.png'));
  const pdfBytes = await renderCharacterSheetV2(sheet, logo, { rogueEvidence: evidence });
  assert.ok(pdfBytes.length > 50_000);
});

test('Psionic dice progression at thresholds 3, 5, 11, and 17', async () => {
  const levels = [
    { lvl: 3, expectedCount: 4, expectedDie: 'd6' },
    { lvl: 5, expectedCount: 6, expectedDie: 'd8' },
    { lvl: 11, expectedCount: 8, expectedDie: 'd10' },
    { lvl: 17, expectedCount: 12, expectedDie: 'd12' },
  ];

  for (const { lvl, expectedCount, expectedDie } of levels) {
    const res = await buildGeneratedCharacterSheet(
      makeInput({
        characterName: `Lama ${lvl}`,
        classLabel: 'Ladro',
        classSubclass: 'Lama Spirituale',
        backgroundSlug: 'criminale',
        level: lvl,
      })
    );
    const ev = await loadRogueEvidence(res.sheet);
    assert.ok(ev.resources.psionicDice, `Level ${lvl} should have psionicDice`);
    assert.equal(ev.resources.psionicDice.count, expectedCount, `Level ${lvl} count`);
    assert.equal(ev.resources.psionicDice.die, expectedDie, `Level ${lvl} die`);
  }
});

test('Weapons catalog: custom weapon choices, removal, and empty list', async () => {
  // 1. Default weapons for Ladro: stocco, arco-corto
  const defaultLadro = getDefaultWeaponsForClass('Ladro');
  assert.deepEqual(defaultLadro, [{ weaponId: 'stocco' }, { weaponId: 'arco-corto' }]);

  // 2. Custom weapon choice: dardo + pugnale
  const customRes = await buildGeneratedCharacterSheet(
    makeInput({
      characterName: 'Test Armi',
      classLabel: 'Ladro',
      backgroundSlug: 'criminale',
      level: 3,
      buildOverrides: {
        weapons: [{ weaponId: 'dardo' }, { weaponId: 'pugnale' }],
      },
    })
  );

  const customNames = customRes.sheet.weaponRows.map((w) => w.name.toLowerCase());
  assert.ok(customNames.some((n) => n.includes('dardo')));
  assert.ok(customNames.some((n) => n.includes('pugnale')));
  assert.ok(!customNames.some((n) => n.includes('stocco')), 'Stocco must not be present when replaced');

  // Check inventory has dardo and pugnale
  const inv = customRes.sheet.inventory.join(' ').toLowerCase();
  assert.ok(inv.includes('dardo'));
  assert.ok(inv.includes('pugnale'));
  assert.ok(!inv.includes('stocco'));

  // 3. Intentionally empty weapon list: []
  const emptyRes = await buildGeneratedCharacterSheet(
    makeInput({
      characterName: 'Disarmato',
      classLabel: 'Ladro',
      backgroundSlug: 'criminale',
      level: 3,
      buildOverrides: {
        weapons: [],
      },
    })
  );

  assert.equal(emptyRes.sheet.weaponRows.length, 0, 'No weapons if intentionally empty');
});

test('Weapon properties: finesse, ranged, thrown, and versatile 1H/2H', () => {
  const baseCtx: CharacterCombatWeaponContext = {
    classLabel: 'Guerriero',
    level: 5,
    proficiencyBonus: 3,
    abilityMods: { str: 4, dex: 2, con: 2, int: 0, wis: 1, cha: -1 },
    fightingStyles: ['Tiro', 'Duellare'],
    weaponProficiencies: ['Armi semplici', 'Armi da guerra'],
  };

  // Versatile 1-Hand vs 2-Hand
  const longswordDef = findWeaponDefinition('spada-lunga')!;
  assert.ok(longswordDef);
  const oneHanded = computeWeaponAttack(longswordDef, baseCtx, { twoHanded: false });
  assert.equal(oneHanded.toHit, '+7'); // +3 PB + 4 STR
  assert.equal(oneHanded.damage, '1d8+FOR (+2 a 1 mano)'); // Duellare applied
  assert.equal(oneHanded.type, 'taglienti');

  const twoHanded = computeWeaponAttack(longswordDef, baseCtx, { twoHanded: true });
  assert.equal(twoHanded.toHit, '+7');
  assert.equal(twoHanded.damage, '1d10+FOR'); // 1d10, no Duellare
  assert.equal(twoHanded.type, 'taglienti (a 2 mani)');

  // Ranged with Archery (+2 to hit)
  const longbowDef = findWeaponDefinition('arco-lungo')!;
  const ranged = computeWeaponAttack(longbowDef, baseCtx);
  assert.equal(ranged.toHit, '+7'); // +3 PB + 2 DEX + 2 Archery = +7
  assert.equal(ranged.damage, '1d8+DES');

  // Thrown with STR (Giavellotto)
  const javelinDef = findWeaponDefinition('giavellotto')!;
  const thrown = computeWeaponAttack(javelinDef, baseCtx);
  assert.equal(thrown.toHit, '+7'); // +3 PB + 4 STR
  assert.equal(thrown.damage, '1d6+FOR (+2 a 1 mano)');

  // Finesse with higher DEX character
  const dexCtx: CharacterCombatWeaponContext = {
    ...baseCtx,
    abilityMods: { str: -1, dex: 4, con: 2, int: 0, wis: 1, cha: 1 },
    fightingStyles: [],
  };
  const rapierDef = findWeaponDefinition('stocco')!;
  const rapier = computeWeaponAttack(rapierDef, dexCtx);
  assert.equal(rapier.toHit, '+7'); // +3 PB + 4 DEX
  assert.equal(rapier.damage, '1d8+DES');
});

test('Special class weapon handling: Kensei, Pact Weapon, Infused Weapon', () => {
  // 1. Kensei Weapon (Monaco)
  const monkCtx: CharacterCombatWeaponContext = {
    classLabel: 'Monaco',
    classSubclass: 'Via del Kensei',
    level: 5,
    proficiencyBonus: 3,
    abilityMods: { str: 0, dex: 4, con: 2, int: 0, wis: 3, cha: -1 },
    weaponProficiencies: ['Armi semplici', 'Spade corte'],
    kenseiWeapons: ['Spada lunga'],
  };
  const longswordDef = findWeaponDefinition('spada-lunga')!;
  const isKenseiProf = isCharacterProficientWithWeapon(longswordDef, monkCtx.weaponProficiencies, {
    classLabel: monkCtx.classLabel,
    kenseiWeapons: monkCtx.kenseiWeapons,
  });
  assert.equal(isKenseiProf, true, 'Kensei should be proficient with chosen Kensei weapon');
  const kenseiAtk = computeWeaponAttack(longswordDef, monkCtx);
  assert.equal(kenseiAtk.toHit, '+7', 'Kensei weapon uses DEX if higher (+3 PB + 4 DEX = +7)');

  // 2. Infused Weapon (Artefice Battle Smith)
  const artCtx: CharacterCombatWeaponContext = {
    classLabel: 'Artefice',
    classSubclass: 'Fabbro da Battaglia',
    level: 5,
    proficiencyBonus: 3,
    abilityMods: { str: 0, dex: 2, con: 2, int: 4, wis: 0, cha: -1 },
    weaponProficiencies: ['Armi semplici', 'Armi da guerra'],
    infusedWeaponId: 'spada-lunga',
    infusionAttackBonus: 1,
  };
  const infusedAtk = computeWeaponAttack(longswordDef, artCtx);
  assert.equal(infusedAtk.name, 'Spada lunga +1');
  assert.equal(infusedAtk.toHit, '+8', '+3 PB + 4 INT (Battle Smith) + 1 Infusion = +8');
  assert.equal(infusedAtk.damage, '1d8+INT+1');

  // 3. Pact Weapon (Warlock Hexblade)
  const warlockCtx: CharacterCombatWeaponContext = {
    classLabel: 'Warlock',
    classSubclass: 'Guerriero Ectoplasmatico / Lama',
    level: 5,
    proficiencyBonus: 3,
    abilityMods: { str: 0, dex: 2, con: 2, int: 0, wis: 0, cha: 4 },
    weaponProficiencies: ['Armi semplici'],
    pactWeapon: 'Spada lunga',
    hexbladeWeapon: 'Spada lunga',
  };
  const pactProf = isCharacterProficientWithWeapon(longswordDef, warlockCtx.weaponProficiencies, {
    classLabel: warlockCtx.classLabel,
    pactWeapon: warlockCtx.pactWeapon,
    hexbladeWeapon: warlockCtx.hexbladeWeapon,
  });
  assert.equal(pactProf, true, 'Pact weapon grants proficiency');
  const pactAtk = computeWeaponAttack(longswordDef, warlockCtx);
  assert.equal(pactAtk.toHit, '+7', '+3 PB + 4 CHA = +7');
  assert.equal(pactAtk.damage, '1d8+CAR');
});

test('Non-proficient weapon: clearly marked and does not include proficiency bonus', () => {
  const wizardCtx: CharacterCombatWeaponContext = {
    classLabel: 'Mago',
    level: 5,
    proficiencyBonus: 3,
    abilityMods: { str: 0, dex: 2, con: 2, int: 4, wis: 1, cha: 0 },
    weaponProficiencies: ['Pugnali', 'Dardi', 'Fionde', 'Bastoni ferrati', 'Balestre leggere'],
  };
  const greatswordDef = findWeaponDefinition('spadone')!;
  const atk = computeWeaponAttack(greatswordDef, wizardCtx);
  assert.equal(atk.proficient, false);
  assert.equal(atk.toHit, '+0 (non comp.)');
});

test('End-to-end propagation: preview -> overrides -> reconcile -> sheet', async () => {
  const input = makeInput({
    characterName: 'Propagazione Test',
    classLabel: 'Guerriero',
    backgroundSlug: 'soldato',
    level: 5,
  });

  // 1. Preview provides default weapons
  const preview = await resolveBuildChoicesPreview(input);
  assert.ok(preview.overrides.weapons);
  assert.ok(preview.overrides.weapons.length > 0);

  // 2. User modifies weapons in overrides
  const userOverrides = {
    ...preview.overrides,
    weapons: [{ weaponId: 'ascia-bipenne' }],
  };

  // 3. Validation passes
  const errors = validateBuildOverrides(userOverrides, preview);
  assert.equal(errors.length, 0);

  // 4. Reconcile preserves weapons
  const reconciled = reconcileV2ExportPayload({
    input: {
      characterName: input.characterName,
      raceSlug: input.raceSlug,
      subraceSlug: '',
      classLabel: input.classLabel,
      backgroundSlug: input.backgroundSlug,
      level: '5',
      buildOverridesJson: JSON.stringify(userOverrides),
    },
  });
  assert.deepEqual(reconciled.effectiveOverrides.weapons, [{ weaponId: 'ascia-bipenne' }]);

  // 5. Final sheet has chosen weapon
  const finalRes = await buildGeneratedCharacterSheet({
    ...input,
    buildOverrides: reconciled.effectiveOverrides,
  });
  assert.ok(finalRes.sheet.weaponRows.some((w) => w.name.toLowerCase().includes('ascia bipenne')));
  assert.ok(finalRes.sheet.inventory.some((i) => i.toLowerCase().includes('ascia bipenne')));
});

test('Racial weapon proficiencies: Half-Elf has no Elf weapon proficiencies, Elf subraces differ', async () => {
  // 1. Half-Elf Rogue: Ervin Vane has no Archi lunghi
  const ervin = await buildGeneratedCharacterSheet(
    makeInput({
      characterName: 'Ervin Vane',
      raceSlug: 'mezzelfo',
      subraceSlug: null,
      classLabel: 'Ladro',
      level: 5,
    })
  );
  assert.ok(!ervin.sheet.weaponProficiencies.includes('Archi lunghi'), 'Half-elf must not have Archi lunghi');
  assert.ok(ervin.sheet.weaponProficiencies.includes('Stocchi'), 'Rogue has Stocchi');
  assert.ok(ervin.sheet.weaponProficiencies.includes('Balestre a mano'), 'Rogue has Balestre a mano');

  // 2. High Elf Wizard: gets elf weapon training
  const highElf = await buildGeneratedCharacterSheet(
    makeInput({
      characterName: 'High Elf Wizard',
      raceSlug: 'elfo',
      subraceSlug: 'elfo_alto',
      classLabel: 'Mago',
      level: 1,
    })
  );
  assert.ok(highElf.sheet.weaponProficiencies.includes('Archi lunghi'));
  assert.ok(highElf.sheet.weaponProficiencies.includes('Spade lunghe'));
  assert.ok(highElf.sheet.weaponProficiencies.includes('Spade corte'));
  assert.ok(highElf.sheet.weaponProficiencies.includes('Archi corti'));

  // 3. Drow Elf Wizard: gets drow weapon training
  const drow = await buildGeneratedCharacterSheet(
    makeInput({
      characterName: 'Drow Wizard',
      raceSlug: 'elfo',
      subraceSlug: 'elfo_drow',
      classLabel: 'Mago',
      level: 1,
    })
  );
  assert.ok(drow.sheet.weaponProficiencies.includes('Stocchi'));
  assert.ok(drow.sheet.weaponProficiencies.includes('Spade corte'));
  assert.ok(drow.sheet.weaponProficiencies.includes('Balestre a mano'));
  assert.ok(!drow.sheet.weaponProficiencies.includes('Archi lunghi'), 'Drow does not get longbow');

  // 4. Sea Elf Wizard: gets sea elf weapon training
  const seaElf = await buildGeneratedCharacterSheet(
    makeInput({
      characterName: 'Sea Elf Wizard',
      raceSlug: 'elfo_mare',
      subraceSlug: null,
      classLabel: 'Mago',
      level: 1,
    })
  );
  assert.ok(seaElf.sheet.weaponProficiencies.includes('Lance'));
  assert.ok(seaElf.sheet.weaponProficiencies.includes('Tridenti'));
  assert.ok(seaElf.sheet.weaponProficiencies.includes('Balestre leggere'));
  assert.ok(seaElf.sheet.weaponProficiencies.includes('Reti'));
});

test('Warlock: Pact of the Blade alone does NOT grant Charisma, Hexblade DOES', async () => {
  // 1. Archfey (Signore Fatato) Warlock Level 5 with Pact of the Blade + Longsword
  // STR 10 (+0), DEX 14 (+2), CHA 18 (+4), PB +3
  const archfeyInput = makeInput({
    characterName: 'Archfey Blade Warlock',
    raceSlug: 'umano',
    classLabel: 'Warlock',
    classSubclass: 'Signore Fatato',
    level: 5,
    buildOverrides: {
      abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 18 },
      warlockPact: 'Patto della Lama',
      weapons: [{ weaponId: 'spada-lunga' }],
    },
  });
  const archfey = await buildGeneratedCharacterSheet(archfeyInput);
  const archfeySword = archfey.sheet.weaponRows.find((w) => w.name.includes('Spada lunga'));
  assert.ok(archfeySword, 'Pact sword must exist in weaponRows');
  // Pact of the Blade grants proficiency, so PB (+3) is added, but ability is STR (+0), not CHA (+4)!
  assert.equal(archfeySword.toHit, '+3', 'Archfey blade must use STR (+0) + PB (+3) = +3, NOT Charisma (+7)');
  assert.ok(archfeySword.damage.includes('FOR'), 'Damage formula must reference FOR');
  assert.ok(!archfeySword.damage.includes('CAR'), 'Archfey blade must NOT use CAR for damage');

  // 2. Hexblade (Lama del Sortilegio) Warlock Level 5 with Pact of the Blade + Longsword
  const hexbladeInput = makeInput({
    characterName: 'Hexblade Warlock',
    raceSlug: 'umano',
    classLabel: 'Warlock',
    classSubclass: 'Lama del Sortilegio',
    level: 5,
    buildOverrides: {
      abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 18 },
      warlockPact: 'Patto della Lama',
      weapons: [{ weaponId: 'spada-lunga' }],
    },
  });
  const hexblade = await buildGeneratedCharacterSheet(hexbladeInput);
  const hexbladeSword = hexblade.sheet.weaponRows.find((w) => w.name.includes('Spada lunga'));
  assert.ok(hexbladeSword, 'Hexblade sword must exist in weaponRows');
  // Hexblade DOES grant Charisma (+4) + PB (+3) = +7
  assert.equal(hexbladeSword.toHit, '+7', 'Hexblade must use CHA (+4) + PB (+3) = +7');
  assert.ok(hexbladeSword.damage.includes('CAR'), 'Damage formula must reference CAR');
});

test('Artificer infusions: stable item IDs, reordering, level scaling (+1 at lvl 9, +2 at lvl 10)', async () => {
  // 1. Level 9: infusion 'weapon' (+1 bonus) on my-spear
  const l9Input = makeInput({
    characterName: 'Artificer L9',
    raceSlug: 'umano',
    classLabel: 'Artefice',
    level: 9,
    buildOverrides: {
      weapons: [
        { id: 'my-spear', weaponId: 'lancia' },
        { id: 'my-bow', weaponId: 'arco-corto' },
      ],
      artificer: {
        known: ['weapon', 'defense', 'repeating', 'focus', 'mind', 'radiant'],
        assignments: [
          { infusionId: 'weapon', itemId: 'my-spear', state: 'self' },
          { infusionId: 'defense', itemId: 'armor', state: 'self' },
        ],
      },
    },
  });
  const l9Res = await buildGeneratedCharacterSheet(l9Input);
  const l9Spear = l9Res.sheet.weaponRows.find((w) => w.itemId === 'my-spear');
  const l9Bow = l9Res.sheet.weaponRows.find((w) => w.itemId === 'my-bow');
  assert.ok(l9Spear);
  assert.ok(l9Bow);
  assert.ok(l9Spear.name.includes('+1'), 'Spear must receive +1 bonus at level 9');
  assert.ok(!l9Bow.name.includes('+1'), 'Bow must NOT receive +1 bonus');

  // 2. Reordering weapons: my-bow first, my-spear second
  const reorderInput = makeInput({
    characterName: 'Artificer Reordered',
    raceSlug: 'umano',
    classLabel: 'Artefice',
    level: 9,
    buildOverrides: {
      weapons: [
        { id: 'my-bow', weaponId: 'arco-corto' },
        { id: 'my-spear', weaponId: 'lancia' },
      ],
      artificer: {
        known: ['weapon', 'defense', 'repeating', 'focus', 'mind', 'radiant'],
        assignments: [
          { infusionId: 'weapon', itemId: 'my-spear', state: 'self' },
          { infusionId: 'defense', itemId: 'armor', state: 'self' },
        ],
      },
    },
  });
  const reorderRes = await buildGeneratedCharacterSheet(reorderInput);
  const reorderSpear = reorderRes.sheet.weaponRows.find((w) => w.itemId === 'my-spear');
  const reorderBow = reorderRes.sheet.weaponRows.find((w) => w.itemId === 'my-bow');
  assert.ok(reorderSpear);
  assert.ok(reorderBow);
  assert.ok(reorderSpear.name.includes('+1'), 'Spear must keep +1 bonus after reordering');
  assert.ok(!reorderBow.name.includes('+1'), 'Bow must not acquire +1 on reorder');

  // 3. Level 10: infusion 'weapon' increases to +2 bonus (known limit is 8 at level 10)
  const l10Input = makeInput({
    characterName: 'Artificer L10',
    raceSlug: 'umano',
    classLabel: 'Artefice',
    level: 10,
    buildOverrides: {
      weapons: [
        { id: 'my-spear', weaponId: 'lancia' },
        { id: 'my-bow', weaponId: 'arco-corto' },
      ],
      artificer: {
        known: ['weapon', 'defense', 'repeating', 'focus', 'mind', 'radiant', 'spell-ring', 'awareness'],
        assignments: [
          { infusionId: 'weapon', itemId: 'my-spear', state: 'self' },
          { infusionId: 'defense', itemId: 'armor', state: 'self' },
        ],
      },
    },
  });
  const l10Res = await buildGeneratedCharacterSheet(l10Input);
  const l10Spear = l10Res.sheet.weaponRows.find((w) => w.itemId === 'my-spear');
  assert.ok(l10Spear);
  assert.ok(l10Spear.name.includes('+2'), 'Spear must receive +2 bonus at level 10+');

  // 4. Replacing weapon: my-spear replaced with my-dagger
  const replacedOverrides = {
    weapons: [
      { id: 'my-dagger', weaponId: 'pugnale' },
      { id: 'my-bow', weaponId: 'arco-corto' },
    ],
    artificer: {
      known: ['weapon', 'defense', 'repeating', 'focus', 'mind', 'radiant'],
      assignments: [
        { infusionId: 'weapon', itemId: 'my-spear', state: 'self' as const },
      ],
    },
  };
  const preview = await resolveBuildChoicesPreview(l9Input);
  const errors = validateBuildOverrides(replacedOverrides, preview);
  assert.ok(errors.length > 0, 'Validation must report that my-spear is not present in chosen weapons');
  assert.ok(errors.some((e) => e.includes('my-spear')));
});
