import { PDFDocument, PDFPage, PDFFont, rgb, Color } from 'pdf-lib';

/** Shared vector ornaments - Arcano Editoriale Monochrome (Black & White). Coordinates use PDF points, from the bottom left. */
export const INK = rgb(0, 0, 0); // Pure black ink
export const PAPER = rgb(1, 1, 1); // Pure white paper
export const ACCENT_BRONZE = rgb(0, 0, 0); // Monochrome black anchor
export const ACCENT_GOLD = rgb(0, 0, 0); // Monochrome black
export const BORDER_HAIRLINE = rgb(0.78, 0.78, 0.78); // Subtle architectural inner hairline
export const SHADING_BG = rgb(0.96, 0.96, 0.96); // Neutral light gray panel background

export type FantasyBox = { x: number; y: number; width: number; height: number };

function stroke(
  page: PDFPage,
  x: number,
  y: number,
  xx: number,
  yy: number,
  thickness = 0.7,
  color: Color = INK
) {
  page.drawLine({ start: { x, y }, end: { x: xx, y: yy }, thickness, color });
}

/** Architectural double hairline frame with refined corner accents. */
export function drawFantasyFrame(page: PDFPage, b: FantasyBox) {
  const { x, y, width: w, height: h } = b;
  if (w < 20 || h < 20) throw new Error('Fantasy frame requires at least 20 x 20 points');

  // Outer clean architectural rectangle
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderWidth: 0.8,
    borderColor: INK,
  });

  // Inner refined secondary hairline inset by 2.5pt
  if (w >= 28 && h >= 28) {
    page.drawRectangle({
      x: x + 2.5,
      y: y + 2.5,
      width: w - 5,
      height: h - 5,
      borderWidth: 0.35,
      borderColor: BORDER_HAIRLINE,
    });

    // Sleek micro corner brackets (3.5pt)
    const k = 2.5;
    const len = 3.5;
    // Top-left
    stroke(page, x + k, y + h - k - len, x + k, y + h - k, 0.75, INK);
    stroke(page, x + k, y + h - k, x + k + len, y + h - k, 0.75, INK);
    // Top-right
    stroke(page, x + w - k - len, y + h - k, x + w - k, y + h - k, 0.75, INK);
    stroke(page, x + w - k, y + h - k, x + w - k, y + h - k - len, 0.75, INK);
    // Bottom-left
    stroke(page, x + k, y + k + len, x + k, y + k, 0.75, INK);
    stroke(page, x + k, y + k, x + k + len, y + k, 0.75, INK);
    // Bottom-right
    stroke(page, x + w - k - len, y + k, x + w - k, y + k, 0.75, INK);
    stroke(page, x + w - k, y + k, x + w - k, y + k + len, 0.75, INK);
  }
}

/** Prestigious geometric title band with solid endcap anchors. */
export function drawFantasyBanner(page: PDFPage, b: FantasyBox, title: string, font: PDFFont, size = 9) {
  if (font.widthOfTextAtSize(title, size) > b.width - 24 + 0.05) throw new Error('Banner title exceeds available width');

  page.drawRectangle({
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    color: SHADING_BG,
    borderColor: INK,
    borderWidth: 0.75,
  });

  page.drawLine({
    start: { x: b.x + 4, y: b.y + b.height - 2 },
    end: { x: b.x + b.width - 4, y: b.y + b.height - 2 },
    thickness: 0.35,
    color: BORDER_HAIRLINE,
  });
  page.drawLine({
    start: { x: b.x + 4, y: b.y + 2 },
    end: { x: b.x + b.width - 4, y: b.y + 2 },
    thickness: 0.35,
    color: BORDER_HAIRLINE,
  });

  // Solid side anchor endcaps
  page.drawRectangle({
    x: b.x,
    y: b.y,
    width: 3,
    height: b.height,
    color: INK,
  });
  page.drawRectangle({
    x: b.x + b.width - 3,
    y: b.y,
    width: 3,
    height: b.height,
    color: INK,
  });

  page.drawText(title, {
    x: b.x + (b.width - font.widthOfTextAtSize(title, size)) / 2,
    y: b.y + (b.height - size) / 2 + 1,
    size,
    font,
    color: INK,
  });
}

