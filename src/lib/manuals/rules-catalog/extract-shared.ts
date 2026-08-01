import { createHash } from "crypto";

const IMAGE_RE = /^\s*!\[.*?\]\(.*?\)\s*$/;
const SPAM_RE = /paypal\.me|offrimi un caff/i;
const BARE_PAGE_RE = /^\s*\d{2,4}\s*$/;
const CHAPTER_FOOTER_RE = /^\s*CAPITOLO\s+\d+\s*\|/i;

export function hashBody(bodyMd: string): string {
  return createHash("sha256").update(bodyMd).digest("hex");
}

/** Normalizza titolo heading per match allowlist (senza diacritici, upper). */
export function normalizeRuleHeading(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function cleanCatalogBodyLines(raw: string): string {
  const lines = raw.replace(/\r/g, "").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (IMAGE_RE.test(line)) continue;
    if (SPAM_RE.test(line)) continue;
    if (BARE_PAGE_RE.test(line)) continue;
    if (CHAPTER_FOOTER_RE.test(line)) continue;
    const trimmed = line.trimEnd();
    if (!trimmed.trim()) {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      continue;
    }
    out.push(trimmed);
  }
  while (out.length > 0 && out[0] === "") out.shift();
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}

export type MdHeadingHit = {
  level: number;
  title: string;
  raw: string;
  /** Indice linea (0-based). */
  lineIndex: number;
};

export function findAtxHeadings(lines: string[], maxLevel = 6): MdHeadingHit[] {
  const out: MdHeadingHit[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i]!.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!m) continue;
    const level = m[1]!.length;
    if (level > maxLevel) continue;
    out.push({
      level,
      title: m[2]!.trim(),
      raw: lines[i]!,
      lineIndex: i,
    });
  }
  return out;
}

/**
 * Corpo da dopo il heading fino al prossimo heading di livello ≤ corrente.
 * Se `untilAnyHeading`, si ferma al prossimo heading ATX qualsiasi.
 */
export function sliceHeadingBody(
  lines: string[],
  heading: MdHeadingHit,
  nextSameOrHigher: MdHeadingHit | null,
  opts?: { untilAnyHeading?: boolean; allHeadings?: MdHeadingHit[] }
): string {
  const start = heading.lineIndex + 1;
  let end = lines.length;
  if (opts?.untilAnyHeading && opts.allHeadings) {
    const next = opts.allHeadings.find((h) => h.lineIndex > heading.lineIndex);
    if (next) end = next.lineIndex;
  } else if (nextSameOrHigher) {
    end = nextSameOrHigher.lineIndex;
  }
  return lines.slice(start, end).join("\n");
}

export function nextSameOrHigherHeading(
  headings: MdHeadingHit[],
  current: MdHeadingHit
): MdHeadingHit | null {
  for (const h of headings) {
    if (h.lineIndex <= current.lineIndex) continue;
    if (h.level <= current.level) return h;
  }
  return null;
}
