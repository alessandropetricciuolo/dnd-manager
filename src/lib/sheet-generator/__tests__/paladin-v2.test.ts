import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadPaladinEvidence, addPaladinGrantedSpells } from '@/lib/server/paladin-source';
import { buildPaladinPrintModel } from '../paladin-print-model';
import { supportedPaladinOaths, PALADIN_SLOTS_TABLE } from '../paladin-oaths';
import { paladinReferenceCards } from '../paladin-reference-copy';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';

async function sheet(level: number, classSubclass: string | null) {
  const result = await buildGeneratedCharacterSheet({
    characterName: 'Tormund il Giusto',
    raceSlug: 'human',
    subraceSlug: null,
    classLabel: 'Paladino',
    classSubclass,
    backgroundSlug: 'nobile',
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
  const lv1 = paladinReferenceCards(1);
  assert.equal(lv1.length, 0);

  const lv2 = paladinReferenceCards(2);
  assert.equal(lv2.length, 2);
  assert.ok(lv2.some((c) => c.title === 'Stile di Combattimento'));
  assert.ok(lv2.some((c) => c.title === 'Punizione Divina'));
  const divineSmite = lv2.find((c) => c.title === 'Punizione Divina')!;
  assert.ok(divineSmite.body.includes('danni radiosi extra'));

  const lv3 = paladinReferenceCards(3);
  assert.equal(lv3.length, 3);
  assert.ok(lv3.some((c) => c.title === 'Salute Divina'));

  const lv5 = paladinReferenceCards(5);
  assert.ok(lv5.some((c) => c.title === 'Attacco Extra'));

  const lv6 = paladinReferenceCards(6);
  assert.ok(lv6.some((c) => c.title === 'Aura di Protezione'));

  const lv10 = paladinReferenceCards(10);
  assert.ok(lv10.some((c) => c.title === 'Aura di Coraggio'));

  const lv11 = paladinReferenceCards(11);
  assert.ok(lv11.some((c) => c.title === 'Punizione Divina Migliorata'));

  const lv14 = paladinReferenceCards(14);
  assert.equal(lv14.length, 8);
  assert.ok(lv14.some((c) => c.title === 'Tocco Purificatore'));
});

test('All 7 Paladin oaths resolve features and proper level boundaries', async () => {
  const oaths = supportedPaladinOaths();
  assert.equal(oaths.length, 7);

  for (const o of oaths) {
    const s1 = await sheet(1, o.label);
    const ev1 = await loadPaladinEvidence(s1);
    assert.equal(ev1.traditionFeatures.length, 0, `${o.label} has 0 features at lvl 1`);

    const s3 = await sheet(3, o.label);
    const ev3 = await loadPaladinEvidence(s3);
    assert.ok(ev3.traditionFeatures.length >= 1, `${o.label} has features at lvl 3`);
    assert.ok(ev3.traditionFeatures.every((f) => f.level <= 3), `${o.label} lvl 3 features <= 3`);

    const s7 = await sheet(7, o.label);
    const ev7 = await loadPaladinEvidence(s7);
    assert.ok(ev7.traditionFeatures.some((f) => f.level === 7), `${o.label} has lvl 7 feature`);

    const s15 = await sheet(15, o.label);
    const ev15 = await loadPaladinEvidence(s15);
    assert.ok(ev15.traditionFeatures.some((f) => f.level === 15), `${o.label} has lvl 15 feature`);

    const s20 = await sheet(20, o.label);
    const ev20 = await loadPaladinEvidence(s20);
    assert.ok(ev20.traditionFeatures.some((f) => f.level === 20), `${o.label} has lvl 20 feature`);
    assert.ok(ev20.traditionFeatures.length >= 4, `${o.label} has all features at lvl 20`);
  }
});

test('Paladin resources and half-caster spell slots progress correctly across levels', async () => {
  const levelsToCheck = [1, 2, 3, 5, 6, 9, 11, 13, 14, 17, 20];
  for (const lvl of levelsToCheck) {
    const s = await sheet(lvl, 'Giuramento di Devozione');
    const ev = await loadPaladinEvidence(s);

    assert.equal(ev.resources.layOnHandsPool, 5 * lvl, `Lay on hands at lvl ${lvl}`);
    assert.equal(ev.resources.divineSenseUses, Math.max(1, 1 + s.abilityMods.cha), `Divine sense at lvl ${lvl}`);
    assert.equal(ev.resources.channelDivinityUses, lvl >= 3 ? 1 : 0, `Channel divinity at lvl ${lvl}`);
    assert.equal(ev.resources.cleansingTouchUses, lvl >= 14 ? Math.max(1, s.abilityMods.cha) : 0, `Cleansing touch at lvl ${lvl}`);
    assert.equal(ev.resources.spellsPrepared, Math.max(1, Math.floor(lvl / 2) + s.abilityMods.cha), `Spells prepared at lvl ${lvl}`);
    assert.equal(ev.resources.spellSaveDc, 8 + s.proficiencyBonus + s.abilityMods.cha, `Spell DC at lvl ${lvl}`);
    assert.equal(ev.resources.spellAttackBonus, s.proficiencyBonus + s.abilityMods.cha, `Spell attack at lvl ${lvl}`);

    const expectedSlots = PALADIN_SLOTS_TABLE[lvl];
    for (const [slotLevel, count] of Object.entries(expectedSlots)) {
      assert.equal(ev.slots[Number(slotLevel)], count, `Slot level ${slotLevel} count at lvl ${lvl}`);
    }
  }
});

test('Aura di Protezione at level 6+ adds CHA modifier to ALL saving throws', async () => {
  const s5 = await sheet(5, 'Giuramento di Devozione');
  const ev5 = await loadPaladinEvidence(s5);
  const m5 = buildPaladinPrintModel(s5, ev5);

  const baseStr5 = s5.savingThrows.str.value;
  assert.equal(m5.sheet.savingThrows.str.value, baseStr5);

  const s6 = await sheet(6, 'Giuramento di Devozione');
  const ev6 = await loadPaladinEvidence(s6);
  const m6 = buildPaladinPrintModel(s6, ev6);

  const auraBonus = Math.max(1, s6.abilityMods.cha);
  for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const) {
    assert.equal(
      m6.sheet.savingThrows[k].value,
      s6.savingThrows[k].value + auraBonus,
      `Save ${k} boosted by Aura of Protection`
    );
  }
});