/** Beveled architectural cartouche for scores, AC and spell DC. */
export function drawFantasyShield(page: PDFPage, b: FantasyBox, value: string, font: PDFFont) {
  const { x, y, width: w, height: h } = b;
  const pts = [
    [x + 4, y + h],
    [x + w - 4, y + h],
    [x + w, y + h - 4],
    [x + w, y + h * 0.32],
    [x + w / 2, y],
    [x, y + h * 0.32],
    [x, y + h - 4],
  ];
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length];
    stroke(page, p[0], p[1], q[0], q[1], 0.85, INK);
  });

  const innerPts = [
    [x + 6, y + h - 2.5],
    [x + w - 6, y + h - 2.5],
    [x + w - 2.5, y + h - 6],
    [x + w - 2.5, y + h * 0.33],
    [x + w / 2, y + 2.5],
    [x + 2.5, y + h * 0.33],
    [x + 2.5, y + h - 6],
  ];
  innerPts.forEach((p, i) => {
    const q = innerPts[(i + 1) % innerPts.length];
    stroke(page, p[0], p[1], q[0], q[1], 0.35, rgb(0.6, 0.6, 0.6));
  });

  const size = Math.min(22, h * 0.4, (w - 8) / Math.max(1, font.widthOfTextAtSize(value, 1)));
  if (font.widthOfTextAtSize(value, size) > w - 8) throw new Error('Shield value exceeds available width');
  page.drawText(value, {
    x: x + (w - font.widthOfTextAtSize(value, size)) / 2,
    y: y + h * 0.4,
    size,
    font,
    color: INK,
  });
}

