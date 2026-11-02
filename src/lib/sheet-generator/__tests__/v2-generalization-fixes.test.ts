import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { PDFDocument, PDFName, PDFRawStream, PDFArray } from 'pdf-lib';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';
import { loadWarlockEvidence, addWarlockGrantedSpells } from '@/lib/server/warlock-source';
import { loadMonkEvidence, addMonkGrantedSpells } from '@/lib/server/monk-source';
import { loadFighterEvidence, addFighterGrantedSpells } from '@/lib/server/fighter-source';
import { loadClericEvidence, addClericGrantedSpells } from '@/lib/server/cleric-source';
import { loadDruidEvidence, addDruidGrantedSpells } from '@/lib/server/druid-source';
import { loadWizardEvidence, addWizardGrantedSpells } from '@/lib/server/wizard-source';
import { loadRangerEvidence, addRangerGrantedSpells } from '@/lib/server/ranger-source';
import { VERIFIED_SPELL_SUMMARIES } from '../spell-operative-summaries';

const LOGO_BYTES = fs.readFileSync(path.join(process.cwd(), 'public/logo-v2.png'));

/** Extracts all drawn text strings and their (x, y) coordinates per page from a pdf-lib generated PDF. */
async function extractPdfPagesText(pdfBytes: Uint8Array): Promise<
  Array<{
    pageNumber: number;
    fullText: string;
    items: Array<{ text: string; x: number; y: number }>;
  }>
> {
  const doc = await PDFDocument.load(pdfBytes);
  const pages = doc.getPages();
  return pages.map((page, idx) => {
    const contentsRef = page.node.get(PDFName.of('Contents'));
    const streams: PDFRawStream[] = [];
    if (contentsRef) {
      const resolved = doc.context.lookup(contentsRef);
      if (resolved instanceof PDFRawStream) {
        streams.push(resolved);
      } else if (resolved instanceof PDFArray) {
        for (let i = 0; i < resolved.size(); i++) {
          const s = doc.context.lookup(resolved.get(i));
          if (s instanceof PDFRawStream) streams.push(s);
        }
      }
    }

    let rawOps = '';
    for (const st of streams) {
      const bytes = st.getContents();
      const filter = st.dict.get(PDFName.of('Filter'));
      if (filter && filter.toString().includes('FlateDecode')) {
        rawOps += zlib.inflateSync(Buffer.from(bytes)).toString('latin1') + '\n';
      } else {
        rawOps += Buffer.from(bytes).toString('latin1') + '\n';
      }
    }

    const items: Array<{ text: string; x: number; y: number }> = [];
    let curX = 0;
    let curY = 0;
    // Parse BT ... ET blocks for Tm/Td coordinates and hex/literal Tj strings
    const lines = rawOps.split(/\r?\n/);
    for (const line of lines) {
      const tm = line.match(
        /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Tm/
      );
      if (tm) {
        curX = parseFloat(tm[5]);
        curY = parseFloat(tm[6]);
      }
      const td = line.match(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+Td/);
      if (td) {
        curX += parseFloat(td[1]);
        curY += parseFloat(td[2]);
      }
      const hexMatches = [...line.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)];
      for (const hm of hexMatches) {
        const decoded = Buffer.from(hm[1], 'hex').toString('latin1');
        items.push({ text: decoded, x: curX, y: curY });
      }
      const litMatches = [...line.matchAll(/\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g)];
      for (const lm of litMatches) {
        const decoded = lm[1].replace(/\\([()\\])/g, '$1');
        items.push({ text: decoded, x: curX, y: curY });
      }
    }

    return {
      pageNumber: idx + 1,
      fullText: items.map((i) => i.text).join(' '),
      items,
    };
  });
}