test('Fighting style Difesa adds +1 AC and Duellare is recorded cleanly', async () => {
  const s = await sheet(2, 'Giuramento di Devozione');
  const ev = await loadPaladinEvidence(s);

  const mDefense = buildPaladinPrintModel(s, ev, { fightingStyle: 'Difesa' });
  assert.equal(mDefense.sheet.armorClass, s.armorClass + 1);
  assert.equal(mDefense.resources.fightingStyle, 'Difesa');

  const mDuel = buildPaladinPrintModel(s, ev, { fightingStyle: 'Duellare' });
  assert.equal(mDuel.sheet.armorClass, s.armorClass);
  assert.equal(mDuel.resources.fightingStyle, 'Duellare');
});

test('Giuramento di Gloria Aura di Alacrità increases speed by 3 meters at level 7+', async () => {
  const s6 = await sheet(6, 'Giuramento di Gloria');
  const ev6 = await loadPaladinEvidence(s6);
  const m6 = buildPaladinPrintModel(s6, ev6);
  assert.ok(!m6.sheet.speed.includes('Aura di Alacrità'));

  const s7 = await sheet(7, 'Giuramento di Gloria');
  const ev7 = await loadPaladinEvidence(s7);
  const m7 = buildPaladinPrintModel(s7, ev7);
  assert.ok(m7.sheet.speed.includes('+3 m Aura di Alacrità'));
});

test('Oath spells are resolved and added to the sheet without displacing others', async () => {
  const sDevotion = await sheet(5, 'Giuramento di Devozione');
  const evDevotion = await loadPaladinEvidence(sDevotion);

  assert.ok(evDevotion.grantedSpells.some((sp) => sp.name.toLowerCase() === 'santuario'));
  assert.ok(evDevotion.grantedSpells.some((sp) => sp.name.toLowerCase().includes('protezione dal bene e dal male')));
  assert.ok(evDevotion.grantedSpells.some((sp) => sp.name.toLowerCase() === 'zona di verità'));

  const sWithGranted = addPaladinGrantedSpells(sDevotion, evDevotion);
  assert.ok(sWithGranted.spells.some((sp) => sp.name.toLowerCase() === 'santuario'));
});

test('PDF rendering works cleanly for all 7 Paladin oaths and sample PDF is saved', async () => {
  const logo = await fs.readFile(path.join(process.cwd(), 'public/logo.png'));
  const oaths = supportedPaladinOaths();

  for (const o of oaths) {
    const s = await sheet(5, o.label);
    const ev = await loadPaladinEvidence(s);
    const sWithGranted = addPaladinGrantedSpells(s, ev);
    const pdfBytes = await renderCharacterSheetV2(sWithGranted, logo, {
      paladinEvidence: ev,
      paladinChoices: { fightingStyle: 'Difesa' },
    });
    assert.ok(pdfBytes.length > 25_000, `${o.label} generated PDF bytes`);
  }

  // Output sample PDF
  const testSheet = await sheet(6, 'Giuramento di Devozione');
  const evTest = await loadPaladinEvidence(testSheet);
  const pdfBytes = await renderCharacterSheetV2(testSheet, logo, {
    paladinEvidence: evTest,
    paladinChoices: { fightingStyle: 'Duellare' },
  });

  const outDir = path.join(process.cwd(), 'output/pdf');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'paladino-v2-test.pdf'), Buffer.from(pdfBytes));

  const stat = await fs.stat(path.join(outDir, 'paladino-v2-test.pdf'));
  assert.ok(stat.size > 40_000, 'Sample PDF size must be > 40KB');
});
