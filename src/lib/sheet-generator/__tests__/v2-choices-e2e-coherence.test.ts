import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { PDFDocument } from 'pdf-lib';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadFighterEvidence, addFighterGrantedSpells } from '@/lib/server/fighter-source';
import { loadPaladinEvidence, addPaladinGrantedSpells } from '@/lib/server/paladin-source';
import { loadRangerEvidence, addRangerGrantedSpells } from '@/lib/server/ranger-source';
import { loadWarlockEvidence, addWarlockGrantedSpells } from '@/lib/server/warlock-source';
import { loadSorcererEvidence, addSorcererGrantedSpells } from '@/lib/server/sorcerer-source';
import { loadMonkEvidence, addMonkGrantedSpells } from '@/lib/server/monk-source';
import { loadWizardEvidence, addWizardGrantedSpells } from '@/lib/server/wizard-source';
import { loadBardCollegeFeatures, addBardCollegeGrantedSpells } from '@/lib/server/bard-college-source';
import { buildBardPrintModel } from '../bard-print-model';
import { buildFighterPrintModel } from '../fighter-print-model';
import { buildPaladinPrintModel } from '../paladin-print-model';
import { buildRangerPrintModel } from '../ranger-print-model';
import { buildWarlockPrintModel } from '../warlock-print-model';
import { buildSorcererPrintModel } from '../sorcerer-print-model';
import { buildMonkPrintModel } from '../monk-print-model';
import {
  reconcileV2ExportPayload,
  ReconcileChoicesError,
} from '../reconcile-v2-choices';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';
import type { CharacterBuildOverrides } from '../build-choices-types';
import type { PhbFightingStyle } from '../class-choice-catalog';

const LOGO_BYTES = fs.readFileSync('public/logo.png');

async function extractPdfText(bytes: Uint8Array): Promise<string[]> {
  const doc = await PDFDocument.load(bytes);
  // Simple byte scan for text chunks or page structure
  assert.ok(doc.getPageCount() >= 2);
  return [];
}

