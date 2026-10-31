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

/** A monochrome lute badge drawn as vectors, usable at any print resolution. */
export function drawBardEmblem(page: PDFPage, b: FantasyBox) {
  const scale = Math.min(b.width / 36, b.height / 36);
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  page.drawCircle({ x: cx, y: cy, size: 17 * scale, borderColor: INK, borderWidth: .7 });
  page.drawEllipse({ x: cx, y: cy - 6 * scale, xScale: 6 * scale, yScale: 8 * scale, color: INK });
  page.drawRectangle({ x: cx - 1.5 * scale, y: cy - 2 * scale, width: 3 * scale, height: 15 * scale, color: INK });
  page.drawRectangle({ x: cx - 2.5 * scale, y: cy + 10 * scale, width: 5 * scale, height: 4 * scale, color: INK });
  page.drawCircle({ x: cx, y: cy - 5 * scale, size: 2 * scale, color: rgb(1, 1, 1) });
  for (const dx of [-.6, .6]) page.drawLine({ start: { x: cx + dx * scale, y: cy - 11 * scale }, end: { x: cx + dx * scale, y: cy + 11 * scale }, color: rgb(.7, .7, .7), thickness: .3 * scale });
  for (const dy of [8, 11]) stroke(page, cx - 3 * scale, cy + dy * scale, cx + 3 * scale, cy + dy * scale, .6);
}

/** Score above a larger modifier; saves and skills form a separate side-by-side column. */
export function drawFantasyAbility(page: PDFPage, b: FantasyBox, data: {
  title: string; score: number; modifier: number; savingThrow: number;
  skills: Array<{ label: string; value: number; marker: string }>;
}, font: PDFFont, titleFont: PDFFont) {
  const top = b.y + b.height;
  const sign = (n: number) => n >= 0 ? `+${n}` : `${n}`;
  drawFantasyFrame(page, b);
  drawFantasyBanner(page, { x: b.x + 7, y: top - 27, width: b.width - 14, height: 20 }, data.title, titleFont, 9);
  const center = b.x + 25;
  const score = String(data.score), modifier = sign(data.modifier);
  page.drawText(score, { x: center - font.widthOfTextAtSize(score, 12) / 2, y: top - 44, size: 12, font, color: INK });
  page.drawText(modifier, { x: center - titleFont.widthOfTextAtSize(modifier, 25) / 2, y: top - 69, size: 25, font: titleFont, color: INK });
  stroke(page, b.x + 49, top - 33, b.x + 49, b.y + 10, .35);
  const rows = [{ label: 'Tiro salvezza', value: data.savingThrow, marker: '' }, ...data.skills];
  rows.forEach((row, i) => {
    const y = top - 40 - i * 11;
    const label = `${row.marker ? row.marker + ' ' : ''}${row.label}`;
    const width = b.width - 83;
    const size = Math.min(8, width / Math.max(1, font.widthOfTextAtSize(label, 1)));
    page.drawText(label, { x: b.x + 56, y, size, font, color: INK });
    const value = sign(row.value);
    page.drawText(value, { x: b.x + b.width - 9 - font.widthOfTextAtSize(value, 8), y, size: 8, font, color: INK });
  });
}

/** Double-bladed axe badge, using the same monochrome vector language as the lute. */
export function drawBarbarianEmblem(page:PDFPage,b:FantasyBox){
  const k=Math.min(b.width,b.height)/36,cx=b.x+b.width/2,cy=b.y+b.height/2;
  page.drawCircle({x:cx,y:cy,size:17*k,borderColor:INK,borderWidth:.7});
  stroke(page,cx,cy-13*k,cx,cy+12*k,2*k);
  for(const d of [-1,1]){
    const points=[[cx,cy+9*k],[cx+d*10*k,cy+13*k],[cx+d*12*k,cy+3*k],[cx+d*9*k,cy-2*k],[cx,cy+3*k]];
    points.forEach((p,i)=>{const q=points[(i+1)%points.length];stroke(page,p[0],p[1],q[0],q[1],1.5*k);});
  }
}

/** A radiant holy-symbol medallion; no deity is imposed by the generic class badge. */
export function drawClericEmblem(page:PDFPage,b:FantasyBox){
  const k=Math.min(b.width,b.height)/36,cx=b.x+b.width/2,cy=b.y+b.height/2;
  page.drawCircle({x:cx,y:cy,size:17*k,borderColor:INK,borderWidth:.7});
  page.drawCircle({x:cx,y:cy,size:6*k,borderColor:INK,borderWidth:1.2*k});
  for(let i=0;i<8;i++){const a=i*Math.PI/4;stroke(page,cx+8*k*Math.cos(a),cy+8*k*Math.sin(a),cx+13*k*Math.cos(a),cy+13*k*Math.sin(a),k);}
}
