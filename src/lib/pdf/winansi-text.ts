/** Sostituzioni tipiche da Markdown/Unicode non codificabili in Helvetica (WinAnsi). */
const UNICODE_REPLACEMENTS: [string, string][] = [
  ["\u2013", "-"],
  ["\u2014", "-"],
  ["\u2018", "'"],
  ["\u2019", "'"],
  ["\u201C", '"'],
  ["\u201D", '"'],
  ["\u2026", "..."],
  ["\u00A0", " "],
  ["\u2022", "*"],
  ["\u2192", "->"],
  ["\u00D7", "x"],
  ["\u2212", "-"],
  ["\u2032", "'"],
  ["\u2033", '"'],
];

/**
 * Riduce il testo a caratteri compatibili con StandardFonts (WinAnsi) in pdf-lib.
 * Caratteri fuori Latin-1 vengono sostituiti con "?".
 */
export function sanitizeTextForStandardPdfFont(text: string): string {
  let t = text;
  for (const [from, to] of UNICODE_REPLACEMENTS) {
    if (t.includes(from)) t = t.split(from).join(to);
  }
  return t.replace(/[^\t\n\r\x20-\x7E\xA0-\xFF]/g, "?");
}
