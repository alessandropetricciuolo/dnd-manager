import { mmNormalizeHeadingTitle } from "@/lib/manuals/monster-manual-chunks";

export type ParsedBestiaryStatblock = {
  name: string;
  crValue: string;
};

const LIST_ID_SEP = "::";

const EXCLUDED_STATBLOCK_HEADINGS = new Set(
  [
    "indice",
    "introduzione",
    "bestiario",
    "appendice",
    "capitolo 1",
    "capitolo 2",
    "elenchi di mostri",
    "mostri del multiverso",
    "mordenkainen presenta",
    "come usare questo libro",
    "razze fantastiche",
    "manuale dei mostri parte iniziale",
  ].map((s) => mmNormalizeHeadingTitle(s))
);

type StatblockRegion = {
  name: string;
  startLine: number;
  endLine: number;
  crValue: string;
};

function normalizeLoose(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractCrFromText(raw: string): string | null {
  const text = raw.replace(/\r\n/g, "\n");
  const direct =
    text.match(/\*\*Sfida\*\*\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)/i) ??
    text.match(/\b(?:Sfida|GS|CR)\b\s*[:\-]?\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)/i);
  return direct?.[1]?.trim() ?? null;
}

function isExcludedStatblockHeading(title: string): boolean {
  const norm = mmNormalizeHeadingTitle(title);
  if (EXCLUDED_STATBLOCK_HEADINGS.has(norm)) return true;
  if (norm.includes("parte iniziale")) return true;
  return false;
}

function findStatblockRegions(content: string): StatblockRegion[] {
  const text = content.replace(/\r\n/g, "\n");
  const lines = text.split("\n");
  const headingIndices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const hm = lines[i]?.match(/^(#{1,3})\s+(.+)$/);
    if (!hm) continue;
    const title = hm[2].trim();
    if (!title || isExcludedStatblockHeading(title)) continue;
    headingIndices.push(i);
  }

  const regions: StatblockRegion[] = [];
  for (let h = 0; h < headingIndices.length; h++) {
    const startLine = headingIndices[h]!;
    const endLine = h + 1 < headingIndices.length ? headingIndices[h + 1]! : lines.length;
    const block = lines.slice(startLine, endLine).join("\n");
    const crValue = extractCrFromText(block);
    if (!crValue) continue;

    const hm = lines[startLine]?.match(/^(#{1,3})\s+(.+)$/);
    if (!hm) continue;
    regions.push({ name: hm[2].trim(), startLine, endLine, crValue });
  }
  return regions;
}

/**
 * Estrae ogni scheda con **Sfida** dal testo (MM: `# CREATURE`, MPM: spesso `### CREATURE`).
 */
export function parseStatblocksFromBestiaryContent(content: string): ParsedBestiaryStatblock[] {
  const dedup = new Map<string, ParsedBestiaryStatblock>();
  for (const region of findStatblockRegions(content)) {
    const key = normalizeLoose(region.name);
    if (dedup.has(key)) continue;
    dedup.set(key, { name: region.name, crValue: region.crValue });
  }
  return [...dedup.values()].sort((a, b) => a.name.localeCompare(b.name, "it"));
}

export function bestiaryListItemId(chunkId: string, statblockName: string): string {
  return `${chunkId}${LIST_ID_SEP}${encodeURIComponent(normalizeLoose(statblockName))}`;
}

export function parseBestiaryListItemId(
  compositeId: string
): { chunkId: string; statblockName: string | null } {
  const sep = compositeId.indexOf(LIST_ID_SEP);
  if (sep < 0) return { chunkId: compositeId, statblockName: null };
  const chunkId = compositeId.slice(0, sep);
  const encoded = compositeId.slice(sep + LIST_ID_SEP.length);
  try {
    return { chunkId, statblockName: decodeURIComponent(encoded) };
  } catch {
    return { chunkId, statblockName: encoded || null };
  }
}

/** True se il chunk contiene un heading `#`/`##`/`###` con il nome creatura. */
export function contentHasStatblockHeading(content: string, statblockName: string): boolean {
  const target = normalizeLoose(statblockName);
  if (!target) return false;
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  for (const line of lines) {
    const hm = line.match(/^(#{1,3})\s+(.+)$/);
    if (!hm) continue;
    if (normalizeLoose(hm[2].trim()) === target) return true;
  }
  return false;
}

/**
 * Ritaglia un singolo statblock dal testo espanso (match sul titolo heading, case/accenti insensitive).
 */
export function extractStatblockSlice(content: string, statblockName: string): string | null {
  const target = normalizeLoose(statblockName);
  if (!target) return null;

  for (const region of findStatblockRegions(content)) {
    if (normalizeLoose(region.name) !== target) continue;
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const slice = lines.slice(region.startLine, region.endLine).join("\n").trim();
    if (slice) return slice;
  }
  return null;
}

/** Trova il chunk che contiene l'inizio dello statblock (es. Appendice A con molte creature). */
export function findBestChunkIdForStatblock(
  rows: Array<{ id: string | number; content: string | null }>,
  statblockName: string
): string | null {
  for (const row of rows) {
    const content = typeof row.content === "string" ? row.content : "";
    if (!content) continue;
    if (extractStatblockSlice(content, statblockName)) {
      const id = String(row.id ?? "").trim();
      if (id) return id;
    }
  }
  for (const row of rows) {
    const content = typeof row.content === "string" ? row.content : "";
    if (!content || !contentHasStatblockHeading(content, statblockName)) continue;
    const id = String(row.id ?? "").trim();
    if (id) return id;
  }
  return null;
}

/** Cerca lo statblock in uno o più chunk della stessa sezione (parti divise per embedding). */
export function resolveStatblockFromRowContents(
  rows: Array<{ content: string | null }>,
  statblockName: string
): string | null {
  for (const row of rows) {
    const content = typeof row.content === "string" ? row.content : "";
    const slice = extractStatblockSlice(content, statblockName);
    if (slice) return slice;
  }
  const combined = rows
    .map((r) => (typeof r.content === "string" ? r.content : ""))
    .filter(Boolean)
    .join("\n\n");
  return extractStatblockSlice(combined, statblockName);
}
