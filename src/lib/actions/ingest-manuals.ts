"use server";

import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateRagEmbedding } from "@/lib/ai/huggingface-client";
import {
  chunkMonsterManualByCreatureIndex,
  chunkMordenkainenMultiverseByCreatureIndex,
  normalizeManualSectionKey,
} from "@/lib/manuals/monster-manual-chunks";

type IngestResult =
  | { success: true; inserted: number; skipped: number; chunks: number }
  | { success: false; message: string };

type StructuredChunkKind = "prose" | "table";

type StructuredChunk = {
  content: string;
  chapter: string;
  sectionHeading: string;
  chunkType: StructuredChunkKind;
};

/** Una riga DB ≈ un `##` in MD; opzionale split se la sezione supera HARD_MAX. */
type MarkdownSectionUnitChunk = {
  content: string;
  chapter: string;
  sectionHeading: string;
  sectionKey: string;
  chunkType: "prose";
  sectionPart: number;
  sectionPartTotal: number;
};

function countTableLikeLines(text: string, maxLines = 40): number {
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

function isLikelyTableBlock(p: string): boolean {
  if (p.length > 12_000) return false;
  return countTableLikeLines(p, 35) >= 8;
}

function isChapterBlock(p: string): boolean {
  const t = p.trim().replace(/\s+/g, " ");
  if (t.length > 120) return false;
  if (/^capitolo\b/i.test(t)) return true;
  if (/^parte\s+\d+/i.test(t)) return true;
  if (/^appendice\b/i.test(t)) return true;
  return false;
}

function isSectionHeadingBlock(p: string): boolean {
  const t = p.trim();
  if (t.length < 5 || t.length > 92) return false;
  if (t.includes("\n")) return false;
  if (isChapterBlock(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 16) return false;
  const letters = t.replace(/[\s·•'’0-9]/g, "");
  if (letters.length < 4) return false;
  if (t.endsWith(".") && words.length > 8) return false;
  const upperCount = (t.match(/[A-ZÀ-Ö]/g) ?? []).length;
  const upperRatio = upperCount / letters.length;
  if (upperRatio >= 0.42 && words.length <= 14) return true;
  if (
    words.length <= 10 &&
    t.length <= 72 &&
    /^[A-ZÀ-Ö!]/.test(t) &&
    upperRatio >= 0.15 &&
    !t.includes(",") &&
    !t.endsWith(".")
  ) {
    return true;
  }
  if (/^\d+[.)]\s+\S/.test(t) && words.length <= 12) return true;
  return false;
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

/**
 * Segmentazione strutturata (v3): capitoli, titoli sezione, prose vs tabelle, tagli di lunghezza controllati.
 */
function chunkTextStructured(raw: string): StructuredChunk[] {
  const paragraphs = raw
    .replace(/\r/g, "")
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);

  let chapter = "Indice / Prefazione";
  let sectionHeading = "Inizio";
  const out: StructuredChunk[] = [];
  let bodyBuf: string[] = [];
  const TARGET = 900;
  const HARD_MAX = 1250;
  const MIN_PROSE = 85;
  const MIN_TABLE = 35;

  function flushProse() {
    if (bodyBuf.length === 0) return;
    const merged = bodyBuf.join("\n\n").trim();
    bodyBuf = [];
    if (merged.length < MIN_PROSE) return;
    for (const content of splitLongBody(merged, MIN_PROSE, TARGET, HARD_MAX)) {
      out.push({ content, chapter, sectionHeading, chunkType: "prose" });
    }
  }

  for (const p of paragraphs) {
    if (isChapterBlock(p)) {
      flushProse();
      chapter = p.replace(/\s+/g, " ").trim().slice(0, 200);
      sectionHeading = chapter;
      continue;
    }
    if (isLikelyTableBlock(p)) {
      flushProse();
      const tbl = p.trim();
      if (tbl.length >= MIN_TABLE) {
        out.push({ content: tbl, chapter, sectionHeading, chunkType: "table" });
      }
      continue;
    }
    if (isSectionHeadingBlock(p)) {
      flushProse();
      sectionHeading = p.slice(0, 200);
      continue;
    }

    const mergedPreview = bodyBuf.length ? `${bodyBuf.join("\n\n")}\n\n${p}` : p;
    if (mergedPreview.length <= TARGET) {
      bodyBuf.push(p);
      continue;
    }

    flushProse();
    if (p.length > HARD_MAX) {
      for (const piece of splitLongBody(p, MIN_PROSE, TARGET, HARD_MAX)) {
        out.push({ content: piece, chapter, sectionHeading, chunkType: "prose" });
      }
    } else {
      bodyBuf.push(p);
    }
  }

  flushProse();
  return out;
}

/** Rimuove immagini Markdown e semplifica link `[t](u)` → `t`. */
function stripMdLineArtifacts(s: string): string {
  let t = s.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return t.replace(/[ \t]+$/g, "").trimEnd();
}

/**
 * Segmentazione da Markdown ATX (# …): per blocco tra titoli, chapter = breadcrumb senza foglia,
 * sectionHeading = titolo della sezione corrente. Parallelo a v3 .txt, stesso schema StructuredChunk.
 */
function chunkMarkdownStructured(raw: string): StructuredChunk[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const stack: { level: number; text: string }[] = [];
  const bodyBuf: string[] = [];
  const out: StructuredChunk[] = [];
  const TARGET = 900;
  const HARD_MAX = 1250;
  const MIN_PROSE = 85;

  function flushBody() {
    const parts: string[] = [];
    for (const line of bodyBuf) {
      const cleaned = stripMdLineArtifacts(line);
      if (cleaned.trim().length > 0) parts.push(cleaned);
    }
    bodyBuf.length = 0;
    const text = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < MIN_PROSE) return;

    const sectionHeading =
      stack.length > 0 ? stack[stack.length - 1].text.slice(0, 200) : "Inizio";
    const chapter =
      stack.length >= 2
        ? stack
            .slice(0, -1)
            .map((s) => s.text)
            .join(" › ")
            .slice(0, 200)
        : (stack[0]?.text ?? "Manuale Markdown").slice(0, 200);

    for (const piece of splitLongBody(text, MIN_PROSE, TARGET, HARD_MAX)) {
      if (isLikelyTableBlock(piece)) {
        out.push({ content: piece.trim(), chapter, sectionHeading, chunkType: "table" });
      } else {
        out.push({ content: piece, chapter, sectionHeading, chunkType: "prose" });
      }
    }
  }

  const headingRe = /^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/;
  for (const line of lines) {
    const m = line.match(headingRe);
    if (m) {
      flushBody();
      const level = m[1].length;
      const title = m[2].trim().replace(/\s+#+\s*$/, "").trim();
      if (!title) continue;
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      stack.push({ level, text: title.slice(0, 200) });
      continue;
    }
    bodyBuf.push(line);
  }
  flushBody();
  return out;
}

const ATX_HEADING_RE = /^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/;

function parseAtxHeadingLine(line: string): { level: number; title: string } | null {
  const m = line.match(ATX_HEADING_RE);
  if (!m) return null;
  const title = m[2].trim().replace(/\s+#+\s*$/, "").trim();
  if (!title) return null;
  return { level: m[1].length, title: title.slice(0, 200) };
}

const V4_SECTION_MIN_CHARS = 40;
const V4_SECTION_HARD_MAX = 10_000;
const V4_SECTION_SPLIT_TARGET = 7500;

/**
 * Ingest v4-section: un chunk per ogni titolo `##` (livello 2). Pensato per manuali come `manuale_giocatore.md`
 * (`#` = capitolo, `##` = paragrafo, `###` = sottoparagrafo nel corpo). Il corpo include `###` … fino al prossimo `##` o `#`.
 * `chapter` = titolo dell’ultimo `#` sopra la sezione; `sectionKey` = slug del titolo `##`.
 */
function chunkMarkdownSectionUnits(raw: string): MarkdownSectionUnitChunk[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: MarkdownSectionUnitChunk[] = [];

  let i = 0;
  while (i < lines.length) {
    const h = parseAtxHeadingLine(lines[i]);
    if (!h || h.level !== 2) {
      i += 1;
      continue;
    }

    const sectionHeading = h.title;
    let j = i + 1;
    while (j < lines.length) {
      const hj = parseAtxHeadingLine(lines[j]);
      if (hj && hj.level <= 2) break;
      j += 1;
    }

    let h1Title = "Documento";
    for (let k = i - 1; k >= 0; k--) {
      const hk = parseAtxHeadingLine(lines[k]);
      if (hk && hk.level === 1) {
        h1Title = hk.title;
        break;
      }
    }

    const bodyLines = lines.slice(i + 1, j);
    const parts: string[] = [];
    for (const line of bodyLines) {
      const cleaned = stripMdLineArtifacts(line);
      if (cleaned.trim().length > 0) parts.push(cleaned);
    }
    const bodyRaw = parts.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    const sectionKey = normalizeManualSectionKey(sectionHeading);
    const fullBlock = `## ${sectionHeading}\n\n${bodyRaw}`.trim();

    if (fullBlock.length < V4_SECTION_MIN_CHARS) {
      i = j;
      continue;
    }

    if (fullBlock.length <= V4_SECTION_HARD_MAX) {
      out.push({
        content: fullBlock,
        chapter: h1Title,
        sectionHeading,
        sectionKey,
        chunkType: "prose",
        sectionPart: 1,
        sectionPartTotal: 1,
      });
    } else {
      const splitPieces = splitLongBody(
        fullBlock,
        Math.min(V4_SECTION_MIN_CHARS, 200),
        V4_SECTION_SPLIT_TARGET,
        V4_SECTION_HARD_MAX
      );
      const total = Math.max(1, splitPieces.length);
      splitPieces.forEach((piece, idx) => {
        const header =
          total === 1
            ? ""
            : `_(Sezione divisa: parte ${idx + 1} di ${total})_\n\n`;
        out.push({
          content: `${header}${piece}`.trim(),
          chapter: h1Title,
          sectionHeading,
          sectionKey,
          chunkType: "prose",
          sectionPart: idx + 1,
          sectionPartTotal: total,
        });
      });
    }

    i = j;
  }

  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Evita di ri-chunkare lo stesso file a ogni batch (processo Node unico su localhost / worker lungo). */
const structuredChunkCache = new Map<string, StructuredChunk[]>();

function getCachedStructuredChunks(filePath: string): StructuredChunk[] | null {
  try {
    const st = fs.statSync(filePath);
    const key = `${filePath}:${st.mtimeMs}:${st.size}`;
    const hit = structuredChunkCache.get(key);
    if (hit) return hit;
    const raw = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkTextStructured(raw);
    structuredChunkCache.set(key, chunks);
    // limite soft per memory leak in dev
    if (structuredChunkCache.size > 12) {
      const first = structuredChunkCache.keys().next().value;
      if (first) structuredChunkCache.delete(first);
    }
    return chunks;
  } catch {
    return null;
  }
}

const structuredMdChunkCache = new Map<string, StructuredChunk[]>();

function getCachedMdChunks(filePath: string): StructuredChunk[] | null {
  try {
    const st = fs.statSync(filePath);
    const key = `md:${filePath}:${st.mtimeMs}:${st.size}`;
    const hit = structuredMdChunkCache.get(key);
    if (hit) return hit;
    const raw = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkMarkdownStructured(raw);
    structuredMdChunkCache.set(key, chunks);
    if (structuredMdChunkCache.size > 12) {
      const first = structuredMdChunkCache.keys().next().value;
      if (first) structuredMdChunkCache.delete(first);
    }
    return chunks;
  } catch {
    return null;
  }
}

const structuredMdSectionChunkCache = new Map<string, MarkdownSectionUnitChunk[]>();

function getCachedMdSectionChunks(filePath: string): MarkdownSectionUnitChunk[] | null {
  try {
    const st = fs.statSync(filePath);
    const key = `md-v4:${filePath}:${st.mtimeMs}:${st.size}`;
    const hit = structuredMdSectionChunkCache.get(key);
    if (hit) return hit;
    const raw = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkMarkdownSectionUnits(raw);
    structuredMdSectionChunkCache.set(key, chunks);
    if (structuredMdSectionChunkCache.size > 12) {
      const first = structuredMdSectionChunkCache.keys().next().value;
      if (first) structuredMdSectionChunkCache.delete(first);
    }
    return chunks;
  } catch {
    return null;
  }
}

const structuredMmCreatureChunkCache = new Map<string, MarkdownSectionUnitChunk[]>();

function getCachedMmCreatureChunks(filePath: string): MarkdownSectionUnitChunk[] | null {
  try {
    const st = fs.statSync(filePath);
    const key = `md-mm:${filePath}:${st.mtimeMs}:${st.size}`;
    const hit = structuredMmCreatureChunkCache.get(key);
    if (hit) return hit;
    const raw = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkMonsterManualByCreatureIndex(raw) as MarkdownSectionUnitChunk[];
    structuredMmCreatureChunkCache.set(key, chunks);
    if (structuredMmCreatureChunkCache.size > 8) {
      const first = structuredMmCreatureChunkCache.keys().next().value;
      if (first) structuredMmCreatureChunkCache.delete(first);
    }
    return chunks;
  } catch {
    return null;
  }
}

const structuredMpmCreatureChunkCache = new Map<string, MarkdownSectionUnitChunk[]>();

function getCachedMpmCreatureChunks(filePath: string): MarkdownSectionUnitChunk[] | null {
  try {
    const st = fs.statSync(filePath);
    const key = `md-mpm:${filePath}:${st.mtimeMs}:${st.size}`;
    const hit = structuredMpmCreatureChunkCache.get(key);
    if (hit) return hit;
    const raw = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkMordenkainenMultiverseByCreatureIndex(raw) as MarkdownSectionUnitChunk[];
    structuredMpmCreatureChunkCache.set(key, chunks);
    if (structuredMpmCreatureChunkCache.size > 8) {
      const first = structuredMpmCreatureChunkCache.keys().next().value;
      if (first) structuredMpmCreatureChunkCache.delete(first);
    }
    return chunks;
  } catch {
    return null;
  }
}

function getManualsTxtDir(): string | null {
  const cwd = process.cwd();
  const manualDirs = [
    path.join(cwd, "public", "manuals"),
    path.join(cwd, "dnd-manager", "public", "manuals"),
  ];
  return manualDirs.find((d) => fs.existsSync(d)) ?? null;
}

/** Elenco file `.txt` in `public/manuals` (per UI progress ingest). Solo admin. */
export async function listManualTxtFilesAction(): Promise<
  { success: true; files: string[] } | { success: false; message: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { success: false, message: "Devi essere autenticato." };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role?: string } | null)?.role !== "admin") {
    return { success: false, message: "Solo gli amministratori possono eseguire l’ingest." };
  }

  const dir = getManualsTxtDir();
  if (!dir) {
    return { success: false, message: "Cartella manuals non trovata." };
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".txt"))
    .sort((a, b) => a.localeCompare(b, "it"));
  return { success: true, files };
}

/** Elenco file `.md` in `public/manuals`. Solo admin. */
export async function listManualMdFilesAction(): Promise<
  { success: true; files: string[] } | { success: false; message: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { success: false, message: "Devi essere autenticato." };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role?: string } | null)?.role !== "admin") {
    return { success: false, message: "Solo gli amministratori possono eseguire l’ingest." };
  }

  const dir = getManualsTxtDir();
  if (!dir) {
    return { success: false, message: "Cartella manuals non trovata." };
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "it"));
  return { success: true, files };
}

