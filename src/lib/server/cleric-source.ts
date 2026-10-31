import { parseSpellsWithLevelFromList, extractSpellListByMaxLevel } from '@/lib/sheet-generator/rules-resolver';
import { filterTorneoCombatSpells } from '@/lib/sheet-generator/spell-torneo-combat';
import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import { CLERIC_CLASS_LEVELS, CLERIC_DOMAIN_FEATURES, clericDomainFromLabel, DRUID_CANTRIPS, type ClericChoices } from '@/lib/sheet-generator/cleric-domains';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import { printPlainText, normalizeFeatureTitle, type PrintFeature } from '@/lib/sheet-generator/manual-feature-text';
import type { GeneratedCharacterSheet, GeneratedSpell } from '@/lib/sheet-generator/types';
import type { ClericEvidence } from '@/lib/sheet-generator/cleric-print-model';

/** Explicit corrections of transcription errors; originals remain untouched. */
const SPELL_ALIASES:Record<string,string>={'bagliare lunare':'bagliore lunare'};
const spellKey=(s:string)=>s.toLocaleLowerCase('it').replace(/[’‘]/g,"'").trim();
function tableRows(raw:string):string[][]{
 if(raw.includes('<table>'))return [...raw.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<td>([\s\S]*?)<\/td>/gi)].map(c=>printPlainText(c[1]))).filter(r=>r.length);
 return raw.split('\n').filter(l=>/^\|\s*\d+[°º]?\s*\|/.test(l)).map(l=>l.split('|').slice(1,-1).map(v=>v.trim()));
}
function classBlocks(chapter:string,level:number):PrintFeature[]{
 const headings=[...chapter.matchAll(/^#{1,6}\s+(.+)$/gm)];
 return Object.entries(CLERIC_CLASS_LEVELS).flatMap(([title,unlock])=>{
  if(unlock>level)return [];
  const h=headings.find(h=>normalizeFeatureTitle(h[1])===normalizeFeatureTitle(title));if(!h)throw new Error(`Privilegio ${title} non trovato nel PHB.`);
  // Same-named nested Destroy Undead table belongs to its parent rule, not a second feature.
  const end=headings.find(n=>n.index!>h.index!&&normalizeFeatureTitle(n[1])!==normalizeFeatureTitle(title))?.index??chapter.length;
  let body=chapter.slice(h.index!+h[0].length,end).trim();
  if(!body)throw new Error(`Testo vuoto per ${title}.`);
  if(title==='INTERVENTO DIVINO'&&level<20)body=body.replace(/Al 20° livello[^\n]*/,'').trim();
  return [{title,level:unlock,body,source:'Manuale del Giocatore / Chierico / manuale_giocatore.md'}];
 });
}
export async function loadClericEvidence(sheet:GeneratedCharacterSheet,origin?:string):Promise<ClericEvidence>{
 await preloadManualMarkdownFile('manuale_giocatore.md',origin);
 const raw=getManualMarkdownByFileName('manuale_giocatore.md');
 const start=raw.search(/^# CHIERICO\s*$/m),end=raw.indexOf('\n## DOMINI DIVINI',start);
 if(start<0||end<0)throw new Error('Capitolo Chierico non trovato nel PHB.');
 const chapter=raw.slice(start,end),classFeatures=classBlocks(chapter,sheet.level);
 const progressionRows=tableRows(chapter).filter(r=>r.length===13);
 const row=progressionRows.find(r=>Number.parseInt(r[0])===sheet.level);
 if(!row)throw new Error('Progressione Chierico non trovata nella tabella PHB.');
 const slots=Object.fromEntries(row.slice(4).map((n,i)=>[i+1,n?Number(n):0])) as GeneratedCharacterSheet['spellSlots'];
 if(Object.values(slots).some(n=>!Number.isInteger(n)||n<0)||!Number(row[3]))throw new Error('Progressione incantesimi Chierico non valida.');
 const channelRow=progressionRows.filter(r=>Number.parseInt(r[0])<=sheet.level&&/Incanalare Divinità \(\d\/riposo\)/i.test(r[2])).at(-1);
 const channelUses=Number(channelRow?.[2].match(/Incanalare Divinità \((\d)\/riposo\)/i)?.[1]??0);
 if(sheet.level>=2&&!channelUses)throw new Error('Progressione Incanalare Divinità non risolta.');
 const destroyRows=tableRows(chapter).filter(r=>r.length===2&&/^\d+[°º]$/.test(r[0]));
 const undeadCr=destroyRows.filter(r=>Number.parseInt(r[0])<=sheet.level).at(-1)?.[1].replace(/ o inferiore$/,'')??null;
 if(sheet.level>=5&&!undeadCr)throw new Error('Soglia Distruggere Non Morti non trovata.');
 const domain=clericDomainFromLabel(sheet.classSubclass);
 if(!domain)throw new Error('Scegli un Dominio Divino catalogato: il Chierico lo ottiene al livello 1.');
 const file=domain.supplementRulesSource.markdownFile;await preloadManualMarkdownFile(file,origin);
 const domainRaw=getManualMarkdownByFileName(file);
 const domainFeatures=extractManualSubclassFeatures(domainRaw,domain,sheet.level,CLERIC_DOMAIN_FEATURES[domain.slug]);
 // Local Tasha scan reverses the meaning of this benefit. Verified against the published D&D Beyond feature.
 // https://www.dndbeyond.com/sheet-pdfs/f5psf6gmvn_142395168.pdf (TCoE Twilight Sanctuary).
 const sanctuary=domainFeatures.find(f=>f.title==='INCANALARE DIVINITÀ: SANTUARIO DEL CREPUSCOLO');
 if(sanctuary)sanctuary.body=sanctuary.body.replace('ottiene uno di questi benefici:','il chierico può concederle uno di questi benefici:').replace('Infligge un effetto alla creatura causandogli le condizioni affascinato o spaventato.','Pone fine a un effetto che causa alla creatura la condizione affascinato o spaventato.');
 const title='INCANTESIMI DEL '+domain.sectionHeadings[0];
 const tableStart=domainRaw.search(new RegExp('^#{1,6}\\s+'+title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*$','m'));
 if(tableStart<0)throw new Error(`Tabella incantesimi di ${domain.label} non trovata.`);
 const tail=domainRaw.slice(tableStart).replace(/^#{1,6}[^\n]*\n/,'');
 const next=tail.search(/^#{1,6}\s/m),table=next<0?tail:tail.slice(0,next);
 const rows=tableRows(table);
 if(rows.length!==5||rows.some((r,i)=>Number.parseInt(r[0])!==[1,3,5,7,9][i]||r.length!==2))throw new Error(`Tabella incantesimi incompleta per ${domain.label}.`);
 const domainSpells=rows.flatMap(([unlock,names])=>Number.parseInt(unlock)>sheet.level?[]:names.split(',').map(name=>({name:SPELL_ALIASES[spellKey(name)]??name.trim(),unlock:Number.parseInt(unlock),level:(Number.parseInt(unlock)+1)/2})));
 if(domainSpells.length!==2*Math.min(5,Math.ceil(sheet.level/2)))throw new Error('Numero incantesimi di dominio non valido.');
 return {classFeatures,domainFeatures,domainSpells,channelUses,undeadCr,cantrips:Number(row[3]),slots};
}

/** Limit lookup to the spell-description chapter: “Aiuto” also names a combat action earlier in PHB. */
function spellDescription(name:string){
 const raw=getManualMarkdownByFileName('manuale_giocatore.md');
 const chapter=raw.slice(raw.search(/^# DESCRIZIONE DEGLI INCANTESIMI\s*$/m));
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const h=new RegExp('^#{1,6}\\s+'+escaped+'(?:\\s*\\([^)]*\\))?\\s*$','im').exec(chapter);
 if(!h)return '';
 const tail=chapter.slice(h.index+h[0].length),end=tail.search(/^#{1,6}\s+/m);
 return chapter.slice(h.index,h.index+h[0].length+(end<0?tail.length:end)).trim().replace(/\*\*(Tempo di Lancio|Gittata|Componenti|Durata)\*\*\s*:/g,'**$1:**');
}
function sourceSpell(name:string,expectedLevel:number,note=''):GeneratedSpell{
 const raw=spellDescription(name);if(!raw)throw new Error(`Testo del manuale non trovato per ${name}.`);
 const level=/Trucchetto/i.test(raw)?0:Number(raw.match(/(\d+)[°º]? livello/i)?.[1]);
 if(level!==expectedLevel)throw new Error(`Livello incantesimo non verificato per ${name}.`);
 const components=raw.match(/\*\*Componenti:\*\*\s*([^\n]+)/)?.[1]??'';
 return {name,level,summary:note,fullTextMd:(note?note+'\n\n':'')+raw,ritual:/\(rituale\)/i.test(raw),concentration:/\*\*Durata:\*\*\s*Concentrazione/i.test(raw),verbal:/\bV\b/.test(components),somatic:/\bS\b/.test(components),material:/\bM\b/.test(components)};
}
export function addClericGrantedSpells(original:GeneratedCharacterSheet,evidence:ClericEvidence,choices:ClericChoices={},torneoMode=false){
 const sheet=structuredClone(original),domain=clericDomainFromLabel(sheet.classSubclass)!;
 sheet.spells=sheet.spells.filter(s=>!/^(?:\d+|CAPITOLO\s+\d+\s*\|.*)$/i.test(s.name.trim())).map(s=>({...sourceSpell(s.name,s.level,s.summary.startsWith('Trucchetto aggiuntivo da druido: Accolito della Natura.')?s.summary:'')}));
 const add=(spell:GeneratedSpell)=>{const i=sheet.spells.findIndex(s=>spellKey(s.name)===spellKey(spell.name));if(i<0)sheet.spells.push(spell);else sheet.spells[i]=spell;};
 for(const entry of evidence.domainSpells)add(sourceSpell(entry.name,entry.level,`Incantesimo di dominio: sempre preparato, non conta nel limite giornaliero (${domain.label}, livello ${entry.unlock}).`));
 if(domain.slug==='phb-chierico-luce')add(sourceSpell('Luce',0,'Trucchetto bonus del Dominio della Luce.'));
 if(domain.slug==='xge-chierico-tomba'){
  const spell=sourceSpell('Salvare i Morenti',0,'Trucchetto aggiuntivo: Cerchio di Mortalità.');
  spell.fullTextMd=spell.fullTextMd!.replace(/\*\*Gittata:\*\*[^\n]*/,'**Gittata:** 9 metri (Cerchio di Mortalità)').replace(/\*\*Tempo di Lancio:\*\*[^\n]*/,'**Tempo di Lancio:** 1 azione bonus (Cerchio di Mortalità)');add(spell);
 }
 if(domain.slug==='phb-chierico-natura'){
  const prior=sheet.spells.find(s=>s.summary.startsWith('Trucchetto aggiuntivo da druido: Accolito della Natura.'));
  const name=choices.druidCantrip??prior?.name??DRUID_CANTRIPS.find(n=>!sheet.spells.some(s=>spellKey(s.name)===spellKey(n)))!;
  if(!DRUID_CANTRIPS.some(n=>n===name))throw new Error('Scegli un trucchetto da druido del PHB.');
  if(sheet.spells.some(s=>spellKey(s.name)===spellKey(name))&&prior?.name!==name)throw new Error('Il trucchetto aggiuntivo deve essere diverso da quelli già conosciuti.');
  add(sourceSpell(name,0,'Trucchetto aggiuntivo da druido: Accolito della Natura. Caratteristica: Saggezza.'));
 }else if(choices.druidCantrip)throw new Error('Il trucchetto da druido richiede il Dominio della Natura.');
 // A domain spell already selected in V1 frees an ordinary preparation. Fill that place from the actual class list.
 const domainNames=new Set(evidence.domainSpells.map(s=>spellKey(s.name)));
 const prepared=Math.max(1,sheet.level+sheet.abilityMods.wis);
 const maxLevel=Math.max(...Object.entries(evidence.slots).filter(([,n])=>n>0).map(([n])=>Number(n)));
 const raw=getManualMarkdownByFileName('manuale_giocatore.md');
 const list=raw.split(/^#{1,6} INCANTESIMI DA CHIERICO\s*$/m)[1]?.split(/^#{1,6} INCANTESIMI DA DRUIDO\s*$/m)[0];
 if(!list)throw new Error('Lista incantesimi da Chierico non trovata nel PHB.');
 const entries=parseSpellsWithLevelFromList(extractSpellListByMaxLevel(list,maxLevel)).filter(e=>e.level>0&&e.level<=maxLevel&&!/^\d+$/.test(e.name)&&spellDescription(e.name));
 const candidates=torneoMode?filterTorneoCombatSpells(entries):entries;
 let normalCount=sheet.spells.filter(s=>s.level>0&&!domainNames.has(spellKey(s.name))).length;
 for(const entry of candidates){if(normalCount>=prepared)break;if(sheet.spells.some(s=>spellKey(s.name)===spellKey(entry.name)))continue;add(sourceSpell(entry.name,entry.level,'Preparazione ordinaria aggiunta nella V2: gli incantesimi di dominio non consumano questo limite.'));normalCount++;}
 if(normalCount<prepared)throw new Error('La lista sorgente non consente di completare gli incantesimi preparati.');
 return sheet;
}
