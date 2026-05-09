/** Pure helpers per incantesimi nei manuali Markdown (anche test Node senza "use server"). */

/** MD: blocco scheda incantesimo (da preferire rispetto a elenchi solo-nome). */
export function hasMarkdownSpellStatBlock(content: string): boolean {
  return /\*\*Tempo di Lancio:\*\*/i.test(content) || /\*\*Gittata:\*\*/i.test(content);
}

export function normalizeHeadingForExactMatch(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^A-Za-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function buildSpellNameIndexFromMarkdown(md: string): Map<string, string> {
  const index = new Map<string, string>();
  const lines = md.replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const h = lines[i].match(/^#{1,6}\s+(.+?)\s*$/);
    if (!h) continue;
    const title = h[1].trim();
    const norm = normalizeHeadingForExactMatch(title);
    if (!norm) continue;
    const window = lines.slice(i + 1, i + 14).join("\n");
    if (!hasMarkdownSpellStatBlock(window)) continue;
    if (!index.has(norm)) index.set(norm, title);
  }
  return index;
}

export function extractSpellEntryFromMarkdown(md: string, spellName: string): string {
  const lines = md.replace(/\r/g, "").split("\n");
  const target = normalizeHeadingForExactMatch(spellName);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    const h = lines[i].match(/^#{1,6}\s+(.+?)\s*$/);
    if (!h) continue;
    if (normalizeHeadingForExactMatch(h[1]) === target) {
      start = i;
      break;
    }
  }
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^#{1,6}\s+/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n").trim();
}
