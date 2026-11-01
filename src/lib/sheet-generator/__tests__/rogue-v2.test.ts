import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadRogueEvidence, addRogueGrantedSpells } from '@/lib/server/rogue-source';
import { buildRoguePrintModel } from '../rogue-print-model';
import { supportedRogueArchetypes } from '../rogue-archetypes';
import { rogueReferenceCards, ROGUE_SNEAK_ATTACK_RULE, ROGUE_THIEVES_CANT_RULE } from '../rogue-reference-copy';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';
import { sneakAttackDiceForLevel } from '../rogue-meta';

async function sheet(level: number, classSubclass: string | null) {
  const result = await buildGeneratedCharacterSheet({
    characterName: 'Corvo delle Ombre',
    raceSlug: 'human',
    subraceSlug: null,
    classLabel: 'Ladro',
    classSubclass,
    backgroundSlug: 'criminale',
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

test('Sneak attack progression matches PHB table across all 20 levels', () => {
  const expectedDice = [
    0,
    1, 1, 2, 2, 3, 3, 4, 4, 5, 5,
    6, 6, 7, 7, 8, 8, 9, 9, 10, 10,
  ];
  for (let lvl = 1; lvl <= 20; lvl++) {
    assert.equal(sneakAttackDiceForLevel(lvl), expectedDice[lvl], `Level ${lvl} sneak attack dice`);
  }
});

test('Reference copy cards match level gates and reference sheet wording', () => {
  const lv1 = rogueReferenceCards(1);
  assert.equal(lv1.length, 1);
  assert.equal(lv1[0].title, 'Maestria');
  assert.ok(!lv1[0].body.includes('Al 6° livello'));

  const lv6 = rogueReferenceCards(6);
  assert.ok(lv6.some((c) => c.title === 'Maestria' && c.body.includes('Al 6° livello')));
  assert.ok(lv6.some((c) => c.title === 'Azione Scaltra'));
  assert.ok(lv6.some((c) => c.title === 'Schivata Prodigiosa'));
  assert.ok(!lv6.some((c) => c.title === 'Elusione'));

  const lv20 = rogueReferenceCards(20);
  assert.ok(lv20.some((c) => c.title === 'Elusione'));
  assert.ok(lv20.some((c) => c.title === 'Dote Affidabile'));
  assert.ok(lv20.some((c) => c.title === 'Percezione Cieca'));
  assert.ok(lv20.some((c) => c.title === 'Mente Sfuggente'));
  assert.ok(lv20.some((c) => c.title === 'Inafferrabile'));
  assert.ok(lv20.some((c) => c.title === 'Colpo di Fortuna'));

  assert.ok(ROGUE_SNEAK_ATTACK_RULE.includes('arma accurata o a distanza'));
  assert.ok(ROGUE_THIEVES_CANT_RULE.includes('quadruplo del tempo') || ROGUE_THIEVES_CANT_RULE.includes('4 volte'));
});

test('All 9 Rogue archetypes resolve unlocked features and proper level boundaries', async () => {
  const archetypes = supportedRogueArchetypes();
  assert.equal(archetypes.length, 9);

  for (const a of archetypes) {
    const s1 = await sheet(1, a.label);
    const ev1 = await loadRogueEvidence(s1);
    assert.equal(ev1.archetypeFeatures.length, 0, `${a.label} has 0 features at lvl 1`);

    const s3 = await sheet(3, a.label);
    const ev3 = await loadRogueEvidence(s3);
    assert.ok(ev3.archetypeFeatures.length >= 1, `${a.label} has features at lvl 3`);
    assert.ok(ev3.archetypeFeatures.every((f) => f.level <= 3), `${a.label} lvl 3 features <= 3`);

    const s20 = await sheet(20, a.label);
    const ev20 = await loadRogueEvidence(s20);
    assert.ok(ev20.archetypeFeatures.length >= 4, `${a.label} has all features at lvl 20`);
    assert.ok(ev20.archetypeFeatures.some((f) => f.level === 17), `${a.label} has capstone at lvl 17`);
  }
});

test('Mente Sfuggente grants Wisdom saving throw proficiency at level 15+ without mutating original', async () => {
  const original = await sheet(15, 'Furfante');
  const wasProf = original.savingThrows.wis.proficient;

  const evidence = await loadRogueEvidence(original);
  const model = buildRoguePrintModel(original, evidence);

  assert.equal(model.sheet.savingThrows.wis.proficient, true);
  assert.equal(original.savingThrows.wis.proficient, wasProf);
});

test('Esploratore Survivalista adds Nature & Survival proficiency and expertise, and Mobilità Superiore adds +3m speed at lvl 9+', async () => {
  const original = await sheet(9, 'Esploratore');
  const prevSpeed = original.speed;

  const evidence = await loadRogueEvidence(original);
  const model = buildRoguePrintModel(original, evidence);

  assert.equal(model.sheet.skills.nature.proficient, true);
  assert.equal(model.sheet.skills.nature.expertise, true);
  assert.equal(model.sheet.skills.survival.proficient, true);
  assert.equal(model.sheet.skills.survival.expertise, true);
  assert.equal(model.sheet.speed, '12 m');
  assert.equal(original.speed, prevSpeed);
});

test('Spadaccino Audacia del Fanfarone adds Charisma modifier to initiative', async () => {
  const original = await sheet(3, 'Spadaccino');
  const baseInit = original.initiative;

  const evidence = await loadRogueEvidence(original);
  const model = buildRoguePrintModel(original, evidence);

  assert.equal(model.sheet.initiative, baseInit + original.abilityMods.cha);
  assert.equal(original.initiative, baseInit);
});

test('Mistificatore Arcano grants Mano Magica cantrip and computes INT spellcasting', async () => {
  const original = await sheet(3, 'Mistificatore Arcano');

  const evidence = await loadRogueEvidence(original);
  assert.equal(evidence.resources.cantripsKnown, 3);
  assert.equal(evidence.resources.spellsKnown, 3);
  assert.equal(evidence.resources.spellSaveDc, 8 + original.proficiencyBonus + original.abilityMods.int);
  assert.equal(evidence.resources.spellAttackBonus, original.proficiencyBonus + original.abilityMods.int);

  const withSpells = await addRogueGrantedSpells(original, evidence);
  assert.ok(withSpells.spells.some((s) => s.name.toLowerCase() === 'mano magica'));
});

test('Lama Spirituale psionic dice progression and count', async () => {
  const lv3 = await sheet(3, 'Lama Spirituale');
  const ev3 = await loadRogueEvidence(lv3);
  assert.equal(ev3.resources.psionicDice?.count, 2 * lv3.proficiencyBonus);
  assert.equal(ev3.resources.psionicDice?.die, 'd6');

  const lv5 = await sheet(5, 'Lama Spirituale');
  const ev5 = await loadRogueEvidence(lv5);
  assert.equal(ev5.resources.psionicDice?.die, 'd8');

  const lv11 = await sheet(11, 'Lama Spirituale');
  const ev11 = await loadRogueEvidence(lv11);
  assert.equal(ev11.resources.psionicDice?.die, 'd10');

  const lv17 = await sheet(17, 'Lama Spirituale');
  const ev17 = await loadRogueEvidence(lv17);
  assert.equal(ev17.resources.psionicDice?.die, 'd12');
});

test('Fantasma Lamenti dalla Tomba and Pegni dei Defunti', async () => {
  const lv3 = await sheet(3, 'Fantasma');
  const ev3 = await loadRogueEvidence(lv3);
  assert.equal(ev3.resources.wailsFromTheGraveUses, lv3.proficiencyBonus);
  assert.equal(ev3.resources.wailsDamageDice, 1);

  const lv9 = await sheet(9, 'Fantasma');
  const ev9 = await loadRogueEvidence(lv9);
  assert.equal(ev9.resources.wailsDamageDice, 3);
  assert.equal(ev9.resources.soulTrinketsMax, lv9.proficiencyBonus);
});

test('Assassino and Pianificatore bonus proficiencies and languages', async () => {
  const ass = await sheet(3, 'Assassino');
  const evAss = await loadRogueEvidence(ass);
  const modelAss = buildRoguePrintModel(ass, evAss);
  assert.ok(modelAss.sheet.toolProficiencies.includes('Trucchi per il camuffamento'));
  assert.ok(modelAss.sheet.toolProficiencies.includes('Sostanze da avvelenatore'));

  const plan = await sheet(3, 'Pianificatore');
  const evPlan = await loadRogueEvidence(plan);
  const modelPlan = buildRoguePrintModel(plan, evPlan, {
    mastermindGamingSet: 'Mazzo di tre draghi',
    mastermindLanguages: ['Draconico', 'Infernale'],
  });
  assert.ok(modelPlan.sheet.toolProficiencies.includes('Arnesi da falsario'));
  assert.ok(modelPlan.sheet.toolProficiencies.includes('Mazzo di tre draghi'));
  assert.ok(modelPlan.sheet.languages.includes('Draconico'));
  assert.ok(modelPlan.sheet.languages.includes('Infernale'));
});

test('Each Rogue archetype produces a complete valid PDF', async () => {
  const logoPath = path.join(process.cwd(), 'public/logo.png');
  const logo = await fs.readFile(logoPath);
  const archetypes = supportedRogueArchetypes();

  for (const a of archetypes) {
    const s = await sheet(5, a.label);
    const ev = await loadRogueEvidence(s);
    const prepared = await addRogueGrantedSpells(s, ev);
    const bytes = await renderCharacterSheetV2(prepared, logo, {
      rogueEvidence: ev,
    });
    assert.ok(bytes.length > 50_000, `PDF for ${a.label} has reasonable size`);
  }
});

test('Generates sample PDF at output/pdf/ladro-v2-test.pdf', async () => {
  const logoPath = path.join(process.cwd(), 'public/logo.png');
  const logo = await fs.readFile(logoPath);
  const s = await sheet(5, 'Spadaccino');
  s.characterName = 'Sylas delle Ombre';
  const ev = await loadRogueEvidence(s);
  const prepared = await addRogueGrantedSpells(s, ev);
  const bytes = await renderCharacterSheetV2(prepared, logo, {
    rogueEvidence: ev,
  });

  const outDir = path.join(process.cwd(), 'output/pdf');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, 'ladro-v2-test.pdf');
  await fs.writeFile(outPath, bytes);

  const stat = await fs.stat(outPath);
  assert.ok(stat.size > 50_000, 'Sample PDF generated successfully');
  console.log(`Sample PDF written: ${outPath} (${(stat.size / 1024).toFixed(1)} KB)`);
});
