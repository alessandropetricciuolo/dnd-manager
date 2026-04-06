/**
 * Chunking indice-numerato (MM e *Mostri del multiverso*): confini = voci indice,
 * non sotto-titoli tipo # AZIONI.
 */

export type MonsterManualChunk = {
  content: string;
  chapter: string;
  sectionHeading: string;
  sectionKey: string;
  chunkType: "prose";
  sectionPart: number;
  sectionPartTotal: number;
};

export type ParseMonsterManualIndexOptions = {
  /** Dopo `# INDICE`, interrompe anche a `# COME USARE QUESTO LIBRO` (Mordenkainen / MPM). */
  stopBeforeComeUsareLibro?: boolean;
};

function stripMmLineArtifacts(s: string): string {
  let t = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return t.replace(/[ \t]+$/g, "").trimEnd();
}

/** Normalizzazione per confronto indice ↔ titolo # (case, accenti, apostrofi). */
export function mmNormalizeHeadingTitle(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[’‘]/g, "'")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeManualSectionKey(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/!/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripIndexEntryName(raw: string): string {
  return raw
    .trim()
    .replace(/^\*\*|\*\*$/g, "")
    .trim();
}

const INDEX_LINE_RE = /^(.+?)\s+(\d+)\s*$/;

/**
 * Righe indice tipo "Aarakocra 12" tra `# INDICE` e `# INTRODUZIONE`
 * (o `# COME USARE QUESTO LIBRO` se `stopBeforeComeUsareLibro`).
 */
export function parseMonsterManualIndexNames(
  lines: string[],
  options?: ParseMonsterManualIndexOptions
): string[] {
  let i = 0;
  while (i < lines.length && !/^#\s+INDICE\s*$/i.test(lines[i].trim())) {
    i += 1;
  }
  if (i >= lines.length) return [];
  i += 1;
  const names: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^#\s+INTRODUZIONE\s*$/i.test(trimmed)) break;
    if (
      options?.stopBeforeComeUsareLibro &&
      /^#\s+COME\s+USARE\s+QUESTO\s+LIBRO\s*$/i.test(trimmed)
    ) {
      break;
    }
    const m = line.match(INDEX_LINE_RE);
    if (m) {
      const name = stripIndexEntryName(m[1].trim());
      if (name.length > 0 && !/^offrimi\b/i.test(name) && !/^paypal/i.test(name)) {
        names.push(name);
      }
    }
    i += 1;
  }
  return names;
}

const INDEX_START_EXCLUDE = new Set(
  ["introduzione"].map((s) => mmNormalizeHeadingTitle(s))
);

/** Intestazioni indice/indice mappate ma non sono voci “creatura/razza” da chunkare come tali (MPM). */
const MPM_HEADING_EXCLUDE = new Set(
  [
    "introduzione",
    "come usare questo libro",
    "razze fantastiche",
    "bestiario",
    "capitolo 1",
    "capitolo 2",
    "appendice",
    "elenchi di mostri",
    "mostri del multiverso",
    "mordenkainen presenta",
  ].map((s) => mmNormalizeHeadingTitle(s))
);

function firstHeadingExcludeNorms(mode: "mm" | "mpm"): Set<string> {
  if (mode === "mm") return INDEX_START_EXCLUDE;
  return new Set([...INDEX_START_EXCLUDE, ...MPM_HEADING_EXCLUDE]);
}

function inferChapterClassic(displayName: string): string {
  const n = mmNormalizeHeadingTitle(displayName);
  if (n.includes("appendice a")) return "Appendice A — Creature varie";
  if (n.includes("appendice b")) return "Appendice B — PNG";
  if (n.includes("parte iniziale")) return "Introduzione e regole";
  return "Bestiario";
}

/** `# CAPITOLO 2` / `# BESTIARIO` e `# APPENDICE` per ripartire razze vs bestiario vs appendice. */
export function findMpmLandmarkLines(lines: string[]): {
  capitolo2Line: number;
  appendixLine: number;
} {
  let capitolo2Line = -1;
  let appendixLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^#\s+CAPITOLO\s+2\s*$/i.test(t)) capitolo2Line = i;
    if (appendixLine < 0 && /^#\s+APPENDICE\s*$/i.test(t)) appendixLine = i;
  }
  if (capitolo2Line < 0) {
    for (let i = 0; i < lines.length; i++) {
      if (/^#\s+BESTIARIO\s*$/i.test(lines[i].trim())) {
        capitolo2Line = i;
        break;
      }
    }
  }
  return { capitolo2Line, appendixLine };
}

