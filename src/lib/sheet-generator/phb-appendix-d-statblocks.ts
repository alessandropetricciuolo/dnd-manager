import { getPhbMarkdownText } from "@/lib/server/phb-spell-excerpt";

export type PhbAppendixDBeast = {
  name: string;
  key: string;
  cr: number;
  crLabel: string;
  hasSwim: boolean;
  hasFly: boolean;
  statBlock: string;
};

function parseChallengeRatingFromLabel(crRaw: string): number {
  const t = crRaw.trim().replace(",", ".");
  if (t.includes("/")) {
    const [a, b] = t.split("/").map((x) => Number.parseFloat(x.trim()));
    if (Number.isFinite(a) && Number.isFinite(b) && b !== 0) return a / b;
    return Number.POSITIVE_INFINITY;
  }
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function movementFromVelocity(velocityLine: string): { hasSwim: boolean; hasFly: boolean } {
  const v = velocityLine.toLowerCase();
  return {
    hasSwim: v.includes("nuotare"),
    hasFly: v.includes("volare"),
  };
}

function parseBeastMetadata(heading: string, raw: string): PhbAppendixDBeast | null {
  const typeMatch = raw.match(/^\*([^*]+)\*/m);
  if (!typeMatch || !/^bestia\b/i.test(typeMatch[1]!.trim())) return null;

  const sfidaMatch = raw.match(/\*\*Sfida\*\*\s*(\S+)/);
  if (!sfidaMatch) return null;

  const crLabel = sfidaMatch[1]!;
  const cr = parseChallengeRatingFromLabel(crLabel);
  const velMatch = raw.match(/\*\*Velocità\*\*\s*([^\n]+)/);
  const { hasSwim, hasFly } = movementFromVelocity(velMatch?.[1] ?? "");

  return {
    name: heading,
    key: normalizeCreatureKey(heading),
    cr,
    crLabel,
    hasSwim,
    hasFly,
    statBlock: raw,
  };
}

export function normalizeCreatureKey(name: string): string {
  return name
    .replace(/\([^)]*\)/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/gi, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isStatBlockStart(lines: string[], idx: number): boolean {
  for (let j = idx + 1; j < Math.min(idx + 4, lines.length); j += 1) {
    const t = lines[j]?.trim() ?? "";
    if (!t) continue;
    if (/^\*[^*]+,\s*/.test(t)) return true;
    if (/^\*\*Classe Armatura\*\*/i.test(t)) return true;
    return false;
  }
  return false;
}

function stripHtmlTags(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** Converte tabella abilità HTML dell'Appendice D in una riga leggibile. */
function abilityTableToPlainLine(tableHtml: string): string {
  const cells: string[] = [];
  const cellRe = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = cellRe.exec(tableHtml)) !== null) {
    const text = stripHtmlTags(m[2] ?? "");
    if (text) cells.push(text);
  }
  if (cells.length < 12) return stripHtmlTags(tableHtml);

  const labels = cells.slice(0, 6);
  const values = cells.slice(6, 12);
  const pairs: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const label = labels[i];
    const val = values[i];
    if (label && val) pairs.push(`${label} ${val}`);
  }
  return pairs.join(", ");
}

export function formatAppendixDStatBlockForManual(md: string): string {
  let t = md.replace(/\r/g, "");
  t = t.replace(/<table[\s\S]*?<\/table>/gi, (table) => abilityTableToPlainLine(table));
  t = t
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/^APPENDICE D \| STATISTICHE DELLE CREATURE\s*$/gim, "")
    .replace(/^\d{1,4}\s*$/gm, "")
    .replace(/^Offrimi un caff[eè]:.*$/gim, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*---+\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return t;
}

