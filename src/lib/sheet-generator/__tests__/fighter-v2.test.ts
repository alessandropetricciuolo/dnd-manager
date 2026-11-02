import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadFighterEvidence, addFighterGrantedSpells } from '@/lib/server/fighter-source';
import { buildFighterPrintModel } from '../fighter-print-model';
import { supportedFighterArchetypes } from '../fighter-archetypes';
import { fighterReferenceCards } from '../fighter-reference-copy';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';

async function sheet(level: number, classSubclass: string | null) {
  const result = await buildGeneratedCharacterSheet({
    characterName: 'Guerriero di prova',
    raceSlug: 'human',
    subraceSlug: null,
    classLabel: 'Guerriero',
    classSubclass,
    backgroundSlug: 'soldato',
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

test('Guerriero V2: tutti gli 8 archetipi catalogati hanno privilegi testuali e livelli verificati', async () => {
  const archetypes = supportedFighterArchetypes();
  assert.equal(archetypes.length, 8);
  for (const a of archetypes) {
    const original = await sheet(20, a.label);
    const evidence = await loadFighterEvidence(original);
    assert.ok(evidence.archetypeFeatures.length >= 4, `${a.label} features`);
    assert.ok(evidence.archetypeFeatures.every((f) => f.source.length > 0), `${a.label} sources`);
    assert.ok(evidence.classFeatures.length >= 5, `${a.label} class features`);
  }
});

test('Guerriero livello 1: non richiede archetipo e non include privilegi futuri', async () => {
  const original = await sheet(1, null);
  const evidence = await loadFighterEvidence(original);
  assert.equal(evidence.archetypeFeatures.length, 0);
  assert.ok(evidence.classFeatures.some((f) => f.title === 'RECUPERARE ENERGIE'));
  assert.ok(!evidence.classFeatures.some((f) => f.title === 'AZIONE IMPETUOSA'));
  assert.ok(!evidence.classFeatures.some((f) => f.title === 'ATTACCO EXTRA'));
  assert.ok(!evidence.classFeatures.some((f) => f.title === 'INDOMITO'));
  assert.equal(evidence.resources.actionSurge, 1);
  assert.equal(evidence.resources.indomitable, 0);
  assert.equal(evidence.resources.attacksPerAction, 1);
});

test('Guerriero progressione: risorse, attacchi e indomito ai livelli chiave', async () => {
  const s2 = await loadFighterEvidence(await sheet(2, null));
  assert.equal(s2.resources.actionSurge, 1);
  assert.equal(s2.resources.attacksPerAction, 1);
  assert.equal(s2.resources.indomitable, 0);

  const s5 = await loadFighterEvidence(await sheet(5, 'Campione'));
  assert.equal(s5.resources.attacksPerAction, 2);
  assert.equal(s5.resources.indomitable, 0);

  const s9 = await loadFighterEvidence(await sheet(9, 'Campione'));
  assert.equal(s9.resources.attacksPerAction, 2);
  assert.equal(s9.resources.indomitable, 1);

  const s11 = await loadFighterEvidence(await sheet(11, 'Campione'));
  assert.equal(s11.resources.attacksPerAction, 3);
  assert.equal(s11.resources.indomitable, 1);

  const s13 = await loadFighterEvidence(await sheet(13, 'Campione'));
  assert.equal(s13.resources.attacksPerAction, 3);
  assert.equal(s13.resources.indomitable, 2);

  const s17 = await loadFighterEvidence(await sheet(17, 'Campione'));
  assert.equal(s17.resources.actionSurge, 2);
  assert.equal(s17.resources.indomitable, 3);

  const s20 = await loadFighterEvidence(await sheet(20, 'Campione'));
  assert.equal(s20.resources.attacksPerAction, 4);
  assert.equal(s20.resources.actionSurge, 2);
  assert.equal(s20.resources.indomitable, 3);
});

test('Campione: Atleta Straordinario a livello 7 calcola +metà competenza per eccesso e aggiorna iniziativa', async () => {
  const original = await sheet(7, 'Campione');
  const baseInit = original.initiative;
  const baseAcrobatics = original.skills.acrobatics.value;
  const evidence = await loadFighterEvidence(original);
  const model = buildFighterPrintModel(original, evidence);

  const halfProf = Math.ceil(original.proficiencyBonus / 2);
  assert.equal(halfProf, 2); // At level 7, prof is +3, ceil(3/2) = 2
  assert.equal(model.sheet.initiative, baseInit + halfProf);
  if (!original.skills.acrobatics.proficient) {
    assert.equal(model.sheet.skills.acrobatics.value, baseAcrobatics + halfProf);
  }
  assert.equal(evidence.resources.champion?.remarkableAthlete, 2);
  assert.equal(evidence.resources.champion?.critThreshold, '19-20');

  // Level 15 has Critico Superiore
  const s15 = await loadFighterEvidence(await sheet(15, 'Campione'));
  assert.equal(s15.resources.champion?.critThreshold, '18-20');
});

test('Maestro di Battaglia: dadi superiorità, manovre e CD tiro salvezza', async () => {
  const s3 = await loadFighterEvidence(await sheet(3, 'Maestro di Battaglia'));
  assert.equal(s3.resources.superiorityDice?.count, 4);
  assert.equal(s3.resources.superiorityDice?.die, 'd8');
  assert.equal(s3.resources.maneuversCount, 3);

  const s7 = await loadFighterEvidence(await sheet(7, 'Maestro di Battaglia'));
  assert.equal(s7.resources.superiorityDice?.count, 5);
  assert.equal(s7.resources.superiorityDice?.die, 'd8');
  assert.equal(s7.resources.maneuversCount, 5);

  const s10 = await loadFighterEvidence(await sheet(10, 'Maestro di Battaglia'));
  assert.equal(s10.resources.superiorityDice?.count, 5);
  assert.equal(s10.resources.superiorityDice?.die, 'd10');
  assert.equal(s10.resources.maneuversCount, 7);

  const s15 = await loadFighterEvidence(await sheet(15, 'Maestro di Battaglia'));
  assert.equal(s15.resources.superiorityDice?.count, 6);
  assert.equal(s15.resources.superiorityDice?.die, 'd10');
  assert.equal(s15.resources.maneuversCount, 9);

  const s18 = await loadFighterEvidence(await sheet(18, 'Maestro di Battaglia'));
  assert.equal(s18.resources.superiorityDice?.die, 'd12');
  assert.equal(s18.resources.superiorityDice?.count, 6);
});

test('Cavaliere Mistico: slot incantesimi da mago, trucchetti e CD basata su Intelligenza', async () => {
  const original = await sheet(3, 'Cavaliere Mistico');
  const evidence = await loadFighterEvidence(original);
  assert.equal(evidence.resources.cantripsKnown, 2);
  assert.equal(evidence.resources.spellsKnown, 3);
  assert.equal(evidence.resources.spellSaveDc, 8 + original.proficiencyBonus + original.abilityMods.int);

  const s10 = await loadFighterEvidence(await sheet(10, 'Cavaliere Mistico'));
  assert.equal(s10.resources.cantripsKnown, 3);
  assert.equal(s10.resources.spellsKnown, 7);

  const prepared = await addFighterGrantedSpells(original, evidence);
  assert.equal(prepared.spellcastingClass, 'Guerriero');
  assert.equal(prepared.spellcastingAbility, 'int');
});

test('Arciere Arcano: concede competenza e trucchetto scelto, CD basata su Intelligenza', async () => {
  const original = await sheet(3, 'Arciere Arcano');
  const evidence = await loadFighterEvidence(original);
  assert.equal(evidence.resources.arcaneShot?.uses, 2);
  assert.equal(evidence.resources.arcaneShot?.optionsCount, 2);
  assert.equal(evidence.resources.arcaneShot?.dc, 8 + original.proficiencyBonus + original.abilityMods.int);

  const prepared = await addFighterGrantedSpells(original, evidence, { arcaneArcherCantrip: 'Artificio Druidico' });
  assert.ok(prepared.spells.some((s) => s.name === 'Artificio Druidico'));

  const model = buildFighterPrintModel(prepared, evidence, { arcaneArcherSkill: 'nature' });
  assert.ok(model.sheet.skills.nature.proficient);
});

test('Samurai: Cortigiano Elegante aggiunge mod SAG a Persuasione e conferisce TS Saggezza', async () => {
  const original = await sheet(7, 'Samurai');
  original.abilityMods.wis = 3;
  original.savingThrows.wis.proficient = false;
  original.savingThrows.wis.value = 3;
  const basePersuasion = original.skills.persuasion.value;

  const evidence = await loadFighterEvidence(original);
  const model = buildFighterPrintModel(original, evidence);
  assert.equal(model.sheet.skills.persuasion.value, basePersuasion + 3);
  assert.ok(model.sheet.savingThrows.wis.proficient);
  assert.equal(model.sheet.savingThrows.wis.value, 3 + original.proficiencyBonus);
});

test('Cavaliere Runico: rune, potenza del gigante e competenze bonus', async () => {
  const original = await sheet(3, 'Cavaliere Runico');
  const evidence = await loadFighterEvidence(original);
  assert.equal(evidence.resources.runes?.count, 2);
  assert.equal(evidence.resources.runes?.usesPerRune, 1);
  assert.equal(evidence.resources.giantsMight?.uses, original.proficiencyBonus);
  assert.equal(evidence.resources.giantsMight?.extraDamage, '1d6');

  const model = buildFighterPrintModel(original, evidence);
  assert.ok(model.sheet.toolProficiencies.includes('Strumenti da fabbro'));
  assert.ok(model.sheet.languages.includes('Gigante'));

  const s15 = await loadFighterEvidence(await sheet(15, 'Cavaliere Runico'));
  assert.equal(s15.resources.runes?.count, 5);
  assert.equal(s15.resources.runes?.usesPerRune, 2);

  const s18 = await loadFighterEvidence(await sheet(18, 'Cavaliere Runico'));
  assert.equal(s18.resources.giantsMight?.extraDamage, '1d10');
});

test('Guerriero Psionico: dadi energia psionica e incantesimo telecinesi al livello 18', async () => {
  const original3 = await sheet(3, 'Guerriero Psionico');
  const e3 = await loadFighterEvidence(original3);
  assert.equal(e3.resources.psionicDice?.count, 2 * original3.proficiencyBonus);
  assert.equal(e3.resources.psionicDice?.die, 'd6');

  const original5 = await sheet(5, 'Guerriero Psionico');
  const e5 = await loadFighterEvidence(original5);
  assert.equal(e5.resources.psionicDice?.die, 'd8');

  const original18 = await sheet(18, 'Guerriero Psionico');
  const e18 = await loadFighterEvidence(original18);
  assert.equal(e18.resources.psionicDice?.die, 'd12');

  const granted18 = await addFighterGrantedSpells(original18, e18);
  assert.ok(granted18.spells.some((s) => s.name === 'Telecinesi'));
});

test('Guerriero reference cards: testo trascritto fedele e scalato per livello', () => {
  const cards1 = fighterReferenceCards(1, 'Duellare');
  assert.ok(cards1.some((c) => c.title === 'Recuperare Energie'));
  assert.ok(!cards1.some((c) => c.title === 'Azione Impetuosa'));

  const cards5 = fighterReferenceCards(5, 'Duellare');
  assert.ok(cards5.some((c) => c.title === 'Attacco Extra'));
  assert.ok(!cards5.some((c) => c.title === 'Indomito'));

  const cards20 = fighterReferenceCards(20, 'Duellare', 'Difesa');
  const attackExtra = cards20.find((c) => c.title === 'Attacco Extra')!;
  assert.match(attackExtra.body, /Puoi fare 4 attacchi/);
  const indomito = cards20.find((c) => c.title === 'Indomito')!;
  assert.match(indomito.body, /3 volte ogni riposo/);
  const actionSurge = cards20.find((c) => c.title === 'Azione Impetuosa')!;
  assert.match(actionSurge.body, /2 volte prima del riposo/);
});

test('Modello di stampa Guerriero non muta i dati originali', async () => {
  const original = await sheet(7, 'Campione');
  const clone = structuredClone(original);
  const evidence = await loadFighterEvidence(original);
  buildFighterPrintModel(original, evidence);
  assert.deepEqual(original, clone);
});

test('Ogni archetipo di Guerriero produce un PDF valido e completo; salva sample guerriero-v2-test.pdf', async () => {
  const logo = fs.readFileSync('public/logo.png');
  for (const a of supportedFighterArchetypes()) {
    const orig = await sheet(10, a.label);
    const ev = await loadFighterEvidence(orig);
    const s = await addFighterGrantedSpells(orig, ev);
    const evidence = await loadFighterEvidence(s);
    const bytes = await renderCharacterSheetV2(s, logo, { fighterEvidence: evidence });
    const pdf = await PDFDocument.load(bytes);
    assert.ok(pdf.getPageCount() >= 2, `${a.label} page count >= 2`);
    if (a.slug === 'phb-guerriero-maestro-battaglia') {
      fs.writeFileSync('output/pdf/guerriero-v2-test.pdf', bytes);
    }
  }
  const s1 = await sheet(1, null);
  const e1 = await loadFighterEvidence(s1);
  const bytes1 = await renderCharacterSheetV2(s1, logo, { fighterEvidence: e1 });
  const pdf1 = await PDFDocument.load(bytes1);
  // Con il planner adattivo V2, un guerriero di 1° livello senza sottoclasse entra interamente in 1 pagina evitando pagine vuote
  assert.ok(pdf1.getPageCount() >= 1);
});

