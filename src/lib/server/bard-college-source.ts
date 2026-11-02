import { bardCollegeFromLabel, extractBardCollegeFeatures } from '@/lib/sheet-generator/bard-colleges';
import { getManualMarkdownByFileName, preloadManualMarkdownFile, preloadPhbMarkdown, extractPhbSpellMarkdown } from './phb-spell-excerpt';
import type { GeneratedCharacterSheet } from '@/lib/sheet-generator/types';

/** Server-owned full source, before the legacy summary filter can discard split Tasha headings. */
export async function loadBardCollegeFeatures(sheet:GeneratedCharacterSheet,origin?:string){
  if(sheet.level<3||!sheet.classSubclass)return [];
  const college=bardCollegeFromLabel(sheet.classSubclass);
  if(!college)throw new Error('Collegio non catalogato nei manuali della V2.');
  const file=college.supplementRulesSource.markdownFile;
  await preloadManualMarkdownFile(file,origin);
  return extractBardCollegeFeatures(getManualMarkdownByFileName(file),college,sheet.level);
}

/** The Spirits college grants Guidance in addition to the class's normal cantrip choices. */
export async function addBardCollegeGrantedSpells(original:GeneratedCharacterSheet,origin?:string){
  const college=bardCollegeFromLabel(original.classSubclass);
  const isBardOrigin=(o?:string)=>!o||o==='class'||o==='subclass';
  if(original.level<3||college?.slug!=='vrgr-bardo-spiriti'||original.spells.some(s=>isBardOrigin(s.origin)&&s.name.toLowerCase()==='guida'))return original;
  const features=await loadBardCollegeFeatures(original,origin);
  const guidance=features.find(f=>f.title==='SUSSURRI GUIDA');
  const range=guidance?.body.match(/gittata di ([\d,.]+) metri/i)?.[1];
  await preloadPhbMarkdown(origin);
  const raw=extractPhbSpellMarkdown('Guida');
  if(!raw||!range)throw new Error('Fonti di Sussurri Guida o del trucchetto Guida non disponibili.');
  const fullTextMd=raw.replace(/\*\*Gittata:\*\*[^\n]*/,`**Gittata:** ${range} metri (Sussurri Guida - Van Richten)`);
  const components=raw.match(/\*\*Componenti:\*\*\s*([^\n]+)/)?.[1]??'';
  const sheet=structuredClone(original);
  sheet.spells.push({name:'Guida',level:0,summary:'Trucchetto aggiuntivo di Sussurri Guida.',fullTextMd,
    ritual:/\(rituale\)/i.test(raw),concentration:/\*\*Durata:\*\*\s*Concentrazione/i.test(raw),
    verbal:/\bV\b/.test(components),somatic:/\bS\b/.test(components),material:/\bM\b/.test(components),
    origin:'subclass',sourceLabel:college.label,ability:'cha',alwaysPrepared:true,requiresSlot:false,rangeOverride:`${range} m`});
  return sheet;
}
