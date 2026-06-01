import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";
import { storyInputToPdfPlainText } from "@/lib/pdf/append-character-story-page";

export type PdfTextSection = {
  title: string;
  body: string;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 50;
const MARGIN_BOTTOM = 56;
const FONT_SIZE_BODY = 10;
const FONT_SIZE_SECTION = 12;
const FONT_SIZE_DOC_TITLE = 15;
const LINE_HEIGHT_BODY = FONT_SIZE_BODY * 1.38;
const SECTION_GAP = 16;

function breakOverflowWord(word: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) return [word];
  const chunks: string[] = [];
  let buf = "";
  for (let i = 0; i < word.length; i += 1) {
    const ch = word.charAt(i);
    const next = buf + ch;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth || buf.length === 0) {
      buf = next;
    } else {
      chunks.push(buf);
      buf = ch;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

function wrapPdfLineParagraph(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [""];
  const words = trimmed.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const pushCurrent = () => {
    if (current) lines.push(current);
    current = "";
  };
  for (const w of words) {
    const fragments =
      font.widthOfTextAtSize(w, fontSize) > maxWidth ? breakOverflowWord(w, font, fontSize, maxWidth) : [w];
    for (const frag of fragments) {
      const candidate = current ? `${current} ${frag}` : frag;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        pushCurrent();
        current = frag;
      }
    }
  }
  pushCurrent();
  return lines.length ? lines : [""];
}

type RenderCtx = {
  pdfDoc: PDFDocument;
  page: PDFPage;
  y: number;
  bodyFont: PDFFont;
  boldFont: PDFFont;
  maxTextWidth: number;
};

function ensureSpace(ctx: RenderCtx, needed: number): void {
  if (ctx.y - needed >= MARGIN_BOTTOM) return;
  ctx.page = ctx.pdfDoc.addPage([PAGE_W, PAGE_H]);
  ctx.y = PAGE_H - MARGIN_X;
}

function drawBoldLine(ctx: RenderCtx, text: string, size: number, gapAfter = size * 1.4): void {
  ensureSpace(ctx, gapAfter);
  ctx.page.drawText(text, {
    x: MARGIN_X,
    y: ctx.y,
    size,
    font: ctx.boldFont,
    color: rgb(0.12, 0.1, 0.09),
    maxWidth: ctx.maxTextWidth,
  });
  ctx.y -= gapAfter;
}

function drawBodyParagraph(ctx: RenderCtx, paragraph: string): void {
  const lines = wrapPdfLineParagraph(paragraph, ctx.bodyFont, FONT_SIZE_BODY, ctx.maxTextWidth);
  for (const line of lines) {
    ensureSpace(ctx, LINE_HEIGHT_BODY);
    ctx.page.drawText(line || " ", {
      x: MARGIN_X,
      y: ctx.y,
      size: FONT_SIZE_BODY,
      font: ctx.bodyFont,
      color: rgb(0.15, 0.13, 0.11),
    });
    ctx.y -= LINE_HEIGHT_BODY;
  }
  ctx.y -= FONT_SIZE_BODY * 0.45;
}

/** Aggiunge sezioni titolo+corpo su nuove pagine PDF (Helvetica, testo plain). */
export async function appendPdfTextSections(
  pdfDoc: PDFDocument,
  sections: PdfTextSection[],
  options?: { documentTitle?: string | null }
): Promise<void> {
  const filtered = sections
    .map((s) => ({
      title: storyInputToPdfPlainText(s.title).trim(),
      body: storyInputToPdfPlainText(s.body).trim(),
    }))
    .filter((s) => s.title && s.body);
  if (!filtered.length) return;

  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const maxTextWidth = PAGE_W - MARGIN_X * 2;

  const ctx: RenderCtx = {
    pdfDoc,
    page: pdfDoc.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - MARGIN_X,
    bodyFont,
    boldFont,
    maxTextWidth,
  };

  const docTitle = storyInputToPdfPlainText(options?.documentTitle ?? "Manuale rapido").trim();
  if (docTitle) {
    drawBoldLine(ctx, docTitle, FONT_SIZE_DOC_TITLE, FONT_SIZE_DOC_TITLE * 1.5);
    ctx.y -= SECTION_GAP * 0.5;
  }

  for (const section of filtered) {
    drawBoldLine(ctx, section.title, FONT_SIZE_SECTION, FONT_SIZE_SECTION * 1.35);
    const paragraphs = section.body
      .split(/\n\n+/)
      .map((p) => p.replace(/\n+/g, " ").trim())
      .filter(Boolean);
    for (const p of paragraphs) {
      drawBodyParagraph(ctx, p);
    }
    ctx.y -= SECTION_GAP;
  }
}