// Helper simulating the exact server endpoint logic in /api/sheet-pdf-v2/route.ts
async function simulateSheetPdfV2Api(payload: {
  input: Record<string, string>;
  fighterChoices?: any;
  paladinChoices?: any;
  rangerChoices?: any;
  warlockChoices?: any;
  sorcererChoices?: any;
  monkChoices?: any;
  fightingStyle?: string;
  bonusSkills?: string[];
}): Promise<{ sheet: any; bytes: Uint8Array }> {
  const reconciled = reconcileV2ExportPayload(payload as any);
  const effectiveOverrides = reconciled.effectiveOverrides;
  const classLabel = payload.input.classLabel;
  const level = Number.parseInt(payload.input.level ?? '1', 10) || 1;

  const { sheet: baseSheet } = await buildGeneratedCharacterSheet(
    {
      characterName: payload.input.characterName ?? 'E2E Hero',
      raceSlug: payload.input.raceSlug ?? 'umano',
      subraceSlug: null,
      classLabel: payload.input.classLabel,
      classSubclass: payload.input.classSubclass ?? null,
      backgroundSlug: payload.input.backgroundSlug ?? 'soldato',
      level,
      alignment: payload.input.alignment ?? null,
      age: payload.input.age ?? null,
      height: payload.input.height ?? null,
      weight: payload.input.weight ?? null,
      sex: payload.input.sex ?? null,
      buildOverrides: effectiveOverrides as CharacterBuildOverrides,
    },
    undefined
  );

  let evidence: any;
  let collegeFeatures: any;
  let fullSheet = baseSheet;

  if (classLabel === 'Guerriero') {
    evidence = await loadFighterEvidence(baseSheet, undefined, reconciled.fighterChoices ?? payload.fighterChoices);
    fullSheet = await addFighterGrantedSpells(baseSheet, evidence, reconciled.fighterChoices ?? payload.fighterChoices, false);
  } else if (classLabel === 'Paladino') {
    evidence = await loadPaladinEvidence(baseSheet, undefined, reconciled.paladinChoices ?? payload.paladinChoices);
    fullSheet = addPaladinGrantedSpells(baseSheet, evidence);
  } else if (classLabel === 'Ranger') {
    evidence = await loadRangerEvidence(baseSheet, undefined, reconciled.rangerChoices ?? payload.rangerChoices);
    fullSheet = addRangerGrantedSpells(baseSheet, evidence);
  } else if (classLabel === 'Warlock') {
    evidence = await loadWarlockEvidence(baseSheet, undefined, reconciled.warlockChoices ?? payload.warlockChoices);
    fullSheet = addWarlockGrantedSpells(baseSheet, evidence);
  } else if (classLabel === 'Stregone') {
    evidence = await loadSorcererEvidence(baseSheet, undefined, reconciled.sorcererChoices ?? payload.sorcererChoices);
    fullSheet = addSorcererGrantedSpells(baseSheet, evidence);
  } else if (classLabel === 'Monaco') {
    evidence = await loadMonkEvidence(baseSheet, undefined, reconciled.monkChoices ?? payload.monkChoices);
    fullSheet = addMonkGrantedSpells(baseSheet, evidence);
  } else if (classLabel === 'Mago') {
    evidence = await loadWizardEvidence(baseSheet, undefined, (reconciled as any).wizardChoices ?? (payload as any).wizardChoices);
    fullSheet = addWizardGrantedSpells(baseSheet, evidence);
  } else if (classLabel === 'Bardo') {
    collegeFeatures = await loadBardCollegeFeatures(baseSheet);
    fullSheet = await addBardCollegeGrantedSpells(baseSheet);
  }

  const printModel =
    classLabel === 'Guerriero' && evidence
      ? buildFighterPrintModel(fullSheet, evidence, reconciled.fighterChoices ?? payload.fighterChoices)
      : classLabel === 'Paladino' && evidence
      ? buildPaladinPrintModel(fullSheet, evidence, reconciled.paladinChoices ?? payload.paladinChoices)
      : classLabel === 'Ranger' && evidence
      ? buildRangerPrintModel(fullSheet, evidence, reconciled.rangerChoices ?? payload.rangerChoices)
      : classLabel === 'Warlock' && evidence
      ? buildWarlockPrintModel(fullSheet, evidence, reconciled.warlockChoices ?? payload.warlockChoices)
      : classLabel === 'Stregone' && evidence
      ? buildSorcererPrintModel(fullSheet, evidence, reconciled.sorcererChoices ?? payload.sorcererChoices)
      : classLabel === 'Monaco' && evidence
      ? buildMonkPrintModel(fullSheet, evidence, reconciled.monkChoices ?? payload.monkChoices)
      : classLabel === 'Bardo'
      ? buildBardPrintModel(fullSheet, reconciled.bonusSkills, collegeFeatures, reconciled.fightingStyle as any)
      : null;

  const finalSheet = printModel ? printModel.sheet : fullSheet;

  const bytes = await renderCharacterSheetV2(fullSheet, LOGO_BYTES, {
    fighterEvidence: classLabel === 'Guerriero' ? evidence : undefined,
    fighterChoices: reconciled.fighterChoices ?? payload.fighterChoices,
    paladinEvidence: classLabel === 'Paladino' ? evidence : undefined,
    paladinChoices: reconciled.paladinChoices ?? payload.paladinChoices,
    rangerEvidence: classLabel === 'Ranger' ? evidence : undefined,
    rangerChoices: reconciled.rangerChoices ?? payload.rangerChoices,
    warlockEvidence: classLabel === 'Warlock' ? evidence : undefined,
    warlockChoices: reconciled.warlockChoices ?? payload.warlockChoices,
    sorcererEvidence: classLabel === 'Stregone' ? evidence : undefined,
    sorcererChoices: reconciled.sorcererChoices ?? payload.sorcererChoices,
    monkEvidence: classLabel === 'Monaco' ? evidence : undefined,
    monkChoices: reconciled.monkChoices ?? payload.monkChoices,
    wizardEvidence: classLabel === 'Mago' ? evidence : undefined,
    wizardChoices: (reconciled as any).wizardChoices ?? (payload as any).wizardChoices,
    bonusSkills: reconciled.bonusSkills,
    collegeFeatures,
    fightingStyle: reconciled.fightingStyle as any,
  });

  return { sheet: finalSheet, bytes };
}

