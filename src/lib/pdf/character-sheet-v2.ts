import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { GeneratedCharacterSheet, SkillKey, AbilityKey } from '@/lib/sheet-generator/types';
import { buildBardPrintModel, printPlainText, SKILL_LABELS, type BardPrintFeature } from '@/lib/sheet-generator/bard-print-model';
import { buildArtificerPrintModel } from '@/lib/sheet-generator/artificer-print-model';
import { artificerReferenceCards } from '@/lib/sheet-generator/artificer-reference-copy';
import { buildClericPrintModel, type ClericEvidence } from '@/lib/sheet-generator/cleric-print-model';
import type { ClericChoices } from '@/lib/sheet-generator/cleric-domains';
import { clericReferenceCards } from '@/lib/sheet-generator/cleric-reference-copy';
import { buildBarbarianPrintModel, type BarbarianEvidence } from '@/lib/sheet-generator/barbarian-print-model';
import type { BarbarianChoices } from '@/lib/sheet-generator/barbarian-paths';
import { barbarianReferenceCards } from '@/lib/sheet-generator/barbarian-reference-copy';
import { bardReferenceCards } from '@/lib/sheet-generator/bard-reference-copy';
import type { BardFightingStyle } from '@/lib/sheet-generator/bard-colleges';
import { sanitizeTextForStandardPdfFont } from './winansi-text';
import { drawFantasyFrame, drawFantasyBanner, drawFantasyTracker, drawFantasyShield, drawBardEmblem, drawBarbarianEmblem, drawClericEmblem, drawArtificerEmblem, drawFighterEmblem, drawRogueEmblem, drawWizardEmblem, drawMonkEmblem, drawPaladinEmblem, drawRangerEmblem, drawSorcererEmblem, drawFantasyAbility } from './fantasy-sheet-graphics';
import type { DruidEvidence } from '@/lib/sheet-generator/druid-circles';
import { buildDruidPrintModel, druidReferenceCards } from '@/lib/sheet-generator/druid-print-model';
import type { FighterEvidence } from '@/lib/server/fighter-source';
import type { FighterChoices } from '@/lib/sheet-generator/fighter-archetypes';
import { buildFighterPrintModel } from '@/lib/sheet-generator/fighter-print-model';
import { fighterReferenceCards } from '@/lib/sheet-generator/fighter-reference-copy';
import type { RogueEvidence } from '@/lib/server/rogue-source';
import type { RogueChoices } from '@/lib/sheet-generator/rogue-archetypes';
import { buildRoguePrintModel } from '@/lib/sheet-generator/rogue-print-model';
import { rogueReferenceCards } from '@/lib/sheet-generator/rogue-reference-copy';
import type { WizardEvidence } from '@/lib/server/wizard-source';
import { wizardTraditionFromLabel, type WizardChoices } from '@/lib/sheet-generator/wizard-traditions';
import { buildWizardPrintModel } from '@/lib/sheet-generator/wizard-print-model';
import { wizardReferenceCards } from '@/lib/sheet-generator/wizard-reference-copy';
import type { MonkEvidence } from '@/lib/server/monk-source';
import { monkTraditionFromLabel, type MonkChoices } from '@/lib/sheet-generator/monk-traditions';
import { buildMonkPrintModel } from '@/lib/sheet-generator/monk-print-model';
import { monkReferenceCards } from '@/lib/sheet-generator/monk-reference-copy';
import type { PaladinEvidence } from '@/lib/server/paladin-source';
import { paladinOathFromLabel, type PaladinChoices } from '@/lib/sheet-generator/paladin-oaths';
import { buildPaladinPrintModel } from '@/lib/sheet-generator/paladin-print-model';
import { paladinReferenceCards } from '@/lib/sheet-generator/paladin-reference-copy';
import type { RangerEvidence } from '@/lib/server/ranger-source';
import { rangerArchetypeFromLabel, type RangerChoices } from '@/lib/sheet-generator/ranger-archetypes';
import { buildRangerPrintModel } from '@/lib/sheet-generator/ranger-print-model';
import { rangerReferenceCards } from '@/lib/sheet-generator/ranger-reference-copy';
import type { SorcererEvidence } from '@/lib/server/sorcerer-source';
import { sorcererOriginFromLabel, type SorcererChoices } from '@/lib/sheet-generator/sorcerer-origins';
import { buildSorcererPrintModel } from '@/lib/sheet-generator/sorcerer-print-model';
import { sorcererReferenceCards } from '@/lib/sheet-generator/sorcerer-reference-copy';

export type CharacterSheetPrintOptions = { sorcererEvidence?:SorcererEvidence; sorcererChoices?:SorcererChoices; rangerEvidence?:RangerEvidence; rangerChoices?:RangerChoices; paladinEvidence?:PaladinEvidence; paladinChoices?:PaladinChoices; monkEvidence?:MonkEvidence; monkChoices?:MonkChoices; wizardEvidence?:WizardEvidence; wizardChoices?:WizardChoices; rogueEvidence?:RogueEvidence; rogueChoices?:RogueChoices; fighterEvidence?:FighterEvidence; fighterChoices?:FighterChoices; druidEvidence?:DruidEvidence; clericEvidence?:ClericEvidence; clericChoices?:ClericChoices; barbarianEvidence?:BarbarianEvidence; barbarianChoices?:BarbarianChoices; bonusSkills?: SkillKey[]; collegeFeatures?:BardPrintFeature[]; fightingStyle?:BardFightingStyle; story?: string; quickManualSections?: Array<{ title: string; body: string }> };
const W=595.28, H=841.89;
const sign=(n:number)=>n>=0?`+${n}`:`${n}`;

/** Measured wrapping: split a token only when it cannot fit a complete line. */
export function wrapSheetText(value:string,font:PDFFont,size:number,width:number):string[]{
  const lines:string[]=[];
  for(const paragraph of printPlainText(value).split('\n')){
    let line='';
    for(const word of paragraph.trim().split(/\s+/).filter(Boolean)){
      if(font.widthOfTextAtSize(word,size)>width){
        if(line){lines.push(line);line='';}let part='';
        for(const ch of word){if(font.widthOfTextAtSize(part+ch,size)>width&&part){lines.push(part);part='';}part+=ch;}line=part;
      }else if(line&&font.widthOfTextAtSize(`${line} ${word}`,size)>width){lines.push(line);line=word;}
      else line=line?`${line} ${word}`:word;
    }lines.push(line);
  }return lines;
}

