import type { ClassPrivilegesMdStrip } from "@/lib/character-build-catalog";
import { getPhbMarkdownText } from "@/lib/server/phb-spell-excerpt";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Inizio blocco privilegi: `##` o `#` + PRIVILEGI DI CLASSE (PHB IT). */
const PRIVILEGI_HEADING_RE = /^#{1,2}\s+PRIVILEGI DI CLASSE\s*$/m;

function findLastPrivilegesHeadingStart(txt: string, anchorIndex: number): number {
  const sub = txt.slice(0, anchorIndex);
  let last = -1;
  let m: RegExpExecArray | null;
  const re = new RegExp(PRIVILEGI_HEADING_RE.source, "gm");
  while ((m = re.exec(sub)) !== null) last = m.index;
  return last;
}

function stripMarkdownBetweenHeadings(md: string, afterLine: string, untilLine: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const norm = (s: string) => s.trim().replace(/\s+/g, " ");
  const startH = norm(afterLine);
  const endH = norm(untilLine);
  const startIdx = lines.findIndex((l) => norm(l) === startH);
  const endIdx = lines.findIndex((l) => norm(l) === endH);
  if (startIdx < 0 || endIdx < 0 || endIdx <= startIdx) return md;
  return [...lines.slice(0, startIdx), ...lines.slice(endIdx)].join("\n");
}

function applyPrivilegeStrips(md: string, strips?: ClassPrivilegesMdStrip[]): string {
  if (!strips?.length) return md;
  let t = md;
  for (const s of strips) {
    t = stripMarkdownBetweenHeadings(t, s.afterLine, s.untilLine);
  }
  return t;
}

export function sanitizeClassPrivilegesMarkdown(md: string): string {
  let t = md.trim().replace(/\r/g, "");
  t = t.replace(/\nCAPITOLO\s+\d+\s*\|[^\n]*/gi, "");
  const lines = t.split("\n");
  const cleaned: string[] = [];
  for (const line of lines) {
    const s = line.trim();
    if (/^\d{3}$/.test(s)) continue;
    if (/^CAPITOLO\s+\d+\s*\|/i.test(s)) continue;
    cleaned.push(line);
  }
  t = cleaned.join("\n").replace(/^!\[[^\]]*]\([^)]*\)\s*$/gm, "");
  t = t.replace(/\n{3,}/g, "\n\n");
  while (/\n\d{1,4}\s*$/.test(t)) {
    t = t.replace(/\n\d{1,4}\s*$/g, "").trim();
  }
  return t.trim();
}

/**
 * Estrae il blocco «Privilegi di classe» dal markdown fornito (PHB o supplemento).
 * Richiede il preload del file corrispondente (`preloadPhbMarkdown` / `preloadManualMarkdownFile`).
 */
export function extractClassPrivilegesMarkdown(
  privilegesAnchors: string[],
  stopLinePattern: string | undefined,
  fullMarkdownText: string,
  strips?: ClassPrivilegesMdStrip[]
): string {
  const anchors = privilegesAnchors.map((a) => a.trim()).filter(Boolean);
  if (!anchors.length) return "";
  const txt = fullMarkdownText.replace(/\r/g, "");
  if (!txt) return "";

  let anchorMatch: RegExpExecArray | null = null;
  for (const anchor of anchors) {
    const anchorRe = new RegExp(escapeRegExp(anchor), "i");
    const m = anchorRe.exec(txt);
    if (m && m.index >= 0) {
      anchorMatch = m;
      break;
    }
  }
  if (!anchorMatch || anchorMatch.index < 0) return "";

  const start = findLastPrivilegesHeadingStart(txt, anchorMatch.index);
  if (start < 0) return "";

  let slice = txt.slice(start);
  const pat = stopLinePattern?.trim();
  if (pat) {
    const stopRe = new RegExp(pat, "m");
    const stopM = stopRe.exec(slice);
    if (stopM && stopM.index != null && stopM.index > 0) slice = slice.slice(0, stopM.index);
  }

  slice = applyPrivilegeStrips(slice.trim(), strips);
  return sanitizeClassPrivilegesMarkdown(slice);
}

/**
 * Estrae dal markdown PHB il blocco «Privilegi di classe» per l’ancora testuale del catalogo,
 * fino alla riga che matcha `stopLinePattern` (esclusa). Richiede `preloadPhbMarkdown` già eseguito.
 */
export function extractPhbClassPrivilegesMarkdown(
  privilegesAnchor: string,
  stopLinePattern: string | undefined
): string {
  const a = privilegesAnchor.trim();
  return extractClassPrivilegesMarkdown(
    a ? [a] : [],
    stopLinePattern,
    getPhbMarkdownText(),
    undefined
  );
}