test('E2E Champion L12 (Caso cioccolo-v2): calcoli armi, stili separati e nessuna spiegazione generica', async () => {
  // Cioccolo: Tiefling Guerriero Campione 12, FOR 20 (+5), DES 14 (+2), BC +4
  const payload = {
    input: {
      characterName: 'cioccolo',
      classLabel: 'Guerriero',
      classSubclass: 'Campione',
      raceSlug: 'tiefling',
      backgroundSlug: 'eremita',
      level: '12',
      buildOverridesJson: JSON.stringify({
        abilities: { str: 20, dex: 14, con: 16, int: 12, wis: 12, cha: 10 },
        fightingStyle: 'Duellare',
        secondFightingStyle: 'Combattere con Armi Possenti',
      }),
    },
    fighterChoices: {
      fightingStyle: 'Duellare' as PhbFightingStyle,
      secondFightingStyle: 'Combattere con Armi Possenti' as PhbFightingStyle,
    },
  };

  const { sheet, bytes } = await simulateSheetPdfV2Api(payload);
  assert.equal(sheet.level, 12);
  assert.equal(sheet.proficiencyBonus, 4);
  assert.equal(sheet.abilityMods.str, 5);
  assert.equal(sheet.abilityMods.dex, 2);

  // Weapon coherence:
  // Spada lunga: Melee, 4 (BC) + 5 (FOR) = +9 toHit; damage 1d8+FOR (+2 a 1 mano)
  const sword = sheet.weaponRows.find((w: any) => w.name === 'Spada lunga');
  assert.ok(sword, 'Spada lunga must be in weaponRows');
  assert.equal(sword.toHit, '+9', 'Spada lunga toHit must be +9 (BC +4, FOR +5)');
  assert.ok(sword.damage.includes('(+2 a 1 mano)'), 'Spada lunga damage must indicate (+2 a 1 mano)');

  // Arco lungo: RANGED, 4 (BC) + 2 (DES) = +6 toHit; damage 1d8+DES (NO Duellare, NO STR!)
  const bow = sheet.weaponRows.find((w: any) => w.name === 'Arco lungo');
  assert.ok(bow, 'Arco lungo must be in weaponRows');
  assert.equal(bow.toHit, '+6', 'Arco lungo toHit must be +6 (BC +4, DES +2), NOT +9 from STR!');
  assert.equal(bow.damage, '1d8+DES', 'Arco lungo damage must be 1d8+DES');
  assert.ok(!bow.damage.includes('Duellare'), 'Arco lungo must NOT have Duellare bonus');

  // Load evidence directly to inspect Page 1 and Page 2 feature text
  const ev = await loadFighterEvidence(sheet, undefined, payload.fighterChoices);
  const styleFeat = ev.classFeatures.find((f) => f.title === 'STILE DI COMBATTIMENTO');
  assert.ok(styleFeat, 'STILE DI COMBATTIMENTO must be in classFeatures');
  assert.ok(styleFeat.body.includes('**Duellare:**'), 'Duellare must be an entry with name in bold');
  assert.ok(styleFeat.body.includes('**Combattere con Armi Possenti:**'), 'Combattere con Armi Possenti must be an entry with name in bold');
  assert.ok(!styleFeat.body.includes('Secondo stile ('), 'Must NOT have "Secondo stile (" prefix in text');

  // Page 2: Stile di Combattimento Aggiuntivo must NOT contain the generic manual explanation
  const secStyleFeat = ev.archetypeFeatures.find((f) => f.title === 'STILE DI COMBATTIMENTO AGGIUNTIVO');
  assert.ok(secStyleFeat, 'STILE DI COMBATTIMENTO AGGIUNTIVO must exist in archetypeFeatures');
  assert.ok(secStyleFeat.body.includes('Stile scelto: **Combattere con Armi Possenti**'), 'Must name the chosen style');
  assert.ok(
    !secStyleFeat.body.includes('Al 10° livello, il guerriero può scegliere una seconda opzione'),
    'Must NOT contain generic manual explanation when choice is made'
  );

  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 3, 'cioccolo-v2 must be exactly 3 pages');
});