export async function renderCharacterSheetV2(original:GeneratedCharacterSheet,logoBytes:Uint8Array,options:CharacterSheetPrintOptions={}){
  const bard=original.classLabel==='Bardo'?buildBardPrintModel(original,options.bonusSkills,options.collegeFeatures,options.fightingStyle):null;
  const barbarian=original.classLabel==='Barbaro'&&options.barbarianEvidence?buildBarbarianPrintModel(original,options.barbarianEvidence,options.barbarianChoices):null;
  const cleric=original.classLabel==='Chierico'&&options.clericEvidence?buildClericPrintModel(original,options.clericEvidence,options.clericChoices):null;
  const artificer=original.classLabel==='Artefice'?buildArtificerPrintModel(original):null;
  const druid=original.classLabel==='Druido'&&options.druidEvidence?buildDruidPrintModel(original,options.druidEvidence):null;
  const fighter=original.classLabel==='Guerriero'&&options.fighterEvidence?buildFighterPrintModel(original,options.fighterEvidence,options.fighterChoices):null;
  const rogue=original.classLabel==='Ladro'&&options.rogueEvidence?buildRoguePrintModel(original,options.rogueEvidence,options.rogueChoices):null;
  const wizard=original.classLabel==='Mago'&&options.wizardEvidence?buildWizardPrintModel(original,options.wizardEvidence,options.wizardChoices):null;
  const monk=original.classLabel==='Monaco'&&options.monkEvidence?buildMonkPrintModel(original,options.monkEvidence,options.monkChoices):null;
  const paladin=original.classLabel==='Paladino'&&options.paladinEvidence?buildPaladinPrintModel(original,options.paladinEvidence,options.paladinChoices):null;
  const ranger=original.classLabel==='Ranger'&&options.rangerEvidence?buildRangerPrintModel(original,options.rangerEvidence,options.rangerChoices):null;
  const sorcerer=original.classLabel==='Stregone'&&options.sorcererEvidence?buildSorcererPrintModel(original,options.sorcererEvidence,options.sorcererChoices):null;
  const model=bard??barbarian??cleric??artificer??druid??fighter??rogue??wizard??monk??paladin??ranger??sorcerer;if(!model)throw new Error('Classe o fonti non supportate dalla V2.');const s=model.sheet;
  const subclass=bard?.college??barbarian?.path??cleric?.domain??artificer?.specialist??druid?.circle??fighter?.archetype??rogue?.archetype??wizardTraditionFromLabel(wizard?.sheet.classSubclass)??monkTraditionFromLabel(monk?.sheet.classSubclass)??paladinOathFromLabel(paladin?.sheet.classSubclass)??rangerArchetypeFromLabel(ranger?.sheet.classSubclass)??sorcererOriginFromLabel(sorcerer?.sheet.classSubclass);
  const doc=await PDFDocument.create();doc.setTitle(`${s.characterName} - ${s.classLabel} V2`);
  const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.TimesRomanBold),logo=await doc.embedPng(logoBytes);
  const clean=(v:unknown)=>sanitizeTextForStandardPdfFont(String(v??''));
  const text=(p:PDFPage,x:number,y:number,v:unknown,size=8,f=font)=>p.drawText(clean(v),{x,y,size,font:f});
  const fit=(p:PDFPage,x:number,y:number,v:string,width:number,size=10,f=font)=>{const t=clean(v),m=f.widthOfTextAtSize(t,size);text(p,x,y,t,Math.min(size,m?size*width/m:size),f);};
  const banner=(p:PDFPage,x:number,top:number,width:number,title:string)=>{const t=clean(title),size=Math.min(9,(width-24.2)/Math.max(1,bold.widthOfTextAtSize(t,1)));drawFantasyBanner(p,{x,y:top-20,width,height:20},t,bold,size);};
  const frame=(p:PDFPage,x:number,top:number,width:number,height:number,title:string)=>{drawFantasyFrame(p,{x,y:top-height,width,height});banner(p,x+7,top-7,width-14,title);};
  const newPage=(title:string)=>{
    const p=doc.addPage([W,H]);drawFantasyFrame(p,{x:18,y:30,width:W-36,height:H-48});
    const scale=Math.min(124/logo.width,68/logo.height);p.drawImage(logo,{x:27,y:748,width:logo.width*scale,height:logo.height*scale});
    drawFantasyFrame(p,{x:164,y:746,width:404,height:68});
    const rule=(x:number,y:number,xx:number,yy:number)=>p.drawLine({start:{x,y},end:{x:xx,y:yy},thickness:.45});
    rule(167,792,565,792);rule(167,770,565,770);
    rule(294,792,294,770);rule(435,792,435,770);rule(197,770,197,749);rule(272,770,272,749);rule(526,770,526,749);
    text(p,173,805,'NOME',6);fit(p,173,795,s.characterName,385,12,bold);
    text(p,173,784,'RAZZA',6);fit(p,173,773,s.subraceLabel??s.raceLabel,114,8.5);
    text(p,301,784,'BACKGROUND',6);fit(p,301,773,s.backgroundLabel,126,8.5);
    text(p,443,784,'ALLINEAMENTO',6);fit(p,443,773,s.alignment??'-',115,8.5);
    (sorcerer?drawSorcererEmblem:ranger?drawRangerEmblem:paladin?drawPaladinEmblem:monk?drawMonkEmblem:wizard?drawWizardEmblem:bard?drawBardEmblem:artificer?drawArtificerEmblem:cleric?drawClericEmblem:fighter?drawFighterEmblem:rogue?drawRogueEmblem:drawBarbarianEmblem)(p,{x:168,y:747,width:27,height:22});
    text(p,204,762,'CLASSE',6);fit(p,204,750,s.classLabel.toUpperCase(),62,11,bold);
    text(p,280,762,'SOTTOCLASSE',6);fit(p,280,750,s.classSubclass??'-',237,9);
    text(p,534,762,'LIVELLO',5.5);text(p,541,750,s.level,11,bold);
    banner(p,27,738,541,title);return p;
  };
  const first=newPage('SCHEDA DEL PERSONAGGIO - V2');
  const names:Record<AbilityKey,string>={str:'FORZA',dex:'DESTREZZA',con:'COSTITUZIONE',int:'INTELLIGENZA',wis:'SAGGEZZA',cha:'CARISMA'};
  const groups:Record<AbilityKey,SkillKey[]>={str:['athletics'],dex:['acrobatics','stealth','sleight_of_hand'],con:[],int:['arcana','investigation','nature','religion','history'],wis:['animal_handling','insight','medicine','perception','survival'],cha:['deception','intimidation','performance','persuasion']};
  let y=704;
  for(const key of Object.keys(names) as AbilityKey[]){const height=Math.max(76,58+groups[key].length*11);
    drawFantasyAbility(first,{x:27,y:y-height,width:175,height},{title:names[key],score:s.abilities[key],modifier:s.abilityMods[key],savingThrow:s.savingThrows[key].value,
      skills:groups[key].map(skill=>{const v=s.skills[skill];return {label:SKILL_LABELS[skill],value:v.value,marker:v.expertise?'M':v.proficient?'C':'-'};})},font,bold);
    y-=height+8;
  }
  text(first,28,80,`Competenza ${sign(s.proficiencyBonus)} / Percezione ${s.passivePerception}`,7);text(first,28,66,'C: competenza / M: maestria',7);
  text(first,28,51,'Indebolimento ____ / Ispirazione ____',7);
  frame(first,212,704,168,71,'DIFESE');text(first,223,663,`CA ${s.armorClass} / Iniz. ${sign(s.initiative)}`,11);fit(first,223,645,`Velocità ${s.speed}`,146,8);
  frame(first,212,623,168,112,'PUNTI FERITA E DADI VITA');text(first,223,580,`Massimi ${s.hpMax}`,13,bold);text(first,223,555,'Attuali ______  Temporanei ______');text(first,223,535,`${s.hitDiceTotal} ${s.hitDie} / Dadi usati ____`);
  frame(first,212,501,168,73,'SALVEZZA DA MORTE');text(first,223,459,'Successi');text(first,223,442,'Fallimenti');
  drawFantasyTracker(first,{x:289,y:454,width:80,height:16},3);drawFantasyTracker(first,{x:289,y:437,width:80,height:16},3);
  frame(first,212,418,168,86,'ATTACCHI');s.weaponRows.slice(0,3).forEach((a,i)=>fit(first,222,380-i*14,`${a.name} ${a.toHit} / ${a.damage}`,155,8));
  if(bard){
  frame(first,212,322,168,105,'ISPIRAZIONE BARDICA');drawFantasyShield(first,{x:226,y:234,width:40,height:53},bard.die,bold);
  drawFantasyTracker(first,{x:279,y:249,width:96,height:34},bard.uses);text(first,277,237,`${bard.uses} utilizzi`);
  text(first,222,225,s.level>=5?'Recupero: riposo breve o lungo':'Recupero: riposo lungo',7.5);
  frame(first,212,207,168,153,'MAGIA E RISORSE');text(first,222,170,`CD ${s.spellSaveDc} / Attacco ${sign(s.spellAttackBonus??0)}`);
  if(s.level>=2)text(first,222,156,`Canto di riposo: ${bard.restDie}`);
  Object.entries(s.spellSlots).filter(([,n])=>n).forEach(([level,count],i)=>{const col=i>=5?1:0,row=i%5,x=222+col*75,sy=139-row*15;text(first,x,sy,`${level}°`);drawFantasyTracker(first,{x:x+19,y:sy-4,width:60,height:16},count);});
  }else if(barbarian){
    frame(first,212,322,168,105,'IRA');drawFantasyShield(first,{x:226,y:234,width:40,height:53},`+${barbarian.rage.damage}`,bold);
    if(barbarian.rage.uses!==null)drawFantasyTracker(first,{x:279,y:249,width:96,height:34},barbarian.rage.uses);
    text(first,277,237,barbarian.rage.uses===null?'Utilizzi illimitati':`${barbarian.rage.uses} utilizzi`);
    text(first,222,225,'Recupero: riposo lungo',7.5);
    frame(first,212,207,168,153,'COMBATTIMENTO');
    text(first,222,170,`Attacchi per azione: ${s.level>=5?2:1}`,9);
    if(s.level>=7)text(first,222,152,'Iniziativa: vantaggio',8);
    if(barbarian.brutalDice)text(first,222,134,`Critico brutale: +${barbarian.brutalDice} dadi`,8);
    if(s.level>=11){text(first,222,116,'Ira Implacabile: CD iniziale 10',8);text(first,222,100,'CD successiva: ____ (+5 per uso)',7.5);}
    text(first,222,76,'Bonus Ira: solo mischia con Forza',7.5);
  }
  if(cleric){
    frame(first,212,322,168,105,'INCANALARE DIVINITÀ');
    if(cleric.channelUses){drawFantasyTracker(first,{x:225,y:259,width:140,height:20},cleric.channelUses);text(first,222,248,`${cleric.channelUses} ${cleric.channelUses===1?'utilizzo condiviso':'utilizzi condivisi'}`,9);text(first,222,231,'Recupero: riposo breve o lungo',7.5);}
    else text(first,222,266,'Disponibile dal livello 2',8);
    frame(first,212,207,168,153,'MAGIA E RISORSE');text(first,222,170,`SAG / CD ${s.spellSaveDc} / Att. ${sign(s.spellAttackBonus??0)}`,8.5);
    text(first,222,155,`Preparabili: ${s.spellsPrepared} + dominio`,8);
    Object.entries(s.spellSlots).filter(([,n])=>n).forEach(([level,count],i)=>{const col=i>=5?1:0,row=i%5,x=222+col*75,sy=136-row*15;text(first,x,sy,`${level}°`);drawFantasyTracker(first,{x:x+19,y:sy-4,width:60,height:16},count);});
  }
  if(artificer){
    const state=artificer.state,attuned=state.assignments.filter(a=>a.state==='attuned'||a.state==='carried-attuned').length;
    frame(first,212,322,168,105,'INFUSIONI E SINTONIA');
    text(first,222,282,`Conosciute: ${state.known.length}/${state.knownLimit}`,9);
    text(first,222,267,`Oggetti: ${state.assignments.length}/${state.itemLimit}${state.armorBonusSlots?' + '+state.armorBonusSlots+' armatura':''}`,8);
    text(first,222,252,`Sintonia: ${attuned}/${state.attunementLimit}`,9);
    if(s.level>=7)text(first,222,233,`Lampo di Genio: ${Math.max(1,s.abilityMods.int)} usi`,8);
    frame(first,212,207,168,153,'MAGIA E RISORSE');text(first,222,170,`INT / CD ${s.spellSaveDc} / Att. ${sign(s.spellAttackBonus??0)}`,8.5);
    text(first,222,155,`Preparabili: ${s.spellsPrepared} + specialità`,8);
    Object.entries(s.spellSlots).filter(([,n])=>n).forEach(([level,count],i)=>{const sy=136-i*15;text(first,222,sy,`${level}°`);drawFantasyTracker(first,{x:246,y:sy-4,width:120,height:16},count);});
  }
  if(druid){
    frame(first,212,322,168,105,'FORMA SELVATICA');
    if(s.level<2)text(first,222,271,'Disponibile dal livello 2',8);
    else {
      if(s.level<20)drawFantasyTracker(first,{x:225,y:259,width:140,height:20},2);
      text(first,222,248,s.level>=20?'Utilizzi illimitati':'2 usi / riposo breve o lungo',8.5);
      if(s.level<20)text(first,222,231,'Recupero alla fine del riposo',7.5);
      const moon=/circolo della luna/i.test(s.classSubclass??'');
      const maxCr=moon?(s.level>=6?Math.floor(s.level/3):1):s.level>=8?1:s.level>=4?0.5:0.25;
      const crLabel=maxCr===0.25?'1/4':maxCr===0.5?'1/2':String(maxCr);
      const movement=`Nuoto ${s.level>=4?'sì':'no'} / Volo ${s.level>=8?'sì':'no'}`;
      fit(first,222,220,`GS max ${crLabel} / ${movement}`,145,7.5);
    }
    frame(first,212,207,168,153,'MAGIA DRUIDICA');text(first,222,170,`SAG / CD ${s.spellSaveDc} / Att. ${sign(s.spellAttackBonus??0)}`,8.5);
    text(first,222,155,`Preparabili: ${s.spellsPrepared} / Trucchetti: ${s.cantripsKnown}`,8);
    Object.entries(s.spellSlots).filter(([,n])=>n).forEach(([level,count],i)=>{const col=i>=5?1:0,row=i%5,x=222+col*75,sy=136-row*15;text(first,x,sy,`${level}°`);drawFantasyTracker(first,{x:x+19,y:sy-4,width:60,height:16},count);});
  }
  if(fighter){
    const res=fighter.resources;
    frame(first,212,322,168,105,'RISORSE MARZIALI');
    text(first,222,282,`Recuperare Energie: ${res.secondWind}`,8.5);
    text(first,222,267,`Azione Impetuosa: ${res.actionSurge} ${res.actionSurge===1?'uso':'usi'} / riposo breve`,8);
    drawFantasyTracker(first,{x:225,y:251,width:140,height:16},res.actionSurge);
    if(s.level>=9){
      text(first,222,236,`Indomito: ${res.indomitable} ${res.indomitable===1?'uso':'usi'} / riposo lungo`,8);
      drawFantasyTracker(first,{x:225,y:220,width:140,height:16},res.indomitable);
    }
    text(first,222,206,`Attacchi per azione: ${res.attacksPerAction}`,8.5);
    frame(first,212,192,168,138,'ARCHETIPO E CAPACITÀ');
    const ay=158;
    if(res.superiorityDice){
      text(first,222,ay,`Dadi Superiorità: ${res.superiorityDice.count} (${res.superiorityDice.die})`,8.5);
      drawFantasyTracker(first,{x:225,y:ay-18,width:140,height:16},res.superiorityDice.count);
      text(first,222,ay-32,`CD Manovre: ${res.maneuverDc} / Note: ${res.maneuversCount}`,8);
      text(first,222,ay-46,'Recupero: riposo breve o lungo',7.5);
    }else if(res.spellSaveDc){
      text(first,222,ay,`INT / CD ${res.spellSaveDc} / Att. ${sign(res.spellAttackBonus??0)}`,8.5);
      if(res.cantripsKnown)text(first,222,ay-14,`Trucchetti: ${res.cantripsKnown} / Conosciuti: ${res.spellsKnown??0}`,8);
      Object.entries(s.spellSlots).filter(([,n])=>n).forEach(([level,count],i)=>{
        const col=i>=2?1:0,row=i%2,x=222+col*75,sy=ay-32-row*16;text(first,x,sy,`${level}°`);
        drawFantasyTracker(first,{x:x+19,y:sy-4,width:60,height:16},count);
      });
    }else if(res.arcaneShot){
      text(first,222,ay,`Tiro Arcano: ${res.arcaneShot.uses} usi / riposo`,8.5);
      drawFantasyTracker(first,{x:225,y:ay-18,width:140,height:16},res.arcaneShot.uses);
      text(first,222,ay-32,`CD ${res.arcaneShot.dc} / Opzioni note: ${res.arcaneShot.optionsCount}`,8);
      if(s.level>=15)text(first,222,ay-46,'Tiro Sempre Pronto: 1 all\'iniziativa',7.5);
    }else if(res.unwaveringMarkAttacks!==undefined){
      text(first,222,ay,`Marchio: ${res.unwaveringMarkAttacks} usi / riposo lungo`,8);
      drawFantasyTracker(first,{x:225,y:ay-18,width:140,height:16},res.unwaveringMarkAttacks);
      if(res.wardingManeuverUses){
        text(first,222,ay-34,`Manovra Protettiva: ${res.wardingManeuverUses} usi (+1d8 CA)`,8);
        drawFantasyTracker(first,{x:225,y:ay-52,width:140,height:16},res.wardingManeuverUses);
      }
    }else if(res.fightingSpirit){
      text(first,222,ay,`Spirito Combattivo: ${res.fightingSpirit.uses} usi / riposo`,8);
      drawFantasyTracker(first,{x:225,y:ay-18,width:140,height:16},res.fightingSpirit.uses);
      text(first,222,ay-32,`PF Temporanei: +${res.fightingSpirit.tempHp} PF`,8);
      if(s.level>=10)text(first,222,ay-46,'Spirito Instancabile: 1 all\'iniziativa',7.5);
    }else if(res.runes){
      text(first,222,ay,`Rune note: ${res.runes.count} / Invocazioni: ${res.runes.usesPerRune}`,8);
      text(first,222,ay-13,`CD Rune: ${res.runes.dc} / Potenza Gigante: ${res.giantsMight?.uses} usi`,7.5);
      drawFantasyTracker(first,{x:225,y:ay-31,width:140,height:16},res.giantsMight?.uses??2);
      if(res.runicShieldUses)text(first,222,ay-47,`Scudo Runico: ${res.runicShieldUses} usi / riposo lungo`,7.5);
    }else if(res.psionicDice){
      const pRows = Math.ceil(res.psionicDice.count / 9);
      text(first,222,ay,`Energia Psionica: ${res.psionicDice.count} dadi (${res.psionicDice.die})`,8.5);
      drawFantasyTracker(first,{x:225,y:ay-4-pRows*16,width:140,height:pRows*16},res.psionicDice.count);
      text(first,222,ay-8-pRows*16,`CD Psionica: ${res.psionicDice.dc}`,8);
      text(first,222,ay-22-pRows*16,'Recupero: riposo lungo (+1 con az. bonus)',7.5);
    }else if(res.champion){
      text(first,222,ay,`Critico migliorato: ${res.champion.critThreshold}`,8.5);
      if(res.champion.remarkableAthlete)text(first,222,ay-15,`Atleta Straordinario: +${res.champion.remarkableAthlete} FOR/DES/COS`,8);
      if(res.champion.survivor)text(first,222,ay-30,`Sopravvissuto: recupera ${res.champion.survivor} PF a turno`,8);
    }else{
      text(first,222,ay,'Archetipo Marziale al livello 3',8.5);
    }
  }
  if(rogue){
    const res=rogue.resources;
    frame(first,212,322,168,62,'ATTACCO FURTIVO');
    drawFantasyShield(first,{x:224,y:272,width:44,height:40},res.sneakAttackDamage,bold);
    text(first,276,292,`Danno: ${res.sneakAttackDamage}`,9.5,bold);
    text(first,276,278,`Dadi: ${res.sneakAttackDice}d6`,8);
    text(first,220,265,'1 volta/turno (arma accurata o a distanza)',6.8);
    frame(first,212,252,168,198,'ARCHETIPO E CAPACITÀ');
    const ay=218;
    if(res.spellSaveDc){
      text(first,222,ay,`INT / CD ${res.spellSaveDc} / Att. ${sign(res.spellAttackBonus??0)}`,8.5);
      if(res.cantripsKnown)text(first,222,ay-14,`Trucchetti: ${res.cantripsKnown} / Conosciuti: ${res.spellsKnown??0}`,8);
      text(first,222,ay-28,'Mano Magica: invisibile, az. bonus',7.5);
      Object.entries(s.spellSlots).filter(([,n])=>n).forEach(([level,count],i)=>{
        const col=i>=2?1:0,row=i%2,x=222+col*75,sy=ay-46-row*16;text(first,x,sy,`${level}°`);
        drawFantasyTracker(first,{x:x+19,y:sy-4,width:60,height:16},count);
      });
    }else if(res.psionicDice){
      const pRows=Math.ceil(res.psionicDice.count/9);
      text(first,222,ay,`Energia Psionica: ${res.psionicDice.count} dadi (${res.psionicDice.die})`,8.5);
      drawFantasyTracker(first,{x:225,y:ay-4-pRows*16,width:140,height:pRows*16},res.psionicDice.count);
      text(first,222,ay-8-pRows*16,'Lame Psichiche: 1d6 (mischia/lancio 18m)',7.5);
      text(first,222,ay-20-pRows*16,'Seconda lama: az. bonus (1d4 psichico)',7.5);
      text(first,222,ay-32-pRows*16,'Recupero: riposo lungo (+1 con az. bonus)',7.5);
    }else if(res.wailsFromTheGraveUses!==undefined){
      text(first,222,ay,`Lamenti dalla Tomba: ${res.wailsFromTheGraveUses} usi / riposo`,8.5);
      drawFantasyTracker(first,{x:225,y:ay-18,width:140,height:16},res.wailsFromTheGraveUses);
      text(first,222,ay-32,`Danno 2° bersaglio: ${res.wailsDamageDice}d6 necrotico`,8);
      if(res.soulTrinketsMax){
        text(first,222,ay-46,`Pegni dei Defunti (max ${res.soulTrinketsMax}):`,8);
        drawFantasyTracker(first,{x:225,y:ay-64,width:140,height:16},res.soulTrinketsMax);
        text(first,222,ay-76,'Vantaggio TS morte e Costituzione',7.5);
      }
    }else if(res.initiativeChaBonus!==undefined){
      text(first,222,ay,`Audacia Fanfarone: ${sign(res.initiativeChaBonus)} Iniziativa`,8.5);
      text(first,222,ay-14,'Furtivo 1v1 senza bisogno di vantaggio',8);
      text(first,222,ay-28,'Gioco di Gambe: nessun AdO dopo attacco',7.5);
      if(s.level>=9)text(first,222,ay-42,'Spavalderia: Persuasione vs Intuizione',7.5);
      if(s.level>=13)text(first,222,ay-56,'Manovra Elegante: az. bonus vant. Acr/Atl',7.5);
      if(s.level>=17)text(first,222,ay-70,'Maestro Duellante: 1/riposo ripeti tpc',7.5);
    }else if(res.superiorMobility!==undefined){
      text(first,222,ay,'Schermagliatore: reazione muovi metà vel.',8);
      text(first,222,ay-14,'Survivalista: competenza + maestria',8);
      text(first,222,ay-28,'Natura e Sopravvivenza (applicate)',7.5);
      if(s.level>=9)text(first,222,ay-42,'Mobilità Superiore: +3m velocità (incluso)',7.5);
      if(s.level>=13)text(first,222,ay-56,'Maestro Imboscate: vantaggio Iniziativa',7.5);
      if(s.level>=17)text(first,222,ay-70,'Colpo Improvviso: 2° attacco bonus Furtivo',7.5);
    }else if(res.infallibleEyeUses!==undefined||/indagatore/i.test(s.classSubclass??'')){
      text(first,222,ay,'Combattimento Intuitivo: az. bonus Furtivo',8);
      text(first,222,ay-14,'Orecchio Inganno: d20 <= 7 -> 8 a Intuizione',7.5);
      text(first,222,ay-28,'Occhio per i Dettagli: az. bonus Perc./Indag.',7.5);
      if(res.infallibleEyeUses){
        text(first,222,ay-44,`Occhio Infallibile: ${res.infallibleEyeUses} usi / riposo lungo`,8);
        drawFantasyTracker(first,{x:225,y:ay-62,width:140,height:16},res.infallibleEyeUses);
      }
      if(s.level>=17)text(first,222,ay-76,'Punto Debole: +3d6 al Furtivo intuitivo',7.5);
    }else if(/pianificatore/i.test(s.classSubclass??'')){
      text(first,222,ay,'Maestro di Tattiche: Aiuto come az. bonus a 9m',8);
      text(first,222,ay-15,'Maestro di Intrighi: camuff., falsario, gioco',7.5);
      if(s.level>=9)text(first,222,ay-30,'Manipolatore Intuitivo: confronta statistiche',7.5);
      if(s.level>=13)text(first,222,ay-45,'Fuorviare: reazione devia attacco su copertura',7.5);
      if(s.level>=17)text(first,222,ay-60,'Anima Ingannevole: mente impenetrabile',7.5);
    }else if(/assassino/i.test(s.classSubclass??'')){
      text(first,222,ay,'Assassinare: vantaggio prima di agire',8.5);
      text(first,222,ay-15,'Colpo critico automatico su creature sorprese',8);
      if(s.level>=9)text(first,222,ay-30,'Maestro Infiltrato: crea identità fittizie',7.5);
      if(s.level>=13)text(first,222,ay-45,'Impostore: imita parlata e calligrafia',7.5);
      if(res.deathStrikeDc)text(first,222,ay-60,`Colpo Mortale: CD ${res.deathStrikeDc} raddoppia danni`,8);
    }else if(/furfante/i.test(s.classSubclass??'')){
      text(first,222,ay,'Mani Veloci: az. scaltra arnesi/oggetti',8.5);
      text(first,222,ay-15,'Lavoro 2° Piano: scalare rapido, salto +DES',8);
      if(s.level>=9)text(first,222,ay-30,'Furtività Suprema: vantaggio muovendo metà',7.5);
      if(s.level>=13)text(first,222,ay-45,'Usare Oggetto Magico: ignora requisiti',7.5);
      if(s.level>=17)text(first,222,ay-60,'Riflessi da Furfante: 2 turni al primo round',7.5);
    }else{
      text(first,222,ay,'Archetipo Ladresco al livello 3',8.5);
      text(first,222,ay-16,'Gergo Ladresco: messaggi in codice',7.5);
    }
  }
  if(wizard){
    const res=wizard.resources;
    frame(first,212,322,168,105,'RECUPERO ARCANO E TRADIZIONE');
    text(first,222,282,'Recupero Arcano (1/giorno riposo breve):',8);
    text(first,222,268,`Max slot recupero: ${res.arcaneRecoveryLevels} liv. (max 5°)`,8);
    drawFantasyTracker(first,{x:225,y:252,width:140,height:16},res.arcaneRecoveryLevels);
    if(res.arcaneWardHp!==undefined){
      text(first,222,236,`Interdizione Arcana: ${res.arcaneWardHp} PF max`,8);
      text(first,222,222,'Assorbe danni; ricarica 2x liv. incantesimo',7.5);
    }else if(res.portentDiceCount!==undefined){
      text(first,222,236,`Portento: ${res.portentDiceCount} dadi d20 / riposo lungo`,8);
      drawFantasyTracker(first,{x:225,y:220,width:140,height:16},res.portentDiceCount);
    }else if(res.powerSurgeMax!==undefined){
      text(first,222,236,`Impulso Potere: max ${res.powerSurgeMax} (+${res.powerSurgeDamage} forza)`,8);
      drawFantasyTracker(first,{x:225,y:220,width:140,height:16},res.powerSurgeMax);
    }else if(res.bladesongUses!==undefined){
      text(first,222,236,`Melodia della Lama: ${res.bladesongUses} usi / riposo lungo`,8);
      drawFantasyTracker(first,{x:225,y:220,width:140,height:16},res.bladesongUses);
      text(first,222,206,`Bonus CA +${res.bladesongAcBonus}, vel. +3m, vant. Acrobazia`,7.5);
    }else if(res.manifestMindUses!==undefined){
      text(first,222,236,`Mente Manifesta: ${res.manifestMindUses} usi / riposo lungo`,8);
      drawFantasyTracker(first,{x:225,y:220,width:140,height:16},res.manifestMindUses);
    }else{
      text(first,222,236,s.level<2?'Tradizione Arcana al livello 2':(s.classSubclass??'Tradizione Arcana attiva'),8);
    }
    frame(first,212,207,168,153,'MAGIA E INCANTESIMI');
    text(first,222,170,`INT / CD ${s.spellSaveDc} / Att. ${sign(s.spellAttackBonus??0)}`,8.5);
    text(first,222,155,`Preparabili: ${res.spellsPrepared} / Trucchetti: ${res.cantripsKnown}`,8);
    Object.entries(s.spellSlots).filter(([,n])=>n).forEach(([level,count],i)=>{
      const col=i>=5?1:0,row=i%5,x=222+col*75,sy=136-row*15;
      text(first,x,sy,`${level}°`);
      drawFantasyTracker(first,{x:x+19,y:sy-4,width:60,height:16},count);
    });
  }
  if(monk){
    const res=monk.resources;
    frame(first,212,322,168,105,'PUNTI KI E ARTI MARZIALI');
    drawFantasyShield(first,{x:224,y:248,width:44,height:48},res.martialArtsDie,bold);
    text(first,220,237,'Arti Marziali',7);
    text(first,276,285,`Punti Ki: ${res.kiPoints}`,9.5,bold);
    text(first,276,273,`CD Ki: ${res.kiSaveDc}`,8.5);
    if(res.kiPoints>0){
      const tWidth = 105;
      const tCols = Math.floor(tWidth / 15);
      const kRows = Math.ceil(res.kiPoints / tCols);
      const tHeight = kRows * 15;
      drawFantasyTracker(first,{x:270,y:270-tHeight,width:tWidth,height:tHeight},res.kiPoints);
    }
    text(first,220,221,'Recupero: riposo breve/lungo (30m meditaz.)',6.8);
    frame(first,212,207,168,153,'CAPACITÀ DEL KI E MOVIMENTO');
    const my=170;
    text(first,222,my,'Raffica di Colpi (1 pt): 2 colpi senz\'armi az. bonus',7.5);
    text(first,222,my-14,'Difesa Paziente (1 pt): Schivata come az. bonus',7.5);
    text(first,222,my-28,'Passo del Vento (1 pt): Disimpegno/Scatto, salto x2',7.3);
    text(first,222,my-42,`Deviare Proiettili (reaz.): ${res.deflectMissiles}`,7.3);
    fit(first,222,my-56,`Movim. Senza Armatura: ${res.unarmoredMovement}${s.level>=9?' (verticale/liquido)':''}`,155,7.5);
    if(res.handOfHealingDice){
      text(first,222,my-70,`Mano Guaritrice: ${res.handOfHealingDice} PF`,7.5);
      text(first,222,my-84,`Mano del Dolore (1 pt): +${res.handOfHealingDice} necrotico`,7.3);
    }else if(res.wholenessOfBodyHp){
      text(first,222,my-70,`Integrità del Corpo (1/lungo): +${res.wholenessOfBodyHp} PF`,7.5);
    }else if(res.astralArmsDamage){
      text(first,222,my-70,`Braccia Sé Astrale: ${res.astralArmsDamage} (1,5m)`,7.5);
      text(first,222,my-84,'Attacchi e salvezze FOR basati su Saggezza',7.3);
    }else if(/ombra/i.test(s.classSubclass??'')){
      text(first,222,my-70,'Arti dell\'Ombra (2 pt): Oscurità, Silenzio, Scurovis.',7.3);
      if(s.level>=6)text(first,222,my-84,'Passo dell\'Ombra: teletrasporto 18m tra ombre',7.3);
    }else if(/kensei/i.test(s.classSubclass??'')){
      text(first,222,my-70,'Armi Kensei: armi da monaco magiche dal 6°',7.3);
      if(s.level>=11)text(first,222,my-84,'Affiliare la Lama: fino a +3 tpc/danni (1-3 pt)',7.3);
    }else if(/anima solare/i.test(s.classSubclass??'')){
      text(first,222,my-70,`Dardo Solare: ${res.martialArtsDie}+DES radioso (9m)`,7.5);
    }else{
      text(first,222,my-70,s.level<3?'Tradizione Monastica al livello 3':(s.classSubclass??'Tradizione Monastica attiva'),8);
    }
  }
  if(paladin){
    const res=paladin.resources;
    frame(first,212,322,168,105,'MAGIA E RISORSE DIVINE');
    text(first,222,285,`Incantesimi: CD ${res.spellSaveDc} / TpC ${sign(res.spellAttackBonus)}`,8.5,bold);
    text(first,222,272,`Preparabili: ${res.spellsPrepared} + giuramento`,8);
    const activeSlots = Object.entries(paladin.slots).filter(([,n]) => n > 0);
    if(activeSlots.length > 0){
      activeSlots.forEach(([level, count], i) => {
        const col = i >= 3 ? 1 : 0, row = i % 3, x = 222 + col * 75, sy = 254 - row * 15;
        text(first, x, sy, `${level}°`);
        drawFantasyTracker(first, { x: x + 19, y: sy - 4, width: 60, height: 16 }, count);
      });
    } else {
      text(first, 222, 250, 'Nessuno slot incantesimo al livello 1', 7.5);
    }
    text(first, 222, 209, `Stile di Combattimento: ${res.fightingStyle}`, 7.3);
    frame(first,212,207,168,153,'CAPACITÀ DEL PALADINO');
    const py = 172;
    text(first,222,py,`Imposizione Mani: riserva ${res.layOnHandsPool} PF`,8,bold);
    text(first,222,py-12,'1 az.: cura PF o 5 PF x veleno/malattia',7.2);
    text(first,222,py-25,`Percezione Divino: ${res.divineSenseUses} utilizzi/lungo`,8,bold);
    text(first,222,py-37,'1 az.: celestiali, immondi, non morti (18m)',7.2);
    text(first,222,py-50,`Incanalare Divinità: ${res.channelDivinityUses} util./breve o lungo`,7.5);
    text(first,222,py-63,'Punizione Divina: +2d8 rad. (1°)+1d8/slot',7.2);
    text(first,222,py-74,'+1d8 vs non morti/immondi (max 5d8)',7);
    if(s.level>=6)text(first,222,py-86,`Aura Protezione (${s.level>=18?9:3}m): +${Math.max(1, s.abilityMods.cha)} TS`,7.3);
    if(s.level>=10)text(first,222,py-98,`Aura Coraggio (${s.level>=18?9:3}m): no spaventato`,7.3);
    if(s.level>=11)text(first,222,py-110,'Puniz. Divina Migliorata: +1d8 rad. fisso',7.2);
    if(res.cleansingTouchUses)text(first,222,py-122,`Tocco Purificatore: ${res.cleansingTouchUses} util./lungo`,7.2);
    if(res.conquestAuraDamage)text(first,222,py-134,`Aura Conquista: ${res.conquestAuraDamage} psichico a spaventati`,7);
    if(res.sentinelSmiteDamage)text(first,222,py-134,`Puniz. Solerte: ${res.sentinelSmiteDamage} forza su TS riuscito`,6.8);
  }
  if(ranger){
    const res=ranger.resources;
    frame(first,212,322,168,105,'NEMICO PRESCELTO ED ESPLORATORE');
    text(first,222,286,'Nemico Prescelto:',8,bold);
    const enemies = res.favoredEnemies.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ');
    fit(first,222,274,enemies || 'Nessuno',152,7.5);
    text(first,222,263,'Vantaggio a Sopravvivenza (tracce) e INT',6.8);
    text(first,222,249,'Esploratore Nato:',8,bold);
    const terrains = res.favoredTerrains.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
    fit(first,222,237,terrains || 'Nessuno',152,7.5);
    text(first,222,226,'Competenza raddoppiata INT/SAG nel terreno',6.8);
    text(first,222,216,'Terreno diff. non rallenta viaggio, cibo x2',6.5);
    frame(first,212,207,168,153,'MAGIA E ARCHETIPO RANGER');
    const ry = 172;
    text(first,222,ry,`Incantesimi: CD ${res.spellSaveDc} / TpC ${sign(res.spellAttackBonus)}`,8.5,bold);
    text(first,222,ry-13,`Conosciuti: ${res.spellsKnown} | Stile: ${res.fightingStyle}`,7.5);
    const activeSlots = Object.entries(ranger.slots).filter(([,n]) => n > 0);
    if(activeSlots.length > 0){
      activeSlots.forEach(([level, count], i) => {
        const col = i >= 3 ? 1 : 0, row = i % 3, x = 222 + col * 75, sy = ry - 28 - row * 15;
        text(first, x, sy, `${level}°`);
        drawFantasyTracker(first, { x: x + 19, y: sy - 4, width: 60, height: 16 }, count);
      });
    } else {
      text(first, 222, ry - 32, 'Nessuno slot incantesimo al livello 1', 7.5);
    }
    const ay = ry - 72;
    if(res.beastCompanion){
      const bc = res.beastCompanion;
      text(first,222,ay,`Compagno: ${bc.species}`,8,bold);
      text(first,222,ay-12,`PF ${bc.hp} / CA ${bc.ac} / Vel. ${bc.speed}`,7.5);
      text(first,222,ay-24,`Attacco: +${bc.attackBonus} TpC, Danno: ${bc.damage}`,7.2);
      fit(first,222,ay-36,bc.notes,152,6.5);
    }else if(res.dreadAmbusherInitiative!==undefined){
      text(first,222,ay,`Imboscata Terrificante: +${res.dreadAmbusherInitiative} Iniziativa`,8,bold);
      text(first,222,ay-12,'1° turno: +3m vel., attacco extra (+1d8)',7.3);
      text(first,222,ay-24,'Vista dell\'Ombra: Scurovisione +18m',7.3);
      text(first,222,ay-36,'Invisibile alle creature con scurovisione',7.2);
      if(s.level>=7)text(first,222,ay-48,'Mente di Ferro: TS Saggezza competente',7.2);
    }else if(res.huntersSenseUses!==undefined){
      text(first,222,ay,`Percezione Cacciatore: ${res.huntersSenseUses} usi/lungo`,8,bold);
      text(first,222,ay-12,'Apprende immunità, resistenze e vulnerabilità (18m)',6.8);
      text(first,222,ay-24,'Preda dell\'Uccisore (az. bonus): +1d6 danni arma',7.3);
      if(s.level>=7)text(first,222,ay-36,'Difesa Soprannaturale: +1d6 a TS contro preda',7.2);
      if(s.level>=11)text(first,222,ay-48,'Nemesi Incantatori: 1/riposo contrasta magia (18m)',6.8);
    }else if(res.planarWarriorDamage!==undefined){
      text(first,222,ay,`Combattente Planare: danni forza +${res.planarWarriorDamage}`,8,bold);
      text(first,222,ay-12,'Individuazione Portali: 1/riposo (1,5 km)',7.3);
      if(s.level>=7)text(first,222,ay-24,'Passo Etereo: az. bonus forma eterea (1/riposo)',7.2);
      if(s.level>=11)text(first,222,ay-36,'Colpo Distante: teletrasporto 3m prima di attacco',7.0);
    }else if(res.gatheredSwarmDamage!==undefined){
      text(first,222,ay,`Sciame Riunito: +${res.gatheredSwarmDamage} o sposta 4,5m`,8,bold);
      text(first,222,ay-12,`Marea Avvolgente: ${res.writhingTideUses} usi/lungo (volare 3m)`,7.5);
      if(s.level>=11)text(first,222,ay-24,'Sciame Possente: getta prono, ottieni mezza cop.',7.0);
      if(s.level>=15)text(first,222,ay-36,'Dispersione Brulicante: reaz. resistenza e teletrasporto',6.8);
    }else if(res.dreadfulStrikesDamage!==undefined){
      text(first,222,ay,`Colpi Terribili: +${res.dreadfulStrikesDamage} a creatura colpita`,8,bold);
      text(first,222,ay-12,`Fascino Ultraterreno: +${res.otherworldlyGlamourBonus} prove CAR`,7.5);
      if(s.level>=7)text(first,222,ay-24,'Scambio Seducente: vant. TS affascinato/spavent.',7.0);
      if(s.level>=11)text(first,222,ay-36,'Rinforzi Fatati: Evoca Folletto (1/lungo senza slot)',6.8);
    }else if(/cacciatore/i.test(s.classSubclass??'')){
      text(first,222,ay,'Preda del Cacciatore: tecniche speciali',8,bold);
      text(first,222,ay-12,'Sterminatore Colossi (+1d8 se ferito) / Devastatore',7.0);
      if(s.level>=7)text(first,222,ay-24,'Tattiche Difensive: Difesa Multiattacco (+4 CA)',7.0);
      if(s.level>=11)text(first,222,ay-36,'Multiattacco: Attacco Turbinante o Raffica',7.0);
      if(s.level>=15)text(first,222,ay-48,'Difesa Cacciatore Superiore: Elusione / Schivata',7.0);
    }else{
      text(first,222,ay,s.level<3?'Archetipo Ranger al livello 3':(s.classSubclass??'Archetipo Ranger attivo'),8);
    }
  }
  if(sorcerer){
    const res=sorcerer.resources;
    frame(first,212,322,168,105,'FONTE DI MAGIA E PUNTI STREGONERIA');
    text(first,222,286,`Incantesimi: CD ${res.spellSaveDc} / TpC ${sign(res.spellAttackBonus)}`,8.5,bold);
    text(first,222,273,`Trucchetti: ${res.cantripsKnown} | Conosciuti: ${res.spellsKnown}`,8);
    text(first,222,260,`Punti Stregoneria: ${res.sorceryPoints}`,8.5,bold);
    if(res.sorceryPoints>0){
      const tWidth=140, step=15;
      const tCols=Math.floor(tWidth/step);
      const pRows=Math.ceil(res.sorceryPoints/tCols);
      const tHeight=pRows*step;
      drawFantasyTracker(first,{x:225,y:248-tHeight,width:tWidth,height:tHeight},res.sorceryPoints);
      text(first,222,243-tHeight,'Slot: 1°(2pt), 2°(3pt), 3°(5pt), 4°(6pt), 5°(7pt)',6.8);
      text(first,222,232-tHeight,'Converti slot: 1 punto per livello di slot speso',6.6);
      text(first,222,221-tHeight,'Recupero: tutti i punti al riposo lungo',6.4);
    }else{
      text(first,222,246,'Punti stregoneria disponibili dal 2° livello',7.5);
      text(first,222,234,'Slot: 1°(2pt), 2°(3pt), 3°(5pt), 4°(6pt), 5°(7pt)',6.8);
      text(first,222,221,'Converti slot: 1 punto per livello di slot speso',6.6);
    }

    frame(first,212,207,168,153,'METAMAGIA E ORIGINE STREGONICA');
    const sy=172;
    if(res.metamagic.length>0){
      text(first,222,sy,`Metamagia (${res.metamagic.length} opzioni note):`,8,bold);
      res.metamagic.slice(0,3).forEach((m,i)=>{
        const my=sy-12-i*13;
        text(first,222,my,`• ${m.name} (${m.cost})`,7.3,bold);
      });
      if(res.metamagic.length>3){
        const m=res.metamagic[3];
        text(first,222,sy-51,`• ${m.name} (${m.cost})`,7.3,bold);
      }
    }else{
      text(first,222,sy,'Metamagia disponibile dal 3° livello (2 opzioni)',7.5);
    }

    const oy=res.metamagic.length>2?sy-65:sy-38;
    if(res.draconicResilience){
      const anc=res.draconicAncestry;
      text(first,222,oy,`Origine: Drago ${anc?.name??'Rosso'} (${anc?.damageType??'Fuoco'})`,8,bold);
      text(first,222,oy-11,'Resilienza Draconica: CA 13+DES senz\'armatura',7.0);
      text(first,222,oy-21,`Punti Ferita massimi: +${s.level} (+1 per livello)`,7.0);
      if(s.level>=6)text(first,222,oy-31,`Affinità: +CAR danni ${anc?.damageType??'elemento'} (1pt res. 1h)`,6.6);
      if(s.level>=14)text(first,222,oy-41,'Ali di Drago: az. bonus volare pari a velocità',6.6);
    }else if(res.tidesOfChaos){
      text(first,222,oy,'Origine: Magia Selvaggia',8,bold);
      text(first,222,oy-11,'Impulso Selvaggio: d20 dopo spell L1+; con 1 tira d100',6.6);
      text(first,222,oy-21,'Onde di Caos: vantaggio a 1 tiro (1/riposo o DM)',7.0);
      if(s.level>=6)text(first,222,oy-31,'Piegare la Fortuna (2 pt): reaz. +/- 1d4 a tiro',6.8);
      if(s.level>=14)text(first,222,oy-41,'Caos Controllato: tira 2 volte su tabella d100',6.6);
    }else if(res.favoredByTheGods){
      text(first,222,oy,`Origine: Anima Divina (Affinità ${res.divineAffinity??'Bene'})`,8,bold);
      text(first,222,oy-11,'Magia Divina: incantesimi anche da chierico',6.8);
      text(first,222,oy-21,'Prescelto dagli Dèi: +2d4 a TS/TpC fallito (1/riposo)',6.8);
      if(s.level>=6)text(first,222,oy-31,'Guarigione Potenziata (1 pt): ritira dadi cura',6.8);
      if(s.level>=14)text(first,222,oy-41,'Ali Ultraterrene: az. bonus volare 9m',6.8);
    }else if(res.eyesOfDarkness){
      text(first,222,oy,'Origine: Magia delle Ombre',8,bold);
      text(first,222,oy-11,'Occhi Oscuro: Scurovisione 36m; Oscurità a 2 pt',6.8);
      text(first,222,oy-21,'Forza della Tomba: TS CAR (CD 5+danni) evita 0 PF',6.6);
      if(s.level>=6)text(first,222,oy-31,'Segugio Presagi Nefasti (3 pt): evoca lupo ombre',6.6);
      if(s.level>=14)text(first,222,oy-41,'Camminare Ombre: az. bonus teletrasporto 36m',6.6);
    }else if(res.windSpeaker){
      text(first,222,oy,'Origine: Stregoneria della Tempesta',8,bold);
      text(first,222,oy-11,'Portavoce: Primordiale | Vola 3m senza AdO con spell',6.6);
      if(s.level>=6)text(first,222,oy-21,`Cuore Tempesta: res. fulm./tuono, ${Math.floor(s.level/2)} danni nemici`,6.6);
      if(s.level>=14)text(first,222,oy-31,`Furia Tempesta: reaz. ${s.level} fulmine e respingi 6m`,6.6);
    }else if(res.restoreBalanceUses!==undefined){
      text(first,222,oy,'Origine: Anima Meccanica (Mechanus)',8,bold);
      text(first,222,oy-11,`Ripristino Equilibrio: ${res.restoreBalanceUses} usi (annulla vant/svant)`,6.8);
      text(first,222,oy-21,'Magia Meccanica: incantesimi aggiuntivi preparati',6.6);
      if(s.level>=6)text(first,222,oy-31,'Bastione Legge (1-5 pt): scudo di d8 riduce danni',6.8);
      if(s.level>=14)text(first,222,oy-41,'Trance Ordine: d20 <= 9 conta come 10',6.8);
    }else if(res.telepathicSpeech){
      text(first,222,oy,'Origine: Mente Aberrante (Psionica)',8,bold);
      text(first,222,oy-11,`Parlata Telepatica: az. bonus raggio ${Math.max(1.5, (s.abilityMods.cha || 1) * 1.5)} km`,6.8);
      text(first,222,oy-21,'Incantesimi Psionici: incantesimi addizionali noti',6.6);
      if(s.level>=6)text(first,222,oy-31,'Stregoneria Psionica: lancia spell con punti streg.',6.6);
      if(s.level>=6)text(first,222,oy-41,'Difese Psichiche: res. psichica, vant. TS fasc./spav.',6.6);
    }else{
      text(first,222,oy,s.classSubclass?`Origine: ${s.classSubclass}`:'Origine Stregonesca al 1° livello',8);
    }
  }
  // Fixed reference-sheet wording for standard class cards; full PHB descriptions remain in the appendix.
  const domainCards=cleric?cleric.features.filter(f=>options.clericEvidence!.domainFeatures.some(d=>d.title===f.title)):[];
  const mainDomainCard=domainCards.find(f=>f.level===1&&!/COMPETENZ|TRUCCHETTO BONUS/.test(f.title));
  const cards=sorcerer?[...sorcererReferenceCards(s.level),...model.features.filter(f=>f.source.includes(' / '))]:ranger?[...rangerReferenceCards(s.level),...model.features.filter(f=>f.source.includes(' / '))]:paladin?[...paladinReferenceCards(s.level),...model.features.filter(f=>f.source.includes(' / '))]:bard?bardReferenceCards(s.level):artificer?[...artificer.state.features.filter(f=>f.source.includes(s.classSubclass??'__none__')&&!/COMPETENZA|STRUMENTI DEL MESTIERE/.test(f.title)).slice(0,1),...artificerReferenceCards(s.level)]:cleric?[
    {title:'Incantesimi di Dominio',level:1,source:cleric.domain.label,body:cleric.domainSpells.map(spell=>`${spell.level}°: ${spell.name}`).join('\n')},
    ...(mainDomainCard?[mainDomainCard]:[]),
    ...clericReferenceCards(s.level,cleric.undeadCr),
    ...domainCards.filter(f=>f!==mainDomainCard),
  ]:druid?[...druidReferenceCards(s.level,s.classSubclass),...model.features.filter(f=>f.source.includes(' / Circolo'))]:fighter?[...fighterReferenceCards(s.level,options.fighterChoices?.fightingStyle,options.fighterChoices?.secondFightingStyle),...model.features.filter(f=>f.source.includes(' / '))]:rogue?[...rogueReferenceCards(s.level),...model.features.filter(f=>f.source.includes(' / '))]:wizard?[...wizardReferenceCards(s.level),...model.features.filter(f=>f.source.includes(' / '))]:monk?[...monkReferenceCards(s.level),...model.features.filter(f=>f.source.includes(' / '))]:barbarianReferenceCards(s.level);let ry=704;
  for(const card of cards){const lines=wrapSheetText(card.body,font,8.5,157),height=43+lines.length*10.5;if(ry-height<89)continue;
    frame(first,390,ry,178,height,card.title);lines.forEach((l,i)=>text(first,401,ry-40-i*10.5,l,8.5));ry-=height+9;}
  const continuation:BardPrintFeature[]=[...model.features];
  text(first,400,Math.max(65,ry-6),'Testi completi nelle pagine seguenti.',7);
  let reference=newPage('PRIVILEGI, TRATTI E DOTAZIONE'),refY=704;
  const section=(title:string,value:string)=>{
    const pending=wrapSheetText(value||'Nessun dato disponibile.',font,9,509);let part=0;
    while(pending.length){if(refY<137){reference=newPage('PRIVILEGI, TRATTI E DOTAZIONE');refY=704;}
      const room=Math.floor((refY-67-43)/12),chunk=pending.splice(0,Math.max(1,room)),height=43+chunk.length*12;
      frame(reference,27,refY,541,height,title+(part?' (continua)':''));chunk.forEach((l,i)=>text(reference,42,refY-39-i*12,l,9));refY-=height+12;part++;
    }
  };
  continuation.forEach(f=>section(f.title,`Fonte: ${f.source}\n\n${f.body}`));
  if(s.weaponRows.length>3)section('Altri attacchi',s.weaponRows.slice(3).map(a=>`${a.name}: ${a.toHit} / ${a.damage} (${a.type})`).join('\n'));
  section('Identità',[`Nome: ${s.characterName}`,`Razza: ${s.raceLabel}${s.subraceLabel?' / '+s.subraceLabel:''}`,`Classe: ${s.classLabel} ${s.level} / ${s.classSubclass??'Nessuna sottoclasse'}`,`Allineamento: ${s.alignment??'-'} / Età: ${s.age??'-'} / Sesso: ${s.sex??'-'}`,`Altezza: ${s.height??'-'} / Peso: ${s.weight??'-'}`].join('\n'));
  section('Linguaggi e competenze',[...s.languages,...s.armorProficiencies,...s.weaponProficiencies,...s.toolProficiencies].join(', '));
  section('Tratti razziali',[s.raceTraitsMd,s.subraceTraitsMd].filter(Boolean).join('\n\n'));section('Inventario',s.inventory.join('\n'));section('Background',s.backgroundMd??s.backgroundLabel);
  let spellPage:PDFPage,rowY=0;const xs=[27,52,186,229,273,568];
  const newSpellPage=()=>{spellPage=newPage('INCANTESIMI');fit(spellPage,28,699,sorcerer||ranger||paladin||bard||cleric||artificer||druid||fighter||rogue||wizard||monk?`Classe: ${s.classLabel} / Caratteristica: ${artificer||fighter||rogue||wizard?'Intelligenza':(paladin||bard||sorcerer)?'Carisma':'Saggezza'} / Attacco: ${sign(s.spellAttackBonus??0)} / CD: ${s.spellSaveDc}`:`Classe: Barbaro / Magia del cammino: vedi restrizioni nei singoli incantesimi`,537,9);
    ['Liv.','Nome incantesimo','V S M','Rit. / Conc.','Effetto'].forEach((label,i)=>text(spellPage,xs[i]+3,675,label,7.5));rowY=661;};
  if(s.spells.length)newSpellPage();
  for(const spell of s.spells){const nameLines=wrapSheetText(spell.name,font,8,125),body=spell.fullTextMd?.trim();
    if(!body)throw new Error(`Testo del manuale non disponibile per ${spell.name}.`);
    const remaining=wrapSheetText(body,font,8.5,283);let continued=false;
    do{const minLines=nameLines.length+(continued?1:0);if(rowY-Math.max(36,minLines*11+12)<57)newSpellPage();
      const available=Math.floor((rowY-57-12)/11),chunk=remaining.splice(0,Math.max(1,available)),height=Math.max(36,Math.max(chunk.length,minLines)*11+12);
      for(let i=0;i<5;i++)spellPage!.drawRectangle({x:xs[i],y:rowY-height,width:xs[i+1]-xs[i],height,borderWidth:.45,color:rgb(1,1,1)});
      text(spellPage!,30,rowY-13,spell.level);[...nameLines,...(continued?['(continua)']:[])].forEach((l,i)=>text(spellPage!,56,rowY-13-i*11,l));
      text(spellPage!,189,rowY-13,[spell.verbal?'V':'',spell.somatic?'S':'',spell.material?'M':''].join(' '),7);
      text(spellPage!,232,rowY-13,`${spell.ritual?'Rit.':''} ${spell.concentration?'Conc.':''}`,7);chunk.forEach((l,i)=>text(spellPage!,279,rowY-13-i*11,l,8.5));rowY-=height;continued=true;
    }while(remaining.length);
  }

  if(options.story?.trim()){reference=newPage('STORIA DEL PERSONAGGIO');refY=704;section('Storia',options.story);}
  options.quickManualSections?.length&&(()=>{reference=newPage('MANUALE RAPIDO');refY=704;options.quickManualSections.forEach(f=>section(f.title,f.body));})();
  const book=subclass?.supplementRulesSource.manualBookKey;
  const rules=artificer?'Tasha + Dungeon Master / magie: PHB, Xanathar, Tasha':book==='xanathar'?'PHB + Xanathar':book==='tasha'?'PHB + Tasha':book==='van_richten_ravenloft'?'PHB + Van Richten':'Manuale del Giocatore';
  doc.getPages().forEach((p,i)=>text(p,28,16,`Barber & Dragons / ${s.classLabel} V2 / ${i===0?`Testi sintetici: scheda ${s.classLabel} ${artificer?'editabile':bard?'V1.4':(s.classLabel==='Guerriero'||s.classLabel==='Ladro'||s.classLabel==='Mago'||s.classLabel==='Monaco'||s.classLabel==='Paladino'||s.classLabel==='Ranger'||s.classLabel==='Stregone')?'5e':'v14'}`:`Regole: ${rules}`} / ${i+1} di ${doc.getPageCount()}`,7));
  return doc.save();
}