function cleanStatBlockMarkdown(md: string): string {
  return md
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/^APPENDICE D \| STATISTICHE DELLE CREATURE\s*$/gim, "")
    .replace(/^\d{1,4}\s*$/gm, "")
    .replace(/^Offrimi un caff[eè]:.*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Estrae le bestie (tipo Bestia) dall'Appendice D del PHB con metadati GS/movimento. */
export function parsePhbAppendixDBeasts(markdown: string): PhbAppendixDBeast[] {
  const txt = markdown.replace(/\r/g, "");
  const start = txt.search(/^#\s+APPENDICE D:\s*STATISTICHE DELLE CREATURE\s*$/im);
  if (start < 0) return [];
  const slice = txt.slice(start);
  const end = slice.search(/^#\s+APPENDICE E:\s/im);
  const section = end > 0 ? slice.slice(0, end) : slice;
  const lines = section.split("\n");

  const blocks: Array<{ heading: string; start: number }> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i]?.match(/^(#{1,2})\s+(.+?)\s*$/);
    if (!m) continue;
    const heading = m[2]!.trim();
    if (/^APPENDICE D/i.test(heading)) continue;
    if (/^VARIANTE:/i.test(heading)) continue;
    if (!isStatBlockStart(lines, i)) continue;
    blocks.push({ heading, start: i });
  }

  const out: PhbAppendixDBeast[] = [];
  for (let b = 0; b < blocks.length; b += 1) {
    const cur = blocks[b]!;
    const next = blocks[b + 1];
    const endLine = next?.start ?? lines.length;
    const raw = lines.slice(cur.start, endLine).join("\n").trim();
    const cleaned = cleanStatBlockMarkdown(raw);
    if (!cleaned) continue;
    const beast = parseBeastMetadata(cur.heading, cleaned);
    if (beast) out.push(beast);
  }
  return out;
}

/** Estrae tutte le schede creatura dall'Appendice D del PHB. */
export function parsePhbAppendixDStatBlocks(markdown: string): Map<string, string> {
  const txt = markdown.replace(/\r/g, "");
  const start = txt.search(/^#\s+APPENDICE D:\s*STATISTICHE DELLE CREATURE\s*$/im);
  if (start < 0) return new Map();
  const slice = txt.slice(start);
  const end = slice.search(/^#\s+APPENDICE E:\s/im);
  const section = end > 0 ? slice.slice(0, end) : slice;
  const lines = section.split("\n");

  const blocks: Array<{ heading: string; start: number }> = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i]?.match(/^(#{1,2})\s+(.+?)\s*$/);
    if (!m) continue;
    const heading = m[2]!.trim();
    if (/^APPENDICE D/i.test(heading)) continue;
    if (/^VARIANTE:/i.test(heading)) continue;
    if (!isStatBlockStart(lines, i)) continue;
    blocks.push({ heading, start: i });
  }

  const out = new Map<string, string>();
  for (let b = 0; b < blocks.length; b += 1) {
    const cur = blocks[b]!;
    const next = blocks[b + 1];
    const endLine = next?.start ?? lines.length;
    const raw = lines.slice(cur.start, endLine).join("\n").trim();
    const cleaned = cleanStatBlockMarkdown(raw);
    if (!cleaned) continue;
    out.set(normalizeCreatureKey(cur.heading), cleaned);
  }
  return out;
}

let cachedBlocks: Map<string, string> | null = null;
let cachedBeasts: PhbAppendixDBeast[] | null = null;

export function getPhbAppendixDStatBlocks(): Map<string, string> {
  if (cachedBlocks) return cachedBlocks;
  const phb = getPhbMarkdownText();
  cachedBlocks = phb ? parsePhbAppendixDStatBlocks(phb) : new Map();
  return cachedBlocks;
}

export function getPhbAppendixDBeasts(): PhbAppendixDBeast[] {
  if (cachedBeasts) return cachedBeasts;
  const phb = getPhbMarkdownText();
  cachedBeasts = phb ? parsePhbAppendixDBeasts(phb) : [];
  return cachedBeasts;
}

export function resolvePhbAppendixDStatBlock(beastName: string): string | null {
  const blocks = getPhbAppendixDStatBlocks();
  if (!blocks.size) return null;

  const base = normalizeCreatureKey(beastName);
  if (blocks.has(base)) return blocks.get(base)!;

  for (const [key, block] of blocks) {
    if (key === base || key.startsWith(`${base} `) || base.startsWith(`${key} `)) return block;
  }
  return null;
}

export function clearPhbAppendixDStatBlocksCache(): void {
  cachedBlocks = null;
  cachedBeasts = null;
}