function resolveManualAbsolutePath(fileName: string): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "manuals", fileName),
    path.join(cwd, "dnd-manager", "public", "manuals", fileName),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Prefisso in `content` + embedding per manuali supplement (oltre a `metadata.manual_book_key` / `rules_origin`).
 * Chiave = `manual_book_key`.
 */
const SUPPLEMENT_CONTENT_BANNERS: Record<string, string> = {
  eberron:
    "> **Tag — Eberron** (*Rinascita dopo l'Ultima Guerra*). Espansione di ambientazione: razze, classi, marchi del drago e altre regole che **integrano o sostituiscono** il Manuale del Giocatore solo ove esplicitamente indicato.",
  tasha:
    "> **Tag — Tasha** (*Calderone omnicomprensivo di Tasha*). Regole e opzioni di espansione (classi, incantesimi, oggetti, consigli al DM…) che **integrano o sostituiscono** il Manuale del Giocatore solo ove indicato come opzionale.",
  xanathar:
    "> **Tag — Xanathar** (*Guida omnicomprensiva di Xanathar*). Supplemento con regole **facoltative** per giocatori e Dungeon Master (sottoclassi, incantesimi, strumenti al DM…); applicare solo se il gruppo le adotta.",
};

function applySupplementContentBanner(meta: Record<string, unknown>, rawContent: string): string {
  const body = typeof rawContent === "string" ? rawContent : String(rawContent ?? "");
  const book = meta.manual_book_key;
  if (typeof book === "string" && SUPPLEMENT_CONTENT_BANNERS[book]) {
    return `${SUPPLEMENT_CONTENT_BANNERS[book]}\n\n${body}`.trim();
  }
  return body;
}

