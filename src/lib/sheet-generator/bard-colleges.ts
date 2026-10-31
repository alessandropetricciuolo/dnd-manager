import { CLASS_OPTIONS } from '@/lib/character-build-catalog';
import { matchSupplementSubclass, supplementSubclassesForClass, SUPPLEMENT_SUBCLASS_OPTIONS, type SubclassCatalogEntry } from '@/lib/character-subclass-catalog';
import { wikiManualBookLabel } from '@/lib/manual-book-catalog';
import type { BardPrintFeature } from './bard-print-model';

/** Explicit unlocks checked against the local PHB/XGE/TCE/VRGR sections. Text always comes from those files. */
export const BARD_COLLEGE_FEATURES: Record<string, Array<[string, number]>> = {
  'phb-bardo-sapienza': [['COMPETENZE BONUS',3],['PAROLE TAGLIENTI',3],['SEGRETI MAGICI AGGIUNTIVI',6],['ABILITÀ IMPAREGGIABILE',14]],
  'phb-bardo-valore': [['COMPETENZE BONUS',3],['ISPIRAZIONE IN COMBATTIMENTO',3],['ATTACCO EXTRA',6],['MAGIA DA BATTAGLIA',14]],
  'xge-bardo-sussurri': [['LAME PSICHICHE',3],['PAROLE DI TERRORE',3],['MANTO DI SUSSURRI',6],["CONOSCENZE DELL'OMBRA",14]],
  'xge-bardo-incanto': [['MANTO DI ISPIRAZIONE',3],['ESIBIZIONE ESTASIANTE',3],['MANTO DI MAESTÀ',6],['MAESTÀ INVIOLABILE',14]],
  'xge-bardo-spade': [['COMPETENZE BONUS',3],['STILE DI COMBATTIMENTO',3],['VIRTUOSISMO DELLA LAMA',3],['ATTACCO EXTRA',6],['VIRTUOSISMO DEL MAESTRO',14]],
  'tce-bardo-eloquenza': [['ARTE ORATORIA',3],['PAROLE INQUIETANTI',3],['ISPIRAZIONE INFALLIBILE',6],['LINGUAGGIO UNIVERSALE',6],['ISPIRAZIONE CONTAGIOSA',14]],
  'tce-bardo-creazione': [['GRANELLO DI POTENZIALE',3],['COMPIMENTO DELLA CREAZIONE',3],['CREAZIONE ANIMATA',6],['CRESCENDO CREATIVO',14]],
  'vrgr-bardo-spiriti': [['SUSSURRI GUIDA',3],['FOCUS SPIRITUALE',3],["RACCONTI DALL'ALDILÀ",3],['SEDUTA SPIRITICA',6],['CONNESSIONE MISTICA',14]],
};
export const BARD_FIGHTING_STYLES = ['Duellare', 'Combattere con Due Armi'] as const;
export type BardFightingStyle = typeof BARD_FIGHTING_STYLES[number];
const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toUpperCase();

export function supportedBardColleges() {
  return supplementSubclassesForClass('Bardo').filter(c=>BARD_COLLEGE_FEATURES[c.slug]);
}

/** Match named feature boundaries, not Markdown depth: Tasha has feature titles and metadata at the same depth. */
export function extractBardCollegeFeatures(raw:string, college:SubclassCatalogEntry, level:number):BardPrintFeature[] {
  if(level<3)return [];
  const specs=BARD_COLLEGE_FEATURES[college.slug];
  if(!specs)throw new Error('Collegio non supportato dalla V2.');
  const lines=raw.replace(/\r/g,'').replace(/<\/table>\s*(#{1,6}\s+)/gi,'</table>\n\n$1').split('\n');
  const headings=lines.flatMap((line,index)=>{const m=line.match(/^#{1,6}\s+(.+?)\s*$/);return m?[{title:m[1],key:norm(m[1]),index}]:[];});
  const start=headings.find(h=>college.sectionHeadings.some(s=>norm(s)===h.key));
  if(!start)throw new Error(`Sezione ${college.label} non trovata in ${college.supplementRulesSource.markdownFile}.`);
  const stops=new Set([
    ...SUPPLEMENT_SUBCLASS_OPTIONS.filter(c=>c.slug!==college.slug&&c.supplementRulesSource.markdownFile===college.supplementRulesSource.markdownFile).flatMap(c=>c.sectionHeadings.map(norm)),
    ...CLASS_OPTIONS.map(c=>norm(c.label)), 'WARLOCK: IL NON MORTO',
  ]);
  const end=headings.find(h=>h.index>start.index&&stops.has(h.key))?.index??lines.length;
  const expected=new Map(specs.map(([title,unlock])=>[norm(title),{title,unlock}]));
  const starts=headings.filter(h=>h.index>start.index&&h.index<end&&expected.has(h.key));
  const found=new Set(starts.map(h=>h.key));
  for(const [title,unlock] of specs)if(unlock<=level&&!found.has(norm(title)))throw new Error(`Privilegio ${title} non trovato nel manuale: impossibile completare ${college.label}.`);
  return starts.flatMap((h,i)=>{
    const spec=expected.get(h.key)!;if(spec.unlock>level)return [];
    const body=lines.slice(h.index+1,starts[i+1]?.index??end).join('\n')
      .replace(/^#{1,6}\s+Privilegio del Collegio[^\n]*\n/gim,'')
      .replace(/^\*?Privilegio del Collegio[^\n]*\*?\s*$/gim,'')
      .replace(/^Scansionato con CamScanner\s*$/gm,'').trim();
    if(!body)throw new Error(`Testo vuoto per ${spec.title}.`);
    return [{title:spec.title,body,level:spec.unlock,source:`${wikiManualBookLabel(college.supplementRulesSource.manualBookKey)} / ${college.label} / ${college.supplementRulesSource.markdownFile}`}];
  });
}

export function bardCollegeFromLabel(label:string|null) {
  const college=matchSupplementSubclass('Bardo',label);
  return college&&BARD_COLLEGE_FEATURES[college.slug]?college:null;
}
