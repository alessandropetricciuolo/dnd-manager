import type { PDFFont, PDFPage } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import { printPlainText } from '../sheet-generator/bard-print-model';
import { sanitizeTextForStandardPdfFont } from './winansi-text';
import { drawFantasyFrame } from './fantasy-sheet-graphics';

export const clean = (v: unknown): string => sanitizeTextForStandardPdfFont(String(v ?? ''));

const PAPER = rgb(1, 1, 1);

export function wrapSheetText(value: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of printPlainText(value).split('\n')) {
    let line = '';
    for (const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      if (font.widthOfTextAtSize(word, size) > width) {
        if (line) {
          lines.push(line);
          line = '';
        }
        let part = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(part + ch, size) > width && part) {
            lines.push(part);
            part = '';
          }
          part += ch;
        }
        line = part;
      } else if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > width) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    if (line || lines.length === 0) lines.push(line);
  }
  return lines.filter((l, idx, arr) => l !== '' || arr.length === 1);
}

export function drawCardHeader(
  p: PDFPage,
  x: number,
  top: number,
  width: number,
  title: string,
  boldFont: PDFFont
): void {
  const t = clean(title);
  const h = 16;
  const y = top - h - 4;
  const bannerW = width - 18;
  const bx = x + 9;
  p.drawRectangle({
    x: bx,
    y,
    width: bannerW,
    height: h,
    color: rgb(0.96, 0.96, 0.96),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.65,
  });
  p.drawRectangle({ x: bx, y, width: 2.5, height: h, color: rgb(0, 0, 0) });
  p.drawRectangle({ x: bx + bannerW - 2.5, y, width: 2.5, height: h, color: rgb(0, 0, 0) });
  const size = Math.min(8, (bannerW - 12) / Math.max(1, boldFont.widthOfTextAtSize(t, 1)));
  p.drawText(t, {
    x: bx + (bannerW - boldFont.widthOfTextAtSize(t, size)) / 2,
    y: y + (h - size) / 2 + 1,
    size,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
}

export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

export type BlockCategory =
  | 'subclass_feature'
  | 'class_feature'
  | 'chosen_option'
  | 'racial_trait'
  | 'proficiency'
  | 'inventory';

export type AdaptiveFlowItem =
  | { kind: 'feature'; title: string; body: string }
  | { kind: 'inline'; label: string; body: string; indentContinuation?: number }
  | { kind: 'bullet'; text: string }
  | {
      kind: 'infusionRow';
      row: {
        title: string;
        itemLabel: string;
        sintonia: string;
        effect: string;
      };
    };

export interface AdaptiveBlock {
  id: string;
  title: string;
  priority: PriorityLevel;
  category: BlockCategory;
  body?: string;
  items?: AdaptiveFlowItem[];
  isInfusionTable?: boolean;
}

export interface AvailableSlot {
  id: 'right_col' | 'center_bottom';
  x: number;
  width: number;
  topY: number;
  bottomY: number;
  maxHeight: number;
}

export interface PlacedBlock {
  block: AdaptiveBlock;
  slotId: 'right_col' | 'center_bottom';
  box: {
    x: number;
    top: number;
    y: number; // bottom-left y for PDF drawing (top - height)
    width: number;
    height: number;
  };
}

export interface PlannerResult {
  placed: PlacedBlock[];
  unplaced: AdaptiveBlock[];
  placedBlockIds: Set<string>;
}

/** Helper to wrap inline body text with a dedicated width for line 1 and full width for subsequent lines */
export function wrapInlineBody(
  bodyText: string,
  font: PDFFont,
  fontSize: number,
  firstAvail: number,
  contAvail: number
): string[] {
  const words = printPlainText(bodyText)
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  let firstLine = true;
  for (const w of words) {
    const avail = firstLine ? firstAvail : contAvail;
    const candidate = cur ? `${cur} ${w}` : w;
    if (cur && font.widthOfTextAtSize(clean(candidate), fontSize) > avail) {
      lines.push(cur);
      cur = w;
      firstLine = false;
    } else {
      cur = candidate;
    }
  }
  if (cur || lines.length === 0) lines.push(cur);
  return lines;
}

/**
 * Accurately measures the height needed by an AdaptiveBlock for a given container width.
 * Preserves the whole block: headers, text lines, paddings, table headers.
 */
export function measureBlockHeight(
  block: AdaptiveBlock,
  colWidth: number,
  font: PDFFont,
  boldFont: PDFFont
): number {
  const innerW = colWidth - 16;

  if (block.body && (!block.items || block.items.length === 0)) {
    const lines = wrapSheetText(block.body, font, 7.6, innerW);
    // Header band / padding (34pt) + lines (9.5pt each) + bottom padding (8pt)
    return 34 + lines.length * 9.5 + 8;
  }

  if (block.isInfusionTable && block.items) {
    const tableHeaderH = 18;
    let rowsH = 0;
    for (const item of block.items) {
      if (item.kind === 'infusionRow') {
        const titleLines = wrapSheetText(item.row.title, boldFont, 7.6, 68);
        const itemLines = wrapSheetText(item.row.itemLabel, font, 6.8, 68);
        const leftH = 7 + titleLines.length * 9 + itemLines.length * 8.2 + 7;
        const effLines = wrapSheetText(item.row.effect, font, 7.0, 72);
        const effH = 7 + effLines.length * 8.6 + 7;
        const rowHeight = Math.max(36, leftH, effH);
        rowsH += rowHeight + 3;
      }
    }
    return 30 + tableHeaderH + rowsH + 6;
  }

  if (block.items && block.items.length > 0) {
    const headerOverhead = 30;
    const bottomPad = 6;
    let itemsH = 0;

    for (const item of block.items) {
      if (item.kind === 'feature') {
        const allLines = wrapSheetText(item.body, font, 7.2, innerW);
        itemsH += 10 + allLines.length * 8.9 + 4.5;
      } else if (item.kind === 'inline') {
        const labelStr = `${item.label}:`;
        const labelW = boldFont.widthOfTextAtSize(clean(labelStr), 7.4);
        const contIndent = item.indentContinuation ?? 0;
        const bodyText = item.body ?? '';

        if (labelW + 45 > innerW) {
          // Long label: place label on separate line(s), and body on lines below across innerW
          const labelLines = wrapSheetText(labelStr, boldFont, 7.4, innerW);
          const bodyLines = wrapSheetText(bodyText, font, 7.1, innerW - contIndent);
          itemsH += (labelLines.length + Math.max(1, bodyLines.length)) * 8.8 + 3.5;
        } else {
          // Short label: inline first line
          const firstAvail = innerW - (labelW + 3);
          const contAvail = innerW - contIndent;
          const bodyLines = wrapInlineBody(bodyText, font, 7.1, firstAvail, contAvail);
          itemsH += Math.max(1, bodyLines.length) * 8.8 + 3.2;
        }
      } else if (item.kind === 'bullet') {
        const lines = wrapSheetText(`• ${item.text}`, font, 7.1, innerW - 4);
        itemsH += Math.max(1, lines.length) * 8.8 + 2;
      }
    }

    return headerOverhead + itemsH + bottomPad;
  }

  return 40;
}

/**
 * Bin-packing layout planner for Page 1.
 * Iterates through candidates by priority (1 to 5).
 * Places candidate in Slot 1 (Right Column) or Slot 2 (Center Bottom) if it fits.
 * If a large candidate does not fit in remaining space, it is pushed to unplaced,
 * but planning continues so subsequent smaller candidates can still claim the available space!
 */
export function planAdaptivePage1(
  candidates: AdaptiveBlock[],
  slots: AvailableSlot[],
  font: PDFFont,
  boldFont: PDFFont,
  gapBetweenCards = 7
): PlannerResult {
  const placed: PlacedBlock[] = [];
  const placedBlockIds = new Set<string>();
  const unplaced: AdaptiveBlock[] = [];

  // Track state for each available slot
  const slotStates = slots.map((s) => ({
    ...s,
    currentTop: s.topY,
    remainingH: s.maxHeight,
  }));

  // Stable sort by priority (1 -> 5), preserving original candidate ordering as tie-breaker
  const indexed = candidates.map((block, index) => ({ block, index }));
  indexed.sort((a, b) => {
    if (a.block.priority !== b.block.priority) {
      return a.block.priority - b.block.priority;
    }
    return a.index - b.index;
  });

  for (const { block } of indexed) {
    let wasPlaced = false;

    for (const slot of slotStates) {
      // If remaining height in this slot is too small for any readable block, skip
      if (slot.remainingH < 35) continue;

      const neededHeight = measureBlockHeight(block, slot.width, font, boldFont);
      const spaceRequired = neededHeight + gapBetweenCards;

      if (slot.remainingH >= neededHeight) {
        const top = slot.currentTop;
        const boxY = top - neededHeight;
        placed.push({
          block,
          slotId: slot.id,
          box: {
            x: slot.x,
            top,
            y: boxY,
            width: slot.width,
            height: neededHeight,
          },
        });
        placedBlockIds.add(block.id);
        slot.currentTop -= spaceRequired;
        slot.remainingH -= spaceRequired;
        wasPlaced = true;
        break;
      }
    }

    if (!wasPlaced) {
      unplaced.push(block);
    }
  }

  return { placed, unplaced, placedBlockIds };
}

/**
 * Draws an AdaptiveBlock inside its computed bounding box on Page 1.
 */
export function renderPlacedBlockOnPage1(
  p: PDFPage,
  placed: PlacedBlock,
  font: PDFFont,
  boldFont: PDFFont,
  textFn: (page: PDFPage, x: number, y: number, content: string, size?: number, f?: PDFFont) => void
): void {
  const { block, box } = placed;
  const { x, top, y, width, height } = box;

  // Frame and Card Header
  drawFantasyFrame(p, { x, y, width, height });
  drawCardHeader(p, x, top, width, block.title, boldFont);

  const innerW = width - 16;
  const topY = top;

  // 1. Single Feature Card
  if (block.body && (!block.items || block.items.length === 0)) {
    const lines = wrapSheetText(block.body, font, 7.6, innerW);
    lines.forEach((l, i) => {
      textFn(p, x + 8, topY - 33 - i * 9.5, l, 7.6, font);
    });
    return;
  }

  // 2. Infusion Table Card
  if (block.isInfusionTable && block.items) {
    let drawY = topY - 30;
    p.drawRectangle({
      x: x + 6,
      y: drawY - 14,
      width: width - 12,
      height: 14,
      color: rgb(0.95, 0.95, 0.95),
    });
    textFn(p, x + 10, drawY - 10, 'Infusione / Oggetto', 7, boldFont);
    textFn(p, x + 74, drawY - 10, 'Sint.', 7, boldFont);
    textFn(p, x + 98, drawY - 10, 'Effetto Operativo', 7, boldFont);
    drawY -= 18;

    for (const item of block.items) {
      if (item.kind === 'infusionRow') {
        const titleLines = wrapSheetText(item.row.title, boldFont, 7.6, 68);
        const itemLines = wrapSheetText(item.row.itemLabel, font, 6.8, 68);
        const leftH = 7 + titleLines.length * 9 + itemLines.length * 8.2 + 7;
        const effLines = wrapSheetText(item.row.effect, font, 7.0, 72);
        const effH = 7 + effLines.length * 8.6 + 7;
        const rowHeight = Math.max(36, leftH, effH);

        const rx = x + 6;
        const rw = width - 12;
        p.drawRectangle({
          x: rx,
          y: drawY - rowHeight,
          width: rw,
          height: rowHeight,
          borderColor: rgb(0.65, 0.65, 0.65),
          borderWidth: 0.5,
        });
        p.drawLine({
          start: { x: x + 72, y: drawY },
          end: { x: x + 72, y: drawY - rowHeight },
          color: rgb(0.8, 0.8, 0.8),
          thickness: 0.4,
        });
        p.drawLine({
          start: { x: x + 95, y: drawY },
          end: { x: x + 95, y: drawY - rowHeight },
          color: rgb(0.8, 0.8, 0.8),
          thickness: 0.4,
        });

        titleLines.forEach((tl, idx) => {
          textFn(p, rx + 4, drawY - 10.5 - idx * 9, tl, 7.6, boldFont);
        });
        const itemStartY = drawY - 10.5 - titleLines.length * 9 - 1.5;
        itemLines.forEach((il, idx) => {
          textFn(p, rx + 4, itemStartY - idx * 8.2, il, 6.8, font);
        });
        textFn(p, x + 76, drawY - 10.5, item.row.sintonia, 7.3, boldFont);
        effLines.forEach((el, idx) => {
          textFn(p, x + 98, drawY - 10.5 - idx * 8.6, el, 7.0, font);
        });

        drawY -= rowHeight + 3;
      }
    }
    return;
  }

  // 3. Multi-item Card (inline, bullet, feature)
  if (block.items && block.items.length > 0) {
    let drawY = topY - 30;

    for (const it of block.items) {
      if (it.kind === 'feature') {
        textFn(p, x + 8, drawY, it.title, 7.8, boldFont);
        drawY -= 9.5;
        const lines = wrapSheetText(it.body, font, 7.2, innerW);
        lines.forEach((l) => {
          textFn(p, x + 8, drawY, l, 7.2, font);
          drawY -= 8.9;
        });
        drawY -= 4.5;
      } else if (it.kind === 'inline') {
        const labelStr = `${it.label}:`;
        const labelW = boldFont.widthOfTextAtSize(clean(labelStr), 7.4);
        const contIndent = it.indentContinuation ?? 0;
        const bodyText = it.body ?? '';

        if (labelW + 45 > innerW) {
          const labelLines = wrapSheetText(labelStr, boldFont, 7.4, innerW);
          labelLines.forEach((ll) => {
            textFn(p, x + 8, drawY, ll, 7.4, boldFont);
            drawY -= 8.8;
          });
          const bodyLines = wrapSheetText(bodyText, font, 7.1, innerW - contIndent);
          bodyLines.forEach((bl) => {
            textFn(p, x + 8 + contIndent, drawY, bl, 7.1, font);
            drawY -= 8.8;
          });
          drawY -= 3.5;
        } else {
          textFn(p, x + 8, drawY, labelStr, 7.4, boldFont);
          const firstAvail = innerW - (labelW + 3);
          const contAvail = innerW - contIndent;
          const bodyLines = wrapInlineBody(bodyText, font, 7.1, firstAvail, contAvail);
          bodyLines.forEach((l, idx) => {
            const xOff = idx === 0 ? labelW + 3 : contIndent;
            textFn(p, x + 8 + xOff, drawY - idx * 8.8, l, 7.1, font);
          });
          drawY -= Math.max(1, bodyLines.length) * 8.8 + 3.2;
        }
      } else if (it.kind === 'bullet') {
        const lines = wrapSheetText(`• ${it.text}`, font, 7.1, innerW - 4);
        lines.forEach((l, idx) => {
          textFn(p, x + 8 + (idx === 0 ? 0 : 7), drawY - idx * 8.8, l, 7.1, font);
        });
        drawY -= Math.max(1, lines.length) * 8.8 + 2;
      }
    }
  }
}