test('1. Warlock Patto del Tomo: prints ONLY chosen Pact Boon & chosen Invocations with zero frame overflow', async () => {
  const { sheet } = await buildGeneratedCharacterSheet({
    characterName: 'Aldric Vex',
    raceSlug: 'umano',
    subraceSlug: null,
    classLabel: 'Warlock',
    classSubclass: 'Il Grande Antico',
    backgroundSlug: 'sapiente',
    level: 5,
    alignment: 'Neutrale',
    age: '31',
    height: '1.80 m',
    weight: '75 kg',
    sex: 'Maschio',
  });

  const choices = {
    pactBoon: 'Patto del Tomo' as const,
    invocations: ['Libro degli Antichi Segreti', 'Deflagrazione Agonizzante', 'Vista del Diavolo'],
  };
  const ev = await loadWarlockEvidence(sheet, undefined, choices);
  const enriched = addWarlockGrantedSpells(sheet, ev);
  const pdfBytes = await renderCharacterSheetV2(enriched, LOGO_BYTES, {
    warlockEvidence: ev,
    warlockChoices: choices,
  });

  const pages = await extractPdfPagesText(pdfBytes);
  const allText = pages.map((p) => p.fullText).join('\n');

  assert.ok(allText.includes('Patto del Tomo'), 'Selected Pact of the Tome must be printed');
  assert.ok(allText.includes('Libro delle Ombre'), 'Book of Shadows rule must be printed');
  assert.ok(!allText.includes('Patto della Catena'), 'Unselected Pact of the Chain must NOT be printed');
  assert.ok(!allText.includes('Patto della Lama'), 'Unselected Pact of the Blade must NOT be printed');
  assert.ok(!allText.includes('Patto del Talismano'), 'Unselected Pact of the Talisman must NOT be printed');
  assert.ok(allText.includes('Libro degli Antichi Segreti'), 'Chosen invocation must be printed');
  assert.ok(!allText.includes('Lama Assetata'), 'Unchosen invocation must NOT be printed');

  // Verify every text item stays strictly within page frame vertical bounds (footer >= 12, body <= 812)
  for (const page of pages) {
    for (const item of page.items) {
      assert.ok(
        item.y >= 12 && item.y <= 815,
        `Page ${page.pageNumber} text "${item.text}" out of vertical bounds at y=${item.y}`
      );
      assert.ok(
        item.x >= 18 && item.x <= 575,
        `Page ${page.pageNumber} text "${item.text}" out of horizontal bounds at x=${item.x}`
      );
    }
  }
});

test('2. Monk L5 Via della Mano Aperta: Colpo senz\'armi 1d6, zero 11d6, real tradition features, zero Artificer fallbacks', async () => {
  const { sheet } = await buildGeneratedCharacterSheet({
    characterName: 'Kaelen',
    raceSlug: 'elfo',
    subraceSlug: 'elfo_silvano',
    classLabel: 'Monaco',
    classSubclass: 'Via della Mano Aperta',
    backgroundSlug: 'eremita',
    level: 5,
    alignment: 'Legale Neutrale',
    age: '90',
    height: '1.75 m',
    weight: '68 kg',
    sex: 'Maschio',
    buildOverrides: {
      abilities: { str: 10, dex: 18, con: 14, int: 10, wis: 16, cha: 8 },
    },
  });

  // Engine itself must already upgrade unarmed strike to 1d6 at L5
  const unarmedEngine = sheet.weaponRows.find((w) => w.name.toLowerCase().includes('colpo senz'));
  assert.ok(unarmedEngine, 'Colpo senz\'armi present in engine');
  assert.ok(unarmedEngine.damage.startsWith('1d6'), `Expected 1d6 unarmed damage at L5, got ${unarmedEngine.damage}`);

  const ev = await loadMonkEvidence(sheet);
  const enriched = await addMonkGrantedSpells(sheet, ev);
  const pdfBytes = await renderCharacterSheetV2(enriched, LOGO_BYTES, { monkEvidence: ev });
  const pages = await extractPdfPagesText(pdfBytes);
  const allText = pages.map((p) => p.fullText).join('\n');

  assert.ok(!allText.includes('11d6'), 'Bug "11d6" must never appear');
  assert.ok(!allText.includes('21d6'), 'Bug "21d6" must never appear');
  assert.ok(allText.includes('1d6+4'), 'Unarmed strike must show 1d6+4');
  assert.ok(allText.includes('Tecnica della Mano Aperta'), 'Open Hand tradition feature must be printed');
  assert.ok(!allText.toLowerCase().includes('leggere, medie, scudi'), 'Artificer armor fallback must not appear on Monk');
  assert.ok(!allText.includes('Strumenti (x2 BC)'), 'Tool expertise must not be applied to Monk');
});

