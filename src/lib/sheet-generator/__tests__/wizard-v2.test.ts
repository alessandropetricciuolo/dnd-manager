import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadWizardEvidence, addWizardGrantedSpells } from '@/lib/server/wizard-source';
import { buildWizardPrintModel } from '../wizard-print-model';
import { supportedWizardTraditions } from '../wizard-traditions';
import { wizardReferenceCards } from '../wizard-reference-copy';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';

async function sheet(level: number, classSubclass: string | null) {
  const result = await buildGeneratedCharacterSheet({
    characterName: 'Elminster d’Ascanio',
    raceSlug: 'human',
    subraceSlug: null,
    classLabel: 'Mago',
    classSubclass,
    backgroundSlug: 'sapiente',
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

test('Reference copy cards match level gates and reference sheet wording', () => {
  const lv1 = wizardReferenceCards(1);
  assert.equal(lv1.length, 1);
  assert.equal(lv1[0].title, 'Recupero Arcano');
  assert.ok(lv1[0].body.includes('metà del tuo livello da mago'));

  const lv17 = wizardReferenceCards(17);
  assert.equal(lv17.length, 1);

  const lv18 = wizardReferenceCards(18);
  assert.equal(lv18.length, 2);
  assert.ok(lv18.some((c) => c.title === 'Maestria negli Incantesimi'));

  const lv20 = wizardReferenceCards(20);
  assert.equal(lv20.length, 3);
  assert.ok(lv20.some((c) => c.title === 'Incantesimi Personali'));
});

test('All 11 Wizard traditions resolve features and proper level boundaries', async () => {
  const traditions = supportedWizardTraditions();
  assert.equal(traditions.length, 11);

  for (const t of traditions) {
    const s1 = await sheet(1, t.label);
    const ev1 = await loadWizardEvidence(s1);
    assert.equal(ev1.traditionFeatures.length, 0, `${t.label} has 0 features at lvl 1`);

    const s2 = await sheet(2, t.label);
    const ev2 = await loadWizardEvidence(s2);
    assert.ok(ev2.traditionFeatures.length >= 1, `${t.label} has features at lvl 2`);
    assert.ok(ev2.traditionFeatures.every((f) => f.level <= 2), `${t.label} lvl 2 features <= 2`);

    const s6 = await sheet(6, t.label);
    const ev6 = await loadWizardEvidence(s6);
    assert.ok(ev6.traditionFeatures.some((f) => f.level === 6), `${t.label} has lvl 6 feature`);

    const s10 = await sheet(10, t.label);
    const ev10 = await loadWizardEvidence(s10);
    assert.ok(ev10.traditionFeatures.some((f) => f.level === 10), `${t.label} has lvl 10 feature`);

    const s14 = await sheet(14, t.label);
    const ev14 = await loadWizardEvidence(s14);
    assert.ok(ev14.traditionFeatures.some((f) => f.level === 14), `${t.label} has lvl 14 feature`);

    const s20 = await sheet(20, t.label);
    const ev20 = await loadWizardEvidence(s20);
    assert.ok(ev20.traditionFeatures.length >= 4, `${t.label} has all features at lvl 20`);
  }
});

test('Spell progression and slots match PHB full-caster table across levels', async () => {
  const levelsToCheck = [1, 3, 5, 7, 9, 11, 13, 15, 17, 20];
  for (const lvl of levelsToCheck) {
    const s = await sheet(lvl, 'Scuola di Evocazione');
    const ev = await loadWizardEvidence(s);
    assert.equal(ev.resources.arcaneRecoveryLevels, Math.ceil(lvl / 2));
    assert.equal(ev.resources.spellsPrepared, Math.max(1, lvl + s.abilityMods.int));
    const expectedCantrips = lvl < 4 ? 3 : lvl < 10 ? 4 : 5;
    assert.equal(ev.resources.cantripsKnown, expectedCantrips);
    assert.equal(ev.cantrips, expectedCantrips);

    // Full casters get 9th level slot at level 17
    if (lvl >= 17) {
      assert.equal(ev.slots[9], 1);
    }
  }
});

test('Magia della Guerra adds INT mod to Initiative via Tactical Wit (Ingegno Tattico) at level 2+', async () => {
  const original = await sheet(2, 'Magia della Guerra');
  const baseInit = original.initiative;
  const evidence = await loadWizardEvidence(original);
  const model = buildWizardPrintModel(original, evidence);

  assert.equal(model.sheet.initiative, baseInit + original.abilityMods.int);
  assert.equal(original.initiative, baseInit); // no mutation of original
});

test('Canto della Lama grants light armor, chosen weapon and Performance proficiency at level 2+', async () => {
  const original = await sheet(2, 'Canto della Lama');
  assert.ok(!original.armorProficiencies.includes('Armature leggere'));

  const evidence = await loadWizardEvidence(original);
  const model = buildWizardPrintModel(original, evidence, { bladesingerWeapon: 'Stocco' });

  assert.ok(model.sheet.armorProficiencies.includes('Armature leggere'));
  assert.ok(model.sheet.weaponProficiencies.includes('Stocco'));
  assert.equal(model.sheet.skills.performance.proficient, true);
  assert.equal(model.resources.bladesongUses, model.sheet.proficiencyBonus);
  assert.equal(model.resources.bladesongAcBonus, Math.max(1, model.sheet.abilityMods.int));
});

test('Scuola di Illusione grants Illusione Minore and Necromanzia grants Animare Morti', async () => {
  const sIllusion = await sheet(2, 'Scuola di Illusione');
  const evIllusion = await loadWizardEvidence(sIllusion);
  assert.ok(evIllusion.grantedSpells.some((sp) => sp.name === 'Illusione Minore'));

  const sNecro = await sheet(6, 'Scuola di Necromanzia');
  const evNecro = await loadWizardEvidence(sNecro);
  assert.ok(evNecro.grantedSpells.some((sp) => sp.name === 'Animare Morti'));
});

test('Subclass-specific resource trackers calculate accurately', async () => {
  // Abiurazione: Interdizione Arcana HP = 2 * level + intMod
  const sAbi = await sheet(5, 'Scuola di Abiurazione');
  const evAbi = await loadWizardEvidence(sAbi);
  assert.equal(evAbi.resources.arcaneWardHp, 2 * 5 + sAbi.abilityMods.int);

  // Divinazione: Portento = 2 dice (3 at 14+)
  const sDiv2 = await sheet(2, 'Scuola di Divinazione');
  const evDiv2 = await loadWizardEvidence(sDiv2);
  assert.equal(evDiv2.resources.portentDiceCount, 2);

  const sDiv14 = await sheet(14, 'Scuola di Divinazione');
  const evDiv14 = await loadWizardEvidence(sDiv14);
  assert.equal(evDiv14.resources.portentDiceCount, 3);

  // Magia della Guerra: Impulso di Potere at level 6+
  const sWar = await sheet(6, 'Magia della Guerra');
  const evWar = await loadWizardEvidence(sWar);
  assert.equal(evWar.resources.powerSurgeMax, Math.max(1, sWar.abilityMods.int));
  assert.equal(evWar.resources.powerSurgeDamage, Math.floor(6 / 2));

  // Ordine degli Scribi: Mente Manifesta at level 6+
  const sScribes = await sheet(6, 'Ordine degli Scribi');
  const evScribes = await loadWizardEvidence(sScribes);
  assert.equal(evScribes.resources.manifestMindUses, sScribes.proficiencyBonus);
});

test('PDF rendering works cleanly for all 11 traditions and sample PDF is saved', async () => {
  const logo = await fs.readFile(path.join(process.cwd(), 'public/logo.png'));
  const traditions = supportedWizardTraditions();

  for (const t of traditions) {
    const s = await sheet(10, t.label);
    const ev = await loadWizardEvidence(s);
    const sWithGranted = addWizardGrantedSpells(s, ev);
    const pdfBytes = await renderCharacterSheetV2(sWithGranted, logo, {
      wizardEvidence: ev,
      wizardChoices: { bladesingerWeapon: 'Stocco' },
    });
    assert.ok(pdfBytes.length > 30_000, `${t.label} generated PDF bytes`);
  }

  // Output sample PDF
  const testSheet = await sheet(5, 'Magia della Guerra');
  const evTest = await loadWizardEvidence(testSheet);
  const pdfBytes = await renderCharacterSheetV2(testSheet, logo, {
    wizardEvidence: evTest,
  });

  const outDir = path.join(process.cwd(), 'output/pdf');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'mago-v2-test.pdf'), Buffer.from(pdfBytes));

  const stat = await fs.stat(path.join(outDir, 'mago-v2-test.pdf'));
  assert.ok(stat.size > 50_000, 'Sample PDF size must be > 50KB');
});
