import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadRangerEvidence, addRangerGrantedSpells } from '@/lib/server/ranger-source';
import { buildRangerPrintModel } from '../ranger-print-model';
import { supportedRangerArchetypes, RANGER_SLOTS_TABLE, RANGER_KNOWN_SPELLS_TABLE } from '../ranger-archetypes';
import { rangerReferenceCards } from '../ranger-reference-copy';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';

async function sheet(level: number, classSubclass: string | null) {
  const result = await buildGeneratedCharacterSheet({
    characterName: 'Strider delle Lande',
    raceSlug: 'human',
    subraceSlug: null,
    classLabel: 'Ranger',
    classSubclass,
    backgroundSlug: 'forestiero',
    level,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  assert.ok(result.sheet);
  return result.sheet!;
}

test('Ranger reference copy cards match level gates and reference sheet wording', () => {
  const lv1 = rangerReferenceCards(1);
  assert.equal(lv1.length, 0);

  const lv3 = rangerReferenceCards(3);
  assert.equal(lv3.length, 1);
  assert.ok(lv3.some((c) => c.title === 'Consapevolezza Primordiale'));
  const primordial = lv3.find((c) => c.title === 'Consapevolezza Primordiale')!;
  assert.ok(primordial.body.includes('1,5 km'));

  const lv5 = rangerReferenceCards(5);
  assert.equal(lv5.length, 2);
  assert.ok(lv5.some((c) => c.title === 'Attacco Extra'));

  const lv8 = rangerReferenceCards(8);
  assert.equal(lv8.length, 3);
  assert.ok(lv8.some((c) => c.title === 'Andatura sul Territorio'));

  const lv10 = rangerReferenceCards(10);
  assert.equal(lv10.length, 4);
  assert.ok(lv10.some((c) => c.title === 'Nascondersi in Piena Vista'));

  const lv14 = rangerReferenceCards(14);
  assert.equal(lv14.length, 5);
  assert.ok(lv14.some((c) => c.title === 'Svanire'));

  const lv18 = rangerReferenceCards(18);
  assert.equal(lv18.length, 6);
  assert.ok(lv18.some((c) => c.title === 'Sensi Ferini'));

  const lv20 = rangerReferenceCards(20);
  assert.equal(lv20.length, 7);
  assert.ok(lv20.some((c) => c.title === 'Sterminatore di Nemici'));
});

test('All 7 Ranger archetypes resolve features and proper level boundaries', async () => {
  const archetypes = supportedRangerArchetypes();
  assert.equal(archetypes.length, 7);

  for (const a of archetypes) {
    const s1 = await sheet(1, a.label);
    const ev1 = await loadRangerEvidence(s1);
    assert.equal(ev1.archetypeFeatures.length, 0, `${a.label} has 0 features at lvl 1`);

    const s3 = await sheet(3, a.label);
    const ev3 = await loadRangerEvidence(s3);
    assert.ok(ev3.archetypeFeatures.length >= 1, `${a.label} has features at lvl 3`);
    assert.ok(ev3.archetypeFeatures.every((f) => f.level <= 3), `${a.label} lvl 3 features <= 3`);

    const s7 = await sheet(7, a.label);
    const ev7 = await loadRangerEvidence(s7);
    assert.ok(ev7.archetypeFeatures.some((f) => f.level === 7), `${a.label} has lvl 7 feature`);

    const s11 = await sheet(11, a.label);
    const ev11 = await loadRangerEvidence(s11);
    assert.ok(ev11.archetypeFeatures.some((f) => f.level === 11), `${a.label} has lvl 11 feature`);

    const s15 = await sheet(15, a.label);
    const ev15 = await loadRangerEvidence(s15);
    assert.ok(ev15.archetypeFeatures.some((f) => f.level === 15), `${a.label} has lvl 15 feature`);
    assert.ok(ev15.archetypeFeatures.length >= 4, `${a.label} has all features at lvl 15`);
  }
});

test('Ranger resources and half-caster spell slots progress correctly across levels', async () => {
  const levelsToCheck = [1, 2, 3, 5, 6, 9, 10, 11, 13, 14, 17, 20];
  for (const lvl of levelsToCheck) {
    const s = await sheet(lvl, 'Cacciatore');
    const ev = await loadRangerEvidence(s);

    assert.equal(ev.resources.spellsKnown, RANGER_KNOWN_SPELLS_TABLE[lvl], `Spells known at lvl ${lvl}`);
    assert.equal(ev.resources.spellSaveDc, 8 + s.proficiencyBonus + s.abilityMods.wis, `Spell DC at lvl ${lvl}`);
    assert.equal(ev.resources.spellAttackBonus, s.proficiencyBonus + s.abilityMods.wis, `Spell attack bonus at lvl ${lvl}`);

    const expectedSlots = RANGER_SLOTS_TABLE[lvl];
    for (const slotLvl of [1, 2, 3, 4, 5]) {
      assert.equal(ev.slots[slotLvl], expectedSlots[slotLvl], `Slot level ${slotLvl} at class lvl ${lvl}`);
    }

    if (lvl >= 14) {
      assert.equal(ev.resources.favoredEnemies.length, 3, '3 favored enemies at lvl 14+');
    } else if (lvl >= 6) {
      assert.equal(ev.resources.favoredEnemies.length, 2, '2 favored enemies at lvl 6+');
    } else {
      assert.equal(ev.resources.favoredEnemies.length, 1, '1 favored enemy at lvl 1-5');
    }

    if (lvl >= 10) {
      assert.equal(ev.resources.favoredTerrains.length, 3, '3 favored terrains at lvl 10+');
    } else if (lvl >= 6) {
      assert.equal(ev.resources.favoredTerrains.length, 2, '2 favored terrains at lvl 6+');
    } else {
      assert.equal(ev.resources.favoredTerrains.length, 1, '1 favored terrain at lvl 1-5');
    }
  }
});

test('Fighting Style: Difesa adds +1 AC when wearing armor', async () => {
  const s = await sheet(5, 'Cacciatore');
  const ev = await loadRangerEvidence(s, undefined, { fightingStyle: 'Difesa' });

  const baseAc = s.armorClass;
  const pmDefense = buildRangerPrintModel(s, ev, { fightingStyle: 'Difesa' });
  assert.equal(pmDefense.sheet.armorClass, baseAc + 1, 'Difesa adds +1 AC');

  const pmArchery = buildRangerPrintModel(s, ev, { fightingStyle: 'Tiro' });
  assert.equal(pmArchery.sheet.armorClass, baseAc, 'Tiro does not add AC');
});

test('Cacciatore delle Tenebre (Gloom Stalker) adds WIS to initiative and grants Iron Mind save', async () => {
  const s3 = await sheet(3, 'Cacciatore delle Tenebre');
  const ev3 = await loadRangerEvidence(s3);
  const pm3 = buildRangerPrintModel(s3, ev3);

  assert.equal(pm3.sheet.initiative, s3.initiative + s3.abilityMods.wis, 'Dread Ambusher adds WIS to initiative');

  const s7 = await sheet(7, 'Cacciatore delle Tenebre');
  const ev7 = await loadRangerEvidence(s7);
  const pm7 = buildRangerPrintModel(s7, ev7);

  assert.equal(pm7.sheet.savingThrows.wis.proficient, true, 'Iron Mind grants WIS saving throw proficiency');
  assert.equal(pm7.sheet.savingThrows.wis.value, s7.abilityMods.wis + s7.proficiencyBonus);
});

test('Viandante Fatato (Fey Wanderer) adds WIS to Charisma skills and grants bonus proficiency', async () => {
  const s3 = await sheet(3, 'Viandante Fatato');
  const ev3 = await loadRangerEvidence(s3);
  const pm3 = buildRangerPrintModel(s3, ev3, { feyWandererSkill: 'Persuasione' });

  const wisBonus = Math.max(1, s3.abilityMods.wis);
  assert.equal(pm3.sheet.skills.persuasion.proficient, true, 'Grants Persuasione proficiency');
  assert.ok(pm3.sheet.skills.deception.value >= s3.skills.deception.value + wisBonus, 'Adds WIS to Deception');
  assert.ok(pm3.sheet.skills.intimidation.value >= s3.skills.intimidation.value + wisBonus, 'Adds WIS to Intimidation');
  assert.ok(pm3.sheet.skills.performance.value >= s3.skills.performance.value + wisBonus, 'Adds WIS to Performance');
});

test('Granted archetype spells are resolved and added to sheet spells', async () => {
  const s9 = await sheet(9, 'Viandante dell\'Orizzonte');
  const ev9 = await loadRangerEvidence(s9);
  assert.ok(ev9.grantedSpells.length >= 3, 'At level 9 Horizon Walker gets at least 3 granted spells');
  assert.ok(ev9.grantedSpells.some((sp) => sp.name.toLowerCase() === 'passo velato'));
  assert.ok(ev9.grantedSpells.some((sp) => sp.name.toLowerCase() === 'velocità'));

  const fullSheet = addRangerGrantedSpells(s9, ev9);
  assert.ok(fullSheet.spells.some((sp) => sp.name.toLowerCase() === 'passo velato'));
  assert.ok(fullSheet.spells.some((sp) => sp.name.toLowerCase() === 'velocità'));
});

test('PDF rendering produces valid multi-page document for Ranger', async () => {
  const s5 = await sheet(5, 'Cacciatore delle Tenebre');
  const ev5 = await loadRangerEvidence(s5);
  const fullSheet = addRangerGrantedSpells(s5, ev5);

  const logoBytes = await fs.readFile(path.join(process.cwd(), 'public/logo.png'));
  const pdfBytes = await renderCharacterSheetV2(fullSheet, logoBytes, {
    rangerEvidence: ev5,
    rangerChoices: { fightingStyle: 'Tiro' },
  });

  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.length > 20_000, `PDF bytes length is ${pdfBytes.length}`);

  const outDir = path.join(process.cwd(), 'output/pdf');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'ranger-v2-test.pdf'), Buffer.from(pdfBytes));
});
