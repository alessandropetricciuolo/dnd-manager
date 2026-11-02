import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { loadArtificerEvidence } from '@/lib/server/artificer-source';
import { applyArtificerInfusions } from '../artificer-infusions';
import { artificerItems, defaultArtificerChoices, supportedArtificerSpecialists } from '../artificer-catalog';
import { resolveBuildChoicesPreview } from '../build-choices';
import { applySlotChange, slotsToOverrides } from '../build-choices-client';
import { mapGeneratedSheetToPdfFields } from '../sheet-mapper';
import { buildFeatureSummaryV2 } from '../features-v2';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';
import type { ArtificerAssignment, ArtificerChoices, ArtificerEvidence } from '../artificer-types';

const input=(level:number,classSubclass:string|null=null)=>({characterName:'Artefice verifica',raceSlug:'umano',subraceSlug:null,classLabel:'Artefice',classSubclass,backgroundSlug:'sapiente',level,alignment:null,age:null,height:null,weight:null,sex:null});
async function base(level:number,label:string|null=null){const sheet=(await buildGeneratedCharacterSheet({...input(level,label),buildOverrides:{artificer:{assignments:[]}}})).sheet;delete sheet.artificer;return sheet;}
function choice(e:ArtificerEvidence,ids:string[],assignments:ArtificerAssignment[],other:ArtificerChoices={}){return {known:[...ids,...e.infusions.filter(i=>i.level<=20&&!ids.includes(i.id)).map(i=>i.id)].slice(0,e.knownLimit),assignments,...other};}

test('Artificer defaults at every level respect the actual Tasha limits and all four specializations',async()=>{
 for(const label of [null,...supportedArtificerSpecialists().map(s=>s.label)])for(let level=1;level<=20;level++){
  const {sheet:s}=await buildGeneratedCharacterSheet(input(level,label)),state=s.artificer!;
  assert.equal(state.known.length,level===1?0:level>=18?12:level>=14?10:level>=10?8:level>=6?6:4);
  assert.equal(state.itemLimit,level===1?0:level>=18?6:level>=14?5:level>=10?4:level>=6?3:2);
  assert.ok(state.assignments.length<=state.itemLimit+state.armorBonusSlots);
  assert.equal(state.assignments.length,state.itemLimit+state.armorBonusSlots,`${label} ${level}: automatic assignment uses capacity`);
  assert.equal(new Set(state.assignments.map(a=>a.itemId)).size,state.assignments.length);
  assert.ok(state.known.every(i=>i.level<=level));assert.equal(s.cantripsKnown,level>=14?4:level>=10?3:2);
  if(level<3)assert.equal(s.classSubclass,null);
 }
});

test('Known infusion, assignment and ownership are distinct; bonus changes at level 10',async()=>{
 for(const level of [2,9,10,20]){const b=await base(level),e=await loadArtificerEvidence(level,null),before=JSON.stringify(b);
  const known=defaultArtificerChoices(level,null,e.infusions,e.knownLimit,e.itemLimit).known!;
  for(const state of ['self','carried','other'] as const){const s=applyArtificerInfusions(b,e,{known,assignments:[{infusionId:'defense',itemId:'armor',state}]});assert.equal(s.armorClass,16+(state==='self'?(level>=10?2:1):0));}
  const bow=applyArtificerInfusions(b,e,{known,assignments:[{infusionId:'repeating',itemId:'crossbow',state:'attuned'}]});
  assert.equal(bow.weaponRows[0].toHit,'+'+(b.proficiencyBonus+b.abilityMods.dex+1));assert.ok(bow.weaponRows[0].damage.endsWith('+1'));assert.ok(bow.artificer!.notes.some(n=>n.includes('due mani')));
  const focus=applyArtificerInfusions(b,e,{known,assignments:[{infusionId:'focus',itemId:'focus',state:'attuned'}]});
  assert.equal(focus.spellSaveDc,8+b.proficiencyBonus+b.abilityMods.int);assert.equal(focus.spellAttackBonus,b.proficiencyBonus+b.abilityMods.int+(level>=10?2:1));
  const noTune=applyArtificerInfusions(b,e,{known,assignments:[{infusionId:'focus',itemId:'focus',state:'self'}]});assert.equal(noTune.spellAttackBonus,b.proficiencyBonus+b.abilityMods.int);
  assert.equal(JSON.stringify(b),before);
 }
});

