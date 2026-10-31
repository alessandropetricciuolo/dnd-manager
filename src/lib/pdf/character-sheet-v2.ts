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
import { drawFantasyFrame, drawFantasyBanner, drawFantasyTracker, drawFantasyShield, drawBardEmblem, drawBarbarianEmblem, drawClericEmblem, drawArtificerEmblem, drawFantasyAbility } from './fantasy-sheet-graphics';

export type CharacterSheetPrintOptions = { clericEvidence?:ClericEvidence; clericChoices?:ClericChoices; barbarianEvidence?:BarbarianEvidence; barbarianChoices?:BarbarianChoices; bonusSkills?: SkillKey[]; collegeFeatures?:BardPrintFeature[]; fightingStyle?:BardFightingStyle; story?: string; quickManualSections?: Array<{ title: string; body: string }> };
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
  const model=bard??barbarian??cleric??artificer;if(!model)throw new Error('Classe o fonti non supportate dalla V2.');const s=model.sheet;
  const subclass=bard?.college??barbarian?.path??cleric?.domain??artificer?.specialist;
  const doc=await PDFDocument.create();doc.setTitle(`${s.characterName} - ${s.classLabel} V2`);
  const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.TimesRomanBold),logo=await doc.embedPng(logoBytes);
  const clean=(v:unknown)=>sanitizeTextForStandardPdfFont(String(v??''));
  const text=(p:PDFPage,x:number,y:number,v:unknown,size=8,f=font)=>p.drawText(clean(v),{x,y,size,font:f});
  const fit=(p:PDFPage,x:number,y:number,v:string,width:number,size=10,f=font)=>{const t=clean(v),m=f.widthOfTextAtSize(t,size);text(p,x,y,t,Math.min(size,m?size*width/m:size),f);};
  const banner=(p:PDFPage,x:number,top:number,width:number,title:string)=>{const t=clean(title),size=Math.min(9,(width-24)/Math.max(1,bold.widthOfTextAtSize(t,1)));drawFantasyBanner(p,{x,y:top-20,width,height:20},t,bold,size);};
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
    (bard?drawBardEmblem:artificer?drawArtificerEmblem:cleric?drawClericEmblem:drawBarbarianEmblem)(p,{x:168,y:747,width:27,height:22});
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
  // Fixed reference-sheet wording for standard class cards; full PHB descriptions remain in the appendix.
  const domainCards=cleric?cleric.features.filter(f=>options.clericEvidence!.domainFeatures.some(d=>d.title===f.title)):[];
  const mainDomainCard=domainCards.find(f=>f.level===1&&!/COMPETENZ|TRUCCHETTO BONUS/.test(f.title));
  const cards=bard?bardReferenceCards(s.level):artificer?[...artificer.state.features.filter(f=>f.source.includes(s.classSubclass??'__none__')&&!/COMPETENZA|STRUMENTI DEL MESTIERE/.test(f.title)).slice(0,1),...artificerReferenceCards(s.level)]:cleric?[
    {title:'Incantesimi di Dominio',level:1,source:cleric.domain.label,body:cleric.domainSpells.map(spell=>`${spell.level}°: ${spell.name}`).join('\n')},
    ...(mainDomainCard?[mainDomainCard]:[]),
    ...clericReferenceCards(s.level,cleric.undeadCr),
    ...domainCards.filter(f=>f!==mainDomainCard),
  ]:barbarianReferenceCards(s.level);let ry=704;
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
  const newSpellPage=()=>{spellPage=newPage('INCANTESIMI');fit(spellPage,28,699,bard||cleric||artificer?`Classe: ${s.classLabel} / Caratteristica: ${artificer?'Intelligenza':cleric?'Saggezza':'Carisma'} / Attacco: ${sign(s.spellAttackBonus??0)} / CD: ${s.spellSaveDc}`:`Classe: Barbaro / Magia del cammino: vedi restrizioni nei singoli incantesimi`,537,9);
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
  if(options.quickManualSections?.length){reference=newPage('MANUALE RAPIDO');refY=704;options.quickManualSections.forEach(f=>section(f.title,f.body));}
  const book=subclass?.supplementRulesSource.manualBookKey;
  const rules=artificer?'Tasha + Dungeon Master / magie: PHB, Xanathar, Tasha':book==='xanathar'?'PHB + Xanathar':book==='tasha'?'PHB + Tasha':book==='van_richten_ravenloft'?'PHB + Van Richten':'Manuale del Giocatore';
  doc.getPages().forEach((p,i)=>text(p,28,16,`Barber & Dragons / ${s.classLabel} V2 / ${i===0?`Testi sintetici: scheda ${s.classLabel} ${artificer?'editabile':bard?'V1.4':'v14'}`:`Regole: ${rules}`} / ${i+1} di ${doc.getPageCount()}`,7));
  return doc.save();
}
