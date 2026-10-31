import { matchSupplementSubclass, supplementSubclassesForClass, type SubclassCatalogEntry } from '@/lib/character-subclass-catalog';
import { extractManualSubclassFeatures } from './manual-subclass-features';
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

export function supportedBardColleges() {
  return supplementSubclassesForClass('Bardo').filter(c=>BARD_COLLEGE_FEATURES[c.slug]);
}

export function extractBardCollegeFeatures(raw:string,college:SubclassCatalogEntry,level:number):BardPrintFeature[]{
  if(level<3)return [];
  return extractManualSubclassFeatures(raw,college,level,BARD_COLLEGE_FEATURES[college.slug]);
}

export function bardCollegeFromLabel(label:string|null) {
  const college=matchSupplementSubclass('Bardo',label);
  return college&&BARD_COLLEGE_FEATURES[college.slug]?college:null;
}
