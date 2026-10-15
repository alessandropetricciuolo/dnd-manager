import type { CharacterAbilityKey, CharacterSheetV1, CharacterSkillKey } from "../character-sheet";

type PdfFields = Record<string, string | boolean | null | undefined>;
const ABILITIES: CharacterAbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];
const SKILLS: Record<CharacterSkillKey, string> = {
 acrobatics:"ACRO", animal_handling:"ANIM", arcana:"ARC", athletics:"ATH", deception:"DEC", history:"HIST", insight:"INS", intimidation:"INTI", investigation:"INV", medicine:"MED", nature:"NAT", perception:"PERC", performance:"PERF", persuasion:"PERS", religion:"REL", sleight_of_hand:"SLE", stealth:"STLTH", survival:"SURV",
};
const text = (f: PdfFields, key: string) => typeof f[key] === "string" ? (f[key] as string).trim() : "";
const number = (f: PdfFields, key: string): number | undefined => { const s=text(f,key); return /^[+-]?\d+$/.test(s) ? Number(s) : undefined; };
const checkbox = (f: PdfFields,key:string): boolean | undefined => {
 const raw=f[key];if(raw===undefined||raw===null)return undefined;
 if(typeof raw==="boolean")return raw;
 const value=String(raw).trim();if(!value)return false;
 return /^(x|true|yes|on|1)$/i.test(value);
};
const lines = (s:string) => s.split(/\r?\n/).map(x=>x.replace(/^\s*[•*-]\s*/, "").trim()).filter(Boolean);

/** Recover only values actually stored in the source form. Never rebuild an old PG from class defaults. */
export function recoverCharacterSheetFromPdfFields(fields: PdfFields, source: {sourceFile: string; sha256: string; recoveredAt: string}): CharacterSheetV1 | null {
 const sheet: CharacterSheetV1 = { version:1,source:"recovered", recovery: source };
 const labels: Record<string, keyof CharacterSheetV1> = {CharacterName:"characterName",Subclass:"classSubclass",Background:"backgroundLabel",Alignment:"alignment",Age:"age",Height:"height",Weight:"weight",Sex:"sex",Speed:"speed",HD_Value:"hitDie",Languages:"languages",SpellcastingClass:"spellcastingClass"};
 for (const [key,target] of Object.entries(labels)) { const value=text(fields,key); if(value && target!=="languages") (sheet as Record<string,unknown>)[target]=value; }
 const raceField=text(fields,"Race");if(raceField){const match=raceField.match(/^(.+?)\s*\(([^()]*)\)\s*$/);sheet.raceLabel=match?match[1].trim():raceField;if(match)sheet.subraceLabel=match[2].trim();}
 const classLevel=text(fields,"ClassLevel").match(/^(.+?)\s+(\d{1,2})$/);
 if(classLevel && Number(classLevel[2])>=1 && Number(classLevel[2])<=20){sheet.classLabel=classLevel[1];sheet.level=Number(classLevel[2]);}
 const stats: Record<string,keyof CharacterSheetV1>={HPMax:"hpMax",AC:"armorClass",Initiative:"initiative",ProfBonus:"proficiencyBonus",Passive:"passivePerception",HD_Total:"hitDiceTotal",SpellSaveDC:"spellSaveDc",SpellAtkBonus:"spellAttackBonus"};
 for(const [key,target] of Object.entries(stats)){const value=number(fields,key);if(value!==undefined)(sheet as Record<string,unknown>)[target]=value;}
 for(const ability of ABILITIES){const prefix=ability.toUpperCase(); const score=number(fields,prefix);const mod=number(fields,prefix+"mod");const save=number(fields,"ST_"+prefix);
 if(score!==undefined && score>=1 && score<=30)(sheet.abilities??={})[ability]=score;
 if(mod!==undefined && (score!==undefined || /^[+-]/.test(text(fields,prefix+"mod"))))(sheet.abilityMods??={})[ability]=mod;
 if(save!==undefined){const prof=checkbox(fields,"ST_"+prefix+"_Prof");(sheet.savingThrows??={})[ability]={value:save,...(prof===undefined?{}:{proficient:prof})};} }
 for(const [skill,prefix] of Object.entries(SKILLS)){const value=number(fields,prefix);if(value!==undefined){const prof=checkbox(fields,prefix+"_Prof");const exp=checkbox(fields,prefix+"_Exp");(sheet.skills??={})[skill as CharacterSkillKey]={value,...(prof===undefined?{}:{proficient:prof}),...(exp?{expertise:true}:{})};}}
 const weapons=[];for(let i=1;i<=4;i++){const name=text(fields,`Wpn${i}_Name`);if(name)weapons.push({name,toHit:text(fields,`Wpn${i}_Atk`),damage:text(fields,`Wpn${i}_Dmg`),type:text(fields,`Wpn${i}_Type`)});}if(weapons.length)sheet.weaponRows=weapons;
 const inventory=text(fields,"Inventory");if(inventory)sheet.inventory=lines(inventory);
 const langs=text(fields,"Languages");if(langs)sheet.languages=langs.split(/[,;]+/).map(x=>x.trim()).filter(Boolean);
 const features=text(fields,"Features_Main");if(features)sheet.classFeaturesMd=features;
 const race=text(fields,"Feat_Racial");if(race)sheet.raceTraitsMd=race;
 const spellAbility=text(fields,"SpellcastingAbility").toLowerCase();if(ABILITIES.includes(spellAbility as CharacterAbilityKey))sheet.spellcastingAbility=spellAbility as CharacterAbilityKey;
 const spells=[];for(let i=1;i<=4;i++){const name=text(fields,`Cantrip_${i}`);if(name)spells.push({name,level:0,summary:text(fields,`Cantrip_${i}_Desc`)});}
 for(let i=1;i<=20;i++){const name=text(fields,`Row_${i}_Name`);const level=number(fields,`Row_${i}_Lvl`);if(name && level!==undefined && level>=1 && level<=9){const ritual=checkbox(fields,`Row_${i}_Rit`);const concentration=checkbox(fields,`Row_${i}_Conc`);const verbal=checkbox(fields,`Row_${i}_V`);const somatic=checkbox(fields,`Row_${i}_S`);const material=checkbox(fields,`Row_${i}_M`);spells.push({name,level,summary:text(fields,`Row_${i}_Desc`),...(ritual===undefined?{}:{ritual}),...(concentration===undefined?{}:{concentration}),...(verbal===undefined?{}:{verbal}),...(somatic===undefined?{}:{somatic}),...(material===undefined?{}:{material})});}}
 if(spells.length)sheet.spells=spells;
 // Slot checkboxes in old templates are capped; keep authoritative spellSlots from the saved rules snapshot instead.
 return Object.keys(sheet).some(key=>!['version','source','recovery'].includes(key))?sheet:null;
}
