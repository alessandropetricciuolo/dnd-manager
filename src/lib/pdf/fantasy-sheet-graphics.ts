import { PDFDocument, PDFPage, PDFFont, rgb } from 'pdf-lib';

/** Shared vector ornaments. Coordinates use PDF points, from the bottom left. */
const INK = rgb(0.12, 0.12, 0.12);
const PAPER = rgb(0.96, 0.95, 0.92);
export type FantasyBox = { x: number; y: number; width: number; height: number };

function stroke(page: PDFPage, x: number, y: number, xx: number, yy: number, thickness = 0.7) {
  page.drawLine({ start: { x, y }, end: { x: xx, y: yy }, thickness, color: INK });
}

/** Clipped corners, inset border and diamond rivets; expands without stretching bitmaps. */
export function drawFantasyFrame(page: PDFPage, b: FantasyBox) {
  const { x, y, width: w, height: h } = b;
  if (w < 28 || h < 28) throw new Error('Fantasy frame requires at least 28 x 28 points');
  const k = 6;
  const points = [[x+k,y],[x+w-k,y],[x+w,y+k],[x+w,y+h-k],[x+w-k,y+h],[x+k,y+h],[x,y+h-k],[x,y+k]];
  points.forEach((p,i) => { const q=points[(i+1)%points.length]; stroke(page,p[0],p[1],q[0],q[1],1); });
  page.drawRectangle({x:x+3,y:y+3,width:w-6,height:h-6,borderWidth:0.35,borderColor:INK});
  for (const [cx,cy] of [[x+6,y+6],[x+w-6,y+6],[x+6,y+h-6],[x+w-6,y+h-6]]) {
    stroke(page,cx-2,cy,cx,cy+2); stroke(page,cx,cy+2,cx+2,cy);
    stroke(page,cx+2,cy,cx,cy-2); stroke(page,cx,cy-2,cx-2,cy);
  }
}

/** Scroll-like title band, with folded ends. */
export function drawFantasyBanner(page: PDFPage, b: FantasyBox, title: string, font: PDFFont, size = 9) {
  if (font.widthOfTextAtSize(title,size)>b.width-24) throw new Error('Banner title exceeds available width');
  page.drawRectangle({x:b.x,y:b.y,width:b.width,height:b.height,color:PAPER,borderColor:INK,borderWidth:0.7});
  for (const x of [b.x,b.x+b.width]) {
    const d=x===b.x?-1:1;
    stroke(page,x,b.y+3,x+d*5,b.y-2); stroke(page,x+d*5,b.y-2,x+d*5,b.y+b.height-4);
    stroke(page,x+d*5,b.y+b.height-4,x,b.y+b.height-7);
  }
  page.drawText(title,{x:b.x+(b.width-font.widthOfTextAtSize(title,size))/2,y:b.y+(b.height-size)/2+1,size,font,color:INK});
}

/** Shield for scores, AC and spell DC; value remains actual text. */
export function drawFantasyShield(page: PDFPage, b: FantasyBox, value: string, font: PDFFont) {
  const {x,y,width:w,height:h}=b;
  const pts=[[x,y+h],[x+w,y+h],[x+w,y+h*0.3],[x+w/2,y],[x,y+h*0.3]];
  pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length];stroke(page,p[0],p[1],q[0],q[1],1);});
  const size=Math.min(22,h*.4,(w-8)/Math.max(1,font.widthOfTextAtSize(value,1)));
  if(font.widthOfTextAtSize(value,size)>w-8) throw new Error('Shield value exceeds available width');
  page.drawText(value,{x:x+(w-font.widthOfTextAtSize(value,size))/2,y:y+h*.4,size,font,color:INK});
}

/** Empty diamonds to pencil in; returns the height consumed by wrapped rows. */
export function drawFantasyTracker(page: PDFPage, b: FantasyBox, count: number): number {
  if(!Number.isInteger(count)||count<0||count>100) throw new Error('Invalid resource count');
  const step=15, cols=Math.floor(b.width/step);
  if(cols<1) throw new Error('Tracker width too small');
  const height=Math.ceil(count/cols)*step;
  if(height>b.height) throw new Error('Tracker exceeds its box');
  for(let i=0;i<count;i++) {
    const cx=b.x+6+(i%cols)*step,cy=b.y+b.height-7-Math.floor(i/cols)*step;
    const pts=[[cx-4,cy],[cx,cy+4],[cx+4,cy],[cx,cy-4]];
    pts.forEach((p,j)=>{const q=pts[(j+1)%4];stroke(page,p[0],p[1],q[0],q[1]);});
  }
  return height;
}

/** Supply the existing public/logo.png bytes; preserve the logo aspect ratio. */
export async function drawBarberDragonsLogo(doc: PDFDocument, page: PDFPage, png: Uint8Array, b: FantasyBox) {
  const logo=await doc.embedPng(png);
  const scale=Math.min(b.width/logo.width,b.height/logo.height);
  page.drawImage(logo,{x:b.x,y:b.y+b.height-logo.height*scale,width:logo.width*scale,height:logo.height*scale});
}
