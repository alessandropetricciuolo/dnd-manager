import fs from 'node:fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { drawFantasyFrame, drawFantasyBanner, drawFantasyShield, drawFantasyTracker, drawBarberDragonsLogo } from '../../src/lib/pdf/fantasy-sheet-graphics';

async function main() {
  const doc=await PDFDocument.create();
  const page=doc.addPage([595.28,841.89]);
  const title=await doc.embedFont(StandardFonts.TimesRomanBold);
  const body=await doc.embedFont(StandardFonts.Helvetica);
  const label=(x:number,y:number,t:string,size=10)=>page.drawText(t,{x,y,size,font:body,color:rgb(.22,.22,.22)});
  await drawBarberDragonsLogo(doc,page,fs.readFileSync('public/logo.png'),{x:30,y:720,width:165,height:95});
  page.drawText('Elementi della scheda',{x:225,y:785,size:23,font:title});
  label(225,762,'Prima proposta / stile fantasy / stampa A4');
  label(30,690,'01  INTESTAZIONE A PERGAMENA');
  drawFantasyBanner(page,{x:40,y:639,width:515,height:32},'PRIVILEGI DEL BARDO',title,13);
  label(30,603,'02  CORNICI ADATTABILI');
  drawFantasyFrame(page,{x:30,y:428,width:255,height:155});
  drawFantasyBanner(page,{x:42,y:546,width:231,height:24},'Ispirazione Bardica',title,11);
  label(47,519,'Testo della capacità dal manuale.',10);
  label(47,501,'Il riquadro si adatta al contenuto.',10);
  label(47,455,'Azione bonus / Recupero / Durata',9);
  drawFantasyFrame(page,{x:305,y:428,width:260,height:155});
  drawFantasyBanner(page,{x:317,y:546,width:236,height:24},'Attacchi',title,11);
  for(let y=517;y>=457;y-=30) page.drawLine({start:{x:320,y},end:{x:550,y},thickness:.4,color:rgb(.55,.55,.55)});
  label(320,525,'Arma',9);label(435,525,'TpC',9);label(490,525,'Danni',9);
  label(30,393,'03  SCUDI PER VALORI E DADI');
  for(const [x,v,t] of [[45,'16','CARISMA'],[175,'14','CA'],[305,'d8','ISPIRAZIONE'],[435,'+3','COMPETENZA']] as const) {
    drawFantasyShield(page,{x,y:277,width:80,height:88},v,title);
    label(x,258,t,8);
  }
  label(30,218,'04  CONTATORI DA ANNOTARE A MATITA');
  drawFantasyFrame(page,{x:30,y:108,width:535,height:90});
  label(47,173,'Ispirazione Bardica',11);
  drawFantasyTracker(page,{x:300,y:148,width:240,height:32},3);
  label(47,135,'Risorsa con più utilizzi',11);
  drawFantasyTracker(page,{x:300,y:112,width:240,height:32},12);
  label(30,69,'Componenti vettoriali riutilizzabili: testi, misure e quantità sono variabili.',9);
  label(30,51,'Il logo è quello esistente di Barber & Dragons.',9);
  fs.writeFileSync('output/pdf/bardo-prototipo/Elementi-grafici-fantasy.pdf',await doc.save());
}
main().catch(e=>{console.error(e);process.exitCode=1;});
