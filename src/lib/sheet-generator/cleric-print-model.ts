import { SKILL_LABELS } from './bard-print-model';
import type { GeneratedCharacterSheet, SkillKey, AbilityKey } from './types';
import type { PrintFeature } from './manual-feature-text';
import { clericDomainFromLabel, CLERIC_SKILL_CHOICES, type ClericChoices } from './cleric-domains';
export type ClericEvidence={classFeatures:PrintFeature[];domainFeatures:PrintFeature[];domainSpells:Array<{name:string;level:number;unlock:number}>;channelUses:number;undeadCr:string|null;cantrips:number;slots:GeneratedCharacterSheet['spellSlots']};
export const CLERIC_BONUS_LANGUAGES=['Comune','Nanico','Elfico','Gigante','Gnomesco','Goblin','Halfling','Orchesco','Abissale','Celestiale','Draconico','Gergo delle Profondità','Infernale','Primordiale','Silvano','Sottocomune'] as const;
const SKILL_ABILITY:Partial<Record<SkillKey,AbilityKey>>={arcana:'int',nature:'int',religion:'int',history:'int',animal_handling:'wis',survival:'wis',intimidation:'cha',persuasion:'cha',insight:'wis',performance:'cha'};

export function buildClericPrintModel(original:GeneratedCharacterSheet,evidence:ClericEvidence,choices:ClericChoices={}){
 if(original.classLabel!=='Chierico')throw new Error('Classe Chierico richiesta.');
 const sheet=structuredClone(original),domain=clericDomainFromLabel(sheet.classSubclass);
 if(!domain)throw new Error('Dominio Divino non selezionato o non catalogato.');
 const features=[...evidence.classFeatures,...evidence.domainFeatures].filter(f=>f.level<=sheet.level).map(f=>({...f}));
 if(!features.some(f=>f.title==='INCANTESIMI'))throw new Error('Incantesimi del Chierico non risolti dal manuale.');
 const pool=CLERIC_SKILL_CHOICES[domain.slug],knowledge=domain.slug==='phb-chierico-conoscenza';
 if(pool){
  const count=knowledge?2:1,skills=choices.skills??[...pool].sort((a,b)=>Number(sheet.skills[a].proficient)-Number(sheet.skills[b].proficient)).slice(0,count);
  if(skills.length!==count||new Set(skills).size!==count||skills.some(s=>!pool.includes(s)))throw new Error(`Scegli ${count} abilità distinte tra quelle concesse dal dominio.`);
  for(const key of skills){const skill=sheet.skills[key];skill.proficient=true;if(knowledge)skill.expertise=true;skill.value=sheet.abilityMods[SKILL_ABILITY[key]!]+sheet.proficiencyBonus*(skill.expertise?2:1);}
  const f=features.find(f=>f.title===(knowledge?'BENEDIZIONI DELLA CONOSCENZA':domain.slug==='phb-chierico-natura'?'ACCOLITO DELLA NATURA':domain.slug==='tce-chierico-ordine'?'COMPETENZE BONUS':'STRUMENTO DI PACE'));
  if(f)f.body+='\n\nAbilità scelte: '+skills.map(s=>SKILL_LABELS[s]).join(', ')+'.';
 }else if(choices.skills?.length)throw new Error('Le abilità aggiuntive non sono previste da questo dominio.');
 if(knowledge){
  const languages=choices.languages??CLERIC_BONUS_LANGUAGES.filter(l=>!sheet.languages.includes(l)).slice(0,2);
  if(languages.length!==2||new Set(languages).size!==2||languages.some(l=>!CLERIC_BONUS_LANGUAGES.some(v=>v===l)||sheet.languages.includes(l)))throw new Error('Scegli due linguaggi distinti non già conosciuti.');
  sheet.languages.push(...languages);features.find(f=>f.title==='BENEDIZIONI DELLA CONOSCENZA')!.body+='\n\nLinguaggi scelti: '+languages.join(', ')+'.';
 }else if(choices.languages?.length)throw new Error('I due linguaggi aggiuntivi richiedono il Dominio della Conoscenza.');
 const competence=evidence.domainFeatures.filter(f=>/COMPETENZ[AE] BONUS/.test(f.title)).map(f=>f.body).join('\n');
 const heavy=/armature pesanti/i.test(competence),martial=/armi da guerra/i.test(competence);
 if(heavy)sheet.armorProficiencies=[...new Set([...sheet.armorProficiencies,'Armature pesanti'])];
 if(martial)sheet.weaponProficiencies=[...new Set([...sheet.weaponProficiencies,'Armi da guerra'])];
 if(domain.slug==='xge-chierico-forgia')sheet.toolProficiencies=[...new Set([...sheet.toolProficiencies,'Strumenti da fabbro'])];
 // V1 gives every Cleric chain mail. V2's default loadout follows the domain's actual proficiency.
 if(!heavy){sheet.armorClass=14+Math.min(sheet.abilityMods.dex,2)+2;sheet.inventory=sheet.inventory.map(item=>item.replace(/cotta di maglia/gi,'armatura di scaglie'));}
 if(domain.slug==='xge-chierico-forgia'&&sheet.level>=6)sheet.armorClass+=1; // Anima della Forgia with the default heavy armor.
 for(const attack of sheet.weaponRows){const key=/DES/.test(attack.damage)?'dex':/FOR/.test(attack.damage)?'str':null;if(key){const hit=sheet.proficiencyBonus+sheet.abilityMods[key];attack.toHit=`${hit>=0?'+':''}${hit}`;}}
 sheet.passivePerception=10+sheet.skills.perception.value;
 sheet.spellcastingAbility='wis';sheet.spellcastingClass='Chierico';sheet.spellAttackBonus=sheet.proficiencyBonus+sheet.abilityMods.wis;sheet.spellSaveDc=8+sheet.spellAttackBonus;
 sheet.spellSlots={...evidence.slots};sheet.cantripsKnown=evidence.cantrips;sheet.spellsPrepared=Math.max(1,sheet.level+sheet.abilityMods.wis);
 return {sheet,features,domain,domainSpells:evidence.domainSpells,channelUses:evidence.channelUses,undeadCr:evidence.undeadCr,divineSuccess:sheet.level>=20?'Automatico':`${sheet.level}%`};
}