async function assertAdminForIngest(): Promise<
  { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> } | { ok: false; message: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { ok: false, message: "Devi essere autenticato." };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as { role?: string } | null)?.role !== "admin") {
    return { ok: false, message: "Solo gli amministratori possono eseguire l’ingest." };
  }
  return { ok: true, supabase };
}

const MAX_BATCH = 32;

export type IngestManualBatchResult =
  | {
      success: true;
      inserted: number;
      skipped: number;
      totalChunks: number;
      nextIndex: number;
      done: boolean;
    }
  | { success: false; message: string };

/**
 * Elabora un intervallo di chunk (embedding + insert). Richiamare dal client in loop per aggiornare la progress UI.
 * Rilegge e re-chunka il file a ogni batch (semplice e sicuro su serverless; costo CPU chunking trascurabile vs embedding).
 */
export async function ingestTxtManualBatchAction(
  fileName: string,
  metadata: unknown,
  startChunkIndex: number,
  batchSize: number
): Promise<IngestManualBatchResult> {
  const normalized = fileName.trim();
  if (!normalized.toLowerCase().endsWith(".txt")) {
    return { success: false, message: "Solo file .txt supportati." };
  }
  const start = Math.max(0, Math.floor(startChunkIndex));
  const rawSize = Math.max(1, Math.min(MAX_BATCH, Math.floor(batchSize)));

  const gate = await assertAdminForIngest();
  if (!gate.ok) return { success: false, message: gate.message };
  const supabase = gate.supabase;

  try {
    const filePath = resolveManualAbsolutePath(normalized);
    if (!filePath) {
      return {
        success: false,
        message: `File non trovato: public/manuals/${normalized}`,
      };
    }
    const chunks = getCachedStructuredChunks(filePath);
    if (!chunks || !chunks.length) {
      return { success: false, message: "Il file è vuoto o non contiene chunk validi." };
    }
    if (start >= chunks.length) {
      return {
        success: true,
        inserted: 0,
        skipped: 0,
        totalChunks: chunks.length,
        nextIndex: chunks.length,
        done: true,
      };
    }

    const end = Math.min(chunks.length, start + rawSize);
    let inserted = 0;
    let skipped = 0;

    for (let i = start; i < end; i++) {
      const item = chunks[i];
      const content = item.content;
      const contentHash = createHash("md5").update(content).digest("hex");
      const embedding = await generateRagEmbedding(content);
      const rowMetadata = {
        ...(metadata && typeof metadata === "object" ? metadata : {}),
        file_name: normalized,
        chapter: item.chapter,
        section_heading: item.sectionHeading,
        section_title: item.sectionHeading,
        chunk_type: item.chunkType,
        chunk_index: i,
        chunk_count: chunks.length,
        ingestion_version: "v3-structured",
      };

      const { error } = await supabase.from("manuals_knowledge").insert({
        content,
        content_hash: contentHash,
        metadata: rowMetadata,
        embedding,
      });

      if (error) {
        if ((error as { code?: string } | null)?.code === "23505") {
          skipped += 1;
          continue;
        }
        throw new Error(`Insert manuals_knowledge fallito (chunk ${i + 1}): ${error.message}`);
      }

      inserted += 1;
      await sleep(120);
    }

    const nextIndex = end;
    return {
      success: true,
      inserted,
      skipped,
      totalChunks: chunks.length,
      nextIndex,
      done: nextIndex >= chunks.length,
    };
  } catch (error) {
    console.error("Errore ingestion batch:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Errore imprevisto durante ingestion.",
    };
  }
}

