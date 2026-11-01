import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadDruidEvidence } from '@/lib/server/druid-source';
import { buildDruidPrintModel } from '../druid-print-model';
import { supportedDruidCircles } from '../druid-circles';
import { addDruidGrantedSpells, loadDruidEvidence as loadEvidence } from '@/lib/server/druid-source';
import { druidReferenceCards } from '../druid-print-model';

async function sheet(level:number,classSubclass:string|null){
 const result=await buildGeneratedCharacterSheet({characterName:'Druido di prova',raceSlug:'elf',subraceSlug:null,classLabel:'Druido',classSubclass,backgroundSlug:'eremita',level,alignment:null,age:null,height:null,weight:null,sex:null});
 assert.ok(result.sheet);return result.sheet!;
}

test('Druido V2 legge progressione PHB e completa i privilegi base di livello 20',async()=>{
 const original=await sheet(20,'Circolo della Luna'),evidence=await loadDruidEvidence(original),model=buildDruidPrintModel(original,evidence);
 assert.equal(evidence.cantrips,4);assert.equal(evidence.slots[9],1);
 assert.ok(model.features.some(f=>f.title==='ARCIDRUIDO'));
 assert.equal(model.sheet.spellSaveDc,8+model.sheet.proficiencyBonus+model.sheet.abilityMods.wis);
 assert.equal(original.spellSlots[9],1);
});

test('tutti e sette i circoli catalogati hanno privilegi testuali e livelli verificati',async()=>{
 assert.equal(supportedDruidCircles().length,7);
 for(const circle of supportedDruidCircles()){
  const evidence=await loadDruidEvidence(await sheet(20,circle.label));
  assert.ok(evidence.circleFeatures.length>=4,circle.label);
  assert.ok(evidence.circleFeatures.every(f=>f.source.length>0),circle.label);
  if(circle.slug==='phb-druido-terra')assert.equal(evidence.grantedSpells.length,9);
  if(circle.slug==='tce-druido-fiamma')assert.equal(evidence.grantedSpells.length,10);
  if(circle.slug==='tce-druido-spore')assert.equal(evidence.grantedSpells.length,9);
  if(circle.slug==='tce-druido-stelle')assert.equal(evidence.grantedSpells.length,2);
 }
});

test('Druido di livello 1 non richiede un circolo e non anticipa Forma Selvatica',async()=>{
 const evidence=await loadDruidEvidence(await sheet(1,null));
 assert.equal(evidence.circleFeatures.length,0);
 assert.ok(!evidence.classFeatures.some(f=>f.title==='FORMA SELVATICA'));
 const premature=await loadEvidence(await sheet(1,'Circolo della Terra'));
 assert.equal(premature.grantedSpells.length,0);
});

test('Circolo della Terra aggiunge il trucchetto scelto e le magie del terreno senza consumare preparazioni',async()=>{
 const original=await sheet(5,'Circolo della Terra'),evidence=await loadEvidence(original,undefined,{landTerrain:'Foresta',landCantrip:'Spruzzo Velenoso'}),prepared=await addDruidGrantedSpells(original,evidence),model=buildDruidPrintModel(prepared,evidence);
 assert.ok(prepared.spells.some(s=>s.name==='Spruzzo Velenoso'));
 assert.ok(prepared.spells.some(s=>s.name.toLocaleLowerCase('it')==='invocare il fulmine'));
 assert.equal(model.sheet.cantripsKnown,original.cantripsKnown+1);
 assert.equal(model.sheet.spellsPrepared,original.spellsPrepared);
});

test('Luna include Forma Selvatica da Combattimento e Tasha applica le soglie 2/3/5/7/9',async()=>{
 const lunar=await loadEvidence(await sheet(2,'Circolo della Luna'));
 assert.ok(lunar.circleFeatures.some(f=>f.title==='FORMA SELVATICA DA COMBATTIMENTO'));
 const fireCounts={2:2,3:4,5:6,7:8,9:10},landCounts={2:1,3:3,5:5,7:7,9:9},sporeCounts={2:1,3:3,5:5,7:7,9:9};
 for(const [level,count] of Object.entries(fireCounts)){
  const fire=await loadEvidence(await sheet(Number(level),'Circolo della Fiamma'));
  assert.equal(fire.grantedSpells.length,count,`Fiamma livello ${level}`);
 }
 for(const [level,count] of Object.entries(landCounts))assert.equal((await loadEvidence(await sheet(Number(level),'Circolo della Terra'))).grantedSpells.length,count,`Terra livello ${level}`);
 for(const [level,count] of Object.entries(sporeCounts))assert.equal((await loadEvidence(await sheet(Number(level),'Circolo delle Spore'))).grantedSpells.length,count,`Spore livello ${level}`);
});

test('Forma Selvatica mostra il GS attuale e non anticipa la capacità di livello 6 della Luna',()=>{
 const moon2=druidReferenceCards(2,'Circolo della Luna').find(f=>f.title==='Forma Selvatica')!.body;
 const moon6=druidReferenceCards(6,'Circolo della Luna').find(f=>f.title==='Forma Selvatica')!.body;
 const land4=druidReferenceCards(4,'Circolo della Terra').find(f=>f.title==='Forma Selvatica')!.body;
 assert.match(moon2,/GS massimo 1/);assert.doesNotMatch(moon2,/dal 6° livello/i);assert.match(moon2,/Nuotare non consentito/);
 assert.match(moon6,/GS massimo 2/);assert.match(land4,/GS massimo 1\/2/);assert.match(land4,/volare non consentito/);
});

test('le otto scelte di terreno forniscono le quattro coppie PHB sempre preparate',async()=>{
 for(const terrain of ['Artico','Costa','Deserto','Foresta','Montagna','Palude','Prateria','Underdark'] as const){
  const evidence=await loadEvidence(await sheet(20,'Circolo della Terra'),undefined,{landTerrain:terrain});
  assert.equal(evidence.grantedSpells.length,9,terrain);
  assert.equal(evidence.landTerrain,terrain);
 }
});

test('i cantrip del circolo già noti concedono uno slot sostitutivo',async()=>{
 const original=await sheet(5,'Circolo delle Stelle'),evidence=await loadEvidence(original),before=original.cantripsKnown;
 const prepared=await addDruidGrantedSpells(original,evidence);
 assert.equal(prepared.cantripsKnown,before+1);
 assert.equal(prepared.spells.filter(s=>s.name.toLocaleLowerCase('it')==='guida').length,1);
 assert.ok(prepared.spells.some(s=>s.level===0&&s.summary.includes('sostitutivo')));
});

test('un incantesimo di circolo già preparato viene sostituito dalla lista ordinaria',async()=>{
 const original=await sheet(5,'Circolo delle Stelle'),evidence=await loadEvidence(original);
 const granted=evidence.grantedSpells.find(s=>s.level>0)!,index=original.spells.findIndex(s=>s.level>0);
 original.spells[index]=structuredClone(granted);
 const prepared=await addDruidGrantedSpells(original,evidence),circleNames=new Set(evidence.grantedSpells.filter(s=>s.level>0).map(s=>s.name.toLocaleLowerCase('it')));
 const ordinary=prepared.spells.filter(s=>s.level>0&&!circleNames.has(s.name.toLocaleLowerCase('it')));
 assert.equal(ordinary.length,prepared.spellsPrepared);
 assert.ok(ordinary.some(s=>s.summary.includes('sostituire')));
});
