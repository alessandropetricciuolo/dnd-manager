import { getManualMarkdownByFileName, preloadManualMarkdownFile, extractPhbSpellMarkdown } from './phb-spell-excerpt';
import { BARBARIAN_CLASS_LEVELS, BARBARIAN_PATH_FEATURES, barbarianPathFromLabel } from '@/lib/sheet-generator/barbarian-paths';
import { extractLeveledFeatures } from '@/lib/sheet-generator/manual-feature-text';
import { extractManualSubclassFeatures } from '@/lib/sheet-generator/manual-subclass-features';
import type { BarbarianEvidence } from '@/lib/sheet-generator/barbarian-print-model';
import type { GeneratedCharacterSheet } from '@/lib/sheet-generator/types';

export async function loadBarbarianEvidence(sheet:GeneratedCharacterSheet,origin?:string):Promise<BarbarianEvidence>{
  await preloadManualMarkdownFile('manuale_giocatore.md',origin);
  const raw=getManualMarkdownByFileName('manuale_giocatore.md');
  const chapter=raw.split(/^# BARBARO\s*$/m)[1]?.split(/^## CAMMINI PRIMORDIALI\s*$/m)[0];
  if(!chapter)throw new Error('Capitolo Barbaro non trovato nel manuale.');
  const classFeatures=extractLeveledFeatures(chapter,BARBARIAN_CLASS_LEVELS,sheet.level,'Manuale del Giocatore / Barbaro / manuale_giocatore.md');
  for(const [title,unlock] of Object.entries(BARBARIAN_CLASS_LEVELS))if(unlock<=sheet.level&&!classFeatures.some(f=>f.title===title))throw new Error(`Privilegio ${title} non trovato nel manuale.`);
  // Approved correction of the conjunction in the local manual transcription, applied to the full appendix too.
  const rageFeature=classFeatures.find(f=>f.title==='IRA')!;
  rageFeature.body=rageFeature.body.replace('o non ha subito danni da allora','e non ha subito danni da allora');
  const rows=[...chapter.matchAll(/<tr>([\s\S]*?)<\/tr>/gi)].map(r=>[...r[1].matchAll(/<td>(.*?)<\/td>/gi)].map(c=>c[1].trim()));
  const row=rows.find(r=>Number.parseInt(r[0])===sheet.level);
  if(!row||row.length!==5)throw new Error('Progressione Ira non risolta dalla tabella del manuale.');
  const uses=/^Illimitata$/i.test(row[3])?null:Number(row[3]),damage=Number(row[4]);
  if((uses!==null&&(!Number.isInteger(uses)||uses<1))||!Number.isInteger(damage)||damage<1)throw new Error('Valori Ira non validi nel manuale.');
  const path=barbarianPathFromLabel(sheet.classSubclass);
  if(sheet.level>=3&&sheet.classSubclass&&!path)throw new Error('Cammino non catalogato.');
  let pathFeatures:BarbarianEvidence['pathFeatures']=[];
  if(sheet.level>=3&&path){const file=path.supplementRulesSource.markdownFile;await preloadManualMarkdownFile(file,origin);pathFeatures=extractManualSubclassFeatures(getManualMarkdownByFileName(file),path,sheet.level,BARBARIAN_PATH_FEATURES[path.slug]);}
  return {classFeatures,pathFeatures,rage:{uses,damage}};
}

/** Granted magic is copied from the spell source; the feature states its special casting restrictions. */
export async function addBarbarianGrantedSpells(original:GeneratedCharacterSheet,origin?:string){
  const path=barbarianPathFromLabel(original.classSubclass);
  if(original.level<3||!path)return original;
  const totem=path.slug==='phb-barbaro-totemico',ancestral=path.slug==='xge-barbaro-guardiano-ancestrale'&&original.level>=10;
  const names=totem?['Percezione delle Bestie','Parlare con gli Animali',...(original.level>=10?['Comunione con la Natura']:[])]:ancestral?['Presagio','Chiaroveggenza']:[];
  if(!names.length)return original;
  // Also validates that the features granting these spells are present in the owned source.
  await loadBarbarianEvidence(original,origin);
  const sheet=structuredClone(original);
  const isBarbOrigin=(o?:string)=>!o||o==='class'||o==='subclass';
  for(const name of names){if(sheet.spells.some(s=>isBarbOrigin(s.origin)&&s.name.toLowerCase()===name.toLowerCase()))continue;
    const raw=extractPhbSpellMarkdown(name);if(!raw)throw new Error(`Testo del manuale non trovato per ${name}.`);
    const level=Number(raw.match(/(\d+)[°º]? livello/i)?.[1]);if(!level)throw new Error(`Livello non trovato per ${name}.`);
    const components=raw.match(/\*\*Componenti:\*\*\s*([^\n]+)/)?.[1]??'';
    const restriction=totem?'Solo come rituale (Cammino del Combattente Totemico).':'Consultare gli Spiriti: senza slot o componenti materiali; un utilizzo condiviso per riposo breve o lungo. Caratteristica: Saggezza.';
    sheet.spells.push({name,level,summary:restriction,fullTextMd:restriction+'\n\n'+raw,ritual:totem,concentration:/\*\*Durata:\*\*\s*Concentrazione/i.test(raw),verbal:/\bV\b/.test(components),somatic:/\bS\b/.test(components),material:!ancestral&&/\bM\b/.test(components),origin:'subclass',sourceLabel:path.label,ability:'wis',alwaysPrepared:true,requiresSlot:false,usesPerRest:totem?'Solo rituale':'1/riposo breve o lungo (condiviso)'});
  }
  if(ancestral){sheet.spellSaveDc=8+sheet.proficiencyBonus+sheet.abilityMods.wis;sheet.spellAttackBonus=sheet.proficiencyBonus+sheet.abilityMods.wis;}
  return sheet;
}
