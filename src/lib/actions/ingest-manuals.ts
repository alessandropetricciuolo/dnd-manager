"use server";

import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateRagEmbedding } from "@/lib/ai/huggingface-client";

type IngestResult =
  | { success: true; inserted: number; skipped: number; chunks: number }
  | { success: false; message: string };

type ChunkItem = {
  sectionTitle: string;
  content: string;
};

function normalizeParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/g)
    .map((p) => p.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

function looksLikeHeading(paragraph: string): boolean {
  const p = paragraph.trim();
  if (!p) return false;
  if (p.length > 110) return false;
  const digitsAndPunct = p.replace(/[A-Za-zÀ-ÖØ-öø-ÿ\s]/g, "");
  const words = p.split(/\s+/).length;
  const upperRatio = (p.match(/[A-ZÀ-ÖØ-Þ]/g)?.length ?? 0) / Math.max(1, p.replace(/\s/g, "").length);
  return (
    /^capitolo\b/i.test(p) ||
    /^chapter\b/i.test(p) ||
    /^\d+([.)]\d+)*\s+/.test(p) ||
    (words <= 12 && upperRatio > 0.45 && digitsAndPunct.length < 8)
  );
}

function chunkTextSemantically(text: string): ChunkItem[] {
  const paragraphs = normalizeParagraphs(text);
  const TARGET = 1200;
  const MAX = 1550;
  const OVERLAP = 180;

  const out: ChunkItem[] = [];
  let sectionTitle = "Sezione";
  let current = "";

  function flush() {
    const trimmed = current.trim();
    if (!trimmed) return;
    out.push({ sectionTitle, content: trimmed });
    const overlap = trimmed.slice(Math.max(0, trimmed.length - OVERLAP)).trim();
    current = overlap;
  }

  for (const p of paragraphs) {
    if (looksLikeHeading(p)) {
      sectionTitle = p.slice(0, 140);
      continue;
    }
    if (!current) {
      current = p;
      continue;
    }
    const candidate = `${current}\n\n${p}`;
    if (candidate.length <= TARGET) {
      current = candidate;
      continue;
    }
    flush();
    current = current ? `${current}\n\n${p}` : p;
    if (current.length > MAX) {
      out.push({ sectionTitle, content: current.slice(0, MAX).trim() });
      current = current.slice(MAX - OVERLAP).trim();
    }
  }

  if (current.trim()) {
    out.push({ sectionTitle, content: current.trim() });
  }

  return out.filter((c) => c.content.length >= 120);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const filePath = resolveManualAbsolutePath(normalized);
    console.log("Cerco il file al percorso assoluto:", filePath ?? "non trovato");
    if (!filePath) {
      return {
        success: false,
        message: `File non trovato: public/manuals/${normalized} (né in ./dnd-manager/public/manuals/${normalized})`,
      };
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkTextSemantically(raw);
    console.log("Chunk creati:", chunks.length);
    if (!chunks.length) {
      return { success: false, message: "Il file è vuoto o non contiene chunk validi." };
    }

    const supabase = await createSupabaseServerClient();
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
        section_title: item.sectionTitle,
        chunk_index: i,
        chunk_count: chunks.length,
        ingestion_version: "v2-semantic",
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
  const cwd = process.cwd();
  const manualDirs = [
    path.join(cwd, "public", "manuals"),
    path.join(cwd, "dnd-manager", "public", "manuals"),
  ];
  const existingDir = manualDirs.find((d) => fs.existsSync(d));
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