/** Come {@link ingestTxtManualBatchAction} ma per `.md` (chunk da titoli ATX). */
async function ingestMdManualBatchActionImpl(
  fileName: string,
  metadata: unknown,
  startChunkIndex: number,
  batchSize: number
): Promise<IngestManualBatchResult> {
  const normalized = fileName.trim();
  if (!normalized.toLowerCase().endsWith(".md")) {
    return { success: false, message: "Solo file .md supportati." };
  }
  const start = Math.max(0, Math.floor(startChunkIndex));
  const rawSize = Math.max(1, Math.min(MAX_BATCH, Math.floor(batchSize)));

  const gate = await assertAdminForIngest();
  if (!gate.ok) return { success: false, message: gate.message };
  const supabase = gate.supabase;

  const baseMeta =
    metadata && typeof metadata === "object" && metadata !== null && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const ingestProfileRaw = baseMeta.ingest_profile;
  const ingestProfile =
    ingestProfileRaw === "v4-section"
      ? "v4-section"
      : ingestProfileRaw === "v4-monster-manual"
        ? "v4-monster-manual"
        : ingestProfileRaw === "v4-mordenkainen-multiverse"
          ? "v4-mordenkainen-multiverse"
          : "v3-markdown";
  delete baseMeta.ingest_profile;

  try {
    const filePath = resolveManualAbsolutePath(normalized);
    if (!filePath) {
      return {
        success: false,
        message: `File non trovato: public/manuals/${normalized}`,
      };
    }

    const chunksV3 =
      ingestProfile === "v3-markdown" ? getCachedMdChunks(filePath) : null;
    const chunksV4Section =
      ingestProfile === "v4-section" ? getCachedMdSectionChunks(filePath) : null;
    const chunksMm =
      ingestProfile === "v4-monster-manual" ? getCachedMmCreatureChunks(filePath) : null;
    const chunksMpm =
      ingestProfile === "v4-mordenkainen-multiverse"
        ? getCachedMpmCreatureChunks(filePath)
        : null;

    const chunks = (chunksV4Section ?? chunksMm ?? chunksMpm ?? chunksV3) as
      | StructuredChunk[]
      | MarkdownSectionUnitChunk[]
      | null;

    if (!chunks || !chunks.length) {
      return {
        success: false,
        message:
          ingestProfile === "v4-section"
            ? "Il file .md non contiene sezioni ## utili (v4-section) o è vuoto."
            : ingestProfile === "v4-monster-manual"
              ? "Manuale Mostri: indice non trovato o file non valido per v4-monster-manual."
              : ingestProfile === "v4-mordenkainen-multiverse"
                ? "Mostri del Multiverso: indice non trovato o file non valido per v4-mordenkainen-multiverse."
                : "Il file .md è vuoto o non contiene chunk validi.",
      };
    }
    if (start >= chunks.length) {
      return {
        success: true,
        inserted: 0,
        skipped: 0,
        totalChunks: chunks.length,
        nextIndex: chunks.length,
        done: true,
      };
    }

    const end = Math.min(chunks.length, start + rawSize);
    let inserted = 0;
    let skipped = 0;

    for (let i = start; i < end; i++) {
      const item = chunks[i];
      const rawBody =
        typeof item.content === "string" ? item.content : String(item.content ?? "");
      const content = applySupplementContentBanner(baseMeta, rawBody);
      const contentHash = createHash("md5").update(content).digest("hex");
      const embedding = await generateRagEmbedding(content);

      const rowMetadata =
        ingestProfile === "v4-section"
          ? {
              ...baseMeta,
              file_name: normalized,
              chapter: (item as MarkdownSectionUnitChunk).chapter,
              section_heading: (item as MarkdownSectionUnitChunk).sectionHeading,
              section_title: (item as MarkdownSectionUnitChunk).sectionHeading,
              section_key: (item as MarkdownSectionUnitChunk).sectionKey,
              chunk_type: (item as MarkdownSectionUnitChunk).chunkType,
              chunk_index: i,
              chunk_count: chunks.length,
              ingestion_version: "v4-section",
              source_format: "markdown",
              leaf_level: 2,
              section_part: (item as MarkdownSectionUnitChunk).sectionPart,
              section_part_total: (item as MarkdownSectionUnitChunk).sectionPartTotal,
            }
          : ingestProfile === "v4-monster-manual"
            ? {
                ...baseMeta,
                file_name: normalized,
                chapter: (item as MarkdownSectionUnitChunk).chapter,
                section_heading: (item as MarkdownSectionUnitChunk).sectionHeading,
                section_title: (item as MarkdownSectionUnitChunk).sectionHeading,
                section_key: (item as MarkdownSectionUnitChunk).sectionKey,
                chunk_type: (item as MarkdownSectionUnitChunk).chunkType,
                chunk_index: i,
                chunk_count: chunks.length,
                ingestion_version: "v4-monster-manual",
                source_format: "markdown",
                leaf_level: "creature_index",
                section_part: (item as MarkdownSectionUnitChunk).sectionPart,
                section_part_total: (item as MarkdownSectionUnitChunk).sectionPartTotal,
              }
            : ingestProfile === "v4-mordenkainen-multiverse"
              ? {
                  ...baseMeta,
                  file_name: normalized,
                  chapter: (item as MarkdownSectionUnitChunk).chapter,
                  section_heading: (item as MarkdownSectionUnitChunk).sectionHeading,
                  section_title: (item as MarkdownSectionUnitChunk).sectionHeading,
                  section_key: (item as MarkdownSectionUnitChunk).sectionKey,
                  chunk_type: (item as MarkdownSectionUnitChunk).chunkType,
                  chunk_index: i,
                  chunk_count: chunks.length,
                  ingestion_version: "v4-mordenkainen-multiverse",
                  source_format: "markdown",
                  leaf_level: "creature_index_mpm",
                  section_part: (item as MarkdownSectionUnitChunk).sectionPart,
                  section_part_total: (item as MarkdownSectionUnitChunk).sectionPartTotal,
                }
              : {
                  ...baseMeta,
                  file_name: normalized,
                  chapter: (item as StructuredChunk).chapter,
                  section_heading: (item as StructuredChunk).sectionHeading,
                  section_title: (item as StructuredChunk).sectionHeading,
                  chunk_type: (item as StructuredChunk).chunkType,
                  chunk_index: i,
                  chunk_count: chunks.length,
                  ingestion_version: "v3-markdown",
                  source_format: "markdown",
                };

      const { error } = await supabase.from("manuals_knowledge").insert({
        content,
        content_hash: contentHash,
        metadata: rowMetadata,
        embedding,
      });

      if (error) {
        if ((error as { code?: string } | null)?.code === "23505") {
          skipped += 1;
          continue;
        }
        throw new Error(`Insert manuals_knowledge fallito (chunk ${i + 1}): ${error.message}`);
      }

      inserted += 1;
      await sleep(120);
    }

    const nextIndex = end;
    return {
      success: true,
      inserted,
      skipped,
      totalChunks: chunks.length,
      nextIndex,
      done: nextIndex >= chunks.length,
    };
  } catch (error) {
    console.error("Errore ingestion MD batch:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Errore imprevisto durante ingestion.",
    };
  }
}

