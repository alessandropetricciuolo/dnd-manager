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

function tokenEditDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > 3) return 99;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length] as number;
}

function commonPrefixLen(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

/**
 * Allinea un token query a un token indice.
 * Gestisce prefissi (cura→cura…), stem IT (volo↔volare) e typo 1–2 char (cure↔cura).
 * Evita falsi positivi corti (volo↛vuoto).
 */
function bestTokenAlignment(qt: string, keyTokens: string[]): number {
  let best = Infinity;
  for (const kt of keyTokens) {
    if (kt === qt) return 0;
    // Prefisso pieno: "cura" ⊂ "curare" (se esistesse) / abbreviazioni.
    if (kt.startsWith(qt) && qt.length >= 3) {
      best = Math.min(best, Math.abs(kt.length - qt.length));
      continue;
    }
    if (qt.startsWith(kt) && kt.length >= 3) {
      best = Math.min(best, Math.abs(kt.length - qt.length));
      continue;
    }

    const pref = commonPrefixLen(qt, kt);
    const minLen = Math.min(qt.length, kt.length);
    const lenDiff = Math.abs(qt.length - kt.length);

    // Stem / coniugazione IT: "volo"↔"volare" (prefisso comune ≥3, resto breve).
    if (pref >= 3 && minLen >= 3 && lenDiff <= 3 && pref >= minLen - 1) {
      best = Math.min(best, 2 + lenDiff);
      continue;
    }

    // Typo: richiedi stem condiviso per token corti (evita VOLO→VUOTO).
    if (qt.length <= 4 && pref < 3) continue;
    if (kt.length <= 4 && pref < 3) continue;
    if (qt.length > 4 && pref < 2) continue;

    const dist = tokenEditDistance(qt, kt);
    const maxDist = Math.max(qt.length, kt.length) <= 4 ? 1 : 2;
    if (dist > maxDist) continue;
    best = Math.min(best, dist * 3 - pref);
  }
  return best;
}

function tokensFuzzyScore(queryTokens: string[], keyTokens: string[]): number | null {
  if (!queryTokens.length || !keyTokens.length) return null;
  let total = 0;
  for (const qt of queryTokens) {
    const s = bestTokenAlignment(qt, keyTokens);
    if (!Number.isFinite(s)) return null;
    total += s;
  }
  total += Math.abs(keyTokens.length - queryTokens.length) * 8;
  return total;
}

/**
 * Risolve un nome digitato dall'utente a un titolo PHB indicizzato.
 * Priorità: esatto → prefisso → contiene → fuzzy token (cura/cure, volo/volare).
 */
export function resolveSpellNameFromIndex(
  query: string,
  index: Map<string, string>
): string | null {
  const norm = normalizeHeadingForExactMatch(query);
  if (!norm) return null;

  const exact = index.get(norm);
  if (exact) return exact;

  const starts: string[] = [];
  const contains: string[] = [];
  for (const [key, title] of index) {
    if (key.startsWith(norm)) starts.push(title);
    else if (key.includes(` ${norm} `) || key.endsWith(` ${norm}`) || key.startsWith(`${norm} `)) {
      contains.push(title);
    }
  }
  starts.sort((a, b) => a.length - b.length || a.localeCompare(b, "it"));
  if (starts[0]) return starts[0];
  contains.sort((a, b) => a.length - b.length || a.localeCompare(b, "it"));
  if (contains[0]) return contains[0];

  const qTokens = norm.split(" ").filter(Boolean);
  if (qTokens.length === 0) return null;

  type Cand = { title: string; score: number };
  const fuzzy: Cand[] = [];
  for (const [key, title] of index) {
    const score = tokensFuzzyScore(qTokens, key.split(" ").filter(Boolean));
    if (score == null) continue;
    fuzzy.push({ title, score });
  }
  fuzzy.sort((a, b) => a.score - b.score || a.title.length - b.title.length);
  return fuzzy[0]?.title ?? null;
}

/** Suggerimenti per autocompletamento (esatto/prefisso/contiene/fuzzy leggero). */
export function suggestSpellNamesFromIndex(
  prefix: string,
  index: Map<string, string>,
  limit = 12
): string[] {
  const norm = normalizeHeadingForExactMatch(prefix);
  if (!norm) return [];
  const starts: string[] = [];
  const contains: string[] = [];
  const fuzzy: { title: string; score: number }[] = [];
  const qTokens = norm.split(" ").filter(Boolean);
  const seen = new Set<string>();
  for (const [key, title] of index) {
    if (key.startsWith(norm)) {
      starts.push(title);
      seen.add(title);
    } else if (key.includes(norm)) {
      contains.push(title);
      seen.add(title);
    } else if (qTokens.length) {
      const score = tokensFuzzyScore(qTokens, key.split(" ").filter(Boolean));
      if (score != null) fuzzy.push({ title, score });
    }
  }
  const sortIt = (a: string, b: string) => a.length - b.length || a.localeCompare(b, "it");
  starts.sort(sortIt);
  contains.sort(sortIt);
  fuzzy.sort((a, b) => a.score - b.score || a.title.length - b.title.length);
  const out: string[] = [...starts, ...contains];
  for (const f of fuzzy) {
    if (seen.has(f.title)) continue;
    out.push(f.title);
    seen.add(f.title);
    if (out.length >= limit) break;
  }
  return out.slice(0, limit);
}
