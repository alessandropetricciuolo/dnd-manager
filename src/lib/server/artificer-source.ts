import { getManualMarkdownByFileName, preloadManualMarkdownFile } from './phb-spell-excerpt';
import { ARTIFICER_CLASS_LEVELS, ARTIFICER_SPECIALIST_FEATURES, INFUSION_SPECS, artificerSpecialist } from '@/lib/sheet-generator/artificer-catalog';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import { printPlainText } from '@/lib/sheet-generator/manual-feature-text';
import type { ArtificerEvidence, ArtificerInfusion } from '@/lib/sheet-generator/artificer-types';
import type { GeneratedCharacterSheet } from '@/lib/sheet-generator/types';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toUpperCase();
const REPLICA_ALIASES:Record<string,string>={'Amuieto della salute':'Amuleto della Salute','Broccoli della difesa':'Bracciali della Difesa','Stivali malleggiati':'Stivali Molleggiati','Faretra di Ehionna':'Faretra di Ehlonna','Guanti catturoproiettili':'Guanti Catturaproiettili','Capricapo del respirare sott\'acqua':"Copricapo del Respirare Sott'Acqua"};
export function normalizeArtificerManual(raw:string){
 const names=new Set([...Object.keys(ARTIFICER_CLASS_LEVELS),...Object.values(ARTIFICER_SPECIALIST_FEATURES).flat().map(([n])=>n),'ARMAIOLO','INCANTESSIMI DA ARMAIOLO']);
 const seen=new Set<string>();
 return raw.replace(/^(?:#{1,6}\s+)?\*{0,2}Privilegio (?:dell['’](?:Artefice|Alchimista|Armaiolo|Artigliere)|del Fabbro da Battaglia)[^\n]*$/gim,'').split('\n').map(line=>{
  const title=line.replace(/^#{1,6}\s+/,'').trim();
  if((title==='ELISIR SPERIMENTALE'||title==="DIFENSORE D'ACCIAIO")&&/^#{1,6}/.test(line)){
   if(seen.has(title))return '### '+title+' - STATISTICHE E TABELLA';seen.add(title);
  }
  return names.has(title)&&!line.startsWith('#')?'## '+title:line;
 }).join('\n');
}
function sections(raw:string){return [...raw.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m=>({title:m[1].trim(),index:m.index!,end:m.index!+m[0].length}));}
function sourceBlock(raw:string,title:string){const headings=sections(raw),h=headings.find(h=>norm(h.title)===norm(title));if(!h)return '';const next=headings.find(n=>n.index>h.index);return raw.slice(h.end,next?.index??raw.length).trim();}
function magicItem(raw:string,name:string){
 const headings=sections(raw);const candidates=headings.filter(h=>norm(h.title)===norm(name));
 for(const h of candidates){const next=headings.find(n=>n.index>h.index),body=raw.slice(h.end,next?.index??raw.length).trim();if(/richiede sintonia|oggetto meraviglioso|anello,|bacchetta,/i.test(body.slice(0,240)))return body;}
 return '';
}
export async function loadArtificerEvidence(level:number,subclass:string|null,origin?:string):Promise<ArtificerEvidence>{
 await Promise.all([preloadManualMarkdownFile('Tasha.md',origin),preloadManualMarkdownFile('DM_5th_master.md',origin),preloadManualMarkdownFile('xanathar.md',origin)]);
 const raw=normalizeArtificerManual(getManualMarkdownByFileName('Tasha.md'));
 const chapter=raw.slice(raw.indexOf('# ARTEFICE')).split(/^# BARBARO\s*$/m)[0],classRaw=chapter.split(/^## SPECIALIZZAZIONI DA ARTEFICE\s*$/m)[0];
 const rows=sourceBlock(chapter,"L'ARTEFICE").split('\n').filter(l=>/^\|\s*\d+°\s*\|/.test(l)).map(l=>l.split('|').slice(1,-1).map(v=>v.trim()));
 const row=rows.find(r=>Number.parseInt(r[0])===level);if(!row||row.length!==11)throw new Error('Progressione Artefice non trovata nella tabella di Tasha.');
 const numeric=(s:string)=>/^[—–-]$/.test(s)?0:Number(s);
 const knownLimit=numeric(row[3]),itemLimit=numeric(row[4]),cantrips=numeric(row[5]);
 const slots=Object.fromEntries(Array.from({length:9},(_,i)=>[i+1,i<5?numeric(row[i+6]):0])) as GeneratedCharacterSheet['spellSlots'];
 if([knownLimit,itemLimit,cantrips,...Object.values(slots)].some(n=>!Number.isInteger(n)||n<0))throw new Error('Valori non validi nella progressione Artefice.');
 const classFeatures=Object.entries(ARTIFICER_CLASS_LEVELS).flatMap(([title,unlock])=>{
  if(unlock>level)return [];const body=sourceBlock(classRaw,title).replace(/^(?:#{1,6}\s+)?Privilegio dell'Artefice[^\n]*\n/gim,'').trim();if(!body)throw new Error(`Privilegio ${title} non trovato in Tasha.`);
  return [{title,body,level:unlock,source:'Tasha / Artefice / Tasha.md'}];
 });
 const specialist=artificerSpecialist(subclass);
 if(level>=3&&subclass&&!specialist)throw new Error('Specializzazione Artefice non catalogata.');
 const specialistRaw=chapter.split(/^## INFUSIONI DA ARTEFICE\s*$/m)[0].replace(/^#{1,6} INCANTESS?IMI DA [^\n]+\n[\s\S]*?(?=^#{1,6} |$(?![\s\S]))/gm,'');
 const specialistFeatures=level>=3&&specialist?extractManualSubclassFeatures(specialistRaw,specialist,level,ARTIFICER_SPECIALIST_FEATURES[specialist.slug]):[];
 for(const f of specialistFeatures){if(f.title==="DIFENSORE D'ACCIAIO")f.body=f.body.replace('modificatore di Intelligenza del personaggio = cinque volte','modificatore di Intelligenza del personaggio + cinque volte').replace('14 (+2) | 12 (+1) | 14 (+2) | 4 (-1)','14 (+2) | 12 (+1) | 14 (+2) | 4 (-3)');if(f.title==='MAESTRIA NELLA CHIMICA')f.body=f.body.replace('ristorare superiore e cara ferita','ristorare superiore e guarigione');}
 const infusionRaw=chapter.split(/^## INFUSIONI DA ARTEFICE\s*$/m)[1];if(!infusionRaw)throw new Error('Sezione infusioni non trovata in Tasha.');
 const headings=sections(infusionRaw),infusions:ArtificerInfusion[]=[];
 for(const [id,title,targets] of INFUSION_SPECS){const h=headings.find(h=>h.title===title);if(!h)throw new Error(`Infusione ${title} non trovata.`);
  const next=headings.find(n=>n.index>h.index&&n.title!==title&&INFUSION_SPECS.some(([,t])=>t===n.title));let body=infusionRaw.slice(h.end,next?.index??infusionRaw.length).trim();
  // Replicate's tables are a different feature, not part of Mind Sharpener's text.
  if(id==='mind')body=body.split(/^## REPLICARE UN OGGETTO MAGICO\s*$/m)[0].trim();
  const minimum=Number(body.match(/Prerequisiti:\s*artefice di (\d+)° livello/i)?.[1]??2);
  infusions.push({id,title,targets,level:minimum,attunement:/Oggetto:[^\n]*richiede sintonia/i.test(body),body,source:'Tasha / Infusioni da Artefice / Tasha.md'});
 }
 const dmg=getManualMarkdownByFileName('DM_5th_master.md').replace(/^Offrimi un caffè:[^\n]*$/gm,'').replace(/<page_header>[\s\S]*?<\/page_header>/g,'');
 for(const minimum of [2,6,10,14]){const body=sourceBlock(infusionRaw,`OGGETTI REPLICABILI (ARTEFICE DI ${minimum}° LIVELLO)`);
  const entries=body.split('\n').filter(l=>/^\|[^|]+\|\s*(?:No|Sì)\s*\|/.test(l)).map(l=>l.split('|').slice(1,-1).map(v=>v.trim()));
  if(!entries.length)throw new Error(`Tabella repliche livello ${minimum} non trovata.`);
  for(const [original,attunement] of entries){const name=REPLICA_ALIASES[original]??original;const replicaBody=magicItem(dmg,/Cintura della forza dei giganti delle colline/i.test(name)?'Cintura della Forza dei Giganti':name);
   infusions.push({id:'replicate-'+norm(name).replace(/[^A-Z0-9]+/g,'-').toLowerCase(),title:'Replicare: '+name,level:minimum,attunement:attunement==='Sì',targets:['replica',...(/stivali/i.test(name)?['boots' as const]:/^anello/i.test(name)?['ring' as const]:/^bacchetta/i.test(name)?['focus' as const]:[])],body:sourceBlock(infusionRaw,'REPLICARE UN OGGETTO MAGICO'),source:'Tasha / Oggetti Replicabili; Dungeon Master / DM_5th_master.md',replica:name,replicaBody});
  }
 }
 const specialistSpells:ArtificerEvidence['specialistSpells']=[];
 if(level>=3&&specialist){const title=specialist.slug==='tce-artefice-armaiolo'?'INCANTESSIMI DA ARMAIOLO':specialist.slug==='tce-artefice-fabbro-battaglia'?'INCANTESIMI DA FABBRO DA BATTAGLIA':specialist.slug==='tce-artefice-artigliere'?'INCANTESIMI DA ARTIGLIERE':'INCANTESIMI DA ALCHIMISTA';
  // These headings occur twice: the second occurrence holds the table.
  const tables=chapter.split(new RegExp('^#{1,6} '+title+'\\s*$','m')).slice(1).map(p=>p.split(/^#{1,6}\s/m)[0]);
  const table=tables.find(t=>/^\|\s*3°\s*\|/m.test(t));if(!table)throw new Error('Tabella incantesimi di specializzazione non trovata.');
  const aliases:Record<string,string>={'raggia di infermità':'raggio di infermità','nube mortali':'nube mortale','trama iprotica':'trama ipnotica','cura ferite di mossa':'cura ferite di massa','oura di vitalità':'aura di vitalità','oura di purezza':'aura di purezza'};
  for(const line of table.split('\n')){const m=line.match(/^\|\s*(\d+)°\s*\|\s*([^|]+)\|/);if(m&&Number(m[1])<=level)for(const name of m[2].split(',').map(s=>s.trim()))specialistSpells.push({name:aliases[name]??name,level:Math.floor((Number(m[1])+3)/4),unlock:Number(m[1])});}
 }
 return {classFeatures,specialistFeatures,infusions,knownLimit,itemLimit,cantrips,slots,specialistSpells};
}


/** Always-prepared specialist spells use their actual PHB descriptions and do not consume ordinary preparations. */
export async function addArtificerSpecialistSpells(sheet:GeneratedCharacterSheet,evidence:ArtificerEvidence,origin?:string,torneoMode=false){
 const {manualSpellFromSources}=await import('./manual-spell-source');
 const {preloadPhbMarkdown}=await import('./phb-spell-excerpt');await preloadPhbMarkdown(origin);
 const isArtificerOrigin=(o?:string)=>!o||o==='class'||o==='subclass';
 sheet.spells=sheet.spells
  .filter(s=>!/^\d+$|^CAPITOLO\s/i.test(s.name))
  .map(s=>isArtificerOrigin(s.origin)?manualSpellFromSources(s.name,s.level,'',{origin:'class',sourceLabel:'Artefice',ability:'int',alwaysPrepared:false,requiresSlot:s.level>0}):s);
 const spellKey=(s:string)=>s.toLocaleLowerCase('it').replace(/[’‘]/g,"'").trim();
 const specialistLabel=sheet.classSubclass??'Specializzazione da Artefice';
 for(const entry of evidence.specialistSpells){
  const spell=manualSpellFromSources(entry.name,entry.level,`Sempre preparato: specializzazione da Artefice (livello ${entry.unlock}). Non conta nel limite giornaliero.`,{origin:'subclass',sourceLabel:specialistLabel,ability:'int',alwaysPrepared:true,requiresSlot:true});
  const i=sheet.spells.findIndex(s=>isArtificerOrigin(s.origin)&&spellKey(s.name)===spellKey(entry.name));
  if(i<0)sheet.spells.push(spell);else sheet.spells[i]=spell;
 }
 const names=new Set(evidence.specialistSpells.map(s=>spellKey(s.name)));
 const countOrdinary=()=>sheet.spells.filter(s=>s.level>0&&(!s.origin||s.origin==='class')&&!names.has(spellKey(s.name))).length;
 const {loadClassSpellPool}=await import('@/lib/sheet-generator/rules-resolver');
 const max=Math.max(...Object.entries(evidence.slots).filter(([,n])=>n>0).map(([n])=>Number(n)));
 const {entries,torneoPool}=await loadClassSpellPool({classLabel:'Artefice',classSubclass:sheet.classSubclass,level:sheet.level,torneoMode,tcWizard:false},max,origin);
 const candidates=torneoMode?torneoPool:entries;
 for(const entry of candidates){
  if(countOrdinary()>=sheet.spellsPrepared)break;
  if(entry.level===0||sheet.spells.some(s=>isArtificerOrigin(s.origin)&&spellKey(s.name)===spellKey(entry.name)))continue;
  // This class list includes PHB spells; missing descriptions fail visibly rather than produce fabricated text.
  sheet.spells.push(manualSpellFromSources(entry.name,entry.level,'Preparazione ordinaria aggiunta: gli incantesimi della specializzazione non consumano questo limite.',{origin:'class',sourceLabel:'Artefice',ability:'int',alwaysPrepared:false,requiresSlot:true}));
 }
 for(const spell of sheet.spells){
  if(!isArtificerOrigin(spell.origin))continue;
  spell.material=true;
  spell.fullTextMd='Artefice - Strumenti Necessari: il lancio richiede un focus (arnesi da scasso, strumenti da artigiano o, dal livello 2, un oggetto con una tua infusione). Questo aggiunge la componente M; le eventuali componenti costose o consumate restano richieste.\n\n'+spell.fullTextMd;
 }
 if(countOrdinary()<sheet.spellsPrepared)throw new Error('Preparazioni ordinarie Artefice incomplete nella lista sorgente.');
 return sheet;
}
