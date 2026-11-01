import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import { DRUID_CLASS_LEVELS, DRUID_CIRCLE_FEATURES, DRUID_LAND_TERRAINS, druidCircleFromLabel, type DruidChoices } from '@/lib/sheet-generator/druid-circles';
import { extractLeveledFeatures, normalizeFeatureTitle, printPlainText, type PrintFeature } from '@/lib/sheet-generator/manual-feature-text';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import type { GeneratedCharacterSheet } from '@/lib/sheet-generator/types';
import type { DruidEvidence } from '@/lib/sheet-generator/druid-circles';
import { manualSpellFromSources } from './manual-spell-source';
import { DRUID_CANTRIPS } from '@/lib/sheet-generator/cleric-domains';
import { extractSpellListByMaxLevel, parseSpellsWithLevelFromList } from '@/lib/sheet-generator/rules-resolver';
import { filterTorneoCombatSpells } from '@/lib/sheet-generator/spell-torneo-combat';

function tableRows(part:string){
 const html=[...part.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<td>([\s\S]*?)<\/td>/gi)].map(c=>printPlainText(c[1]))).filter(r=>r.length===2);
 return html.length?html:part.split('\n').filter(l=>/^\|\s*\d+[°º]?\s*\|/.test(l)).map(l=>l.split('|').slice(1,-1).map(v=>v.trim()));
}
function circleTable(raw:string,heading:string){
 const escaped=heading.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),m=new RegExp('^#{1,6}\\s+'+escaped+'\\s*$','im').exec(raw);if(!m)throw new Error(`Tabella incantesimi ${heading} non trovata.`);
 const tail=raw.slice(m.index+m[0].length),next=tail.search(/^#{1,6}\s+/m),part=next<0?tail:tail.slice(0,next);
 return tableRows(part);
}