/**
 * Wrapper: garantisce oggetto JSON-serializzabile (Next.js Server Actions altrimenti può deserializzare `undefined`).
 */
export async function ingestMdManualBatchAction(
  fileName: string,
  metadata: unknown,
  startChunkIndex: number,
  batchSize: number
): Promise<IngestManualBatchResult> {
  try {
    const r = await ingestMdManualBatchActionImpl(
      fileName,
      metadata,
      startChunkIndex,
      batchSize
    );
    if (r == null || typeof r !== "object" || typeof r.success !== "boolean") {
      return {
        success: false,
        message:
          "Risposta ingest MD non valida. Riavvia `npm run dev` se il problema persiste (Server Actions).",
      };
    }
    return JSON.parse(JSON.stringify(r)) as IngestManualBatchResult;
  } catch (e) {
    console.error("[ingestMdManualBatchAction] wrapper", e);
    return {
      success: false,
      message: e instanceof Error ? e.message : "Errore imprevisto durante ingestion MD.",
    };
  }
}

export async function ingestTxtManualAction(
  fileName: string,
  metadata: any
): Promise<IngestResult> {
  console.log("Inizio elaborazione file:", fileName);
  const normalized = fileName.trim();
  if (!normalized.toLowerCase().endsWith(".txt")) {
    return { success: false, message: "Solo file .txt supportati." };
  }

  try {
    const gate = await assertAdminForIngest();
    if (!gate.ok) return { success: false, message: gate.message };
    const supabase = gate.supabase;

    const filePath = resolveManualAbsolutePath(normalized);
    console.log("Cerco il file al percorso assoluto:", filePath ?? "non trovato");
    if (!filePath) {
      return {
        success: false,
        message: `File non trovato: public/manuals/${normalized} (né in ./dnd-manager/public/manuals/${normalized})`,
      };
    }
    const chunks = getCachedStructuredChunks(filePath);
    if (!chunks || !chunks.length) {
      return { success: false, message: "Il file è vuoto o non contiene chunk validi." };
    }
    console.log("Chunk creati (v3 strutturati):", chunks.length);

    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < chunks.length; i++) {
      const item = chunks[i];
      const content = item.content;
      const contentHash = createHash("md5").update(content).digest("hex");
      const embedding = await generateRagEmbedding(content);
      const rowMetadata = {
        ...(metadata && typeof metadata === "object" ? metadata : {}),
        file_name: normalized,
        chapter: item.chapter,
        section_heading: item.sectionHeading,
        section_title: item.sectionHeading,
        chunk_type: item.chunkType,
        chunk_index: i,
        chunk_count: chunks.length,
        ingestion_version: "v3-structured",
      };

      const { error } = await supabase.from("manuals_knowledge").insert({
        content,
        content_hash: contentHash,
        metadata: rowMetadata,
        embedding,
      });

      if (error) {
        if ((error as { code?: string } | null)?.code === "23505") {
          skipped += 1;
          continue;
        }
        throw new Error(`Insert manuals_knowledge fallito (chunk ${i + 1}): ${error.message}`);
      }

      inserted += 1;
      await sleep(120);
    }

    return { success: true, inserted, skipped, chunks: chunks.length };
  } catch (error) {
    console.error("Errore ingestion:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Errore imprevisto durante ingestion.",
    };
  }
}

export async function ingestAllTxtManualsAction(
  baseMetadata?: Record<string, unknown>
): Promise<
  | { success: true; files: number; inserted: number; skipped: number; chunks: number }
  | { success: false; message: string }
> {
  const existingDir = getManualsTxtDir();
  if (!existingDir) {
    return { success: false, message: "Cartella manuals non trovata." };
  }

  const files = fs
    .readdirSync(existingDir)
    .filter((f) => f.toLowerCase().endsWith(".txt"))
    .sort((a, b) => a.localeCompare(b, "it"));

  if (files.length === 0) {
    return { success: false, message: "Nessun file .txt nella cartella manuals." };
  }

  let inserted = 0;
  let skipped = 0;
  let chunks = 0;

  for (const file of files) {
    const result = await ingestTxtManualAction(file, {
      ...(baseMetadata ?? {}),
      source: file.replace(/\.txt$/i, ""),
    });
    if (!result.success) {
      return { success: false, message: `Errore su ${file}: ${result.message}` };
    }
    inserted += result.inserted;
    skipped += result.skipped;
    chunks += result.chunks;
  }

  return { success: true, files: files.length, inserted, skipped, chunks };
}
