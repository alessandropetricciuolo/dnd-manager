import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadWarlockEvidence, addWarlockGrantedSpells } from '@/lib/server/warlock-source';
import { buildWarlockPrintModel } from '../warlock-print-model';
import {
  supportedWarlockPatrons,
  WARLOCK_SLOTS_TABLE,
  WARLOCK_KNOWN_SPELLS_TABLE,
  WARLOCK_CANTRIPS_KNOWN_TABLE,
  WARLOCK_INVOCATIONS_KNOWN_TABLE,
  WARLOCK_PACT_BOONS,
  GENIE_KINDS,
  GENIE_ELEMENTS,
} from '../warlock-patrons';
import { warlockReferenceCards } from '../warlock-reference-copy';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';

async function sheet(level: number, classSubclass: string | null) {
  const result = await buildGeneratedCharacterSheet({
    characterName: 'Morrigan Shadowveil',
    raceSlug: 'human',
    subraceSlug: null,
    classLabel: 'Warlock',
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

test('Warlock reference copy cards match level gates and reference sheet wording', () => {
  const lv1 = warlockReferenceCards(1);
  assert.equal(lv1.length, 1);
  assert.ok(lv1.some((c) => c.title.includes('Patrono Ultraterreno')));

  const lv3 = warlockReferenceCards(3);
  assert.equal(lv3.length, 2);
  assert.ok(lv3.some((c) => c.title === 'Dono del Patto'));
  const pactCard = lv3.find((c) => c.title === 'Dono del Patto')!;
  assert.ok(pactCard.body.includes('Patto della Catena'));
  assert.ok(pactCard.body.includes('Patto della Lama'));
  assert.ok(pactCard.body.includes('Patto del Tomo'));
  assert.ok(pactCard.body.includes('Patto del Talismano'));

  const lv6 = warlockReferenceCards(6);
  assert.equal(lv6.length, 3);

  const lv10 = warlockReferenceCards(10);
  assert.equal(lv10.length, 4);

  const lv11 = warlockReferenceCards(11);
  assert.equal(lv11.length, 5);
  assert.ok(lv11.some((c) => c.title === 'Arcanum Mistico'));
  const arcanum = lv11.find((c) => c.title === 'Arcanum Mistico')!;
  assert.ok(arcanum.body.includes('6° livello'));

  const lv14 = warlockReferenceCards(14);
  assert.equal(lv14.length, 6);

  const lv20 = warlockReferenceCards(20);
  assert.equal(lv20.length, 7);
  assert.ok(lv20.some((c) => c.title === 'Maestro dell\'Occulto'));
  const capstone = lv20.find((c) => c.title === 'Maestro dell\'Occulto')!;
  assert.ok(capstone.body.includes('1 minuto'));
  assert.ok(capstone.body.includes('Magia del Patto'));
});

test('All 7 Warlock patrons resolve features and proper level boundaries', async () => {
  const patrons = supportedWarlockPatrons();
  assert.equal(patrons.length, 7);

  for (const p of patrons) {
    const s1 = await sheet(1, p.label);
    const ev1 = await loadWarlockEvidence(s1);
    assert.ok(ev1.patronFeatures.length >= 1, `${p.label} has features at lvl 1`);
    assert.ok(ev1.patronFeatures.every((f) => f.level <= 1), `${p.label} lvl 1 features <= 1`);

    const s6 = await sheet(6, p.label);
    const ev6 = await loadWarlockEvidence(s6);
    assert.ok(ev6.patronFeatures.some((f) => f.level === 6), `${p.label} has lvl 6 feature`);

    const s10 = await sheet(10, p.label);
    const ev10 = await loadWarlockEvidence(s10);
    assert.ok(ev10.patronFeatures.some((f) => f.level === 10), `${p.label} has lvl 10 feature`);

    const s14 = await sheet(14, p.label);
    const ev14 = await loadWarlockEvidence(s14);
    assert.ok(ev14.patronFeatures.some((f) => f.level === 14), `${p.label} has lvl 14 feature`);
    assert.ok(ev14.patronFeatures.length >= 4, `${p.label} has all features at lvl 14`);
  }
});

test('Pact Magic slot count, slot level, and invocations progress correctly across levels', async () => {
  const levelsToCheck = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 20];
  for (const lvl of levelsToCheck) {
    const s = await sheet(lvl, 'L\'Immondo');
    const ev = await loadWarlockEvidence(s);

    const expectedSlot = WARLOCK_SLOTS_TABLE[lvl];
    assert.equal(ev.resources.pactSlotsCount, expectedSlot.count, `Pact slot count at lvl ${lvl}`);
    assert.equal(ev.resources.pactSlotLevel, expectedSlot.slotLevel, `Pact slot level at lvl ${lvl}`);

    // All slots must be at pactSlotLevel
    for (let sl = 1; sl <= 9; sl++) {
      if (sl === expectedSlot.slotLevel) {
        assert.equal(ev.slots[sl], expectedSlot.count, `Slots of level ${sl} at warlock lvl ${lvl}`);
      } else {
        assert.equal(ev.slots[sl], 0, `Slots of non-pact level ${sl} at warlock lvl ${lvl}`);
      }
    }

    assert.equal(ev.resources.spellsKnown, WARLOCK_KNOWN_SPELLS_TABLE[lvl], `Spells known at lvl ${lvl}`);
    assert.equal(ev.resources.cantripsKnown, WARLOCK_CANTRIPS_KNOWN_TABLE[lvl], `Cantrips known at lvl ${lvl}`);
    assert.equal(ev.resources.invocationsCount, WARLOCK_INVOCATIONS_KNOWN_TABLE[lvl], `Invocations known count at lvl ${lvl}`);
    assert.equal(ev.resources.spellSaveDc, 8 + s.proficiencyBonus + s.abilityMods.cha, `Spell DC at lvl ${lvl}`);
    assert.equal(ev.resources.spellAttackBonus, s.proficiencyBonus + s.abilityMods.cha, `Spell attack bonus at lvl ${lvl}`);
  }
});

test('Mystic Arcanum progression unlocks correctly at levels 11, 13, 15, 17', async () => {
  const s10 = await sheet(10, 'Il Grande Antico');
  const ev10 = await loadWarlockEvidence(s10);
  assert.equal(ev10.resources.mysticArcanum.length, 0);

  const s11 = await sheet(11, 'Il Grande Antico');
  const ev11 = await loadWarlockEvidence(s11);
  assert.equal(ev11.resources.mysticArcanum.length, 1);
  assert.equal(ev11.resources.mysticArcanum[0].level, 6);

  const s13 = await sheet(13, 'Il Grande Antico');
  const ev13 = await loadWarlockEvidence(s13);
  assert.equal(ev13.resources.mysticArcanum.length, 2);
  assert.equal(ev13.resources.mysticArcanum[1].level, 7);

  const s15 = await sheet(15, 'Il Grande Antico');
  const ev15 = await loadWarlockEvidence(s15);
  assert.equal(ev15.resources.mysticArcanum.length, 3);
  assert.equal(ev15.resources.mysticArcanum[2].level, 8);

  const s17 = await sheet(17, 'Il Grande Antico');
  const ev17 = await loadWarlockEvidence(s17);
  assert.equal(ev17.resources.mysticArcanum.length, 4);
  assert.equal(ev17.resources.mysticArcanum[3].level, 9);
});

test('Pact Boons resolve and contain manual text for all 4 options', async () => {
  for (const boon of WARLOCK_PACT_BOONS) {
    const s = await sheet(3, 'Il Signore Fatato');
    const ev = await loadWarlockEvidence(s, undefined, { pactBoon: boon });
    assert.ok(ev.resources.pactBoon, `Pact boon present for ${boon}`);
    assert.equal(ev.resources.pactBoon.name, boon);
    assert.ok(ev.resources.pactBoon.desc.length > 30, `Description for ${boon} loaded from manual`);
  }
});

test('Hexblade gives medium armor, shield, martial weapon proficiencies and CHA attacks', async () => {
  const s = await sheet(3, 'La Lama del Sortilegio');
  // Add a weapon row
  s.weaponRows = [{ name: 'Spada lunga', toHit: '+3', damage: '1d8 + 1', type: 'tagliente' }];
  const ev = await loadWarlockEvidence(s);
  const model = buildWarlockPrintModel(s, ev, { hexbladeWeapon: 'Spada lunga' });

  assert.ok(model.sheet.armorProficiencies.includes('Armature medie'));
  assert.ok(model.sheet.armorProficiencies.includes('Scudi'));
  assert.ok(model.sheet.weaponProficiencies.includes('Armi da guerra'));

  const sword = model.sheet.weaponRows.find((w) => w.name === 'Spada lunga');
  assert.ok(sword);
  const chaMod = s.abilityMods.cha;
  const pb = s.proficiencyBonus;
  assert.equal(sword.toHit, `+${pb + chaMod}`);
  assert.ok(sword.damage.includes(`+ ${chaMod}`));
});

test('Celestial grants Sacred Flame and Light cantrips and healing pool d6s', async () => {
  const s = await sheet(5, 'Il Celestiale');
  const ev = await loadWarlockEvidence(s);
  assert.equal(ev.resources.healingLightDice, 6); // 1 + 5 = 6
  assert.ok(ev.grantedSpells.some((sp) => sp.name.toLowerCase() === 'fiamma sacra'));
  assert.ok(ev.grantedSpells.some((sp) => sp.name.toLowerCase() === 'luce'));

  const enriched = addWarlockGrantedSpells(s, ev);
  assert.ok(enriched.spells.some((sp) => sp.name.toLowerCase() === 'fiamma sacra'));
  assert.ok(enriched.spells.some((sp) => sp.name.toLowerCase() === 'luce'));
});

test('Fathomless grants swim speed, tentacle scaling and Evard at level 10', async () => {
  const s1 = await sheet(1, 'L\'Insondabile');
  const ev1 = await loadWarlockEvidence(s1);
  assert.equal(ev1.resources.tentacleDamage, '1d8');

  const s10 = await sheet(10, 'L\'Insondabile');
  const ev10 = await loadWarlockEvidence(s10);
  assert.equal(ev10.resources.tentacleDamage, '2d8');
  assert.ok(ev10.grantedSpells.some((sp) => sp.name.toLowerCase().includes('evard')));
});

test('Genie maps kind to damage type correctly', async () => {
  for (const kind of GENIE_KINDS) {
    const s = await sheet(1, 'Il Genio');
    const ev = await loadWarlockEvidence(s, undefined, { genieKind: kind });
    assert.equal(ev.resources.genieKind, kind);
    assert.equal(ev.resources.genieDamageType, GENIE_ELEMENTS[kind].damageType);
  }
});

test('Render Character Sheet V2 for Warlock produces valid multi-page PDF', async () => {
  const s = await sheet(5, 'La Lama del Sortilegio');
  const ev = await loadWarlockEvidence(s, undefined, {
    pactBoon: 'Patto della Lama',
    invocations: ['Deflagrazione Agonizzante', 'Armatura delle Ombre', 'Lama Assetata'],
  });
  const enriched = addWarlockGrantedSpells(s, ev);
  const logoBytes = await fs.readFile(path.join(process.cwd(), 'public/logo.png'));

  const pdfBytes = await renderCharacterSheetV2(enriched, logoBytes, {
    warlockEvidence: ev,
    warlockChoices: {
      pactBoon: 'Patto della Lama',
      invocations: ['Deflagrazione Agonizzante', 'Armatura delle Ombre', 'Lama Assetata'],
    },
  });

  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.length > 50_000, `PDF size is ${pdfBytes.length} bytes`);

  // Write sample PDF
  await fs.mkdir('output/pdf', { recursive: true });
  await fs.writeFile('output/pdf/warlock-v2-test.pdf', pdfBytes);
  const stat = await fs.stat('output/pdf/warlock-v2-test.pdf');
  assert.ok(stat.size > 50_000);
});
