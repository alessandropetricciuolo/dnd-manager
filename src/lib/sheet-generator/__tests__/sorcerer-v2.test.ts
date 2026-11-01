import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadSorcererEvidence, addSorcererGrantedSpells } from '@/lib/server/sorcerer-source';
import { buildSorcererPrintModel } from '../sorcerer-print-model';
import {
  supportedSorcererOrigins,
  SORCERER_SLOTS_TABLE,
  SORCERER_KNOWN_SPELLS_TABLE,
  SORCERER_CANTRIPS_KNOWN_TABLE,
  metamagicCountForLevel,
} from '../sorcerer-origins';
import { sorcererReferenceCards } from '../sorcerer-reference-copy';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';

async function sheet(level: number, classSubclass: string | null) {
  const result = await buildGeneratedCharacterSheet({
    characterName: 'Valeria Emberfall',
    raceSlug: 'human',
    subraceSlug: null,
    classLabel: 'Stregone',
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

test('Sorcerer reference copy cards match level gates and reference sheet wording', () => {
  const lv1 = sorcererReferenceCards(1);
  assert.equal(lv1.length, 0);

  const lv2 = sorcererReferenceCards(2);
  assert.equal(lv2.length, 1);
  assert.ok(lv2.some((c) => c.title === 'Fonte di Magia'));
  const font = lv2.find((c) => c.title === 'Fonte di Magia')!;
  assert.ok(font.body.includes('Creare Slot'));
  assert.ok(font.body.includes('Convertire Slot'));

  const lv3 = sorcererReferenceCards(3);
  assert.equal(lv3.length, 2);
  assert.ok(lv3.some((c) => c.title === 'Metamagia'));

  const lv20 = sorcererReferenceCards(20);
  assert.equal(lv20.length, 3);
  assert.ok(lv20.some((c) => c.title === 'Ripristino Stregonesco'));
  const capstone = lv20.find((c) => c.title === 'Ripristino Stregonesco')!;
  assert.ok(capstone.body.includes('4 punti stregoneria'));
});

test('All 7 Sorcerer origins resolve features and proper level boundaries', async () => {
  const origins = supportedSorcererOrigins();
  assert.equal(origins.length, 7);

  for (const o of origins) {
    const s1 = await sheet(1, o.label);
    const ev1 = await loadSorcererEvidence(s1);
    assert.ok(ev1.originFeatures.length >= 1, `${o.label} has features at lvl 1`);
    assert.ok(ev1.originFeatures.every((f) => f.level <= 1), `${o.label} lvl 1 features <= 1`);

    const s6 = await sheet(6, o.label);
    const ev6 = await loadSorcererEvidence(s6);
    assert.ok(ev6.originFeatures.some((f) => f.level === 6), `${o.label} has lvl 6 feature`);

    const s14 = await sheet(14, o.label);
    const ev14 = await loadSorcererEvidence(s14);
    assert.ok(ev14.originFeatures.some((f) => f.level === 14), `${o.label} has lvl 14 feature`);

    const s18 = await sheet(18, o.label);
    const ev18 = await loadSorcererEvidence(s18);
    assert.ok(ev18.originFeatures.some((f) => f.level === 18), `${o.label} has lvl 18 feature`);
    assert.ok(ev18.originFeatures.length >= 5, `${o.label} has all features at lvl 18`);
  }
});

test('Sorcerer resources, full-caster spell slots and sorcery points progress correctly across levels', async () => {
  const levelsToCheck = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 20];
  for (const lvl of levelsToCheck) {
    const s = await sheet(lvl, 'Magia Selvaggia');
    const ev = await loadSorcererEvidence(s);

    assert.equal(ev.resources.spellsKnown, SORCERER_KNOWN_SPELLS_TABLE[lvl], `Spells known at lvl ${lvl}`);
    assert.equal(ev.resources.cantripsKnown, SORCERER_CANTRIPS_KNOWN_TABLE[lvl], `Cantrips known at lvl ${lvl}`);
    assert.equal(ev.resources.spellSaveDc, 8 + s.proficiencyBonus + s.abilityMods.cha, `Spell DC at lvl ${lvl}`);
    assert.equal(ev.resources.spellAttackBonus, s.proficiencyBonus + s.abilityMods.cha, `Spell attack bonus at lvl ${lvl}`);
    assert.equal(ev.resources.sorceryPoints, lvl < 2 ? 0 : lvl, `Sorcery points at lvl ${lvl}`);

    const expectedSlots = SORCERER_SLOTS_TABLE[lvl];
    for (const slotLvl of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      assert.equal(ev.slots[slotLvl], expectedSlots[slotLvl], `Slot level ${slotLvl} at class lvl ${lvl}`);
    }

    assert.equal(ev.resources.metamagic.length, metamagicCountForLevel(lvl), `Metamagic count at lvl ${lvl}`);
  }
});

test('Resilienza Draconica (Draconic Resilience) adds +1 HP per level and sets unarmored AC 13 + DEX', async () => {
  const s5 = await sheet(5, 'Discendenza draconica');
  const ev5 = await loadSorcererEvidence(s5, undefined, { draconicAncestry: 'Rosso' });
  const baseHp = s5.hpMax;
  const pm5 = buildSorcererPrintModel(s5, ev5);

  assert.equal(pm5.sheet.hpMax, baseHp + 5, 'Draconic Resilience adds +5 HP at level 5');
  assert.equal(pm5.sheet.armorClass, 13 + s5.abilityMods.dex, 'Draconic Resilience gives unarmored AC 13 + DEX');
  assert.equal(ev5.resources.draconicAncestry?.name, 'Rosso');
  assert.equal(ev5.resources.draconicAncestry?.damageType, 'Fuoco');
});

test('Metamagia choices are respected and gated by level', async () => {
  const s3 = await sheet(3, 'Magia selvaggia');
  const ev3 = await loadSorcererEvidence(s3, undefined, {
    metamagic: ['Incantesimo Rapido', 'Incantesimo Celato'],
  });
  assert.equal(ev3.resources.metamagic.length, 2);
  assert.equal(ev3.resources.metamagic[0].name, 'Incantesimo Rapido');
  assert.equal(ev3.resources.metamagic[1].name, 'Incantesimo Celato');

  const s10 = await sheet(10, 'Magia selvaggia');
  const ev10 = await loadSorcererEvidence(s10, undefined, {
    metamagic: ['Incantesimo Rapido', 'Incantesimo Celato', 'Incantesimo Raddoppiato'],
  });
  assert.equal(ev10.resources.metamagic.length, 3);
});

test('Subclass granted spells are resolved for Anima Meccanica, Mente Aberrante, Magia delle Ombre and Anima Divina', async () => {
  // Anima Meccanica (Clockwork Soul)
  const sm5 = await sheet(5, 'Anima Meccanica');
  const evm5 = await loadSorcererEvidence(sm5);
  assert.ok(evm5.grantedSpells.length >= 6);
  assert.ok(evm5.grantedSpells.some((sp) => sp.name.toLowerCase() === 'allarme'));
  assert.ok(evm5.grantedSpells.some((sp) => sp.name.toLowerCase() === 'aiuto'));
  assert.ok(evm5.grantedSpells.some((sp) => sp.name.toLowerCase() === 'dissolvi magie'));

  // Mente Aberrante (Aberrant Mind)
  const sa5 = await sheet(5, 'Mente Aberrante');
  const eva5 = await loadSorcererEvidence(sa5);
  assert.ok(eva5.grantedSpells.length >= 7);
  assert.ok(eva5.grantedSpells.some((sp) => sp.name.toLowerCase() === 'scheggia della mente'));
  assert.ok(eva5.grantedSpells.some((sp) => sp.name.toLowerCase() === 'sussurri dissonanti'));
  assert.ok(eva5.grantedSpells.some((sp) => sp.name.toLowerCase() === 'inviare'));

  // Magia delle Ombre (Shadow Magic)
  const so3 = await sheet(3, 'Magia delle Ombre');
  const evo3 = await loadSorcererEvidence(so3);
  assert.ok(evo3.grantedSpells.some((sp) => sp.name.toLowerCase() === 'oscurità'));

  // Anima Divina (Divine Soul) with affinity
  const sd1 = await sheet(1, 'Anima Divina');
  const evd1 = await loadSorcererEvidence(sd1, undefined, { divineAffinity: 'Bene' });
  assert.ok(evd1.grantedSpells.some((sp) => sp.name.toLowerCase() === 'cura ferite'));

  const sd1Law = await sheet(1, 'Anima Divina');
  const evd1Law = await loadSorcererEvidence(sd1Law, undefined, { divineAffinity: 'Legge' });
  assert.ok(evd1Law.grantedSpells.some((sp) => sp.name.toLowerCase() === 'benedizione'));
});

test('PDF rendering produces valid multi-page document for Stregone', async () => {
  const s5 = await sheet(5, 'Discendenza draconica');
  const ev5 = await loadSorcererEvidence(s5, undefined, {
    metamagic: ['Incantesimo Rapido', 'Incantesimo Raddoppiato'],
    draconicAncestry: 'Rosso',
  });
  const fullSheet = addSorcererGrantedSpells(s5, ev5);

  const logoBytes = await fs.readFile(path.join(process.cwd(), 'public/logo.png'));
  const pdfBytes = await renderCharacterSheetV2(fullSheet, logoBytes, {
    sorcererEvidence: ev5,
    sorcererChoices: {
      metamagic: ['Incantesimo Rapido', 'Incantesimo Raddoppiato'],
      draconicAncestry: 'Rosso',
    },
  });

  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.length > 20_000, `PDF bytes length is ${pdfBytes.length}`);

  const outDir = path.join(process.cwd(), 'output/pdf');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'stregone-v2-test.pdf'), Buffer.from(pdfBytes));
  console.log('Sample PDF written:', path.join(outDir, 'stregone-v2-test.pdf'), `(${Math.round(pdfBytes.length / 1024 * 10) / 10} KB)`);
});