test('Invalid levels, incompatible objects, duplicate infusions, stacking and excess attunements fail',async()=>{
 const b=await base(2),e=await loadArtificerEvidence(2,null),known=defaultArtificerChoices(2,null,e.infusions,e.knownLimit,e.itemLimit).known!;
 assert.throws(()=>applyArtificerInfusions(b,e,{known:['weapon','defense','focus','awareness'],assignments:[]}),/livello/);
 assert.throws(()=>applyArtificerInfusions(b,e,{known,assignments:[{infusionId:'repeating',itemId:'armor',state:'attuned'}]}),/compatibile/);
 assert.throws(()=>applyArtificerInfusions(b,e,{known,assignments:[{infusionId:'defense',itemId:'armor',state:'self'},{infusionId:'mind',itemId:'armor',state:'self'}]}),/sola infusione/);
 assert.throws(()=>applyArtificerInfusions(b,e,{known,assignments:[{infusionId:'defense',itemId:'armor',state:'self'},{infusionId:'defense',itemId:'shield',state:'self'}]}),/solo oggetto/);
 const six=await base(6),e6=await loadArtificerEvidence(6,null);
 assert.throws(()=>applyArtificerInfusions(six,e6,choice(e6,['focus','repeating','repulsion','spell-ring'],[{infusionId:'focus',itemId:'focus',state:'attuned'},{infusionId:'repeating',itemId:'crossbow',state:'attuned'},{infusionId:'repulsion',itemId:'shield',state:'attuned'},{infusionId:'spell-ring',itemId:'ring',state:'attuned'}])),/Troppi|sintonia/);
});

test('Battle Smith uses Intelligence only for magical weapons; Armorer has two restricted extra objects',async()=>{
 const b=await base(5,'Fabbro da battaglia'),e=await loadArtificerEvidence(5,'Fabbro da battaglia');
 const s=applyArtificerInfusions(b,e,{known:['weapon','defense','focus','mind'],assignments:[{infusionId:'weapon',itemId:'hammer',state:'self'}]});
 assert.equal(s.weaponRows[1].toHit,'+'+(b.proficiencyBonus+b.abilityMods.int+1));assert.equal(s.weaponRows[1].damage,'1d4+INT+1');assert.equal(s.weaponRows[0].toHit,'+'+(b.proficiencyBonus+b.abilityMods.dex));
 const a=await base(9,'Armaiolo'),ea=await loadArtificerEvidence(9,'Armaiolo'),auto=defaultArtificerChoices(9,'Armaiolo',ea.infusions,ea.knownLimit,ea.itemLimit);
 assert.equal(applyArtificerInfusions(a,ea,auto).artificer!.armorBonusSlots,2);
 const invalid=choice(ea,['weapon','defense','focus','mind','spell-ring','winding'],[{infusionId:'weapon',itemId:'hammer',state:'self'},{infusionId:'focus',itemId:'focus',state:'attuned'},{infusionId:'mind',itemId:'robe',state:'self'},{infusionId:'spell-ring',itemId:'ring',state:'attuned'}]);
 assert.throws(()=>applyArtificerInfusions(a,ea,invalid),/armatura arcana/);
 const fourAttuned=choice(ea,['focus','repeating','spell-ring','resistant'],[{infusionId:'focus',itemId:'focus',state:'attuned'},{infusionId:'repeating',itemId:'crossbow',state:'attuned'},{infusionId:'spell-ring',itemId:'ring',state:'attuned'},{infusionId:'resistant',itemId:'armor',state:'attuned',resistance:'freddo'}]);assert.throws(()=>applyArtificerInfusions(a,ea,fourAttuned),/sintonia/);
 const infiltrator=applyArtificerInfusions(a,ea,{...auto,armorModel:'Infiltrato'});assert.equal(infiltrator.speed,'10.5 m');assert.ok(infiltrator.weaponRows.some(w=>w.name==='Lanciatore di Fulmini'));
});

test('All 15 named infusions and 49 table replicas retain their manual descriptions and can be assigned',async()=>{
 const b=await base(20),e=await loadArtificerEvidence(20,null);assert.equal(e.infusions.length,64);assert.ok(e.infusions.every(i=>i.body.trim()&&(!i.replica||i.replicaBody?.trim())));
 for(const inf of e.infusions){const item=artificerItems(20,null).find(i=>i.kinds.some(k=>inf.targets.includes(k)))!;
  const s=applyArtificerInfusions(b,e,choice(e,[inf.id],[{infusionId:inf.id,itemId:item.id,state:inf.attunement?'attuned':'self',...(inf.id==='resistant'?{resistance:'fuoco'}:{})}]));assert.equal(s.artificer!.assignments[0].infusionId,inf.id);
 }
 const homunculus=e.infusions.find(i=>i.id==='homunculus')!;for(const text of ['Classe Armatura 13','AZIONI','REAZIONI','1d4 + BC'])assert.ok(homunculus.body.includes(text));
});

