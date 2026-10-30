import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { buildBardPrintModel } from '../bard-print-model';
import { renderExperimentalBardSheet, wrapSheetText } from '@/lib/pdf/experimental-bard-sheet';
import type { SkillKey } from '../types';

async function fixture(level:number,subclass:string|null='Collegio della Sapienza'){
  const {sheet}=await buildGeneratedCharacterSheet({characterName:'Bardo V2',raceSlug:'halfling',subraceSlug:null,classLabel:'Bardo',classSubclass:subclass,backgroundSlug:'intrattenitore',level,alignment:null,age:null,height:null,weight:null,sex:null});
  const bonus=level>=3&&subclass?.includes('Sapienza')?(Object.keys(sheet.skills) as SkillKey[]).filter(k=>!sheet.skills[k].proficient).slice(0,3):[];
  return {sheet,bonus};
}

test('Bard V2: source-derived feature unlocks and resource boundaries',async()=>{
  for(const [level,die] of [[1,'d6'],[4,'d6'],[5,'d8'],[9,'d8'],[10,'d10'],[14,'d10'],[15,'d12'],[20,'d12']] as const){
    const {sheet,bonus}=await fixture(level);const m=buildBardPrintModel(sheet,bonus);
    assert.equal(m.die,die);assert.ok(m.features.every(f=>f.level<=level&&f.body.trim()&&f.source.includes('Manuale')));
    assert.equal(m.features.some(f=>f.title==='FONTE DI ISPIRAZIONE'),level>=5);
    assert.equal(m.features.some(f=>f.title==='SEGRETI MAGICI AGGIUNTIVI'),level>=6);
    assert.equal(m.features.some(f=>f.title==='ABILITÀ IMPAREGGIABILE'),level>=14);
    assert.equal(m.sheet.classSubclass===null,level<3);
  }
});

test('Bard V2: Factotum, bonus skills and passive perception without changing V1 data',async()=>{
  const {sheet,bonus}=await fixture(5);const before=JSON.stringify(sheet),m=buildBardPrintModel(sheet,bonus);
  assert.equal(JSON.stringify(sheet),before);
  for(const key of bonus)assert.equal(m.sheet.skills[key].proficient,true);
  const untrained=(Object.keys(sheet.skills) as SkillKey[]).find(k=>!sheet.skills[k].proficient&&!bonus.includes(k))!;
  assert.equal(m.sheet.skills[untrained].value,sheet.skills[untrained].value+1);
  assert.equal(m.sheet.initiative,sheet.initiative+1);
  assert.equal(m.sheet.passivePerception,10+m.sheet.skills.perception.value);
  assert.throws(()=>buildBardPrintModel(sheet,[bonus[0],bonus[0],bonus[1]]),/tre competenze/);
  assert.throws(()=>buildBardPrintModel({...sheet,classFeaturesMd:''},bonus),/manuale/);
});

test('Bard V2: Valore and long PDF contents survive pagination at levels 1, 5 and 20',async()=>{
  const logo=fs.readFileSync('public/logo.png');
  for(const level of [1,5,20]){
    const {sheet}=await fixture(level,'Collegio del Valore');const before=JSON.stringify(sheet);
    const bytes=await renderExperimentalBardSheet(sheet,logo,{story:'Storia lunga. '.repeat(1000)});
    const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>=4);assert.equal(pdf.getForm().getFields().length,0);
    assert.equal(JSON.stringify(sheet),before);assert.ok(pdf.getPages().every(p=>Math.abs(p.getWidth()-595.28)<.01));
  }
});

test('Bard V2: wrapping preserves long tokens and all text',async()=>{
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
  const text='Un testo '+ 'lunghissimo'.repeat(20)+' conclusione';
  const lines=wrapSheetText(text,font,9,100);
  assert.ok(lines.every(l=>font.widthOfTextAtSize(l,9)<=100));
  assert.equal(lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));
});