test('3. Feature gating by level & subclass: Fighter Champion/BattleMaster, Cleric Divine Intervention, Druid Moon/Land', async () => {
  // 3a. Fighter Battle Master L7 must NOT get Atleta Straordinario
  const bmSheet = (
    await buildGeneratedCharacterSheet({
      characterName: 'Garrick',
      raceSlug: 'umano',
      subraceSlug: null,
      classLabel: 'Guerriero',
      classSubclass: 'Maestro di Battaglia',
      backgroundSlug: 'soldato',
      level: 7,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
    })
  ).sheet;
  const bmEv = await loadFighterEvidence(bmSheet, undefined, {
    fightingStyle: 'Difesa',
    maneuvers: ['Attacco con Disarmo', 'Attacco Preciso', 'Riposta'],
  });
  const bmPdf = await renderCharacterSheetV2(await addFighterGrantedSpells(bmSheet, bmEv), LOGO_BYTES, {
    fighterEvidence: bmEv,
    fighterChoices: {
      fightingStyle: 'Difesa',
      maneuvers: ['Attacco con Disarmo', 'Attacco Preciso', 'Riposta'],
    },
  });
  const bmText = (await extractPdfPagesText(bmPdf)).map((p) => p.fullText).join('\n');
  assert.ok(!bmText.includes('Atleta Straordinario'), 'Battle Master must NOT receive Atleta Straordinario');
  assert.ok(bmText.includes('Attacco Preciso'), 'Chosen maneuver Attacco Preciso must appear');
  assert.ok(!bmText.includes('Attacco Provocatorio'), 'Unchosen maneuver must NOT appear');

  // 3b. Fighter Champion L3 must NOT get Atleta Straordinario; Champion L7 MUST get it
  const champ3 = (
    await buildGeneratedCharacterSheet({
      characterName: 'Champ3',
      raceSlug: 'umano',
      subraceSlug: null,
      classLabel: 'Guerriero',
      classSubclass: 'Campione',
      backgroundSlug: 'soldato',
      level: 3,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
    })
  ).sheet;
  const champ3Ev = await loadFighterEvidence(champ3);
  const champ3Text = (
    await extractPdfPagesText(await renderCharacterSheetV2(champ3, LOGO_BYTES, { fighterEvidence: champ3Ev }))
  )
    .map((p) => p.fullText)
    .join('\n');
  assert.ok(!champ3Text.includes('Atleta Straordinario'), 'Champion L3 must NOT receive L7 Atleta Straordinario');

  const champ7 = (
    await buildGeneratedCharacterSheet({
      characterName: 'Champ7',
      raceSlug: 'umano',
      subraceSlug: null,
      classLabel: 'Guerriero',
      classSubclass: 'Campione',
      backgroundSlug: 'soldato',
      level: 7,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
    })
  ).sheet;
  const champ7Ev = await loadFighterEvidence(champ7);
  const champ7Text = (
    await extractPdfPagesText(await renderCharacterSheetV2(champ7, LOGO_BYTES, { fighterEvidence: champ7Ev }))
  )
    .map((p) => p.fullText)
    .join('\n');
  assert.ok(champ7Text.includes('Atleta Straordinario'), 'Champion L7 MUST receive Atleta Straordinario');

  // 3c. Cleric L5 vs L10 Intervento Divino
  const cle5 = (
    await buildGeneratedCharacterSheet({
      characterName: 'Cleric5',
      raceSlug: 'umano',
      subraceSlug: null,
      classLabel: 'Chierico',
      classSubclass: 'Dominio della Vita',
      backgroundSlug: 'accolito',
      level: 5,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
    })
  ).sheet;
  const cle5Ev = await loadClericEvidence(cle5);
  const cle5Text = (
    await extractPdfPagesText(
      await renderCharacterSheetV2(addClericGrantedSpells(cle5, cle5Ev), LOGO_BYTES, { clericEvidence: cle5Ev })
    )
  )
    .map((p) => p.fullText)
    .join('\n');
  assert.ok(!cle5Text.includes('Intervento Divino'), 'Cleric L5 must NOT show L10 Intervento Divino');

  const cle10 = (
    await buildGeneratedCharacterSheet({
      characterName: 'Cleric10',
      raceSlug: 'umano',
      subraceSlug: null,
      classLabel: 'Chierico',
      classSubclass: 'Dominio della Vita',
      backgroundSlug: 'accolito',
      level: 10,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
    })
  ).sheet;
  const cle10Ev = await loadClericEvidence(cle10);
  const cle10Text = (
    await extractPdfPagesText(
      await renderCharacterSheetV2(addClericGrantedSpells(cle10, cle10Ev), LOGO_BYTES, { clericEvidence: cle10Ev })
    )
  )
    .map((p) => p.fullText)
    .join('\n');
  assert.ok(cle10Text.includes('Intervento Divino'), 'Cleric L10 MUST show Intervento Divino');

  // 3d. Druid Circolo della Luna L5: no Land features, no L6 Colpi Primordiali, no L8 Andatura sul Territorio
  const dru5 = (
    await buildGeneratedCharacterSheet({
      characterName: 'Druid5',
      raceSlug: 'elfo',
      subraceSlug: 'elfo_silvano',
      classLabel: 'Druido',
      classSubclass: 'Circolo della Luna',
      backgroundSlug: 'eremita',
      level: 5,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
    })
  ).sheet;
  const dru5Ev = await loadDruidEvidence(dru5);
  const dru5Text = (
    await extractPdfPagesText(
      await renderCharacterSheetV2(await addDruidGrantedSpells(dru5, dru5Ev), LOGO_BYTES, { druidEvidence: dru5Ev })
    )
  )
    .map((p) => p.fullText)
    .join('\n');
  assert.ok(dru5Text.includes('Forma Selvatica da Combattimento'), 'Moon Druid L5 must show Combat Wild Shape');
  assert.ok(!dru5Text.includes('Recupero Naturale'), 'Moon Druid must NOT show Land Druid Recupero Naturale');
  assert.ok(!dru5Text.includes('Colpi Primordiali'), 'Moon Druid L5 must NOT show L6 Colpi Primordiali');
  assert.ok(!dru5Text.includes('Passo sul Terreno'), 'Druid L5 must NOT show L8 Passo sul Terreno');
  assert.ok(!dru5Text.includes('Prima del 18'), 'Druid L5 must NOT include future-level promises');
});

