import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { getSpellOperativeSummary } from '../spell-operative-summaries';
import { buildSteelDefenderStatBlock } from '../../pdf/companion-stat-block';
import { renderCharacterSheetV2 } from '../../pdf/character-sheet-v2';

test('Artificer V2: buildOverrides.abilities flows through all calculated stats', async () => {
  const { sheet } = await buildGeneratedCharacterSheet({
    characterName: 'eg-artificer-test',
    raceSlug: 'elfo',
    subraceSlug: 'elfo_alto',
    classLabel: 'Artefice',
    classSubclass: 'Fabbro da battaglia',
    backgroundSlug: 'sapiente',
    level: 8,
    alignment: 'Neutrale',
    age: '124',
    sex: 'Maschio',
    height: '1.78 m',
    weight: '64 kg',
    buildOverrides: {
      abilities: { str: 8, dex: 15, con: 14, int: 20, wis: 12, cha: 10 },
      artificer: {
        shield: false,
        known: ['weapon', 'defense', 'repulsion', 'homunculus', 'mind', 'repeating'],
        assignments: [
          { infusionId: 'weapon', itemId: 'hammer', state: 'self' },
          { infusionId: 'defense', itemId: 'armor', state: 'self' },
          { infusionId: 'repulsion', itemId: 'shield', state: 'attuned' },
        ],
      },
    },
  });

  // 1. Ability scores and modifiers
  assert.equal(sheet.abilities.int, 20);
  assert.equal(sheet.abilityMods.int, 5);

  // 2. Saving throws: Artificer is proficient in CON and INT
  assert.equal(sheet.savingThrows.int.value, 8); // PB 3 + INT 5 = 8
  assert.equal(sheet.savingThrows.con.value, 5); // PB 3 + CON 2 = 5

  // 3. Skills: Arcana (INT), Investigation (INT), History (INT)
  assert.equal(sheet.skills.arcana.value, 8);
  assert.equal(sheet.skills.investigation.value, 8);
  assert.equal(sheet.skills.history.value, 8);
  assert.equal(sheet.skills.nature.value, 5);
  assert.equal(sheet.skills.religion.value, 5);

  // 4. Spells prepared: floor(level / 2) + INT mod = 4 + 5 = 9
  assert.equal(sheet.spellsPrepared, 9);

  // 5. Weapon rows: Battle Smith with Arma Migliorata uses INT for attack and damage
  const hammer = sheet.weaponRows.find((w) => w.name.includes('Martello'));
  assert.ok(hammer, 'Hammer should be present in weapon rows');
  assert.equal(hammer.toHit, '+9'); // PB 3 + INT 5 + 1 = +9
  assert.equal(hammer.damage, '1d4+INT+1'); // resolves to 1d4+6

  // 6. AC with shield: false -> Scale mail 14 + DEX 2 + Defense 1 = 17
  assert.equal(sheet.armorClass, 17);
  assert.ok(sheet.inventory.some((i) => i.includes('Scudo: non impugnato')));
});

test('Artificer V2: shield: true equips shield and adds shield bonuses to AC', async () => {
  const { sheet } = await buildGeneratedCharacterSheet({
    characterName: 'eg-artificer-shield-test',
    raceSlug: 'elfo',
    subraceSlug: 'elfo_alto',
    classLabel: 'Artefice',
    classSubclass: 'Fabbro da battaglia',
    backgroundSlug: 'sapiente',
    level: 8,
    alignment: 'Neutrale',
    age: '124',
    sex: 'Maschio',
    height: '1.78 m',
    weight: '64 kg',
    buildOverrides: {
      abilities: { str: 8, dex: 15, con: 14, int: 20, wis: 12, cha: 10 },
      artificer: {
        shield: true,
        known: ['weapon', 'defense', 'repulsion', 'homunculus', 'mind', 'repeating'],
        assignments: [
          { infusionId: 'weapon', itemId: 'hammer', state: 'self' },
          { infusionId: 'defense', itemId: 'armor', state: 'self' },
          { infusionId: 'repulsion', itemId: 'shield', state: 'attuned' },
        ],
      },
    },
  });

  // AC: 14 (scale mail) + 2 (DEX) + 1 (defense) + 2 (base shield) + 1 (repulsion) = 20
  assert.equal(sheet.armorClass, 20);
  assert.ok(sheet.inventory.some((i) => i.includes('Scudo: impugnato')));
});

test('Spell operative summaries: local manual verified rules', () => {
  const catapulta = getSpellOperativeSummary('Catapulta');
  assert.ok(catapulta);
  assert.equal(catapulta.range, '18 m');
  assert.ok(catapulta.effectSummary.includes('27 m'));

  const allarme = getSpellOperativeSummary('Allarme');
  assert.ok(allarme);
  assert.ok(!allarme.effectSummary.toLowerCase().includes('parola d\'ordine'));
  assert.ok(allarme.effectSummary.includes('designare le creature'));

  const falò = getSpellOperativeSummary('Creare Falò');
  assert.ok(falò);
  assert.equal(falò.level, 0);
  assert.equal(falò.concentration, true);
  assert.equal(falò.components, 'V, S');
});

