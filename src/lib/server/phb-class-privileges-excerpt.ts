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
 * Estrae dal markdown PHB il blocco «Privilegi di classe» per l’ancora testuale del catalogo,
 * fino alla riga che matcha `stopLinePattern` (esclusa). Richiede `preloadPhbMarkdown` già eseguito.
 */
export function extractPhbClassPrivilegesMarkdown(
  privilegesAnchor: string,
  stopLinePattern: string | undefined
): string {
  const anchor = privilegesAnchor.trim();
  if (!anchor) return "";
  const txt = getPhbMarkdownText().replace(/\r/g, "");
  if (!txt) return "";

  const anchorRe = new RegExp(escapeRegExp(anchor), "i");
  const anchorMatch = anchorRe.exec(txt);
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

  return sanitizeClassPrivilegesMarkdown(slice.trim());
}
