import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { buildGeneratedCharacterSheet } from '../build-engine';
import { CLERIC_DOMAIN_FEATURES, supportedClericDomains, DRUID_CANTRIPS } from '../cleric-domains';
import { buildClericPrintModel } from '../cleric-print-model';
import { loadClericEvidence, addClericGrantedSpells } from '@/lib/server/cleric-source';
import { renderCharacterSheetV2 } from '@/lib/pdf/character-sheet-v2';
import { clericReferenceCards } from '../cleric-reference-copy';
import { extractManualSubclassFeatures } from '../manual-subclass-features';

async function fixture(label:string|null,level:number){return (await buildGeneratedCharacterSheet({characterName:'Chierico verifica',raceSlug:'umano',subraceSlug:null,classLabel:'Chierico',classSubclass:label,backgroundSlug:'accolito',level,alignment:null,age:null,height:null,weight:null,sex:null})).sheet;}

test('All twelve Cleric domains resolve only unlocked source features and domain spells',async()=>{
 assert.equal(supportedClericDomains().length,12);
 for(const domain of supportedClericDomains())for(const level of [1,2,6,8,14,17,20]){
  const sheet=await fixture(domain.label,level),e=await loadClericEvidence(sheet);
  assert.deepEqual(e.domainFeatures.map(f=>f.title),CLERIC_DOMAIN_FEATURES[domain.slug].filter(([,n])=>n<=level).map(([t])=>t),domain.label+' '+level);
  assert.ok(e.domainFeatures.every(f=>f.body.trim()&&f.source.includes(domain.supplementRulesSource.markdownFile)));
  assert.equal(e.domainSpells.length,2*Math.min(5,Math.ceil(level/2)));
  assert.ok(e.domainSpells.every(s=>s.unlock<=level));
  const m=buildClericPrintModel(sheet,e);assert.ok(m.features.every(f=>f.level<=level));
 }
});

test('Channel Divinity, Destroy Undead, spell slots and level 20 intervention follow PHB boundaries',async()=>{
 for(let level=1;level<=20;level++){
  const s=await fixture('Dominio della Vita',level),e=await loadClericEvidence(s),m=buildClericPrintModel(s,e);
  assert.equal(e.channelUses,level>=18?3:level>=6?2:level>=2?1:0);
  assert.equal(e.undeadCr,level>=17?'4':level>=14?'3':level>=11?'2':level>=8?'1':level>=5?'1/2':null);
  assert.equal(e.cantrips,level>=10?5:level>=4?4:3);assert.deepEqual(e.slots,s.spellSlots);
  assert.equal(m.divineSuccess,level===20?'Automatico':level+'%');
  assert.equal(e.classFeatures.filter(f=>f.title==='DISTRUGGERE NON MORTI').length,level>=5?1:0);
  if(level>=10&&level<20)assert.ok(!e.classFeatures.find(f=>f.title==='INTERVENTO DIVINO')!.body.includes('Al 20° livello'));
 }
 const cards=clericReferenceCards(20,'4');assert.ok(cards[0].body.includes('finché subiscono danni'));assert.ok(cards[0].body.includes('reazioni'));
 const intervention=cards.find(c=>c.title==='Intervento Divino')!.body;assert.ok(intervention.includes('7 giorni'));assert.ok(intervention.includes('altrimenti'));assert.ok(intervention.includes('automaticamente'));
});

test('Knowledge doubles the chosen skills and grants two distinct languages without touching V1',async()=>{
 const s=await fixture('Dominio della Conoscenza',5),e=await loadClericEvidence(s),before=JSON.stringify(s);
 const m=buildClericPrintModel(s,e,{skills:['arcana','religion'],languages:['Draconico','Silvano']});
 assert.equal(JSON.stringify(s),before);
 assert.equal(m.sheet.skills.arcana.value,s.abilityMods.int+2*s.proficiencyBonus);assert.equal(m.sheet.skills.religion.expertise,true);
 assert.ok(m.sheet.languages.includes('Draconico'));assert.ok(m.sheet.languages.includes('Silvano'));
 assert.throws(()=>buildClericPrintModel(s,e,{skills:['arcana','arcana']}),/distinte/);
 assert.throws(()=>buildClericPrintModel(s,e,{languages:['Comune','Elfico']}),/linguaggi/);
 for(const [label,skill] of [["Dominio dell'Ordine",'persuasion'],['Dominio della Pace','insight'],['Dominio della Natura','survival']] as const){const sheet=await fixture(label,1),m=buildClericPrintModel(sheet,await loadClericEvidence(sheet),{skills:[skill]});assert.ok(m.sheet.skills[skill].proficient);}
});

test('Armor and weapon proficiencies match the domain; Forge permanent AC differs from its daily blessing',async()=>{
 for(const label of ['Dominio della Vita','Dominio della Natura','Dominio della Forgia',"Dominio dell'Ordine",'Dominio della Guerra','Dominio della Tempesta','Dominio del Crepuscolo']){const s=await fixture(label,1),m=buildClericPrintModel(s,await loadClericEvidence(s));assert.ok(m.sheet.armorProficiencies.includes('Armature pesanti'));assert.equal(m.sheet.armorClass,18);assert.equal(m.sheet.weaponRows.find(a=>a.name==='Balestra leggera')!.toHit,`+${s.proficiencyBonus+s.abilityMods.dex}`);}
 for(const label of ['Dominio della Luce','Dominio della Conoscenza',"Dominio dell'Inganno",'Dominio della Pace','Dominio della Tomba']){const s=await fixture(label,1),m=buildClericPrintModel(s,await loadClericEvidence(s));assert.ok(!m.sheet.armorProficiencies.includes('Armature pesanti'));assert.equal(m.sheet.armorClass,16+Math.min(s.abilityMods.dex,2));assert.ok(!m.sheet.inventory.some(i=>/cotta di maglia/i.test(i)));}
 const forge=await fixture('Dominio della Forgia',6),m=buildClericPrintModel(forge,await loadClericEvidence(forge));assert.equal(m.sheet.armorClass,19);assert.ok(m.sheet.toolProficiencies.includes('Strumenti da fabbro'));
});

