import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { GeneratedCharacterSheet, SkillKey, AbilityKey } from '@/lib/sheet-generator/types';
import { buildBardPrintModel, printPlainText, SKILL_LABELS, type BardPrintFeature } from '@/lib/sheet-generator/bard-print-model';
import { sanitizeTextForStandardPdfFont } from './winansi-text';
import { drawFantasyFrame, drawFantasyBanner, drawFantasyTracker, drawFantasyShield } from './fantasy-sheet-graphics';

export type BardSheetPrintOptions = { bonusSkills?: SkillKey[]; story?: string; quickManualSections?: Array<{ title: string; body: string }> };
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

export async function renderExperimentalBardSheet(original:GeneratedCharacterSheet,logoBytes:Uint8Array,options:BardSheetPrintOptions={}){
  const model=buildBardPrintModel(original,options.bonusSkills);const s=model.sheet;
  const doc=await PDFDocument.create();doc.setTitle(`${s.characterName} - Bardo V2`);
  const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.TimesRomanBold),logo=await doc.embedPng(logoBytes);
  const clean=(v:unknown)=>sanitizeTextForStandardPdfFont(String(v??''));
  const text=(p:PDFPage,x:number,y:number,v:unknown,size=8,f=font)=>p.drawText(clean(v),{x,y,size,font:f});
  const fit=(p:PDFPage,x:number,y:number,v:string,width:number,size=10,f=font)=>{const t=clean(v),m=f.widthOfTextAtSize(t,size);text(p,x,y,t,Math.min(size,m?size*width/m:size),f);};
  const banner=(p:PDFPage,x:number,top:number,width:number,title:string)=>{const t=clean(title),size=Math.min(9,(width-24)/Math.max(1,bold.widthOfTextAtSize(t,1)));drawFantasyBanner(p,{x,y:top-20,width,height:20},t,bold,size);};
  const frame=(p:PDFPage,x:number,top:number,width:number,height:number,title:string)=>{drawFantasyFrame(p,{x,y:top-height,width,height});banner(p,x+7,top-7,width-14,title);};
  const newPage=(title:string)=>{
    const p=doc.addPage([W,H]);drawFantasyFrame(p,{x:18,y:30,width:W-36,height:H-48});
    const scale=Math.min(124/logo.width,64/logo.height);p.drawImage(logo,{x:27,y:751,width:logo.width*scale,height:logo.height*scale});
    fit(p,170,797,s.characterName,390,17,bold);fit(p,170,777,`Bardo ${s.level} / ${s.classSubclass??'Nessun collegio'}`,390,10);
    fit(p,170,759,`${s.subraceLabel??s.raceLabel} / ${s.backgroundLabel}`,390,9);banner(p,27,738,541,title);return p;
  };
  const first=newPage('SCHEDA DEL PERSONAGGIO - V2');
  const names:Record<AbilityKey,string>={str:'FORZA',dex:'DESTREZZA',con:'COSTITUZIONE',int:'INTELLIGENZA',wis:'SAGGEZZA',cha:'CARISMA'};
  const groups:Record<AbilityKey,SkillKey[]>={str:['athletics'],dex:['acrobatics','stealth','sleight_of_hand'],con:[],int:['arcana','investigation','nature','religion','history'],wis:['animal_handling','insight','medicine','perception','survival'],cha:['deception','intimidation','performance','persuasion']};
  let y=704;
  for(const key of Object.keys(names) as AbilityKey[]){const height=58+groups[key].length*12;frame(first,27,y,148,height,names[key]);
    text(first,37,y-44,`${s.abilities[key]} (${sign(s.abilityMods[key])})`,13,bold);text(first,105,y-43,`TS ${sign(s.savingThrows[key].value)}`);
    groups[key].forEach((skill,i)=>{const v=s.skills[skill];fit(first,36,y-60-i*12,`${v.expertise?'M':v.proficient?'C':'-'} ${SKILL_LABELS[skill]}`,111,7.8);text(first,151,y-60-i*12,sign(v.value),7.8);});y-=height+8;
  }
  text(first,28,80,`Competenza ${sign(s.proficiencyBonus)} / Percezione ${s.passivePerception}`,7);text(first,28,66,'C: competenza / M: maestria',7);
  text(first,28,51,'Indebolimento ____ / Ispirazione ____',7);
  frame(first,185,704,175,71,'DIFESE');text(first,196,663,`CA ${s.armorClass} / Iniz. ${sign(s.initiative)}`,11);text(first,196,645,`Velocità ${s.speed}`);
  frame(first,185,623,175,112,'PUNTI FERITA E DADI VITA');text(first,196,580,`Massimi ${s.hpMax}`,13,bold);text(first,196,555,'Attuali ______  Temporanei ______');text(first,196,535,`${s.hitDiceTotal} ${s.hitDie} / Dadi usati ____`);
  frame(first,185,501,175,73,'SALVEZZA DA MORTE');text(first,196,459,'Successi');text(first,196,442,'Fallimenti');
  drawFantasyTracker(first,{x:262,y:454,width:80,height:16},3);drawFantasyTracker(first,{x:262,y:437,width:80,height:16},3);
  frame(first,185,418,175,86,'ATTACCHI');s.weaponRows.slice(0,3).forEach((a,i)=>fit(first,195,380-i*14,`${a.name} ${a.toHit} / ${a.damage}`,155,8));
  frame(first,185,322,175,105,'ISPIRAZIONE BARDICA');drawFantasyShield(first,{x:199,y:234,width:40,height:53},model.die,bold);
  drawFantasyTracker(first,{x:252,y:249,width:96,height:34},model.uses);text(first,250,237,`${model.uses} utilizzi`);
  text(first,195,225,s.level>=5?'Recupero: riposo breve o lungo':'Recupero: riposo lungo',7.5);
  frame(first,185,207,175,153,'MAGIA E RISORSE');text(first,195,170,`CD ${s.spellSaveDc} / Attacco ${sign(s.spellAttackBonus??0)}`);
  if(s.level>=2)text(first,195,156,`Canto di riposo: ${model.restDie}`);
  Object.entries(s.spellSlots).filter(([,n])=>n).forEach(([level,count],i)=>{const col=i>=5?1:0,row=i%5,x=195+col*78,sy=139-row*15;text(first,x,sy,`${level}°`);drawFantasyTracker(first,{x:x+19,y:sy-4,width:62,height:16},count);});
  const priority=['ISPIRAZIONE BARDICA','FONTE DI ISPIRAZIONE','PAROLE TAGLIENTI','ISPIRAZIONE IN COMBATTIMENTO','CANTO DI RIPOSO'];
  const ordered=[...model.features].sort((a,b)=>{const pa=priority.indexOf(a.title.toUpperCase()),pb=priority.indexOf(b.title.toUpperCase());return(pa<0?99:pa)-(pb<0?99:pb);});
  let ry=704;const continuation:BardPrintFeature[]=[];
  for(const f of ordered){const lines=wrapSheetText(f.body,font,8,177),height=43+lines.length*10;if(ry-height<89){continuation.push(f);continue;}frame(first,370,ry,198,height,f.title);lines.forEach((l,i)=>text(first,381,ry-40-i*10,l));ry-=height+9;}
  text(first,380,Math.max(65,ry-6),continuation.length?'Altre capacità nelle pagine seguenti.':'Capacità del livello attuale.',7);
  let reference=newPage('PRIVILEGI, TRATTI E DOTAZIONE'),refY=704;
  const section=(title:string,value:string)=>{
    const pending=wrapSheetText(value||'Nessun dato disponibile.',font,9,509);let part=0;
    while(pending.length){if(refY<137){reference=newPage('PRIVILEGI, TRATTI E DOTAZIONE');refY=704;}
      const room=Math.floor((refY-67-43)/12),chunk=pending.splice(0,Math.max(1,room)),height=43+chunk.length*12;
      frame(reference,27,refY,541,height,title+(part?' (continua)':''));chunk.forEach((l,i)=>text(reference,42,refY-39-i*12,l,9));refY-=height+12;part++;
    }
  };
  continuation.forEach(f=>section(f.title,f.body));
  if(s.weaponRows.length>3)section('Altri attacchi',s.weaponRows.slice(3).map(a=>`${a.name}: ${a.toHit} / ${a.damage} (${a.type})`).join('\n'));
  section('Identità',[`Nome: ${s.characterName}`,`Razza: ${s.raceLabel}${s.subraceLabel?' / '+s.subraceLabel:''}`,`Classe: Bardo ${s.level} / ${s.classSubclass??'Nessun collegio'}`,`Allineamento: ${s.alignment??'-'} / Età: ${s.age??'-'} / Sesso: ${s.sex??'-'}`,`Altezza: ${s.height??'-'} / Peso: ${s.weight??'-'}`].join('\n'));
  section('Linguaggi e competenze',[...s.languages,...s.armorProficiencies,...s.weaponProficiencies,...s.toolProficiencies].join(', '));
  section('Tratti razziali',[s.raceTraitsMd,s.subraceTraitsMd].filter(Boolean).join('\n\n'));section('Inventario',s.inventory.join('\n'));section('Background',s.backgroundMd??s.backgroundLabel);
  let spellPage:PDFPage,rowY=0;const xs=[27,52,186,229,273,568];
  const newSpellPage=()=>{spellPage=newPage('INCANTESIMI');fit(spellPage,28,699,`Classe: Bardo / Caratteristica: Carisma / Attacco: ${sign(s.spellAttackBonus??0)} / CD: ${s.spellSaveDc}`,537,9);
    ['Liv.','Nome incantesimo','V S M','Rit. / Conc.','Effetto'].forEach((label,i)=>text(spellPage,xs[i]+3,675,label,7.5));rowY=661;};
  newSpellPage();
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
  if(!s.spells.length)text(spellPage!,32,640,'Nessun incantesimo selezionato.');
  if(options.story?.trim()){reference=newPage('STORIA DEL PERSONAGGIO');refY=704;section('Storia',options.story);}
  if(options.quickManualSections?.length){reference=newPage('MANUALE RAPIDO');refY=704;options.quickManualSections.forEach(f=>section(f.title,f.body));}
  doc.getPages().forEach((p,i)=>text(p,28,16,`Barber & Dragons / Bardo V2 / Manuale del Giocatore / ${i+1} di ${doc.getPageCount()}`,7));
  return doc.save();
}
