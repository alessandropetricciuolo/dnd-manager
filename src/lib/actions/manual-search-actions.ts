"use server";

import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { generateRagEmbedding } from "@/lib/ai/huggingface-client";
import type {
  ManualSearchCompareSide,
  ManualSearchHit,
  ManualSearchMode,
  ManualSearchResult,
  ManualSourceFilter,
} from "@/lib/manual-search-types";

export type {
  ManualSearchCompareSide,
  ManualSearchHit,
  ManualSearchMode,
  ManualSearchResult,
  ManualSourceFilter,
} from "@/lib/manual-search-types";

type MatchRow = {
  id?: string;
  content?: string | null;
  metadata?: Record<string, unknown> | null;
  similarity?: number | null;
};

function metaString(m: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!m || !(key in m)) return null;
  const v = m[key];
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

function metaInt(m: Record<string, unknown> | null | undefined, key: string): number | null {
  const s = metaString(m, key);
  if (s == null) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function metaOriginTag(m: Record<string, unknown> | null | undefined): string | null {
  const key = metaString(m, "manual_book_key");
  if (key === "eberron") return "eberron";
  if (key === "tasha") return "tasha";
  if (key === "xanathar") return "xanathar";
  const ro = metaString(m, "rules_origin");
  if (ro === "eberron" || ro === "tasha" || ro === "xanathar") return ro;
  return ro;
}

function appendManualOriginPreamble(
  md: Record<string, unknown> | null | undefined,
  lines: string[]
): void {
  const tag = metaOriginTag(md);
  if (tag === "eberron") {
    lines.push(
      "Origine — **Eberron** (*Rinascita dopo l'Ultima Guerra*): espansione di ambientazione e opzioni di gioco; confrontare con il Manuale del Giocatore di base ove serve."
    );
  } else if (tag === "tasha") {
    lines.push(
      "Origine — **Tasha** (*Calderone omnicomprensivo di Tasha*): regole opzionali e aggiunte al Manuale del Giocatore; applicare solo se il gruppo le usa."
    );
  } else if (tag === "xanathar") {
    lines.push(
      "Origine — **Xanathar** (*Guida omnicomprensiva di Xanathar*): supplemento con opzioni per PG e DM; confrontare con il Manuale del Giocatore di base ove serve."
    );
  }
}

/** Preferisci chunk da ingest Markdown (stesso testo di ricerca, meno rumore due colonne). */
function phraseScoreMarkdownBonus(row: MatchRow): number {
  const md = (row.metadata ?? null) as Record<string, unknown> | null;
  if (metaString(md, "source_format") === "markdown") return 100;
  if (metaString(md, "ingestion_version") === "v3-markdown") return 100;
  return 0;
}

function rowIsMarkdownSource(row: MatchRow): boolean {
  const md = (row.metadata ?? null) as Record<string, unknown> | null;
  return (
    metaString(md, "source_format") === "markdown" ||
    metaString(md, "ingestion_version") === "v3-markdown"
  );
}

function rowMatchesSourceFilter(row: MatchRow, filter: ManualSourceFilter): boolean {
  if (filter === "all") return true;
  const isMd = rowIsMarkdownSource(row);
  if (filter === "markdown") return isMd;
  return !isMd;
}

/**
 * L'ingest MD taglia i blocchi tra titoli ATX a ~900 caratteri: una stessa ## sezione finisce in più righe DB
 * con uguale file_name + section_heading (+ chapter, perché titoli come «7° LIVELLO» si ripetono per ogni classe).
 * Uniamo per chunk_index così l'estrazione vede il testo completo nella stessa sezione di classe.
 */
function mergeMdSameSectionRows(primary: MatchRow, pool: MatchRow[]): MatchRow {
  if (!rowIsMarkdownSource(primary)) return primary;
  const md0 = (primary.metadata ?? null) as Record<string, unknown> | null;
  const file = metaString(md0, "file_name");
  const sec = metaString(md0, "section_heading") ?? metaString(md0, "section_title");
  const chapterKey = metaString(md0, "chapter");
  if (!file || !sec) return primary;

  const siblings = pool.filter((r) => {
    if (!rowIsMarkdownSource(r)) return false;
    const md = (r.metadata ?? null) as Record<string, unknown> | null;
    if (metaString(md, "file_name") !== file) return false;
    if ((metaString(md, "section_heading") ?? metaString(md, "section_title")) !== sec) return false;
    if (chapterKey) {
      /* stesso breadcrumb capitolo (es. «INCANTESIMI DA STREGONE › Bardo» vs solo lista livelli) */
      return metaString(md, "chapter") === chapterKey;
    }
    return true;
  });

  const byIdx = new Map<number, MatchRow>();
  const noIdx: MatchRow[] = [];
  for (const r of siblings) {
    const md = (r.metadata ?? null) as Record<string, unknown> | null;
    const ix = metaInt(md, "chunk_index");
    if (ix == null) {
      noIdx.push(r);
      continue;
    }
    if (!byIdx.has(ix)) byIdx.set(ix, r);
  }
  const orderedIdx = [...byIdx.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r);

  const seenNo = new Set<string>();
  const extra: MatchRow[] = [];
  for (const r of noIdx) {
    const k = rowContentKey(r);
    if (seenNo.has(k)) continue;
    seenNo.add(k);
    extra.push(r);
  }

  const ordered = [...orderedIdx, ...extra];
  if (ordered.length <= 1) return primary;

  const mergedContent = ordered
    .map((r) => (typeof r.content === "string" ? r.content.trim() : ""))
    .filter(Boolean)
    .join("\n\n");

  return { ...primary, content: mergedContent };
}

function rowContentKey(r: MatchRow): string {
  const c = typeof r.content === "string" ? r.content : "";
  return createHash("md5").update(c.slice(0, 500)).digest("hex");
}

/**
 * .txt da PDF: frammenti con OCR o impaginazione rotta (non usabili come «miglior» confronto).
 */
function isLikelyCorruptOrSidebarTxtChunk(content: string): boolean {
  const t = content.trim();
  if (t.length < 55) return false;
  if ((t.match(/\\\s*[lLiI]/g) ?? []).length >= 1) return true;
  if ((t.match(/E[iIîÎ][a-zà-ö]/gi) ?? []).length >= 2) return true;
  if ((t.match(/\|\|/g) ?? []).length >= 2) return true;
  const lines = t.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 6) return false;
  const micro = lines.filter((l) => l.length <= 2 && /[a-zà-ö]/i.test(l)).length;
  if (micro / lines.length >= 0.22) return true;
  if ((t.match(/[ÎîÊê]/g) ?? []).length >= 2) return true;
  return false;
}

