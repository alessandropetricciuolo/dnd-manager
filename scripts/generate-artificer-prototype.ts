import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { buildGeneratedCharacterSheet } from '../src/lib/sheet-generator/build-engine';
import { renderCharacterSheetV2 } from '../src/lib/pdf/character-sheet-v2';

async function main() {
  console.log('Generating Artificer Level 8 character sheet fixture...');

  // Match the exact fixture of eg-v2.pdf: High Elf Artificer 8, Battle Smith
  const generated = await buildGeneratedCharacterSheet({
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

  const sheet = generated.sheet;

  // The exact 15 spells from eg-v2.pdf
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
  console.log(`Character: ${sheet.characterName}, ${sheet.classLabel} ${sheet.level} (${sheet.classSubclass})`);
  console.log(`Abilities: INT ${sheet.abilities.int} (+${sheet.abilityMods.int}), DEX ${sheet.abilities.dex}, CON ${sheet.abilities.con}`);
  console.log(`Defenses: CA ${sheet.armorClass}, Iniziativa ${sheet.initiative}, Velocità ${sheet.speed}`);
  console.log(`PF Max: ${sheet.hpMax}, Dadi Vita: ${sheet.hitDiceTotal} ${sheet.hitDie}`);
  console.log(`Spells count: ${sheet.spells.length}`);

  const logoBytes = fs.readFileSync(path.join(process.cwd(), 'public/logo-v2.png'));
  const pdfBytes = await renderCharacterSheetV2(sheet, logoBytes);

  const outDir = path.join(process.cwd(), 'output/pdf');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'artefice-v2-compatta.pdf');
  fs.writeFileSync(outPath, pdfBytes);

  const doc = await PDFDocument.load(pdfBytes);
  const pageCount = doc.getPageCount();
  console.log(`\nGenerated PDF successfully saved to: ${outPath}`);
  console.log(`Exact page count: ${pageCount} pages (reduced from 21 pages!)`);
}

main().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