test('Domain spells are always prepared and do not displace the ordinary prepared list; Aiuto is a spell',async()=>{
 for(const domain of supportedClericDomains()){
  const s=await fixture(domain.label,9),before=JSON.stringify(s),e=await loadClericEvidence(s),aug=addClericGrantedSpells(s,e);
  assert.equal(JSON.stringify(s),before);assert.deepEqual(aug.spellSlots,s.spellSlots);
  const names=new Set(e.domainSpells.map(s=>s.name.toLowerCase()));
  assert.equal(aug.spells.filter(s=>s.level>0&&!names.has(s.name.toLowerCase())).length,Math.max(1,s.level+s.abilityMods.wis));
  assert.ok(aug.spells.every(s=>s.fullTextMd?.includes('**Durata:**')));
  for(const entry of e.domainSpells){const spell=aug.spells.find(s=>s.name.toLowerCase()===entry.name.toLowerCase())!;assert.ok(spell.fullTextMd!.includes('sempre preparato'));assert.equal(spell.level,entry.level);}
 }
 const s=await fixture('Dominio della Pace',3),e=await loadClericEvidence(s),aug=addClericGrantedSpells(s,e);
 const aid=aug.spells.find(s=>s.name.toLowerCase()==='aiuto')!;assert.ok(aid.fullTextMd!.includes('**Componenti:**'));assert.ok(!aid.fullTextMd!.includes('azione di Aiuto'));
});

test('Granted cantrips retain all manual restrictions; incompatible choices fail',async()=>{
 const grave=await fixture('Dominio della Tomba',1),g=addClericGrantedSpells(grave,await loadClericEvidence(grave));const spare=g.spells.find(s=>s.name==='Salvare i Morenti')!;
 assert.ok(spare.fullTextMd!.includes('**Gittata:** 9 metri'));assert.ok(spare.fullTextMd!.includes('**Tempo di Lancio:** 1 azione bonus'));
 const light=await fixture('Dominio della Luce',1);assert.ok(addClericGrantedSpells(light,await loadClericEvidence(light)).spells.some(s=>s.name==='Luce'));
 const nature=await fixture('Dominio della Natura',1),e=await loadClericEvidence(nature);
 for(const name of DRUID_CANTRIPS.filter(n=>!nature.spells.some(s=>s.name.toLowerCase()===n.toLowerCase()))){const granted=addClericGrantedSpells(nature,e,{druidCantrip:name});assert.ok(granted.spells.some(s=>s.name===name));assert.equal(addClericGrantedSpells(granted,e,{druidCantrip:name}).spells.length,granted.spells.length);}
 assert.throws(()=>addClericGrantedSpells(nature,e,{druidCantrip:'Palla di Fuoco'}),/trucchetto/);
 assert.throws(()=>buildClericPrintModel(light, {...e,domainFeatures:[]},{skills:['arcana']}),/abilità/);
});

test('Tasha split and missing headings keep domains isolated and fail on absent evidence',async()=>{
 const domains=supportedClericDomains(),raw=fs.readFileSync('public/manuals/Tasha.md','utf8');
 for(const slug of ['tce-chierico-crepuscolo','tce-chierico-ordine','tce-chierico-pace']){const domain=domains.find(d=>d.slug===slug)!;const fs=extractManualSubclassFeatures(raw,domain,20,CLERIC_DOMAIN_FEATURES[slug]);assert.ok(!fs.at(-1)!.body.includes('DIVINITÀ DELLA'));assert.ok(fs.every(f=>!f.body.includes('Privilegio del Dominio')));}
 const twilight=await loadClericEvidence(await fixture('Dominio del Crepuscolo',2));const sanctuary=twilight.domainFeatures.find(f=>f.title.includes('SANTUARIO'))!.body;assert.ok(sanctuary.includes('Pone fine a un effetto'));assert.ok(!sanctuary.includes('Infligge un effetto'));
 const order=domains.find(d=>d.slug==='tce-chierico-ordine')!;assert.throws(()=>extractManualSubclassFeatures(raw.replace('## VOCE DELL\'AUTORITÀ','## MANCANTE'),order,1,CLERIC_DOMAIN_FEATURES[order.slug]),/non trovato/);
 await assert.rejects(async()=>loadClericEvidence(await fixture(null,1)),/Dominio/);
});

test('Every Cleric domain produces a complete PDF at levels 1 and 20',async()=>{
 for(const domain of supportedClericDomains())for(const level of [1,20]){const s=await fixture(domain.label,level),e=await loadClericEvidence(s),aug=addClericGrantedSpells(s,e);const bytes=await renderCharacterSheetV2(aug,fs.readFileSync('public/logo.png'),{clericEvidence:e});assert.ok((await PDFDocument.load(bytes)).getPageCount()>=3);}
});