/** Confronto MD vs TXT: sul pool TXT lo score non applica il bonus Markdown. */
function scoreRowForComparePool(r: MatchRow, q: string, pool: "markdown" | "txt"): number | null {
  if (!rowMatchesSourceFilter(r, pool)) return null;
  const content = typeof r.content === "string" ? r.content : "";
  if (pool === "txt" && isLikelyCorruptOrSidebarTxtChunk(content)) return null;
  const base = scoreChunkForPhrase(content, q);
  if (base == null) return null;
  return pool === "markdown" ? base + phraseScoreMarkdownBonus(r) : base;
}

function pickBestCompareRow(
  phraseRaw: MatchRow[],
  vectorList: MatchRow[],
  q: string,
  pool: "markdown" | "txt"
): MatchRow | null {
  const seen = new Set<string>();
  let best: { r: MatchRow; s: number } | null = null;
  for (const r of phraseRaw.concat(vectorList)) {
    const c = typeof r.content === "string" ? r.content : "";
    if (!c.trim()) continue;
    const k = rowContentKey(r);
    if (seen.has(k)) continue;
    seen.add(k);
    const s = scoreRowForComparePool(r, q, pool);
    if (s == null) continue;
    if (!best || s > best.s) best = { r, s };
  }
  return best == null ? null : best.r;
}

function buildCompareSide(
  row: MatchRow | null,
  q: string,
  mergePool: MatchRow[]
): ManualSearchCompareSide | null {
  if (!row || typeof row.content !== "string") return null;
  const merged = mergeMdSameSectionRows(row, mergePool);
  const md = (merged.metadata ?? null) as Record<string, unknown> | null;
  return {
    primaryText: buildPhrasePrimaryText(merged, q),
    fileHint: metaString(md, "file_name") ?? metaString(md, "source"),
  };
}

function attachCompareToResult(
  payload: Extract<ManualSearchResult, { success: true }>,
  phraseRowsRaw: MatchRow[],
  vectorListFull: MatchRow[],
  q: string
): ManualSearchResult {
  if (payload.sourceFilter !== "all") return payload;
  const mergePool = phraseRowsRaw.concat(vectorListFull);
  const markdown = buildCompareSide(pickBestCompareRow(phraseRowsRaw, vectorListFull, q, "markdown"), q, mergePool);
  const txt = buildCompareSide(pickBestCompareRow(phraseRowsRaw, vectorListFull, q, "txt"), q, mergePool);
  if (!markdown && !txt) return payload;
  return { ...payload, compare: { markdown, txt } };
}

function rowToHit(r: MatchRow): ManualSearchHit {
  const md = (r.metadata ?? null) as Record<string, unknown> | null;
  return {
    content: typeof r.content === "string" ? r.content : "",
    similarity: typeof r.similarity === "number" && Number.isFinite(r.similarity) ? r.similarity : null,
    sectionTitle: metaString(md, "section_heading") ?? metaString(md, "section_title"),
    sourceLabel: metaString(md, "source"),
    fileName: metaString(md, "file_name"),
    chunkIndex: metaInt(md, "chunk_index"),
    chapter: metaString(md, "chapter"),
    chunkType: metaString(md, "chunk_type"),
    originTag: metaOriginTag(md),
  };
}

/** OCR / pdf-to-text: «I» iniziale spesso diventa «!» nei titoli maiuscoli. */
function fixOcrHeadingLine(line: string): string {
  return line.replace(/^(\s*)(!{1,3})(?=[A-ZÀ-Ö])/, "$1I");
}

/**
 * PDF a due colonne: stessa riga con blocco sinistro e destro separati da molti spazi.
 * Per ogni riga manteniamo il segmento più pertinente alla query (o impilate le colonne se incerte).
 */
