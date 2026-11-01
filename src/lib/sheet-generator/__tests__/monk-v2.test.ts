import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadMonkEvidence, addMonkGrantedSpells } from '@/lib/server/monk-source';
import { buildMonkPrintModel } from '../monk-print-model';
import { supportedMonkTraditions } from '../monk-traditions';
import { monkReferenceCards } from '../monk-reference-copy';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';

async function sheet(level: number, classSubclass: string | null) {
  const result = await buildGeneratedCharacterSheet({
    characterName: 'Liadon il Saggio',
    raceSlug: 'human',
    subraceSlug: null,
    classLabel: 'Monaco',
    classSubclass,
    backgroundSlug: 'eremita',
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
  const lv1 = monkReferenceCards(1);
  assert.equal(lv1.length, 0);

  const lv4 = monkReferenceCards(4);
  assert.equal(lv4.length, 1);
  assert.equal(lv4[0].title, 'Caduta Lenta');
  assert.ok(lv4[0].body.includes('reazione quando cadi'));

  const lv5 = monkReferenceCards(5);
  assert.equal(lv5.length, 3);
  assert.ok(lv5.some((c) => c.title === 'Attacco Extra'));
  assert.ok(lv5.some((c) => c.title === 'Colpo Stordente'));

  const lv7 = monkReferenceCards(7);
  assert.ok(lv7.some((c) => c.title === 'Elusione'));
  assert.ok(lv7.some((c) => c.title === 'Mente Lucida'));

  const lv14 = monkReferenceCards(14);
  assert.ok(lv14.some((c) => c.title === 'Anima Adamantina'));

  const lv20 = monkReferenceCards(20);
  assert.equal(lv20.length, 12);
  assert.ok(lv20.some((c) => c.title === 'Perfezione Interiore'));
});

test('All 8 Monk traditions resolve features and proper level boundaries', async () => {
  const traditions = supportedMonkTraditions();
  assert.equal(traditions.length, 8);

  for (const t of traditions) {
    const s1 = await sheet(1, t.label);
    const ev1 = await loadMonkEvidence(s1);
    assert.equal(ev1.traditionFeatures.length, 0, `${t.label} has 0 features at lvl 1`);

    const s3 = await sheet(3, t.label);
    const ev3 = await loadMonkEvidence(s3);
    assert.ok(ev3.traditionFeatures.length >= 1, `${t.label} has features at lvl 3`);
    assert.ok(ev3.traditionFeatures.every((f) => f.level <= 3), `${t.label} lvl 3 features <= 3`);

    // Four elements has a single feature 'Discepolo degli Elementi' at lvl 3 unlocking disciplines at 6, 11, 17
    if (t.slug !== 'phb-monaco-quattro-elementi') {
      const s6 = await sheet(6, t.label);
      const ev6 = await loadMonkEvidence(s6);
      assert.ok(ev6.traditionFeatures.some((f) => f.level === 6), `${t.label} has lvl 6 feature`);

      const s11 = await sheet(11, t.label);
      const ev11 = await loadMonkEvidence(s11);
      assert.ok(ev11.traditionFeatures.some((f) => f.level === 11), `${t.label} has lvl 11 feature`);

      const s17 = await sheet(17, t.label);
      const ev17 = await loadMonkEvidence(s17);
      assert.ok(ev17.traditionFeatures.some((f) => f.level === 17), `${t.label} has lvl 17 feature`);
    }

    const s20 = await sheet(20, t.label);
    const ev20 = await loadMonkEvidence(s20);
    const expectedMin = t.slug === 'phb-monaco-quattro-elementi' ? 1 : 4;
    assert.ok(ev20.traditionFeatures.length >= expectedMin, `${t.label} has all features at lvl 20`);
  }
});

test('Ki points, martial arts die, and unarmored movement progression match 5e table', async () => {
  const testTable = [
    { level: 1, expectedKi: 0, expectedDie: '1d4', expectedSpeedBonus: '+0 m' },
    { level: 2, expectedKi: 2, expectedDie: '1d4', expectedSpeedBonus: '+3 m' },
    { level: 5, expectedKi: 5, expectedDie: '1d6', expectedSpeedBonus: '+3 m' },
    { level: 6, expectedKi: 6, expectedDie: '1d6', expectedSpeedBonus: '+4,5 m' },
    { level: 10, expectedKi: 10, expectedDie: '1d6', expectedSpeedBonus: '+6 m' },
    { level: 11, expectedKi: 11, expectedDie: '1d8', expectedSpeedBonus: '+6 m' },
    { level: 14, expectedKi: 14, expectedDie: '1d8', expectedSpeedBonus: '+7,5 m' },
    { level: 17, expectedKi: 17, expectedDie: '1d10', expectedSpeedBonus: '+7,5 m' },
    { level: 18, expectedKi: 18, expectedDie: '1d10', expectedSpeedBonus: '+9 m' },
    { level: 20, expectedKi: 20, expectedDie: '1d10', expectedSpeedBonus: '+9 m' },
  ];

  for (const entry of testTable) {
    const s = await sheet(entry.level, 'Via della Mano Aperta');
    const ev = await loadMonkEvidence(s);
    assert.equal(ev.resources.kiPoints, entry.expectedKi, `Ki points at lvl ${entry.level}`);
    assert.equal(ev.resources.martialArtsDie, entry.expectedDie, `Martial arts die at lvl ${entry.level}`);
    assert.equal(ev.resources.unarmoredMovement, entry.expectedSpeedBonus, `Speed bonus at lvl ${entry.level}`);
    assert.equal(ev.resources.kiSaveDc, 8 + s.proficiencyBonus + s.abilityMods.wis, `Ki DC at lvl ${entry.level}`);
  }
});

test('Unarmored Defense AC equals 10 + DEX mod + WIS mod when not wearing armor', async () => {
  const s = await sheet(3, 'Via della Mano Aperta');
  const ev = await loadMonkEvidence(s);
  const model = buildMonkPrintModel(s, ev);

  const expectedAc = 10 + s.abilityMods.dex + s.abilityMods.wis;
  assert.equal(model.sheet.armorClass, expectedAc);
});

test('Anima Adamantina at level 14+ grants proficiency in all saving throws', async () => {
  const s13 = await sheet(13, 'Via della Mano Aperta');
  const ev13 = await loadMonkEvidence(s13);
  const m13 = buildMonkPrintModel(s13, ev13);
  assert.equal(m13.sheet.savingThrows.con.proficient, false);

  const s14 = await sheet(14, 'Via della Mano Aperta');
  const ev14 = await loadMonkEvidence(s14);
  const m14 = buildMonkPrintModel(s14, ev14);

  assert.equal(m14.sheet.savingThrows.str.proficient, true);
  assert.equal(m14.sheet.savingThrows.dex.proficient, true);
  assert.equal(m14.sheet.savingThrows.con.proficient, true);
  assert.equal(m14.sheet.savingThrows.int.proficient, true);
  assert.equal(m14.sheet.savingThrows.wis.proficient, true);
  assert.equal(m14.sheet.savingThrows.cha.proficient, true);

  // Check bonuses match ability mod + proficiencyBonus
  assert.equal(m14.sheet.savingThrows.con.value, s14.abilityMods.con + s14.proficiencyBonus);
  assert.equal(m14.sheet.savingThrows.int.value, s14.abilityMods.int + s14.proficiencyBonus);
});

test('Subclass proficiencies apply accurately (Kensei, Maestro Ubriaco, Misericordia)', async () => {
  // Kensei
  const sKensei = await sheet(3, 'Via del Kensei');
  const evKensei = await loadMonkEvidence(sKensei);
  const mKensei = buildMonkPrintModel(sKensei, evKensei, {
    kenseiMeleeWeapon: 'Spada lunga',
    kenseiRangedWeapon: 'Arco lungo',
  });
  assert.ok(mKensei.sheet.weaponProficiencies.includes('Spada lunga'));
  assert.ok(mKensei.sheet.weaponProficiencies.includes('Arco lungo'));

  // Maestro Ubriaco
  const sDrunk = await sheet(3, 'Via del Maestro Ubriaco');
  const evDrunk = await loadMonkEvidence(sDrunk);
  const mDrunk = buildMonkPrintModel(sDrunk, evDrunk);
  assert.equal(mDrunk.sheet.skills.performance.proficient, true);

  // Misericordia
  const sMercy = await sheet(3, 'Via della Misericordia');
  const evMercy = await loadMonkEvidence(sMercy);
  const mMercy = buildMonkPrintModel(sMercy, evMercy);
  assert.equal(mMercy.sheet.skills.insight.proficient, true);
  assert.equal(mMercy.sheet.skills.medicine.proficient, true);
});

test('Via dell’Ombra grants Illusione Minore cantrip at level 3+', async () => {
  const sShadow = await sheet(3, 'Via dell’Ombra');
  const evShadow = await loadMonkEvidence(sShadow);
  assert.ok(evShadow.grantedSpells.some((sp) => sp.name === 'Illusione Minore'));

  const sWithGranted = addMonkGrantedSpells(sShadow, evShadow);
  assert.ok(sWithGranted.spells.some((c) => c.name === 'Illusione Minore'));
});

test('PDF rendering works cleanly for all 8 Monk traditions and sample PDF is saved', async () => {
  const logo = await fs.readFile(path.join(process.cwd(), 'public/logo.png'));
  const traditions = supportedMonkTraditions();

  for (const t of traditions) {
    const s = await sheet(5, t.label);
    const ev = await loadMonkEvidence(s);
    const sWithGranted = addMonkGrantedSpells(s, ev);
    const pdfBytes = await renderCharacterSheetV2(sWithGranted, logo, {
      monkEvidence: ev,
      monkChoices: {
        kenseiMeleeWeapon: 'Spada lunga',
        kenseiRangedWeapon: 'Arco lungo',
      },
    });
    assert.ok(pdfBytes.length > 25_000, `${t.label} generated PDF bytes`);
  }

  // Output sample PDF
  const testSheet = await sheet(6, 'Via della Mano Aperta');
  const evTest = await loadMonkEvidence(testSheet);
  const pdfBytes = await renderCharacterSheetV2(testSheet, logo, {
    monkEvidence: evTest,
  });

  const outDir = path.join(process.cwd(), 'output/pdf');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'monaco-v2-test.pdf'), Buffer.from(pdfBytes));

  const stat = await fs.stat(path.join(outDir, 'monaco-v2-test.pdf'));
  assert.ok(stat.size > 40_000, 'Sample PDF size must be > 40KB');
});