test('4. Verified spell catalog completeness & explicit pre-print failure on unverified spells', async () => {
  const entries = Object.values(VERIFIED_SPELL_SUMMARIES);
  assert.ok(entries.length >= 477, `Expected >= 477 verified manual spells, got ${entries.length}`);

  for (const sp of entries) {
    assert.ok(sp.school.trim().length > 0, `${sp.name} missing school`);
    assert.ok(sp.castingTime.trim().length > 0, `${sp.name} missing castingTime`);
    assert.ok(sp.range.trim().length > 0, `${sp.name} missing range`);
    assert.ok(sp.components.trim().length > 0, `${sp.name} missing components`);
    assert.ok(sp.duration.trim().length > 0, `${sp.name} missing duration`);
    assert.ok(sp.effectSummary.trim().length >= 25, `${sp.name} effectSummary too short`);
    if (sp.castingTime.toLowerCase().includes('reazione')) {
      assert.ok(
        sp.effectSummary.includes('Innesco:'),
        `Reaction spell ${sp.name} must explicitly state Innesco:`
      );
    }
  }

  // Attempting to print an unverified spell must throw explicitly instead of truncating or inventing defaults
  const { sheet } = await buildGeneratedCharacterSheet({
    characterName: 'Test Fail',
    raceSlug: 'umano',
    subraceSlug: null,
    classLabel: 'Artefice',
    classSubclass: 'Fabbro da battaglia',
    backgroundSlug: 'sapiente',
    level: 3,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  sheet.spells.push({
    name: 'Incantesimo Inventato Inesistente',
    level: 1,
    summary: 'Non verificato',
    concentration: false,
    ritual: false,
    verbal: true,
    somatic: true,
    material: false,
  });

  await assert.rejects(
    () => renderCharacterSheetV2(sheet, LOGO_BYTES),
    /Impossibile stampare la scheda compatta/
  );
});

test('5. Dual-origin & dual-ability spells coexist without overwriting (Tiefling Cleric & Tiefling Warlock Oscurità)', async () => {
  // 5a. Tiefling Cleric L5: CHA racial spells + WIS Cleric spells
  const tieflingCleric = (
    await buildGeneratedCharacterSheet({
      characterName: 'Zarielita',
      raceSlug: 'tiefling',
      subraceSlug: null,
      classLabel: 'Chierico',
      classSubclass: 'Dominio della Luce',
      backgroundSlug: 'accolito',
      level: 5,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
      buildOverrides: {
        abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 18, cha: 14 },
      },
    })
  ).sheet;
  const tcEv = await loadClericEvidence(tieflingCleric);
  const tcFull = addClericGrantedSpells(tieflingCleric, tcEv);

  const taumaturgia = tcFull.spells.find((sp) => sp.name === 'Taumaturgia' && sp.origin === 'race');
  const intimorire = tcFull.spells.find((sp) => sp.name === 'Intimorire Infernale' && sp.origin === 'race');
  const oscuritaRace = tcFull.spells.find((sp) => sp.name === 'Oscurità' && sp.origin === 'race');
  assert.ok(taumaturgia && taumaturgia.ability === 'cha');
  assert.ok(intimorire && intimorire.ability === 'cha' && intimorire.castAtLevel === 2 && intimorire.requiresSlot === false);
  assert.ok(oscuritaRace && oscuritaRace.ability === 'cha' && oscuritaRace.requiresSlot === false);

  const tcPdfText = (
    await extractPdfPagesText(await renderCharacterSheetV2(tcFull, LOGO_BYTES, { clericEvidence: tcEv }))
  )
    .map((p) => p.fullText)
    .join('\n');
  assert.ok(tcPdfText.includes('[Razza CAR]'), 'Racial CHA provenance badge must appear');
  assert.ok(tcPdfText.includes('CAR: CD 13, TpC +5'), 'Secondary CHA DC/Attack must be calculated and shown');

  // 5b. Tiefling Warlock L5 who ALSO knows Oscurità from Pact Magic: BOTH entries must coexist!
  const tieflingWarlock = (
    await buildGeneratedCharacterSheet({
      characterName: 'Mephisto',
      raceSlug: 'tiefling',
      subraceSlug: null,
      classLabel: 'Warlock',
      classSubclass: "L'Immondo",
      backgroundSlug: 'sapiente',
      level: 5,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
      buildOverrides: {
        spells: ['Deflagrazione Occulta', 'Mano Magica', 'Esplosione', 'Oscurità', ' suggestione'].map((x) => x.trim()),
      },
    })
  ).sheet;
  const twEv = await loadWarlockEvidence(tieflingWarlock);
  const twFull = addWarlockGrantedSpells(tieflingWarlock, twEv);
  const darknessEntries = twFull.spells.filter((sp) => sp.name.toLowerCase() === 'oscurità');
  assert.equal(darknessEntries.length, 2, 'Both racial Oscurità and Pact Oscurità must be preserved');
  assert.ok(darknessEntries.some((d) => d.origin === 'race' && d.requiresSlot === false));
  assert.ok(darknessEntries.some((d) => d.origin === 'pact' && d.requiresSlot !== false));
});

test('6. High-level casters render ALL slot levels 1°-9° and Warlock Mystic Arcanum 6°-9°', async () => {
  const wiz17 = (
    await buildGeneratedCharacterSheet({
      characterName: 'Arcimago',
      raceSlug: 'elfo',
      subraceSlug: 'elfo_alto',
      classLabel: 'Mago',
      classSubclass: 'Scuola di Invocazione',
      backgroundSlug: 'sapiente',
      level: 17,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
      buildOverrides: { racialCantrip: 'Luce' },
    })
  ).sheet;
  const wizEv = await loadWizardEvidence(wiz17);
  const wizFull = addWizardGrantedSpells(wiz17, wizEv);
  const wizPdfText = (
    await extractPdfPagesText(await renderCharacterSheetV2(wizFull, LOGO_BYTES, { wizardEvidence: wizEv }))
  )
    .map((p) => p.fullText)
    .join('\n');

  for (const lvl of [6, 7, 8, 9]) {
    assert.ok(wizPdfText.includes(`Slot ${lvl}°:`), `Wizard L17 must render Slot ${lvl}° tracker`);
  }
  assert.ok(wizPdfText.includes('Luce'), 'Chosen High Elf racial cantrip Luce must be rendered');

  const war17 = (
    await buildGeneratedCharacterSheet({
      characterName: 'Arcistregone',
      raceSlug: 'umano',
      subraceSlug: null,
      classLabel: 'Warlock',
      classSubclass: "L'Immondo",
      backgroundSlug: 'sapiente',
      level: 17,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
    })
  ).sheet;
  const warEv = await loadWarlockEvidence(war17);
  const warFull = addWarlockGrantedSpells(war17, warEv);
  const warPdfText = (
    await extractPdfPagesText(await renderCharacterSheetV2(warFull, LOGO_BYTES, { warlockEvidence: warEv }))
  )
    .map((p) => p.fullText)
    .join('\n');
  assert.ok(warPdfText.includes('Arcanum Mistico'), 'Warlock L17 must render Mystic Arcanum');
  assert.ok(warPdfText.includes('[Arcanum]'), 'Mystic Arcanum spells must appear in the spell table with [Arcanum]');
});

test('7. Multiple companions & pure PHB vs Tasha Beast Master companions', async () => {
  // 7a. Battle Smith L8 WITH Homunculus Servant assigned renders BOTH companions!
  const { sheet: dualArt } = await buildGeneratedCharacterSheet({
    characterName: 'Dual Companion',
    raceSlug: 'umano',
    subraceSlug: null,
    classLabel: 'Artefice',
    classSubclass: 'Fabbro da battaglia',
    backgroundSlug: 'artigiano_gilda',
    level: 8,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
    buildOverrides: {
      artificer: {
        known: ['weapon', 'defense', 'homunculus', 'mind', 'repeating', 'focus'],
        assignments: [
          { infusionId: 'weapon', itemId: 'hammer', state: 'self' },
          { infusionId: 'defense', itemId: 'armor', state: 'self' },
          { infusionId: 'homunculus', itemId: 'crystal', state: 'self' },
        ],
      },
    },
  });
  const dualPages = await extractPdfPagesText(await renderCharacterSheetV2(dualArt, LOGO_BYTES));
  const dualText = dualPages.map((p) => p.fullText).join('\n');
  assert.ok(dualText.includes("COMPAGNO: DIFENSORE D'ACCIAIO"), 'Steel Defender page must be rendered');
  assert.ok(dualText.includes('COMPAGNO: SERVO OMUNCOLO'), 'Homunculus Servant page must ALSO be rendered');

  // 7b. Ranger Beast Master: Pantera (PHB) vs Bestia del Cielo (Tasha)
  const rngSheet = (
    await buildGeneratedCharacterSheet({
      characterName: 'Sylvan',
      raceSlug: 'elfo',
      subraceSlug: 'elfo_silvano',
      classLabel: 'Ranger',
      classSubclass: 'Signore delle Bestie',
      backgroundSlug: 'forestiero',
      level: 5,
      alignment: null,
      age: null,
      height: null,
      weight: null,
      sex: null,
    })
  ).sheet;
  const rngEv = await loadRangerEvidence(rngSheet);
  const rngFull = addRangerGrantedSpells(rngSheet, rngEv);

  const phbPdfText = (
    await extractPdfPagesText(
      await renderCharacterSheetV2(rngFull, LOGO_BYTES, {
        rangerEvidence: rngEv,
        rangerChoices: { beastCompanion: 'Pantera' },
      })
    )
  )
    .map((p) => p.fullText)
    .join('\n');
  assert.ok(phbPdfText.includes('COMPAGNO DEL RANGER: PANTERA'), 'PHB Pantera companion must be rendered');
  assert.ok(phbPdfText.includes('Balzo'), 'PHB Pantera Pounce trait must be rendered');
  assert.ok(!phbPdfText.includes('Legame Primordiale'), 'Tasha trait must NOT bleed into PHB Pantera');

  const tashaPdfText = (
    await extractPdfPagesText(
      await renderCharacterSheetV2(rngFull, LOGO_BYTES, {
        rangerEvidence: rngEv,
        rangerChoices: { beastCompanion: 'Bestia del Cielo' },
      })
    )
  )
    .map((p) => p.fullText)
    .join('\n');
  assert.ok(tashaPdfText.includes('COMPAGNO PRIMORDIALE: BESTIA DEL CIELO'), 'Tasha Bestia del Cielo must be rendered');
  assert.ok(tashaPdfText.includes('Sfuggente'), 'Tasha Sfuggente (Flyby) trait must be rendered');
  assert.ok(tashaPdfText.includes('Legame Primordiale'), 'Tasha Legame Primordiale trait must be rendered');
  assert.ok(!tashaPdfText.includes('Tattiche del Branco'), 'PHB Wolf trait must NOT bleed into Tasha Primal Companion');
});

test('8. Dynamic pagination: zero silent drops on > 6 weapons, > 20 inventory items, long story & quick manual', async () => {
  const { sheet } = await buildGeneratedCharacterSheet({
    characterName: 'Quartermaster',
    raceSlug: 'nano',
    subraceSlug: 'nano_colline',
    classLabel: 'Guerriero',
    classSubclass: 'Campione',
    backgroundSlug: 'soldato',
    level: 5,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });

  // Add 8 weapons and 24 inventory items
  sheet.weaponRows = Array.from({ length: 8 }, (_, i) => ({
    name: `ArmaSpeciale${i + 1}`,
    toHit: '+6',
    damage: '1d8+3',
    type: 'tagliente',
  }));
  sheet.inventory = Array.from({ length: 24 }, (_, i) => `OggettoInventarioNumero${i + 1}`);

  const ev = await loadFighterEvidence(sheet);
  const longStory = `${'Capitolo della saga eroica lungo molte righe per verificare la paginazione continua. '.repeat(220)} MARCATORE_FINE_STORIA`;
  const quickSections = Array.from({ length: 5 }, (_, i) => ({
    title: `SEZIONE_MANUALE_${i + 1}`,
    body: `${'Regola estesa di consultazione rapida con dettagli operativi completi. '.repeat(35)} FINE_SEZIONE_${i + 1}`,
  }));

  const pdfBytes = await renderCharacterSheetV2(sheet, LOGO_BYTES, {
    fighterEvidence: ev,
    story: longStory,
    quickManualSections: quickSections,
  });

  const pages = await extractPdfPagesText(pdfBytes);
  const allText = pages.map((p) => p.fullText).join('\n');

  assert.ok(allText.includes('ArmaSpeciale1') && allText.includes('ArmaSpeciale8'), 'All 8 weapons must be rendered');
  assert.ok(
    allText.includes('OggettoInventarioNumero1') && allText.includes('OggettoInventarioNumero24'),
    'All 24 inventory items must be rendered without .slice(0, 12) drop'
  );
  assert.ok(allText.includes('MARCATORE_FINE_STORIA'), 'Story beyond 3 pages must not be truncated');
  assert.ok(allText.includes('FINE_SEZIONE_5'), 'All quick manual sections must paginate without truncation');
});

test('9. Manual residue cleanup: strips chapter/page artifacts without touching gameplay numbers', async () => {
  const { stripManualArtifacts } = await import('../feature-operative-summaries');

  const dirtyText =
    'Con un\'azione, il warlock puo obbligare ogni creatura entro un cubo con spigolo di 3 metri originato da lui a effettuare un tiro salvezza su Saggezza contro la CD degli incantesimi del warlock. Le creature\n116 CAPITOLO 3 | CLASSI\nche falliscono il loro tiro salvezza sono tutte affascinate o spaventate dal warlock.\n42\nimg-9. jpeg\nInfligge 2d8 + 3 danni da forza a gittata 18 m; costa 50 mo e richiede 2 ore di lavoro al 3° livello.';

  const cleaned = stripManualArtifacts(dirtyText);
  assert.ok(!cleaned.includes('CAPITOLO 3 | CLASSI'), 'Chapter heading artifact must be stripped');
  assert.ok(!cleaned.includes('116'), 'Page number artifact must be stripped');
  assert.ok(!cleaned.includes('42'), 'Isolated page number on its own line must be stripped');
  assert.ok(!cleaned.includes('img-9'), 'Image artifact must be stripped');

  // Verify gameplay numbers and stats remain 100% intact:
  assert.ok(cleaned.includes('3 metri'), 'Gameplay distance "3 metri" must be preserved');
  assert.ok(cleaned.includes('2d8 + 3 danni da forza'), 'Gameplay damage formula must be preserved');
  assert.ok(cleaned.includes('18 m'), 'Gameplay range "18 m" must be preserved');
  assert.ok(cleaned.includes('50 mo'), 'Gameplay cost "50 mo" must be preserved');
  assert.ok(cleaned.includes('2 ore'), 'Gameplay time "2 ore" must be preserved');
  assert.ok(cleaned.includes('3° livello'), 'Gameplay level "3° livello" must be preserved');

  // Check actual rendered Warlock PDF for zero extraction artifacts
  const { sheet: warSheet } = await buildGeneratedCharacterSheet({
    characterName: 'Malakor',
    raceSlug: 'tiefling',
    subraceSlug: null,
    backgroundSlug: 'sapiente',
    classLabel: 'Warlock',
    classSubclass: 'Il Signore Fatato',
    level: 5,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  const warEv = await loadWarlockEvidence(warSheet, undefined, {
    pactBoon: 'Patto del Tomo',
    invocations: ['Deflagrazione Agonizzante', 'Libro degli Antichi Segreti', 'Armatura delle Ombre'],
  });
  const warFull = addWarlockGrantedSpells(warSheet, warEv);
  const warPdfBytes = await renderCharacterSheetV2(warFull, LOGO_BYTES, {
    warlockEvidence: warEv,
    warlockChoices: {
      pactBoon: 'Patto del Tomo',
      invocations: ['Deflagrazione Agonizzante', 'Libro degli Antichi Segreti', 'Armatura delle Ombre'],
    },
  });
  const warPages = await extractPdfPagesText(warPdfBytes);
  const warAllText = warPages.map((p) => p.fullText).join('\n');

  assert.ok(!warAllText.includes('CAPITOLO 3'), 'Rendered Warlock PDF must not contain CAPITOLO 3');
  assert.ok(!warAllText.includes('116 CAPITOLO'), 'Rendered Warlock PDF must not contain 116 CAPITOLO');
  assert.ok(warAllText.includes('spigolo di 3 metri'), 'Useful gameplay range must be present');
});

test('10. Racial ability score increase exclusion: no increment traits or empty filler boxes', async () => {
  // 1. Tiefling Warlock: has Scurovisione, Resistenza Infernale, Eredità Infernale, but NOT Incremento
  const { sheet: warSheet } = await buildGeneratedCharacterSheet({
    characterName: 'Malakor',
    raceSlug: 'tiefling',
    subraceSlug: null,
    backgroundSlug: 'sapiente',
    classLabel: 'Warlock',
    classSubclass: 'Il Signore Fatato',
    level: 5,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  const warEv = await loadWarlockEvidence(warSheet, undefined, {
    pactBoon: 'Patto del Tomo',
    invocations: ['Deflagrazione Agonizzante', 'Libro degli Antichi Segreti', 'Armatura delle Ombre'],
  });
  const warFull = addWarlockGrantedSpells(warSheet, warEv);
  const warPdfText = (
    await extractPdfPagesText(
      await renderCharacterSheetV2(warFull, LOGO_BYTES, {
        warlockEvidence: warEv,
        warlockChoices: {
          pactBoon: 'Patto del Tomo',
          invocations: ['Deflagrazione Agonizzante', 'Libro degli Antichi Segreti', 'Armatura delle Ombre'],
        },
      })
    )
  )
    .map((p) => p.fullText)
    .join('\n');

  assert.ok(
    !warPdfText.toLowerCase().includes('incremento dei punteggi'),
    'Tiefling must NOT print Incremento dei Punteggi di Caratteristica'
  );
  assert.ok(warPdfText.includes('Scurovisione'), 'Tiefling Scurovisione must be preserved');
  assert.ok(warPdfText.includes('Resistenza Infernale'), 'Tiefling Resistenza Infernale must be preserved');
  assert.ok(warPdfText.includes('Eredità Infernale'), 'Tiefling Eredità Infernale must be preserved');

  // 2. Human Monk: ability score increases are the only racial trait; should produce ZERO racial box & ZERO filler text
  const { sheet: mnkSheet } = await buildGeneratedCharacterSheet({
    characterName: 'Chen',
    raceSlug: 'umano',
    subraceSlug: null,
    backgroundSlug: 'eremita',
    classLabel: 'Monaco',
    classSubclass: 'Via della Mano Aperta',
    level: 5,
    alignment: null,
    age: null,
    height: null,
    weight: null,
    sex: null,
  });
  const mnkEv = await loadMonkEvidence(mnkSheet);
  const mnkFull = addMonkGrantedSpells(mnkSheet, mnkEv);
  const mnkPdfText = (
    await extractPdfPagesText(
      await renderCharacterSheetV2(mnkFull, LOGO_BYTES, {
        monkEvidence: mnkEv,
      })
    )
  )
    .map((p) => p.fullText)
    .join('\n');

  assert.ok(
    !mnkPdfText.toLowerCase().includes('incremento dei punteggi'),
    'Human Monk must NOT print Incremento dei Punteggi di Caratteristica'
  );
  assert.ok(
    !mnkPdfText.includes('TRATTI RAZZIALI (UMANO)'),
    'Human Monk has no operational traits: must NOT create an empty/filler TRATTI RAZZIALI box'
  );
  assert.ok(
    !mnkPdfText.includes('già integrati nelle statistiche'),
    'Human Monk must NOT print filler placeholder text'
  );
});
