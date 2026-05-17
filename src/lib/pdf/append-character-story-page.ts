import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from "pdf-lib";

/** Limite sicurezza: testo incluso nell’endpoint PDF. */
export const MAX_CHARACTER_STORY_PDF_CHARS = 48_000;

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 50;
const MARGIN_BOTTOM = 56;
const FONT_SIZE_BODY = 11;
const FONT_SIZE_SECTION = 13;
const LINE_HEIGHT_BODY = FONT_SIZE_BODY * 1.35;
const SECTION_GAP = 20;

/** Converte Markdown/HTML leggero in testo adatto al PDF StandardFonts (WinAnsi). */
export function storyInputToPdfPlainText(raw: string): string {
  let t = raw.replace(/\r/g, "").replace(/\u0000/g, "");
  t = t
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\t/g, " ");
  t = t.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF]/g, "");
  return t.trim();
}

function clampStoryLength(s: string): string {
  if (s.length <= MAX_CHARACTER_STORY_PDF_CHARS) return s;
  return `${s.slice(0, MAX_CHARACTER_STORY_PDF_CHARS - 1).trim()}…`;
}

function breakOverflowWord(word: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) return [word];
  const chunks: string[] = [];
  let buf = "";
  for (let i = 0; i < word.length; i += 1) {
    const ch = word.charAt(i);
    const next = buf + ch;
    const w = font.widthOfTextAtSize(next, fontSize);
    if (w <= maxWidth || buf.length === 0) {
      buf = next;
    } else {
      chunks.push(buf);
      buf = ch;
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

/** Spezza una riga lunga parole su più righe in base alla larghezza disponibile (Helvetica). */
export function wrapPdfLineParagraph(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
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

/**
 * Aggiunge una o più pagine A4 dopo la scheda con titolo «Storia del personaggio», testo a capo e linee guida.
 */
export async function appendCharacterStoryToPdf(
  pdfDoc: PDFDocument,
  storyRaw: string | null | undefined,
  options?: { contextLine?: string | null }
): Promise<void> {
  const trimmed = clampStoryLength(storyInputToPdfPlainText(storyRaw ?? ""));
  if (!trimmed) return;

  const contextLine = storyInputToPdfPlainText(options?.contextLine ?? "").trim();

  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const maxTextWidth = PAGE_W - MARGIN_X * 2;

  let page: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN_X;

  const drawBold = (s: string, size: number) => {
    page.drawText(s, {
      x: MARGIN_X,
      y,
      size,
      font: boldFont,
      color: rgb(0.12, 0.1, 0.09),
      maxWidth: maxTextWidth,
    });
    y -= size * 1.6;
  };

  const drawMuted = (s: string, size: number) => {
    page.drawText(s, {
      x: MARGIN_X,
      y,
      size,
      font: bodyFont,
      color: rgb(0.33, 0.3, 0.28),
      maxWidth: maxTextWidth,
    });
    y -= size * 1.5;
  };

  drawBold("Storia del personaggio", FONT_SIZE_SECTION);
  if (contextLine) {
    drawMuted(contextLine, FONT_SIZE_BODY);
  }
  y -= SECTION_GAP * 0.6;

  const paragraphs = trimmed
    .split(/\n\n+/)
    .map((p) => p.replace(/\n+/g, " ").trim())
    .filter(Boolean);
  const spaceLine = FONT_SIZE_BODY * 0.5;

  for (const paragraph of paragraphs) {
    const lines = wrapPdfLineParagraph(paragraph, bodyFont, FONT_SIZE_BODY, maxTextWidth);
    for (const line of lines) {
      if (y < MARGIN_BOTTOM) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN_X;
      }
      page.drawText(line || " ", {
        x: MARGIN_X,
        y,
        size: FONT_SIZE_BODY,
        font: bodyFont,
        color: rgb(0.15, 0.13, 0.11),
      });
      y -= LINE_HEIGHT_BODY;
    }
    y -= spaceLine;
  }
}