/** Precision circular nodes with concentric centers for resource tracking. */
export function drawFantasyTracker(page: PDFPage, b: FantasyBox, count: number): number {
  if (!Number.isInteger(count) || count < 0 || count > 100) throw new Error('Invalid resource count');
  const step = 15,
    cols = Math.floor(b.width / step);
  if (cols < 1) throw new Error('Tracker width too small');
  const height = Math.ceil(count / cols) * step;
  if (height > b.height) throw new Error('Tracker exceeds its box');

  for (let i = 0; i < count; i++) {
    const cx = b.x + 6 + (i % cols) * step,
      cy = b.y + b.height - 7 - Math.floor(i / cols) * step;
    page.drawCircle({
      x: cx,
      y: cy,
      size: 4.2,
      borderColor: INK,
      borderWidth: 0.8,
      color: rgb(1, 1, 1),
    });
    page.drawCircle({
      x: cx,
      y: cy,
      size: 1.2,
      color: INK,
    });
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

/** Gear badge for the Artificer, drawn as print-safe vectors. */
export function drawArtificerEmblem(page:PDFPage,b:FantasyBox){
 const k=Math.min(b.width,b.height)/36,cx=b.x+b.width/2,cy=b.y+b.height/2;
 page.drawCircle({x:cx,y:cy,size:17*k,borderColor:INK,borderWidth:.7});
 page.drawCircle({x:cx,y:cy,size:8*k,borderColor:INK,borderWidth:3*k});
 for(let i=0;i<8;i++){const a=i*Math.PI/4;stroke(page,cx+9*k*Math.cos(a),cy+9*k*Math.sin(a),cx+13*k*Math.cos(a),cy+13*k*Math.sin(a),3*k);}
}

/** Martial crossed swords badge for the Fighter. */
export function drawFighterEmblem(page: PDFPage, b: FantasyBox) {
  const k = Math.min(b.width, b.height) / 36, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  page.drawCircle({ x: cx, y: cy, size: 17 * k, borderColor: INK, borderWidth: 0.7 });
  for (const d of [-1, 1]) {
    stroke(page, cx - d * 10 * k, cy - 10 * k, cx + d * 10 * k, cy + 10 * k, 1.8 * k);
    stroke(page, cx - d * 5 * k + 3.5 * k, cy - 5 * k - d * 3.5 * k, cx - d * 5 * k - 3.5 * k, cy - 5 * k + d * 3.5 * k, 1.4 * k);
    page.drawCircle({ x: cx - d * 10 * k, y: cy - 10 * k, size: 1.8 * k, color: INK });
  }
}

/** Stealth dagger badge for the Rogue. */
export function drawRogueEmblem(page: PDFPage, b: FantasyBox) {
  const k = Math.min(b.width, b.height) / 36, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  page.drawCircle({ x: cx, y: cy, size: 17 * k, borderColor: INK, borderWidth: 0.7 });
  stroke(page, cx, cy + 9 * k, cx, cy - 8 * k, 2.2 * k);
  stroke(page, cx - 2.5 * k, cy - 5 * k, cx, cy - 11 * k, 1.2 * k);
  stroke(page, cx + 2.5 * k, cy - 5 * k, cx, cy - 11 * k, 1.2 * k);
  stroke(page, cx - 6 * k, cy + 3 * k, cx + 6 * k, cy + 3 * k, 1.6 * k);
  page.drawCircle({ x: cx, y: cy + 11 * k, size: 2 * k, color: INK });
  stroke(page, cx - 11 * k, cy + 6 * k, cx - 5 * k, cy - 7 * k, 1 * k);
  stroke(page, cx + 11 * k, cy + 6 * k, cx + 5 * k, cy - 7 * k, 1 * k);
}

/** Arcane starburst badge for the Wizard. */
export function drawWizardEmblem(page: PDFPage, b: FantasyBox) {
  const k = Math.min(b.width, b.height) / 36, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  page.drawCircle({ x: cx, y: cy, size: 17 * k, borderColor: INK, borderWidth: 0.7 });
  stroke(page, cx, cy - 11 * k, cx, cy + 11 * k, 1.6 * k);
  stroke(page, cx - 11 * k, cy, cx + 11 * k, cy, 1.6 * k);
  stroke(page, cx - 6 * k, cy - 6 * k, cx + 6 * k, cy + 6 * k, 1.0 * k);
  stroke(page, cx - 6 * k, cy + 6 * k, cx + 6 * k, cy - 6 * k, 1.0 * k);
  page.drawCircle({ x: cx, y: cy, size: 3 * k, color: INK });
  page.drawCircle({ x: cx, y: cy, size: 8 * k, borderColor: INK, borderWidth: 0.8 * k });
}

/** Martial fist badge for the Monk. */
export function drawMonkEmblem(page: PDFPage, b: FantasyBox) {
  const k = Math.min(b.width, b.height) / 36, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  page.drawCircle({ x: cx, y: cy, size: 17 * k, borderColor: INK, borderWidth: 0.7 });
  stroke(page, cx - 4 * k, cy - 11 * k, cx - 4 * k, cy - 4 * k, 1.4 * k);
  stroke(page, cx + 4 * k, cy - 11 * k, cx + 4 * k, cy - 4 * k, 1.4 * k);
  page.drawRectangle({
    x: cx - 6 * k,
    y: cy - 4 * k,
    width: 12 * k,
    height: 11 * k,
    borderColor: INK,
    borderWidth: 1.2 * k,
  });
  stroke(page, cx - 3 * k, cy - 4 * k, cx - 3 * k, cy + 7 * k, 0.8 * k);
  stroke(page, cx, cy - 4 * k, cx, cy + 7 * k, 0.8 * k);
  stroke(page, cx + 3 * k, cy - 4 * k, cx + 3 * k, cy + 7 * k, 0.8 * k);
  stroke(page, cx - 7 * k, cy - 2 * k, cx + 2 * k, cy + 1 * k, 1.6 * k);
}

/** Sacred knight / heraldic sword and shield badge for the Paladin. */
export function drawPaladinEmblem(page: PDFPage, b: FantasyBox) {
  const k = Math.min(b.width, b.height) / 36, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  page.drawCircle({ x: cx, y: cy, size: 17 * k, borderColor: INK, borderWidth: 0.7 });
  // Shield silhouette
  const sx = cx, sy = cy;
  stroke(page, sx - 10 * k, sy + 10 * k, sx + 10 * k, sy + 10 * k, 1.2 * k);
  stroke(page, sx - 10 * k, sy + 10 * k, sx - 10 * k, sy, 1.2 * k);
  stroke(page, sx + 10 * k, sy + 10 * k, sx + 10 * k, sy, 1.2 * k);
  stroke(page, sx - 10 * k, sy, sx, sy - 11 * k, 1.2 * k);
  stroke(page, sx + 10 * k, sy, sx, sy - 11 * k, 1.2 * k);
  // Radiant sword / cross
  stroke(page, sx, sy + 8 * k, sx, sy - 8 * k, 1.8 * k);
  stroke(page, sx - 6 * k, sy + 4 * k, sx + 6 * k, sy + 4 * k, 1.4 * k);
  page.drawCircle({ x: sx, y: sy + 9 * k, size: 1.8 * k, color: INK });
  // Sunburst rays
  stroke(page, sx - 4 * k, sy - 2 * k, sx - 7 * k, sy - 4 * k, 0.8 * k);
  stroke(page, sx + 4 * k, sy - 2 * k, sx + 7 * k, sy - 4 * k, 0.8 * k);
}

/** Crossed hunting arrows and recurve bow / wilderness tracker emblem for the Ranger. */
export function drawRangerEmblem(page: PDFPage, b: FantasyBox) {
  const k = Math.min(b.width, b.height) / 36, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  page.drawCircle({ x: cx, y: cy, size: 16 * k, borderColor: INK, borderWidth: 0.7 });
  page.drawCircle({ x: cx, y: cy, size: 10 * k, borderColor: INK, borderWidth: 0.5 });
  // Crossed arrows
  stroke(page, cx - 11 * k, cy - 11 * k, cx + 11 * k, cy + 11 * k, 1.2 * k);
  stroke(page, cx + 11 * k, cy + 11 * k, cx + 6 * k, cy + 10 * k, 1.1 * k);
  stroke(page, cx + 11 * k, cy + 11 * k, cx + 10 * k, cy + 6 * k, 1.1 * k);
  // Fletching on bottom-left
  stroke(page, cx - 9 * k, cy - 11 * k, cx - 11 * k, cy - 9 * k, 0.9 * k);

  stroke(page, cx - 11 * k, cy + 11 * k, cx + 11 * k, cy - 11 * k, 1.2 * k);
  stroke(page, cx + 11 * k, cy - 11 * k, cx + 6 * k, cy - 10 * k, 1.1 * k);
  stroke(page, cx + 11 * k, cy - 11 * k, cx + 10 * k, cy - 6 * k, 1.1 * k);
  // Fletching on bottom-right
  stroke(page, cx - 9 * k, cy + 11 * k, cx - 11 * k, cy + 9 * k, 0.9 * k);

  // Vertical bowstring and recurve arc
  stroke(page, cx - 4 * k, cy + 12 * k, cx - 4 * k, cy - 12 * k, 0.8 * k);
  stroke(page, cx - 4 * k, cy + 12 * k, cx + 4 * k, cy, 1.4 * k);
  stroke(page, cx + 4 * k, cy, cx - 4 * k, cy - 12 * k, 1.4 * k);
}

/** Arcane flame / innate magic crest for the Sorcerer. */
export function drawSorcererEmblem(page: PDFPage, b: FantasyBox) {
  const k = Math.min(b.width, b.height) / 36, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  page.drawCircle({ x: cx, y: cy, size: 16 * k, borderColor: INK, borderWidth: 0.7 });
  page.drawCircle({ x: cx, y: cy, size: 11 * k, borderColor: INK, borderWidth: 0.5 });
  // Central rising flame
  stroke(page, cx, cy + 13 * k, cx - 4 * k, cy - 2 * k, 1.3 * k);
  stroke(page, cx, cy + 13 * k, cx + 4 * k, cy - 2 * k, 1.3 * k);
  stroke(page, cx - 4 * k, cy - 2 * k, cx, cy - 9 * k, 1.1 * k);
  stroke(page, cx + 4 * k, cy - 2 * k, cx, cy - 9 * k, 1.1 * k);
  // Left curling flame flare
  stroke(page, cx - 3 * k, cy + 4 * k, cx - 8 * k, cy + 6 * k, 1.1 * k);
  stroke(page, cx - 8 * k, cy + 6 * k, cx - 6 * k, cy - 4 * k, 1.0 * k);
  stroke(page, cx - 6 * k, cy - 4 * k, cx - 2 * k, cy - 8 * k, 0.9 * k);
  // Right curling flame flare
  stroke(page, cx + 3 * k, cy + 4 * k, cx + 8 * k, cy + 6 * k, 1.1 * k);
  stroke(page, cx + 8 * k, cy + 6 * k, cx + 6 * k, cy - 4 * k, 1.0 * k);
  stroke(page, cx + 6 * k, cy - 4 * k, cx + 2 * k, cy - 8 * k, 0.9 * k);
  // Central magic spark
  stroke(page, cx - 2.5 * k, cy, cx + 2.5 * k, cy, 1.0 * k);
  stroke(page, cx, cy - 2.5 * k, cx, cy + 2.5 * k, 1.0 * k);
}

/** Occult eye / patron's gaze crest for the Warlock. */
export function drawWarlockEmblem(page: PDFPage, b: FantasyBox) {
  const k = Math.min(b.width, b.height) / 36, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  // Outer occult circle rings
  page.drawCircle({ x: cx, y: cy, size: 16 * k, borderColor: INK, borderWidth: 0.7 });
  page.drawCircle({ x: cx, y: cy, size: 12.5 * k, borderColor: INK, borderWidth: 0.5 });
  // Radiating occult beams (8 rays)
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const r1 = 13 * k;
    const r2 = 15.5 * k;
    stroke(page, cx + Math.cos(angle) * r1, cy + Math.sin(angle) * r1, cx + Math.cos(angle) * r2, cy + Math.sin(angle) * r2, 0.8 * k);
  }
  // Eye almond contour (upper and lower lids using multi-segment strokes)
  stroke(page, cx - 10 * k, cy, cx - 5 * k, cy + 4.5 * k, 1.2 * k);
  stroke(page, cx - 5 * k, cy + 4.5 * k, cx + 5 * k, cy + 4.5 * k, 1.2 * k);
  stroke(page, cx + 5 * k, cy + 4.5 * k, cx + 10 * k, cy, 1.2 * k);

  stroke(page, cx - 10 * k, cy, cx - 5 * k, cy - 4.5 * k, 1.2 * k);
  stroke(page, cx - 5 * k, cy - 4.5 * k, cx + 5 * k, cy - 4.5 * k, 1.2 * k);
  stroke(page, cx + 5 * k, cy - 4.5 * k, cx + 10 * k, cy, 1.2 * k);

  // Central iris
  page.drawCircle({ x: cx, y: cy, size: 4.2 * k, borderColor: INK, borderWidth: 0.9 });
  // Vertical slit pupil
  stroke(page, cx, cy - 3.8 * k, cx, cy + 3.8 * k, 1.5 * k);
}

/** Oak leaf & stone circle crest for the Druid. */
export function drawDruidEmblem(page: PDFPage, b: FantasyBox) {
  const k = Math.min(b.width, b.height) / 36, cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  page.drawCircle({ x: cx, y: cy, size: 16 * k, borderColor: INK, borderWidth: 0.7 });
  page.drawCircle({ x: cx, y: cy, size: 12 * k, borderColor: INK, borderWidth: 0.5 });
  // Central leaf stem
  stroke(page, cx, cy - 11 * k, cx, cy + 10 * k, 1.2 * k);
  // Leaf contour
  stroke(page, cx, cy + 11 * k, cx - 7 * k, cy + 2 * k, 1.1 * k);
  stroke(page, cx - 7 * k, cy + 2 * k, cx, cy - 8 * k, 1.1 * k);
  stroke(page, cx, cy + 11 * k, cx + 7 * k, cy + 2 * k, 1.1 * k);
  stroke(page, cx + 7 * k, cy + 2 * k, cx, cy - 8 * k, 1.1 * k);
  // Leaf veins
  stroke(page, cx, cy - 2 * k, cx - 4.5 * k, cy + 2.5 * k, 0.8 * k);
  stroke(page, cx, cy - 2 * k, cx + 4.5 * k, cy + 2.5 * k, 0.8 * k);
  stroke(page, cx, cy + 2 * k, cx - 3.5 * k, cy + 5.5 * k, 0.8 * k);
  stroke(page, cx, cy + 2 * k, cx + 3.5 * k, cy + 5.5 * k, 0.8 * k);
}

