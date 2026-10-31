import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { supportedBardColleges, BARD_COLLEGE_FEATURES, extractBardCollegeFeatures } from '../bard-colleges';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { buildBardPrintModel } from '../bard-print-model';
import { loadBardCollegeFeatures, addBardCollegeGrantedSpells } from '@/lib/server/bard-college-source';
import { renderExperimentalBardSheet } from '@/lib/pdf/experimental-bard-sheet';
import type { SkillKey } from '../types';

async function fixture(label:string,level:number){
  return (await buildGeneratedCharacterSheet({characterName:'Test collegi',raceSlug:'halfling',subraceSlug:null,classLabel:'Bardo',classSubclass:label,backgroundSlug:'intrattenitore',level,alignment:null,age:null,height:null,weight:null,sex:null})).sheet;
}

test('V2 exposes every Bard college found in the four local manuals',()=>{
  assert.deepEqual(supportedBardColleges().map(c=>c.slug).sort(),Object.keys(BARD_COLLEGE_FEATURES).sort());
  assert.equal(supportedBardColleges().length,8);
  assert.equal(new Set(supportedBardColleges().map(c=>c.supplementRulesSource.markdownFile)).size,4);
});

test('All eight colleges resolve exact source blocks only at the correct unlock levels',async()=>{
  for(const college of supportedBardColleges())for(const level of [2,3,6,14]){
    const sheet=await fixture(college.label,level);
    const evidence=await loadBardCollegeFeatures(sheet);
    const expected=BARD_COLLEGE_FEATURES[college.slug].filter(([,unlock])=>unlock<=level);
    assert.deepEqual(evidence.map(e=>e.title),expected.map(([title])=>title),`${college.label} level ${level}`);
    assert.ok(evidence.every(e=>e.body.trim()&&e.source.includes(college.supplementRulesSource.markdownFile)));
    const bonus=college.slug==='phb-bardo-sapienza'&&level>=3?(Object.keys(sheet.skills) as SkillKey[]).filter(k=>!sheet.skills[k].proficient).slice(0,3):[];
    const m=buildBardPrintModel(sheet,bonus,evidence);
    assert.ok(m.features.every(f=>f.level<=level));
  }
});

test('Tasha split headings keep both Eloquence features at each level',async()=>{
  const sheet=await fixture("Collegio dell'Eloquenza",6);
  const features=await loadBardCollegeFeatures(sheet);
  assert.deepEqual(features.map(f=>f.title),['ARTE ORATORIA','PAROLE INQUIETANTI','ISPIRAZIONE INFALLIBILE','LINGUAGGIO UNIVERSALE']);
  assert.ok(features.find(f=>f.title==='PAROLE INQUIETANTI')!.body.includes('tiro salvezza successivo'));
  assert.ok(features.find(f=>f.title==='LINGUAGGIO UNIVERSALE')!.body.includes('per 1 ora'));
});

test('Creation stat block and Spirits tables/continuations are preserved in full',async()=>{
  const creation=await loadBardCollegeFeatures(await fixture('Collegio della Creazione',6));
  const animate=creation.find(f=>f.title==='CREAZIONE ANIMATA')!.body;
  for(const phrase of ['OGGETTO DANZANTE','Schianto Rinforzato','Quando il personaggio usa il privilegio Ispirazione Bardica'])assert.ok(animate.includes(phrase),phrase);
  const spirit=await fixture('Collegio degli Spiriti',6);
  const tales=(await loadBardCollegeFeatures(spirit)).find(f=>f.title==="RACCONTI DALL'ALDILÀ")!.body;
  assert.ok(tales.includes('Racconto del dominatore mentale'));
  const before=JSON.stringify(spirit),augmented=await addBardCollegeGrantedSpells(spirit);
  assert.equal(JSON.stringify(spirit),before);
  const guidance=augmented.spells.find(s=>s.name==='Guida')!;
  assert.ok(guidance.fullTextMd!.includes('18 metri (Sussurri Guida'));
  assert.ok(guidance.verbal&&guidance.somatic&&guidance.concentration);
  assert.equal(augmented.spells.length,spirit.spells.length+1);
  assert.equal((await addBardCollegeGrantedSpells(augmented)).spells.length,augmented.spells.length);
});

test('Swords fighting style is selected from its manual and never mutates evidence',async()=>{
  const sheet=await fixture('Collegio delle Spade',6),features=await loadBardCollegeFeatures(sheet),before=JSON.stringify(features);
  for(const choice of ['Duellare','Combattere con Due Armi'] as const){
    const m=buildBardPrintModel(sheet,[],features,choice);
    const style=m.features.find(f=>f.title.startsWith('STILE DI COMBATTIMENTO'))!;
    assert.ok(style.title.includes(choice));assert.ok(style.body.startsWith(`**${choice}.`));
    assert.equal(JSON.stringify(features),before);
    assert.ok(m.sheet.armorProficiencies.includes('Armature medie'));assert.ok(m.sheet.weaponProficiencies.includes('Scimitarra'));
  }
});

test('Missing source features fail visibly; each college renders a complete PDF',async()=>{
  const logo=fs.readFileSync('public/logo.png');
  for(const college of supportedBardColleges()){
    const raw=fs.readFileSync(`public/manuals/${college.supplementRulesSource.markdownFile}`,'utf8');
    assert.throws(()=>extractBardCollegeFeatures(raw.replaceAll(BARD_COLLEGE_FEATURES[college.slug][0][0],'MISSING'),college,3),/non trovato/);
    const sheet=await addBardCollegeGrantedSpells(await fixture(college.label,14)),features=await loadBardCollegeFeatures(sheet);
    const bonusSkills=college.slug==='phb-bardo-sapienza'?(Object.keys(sheet.skills) as SkillKey[]).filter(k=>!sheet.skills[k].proficient).slice(0,3):[];
    const pdf=await PDFDocument.load(await renderExperimentalBardSheet(sheet,logo,{bonusSkills,collegeFeatures:features}));
    assert.ok(pdf.getPageCount()>=3,college.label);
  }
});
