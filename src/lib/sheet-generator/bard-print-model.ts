import type { AbilityKey, GeneratedCharacterSheet, SkillKey } from './types';
import { extractLeveledFeatures as extractFeatures, normalizeFeatureTitle as normalize, type PrintFeature as BardPrintFeature } from './manual-feature-text';
export { printPlainText, type PrintFeature as BardPrintFeature } from './manual-feature-text';
import { bardCollegeFromLabel, extractBardCollegeFeatures, type BardFightingStyle } from './bard-colleges';

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
const CLASS_LEVELS: Record<string, number> = {
  'ISPIRAZIONE BARDICA':1,'FACTOTUM':2,'CANTO DI RIPOSO':2,'MAESTRIA':3,'AUMENTO DEI PUNTEGGI DI CARATTERISTICA':4,
  'FONTE DI ISPIRAZIONE':5,'CONTROFASCINO':6,'SEGRETI MAGICI':10,'ISPIRAZIONE SUPERIORE':20,
};

export function buildBardPrintModel(original: GeneratedCharacterSheet, bonusSkills: SkillKey[] = [], collegeEvidence?:BardPrintFeature[], fightingStyle?:BardFightingStyle) {
  if(original.classLabel!=='Bardo') throw new Error('La scheda V2 supporta per ora il Bardo.');
  const college=bardCollegeFromLabel(original.classSubclass);
  if(original.classSubclass && !college) throw new Error('Collegio non catalogato nei manuali della V2.');
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
  if(sheet.level>=3 && college?.slug==='xge-bardo-spade'){
    sheet.armorProficiencies=[...new Set([...sheet.armorProficiencies,'Armature medie'])];
    sheet.weaponProficiencies=[...new Set([...sheet.weaponProficiencies,'Scimitarra'])];
  } else if(fightingStyle) throw new Error('Lo stile di combattimento V2 richiede il Collegio delle Spade dal livello 3.');
  // V2-only deterministic application: current shared engine does not apply Jack of All Trades.
  if(sheet.level>=2){
    const half=Math.floor(sheet.proficiencyBonus/2);
    for(const skill of Object.values(sheet.skills)) if(!skill.proficient) skill.value+=half;
    sheet.initiative+=half;
  }
  sheet.passivePerception=10+sheet.skills.perception.value;
  const source='Manuale del Giocatore / Bardo';
  const collegeFeatures=sheet.level>=3&&college?(collegeEvidence??extractBardCollegeFeatures(sheet.subclassFeaturesMd??'',college,sheet.level)).map(f=>({...f})):[];
  const features=[...extractFeatures(sheet.classFeaturesMd,CLASS_LEVELS,sheet.level,source),...collegeFeatures];
  if(college?.slug==='xge-bardo-spade'&&sheet.level>=3){
    const style=features.find(f=>normalize(f.title)==='STILE DI COMBATTIMENTO');
    const choice=fightingStyle??'Duellare';
    if(style){
      const blocks=style.body.split(/(?=\*\*(?:Duellare|Combattere con Due Armi)\.)/);
      const selected=blocks.find(b=>b.startsWith(`**${choice}.`));
      if(!selected)throw new Error('Testo dello stile selezionato non trovato nel manuale.');
      style.body=selected.trim();style.title=`STILE DI COMBATTIMENTO - ${choice}`;
    }
  }
  if(!features.some(f=>normalize(f.title)==='ISPIRAZIONE BARDICA')) throw new Error('Ispirazione Bardica non trovata nel manuale. La V2 non può completare questa scheda.');
  const die=sheet.level>=15?'d12':sheet.level>=10?'d10':sheet.level>=5?'d8':'d6';
  const restDie=sheet.level>=17?'d12':sheet.level>=13?'d10':sheet.level>=9?'d8':'d6';
  return {sheet,features,die,restDie,uses:Math.max(1,sheet.abilityMods.cha),bonusSkills,college};
}
