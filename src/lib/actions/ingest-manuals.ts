"use server";

import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateRagEmbedding } from "@/lib/ai/huggingface-client";

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