test('Champion: prima del livello 10 rifiuta il secondo stile; dopo il livello 10 consente due stili unici', async () => {
  // L5 Champion attempting to pass secondFightingStyle must throw
  await assert.rejects(
    async () => {
      await simulateSheetPdfV2Api({
        input: {
          classLabel: 'Guerriero',
          classSubclass: 'Campione',
          level: '5',
        },
        fighterChoices: {
          fightingStyle: 'Duellare',
          secondFightingStyle: 'Difesa',
        },
      });
    },
    /Lo stile di combattimento aggiuntivo è riservato al Guerriero Campione dal livello 10/
  );

  // Non-Champion L10 (Battle Master) attempting secondFightingStyle must throw
  await assert.rejects(
    async () => {
      await simulateSheetPdfV2Api({
        input: {
          classLabel: 'Guerriero',
          classSubclass: 'Maestro di Battaglia',
          level: '10',
        },
        fighterChoices: {
          fightingStyle: 'Duellare',
          secondFightingStyle: 'Difesa',
        },
      });
    },
    /Lo stile di combattimento aggiuntivo è riservato al Guerriero Campione dal livello 10/
  );

  // L10 Champion with duplicate styles must throw
  await assert.rejects(
    async () => {
      await simulateSheetPdfV2Api({
        input: {
          classLabel: 'Guerriero',
          classSubclass: 'Campione',
          level: '10',
        },
        fighterChoices: {
          fightingStyle: 'Difesa',
          secondFightingStyle: 'Difesa',
        },
      });
    },
    /Il secondo stile di combattimento deve essere diverso dal primo/
  );
});

test('Champion L10: combinazione Tiro + Difesa applica correttamente +2 al tiro per colpire con arco e +1 alla CA', async () => {
  const { sheet } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Guerriero',
      classSubclass: 'Campione',
      level: '10',
      buildOverridesJson: JSON.stringify({
        abilities: { str: 16, dex: 16, con: 14, int: 10, wis: 10, cha: 10 },
        fightingStyle: 'Tiro',
        secondFightingStyle: 'Difesa',
      }),
    },
    fighterChoices: {
      fightingStyle: 'Tiro',
      secondFightingStyle: 'Difesa',
    },
  });

  // BC is +4 at L10; DES is +3; Archery (+2) applies to ranged weapons
  const bow = sheet.weaponRows.find((w: any) => w.name === 'Arco lungo');
  assert.ok(bow);
  assert.equal(bow.toHit, '+9', 'Arco lungo with Tiro must be BC (+4) + DES (+3) + Tiro (+2) = +9');

  // Armor Class: Cotta di maglia (16) + Scudo (2) + Difesa (1) = 19
  assert.equal(sheet.armorClass, 19, 'AC must be 19 with Difesa and armor equipped');
});

test('Cambio esplicito di scelta in DownloadSheetV2 aggiorna sia calcoli che stampa PDF', async () => {
  // Simulate user confirmed Difesa in form preview, but switched to Duellare before downloading
  const { sheet } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Guerriero',
      classSubclass: 'Campione',
      level: '5',
      buildOverridesJson: JSON.stringify({
        fightingStyle: 'Difesa', // Form preview was Difesa
      }),
    },
    fighterChoices: {
      fightingStyle: 'Duellare', // Explicitly switched to Duellare in export UI!
    },
  });

  // AC must be 18 (without Difesa), NOT 19!
  assert.equal(sheet.armorClass, 18, 'AC must NOT have Difesa after explicit switch to Duellare');

  // Spada lunga must have Duellare
  const sword = sheet.weaponRows.find((w: any) => w.name === 'Spada lunga');
  assert.ok(sword.damage.includes('(+2 a 1 mano)'), 'Sword must receive Duellare bonus after explicit switch');
});