function inferMpmChapter(
  displayName: string,
  blockStartLine: number,
  landmarks: { capitolo2Line: number; appendixLine: number }
): string {
  if (mmNormalizeHeadingTitle(displayName).includes("parte iniziale")) {
    return "Introduzione e regole";
  }
  const { capitolo2Line, appendixLine } = landmarks;
  if (appendixLine >= 0 && blockStartLine >= appendixLine) {
    return "Appendice — Elenchi di mostri";
  }
  const beastRegionStart = capitolo2Line >= 0 ? capitolo2Line : Number.MAX_SAFE_INTEGER;
  if (blockStartLine >= beastRegionStart) {
    return "Bestiario";
  }
  return "Razze fantastiche";
}

function mpmSectionKeySlug(chapter: string): string {
  if (chapter.startsWith("Razze")) return "race";
  if (chapter.startsWith("Bestiario")) return "beast";
  if (chapter.startsWith("Appendice")) return "appendix";
  if (chapter.startsWith("Introduzione")) return "intro";
  return "misc";
}

function splitLongBody(text: string, minLen: number, target: number, hardMax: number): string[] {
  const t = text.trim();
  if (t.length === 0) return [];
  if (t.length <= hardMax) return t.length >= minLen ? [t] : [];
  const parts: string[] = [];
  let start = 0;
  while (start < t.length) {
    let end = Math.min(t.length, start + target);
    if (end < t.length) {
      const window = t.slice(start, end);
      const breakAt = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "));
      if (breakAt > (target * 2) / 5) end = start + breakAt + 2;
    }
    const piece = t.slice(start, end).trim();
    if (piece.length >= minLen) parts.push(piece);
    if (end <= start) break;
    start = end;
  }
  return parts;
}

const MM_MIN_CHARS = 40;
const MM_HARD_MAX = 10_000;
const MM_SPLIT_TARGET = 7500;

type ChunkMode = "mm" | "mpm";