export async function loadDruidEvidence(sheet:GeneratedCharacterSheet,origin?:string,choices:DruidChoices={}):Promise<DruidEvidence>{
 await preloadManualMarkdownFile('manuale_giocatore.md',origin);
 const raw=getManualMarkdownByFileName('manuale_giocatore.md'),start=raw.search(/^# DRUIDO\s*$/m),end=raw.indexOf('\n# GUERRIERO',start);
 if(start<0||end<0)throw new Error('Capitolo Druido non trovato nel Manuale del Giocatore.');
 const chapter=raw.slice(start,end),featureText=chapter;
 const classFeatures=extractLeveledFeatures(featureText,DRUID_CLASS_LEVELS,sheet.level,'Manuale del Giocatore / Druido / manuale_giocatore.md');
 for(const [title,level] of Object.entries(DRUID_CLASS_LEVELS))if(level<=sheet.level&&!classFeatures.some(f=>normalizeFeatureTitle(f.title)===title))throw new Error(`Privilegio del Druido ${title} non trovato nel PHB.`);
 const rows=[...chapter.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<td>([\s\S]*?)<\/td>/gi)].map(c=>printPlainText(c[1]))).filter(r=>r.length===13);
 const row=rows.find(r=>Number.parseInt(r[0])===sheet.level);if(!row)throw new Error('Progressione del Druido non trovata nella tabella PHB.');
 const slots=Object.fromEntries(row.slice(4).map((v,i)=>[i+1,/^[—–-]$/.test(v)?0:Number(v)])) as DruidEvidence['slots'];
 const cantrips=Number(row[3]);if(!Number.isInteger(cantrips)||cantrips<2||Object.values(slots).some(v=>!Number.isInteger(v)||v<0))throw new Error('Progressione incantesimi Druido non valida.');
 const circle=druidCircleFromLabel(sheet.classSubclass);if(sheet.level>=2&&!circle)throw new Error('Scegli un Circolo Druidico disponibile nei manuali.');
 let circleFeatures:PrintFeature[]=[],grantedSpells:DruidEvidence['grantedSpells']=[],landTerrain:DruidEvidence['landTerrain'];
 if(circle&&sheet.level>=2){const file=circle.supplementRulesSource.markdownFile;await preloadManualMarkdownFile(file,origin);circleFeatures=extractManualSubclassFeatures(getManualMarkdownByFileName(file),circle,sheet.level,DRUID_CIRCLE_FEATURES[circle.slug]);
  // In the local Tasha scan the Star Map caption and feature title are both headings; keep its rules once.
  circleFeatures=circleFeatures.filter((f,i,a)=>a.findIndex(v=>v.title===f.title)===i);
  const omen=circleFeatures.find(f=>f.title==='PROFEZIA COSMICA');
  if(omen)omen.body=omen.body.replace(/Sventura \(dispari\)([\s\S]*?)aggiungere il numero ottenuto al totale/i,'Sventura (dispari)$1sottrarre il numero ottenuto dal totale');
  const add=(name:string,spellLevel:number,unlock:number)=>{if(unlock<=sheet.level){const title=name.trim();const display=title?title[0].toLocaleUpperCase('it')+title.slice(1):title;grantedSpells.push(manualSpellFromSources(display,spellLevel,`Sempre preparato dal ${circle.label} (si sblocca al livello ${unlock} da druido); non conta nel limite degli incantesimi preparati.`));}};
  if(circle.slug==='phb-druido-terra'){
   landTerrain=choices.landTerrain??'Foresta';if(!DRUID_LAND_TERRAINS.some(v=>v===landTerrain))throw new Error('Scegli un terreno del Circolo della Terra.');
   const cantrip=choices.landCantrip??DRUID_CANTRIPS.find(n=>!sheet.spells.some(s=>s.name.toLocaleLowerCase('it')===n.toLocaleLowerCase('it')));
   if(!cantrip||!DRUID_CANTRIPS.some(n=>n===cantrip)||sheet.spells.some(s=>s.name.toLocaleLowerCase('it')===cantrip.toLocaleLowerCase('it')))throw new Error('Scegli un trucchetto da druido diverso da quelli già conosciuti.');
   grantedSpells.push(manualSpellFromSources(cantrip,0,'Trucchetto aggiuntivo del Circolo della Terra.'));
   const phb=getManualMarkdownByFileName('manuale_giocatore.md'),circleStart=phb.indexOf('## CIRCOLO DELLA TERRA',start),landChapter=phb.slice(circleStart,end),h=new RegExp('^###\\s+'+landTerrain+'\\s*$','im'),m=h.exec(landChapter);if(!m)throw new Error(`Terreno ${landTerrain} non trovato nel PHB.`);
   const tail=landChapter.slice(m.index+m[0].length),next=tail.search(/^#{1,6}\s+/m),rows=tableRows(next<0?tail:tail.slice(0,next));
   for(const [unlockText,names] of rows){const unlock=Number.parseInt(unlockText);if(![3,5,7,9].includes(unlock))continue;for(const name of names.split(','))add(name.trim(),Math.ceil(unlock/2),unlock);}
  }else if(circle.slug==='tce-druido-fiamma'||circle.slug==='tce-druido-spore'){
   const rawCircle=getManualMarkdownByFileName(file),heading=circle.slug==='tce-druido-fiamma'?'INCANTESIMI DEL CIRCOLO DELLA FIAMMA':'INCANTESIMI DEL CIRCOLO DELLE SPORE';
   for(const [unlockText,names] of circleTable(rawCircle,heading)){const unlock=Number.parseInt(unlockText);if(![2,3,5,7,9].includes(unlock))continue;for(const name of names.split(',')){if(circle.slug==='tce-druido-spore'&&unlock===2&&/tocco gelido/i.test(name))continue;add(name.trim(),unlock===2?1:Math.ceil(unlock/2),unlock);}}
   if(circle.slug==='tce-druido-spore')add('Tocco Gelido',0,2);
  }else if(circle.slug==='tce-druido-stelle'){
   add('Dardo Tracciante',1,2);grantedSpells.push(manualSpellFromSources('Guida',0,'Trucchetto aggiuntivo del Circolo delle Stelle (Carta Celeste).'));
  }
 }
 if((choices.landTerrain||choices.landCantrip)&&!(circle?.slug==='phb-druido-terra'&&sheet.level>=2))throw new Error('Le scelte del terreno e del trucchetto richiedono il Circolo della Terra dal livello 2.');
 return {classFeatures,circleFeatures,slots,cantrips,grantedSpells,landTerrain};
}

