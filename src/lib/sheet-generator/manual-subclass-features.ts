import { CLASS_OPTIONS } from '@/lib/character-build-catalog';
import { SUPPLEMENT_SUBCLASS_OPTIONS, type SubclassCatalogEntry } from '@/lib/character-subclass-catalog';
import { wikiManualBookLabel } from '@/lib/manual-book-catalog';
import type { PrintFeature } from './manual-feature-text';
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/\s+/g,' ').replace(/\bPORTAVOGE\b/g,'PORTAVOCE').trim().toUpperCase();

export function extractManualSubclassFeatures(raw:string, college:SubclassCatalogEntry, level:number, specs:Array<[string,number]>):PrintFeature[] {
  if(!specs)throw new Error('Sottoclasse non supportata dalla V2.');
  const lines=raw.replace(/\r/g,'').replace(/<\/table>\s*(#{1,6}\s+)/gi,'</table>\n\n$1').split('\n');
  const knownSections=new Set(SUPPLEMENT_SUBCLASS_OPTIONS.flatMap(c=>c.sectionHeadings.map(norm)));
  const headings=lines.flatMap((line,index)=>{const m=line.match(/^#{1,6}\s+(.+?)\s*$/);const title=m?.[1]??(line.length<100&&knownSections.has(norm(line))?line:null);return title?[{title,key:norm(title),index}]:[];});
  const classStart = college.supplementRulesSource.markdownFile === 'manuale_giocatore.md'
    ? lines.findIndex(l => {
        const m = l.match(/^#\s+(.+?)\s*$/);
        return m ? norm(m[1]) === norm(college.parentClassLabel) : false;
      })
    : -1;
  const start=headings.find(h=>(classStart < 0 || h.index > classStart) && college.sectionHeadings.some(s=>norm(s)===h.key));
  if(!start)throw new Error(`Sezione ${college.label} non trovata in ${college.supplementRulesSource.markdownFile}.`);
  const stops=new Set([
    ...SUPPLEMENT_SUBCLASS_OPTIONS.filter(c=>c.slug!==college.slug&&c.supplementRulesSource.markdownFile===college.supplementRulesSource.markdownFile).flatMap(c=>c.sectionHeadings.map(norm)),
    ...CLASS_OPTIONS.map(c=>norm(c.label)), 'WARLOCK: IL NON MORTO', 'GUIDE PER IL MAESTRO DI BATTAGLIA',
  ]);
  for(const [title] of specs)stops.delete(norm(title));
  const end=headings.find(h=>h.index>start.index&&stops.has(h.key))?.index??lines.length;
  const expected=new Map(specs.map(([title,unlock])=>[norm(title),{title,unlock}]));
  const seenKeys=new Set<string>();
  const starts=headings.filter(h=>{
    if(h.index<=start.index||h.index>=end||!expected.has(h.key))return false;
    if(seenKeys.has(h.key))return false;
    seenKeys.add(h.key);
    return true;
  });
  const found=new Set(starts.map(h=>h.key));
  for(const [title,unlock] of specs)if(unlock<=level&&!found.has(norm(title)))throw new Error(`Privilegio ${title} non trovato nel manuale: impossibile completare ${college.label}.`);
  return starts.flatMap((h,i)=>{
    const spec=expected.get(h.key)!;if(spec.unlock>level)return [];
    const body=lines.slice(h.index+1,starts[i+1]?.index??end).join('\n')
      .replace(/^#{1,6}\s+Privilegio (?:del|della|dell['’])\s+(?:Collegio|Cammino|Dominio|Circolo|Cavaliere|Guerriero|Archetipo|Fantasma|Lama Spirituale|Ladro|Mago|Tradizione Arcana|Canto della Lama|Ordine degli Scribi|Mago della Guerra|Via|Monaco|Tradizione Monastica|Giuramento|Paladino|Giuramento Sacro|Ranger|Archetipo Ranger|Custode degli Sciami|Viandante Fatato|Viandante dell['’]Orizzonte|Uccisore di Mostri|Cacciatore delle Tenebre|Stregone|Origine Stregonica|Origine Stregonesca|Anima Divina|Magia delle Ombre|Stregoneria della Tempesta|Anima Meccanica|Mente Aberrante)[^\n]*\n/gim,'')
      .replace(/^\*{0,2}Privilegio (?:del|della|dell['’])\s+(?:Collegio|Cammino|Dominio|Circolo|Cavaliere|Guerriero|Archetipo|Fantasma|Lama Spirituale|Ladro|Mago|Tradizione Arcana|Canto della Lama|Ordine degli Scribi|Mago della Guerra|Via|Monaco|Tradizione Monastica|Giuramento|Paladino|Giuramento Sacro|Ranger|Archetipo Ranger|Custode degli Sciami|Viandante Fatato|Viandante dell['’]Orizzonte|Uccisore di Mostri|Cacciatore delle Tenebre|Stregone|Origine Stregonica|Origine Stregonesca|Anima Divina|Magia delle Ombre|Stregoneria della Tempesta|Anima Meccanica|Mente Aberrante)[^\n]*\*{0,2}\s*$/gim,'')
      .replace(/^Scansionato con CamScanner\s*$/gm,'').trim();
    if(!body)throw new Error(`Testo vuoto per ${spec.title}.`);
    return [{title:spec.title,body,level:spec.unlock,source:`${wikiManualBookLabel(college.supplementRulesSource.manualBookKey)} / ${college.label} / ${college.supplementRulesSource.markdownFile}`}];
  });
}

