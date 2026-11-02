import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { buildGeneratedCharacterSheet } from '../src/lib/sheet-generator/build-engine';
import { renderCharacterSheetV2 } from '../src/lib/pdf/character-sheet-v2';
import { loadArtificerEvidence, addArtificerSpecialistSpells } from '../src/lib/server/artificer-source';
import { loadBarbarianEvidence, addBarbarianGrantedSpells } from '../src/lib/server/barbarian-source';
import { loadBardCollegeFeatures, addBardCollegeGrantedSpells } from '../src/lib/server/bard-college-source';
import { loadClericEvidence, addClericGrantedSpells } from '../src/lib/server/cleric-source';
import { loadDruidEvidence, addDruidGrantedSpells } from '../src/lib/server/druid-source';
import { loadFighterEvidence, addFighterGrantedSpells } from '../src/lib/server/fighter-source';
import { loadRogueEvidence, addRogueGrantedSpells } from '../src/lib/server/rogue-source';
import { loadWizardEvidence, addWizardGrantedSpells } from '../src/lib/server/wizard-source';
import { loadMonkEvidence, addMonkGrantedSpells } from '../src/lib/server/monk-source';
import { loadPaladinEvidence, addPaladinGrantedSpells } from '../src/lib/server/paladin-source';
import { loadRangerEvidence, addRangerGrantedSpells } from '../src/lib/server/ranger-source';
import { loadSorcererEvidence, addSorcererGrantedSpells } from '../src/lib/server/sorcerer-source';
import { loadWarlockEvidence, addWarlockGrantedSpells } from '../src/lib/server/warlock-source';