test('Altre classi: Paladino e Ranger non raddoppiano mai il bonus di Difesa', async () => {
  // Paladin L5 with Difesa: 18 base (Cotta 16 + Scudo 2) + 1 Difesa = 19, NEVER 20!
  const { sheet: palSheet } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Paladino',
      classSubclass: 'Giuramento di Devozione',
      level: '5',
    },
    paladinChoices: {
      fightingStyle: 'Difesa',
    },
  });
  assert.equal(palSheet.armorClass, 19, 'Paladin AC with Difesa must be 19, never duplicated to 20');

  // Ranger L5 with Tiro (default/no defense): Scaglie 14 + DES 2 = 16
  const { sheet: ranTiroSheet } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Ranger',
      classSubclass: 'Cacciatore',
      level: '5',
    },
    rangerChoices: {
      fightingStyle: 'Tiro',
    },
  });
  assert.equal(ranTiroSheet.armorClass, 16, 'Ranger AC with Tiro must be 16 (Scaglie 14 + DES 2)');

  // Ranger L5 with Difesa: 16 base + 1 Difesa = 17, NEVER duplicated to 18!
  const { sheet: ranDefSheet } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Ranger',
      classSubclass: 'Cacciatore',
      level: '5',
    },
    rangerChoices: {
      fightingStyle: 'Difesa',
    },
  });
  assert.equal(ranDefSheet.armorClass, 17, 'Ranger AC with Difesa must be 17, never duplicated to 18');
});

test('Altre classi: Warlock propaga suppliche e patto confermati senza revert ai default', async () => {
  const chosenInvocations = ['Armatura delle Ombre', 'Vista del Diavolo'];
  const { sheet } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Warlock',
      classSubclass: 'Il Signore Fatato',
      level: '3',
      buildOverridesJson: JSON.stringify({
        warlockPact: 'Patto della Lama',
        warlockInvocations: chosenInvocations,
      }),
    },
    warlockChoices: {
      pactBoon: 'Patto della Lama',
      // Invocations not explicitly repeated in warlockChoices: must be retrieved from overrides!
    },
  });

  const ev = await loadWarlockEvidence(sheet, undefined, { pactBoon: 'Patto della Lama', invocations: chosenInvocations });
  assert.equal(ev.resources.pactBoon?.name, 'Patto della Lama');
  assert.deepEqual(ev.resources.invocations.map((i: any) => i.name), chosenInvocations);
});

test('Altre classi: Monaco Kensei mostra le armi Kensei scelte nella lista attacchi', async () => {
  const { sheet } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Monaco',
      classSubclass: 'Via del Kensei',
      level: '5',
      buildOverridesJson: JSON.stringify({
        abilities: { str: 10, dex: 18, con: 14, int: 10, wis: 16, cha: 10 },
      }),
    },
    monkChoices: {
      kenseiMeleeWeapon: 'Spada lunga',
      kenseiRangedWeapon: 'Arco lungo',
    },
  });

  // Sheet weaponRows must contain Spada lunga and Arco lungo
  const sword = sheet.weaponRows.find((w: any) => w.name === 'Spada lunga');
  assert.ok(sword, 'Kensei melee weapon Spada lunga must appear in weaponRows');
  assert.equal(sword.toHit, '+7', 'Kensei Spada lunga uses DES (+4) + BC (+3) = +7');

  const bow = sheet.weaponRows.find((w: any) => w.name === 'Arco lungo');
  assert.ok(bow, 'Kensei ranged weapon Arco lungo must appear in weaponRows');
  assert.equal(bow.toHit, '+7', 'Kensei Arco lungo uses DES (+4) + BC (+3) = +7');
});

