import type { AbilityKey, GeneratedCharacterSheet, SkillKey } from './types';
import { sanitizeTextForStandardPdfFont } from '@/lib/pdf/winansi-text';

export const SKILL_LABELS: Record<SkillKey, string> = {
  athletics:'Atletica', acrobatics:'Acrobazia', stealth:'Furtività', sleight_of_hand:'Rapidità di mano',
  arcana:'Arcano', investigation:'Indagare', nature:'Natura', religion:'Religione', history:'Storia',
  animal_handling:'Addestrare animali', insight:'Intuizione', medicine:'Medicina', perception:'Percezione', survival:'Sopravvivenza',
  deception:'Inganno', intimidation:'Intimidire', performance:'Intrattenere', persuasion:'Persuasione',
};
const SKILL_ABILITIES: Record<SkillKey, AbilityKey> = {
  athletics:'str', acrobatics:'dex', stealth:'dex', sleight_of_hand:'dex', arcana:'int', investigation:'int', nature:'int', religion:'int', history:'int',
  animal_handling:'wis', insight:'wis', medicine:'wis', perception:'wis', survival:'wis', deception:'cha', intimidation:'cha', performance:'cha', persuasion:'cha',
};
export type BardPrintFeature = { title: string; body: string; level: number; source: string };

export function printPlainText(markdown: string): string {
  return sanitizeTextForStandardPdfFont(markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/^\s*\|[\s:|\-]+\|\s*$/gm,'')
    .replace(/<\/(?:tr|p)>/gi,'\n').replace(/<\/(?:td|th)>/gi,' | ').replace(/<[^>]+>/g,' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/^#{1,6}\s+/gm,'').replace(/\*|`/g,'')
    .replace(/(?:^|\n)CAPITOLO\s+\d+\s*\|[^\n]*(?:\n\d{1,3})?/g,'')
    .replace(/(?:^|\n)\d{1,3}\s*\nCAPITOLO\s+\d+\s*\|[^\n]*/g,'')
    .replace(/\n{3,}/g,'\n\n').trim());
}

function normalize(s: string) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim(); }
const CLASS_LEVELS: Record<string, number> = {
  'ISPIRAZIONE BARDICA':1,'FACTOTUM':2,'CANTO DI RIPOSO':2,'MAESTRIA':3,'AUMENTO DEI PUNTEGGI DI CARATTERISTICA':4,
  'FONTE DI ISPIRAZIONE':5,'CONTROFASCINO':6,'SEGRETI MAGICI':10,'ISPIRAZIONE SUPERIORE':20,
};
const SUBCLASS_LEVELS: Record<string,number> = {
  'COMPETENZE BONUS':3,'PAROLE TAGLIENTI':3,'SEGRETI MAGICI AGGIUNTIVI':6,'ABILITA IMPAREGGIABILE':14,
  'ISPIRAZIONE IN COMBATTIMENTO':3,'ATTACCO EXTRA':6,'MAGIA DA BATTAGLIA':14,
};

function extractFeatures(md: string, levels: Record<string, number>, level: number, source: string): BardPrintFeature[] {
  return md.split(/(?=^#{1,6}\s)/m).flatMap((part) => {
    const m=part.match(/^#{1,6}\s+([^\n]+)\n([\s\S]*)/);
    if(!m) return [];
    const unlock=levels[normalize(m[1])];
    if(!unlock || unlock>level) return [];
    // Remove only whole future-unlock paragraphs, preserving the other source sentences verbatim.
    const paragraphs=printPlainText(m[2]).split(/\n\s*\n/).filter((p) => {
      const future=p.match(/^(?:Al|Dal|A partire dal|Quando arriva al)\s+(\d+)[°º]?\s+livello/i);
      return !future || Number(future[1])<=level;
    });
    return paragraphs.join('\n\n').trim() ? [{title:m[1].trim(),body:paragraphs.join('\n\n'),level:unlock,source}] : [];
  });
}

export function buildBardPrintModel(original: GeneratedCharacterSheet, bonusSkills: SkillKey[] = []) {
  if(original.classLabel!=='Bardo') throw new Error('La scheda V2 supporta per ora il Bardo.');
  if(original.classSubclass && !/^Collegio (della Sapienza|del Valore)$/i.test(original.classSubclass)) throw new Error('La V2 supporta i collegi Sapienza e Valore del Manuale del Giocatore.');
  const sheet=structuredClone(original);
  if(sheet.level<3){ sheet.classSubclass=null; sheet.subclassFeaturesMd=null; }
  const lore=sheet.level>=3 && /sapienza/i.test(sheet.classSubclass??'');
  if(lore){
    const chosen=[...new Set(bonusSkills)];
    if(chosen.length!==3 || chosen.some((k)=>!(k in sheet.skills) || sheet.skills[k].proficient)) throw new Error('Scegli tre competenze aggiuntive distinte e non già possedute.');
    for(const key of chosen){sheet.skills[key].proficient=true;sheet.skills[key].value=sheet.abilityMods[SKILL_ABILITIES[key]]+sheet.proficiencyBonus;}
  }else if(bonusSkills.length) throw new Error('Le competenze aggiuntive richiedono il Collegio della Sapienza dal livello 3.');
  if(sheet.level>=3 && /valore/i.test(sheet.classSubclass??'')){
    sheet.armorProficiencies=[...new Set([...sheet.armorProficiencies,'Armature medie','Scudi'])];
    sheet.weaponProficiencies=[...new Set([...sheet.weaponProficiencies,'Armi da guerra'])];
  }
  // V2-only deterministic application: current shared engine does not apply Jack of All Trades.
  if(sheet.level>=2){
    const half=Math.floor(sheet.proficiencyBonus/2);
    for(const skill of Object.values(sheet.skills)) if(!skill.proficient) skill.value+=half;
    sheet.initiative+=half;
  }
  sheet.passivePerception=10+sheet.skills.perception.value;
  const source='Manuale del Giocatore / Bardo';
  const features=[...extractFeatures(sheet.classFeaturesMd,CLASS_LEVELS,sheet.level,source),
    ...extractFeatures(sheet.subclassFeaturesMd??'',SUBCLASS_LEVELS,sheet.level,`${source} / ${sheet.classSubclass??''}`)];
  if(!features.some(f=>normalize(f.title)==='ISPIRAZIONE BARDICA')) throw new Error('Ispirazione Bardica non trovata nel manuale. La V2 non può completare questa scheda.');
  const die=sheet.level>=15?'d12':sheet.level>=10?'d10':sheet.level>=5?'d8':'d6';
  const restDie=sheet.level>=17?'d12':sheet.level>=13?'d10':sheet.level>=9?'d8':'d6';
  return {sheet,features,die,restDie,uses:Math.max(1,sheet.abilityMods.cha),bonusSkills};
}