test('Steel Defender companion stat block: no formula duplication, resolved values only', () => {
  const data = buildSteelDefenderStatBlock(8, 5, 3, 8, ['Comune', 'Elfico']);
  assert.equal(data.hpMax, 47); // 2 + 5 + 5 * 8 = 47
  assert.equal(data.ac, 15);

  const strike = data.actions.find((a) => a.name === 'Squarcio Rinforzato');
  assert.ok(strike);
  assert.ok(strike.text.includes('+8 per colpire'));
  assert.ok(strike.text.includes('1d8 + 3 danni da forza'));
  assert.ok(!strike.text.includes('+ BC'), 'Formula + BC should be resolved to concrete number');

  const repair = data.actions.find((a) => a.name === 'Riparazione');
  assert.ok(repair);
  assert.equal(repair.uses, 3);
  assert.ok(repair.text.includes('2d8 + 3 Punti Ferita'));
  assert.ok(!repair.text.includes('+ BC'), 'Formula + BC should be resolved to concrete number');
});

test('Steel Defender: Devia Attacco reaction strictly matches manual conditions', () => {
  const data = buildSteelDefenderStatBlock(8, 5, 3, 8, ['Comune', 'Elfico']);
  const devia = data.reactions.find((r) => r.name === 'Devia Attacco');
  assert.ok(devia, 'Devia Attacco should exist');
  assert.ok(devia.text.includes('entro 1,5 metri'), 'Attacker within 1.5 m');
  assert.ok(devia.text.includes('nel suo campo visivo'), 'Attacker visible in field of view');
  assert.ok(devia.text.includes('svantaggio al tiro per colpire'), 'Imposes disadvantage on attack roll');
  assert.ok(devia.text.includes('diversa dal difensore'), 'Attack must target a creature other than defender');
  assert.ok(!devia.text.toLowerCase().includes('sta per essere colpita'), 'No invented trigger condition');
});

test('Artificer V2 compact PDF: full 5-page rendering with verified rules & no omissions', async () => {
  const { sheet } = await buildGeneratedCharacterSheet({
    characterName: 'eg',
    raceSlug: 'elfo',
    subraceSlug: 'elfo_alto',
    classLabel: 'Artefice',
    classSubclass: 'Fabbro da battaglia',
    backgroundSlug: 'sapiente',
    level: 8,
    alignment: 'Neutrale',
    age: '124',
    sex: 'Maschio',
    height: '1.78 m',
    weight: '64 kg',
    buildOverrides: {
      abilities: { str: 8, dex: 15, con: 14, int: 20, wis: 12, cha: 10 },
      artificer: {
        shield: false,
        known: ['weapon', 'defense', 'repulsion', 'homunculus', 'mind', 'repeating'],
        assignments: [
          { infusionId: 'weapon', itemId: 'hammer', state: 'self' },
          { infusionId: 'defense', itemId: 'armor', state: 'self' },
          { infusionId: 'repulsion', itemId: 'shield', state: 'attuned' },
        ],
      },
    },
  });

  sheet.spells = [
    { name: 'Creare Falò', level: 0, summary: 'Trucchetto di Evocazione', concentration: true, ritual: false, verbal: true, somatic: true, material: false },
    { name: 'Dardo di Fuoco', level: 0, summary: 'Trucchetto di Invocazione', concentration: false, ritual: false, verbal: true, somatic: true, material: false },
    { name: 'Allarme', level: 1, summary: '1° livello Abiurazione (Rituale)', concentration: false, ritual: true, verbal: true, somatic: true, material: true },
    { name: 'Aiuto', level: 2, summary: 'Sempre preparato (Fabbro da battaglia)', concentration: false, ritual: false, verbal: true, somatic: true, material: true },
    { name: 'Assorbire Elementi', level: 1, summary: '1° livello Abiurazione (Reazione)', concentration: false, ritual: false, verbal: false, somatic: true, material: false },
    { name: 'Caduta Morbida', level: 1, summary: '1° livello Trasmutazione (Reazione)', concentration: false, ritual: false, verbal: true, somatic: false, material: true },
    { name: 'Camuffare Se Stesso', level: 1, summary: '1° livello Illusione', concentration: false, ritual: false, verbal: true, somatic: true, material: false },
    { name: 'Catapulta', level: 1, summary: '1° livello Trasmutazione', concentration: false, ritual: false, verbal: false, somatic: true, material: false },
    { name: 'Cura Ferite', level: 1, summary: '1° livello Evocazione', concentration: false, ritual: false, verbal: true, somatic: true, material: false },
    { name: 'Eroismo', level: 1, summary: 'Sempre preparato (Fabbro da battaglia)', concentration: true, ritual: false, verbal: true, somatic: true, material: false },
    { name: 'Identificare', level: 1, summary: '1° livello Divinazione (Rituale)', concentration: false, ritual: true, verbal: true, somatic: true, material: true },
    { name: 'Individuazione del Magico', level: 1, summary: '1° livello Divinazione (Rituale)', concentration: true, ritual: true, verbal: true, somatic: true, material: false },
    { name: 'Punizione Marchiante', level: 2, summary: 'Sempre preparato (Fabbro da battaglia)', concentration: true, ritual: false, verbal: true, somatic: false, material: false },
    { name: 'Scudo', level: 1, summary: 'Sempre preparato (Fabbro da battaglia)', concentration: false, ritual: false, verbal: true, somatic: true, material: false },
    { name: 'Vincolo di Interdizione', level: 2, summary: 'Sempre preparato (Fabbro da battaglia)', concentration: false, ritual: false, verbal: true, somatic: true, material: true },
  ];

  const logoBytes = fs.readFileSync(path.join(process.cwd(), 'public/logo-v2.png'));
  const pdfBytes = await renderCharacterSheetV2(sheet, logoBytes);
  const doc = await PDFDocument.load(pdfBytes);

  // Exact page count verification
  assert.equal(doc.getPageCount(), 5, 'Character sheet must have exactly 5 pages');
});