function chunkByCreatureIndex(raw: string, mode: ChunkMode): MonsterManualChunk[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const indexNames = parseMonsterManualIndexNames(lines, {
    stopBeforeComeUsareLibro: mode === "mpm",
  });
  if (indexNames.length === 0) {
    return [];
  }

  const landmarks = mode === "mpm" ? findMpmLandmarkLines(lines) : null;

  const normToDisplay = new Map<string, string>();
  for (const n of indexNames) {
    normToDisplay.set(mmNormalizeHeadingTitle(n), n);
  }
  const indexNormSet = new Set(normToDisplay.keys());

  function isIndexedTitle(title: string): boolean {
    return indexNormSet.has(mmNormalizeHeadingTitle(title));
  }

  const excludeNorms = firstHeadingExcludeNorms(mode);

  let bestiaryStart = -1;
  for (let li = 0; li < lines.length; li++) {
    const m = lines[li].match(/^#\s+(.+?)(?:\s+#+\s*)?$/);
    if (!m) continue;
    const title = m[1].trim();
    const key = mmNormalizeHeadingTitle(title);
    if (indexNormSet.has(key) && !excludeNorms.has(key)) {
      bestiaryStart = li;
      break;
    }
  }

  if (bestiaryStart < 0) {
    return [];
  }

  const out: MonsterManualChunk[] = [];

  const introLabel =
    mode === "mpm" ? "Mostri del Multiverso — Parte iniziale" : "Manuale dei Mostri — Parte iniziale";
  const introKeySlug = mode === "mpm" ? "mpm-intro-multiverso" : "mm-intro-mostri";

  const introRaw = lines
    .slice(0, bestiaryStart)
    .map(stripMmLineArtifacts)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (introRaw.length >= MM_MIN_CHARS) {
    const introBlock = `## ${introLabel}\n\n${introRaw}`.trim();
    const introKey = normalizeManualSectionKey(introKeySlug);
    const introSplits = splitLongBody(introBlock, 200, MM_SPLIT_TARGET, MM_HARD_MAX);
    const introTotal = Math.max(1, introSplits.length);
    introSplits.forEach((piece, idx) => {
      const hdr =
        introTotal === 1 ? "" : `_(Parte iniziale divisa: ${idx + 1}/${introTotal})_\n\n`;
      const ichapter =
        mode === "mpm"
          ? inferMpmChapter(introLabel, 0, landmarks!)
          : inferChapterClassic(introLabel);
      out.push({
        content: `${hdr}${piece}`.trim(),
        chapter: ichapter,
        sectionHeading: introLabel,
        sectionKey: introKey,
        chunkType: "prose",
        sectionPart: idx + 1,
        sectionPartTotal: introTotal,
      });
    });
  }

  let blockStart = bestiaryStart;
  let currentNorm: string | null = null;
  let currentDisplay: string | null = null;

  function resolveChapter(display: string, blockLine: number): string {
    if (mode === "mpm" && landmarks) {
      return inferMpmChapter(display, blockLine, landmarks);
    }
    return inferChapterClassic(display);
  }

  function resolveSectionKey(display: string, chapter: string): string {
    if (mode === "mpm") {
      return normalizeManualSectionKey(`${display}-${mpmSectionKeySlug(chapter)}`);
    }
    return normalizeManualSectionKey(display);
  }

  function flushBlock(endExclusive: number) {
    if (currentNorm == null || currentDisplay == null) return;
    const display = currentDisplay;
    if (blockStart >= endExclusive) return;
    const slice = lines.slice(blockStart, endExclusive);
    const bodyRaw = slice
      .map(stripMmLineArtifacts)
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (bodyRaw.length < MM_MIN_CHARS) return;

    const fullBlock = `## ${display}\n\n${bodyRaw}`.trim();
    const chapter = resolveChapter(display, blockStart);
    const sectionKey = resolveSectionKey(display, chapter);
    const splits = splitLongBody(fullBlock, 200, MM_SPLIT_TARGET, MM_HARD_MAX);
    const total = Math.max(1, splits.length);
    splits.forEach((piece, idx) => {
      const hdr =
        total === 1 ? "" : `_(Creatura divisa in embedding: ${idx + 1}/${total})_\n\n`;
      out.push({
        content: `${hdr}${piece}`.trim(),
        chapter,
        sectionHeading: display,
        sectionKey,
        chunkType: "prose",
        sectionPart: idx + 1,
        sectionPartTotal: total,
      });
    });
  }

  for (let li = bestiaryStart; li < lines.length; li++) {
    const hm = lines[li].match(/^#\s+(.+?)(?:\s+#+\s*)?$/);
    if (!hm) continue;
    const title = hm[1].trim();
    if (!isIndexedTitle(title)) continue;
    const tnorm = mmNormalizeHeadingTitle(title);
    if (currentNorm !== null && tnorm === currentNorm) {
      continue;
    }
    flushBlock(li);
    blockStart = li;
    currentNorm = tnorm;
    currentDisplay = normToDisplay.get(tnorm) ?? title;
  }

  flushBlock(lines.length);

  return out;
}

/**
 * Manuale dei Mostri (indice → # INTRODUZIONE).
 * Un chunk per voce d’indice; due `# STESSONOME` consecutivi si uniscono.
 */
export function chunkMonsterManualByCreatureIndex(raw: string): MonsterManualChunk[] {
  return chunkByCreatureIndex(raw, "mm");
}

/**
 * *Mostri del multiverso* (Mordenkainen): stessa logica indice, ma indice fino a
 * `# COME USARE QUESTO LIBRO` e capitoli Razze fantastiche / Bestiario / Appendice.
 */
export function chunkMordenkainenMultiverseByCreatureIndex(raw: string): MonsterManualChunk[] {
  return chunkByCreatureIndex(raw, "mpm");
}

/** Statistiche e anteprima confini (per script CLI). */
export function summarizeMonsterManualChunks(chunks: MonsterManualChunk[]): {
  count: number;
  headings: string[];
  sizes: number[];
} {
  return {
    count: chunks.length,
    headings: chunks.map((c) => c.sectionHeading),
    sizes: chunks.map((c) => c.content.length),
  };
}
