import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { BARBARIAN_PATH_FEATURES, supportedBarbarianPaths } from '../barbarian-paths';
import { buildBarbarianPrintModel } from '../barbarian-print-model';
import { barbarianReferenceCards } from '../barbarian-reference-copy';
import { loadBarbarianEvidence, addBarbarianGrantedSpells } from '@/lib/server/barbarian-source';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';

async function fixture(label:string|null,level:number){return (await buildGeneratedCharacterSheet({characterName:'Barbaro verifica',raceSlug:'umano',subraceSlug:null,classLabel:'Barbaro',classSubclass:label,backgroundSlug:'soldato',level,alignment:null,age:null,height:null,weight:null,sex:null})).sheet;}

test('Seven Barbarian paths retain all source features at the proper levels',async()=>{
  assert.equal(supportedBarbarianPaths().length,7);
  for(const path of supportedBarbarianPaths())for(const level of [2,3,6,10,14,20]){
    const s=await fixture(path.label,level),e=await loadBarbarianEvidence(s);
    assert.deepEqual(e.pathFeatures.map(f=>f.title),BARBARIAN_PATH_FEATURES[path.slug].filter(([,n])=>n<=level).map(([t])=>t),`${path.slug} level ${level}`);
    assert.ok(e.classFeatures.every(f=>f.level<=level&&f.body.trim()));
    buildBarbarianPrintModel(s,e);
  }
});

test('Rage progression comes from all twenty rows; approved correction applies in both texts',async()=>{
  for(let level=1;level<=20;level++){
    const s=await fixture(null,level),e=await loadBarbarianEvidence(s);
    assert.equal(e.rage.uses,level===20?null:level>=17?6:level>=12?5:level>=6?4:level>=3?3:2);
    assert.equal(e.rage.damage,level>=16?4:level>=9?3:2);
    assert.ok(e.classFeatures.find(f=>f.title==='IRA')!.body.includes('e non ha subito danni da allora'));
  }
  const rage=barbarianReferenceCards(1)[0].body;
  assert.ok(rage.includes('armatura pesante'));assert.ok(rage.includes('e senza aver subito danni'));
  const persistent=barbarianReferenceCards(15)[0].body;assert.ok(persistent.includes('1 minuto'));assert.ok(!persistent.includes('senza aver attaccato'));
  assert.ok(barbarianReferenceCards(11).find(c=>c.title==='Ira Implacabile')!.body.includes('non muori sul colpo'));
});

test('V2 applies fast movement and primal champion without mutating the original',async()=>{
  const base=await fixture(null,20),before=JSON.stringify(base),m=buildBarbarianPrintModel(base,await loadBarbarianEvidence(base));
  assert.equal(JSON.stringify(base),before);assert.equal(m.sheet.abilities.str,24);assert.equal(m.sheet.abilities.con,24);
  assert.equal(m.sheet.armorClass,base.armorClass+2);assert.equal(m.sheet.hpMax,base.hpMax+40);
  assert.equal(m.sheet.savingThrows.con.value,base.savingThrows.con.value+2);assert.equal(m.sheet.skills.athletics.value,base.skills.athletics.value+2);
  assert.equal(m.sheet.speed,'12 m');assert.equal(m.brutalDice,3);
  for(const level of [4,5,9,13,17]){const s=await fixture(null,level),model=buildBarbarianPrintModel(s,await loadBarbarianEvidence(s));assert.equal(model.sheet.speed,level>=5?'12 m':'9 m');assert.equal(model.brutalDice,level>=17?3:level>=13?2:level>=9?1:0);}
});

test('Totems and storm environment show only selected options; Bestia retains dynamic choices',async()=>{
  for(const animal of ['Orso','Aquila','Lupo'] as const){const s=await fixture('Cammino del Combattente Totemico',14),e=await loadBarbarianEvidence(s),before=JSON.stringify(e);const m=buildBarbarianPrintModel(s,e,{totemSpirit:animal,totemAspect:animal,totemAttunement:animal});
    for(const title of ['SPIRITO TOTEMICO','ASPETTO DELLA BESTIA','SINTONIA TOTEMICA']){const f=m.features.find(f=>f.title===title+' - '+animal)!;assert.ok(f.body.includes('**'+animal+'.**'));for(const other of ['Orso','Aquila','Lupo'].filter(a=>a!==animal))assert.ok(!f.body.includes('**'+other+'.**'));}assert.equal(JSON.stringify(e),before);
  }
  for(const storm of ['Deserto','Mare','Tundra'] as const){const s=await fixture("Cammino dell'Araldo della Tempesta",14),m=buildBarbarianPrintModel(s,await loadBarbarianEvidence(s),{storm});assert.equal(m.features.filter(f=>f.title.endsWith(' - '+storm)).length,3);}
  const beast=await loadBarbarianEvidence(await fixture('Cammino della Bestia',14));const form=beast.pathFeatures.find(f=>f.title==='FORMA DELLA BESTIA')!.body;for(const word of ['Morso','Artigli','Coda'])assert.ok(form.includes(word));
  const wild=await loadBarbarianEvidence(await fixture('Cammino della Magia Selvaggia',3));const surge=wild.pathFeatures.find(f=>f.title==='IMPETO SELVAGGIO')!.body;assert.ok(surge.includes('MAGIA SELVAGGIA'));assert.deepEqual([...surge.matchAll(/^(\d)\. /gm)].map(m=>Number(m[1])),[1,2,3,4,5,6,7,8]);
});

test('Granted spells retain restrictions and complete manual text without consuming slots',async()=>{
  for(const [label,level,count] of [['Cammino del Combattente Totemico',3,2],['Cammino del Combattente Totemico',10,3],['Cammino del Guardiano Ancestrale',10,2]] as const){const s=await fixture(label,level),before=JSON.stringify(s),aug=await addBarbarianGrantedSpells(s);assert.equal(JSON.stringify(s),before);assert.equal(aug.spells.length,count);assert.deepEqual(aug.spellSlots,s.spellSlots);assert.ok(aug.spells.every(s=>s.fullTextMd!.includes('**Durata:**')));assert.equal((await addBarbarianGrantedSpells(aug)).spells.length,count);}
});

test('Each Barbarian path produces a PDF; source errors prevent silent partial exports',async()=>{
  for(const path of supportedBarbarianPaths()){const s=await addBarbarianGrantedSpells(await fixture(path.label,14)),e=await loadBarbarianEvidence(s);const bytes=await renderCharacterSheetV2(s,fs.readFileSync('public/logo.png'),{barbarianEvidence:e});const pdf=await PDFDocument.load(bytes);assert.ok(pdf.getPageCount()>=2);}
  const s=await fixture(null,1);await assert.rejects(()=>renderCharacterSheetV2(s,fs.readFileSync('public/logo.png')),/fonti/);
});