test('Bardo Collegio della Sapienza: competenze ordinarie e 3 bonus distinte e non sovrapposte', async () => {
  // Sapiente conferisce arcana e history.
  // Normali competenze di classe: acrobatics, insight, persuasion.
  const baseClassSkills = ['acrobatics', 'insight', 'persuasion'] as const;
  const defaultBonus = ['athletics', 'nature', 'religion'] as const;

  // 1. Download senza modifiche: usa i default bonus distinti
  const { sheet: defaultSheet, bytes: defaultBytes } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Bardo',
      classSubclass: 'Collegio della Sapienza',
      backgroundSlug: 'sapiente',
      level: '5',
      buildOverridesJson: JSON.stringify({
        classSkills: [...baseClassSkills],
      }),
    },
    bonusSkills: [...defaultBonus],
  });

  // Competenze ordinarie intatte
  for (const sk of baseClassSkills) {
    assert.equal(defaultSheet.skills[sk].proficient, true, `Competenza ordinaria ${sk} deve restare attiva`);
  }
  // Competenze bonus della Sapienza applicate
  for (const sk of defaultBonus) {
    assert.equal(defaultSheet.skills[sk].proficient, true, `Competenza bonus ${sk} deve essere attiva`);
  }
  const defaultDoc = await PDFDocument.load(defaultBytes);
  assert.ok(defaultDoc.getPageCount() >= 2);

  // 2. Cambio esplicito delle tre competenze bonus (tre competenze non possedute)
  const modifiedBonus = ['deception', 'performance', 'stealth'] as const;
  const { sheet: modSheet, bytes: modBytes } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Bardo',
      classSubclass: 'Collegio della Sapienza',
      backgroundSlug: 'sapiente',
      level: '5',
      buildOverridesJson: JSON.stringify({
        classSkills: [...baseClassSkills],
      }),
    },
    bonusSkills: [...modifiedBonus],
  });

  // Competenze ordinarie sempre intatte
  for (const sk of baseClassSkills) {
    assert.equal(modSheet.skills[sk].proficient, true, `Competenza ordinaria ${sk} deve rimanere intatta dopo cambio bonus`);
  }
  // Nuove competenze bonus attive
  for (const sk of modifiedBonus) {
    assert.equal(modSheet.skills[sk].proficient, true, `Nuova competenza bonus ${sk} deve essere attiva`);
  }
  // Le vecchie non devono essere state aggiunte
  for (const sk of defaultBonus) {
    assert.equal(modSheet.skills[sk].proficient, false, `Vecchia competenza bonus ${sk} non deve essere attiva`);
  }
  const modDoc = await PDFDocument.load(modBytes);
  assert.ok(modDoc.getPageCount() >= 2);
});

test('Difesa Paladino e Ranger: stili multipli, cambi espliciti, equipaggiamento e assenza armatura', async () => {
  // Paladino con Cotta di maglia (16) + Scudo (2):
  // 1. Difesa: CA 19 (mai 20)
  const { sheet: palDef } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Paladino',
      classSubclass: 'Giuramento di Devozione',
      level: '5',
      buildOverridesJson: JSON.stringify({ fightingStyle: 'Difesa' }),
    },
    paladinChoices: { fightingStyle: 'Difesa' },
  });
  assert.equal(palDef.armorClass, 19, 'Paladino con Difesa deve avere CA 19');
  assert.equal(palDef.defenseStyleApplied, true);

  // 2. Passaggio esplicito da Difesa a Duellare nel payload di esportazione: CA deve scendere a 18
  const { sheet: palDuel } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Paladino',
      classSubclass: 'Giuramento di Devozione',
      level: '5',
      buildOverridesJson: JSON.stringify({ fightingStyle: 'Difesa' }), // engine aveva Difesa
    },
    paladinChoices: { fightingStyle: 'Duellare' }, // cambio esplicito client a Duellare
  });
  assert.equal(palDuel.armorClass, 18, 'Paladino passato a Duellare deve avere CA 18 (Difesa stornata)');
  assert.equal(palDuel.defenseStyleApplied, false);

  // 3. Paladino senza armatura fisica: Difesa NON deve essere concessa
  const { sheet: unarmoredPal } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Paladino',
      classSubclass: 'Giuramento di Devozione',
      level: '5',
      buildOverridesJson: JSON.stringify({ fightingStyle: 'Difesa' }),
    },
    paladinChoices: { fightingStyle: 'Difesa' },
  });
  // Simuliamo rimozione armatura
  unarmoredPal.armorItem = null;
  unarmoredPal.inventory = ['scudo', 'borsa'];
  unarmoredPal.armorClass = 12; // 10 + DES 0 + scudo 2
  unarmoredPal.defenseStyleApplied = false;
  const pmUnarmored = buildPaladinPrintModel(unarmoredPal, await loadPaladinEvidence(unarmoredPal), { fightingStyle: 'Difesa' });
  assert.equal(pmUnarmored.sheet.armorClass, 12, 'Senza armatura fisica, Difesa NON può aggiungere +1');
  assert.equal(pmUnarmored.sheet.defenseStyleApplied, false);

  // Ranger:
  // 1. Difesa: CA 17 (Scaglie 14 + DES 2 + Difesa 1)
  const { sheet: ranDef } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Ranger',
      classSubclass: 'Cacciatore',
      level: '5',
      buildOverridesJson: JSON.stringify({ fightingStyle: 'Difesa' }),
    },
    rangerChoices: { fightingStyle: 'Difesa' },
  });
  assert.equal(ranDef.armorClass, 17, 'Ranger con Difesa deve avere CA 17');
  assert.equal(ranDef.defenseStyleApplied, true);

  // 2. Passaggio esplicito da Difesa a Tiro: CA deve scendere a 16
  const { sheet: ranTiro } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Ranger',
      classSubclass: 'Cacciatore',
      level: '5',
      buildOverridesJson: JSON.stringify({ fightingStyle: 'Difesa' }), // engine aveva Difesa
    },
    rangerChoices: { fightingStyle: 'Tiro' }, // cambio esplicito a Tiro
  });
  assert.equal(ranTiro.armorClass, 16, 'Ranger passato a Tiro deve avere CA 16 (Difesa stornata)');
  assert.equal(ranTiro.defenseStyleApplied, false);

  // 3. Ranger senza armatura fisica: Difesa NON deve essere concessa
  const { sheet: unarmoredRan } = await simulateSheetPdfV2Api({
    input: {
      classLabel: 'Ranger',
      classSubclass: 'Cacciatore',
      level: '5',
      buildOverridesJson: JSON.stringify({ fightingStyle: 'Difesa' }),
    },
    rangerChoices: { fightingStyle: 'Difesa' },
  });
  unarmoredRan.armorItem = null;
  unarmoredRan.inventory = ['arco lungo', 'frecce'];
  unarmoredRan.armorClass = 12; // 10 + DES 2
  unarmoredRan.defenseStyleApplied = false;
  const pmUnarmoredRan = buildRangerPrintModel(unarmoredRan, await loadRangerEvidence(unarmoredRan), { fightingStyle: 'Difesa' });
  assert.equal(pmUnarmoredRan.sheet.armorClass, 12, 'Senza armatura fisica, Difesa per Ranger NON può aggiungere +1');
  assert.equal(pmUnarmoredRan.sheet.defenseStyleApplied, false);
});

