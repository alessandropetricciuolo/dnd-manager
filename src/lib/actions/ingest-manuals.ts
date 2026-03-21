"use server";

import fs from "fs";
import path from "path";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateEmbedding } from "@/lib/ai/huggingface-client";

type IngestResult =
  | { success: true; inserted: number; chunks: number }
  | { success: false; message: string };

function chunkTextByParagraphs(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/g)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if (!current) {
      current = p;
      continue;
    }
    if (current.length < 500) {
      const candidate = `${current}\n\n${p}`;
      if (candidate.length <= 1000) {
        current = candidate;
      } else {
        chunks.push(current);
        current = p;
      }
      continue;
    }
    chunks.push(current);
    current = p;
  }

  if (current) chunks.push(current);

  return chunks
    .map((c) => c.trim())
    .filter(Boolean)
    .flatMap((c) => {
      if (c.length <= 1400) return [c];
      // Split di sicurezza per paragrafi troppo lunghi senza ritorni.
      const out: string[] = [];
      let rest = c;
      while (rest.length > 1400) {
        out.push(rest.slice(0, 1200).trim());
        rest = rest.slice(1200).trim();
      }
      if (rest) out.push(rest);
      return out;
    });
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
    const chunks = chunkTextByParagraphs(raw);
    console.log("Chunk creati:", chunks.length);
    if (!chunks.length) {
      return { success: false, message: "Il file è vuoto o non contiene chunk validi." };
    }

    const supabase = await createSupabaseServerClient();
    let inserted = 0;

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const embedding = await generateEmbedding(content);
      const rowMetadata = {
        ...(metadata && typeof metadata === "object" ? metadata : {}),
        file_name: normalized,
        chunk_index: i,
        chunk_count: chunks.length,
      };

      const { error } = await supabase.from("manuals_knowledge").insert({
        content,
        metadata: rowMetadata,
        embedding,
      });

      if (error) {
        throw new Error(`Insert manuals_knowledge fallito (chunk ${i + 1}): ${error.message}`);
      }

      inserted += 1;
      await sleep(200);
    }

    return { success: true, inserted, chunks: chunks.length };
  } catch (error) {
    console.error("Errore ingestion:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Errore imprevisto durante ingestion.",
    };
  }
}