async function main() {
  const logoPath = path.join(process.cwd(), 'public/logo-v2.png');
  const logoBytes = fs.readFileSync(logoPath);

  const classesDir = path.join(process.cwd(), 'output/pdf/v2-classes');
  const verifDir = path.join(process.cwd(), 'output/pdf/v2-verification');
  fs.mkdirSync(classesDir, { recursive: true });
  fs.mkdirSync(verifDir, { recursive: true });

  console.log('--- 1. Generating Approved Artificer Prototype (output/pdf/artefice-v2-compatta.pdf) ---');
  const art8Gen = await buildGeneratedCharacterSheet({
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
  const art8Sheet = art8Gen.sheet;
  art8Sheet.spells = [
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
  const art8Pdf = await renderCharacterSheetV2(art8Sheet, logoBytes);
  const art8Doc = await PDFDocument.load(art8Pdf);
  fs.writeFileSync(path.join(process.cwd(), 'output/pdf/artefice-v2-compatta.pdf'), art8Pdf);
  fs.writeFileSync(path.join(classesDir, 'artefice-v2.pdf'), art8Pdf);
  console.log(`artefice-v2-compatta.pdf written (${art8Doc.getPageCount()} pages)`);

  console.log('\n--- 2. Generating All 13 Supported Class PDFs (output/pdf/v2-classes/) ---');

  // Barbaro L5
  const bar = (await buildGeneratedCharacterSheet({ characterName: 'Krag', raceSlug: 'mezzorco', backgroundSlug: 'soldato', classLabel: 'Barbaro', classSubclass: 'Cammino del Berserker', level: 5 })).sheet;
  const barEv = await loadBarbarianEvidence(bar);
  const barPdf = await renderCharacterSheetV2(await addBarbarianGrantedSpells(bar), logoBytes, { barbarianEvidence: barEv });
  fs.writeFileSync(path.join(classesDir, 'barbaro-v2.pdf'), barPdf);
  console.log(`barbaro-v2.pdf written (${(await PDFDocument.load(barPdf)).getPageCount()} pages)`);

  // Bardo L5
  const brd = (await buildGeneratedCharacterSheet({ characterName: 'Lyra', raceSlug: 'halfling', backgroundSlug: 'intrattenitore', classLabel: 'Bardo', classSubclass: 'Collegio della Sapienza', level: 5 })).sheet;
  const brdCol = await loadBardCollegeFeatures(brd);
  const brdPdf = await renderCharacterSheetV2(await addBardCollegeGrantedSpells(brd), logoBytes, { collegeFeatures: brdCol, bonusSkills: ['arcana', 'history', 'religion'] });
  fs.writeFileSync(path.join(classesDir, 'bardo-v2.pdf'), brdPdf);
  console.log(`bardo-v2.pdf written (${(await PDFDocument.load(brdPdf)).getPageCount()} pages)`);

  // Chierico L5
  const clr = (await buildGeneratedCharacterSheet({ characterName: 'Valen', raceSlug: 'umano', backgroundSlug: 'accolito', classLabel: 'Chierico', classSubclass: 'Dominio della Vita', level: 5 })).sheet;
  const clrEv = await loadClericEvidence(clr);
  const clrPdf = await renderCharacterSheetV2(addClericGrantedSpells(clr, clrEv), logoBytes, { clericEvidence: clrEv });
  fs.writeFileSync(path.join(classesDir, 'chierico-v2.pdf'), clrPdf);
  console.log(`chierico-v2.pdf written (${(await PDFDocument.load(clrPdf)).getPageCount()} pages)`);

  // Druido L5
  const drd = (await buildGeneratedCharacterSheet({ characterName: 'Faelar', raceSlug: 'elfo', backgroundSlug: 'eremita', classLabel: 'Druido', classSubclass: 'Circolo della Luna', level: 5 })).sheet;
  const drdEv = await loadDruidEvidence(drd);
  const drdPdf = await renderCharacterSheetV2(await addDruidGrantedSpells(drd, drdEv), logoBytes, { druidEvidence: drdEv });
  fs.writeFileSync(path.join(classesDir, 'druido-v2.pdf'), drdPdf);
  console.log(`druido-v2.pdf written (${(await PDFDocument.load(drdPdf)).getPageCount()} pages)`);

  // Guerriero L5
  const ftr = (await buildGeneratedCharacterSheet({ characterName: 'Theron', raceSlug: 'umano', backgroundSlug: 'soldato', classLabel: 'Guerriero', classSubclass: 'Maestro di Battaglia', level: 5 })).sheet;
  const ftrEv = await loadFighterEvidence(ftr, undefined, { fightingStyle: 'Duellare' });
  const ftrPdf = await renderCharacterSheetV2(await addFighterGrantedSpells(ftr, ftrEv, { fightingStyle: 'Duellare' }), logoBytes, { fighterEvidence: ftrEv, fighterChoices: { fightingStyle: 'Duellare' } });
  fs.writeFileSync(path.join(classesDir, 'guerriero-v2.pdf'), ftrPdf);
  console.log(`guerriero-v2.pdf written (${(await PDFDocument.load(ftrPdf)).getPageCount()} pages)`);

  // Ladro L5
  const rog = (await buildGeneratedCharacterSheet({ characterName: 'Shade', raceSlug: 'elfo', backgroundSlug: 'criminale', classLabel: 'Ladro', classSubclass: 'Spadaccino', level: 5 })).sheet;
  const rogEv = await loadRogueEvidence(rog);
  const rogPdf = await renderCharacterSheetV2(await addRogueGrantedSpells(rog, rogEv), logoBytes, { rogueEvidence: rogEv });
  fs.writeFileSync(path.join(classesDir, 'ladro-v2.pdf'), rogPdf);
  console.log(`ladro-v2.pdf written (${(await PDFDocument.load(rogPdf)).getPageCount()} pages)`);

  // Mago L5
  const wiz = (await buildGeneratedCharacterSheet({ characterName: 'Elidor', raceSlug: 'gnomo', backgroundSlug: 'sapiente', classLabel: 'Mago', classSubclass: 'Scuola di Invocazione', level: 5 })).sheet;
  const wizEv = await loadWizardEvidence(wiz);
  const wizPdf = await renderCharacterSheetV2(addWizardGrantedSpells(wiz, wizEv), logoBytes, { wizardEvidence: wizEv });
  fs.writeFileSync(path.join(classesDir, 'mago-v2.pdf'), wizPdf);
  console.log(`mago-v2.pdf written (${(await PDFDocument.load(wizPdf)).getPageCount()} pages)`);

  // Monaco L5 (Via della Mano Aperta)
  const mnk = (await buildGeneratedCharacterSheet({ characterName: 'Chen', raceSlug: 'umano', backgroundSlug: 'eremita', classLabel: 'Monaco', classSubclass: 'Via della Mano Aperta', level: 5 })).sheet;
  const mnkEv = await loadMonkEvidence(mnk);
  const mnkPdf = await renderCharacterSheetV2(addMonkGrantedSpells(mnk, mnkEv), logoBytes, { monkEvidence: mnkEv });
  fs.writeFileSync(path.join(classesDir, 'monaco-v2.pdf'), mnkPdf);
  console.log(`monaco-v2.pdf written (${(await PDFDocument.load(mnkPdf)).getPageCount()} pages)`);

  // Paladino L5
  const pal = (await buildGeneratedCharacterSheet({ characterName: 'Gareth', raceSlug: 'umano', backgroundSlug: 'nobile', classLabel: 'Paladino', classSubclass: 'Giuramento di Devozione', level: 5 })).sheet;
  const palEv = await loadPaladinEvidence(pal, undefined, { fightingStyle: 'Difesa' });
  const palPdf = await renderCharacterSheetV2(addPaladinGrantedSpells(pal, palEv), logoBytes, { paladinEvidence: palEv, paladinChoices: { fightingStyle: 'Difesa' } });
  fs.writeFileSync(path.join(classesDir, 'paladino-v2.pdf'), palPdf);
  console.log(`paladino-v2.pdf written (${(await PDFDocument.load(palPdf)).getPageCount()} pages)`);

  // Ranger L5 (Signore delle Bestie + Pantera)
  const rng = (await buildGeneratedCharacterSheet({ characterName: 'Corin', raceSlug: 'elfo', backgroundSlug: 'forestiero', classLabel: 'Ranger', classSubclass: 'Signore delle Bestie', level: 5 })).sheet;
  const rngEv = await loadRangerEvidence(rng, undefined, { fightingStyle: 'Tiro', beastCompanion: 'Pantera' });
  const rngPdf = await renderCharacterSheetV2(addRangerGrantedSpells(rng, rngEv), logoBytes, { rangerEvidence: rngEv, rangerChoices: { fightingStyle: 'Tiro', beastCompanion: 'Pantera' } });
  fs.writeFileSync(path.join(classesDir, 'ranger-v2.pdf'), rngPdf);
  console.log(`ranger-v2.pdf written (${(await PDFDocument.load(rngPdf)).getPageCount()} pages)`);

  // Stregone L5
  const sor = (await buildGeneratedCharacterSheet({ characterName: 'Ignis', raceSlug: 'umano', backgroundSlug: 'sapiente', classLabel: 'Stregone', classSubclass: 'Discendenza draconica', level: 5 })).sheet;
  const sorEv = await loadSorcererEvidence(sor, undefined, { draconicAncestry: 'Rosso', metamagic: ['Incantesimo Rapido', 'Incantesimo Raddoppiato'] });
  const sorPdf = await renderCharacterSheetV2(addSorcererGrantedSpells(sor, sorEv), logoBytes, { sorcererEvidence: sorEv, sorcererChoices: { draconicAncestry: 'Rosso', metamagic: ['Incantesimo Rapido', 'Incantesimo Raddoppiato'] } });
  fs.writeFileSync(path.join(classesDir, 'stregone-v2.pdf'), sorPdf);
  console.log(`stregone-v2.pdf written (${(await PDFDocument.load(sorPdf)).getPageCount()} pages)`);

  // Warlock L5 (Patto del Tomo)
  const war = (await buildGeneratedCharacterSheet({ characterName: 'Malakor', raceSlug: 'tiefling', backgroundSlug: 'sapiente', classLabel: 'Warlock', classSubclass: 'Il Signore Fatato', level: 5 })).sheet;
  const warEv = await loadWarlockEvidence(war, undefined, { pactBoon: 'Patto del Tomo', invocations: ['Deflagrazione Agonizzante', 'Libro degli Antichi Segreti', 'Armatura delle Ombre'] });
  const warPdf = await renderCharacterSheetV2(addWarlockGrantedSpells(war, warEv), logoBytes, { warlockEvidence: warEv, warlockChoices: { pactBoon: 'Patto del Tomo', invocations: ['Deflagrazione Agonizzante', 'Libro degli Antichi Segreti', 'Armatura delle Ombre'] } });
  fs.writeFileSync(path.join(classesDir, 'warlock-v2.pdf'), warPdf);
  console.log(`warlock-v2.pdf written (${(await PDFDocument.load(warPdf)).getPageCount()} pages)`);

  console.log('\n--- 3. Generating Edge-Case Verification PDFs (output/pdf/v2-verification/) ---');

  // Edge 1: L17 Wizard (slots 1°-9°)
  const wiz17 = (await buildGeneratedCharacterSheet({ characterName: 'Archmage Morden', raceSlug: 'umano', backgroundSlug: 'sapiente', classLabel: 'Mago', classSubclass: 'Scuola di Evocazione', level: 17 })).sheet;
  const wiz17Ev = await loadWizardEvidence(wiz17);
  const wiz17Pdf = await renderCharacterSheetV2(addWizardGrantedSpells(wiz17, wiz17Ev), logoBytes, { wizardEvidence: wiz17Ev });
  fs.writeFileSync(path.join(verifDir, 'mago-l17-slots-1-9.pdf'), wiz17Pdf);
  console.log(`mago-l17-slots-1-9.pdf written (${(await PDFDocument.load(wiz17Pdf)).getPageCount()} pages)`);

  // Edge 2: L17 Warlock (Mystic Arcanum 6°-9°)
  const war17 = (await buildGeneratedCharacterSheet({ characterName: 'Netherlord Vorash', raceSlug: 'tiefling', backgroundSlug: 'sapiente', classLabel: 'Warlock', classSubclass: "L'Immondo", level: 17 })).sheet;
  const war17Ev = await loadWarlockEvidence(war17, undefined, { pactBoon: 'Patto del Tomo', invocations: ['Deflagrazione Agonizzante', 'Armatura delle Ombre', 'Lama Assetata', 'Occhi del Guardiano delle Rune', 'Scultore della Carne', 'Sussurri dell\'Entità Superiore', 'Catene di Carceri', 'Visioni di Reami Lontani'] });
  const war17Pdf = await renderCharacterSheetV2(addWarlockGrantedSpells(war17, war17Ev), logoBytes, { warlockEvidence: war17Ev, warlockChoices: { pactBoon: 'Patto del Tomo', invocations: ['Deflagrazione Agonizzante', 'Armatura delle Ombre', 'Lama Assetata', 'Occhi del Guardiano delle Rune', 'Scultore della Carne', 'Sussurri dell\'Entità Superiore', 'Catene di Carceri', 'Visioni di Reami Lontani'] } });
  fs.writeFileSync(path.join(verifDir, 'warlock-l17-mystic-arcanum.pdf'), war17Pdf);
  console.log(`warlock-l17-mystic-arcanum.pdf written (${(await PDFDocument.load(war17Pdf)).getPageCount()} pages)`);

  // Edge 3: Dual-Companion Battle Smith + Homunculus Servant
  const dualCompGen = await buildGeneratedCharacterSheet({
    characterName: 'Daedalus',
    raceSlug: 'gnomo',
    backgroundSlug: 'sapiente',
    classLabel: 'Artefice',
    classSubclass: 'Fabbro da battaglia',
    level: 10,
    buildOverrides: {
      artificer: {
        shield: false,
        known: ['weapon', 'defense', 'homunculus', 'repulsion', 'mind', 'repeating', 'returning', 'focus'],
        assignments: [
          { infusionId: 'weapon', itemId: 'hammer', state: 'self' },
          { infusionId: 'homunculus', itemId: 'crystal', state: 'self' },
        ],
      },
    },
  });
  const dualCompPdf = await renderCharacterSheetV2(dualCompGen.sheet, logoBytes);
  fs.writeFileSync(path.join(verifDir, 'artefice-dual-companion.pdf'), dualCompPdf);
  console.log(`artefice-dual-companion.pdf written (${(await PDFDocument.load(dualCompPdf)).getPageCount()} pages)`);

  // Edge 4: Tasha Primal Companion (Bestia del Cielo)
  const rngSky = (await buildGeneratedCharacterSheet({ characterName: 'Aeron', raceSlug: 'elfo', backgroundSlug: 'forestiero', classLabel: 'Ranger', classSubclass: 'Signore delle Bestie', level: 5 })).sheet;
  const rngSkyEv = await loadRangerEvidence(rngSky, undefined, { fightingStyle: 'Tiro', beastCompanion: 'Bestia del Cielo' });
  const rngSkyPdf = await renderCharacterSheetV2(addRangerGrantedSpells(rngSky, rngSkyEv), logoBytes, { rangerEvidence: rngSkyEv, rangerChoices: { fightingStyle: 'Tiro', beastCompanion: 'Bestia del Cielo' } });
  fs.writeFileSync(path.join(verifDir, 'ranger-tasha-bestia-cielo.pdf'), rngSkyPdf);
  console.log(`ranger-tasha-bestia-cielo.pdf written (${(await PDFDocument.load(rngSkyPdf)).getPageCount()} pages)`);

  // Edge 5: Tiefling Cleric (dual-ability spellcasting: WIS cleric + CHA racial Hellish Rebuke/Darkness)
  const tiefClr = (await buildGeneratedCharacterSheet({ characterName: 'Zariel Follower', raceSlug: 'tiefling', backgroundSlug: 'accolito', classLabel: 'Chierico', classSubclass: 'Dominio della Guerra', level: 5 })).sheet;
  const tiefClrEv = await loadClericEvidence(tiefClr);
  const tiefClrPdf = await renderCharacterSheetV2(addClericGrantedSpells(tiefClr, tiefClrEv), logoBytes, { clericEvidence: tiefClrEv });
  fs.writeFileSync(path.join(verifDir, 'tiefling-chierico-dual-ability.pdf'), tiefClrPdf);
  console.log(`tiefling-chierico-dual-ability.pdf written (${(await PDFDocument.load(tiefClrPdf)).getPageCount()} pages)`);

  console.log('\nAll PDFs generated successfully!');
}

main().catch((err) => {
  console.error('Generation failed:', err);
  process.exit(1);
});