export async function addDruidGrantedSpells(original:GeneratedCharacterSheet,evidence:DruidEvidence,torneoMode=false){
 const sheet=structuredClone(original);
 const bonusCantrips=evidence.grantedSpells.filter(s=>s.level===0),bonusNames=new Set(bonusCantrips.map(s=>s.name.toLocaleLowerCase('it')));
 for(const spell of evidence.grantedSpells){const existing=sheet.spells.find(s=>s.name.toLocaleLowerCase('it')===spell.name.toLocaleLowerCase('it'));if(existing){existing.summary=spell.summary;existing.fullTextMd=spell.fullTextMd;existing.ritual=spell.ritual;existing.concentration=spell.concentration;existing.verbal=spell.verbal;existing.somatic=spell.somatic;existing.material=spell.material;}else sheet.spells.push(spell);}
 for(const grant of bonusCantrips){if(original.spells.some(s=>s.name.toLocaleLowerCase('it')===grant.name.toLocaleLowerCase('it'))){const replacement=DRUID_CANTRIPS.find(name=>!sheet.spells.some(s=>s.level===0&&s.name.toLocaleLowerCase('it')===name.toLocaleLowerCase('it'))&&!bonusNames.has(name.toLocaleLowerCase('it')));if(!replacement)throw new Error('Nessun trucchetto da druido disponibile per sostituire la scelta già concessa dal circolo.');sheet.spells.push(manualSpellFromSources(replacement,0,`Trucchetto aggiuntivo sostitutivo scelto nella V2: ${grant.name} era già conosciuto.`));}}
 sheet.cantripsKnown+=bonusCantrips.length;
 const grantKeys=new Set(evidence.grantedSpells.filter(s=>s.level>0).map(s=>s.name.toLocaleLowerCase('it')));
 let ordinaryCount=sheet.spells.filter(s=>s.level>0&&!grantKeys.has(s.name.toLocaleLowerCase('it'))).length;
 const prepared=sheet.spellsPrepared,maxLevel=Math.max(0,...Object.entries(evidence.slots).filter(([,count])=>count>0).map(([level])=>Number(level)));
 if(ordinaryCount<prepared){const raw=getManualMarkdownByFileName('manuale_giocatore.md'),start=raw.indexOf('# INCANTESIMI DA DRUIDO'),end=raw.indexOf('\n# INCANTESIMI DA MAGO',start),list=start>=0&&end>start?raw.slice(start,end):'';if(!list)throw new Error('Lista degli incantesimi da Druido non trovata nel PHB.');
  const entries=parseSpellsWithLevelFromList(extractSpellListByMaxLevel(list,maxLevel)).filter(s=>s.level>0&&s.level<=maxLevel&&!/^\d+$/.test(s.name));const candidates=torneoMode?filterTorneoCombatSpells(entries):entries;
  for(const entry of candidates){if(ordinaryCount>=prepared)break;if(sheet.spells.some(s=>s.name.toLocaleLowerCase('it')===entry.name.toLocaleLowerCase('it')))continue;sheet.spells.push(manualSpellFromSources(entry.name,entry.level,'Preparazione ordinaria aggiunta nella V2 per sostituire uno o più incantesimi scelti già sempre preparati dal circolo.'));ordinaryCount++;}
 }
 if(ordinaryCount<prepared)throw new Error('La lista del Druido non consente di completare gli incantesimi preparati dopo le magie del circolo.');
 return sheet;
}