test('Adaptive Page 1 V2: header dati fisici su 3 righe, zero duplicazioni stili, assenza CD magia da P1', async () => {
  const tmpDir = '/tmp';

  // 1. Dati fisici nell'header su tre righe distinte + sesso distinto
  const { bytes: heroBytes } = await simulateSheetPdfV2Api({
    input: {
      characterName: 'Thorin',
      classLabel: 'Guerriero',
      level: '2',
      age: '55',
      height: '1.40 m',
      weight: '75 kg',
      sex: 'Maschio',
      alignment: 'Legale Buono',
    },
    fighterChoices: { fightingStyle: 'Difesa' },
  });
  const heroPdfPath = `${tmpDir}/test-hero-p1.pdf`;
  fs.writeFileSync(heroPdfPath, heroBytes);
  const heroP1Text = execFileSync('pdftotext', ['-layout', '-f', '1', '-l', '1', heroPdfPath, '-'], { encoding: 'utf8' });

  assert.match(heroP1Text, /Età:\s*55/, 'Età deve avere etichetta esplicita su riga propria');
  assert.match(heroP1Text, /Altezza:\s*1\.40\s*m/, 'Altezza deve avere etichetta esplicita su riga propria');
  assert.match(heroP1Text, /Peso:\s*75\s*kg/, 'Peso deve avere etichetta esplicita su riga propria');
  assert.match(heroP1Text, /Maschio/, 'Sesso deve comparire nel proprio riquadro');
  assert.doesNotMatch(heroP1Text, /55\s*[•*]\s*1\.40/, 'Non devono esserci concatenazioni con asterischi o pallini nei dati fisici');

  // 2. Cioccolo (Campione 12): entrambi gli stili presenti, ciascuno descritto esattamente 1 volta
  const { bytes: cioccoloBytes } = await simulateSheetPdfV2Api({
    input: {
      characterName: 'cioccolo',
      classLabel: 'Guerriero',
      classSubclass: 'Campione',
      raceSlug: 'tiefling',
      backgroundSlug: 'eremita',
      level: '12',
      buildOverridesJson: JSON.stringify({
        fightingStyle: 'Duellare',
        abilities: { str: 20, dex: 14, con: 18, int: 11, wis: 12, cha: 12 },
        fighter: {
          fightingStyle: 'Duellare',
          secondFightingStyle: 'Combattere con Armi Possenti',
        },
      }),
    },
    fighterChoices: {
      fightingStyle: 'Duellare',
      secondFightingStyle: 'Combattere con Armi Possenti',
    },
  });
  const cioccoloPdfPath = `${tmpDir}/test-cioccolo-p1.pdf`;
  fs.writeFileSync(cioccoloPdfPath, cioccoloBytes);
  const cioccoloP1Text = execFileSync('pdftotext', ['-f', '1', '-l', '1', cioccoloPdfPath, '-'], { encoding: 'utf8' });
  const cioccoloFullText = execFileSync('pdftotext', [cioccoloPdfPath, '-'], { encoding: 'utf8' });

  // Conta le occorrenze di Duellare: e Combattere con Armi Possenti: in Pagina 1
  const duellareMatches = (cioccoloP1Text.match(/Duellare:/g) || []).length;
  const gwfMatches = (cioccoloP1Text.match(/Combattere con Armi Possenti:/g) || []).length;
  assert.equal(duellareMatches, 1, 'Duellare deve essere descritto esattamente 1 volta in P1');
  assert.equal(gwfMatches, 1, 'Combattere con Armi Possenti deve essere descritto esattamente 1 volta in P1');

  // Assicura che nel testo completo del PDF il secondo stile non sia duplicato anche altrove
  const gwfFullCount = (cioccoloFullText.match(/Stile scelto:\s*Combattere con Armi Possenti/g) || []).length;
  assert.equal(gwfFullCount, 1, 'Il secondo stile non deve essere duplicato nelle pagine successive');

  // 3. Verifica assenza di CD magia / tiro per colpire incantesimi da Pagina 1 per incantatori
  const { bytes: wizardBytes } = await simulateSheetPdfV2Api({
    input: {
      characterName: 'Elminster',
      classLabel: 'Mago',
      classSubclass: 'Scuola di Invocazione',
      level: '15',
    },
  });
  const wizardPdfPath = `${tmpDir}/test-wizard-p1.pdf`;
  fs.writeFileSync(wizardPdfPath, wizardBytes);
  const wizardP1Text = execFileSync('pdftotext', ['-f', '1', '-l', '1', wizardPdfPath, '-'], { encoding: 'utf8' });
  const wizardP3Text = execFileSync('pdftotext', ['-f', '3', '-l', '3', wizardPdfPath, '-'], { encoding: 'utf8' });

  assert.doesNotMatch(wizardP1Text, /CD TIRO SALVEZZA/i, 'P1 non deve contenere CD Salvezza per Mago');
  assert.doesNotMatch(wizardP1Text, /Bonus Attacco Incantesimi/i, 'P1 non deve contenere Bonus Attacco Incantesimi per Mago');
  assert.match(wizardP3Text, /CD TIRO SALVEZZA/i, 'Pagina incantesimi deve conservare la CD Tiro Salvezza');
  assert.match(wizardP3Text, /Bonus Attacco Incantesimi/i, 'Pagina incantesimi deve conservare il Bonus Attacco Incantesimi');

  // 4. Monaco conserva la CD Ki su Pagina 1
  const { bytes: monkBytes } = await simulateSheetPdfV2Api({
    input: {
      characterName: 'Kwai Chang',
      classLabel: 'Monaco',
      classSubclass: 'Via della Mano Aperta',
      level: '5',
      buildOverridesJson: JSON.stringify({
        monk: {
          artisanTool: 'Strumenti da calligrafo',
        },
      }),
    },
    monkChoices: {
      artisanTool: 'Strumenti da calligrafo',
    },
  });
  const monkPdfPath = `${tmpDir}/test-monk-p1.pdf`;
  fs.writeFileSync(monkPdfPath, monkBytes);
  const monkP1Text = execFileSync('pdftotext', ['-f', '1', '-l', '1', monkPdfPath, '-'], { encoding: 'utf8' });
  assert.match(monkP1Text, /CD Ki:\s*\d+/, 'Monaco deve conservare la CD Ki nel riquadro risorse di Pagina 1');
});