test('Replicas recalculate ability-derived stats and protection without stacking incompatible conditions',async()=>{
 const b=await base(14),e=await loadArtificerEvidence(14,null);
 for(const [fragment,ability,score] of [['amuleto','con',19],['fascia','int',19],['guanti-del-potere','str',19],['cintura','str',21]] as const){const inf=e.infusions.find(i=>i.id.includes(fragment))!;const s=applyArtificerInfusions(b,e,choice(e,[inf.id],[{infusionId:inf.id,itemId:'replica-1',state:'attuned'}]));assert.equal(s.abilities[ability],Math.max(score,b.abilities[ability]));if(ability==='con')assert.equal(s.hpMax,b.hpMax+(s.abilityMods.con-b.abilityMods.con)*14);if(ability==='int')assert.equal(s.spellSaveDc,8+s.proficiencyBonus+s.abilityMods.int);}
 const cloak=e.infusions.find(i=>i.replica==='Mantello della protezione')!,ring=e.infusions.find(i=>i.replica==='Anello di protezione')!;
 const s=applyArtificerInfusions(b,e,choice(e,[cloak.id,ring.id],[{infusionId:cloak.id,itemId:'replica-1',state:'attuned'},{infusionId:ring.id,itemId:'replica-2',state:'attuned'}]));assert.equal(s.armorClass,18);assert.equal(s.savingThrows.wis.value,b.savingThrows.wis.value+2);
 const lowInt=structuredClone(b);lowInt.abilities.int=12;lowInt.abilityMods.int=1;const headband=e.infusions.find(i=>i.replica?.startsWith('Fascia'))!;const intelligent=applyArtificerInfusions(lowInt,e,choice(e,[headband.id],[{infusionId:headband.id,itemId:'replica-1',state:'attuned'}]));assert.equal(intelligent.abilities.int,19);assert.equal(intelligent.spellAttackBonus,intelligent.proficiencyBonus+4);assert.equal(intelligent.spellsPrepared,11);
 const bracers=e.infusions.find(i=>i.replica==='Bracciali della Difesa')!;
 for(const armor of ['nessuna','scaglie'] as const){const s=applyArtificerInfusions(b,e,choice(e,[bracers.id],[{infusionId:bracers.id,itemId:'replica-1',state:'attuned'}],{armor,shield:false}));assert.equal(s.armorClass,armor==='nessuna'?12+b.abilityMods.dex:16);}
});

test('Soul of Artifice counts only actual attunements, including carried attuned items, not known or allied objects',async()=>{
 const b=await base(20),e=await loadArtificerEvidence(20,null),known=defaultArtificerChoices(20,null,e.infusions,e.knownLimit,e.itemLimit).known!;
 const s=applyArtificerInfusions(b,e,{known,assignments:[{infusionId:'focus',itemId:'focus',state:'attuned'},{infusionId:'awareness',itemId:'helmet',state:'carried-attuned'},{infusionId:'repeating',itemId:'crossbow',state:'other'}]});
 for(const ability of ['str','dex','con','int','wis','cha'] as const)assert.equal(s.savingThrows[ability].value,b.savingThrows[ability].value+2);
 assert.equal(s.initiative,b.initiative);assert.ok(!s.artificer!.notes.some(n=>n.startsWith('Elmo')));
});

test('Review controls persist known and active infusions; removing a known infusion clears dependent assignments',async()=>{
 const preview=await resolveBuildChoicesPreview(input(6,'Fabbro da battaglia'));
 const serialized=slotsToOverrides(preview.slots);assert.equal(serialized.artificer!.known!.length,6);assert.equal(serialized.artificer!.assignments!.length,3);
 const removed=preview.slots.find(s=>s.id==='artificer-known-1')!.value;
 const replacement=preview.slots.find(s=>s.id==='artificer-known-1')!.options.find(o=>!serialized.artificer!.known!.includes(o.value))!;
 const changed=applySlotChange(preview.slots,'artificer-known-1',replacement.value,6);assert.ok(!slotsToOverrides(changed).artificer!.assignments!.some(a=>a.infusionId===removed));
 const source=await buildGeneratedCharacterSheet({...input(6,'Fabbro da battaglia'),buildOverrides:serialized});
 const fields=mapGeneratedSheetToPdfFields(source.sheet);assert.ok(fields.ArtificerInfusions);assert.ok(String(fields.Inventory).includes('ARMA MIGLIORATA'));assert.ok(buildFeatureSummaryV2(source.sheet,serialized).classText.includes('Martello leggero'));
});

test('The V2 renderer uses already-applied stats once and keeps all specialty features and spells',async()=>{
 for(const specialist of supportedArtificerSpecialists())for(const level of [1,3,9,20]){const s=(await buildGeneratedCharacterSheet(input(level,specialist.label))).sheet,before=JSON.stringify(s);const bytes=await renderCharacterSheetV2(s,fs.readFileSync('public/logo.png'));assert.ok((await PDFDocument.load(bytes)).getPageCount()>=(level===1?2:3));assert.equal(JSON.stringify(s),before);assert.ok(s.spells.every(sp=>sp.material&&sp.fullTextMd?.includes('Strumenti Necessari')));if(level>=3)assert.ok(s.spells.filter(sp=>sp.summary.startsWith('Sempre preparato:')).length>=2);assert.ok(s.artificer!.features.every(f=>!f.body.includes('INCANTESIMI DA FABBRO DA BATTAGLIA')));}
});