function stripTwoColumnLines(text: string, phrase: string): string {
  const tokens = normalizeForMatch(phrase.trim())
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  const lines = text.split("\n");
  const out: string[] = [];

  const scorePart = (part: string): number => {
    const n = normalizeForMatch(part);
    let s = 0;
    if (tokens.length && tokens.every((t) => n.includes(t))) s += 14;
    if (/un bardo può ispirare/i.test(part)) s += 12;
    if (/per farlo usa un['’]azione bonus/i.test(part)) s += 6;
    if (tokens.some((t) => n.includes(t)) && /^[!A-ZÀ-Ö][A-ZÀ-Ö0-9 '\u2019·•\-]{5,58}$/.test(part.trim())) s += 8;
    s -= countTableLikeLines(part, 28) * 4;
    if (part.length > 220 && s < 10) s -= 5;
    return s;
  };

  for (const line of lines) {
    const t = line.trimEnd();
    if (t.length < 8) {
      out.push(fixOcrHeadingLine(line));
      continue;
    }
    const parts = t
      .split(/\s{5,}/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length < 2) {
      out.push(fixOcrHeadingLine(line));
      continue;
    }
    let best = parts[0];
    let bestS = scorePart(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      const sc = scorePart(parts[i]);
      if (sc > bestS) {
        bestS = sc;
        best = parts[i];
      }
    }
    if (bestS <= 0) {
      out.push(...parts.map((p) => fixOcrHeadingLine(p)));
    } else {
      out.push(fixOcrHeadingLine(best));
    }
  }
  return out.join("\n");
}

function isGarbageChapterValue(ch: string | null | undefined): boolean {
  if (ch == null || !String(ch).trim()) return false;
  const s = String(ch);
  const n = s.toLowerCase();
  if (/paypal|mimmi|offrimi un caff[eè]/i.test(n)) return true;
  if (s.length > 92) return true;
  if ((s.match(/\bCAPITOLO\b/gi) ?? []).length >= 2) return true;
  return false;
}

function isGarbageSectionValue(sec: string | null | undefined): boolean {
  if (sec == null || !String(sec).trim()) return false;
  const s = String(sec).trim();
  if (s.length > 82) return true;
  if (/^\d+[·•.]\s*\+\d+/i.test(s)) return true;
  if ((s.match(/\+/g) ?? []).length >= 3 && /\d/.test(s) && s.length < 70) return true;
  return false;
}

function inferHeadingFromCleanBody(body: string, phrase: string): { chapter: string | null; section: string | null } {
  const tokens = normalizeForMatch(phrase.trim())
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  let chapter: string | null = null;
  let section: string | null = null;
  for (let i = 0; i < Math.min(lines.length, 48); i++) {
    const ln = lines[i];
    if (
      !chapter &&
      /^CAPITOLO\s+\d+/i.test(ln) &&
      ln.length < 84 &&
      !/paypal/i.test(ln)
    ) {
      chapter = ln.replace(/\s+/g, " ");
    }
    const lnorm = normalizeForMatch(ln);
    if (
      !section &&
      tokens.length >= 2 &&
      tokens.every((t) => lnorm.includes(t)) &&
      ln.length >= 10 &&
      ln.length <= 74 &&
      /^[!A-ZÀ-Ö0-9]/.test(ln)
    ) {
      section = fixOcrHeadingLine(ln).trim();
    }
  }
  return { chapter, section };
}

/** Risultato admin: estrazione regola + de-two-column + metadati se il DB ha chapter/section rumorosi. */
function buildPhrasePrimaryText(row: MatchRow, query: string): string {
  const raw = typeof row.content === "string" ? row.content : "";
  const extracted = extractRuleBlockAroundPhrase(raw, query);
  const body = stripTwoColumnLines(extracted, query);
  const md = (row.metadata ?? null) as Record<string, unknown> | null;
  const source = metaString(md, "source");
  const file = metaString(md, "file_name");
  let ch = metaString(md, "chapter");
  let sec = metaString(md, "section_heading") ?? metaString(md, "section_title");
  const typ = metaString(md, "chunk_type");

  const inferred = inferHeadingFromCleanBody(body, query);
  if (isGarbageChapterValue(ch)) ch = inferred.chapter ?? null;
  if (isGarbageSectionValue(sec)) sec = inferred.section ?? null;

  const lines: string[] = [];
  appendManualOriginPreamble(md, lines);
  if (source || file) lines.push(`Manuale: ${[source, file].filter(Boolean).join(" · ")}`);
  if (ch) lines.push(`Capitolo: ${ch}`);
  if (sec) lines.push(`Sezione: ${sec}`);
  if (typ) lines.push(`Tipo: ${typ}`);
  if (lines.length === 0) return body;
  return `${lines.join("\n")}\n\n— — —\n\n${body}`;
}

/** Intestazione leggibile (v3) + corpo; `bodyOverride` per estrazione phrase senza riscrivere metadata. */
function formatPrimaryFromRow(row: MatchRow, bodyOverride?: string): string {
  const md = (row.metadata ?? null) as Record<string, unknown> | null;
  const content =
    bodyOverride ?? (typeof row.content === "string" ? row.content.trim() : "");
  const source = metaString(md, "source");
  const file = metaString(md, "file_name");
  const ch = metaString(md, "chapter");
  const sec = metaString(md, "section_heading") ?? metaString(md, "section_title");
  const typ = metaString(md, "chunk_type");
  const lines: string[] = [];
  appendManualOriginPreamble(md, lines);
  if (source || file) lines.push(`Manuale: ${[source, file].filter(Boolean).join(" · ")}`);
  if (ch) lines.push(`Capitolo: ${ch}`);
  if (sec) lines.push(`Sezione: ${sec}`);
  if (typ) lines.push(`Tipo: ${typ}`);
  if (lines.length === 0) return content;
  return `${lines.join("\n")}\n\n— — —\n\n${content}`;
}

function sanitizeIlikeFragment(raw: string): string {
  return raw.replace(/[%_\\]/g, " ").trim().slice(0, 200);
}

/** Normalizza per confronto (minuscole, senza accenti). */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/!/g, "i");
}

/** Righe tipo tabella avanzamento livelli (Gilda / Bardo ecc.). */
function countTableLikeLines(text: string, maxLines = 50): number {
  const lines = text.split("\n").slice(0, maxLines);
  let n = 0;
  for (const line of lines) {
    const t = line.trim();
    if (/^\d+[·•.\s]+\+?\d+/.test(t)) n += 2;
    if (/^\s*\d+\s*[·•.]\s*\+?\d+/.test(t)) n += 2;
    if ((t.match(/[·•]/g) ?? []).length >= 6) n += 1;
  }
  return n;
}

function isTableHeavyChunk(content: string): boolean {
  return countTableLikeLines(content, 45) >= 10;
}

/** MD: blocco scheda incantesimo (da preferire rispetto a elenchi solo-nome). */
function hasMarkdownSpellStatBlock(content: string): boolean {
  return /\*\*Tempo di Lancio:\*\*/i.test(content) || /\*\*Gittata:\*\*/i.test(content);
}

/**
 * Blocco export HTML (tabelle divinità, ecc.) — la frase può comparire solo in una <td> del simbolo.
 * Non va trattato come «voce regola» per incantesimi/contesti di gioco a meno che non ci sia la scheda MD o il titolo ATX della query.
 */
function isHtmlTableMarkupChunk(content: string): boolean {
  return /<\s*(?:table|tbody|thead|tr|td|th)\b/i.test(content);
}

/**
 * Elenchi nomi incantesimo (liste per livello sotto una classe): anche frammenti corti dopo lo split (~900 caratteri)
 * hanno poche righe ma sono tutte «Nome Magico» senza **Tempo di Lancio:**.
 */
function isLikelyBareSpellNameListChunk(content: string): boolean {
  if (hasMarkdownSpellStatBlock(content)) return false;
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  let eligible = 0;
  let listLike = 0;
  for (const L of lines) {
    if (L.includes("**")) continue;
    if (/^#{1,6}\s/.test(L)) continue;
    if (/^CAPITOLO\s+\d+/i.test(L)) continue;
    if (L.length > 92) continue;
    if (/[.!?]\s+[A-ZÀ-Ö]/.test(L) && L.length > 70) continue;
    eligible++;
    if (/^[A-ZÀ-Ö\d]/.test(L) && !/:\s*$/.test(L)) listLike++;
  }
  if (eligible < 3) return false;
  if (listLike < 3) return false;
  return listLike / eligible >= 0.5;
}

/** Sotto «INCANTESIMI DA …», intestazione ## 7° LIVELLO senza schede — solo nomi in elenco. */
function isMarkdownSpellTierSubsectionChunk(content: string): boolean {
  if (hasMarkdownSpellStatBlock(content)) return false;
  return /^##\s*\d{1,2}\s*°\s*LIVELLO\b/im.test(content);
}

/** Es. `# PALLA DI FUOCO` — coincide con la query (titolo scheda incantesimo MD). */
function chunkHasAtxHeadingMatchingQuery(content: string, query: string): boolean {
  const q = query.trim();
  if (q.length < 4) return false;
  const parts = q
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  if (!parts) return false;
  const re = new RegExp(`^#\\s+${parts}\\s*$`, "im");
  return re.test(content);
}

/**
 * Non usare come voce principale né nel ranking semantico: HTML tabella senza scheda, .txt OCR rotto, ecc.
 */
function chunkDisqualifiedAsRuleVoice(content: string, query: string): boolean {
  if (isLikelyCorruptOrSidebarTxtChunk(content)) return true;
  const q = query.trim();
  return (
    isHtmlTableMarkupChunk(content) &&
    !hasMarkdownSpellStatBlock(content) &&
    !chunkHasAtxHeadingMatchingQuery(content, q)
  );
}

/**
 * La frase compare citata in un altro incantesimo/regola (es. Santuario: «…esplosione di una palla di fuoco»)
 * o in corsivo da manuale — deprioritizza rispetto alla voce dedicata.
 */
function incidentalPhraseReferencePenalty(content: string, phrase: string): number {
  const indices = allRawIndicesOfPhrase(content, phrase);
  if (indices.length === 0) return 0;
  const rawQ = phrase.trim();
  const pqWords = rawQ
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
  let maxPen = 0;
  for (const i of indices) {
    let pen = 0;
    const plen = rawQ.length;
    if (i > 0 && content[i - 1] === "*") {
      const end = i + plen;
      if (end < content.length && content[end] === "*") pen += 410;
    }
    const win = content.slice(Math.max(0, i - 145), Math.min(content.length, i + plen + 42));
    const wlow = win.toLowerCase();
    if (rawQ.split(/\s+/).filter(Boolean).length >= 2) {
      if (new RegExp(`di\\s+una\\s+${pqWords}`, "i").test(wlow)) pen += 380;
      if (new RegExp(`esplosione\\s+di\\s+una\\s+${pqWords}`, "i").test(wlow)) pen += 380;
    }
    if (/effetti\s+ad\s+area\s+come/.test(wlow)) pen += 340;
    if (/come\s+l['']esplosione\s+di/.test(wlow)) pen += 160;
    if (rawQ.split(/\s+/).filter(Boolean).length >= 2) {
      if (new RegExp(`\\b[a-zà-ö]{4,24}\\s+su\\s+una\\s+${pqWords}`, "i").test(wlow)) pen += 340;
    }
    const before = content.slice(Math.max(0, i - 118), i).toLowerCase();
    if (/\b(incantesimi|incantesimo)\s+come\b/.test(before)) pen += 200;
    if (/\b(per|ad)\s+esempio\b[^.]{0,20}$/.test(before)) pen += 130;
    if (/\b(che|quando)\s+[^.]{0,50}$/.test(before) && /come\s+un/.test(before.slice(-40))) pen += 90;
    if (/\bincantesimo\s*\*+$/i.test(before)) pen += 420;
    if (/\bl['']esplosione\s+di\s+un\s+incantesimo\s*$/i.test(before)) pen += 420;
    if (/\blancia\s+\*+$/i.test(before)) pen += 400;
    if (/\bquando\s+un\s+\w+\s+lancia\s+\*+$/i.test(before)) pen += 400;
    if (/,\s*come\s+\*+$/i.test(before) || /\bcome\s+\*+$/i.test(before)) pen += 560;
    const beforeWin = content.slice(Math.max(0, i - 280), i);
    if (/\bun\s+altro\s+incantesimo\b/i.test(beforeWin)) pen += 480;
    if (
      /\bincantesimi\s+e\s+gli\s+altri\s+effetti\s+magici\b/i.test(beforeWin) &&
      /\bcome\s*\*+\s*$/i.test(before)
    ) {
      pen += 520;
    }
    if (/\bL['']area\s+di\s+un\s+altro\s+incantesimo\b/i.test(beforeWin)) pen += 520;
    const bwl = beforeWin.toLowerCase();
    if (/\bper\s+lanciare\s+\*+$/i.test(bwl)) pen += 600;
    if (/\bpunti\s+ki\s+per\s+lanciare\s+\*+$/i.test(bwl)) pen += 640;
    if (/\bspendere\s+\d+\s+punti\s+ki\s+per\s+lanciare\s+\*+$/i.test(bwl)) pen += 680;
    maxPen = Math.max(maxPen, pen);
  }
  return Math.min(maxPen, 1550);
}

/**
 * Punteggio più alto = chunk più adatto a essere la “voce regola” per la frase.
 * Rifiuta (null) se non contiene la frase normalizzata.
 */
function scoreChunkForPhrase(content: string, query: string): number | null {
  const qTrim = query.trim();
  const c = normalizeForMatch(content);
  const p = normalizeForMatch(qTrim);
  if (p.length < 3 || !c.includes(p)) return null;

  if (chunkDisqualifiedAsRuleVoice(content, qTrim)) {
    return null;
  }

  const idx = c.indexOf(p);
  const freq = c.split(p).length - 1;
  const tablePenalty = countTableLikeLines(content, 45) * 18 + (isTableHeavyChunk(content) ? 120 : 0);

  let score = 2000 - tablePenalty;
  score -= Math.min(idx, 1800) * 0.12;
  if (idx < 200) score += 100;
  else if (idx < 550) score += 55;
  if (freq === 1 && content.length > 2200) score -= 35;
  if (freq >= 4 && isTableHeavyChunk(content)) score -= 80;

  /* «palla di fuoco» dentro «palla di fuoco ritardata»: penalizza; la scheda # PALLA DI FUOCO ha subito dopo \n o * */
  const afterPhraseNorm = c.slice(idx + p.length).trimStart();
  if (afterPhraseNorm.length > 0 && /^[a-zà-ö]/i.test(afterPhraseNorm)) {
    score -= 340;
  }

  if (hasMarkdownSpellStatBlock(content)) {
    score += 260;
  }
  if (chunkHasAtxHeadingMatchingQuery(content, query.trim())) {
    score += 480;
  }
  score -= incidentalPhraseReferencePenalty(content, query.trim());

  if (isLikelyBareSpellNameListChunk(content)) {
    score -= 520;
  }
  if (isMarkdownSpellTierSubsectionChunk(content)) {
    score -= 420;
  }

  const beforeWindow = content.slice(Math.max(0, idx - 200), idx);
  if (/\n\n\s*[A-ZÀ-Ö][A-ZÀ-Ö0-9 '\u2019\-]{5,55}\s*$/.test(beforeWindow)) {
    score += 40;
  }
  if (
    /un bardo può ispirare/i.test(content) &&
    p.includes("ispir") &&
    /bard/.test(p)
  ) {
    score += 140;
  }
  const twoColNoise = (content.slice(0, 2800).match(/\S\s{6,}\S/g) ?? []).length;
  score -= Math.min(160, twoColNoise * 10);

  return score;
}

/** Indici in `content` dove inizia la frase (normalizzata), evitando match “a metà parola”. */
function allRawIndicesOfPhrase(content: string, phrase: string): number[] {
  const p = normalizeForMatch(phrase.trim());
  if (p.length < 3) return [];
  const out: number[] = [];
  const max = content.length;
  for (let i = 0; i <= max - p.length; i++) {
    const sliceEnd = Math.min(max, i + p.length + 32);
    const n = normalizeForMatch(content.slice(i, sliceEnd));
    if (!n.startsWith(p)) continue;
    const after = n[p.length];
    if (after !== undefined && /[a-zà-ö0-9]/i.test(after)) continue;
    out.push(i);
    i += Math.max(0, p.length - 1);
  }
  return out;
}

function scoreOccurrenceWindow(content: string, idx: number, phrase: string): number {
  const winStart = Math.max(0, idx - 520);
  const win = content.slice(winStart, Math.min(content.length, idx + 420));
  let score = -countTableLikeLines(win, 55) * 22;
  const beforePhrase = content.slice(winStart, idx);
  if (/\n[!A-ZÀ-ÖI][!A-ZÀ-ÖI0-9 '\u2019·•\-]{4,58}\s*$/m.test(beforePhrase)) score += 95;
  const right = content.slice(idx, Math.min(content.length, idx + 200));
  if (/Un bardo può|Per farlo usa un['’]azione bonus/i.test(right)) score += 55;
  const beforeLong = content.slice(Math.max(0, idx - 1100), idx);
  if (/Un bardo può ispirare/i.test(beforeLong)) score += 130;
  if (/\bgranello\b|Collegio della Creazione|CREAZIONE ANIMATA/i.test(beforeLong.slice(-650)))
    score -= 200;
  const sig = normalizeForMatch(phrase)
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  if (
    sig.length >= 2 &&
    sig.every((t) => normalizeForMatch(beforePhrase).includes(t)) &&
    /^[!A-ZÀ-Ö]/m.test(beforePhrase.slice(-120))
  )
    score += 90;
  return score;
}

/**
 * Risale poche righe sopra la frase per il titolo sezione (maiuscole / OCR ! al posto di I).
 * Per query multi-parola richiede che ogni token significativo compaia nella stessa riga titolo
 * (es. evita "Ispirazione contagiosa" per la ricerca "ispirazione bardica").
 */
function scanTitleLineStartAbove(content: string, idx: number, phrase: string): number | null {
  const sig = normalizeForMatch(phrase.trim())
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  if (sig.length === 0) return null;
  let pos = idx;
  for (let n = 0; n < 40; n++) {
    const ls = content.lastIndexOf("\n", pos - 1);
    const lineStart = ls + 1;
    if (lineStart >= idx || lineStart < 0) break;
    const nextNl = content.indexOf("\n", lineStart);
    const lineEnd = nextNl === -1 ? content.length : nextNl;
    const line = content.slice(lineStart, Math.min(lineEnd, idx)).trimEnd();
    pos = lineStart - 1;
    if (line.length > 78 || line.length < 4) {
      if (pos < 0) break;
      continue;
    }
    const ln = normalizeForMatch(line);
    if (!sig.every((t) => ln.includes(t))) {
      if (pos < 0) break;
      continue;
    }
    const compact = line.replace(/\s/g, "");
    const up = (compact.match(/[A-ZÀ-Ö!]/g) ?? []).length / Math.max(1, compact.length);
    if (up >= 0.38 && line.length <= 72) return lineStart;
    if (pos < 0) break;
  }
  return null;
}

/** Rimuove righe iniziali rumorose se più sotto ricompare lo stesso titolo sezione. */
function trimDuplicateTitlePrefix(text: string, phrase: string): string {
  const sig = normalizeForMatch(phrase.trim())
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  if (sig.length < 2) return text;
  const lines = text.split("\n");
  let secondHit = -1;
  for (let i = 1; i < lines.length; i++) {
    const ln = normalizeForMatch(lines[i].trim());
    if (!sig.every((t) => ln.includes(t))) continue;
    const raw = lines[i].trim();
    if (raw.length > 72) continue;
    const compact = raw.replace(/\s/g, "");
    const up = (compact.match(/[A-ZÀ-Ö!]/g) ?? []).length / Math.max(1, compact.length);
    if (up >= 0.35) {
      secondHit = i;
      break;
    }
  }
  if (secondHit > 0) {
    return lines.slice(secondHit).join("\n").trim();
  }
  return text;
}

/**
 * Estrae un unico blocco regola intorno alla prima occorrenza della frase
 * (titolo subito sopra incluso; stop al prossimo titolo sezione o CAPITOLO).
 */
function extractRuleBlockAroundPhrase(content: string, phrase: string): string {
  const p = normalizeForMatch(phrase.trim());
  if (p.length < 2) return content.trim();

  const rawCandidates = allRawIndicesOfPhrase(content, phrase);
  let idx: number;
  if (rawCandidates.length === 0) {
    const lower = normalizeForMatch(content);
    const fallback = lower.indexOf(p);
    if (fallback === -1) return content.trim();
    idx = fallback;
  } else if (rawCandidates.length === 1) {
    idx = rawCandidates[0];
  } else {
    /** Preferisci l'inizio della sezione: una successiva vince solo con margine chiaro (evita paragrafi "coda"). */
    const LATER_OCCURRENCE_MARGIN = 92;
    let best = rawCandidates[0];
    let bestScore = scoreOccurrenceWindow(content, best, phrase);
    for (let k = 1; k < rawCandidates.length; k++) {
      const c = rawCandidates[k];
      const s = scoreOccurrenceWindow(content, c, phrase);
      if (s > bestScore + LATER_OCCURRENCE_MARGIN) {
        bestScore = s;
        best = c;
      }
    }
    idx = best;
  }

  const titleLine = scanTitleLineStartAbove(content, idx, phrase);

  let start: number;
  if (titleLine !== null) {
    start = titleLine;
  } else {
    start = idx;
    const paraBreak = content.lastIndexOf("\n\n", idx);
    if (paraBreak !== -1 && idx - paraBreak < 380) {
      const afterBreak = content.slice(paraBreak + 2, idx);
      const firstLine = afterBreak.split("\n")[0]?.trim() ?? "";
      const looksLikeHeading =
        firstLine.length >= 6 &&
        firstLine.length <= 72 &&
        /^[!A-ZÀ-Ö\d]/.test(firstLine) &&
        (firstLine === firstLine.toUpperCase() ||
          (firstLine.match(/[A-ZÀ-Ö!]/g) ?? []).length / Math.max(1, firstLine.replace(/\s/g, "").length) > 0.45);
      if (looksLikeHeading) start = paraBreak + 2;
    } else {
      start = content.lastIndexOf("\n", idx - 1) + 1;
      if (start < 0) start = 0;
    }
  }

  let end = content.length;
  const tailFromPhrase = content.slice(idx);
  const capAt = tailFromPhrase.search(/\n\nCAPITOLO\b/i);
  if (capAt !== -1 && capAt > 40) {
    end = Math.min(end, idx + capAt);
  }

  const scan = content.slice(start, end);
  const sectionRe = /\n\n(?=[A-ZÀ-Ö][A-ZÀ-Ö0-9 '\u2019\u00b7·•\-]{6,62}\s*\n)/g;
  let m: RegExpExecArray | null;
  let firstSectionAfter = end;
  while ((m = sectionRe.exec(scan)) !== null) {
    const abs = start + m.index;
    if (abs <= idx) continue;
    const line = content.slice(abs + 2).split("\n")[0]?.trim() ?? "";
    const letters = line.replace(/\s/g, "");
    if (letters.length < 8) continue;
    const upperish = (letters.match(/[A-ZÀ-Ö]/g) ?? []).length / Math.max(1, letters.length);
    const looksLikeNewRuleTitle = upperish > 0.52 && line.length <= 68;
    const isDuplicateTopic = normalizeForMatch(line).includes(p.split(/\s+/)[0] ?? "");
    if (looksLikeNewRuleTitle && !isDuplicateTopic && abs > idx + 40) {
      firstSectionAfter = Math.min(firstSectionAfter, abs);
      break;
    }
  }
  end = Math.min(end, firstSectionAfter);

  const maxLen = 3600;
  let out = trimDuplicateTitlePrefix(content.slice(start, end).trim(), phrase);
  if (out.length > maxLen) {
    out = `${out.slice(0, maxLen).trim()}\n\n[… testo troncato …]`;
  }
  return out;
}

function hitKey(h: ManualSearchHit): string {
  return createHash("md5").update(h.content.slice(0, 500)).digest("hex");
}

function mergeHitsUnique(primary: ManualSearchHit[], secondary: ManualSearchHit[]): ManualSearchHit[] {
  const seen = new Set<string>();
  const out: ManualSearchHit[] = [];
  for (const h of [...primary, ...secondary]) {
    const k = hitKey(h);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(h);
  }
  return out;
}

/** Ricerca sui manuali (GM/Admin): ibrido frase + semantica, estrazione blocco regola, filtro sorgente e confronto MD/TXT. */
export async function searchManualsSemanticAction(
  query: string,
  options?: { sourceFilter?: ManualSourceFilter }
): Promise<ManualSearchResult> {
  const q = query.trim();
  if (q.length < 2) {
    return { success: false, message: "Inserisci almeno 2 caratteri." };
  }

  const sourceFilter: ManualSourceFilter = options?.sourceFilter ?? "all";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { success: false, message: "Devi essere autenticato." };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = profile?.role;
  if (role !== "admin" && role !== "gm") {
    return { success: false, message: "Solo GM e amministratori possono consultare la knowledge base manuali." };
  }

  const admin = createSupabaseAdminClient();
  const runRpc = admin.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;

  const frag = sanitizeIlikeFragment(q);

  async function fetchPhraseRows(): Promise<MatchRow[]> {
    if (frag.length < 2) return [];
    const { data: rows, error } = await admin
      .from("manuals_knowledge")
      .select("content, metadata")
      .ilike("content", `%${frag}%`)
      .limit(280);
    if (error) {
      console.error("[searchManualsSemanticAction] phrase ilike", error);
      return [];
    }
    return (rows ?? []) as MatchRow[];
  }

  const phraseRowsRaw = await fetchPhraseRows();

  const phraseScoredFull = phraseRowsRaw
    .map((r) => {
      const base = scoreChunkForPhrase(typeof r.content === "string" ? r.content : "", q);
      if (base == null) return null;
      return { r, s: base + phraseScoreMarkdownBonus(r) };
    })
    .filter((x): x is { r: MatchRow; s: number } => x != null)
    .sort((a, b) => b.s - a.s);

  const phraseScoredPrimary = phraseScoredFull.filter((x) => rowMatchesSourceFilter(x.r, sourceFilter));

  const bestPhrase = phraseScoredPrimary[0];
  const phraseScoreFloor = 300;
  const usePhraseFocus = !!bestPhrase && bestPhrase.s >= phraseScoreFloor;

  const phraseRowsForHits = phraseRowsRaw.filter((r) => rowMatchesSourceFilter(r, sourceFilter));

  let vectorListFull: MatchRow[] = [];
  let rpcError: { message: string } | null = null;

  function rowsForMdMerge(): MatchRow[] {
    return phraseRowsRaw.concat(vectorListFull);
  }

  function phrasePrimaryFromRow(row: MatchRow): string {
    return buildPhrasePrimaryText(mergeMdSameSectionRows(row, rowsForMdMerge()), q);
  }

  const emptyFilterMessage =
    sourceFilter !== "all"
      ? "Nessun passaggio con questo filtro sorgente. Prova «Tutte le sorgenti» o un'altra query."
      : "Nessun passaggio trovato nei manuali per questa ricerca.";

  function finishTextFallback(list: MatchRow[]): ManualSearchResult {
    const hits = list.map(rowToHit).filter((h) => h.content.trim().length > 0);
    if (hits.length === 0) {
      return { success: false, message: emptyFilterMessage };
    }
    const scored = list
      .map((r) => {
        const base = scoreChunkForPhrase(typeof r.content === "string" ? r.content : "", q);
        if (base == null) return null;
        return { r, s: base + phraseScoreMarkdownBonus(r) };
      })
      .filter((x): x is { r: MatchRow; s: number } => x != null)
      .sort((a, b) => b.s - a.s);
    const bestRow = scored[0]?.r;
    const primaryText =
      bestRow && typeof bestRow.content === "string"
        ? phrasePrimaryFromRow(bestRow)
        : hits
            .map((h) => h.content.trim())
            .filter(Boolean)
            .join("\n\n— — —\n\n");
    return attachCompareToResult(
      { success: true, mode: "text-fallback", primaryText, hits, sourceFilter },
      phraseRowsRaw,
      vectorListFull,
      q
    );
  }

  try {
    const embedding = await generateRagEmbedding(q);
    for (const threshold of [0.38, 0.3, 0.24, 0.18, 0.12]) {
      const res = await runRpc("match_manuals_knowledge", {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: 20,
      });
      rpcError = res.error;
      const chunkList = (res.data ?? []) as MatchRow[];
      if (chunkList.some((c) => typeof c.content === "string" && c.content.trim().length > 80)) {
        vectorListFull = chunkList;
        break;
      }
      vectorListFull = chunkList;
    }
    vectorListFull.sort((a, b) => {
      const tie = phraseScoreMarkdownBonus(b) - phraseScoreMarkdownBonus(a);
      if (tie !== 0) return tie;
      return (Number((b as MatchRow).similarity) || 0) - (Number((a as MatchRow).similarity) || 0);
    });
    if (rpcError) {
      console.error("[searchManualsSemanticAction] RPC", rpcError);
      if (phraseRowsForHits.length > 0) {
        const hits = phraseRowsForHits.map(rowToHit).filter((h) => h.content.trim().length > 0);
        const primaryText =
          usePhraseFocus && bestPhrase && typeof bestPhrase.r.content === "string"
            ? phrasePrimaryFromRow(bestPhrase.r)
            : hits.map((h) => h.content).join("\n\n— — —\n\n");
        return attachCompareToResult(
          { success: true, mode: "text-fallback", primaryText, hits, sourceFilter },
          phraseRowsRaw,
          vectorListFull,
          q
        );
      }
      return finishTextFallback(phraseRowsForHits);
    }
  } catch (e) {
    console.error("[searchManualsSemanticAction] embedding", e);
    if (phraseRowsForHits.length > 0 && usePhraseFocus && bestPhrase && typeof bestPhrase.r.content === "string") {
      const hits = phraseRowsForHits.map(rowToHit).filter((h) => h.content.trim().length > 0);
      return attachCompareToResult(
        {
          success: true,
          mode: "phrase-focus",
          primaryText: phrasePrimaryFromRow(bestPhrase.r),
          hits,
          sourceFilter,
        },
        phraseRowsRaw,
        vectorListFull,
        q
      );
    }
    return finishTextFallback(phraseRowsForHits);
  }

  const vectorListPrimary = vectorListFull.filter((r) => rowMatchesSourceFilter(r, sourceFilter));
  const vectorHits = vectorListPrimary.map(rowToHit).filter((h) => h.content.trim().length > 0);
  const phraseHits = phraseRowsForHits.map(rowToHit).filter((h) => h.content.trim().length > 0);

  const semanticTopRow: MatchRow | undefined =
    vectorListPrimary.find(
      (r) => !chunkDisqualifiedAsRuleVoice(typeof r.content === "string" ? r.content : "", q)
    ) ?? vectorListPrimary[0];

  if (usePhraseFocus && bestPhrase && typeof bestPhrase.r.content === "string") {
    const primaryText = phrasePrimaryFromRow(bestPhrase.r);
    const hits = mergeHitsUnique(phraseHits, vectorHits);
    return attachCompareToResult(
      { success: true, mode: "phrase-focus", primaryText, hits, sourceFilter },
      phraseRowsRaw,
      vectorListFull,
      q
    );
  }

  if (vectorHits.length === 0) {
    return finishTextFallback(phraseRowsForHits);
  }

  if (!semanticTopRow || typeof semanticTopRow.content !== "string") {
    return finishTextFallback(phraseRowsForHits);
  }

  const primaryText = phrasePrimaryFromRow(semanticTopRow);

  const hits = mergeHitsUnique(vectorHits, phraseHits);
  return attachCompareToResult(
    { success: true, mode: "semantic", primaryText, hits, sourceFilter },
    phraseRowsRaw,
    vectorListFull,
    q
  );
}
