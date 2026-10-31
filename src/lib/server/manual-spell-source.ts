import { getManualMarkdownByFileName } from './phb-spell-excerpt';
import type { GeneratedSpell } from '@/lib/sheet-generator/types';
/** Exact-title spell reader; school, level and casting metadata must be present in an owned manual. */
export function manualSpellFromSources(name:string,expectedLevel:number,note=''):GeneratedSpell{
 const resolvedName=name==='Lenza Elettrizzante'?'Lenza Elettrzante':name;
 const escaped=resolvedName.replace(/[’‘]/g,"'").replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 for(const file of ['manuale_giocatore.md','xanathar.md','Tasha.md']){
  const text=getManualMarkdownByFileName(file).replace(/[’‘]/g,"'"),marker=text.search(/^# DESCRIZIONE DEGLI INCANTESIMI\s*$/m),chapter=marker>=0?text.slice(marker):text;
  const h=new RegExp('^#{1,6}\\s+'+escaped+'(?:\\s*\\([^)]*\\))?\\s*$','im').exec(chapter);if(!h)continue;
  const tail=chapter.slice(h.index+h[0].length),end=[...tail.matchAll(/^#{1,6}\s+([^\n]+)$/gm)].find(m=>!/Trucchetto|di [1-9][°º]? livello|^(?:Tempo di Lancio|Gittata|Componenti|Durata):/i.test(m[1]))?.index??-1;
  let raw=chapter.slice(h.index,h.index+h[0].length+(end<0?tail.length:end)).trim();
  const metadata=raw.slice(h[0].length).split('\n').map(s=>s.replace(/\*/g,'').replace(/^#{1,6}\s*/,'').trim()).find(Boolean)??'';
  const level=/Trucchetto/i.test(metadata)?0:Number(metadata.match(/(\d+)[°º]? livello/i)?.[1]);if(level!==expectedLevel)continue;
  raw=raw.replace(/^#{1,6}\s+(?=(?:Tempo di Lancio|Gittata|Componenti|Durata):)/gm,'').replace(/^\*{0,2}(Tempo di Lancio|Gittata|Componenti|Durata):?\*{0,2}:?\s*/gim,'**$1:** ');
  if(!/\*\*Durata:\*\*/i.test(raw)||!raw.includes('**Componenti:**'))continue;
  const components=raw.match(/\*\*Componenti:\*\*\s*([^\n]+)/)?.[1]??'';
  return {name,level,summary:note,fullTextMd:(note?note+'\n\n':'')+'Fonte: '+(file==='manuale_giocatore.md'?'Manuale del Giocatore':file==='xanathar.md'?'Xanathar':'Tasha')+'\n\n'+raw,ritual:/rituale/i.test(metadata),concentration:/\*\*Durata:\*\*\s*Concentrazione/i.test(raw),verbal:/\bV\b/.test(components),somatic:/\bS\b/.test(components),material:/\bM\b/.test(components)};
 }
 throw new Error(`Descrizione e livello non verificati nei manuali per ${name}.`);
}
