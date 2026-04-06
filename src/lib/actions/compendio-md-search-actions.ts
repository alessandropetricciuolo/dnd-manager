"use server";

import fs from "fs";
import path from "path";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import type { CompendioMdSearchResult } from "@/lib/manual-compendio-types";

const COMPENDIO_FILE_NAME = "dungeonedraghi_compendio.md";

function normalizeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/!/g, "i");
}

function resolveCompendioPath(): string | null {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, "public", "manuals", COMPENDIO_FILE_NAME),
    path.join(cwd, "dnd-manager", "public", "manuals", COMPENDIO_FILE_NAME),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/** Indici di inizio riga `## Titolo` (voce compendio API). */
function parseCompendioSectionStarts(lines: string[]): { title: string; lineIndex: number }[] {
  const out: { title: string; lineIndex: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (m) out.push({ title: m[1].trim(), lineIndex: i });
  }
  return out;
}

function extractSectionBody(lines: string[], sections: { title: string; lineIndex: number }[], at: number): string {
  let end = lines.length;
  for (const s of sections) {
    if (s.lineIndex > at) {
      end = s.lineIndex;
      break;
    }
  }
  return lines.slice(at, end).join("\n").trim();
}

/**
 * Ricerca testuale nel file `public/manuals/dungeonedraghi_compendio.md` (export API DD),
 * senza usare Supabase: abbina prima titoli `## Voce`, altrimenti estrae un estratto intorno alla frase.
 */
export async function searchCompendioMdAction(query: string): Promise<CompendioMdSearchResult> {
  const q = query.trim();
  if (q.length < 2) {
    return { success: false, message: "Inserisci almeno 2 caratteri." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return { success: false, message: "Devi essere autenticato." };
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "gm") {
    return { success: false, message: "Solo GM e amministratori possono usare questa ricerca." };
  }

  const filePath = resolveCompendioPath();
  if (!filePath) {
    return {
      success: false,
      message: `File non trovato: public/manuals/${COMPENDIO_FILE_NAME}`,
    };
  }

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return { success: false, message: "Impossibile leggere il file del compendio." };
  }

  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const sections = parseCompendioSectionStarts(lines);
  const qn = normalizeForMatch(q);

  let matchLine: number | null = null;
  let matchTitle: string | null = null;

  for (const s of sections) {
    const tn = normalizeForMatch(s.title);
    if (tn === qn) {
      matchLine = s.lineIndex;
      matchTitle = s.title;
      break;
    }
  }

  if (matchLine == null) {
    let bestLen = 0;
    for (const s of sections) {
      const tn = normalizeForMatch(s.title);
      if (tn.includes(qn) && qn.length >= 3) {
        if (qn.length >= bestLen) {
          bestLen = qn.length;
          matchLine = s.lineIndex;
          matchTitle = s.title;
        }
      }
    }
  }

  if (matchLine != null && matchTitle != null) {
    const body = extractSectionBody(lines, sections, matchLine);
    return {
      success: true,
      mode: "heading",
      sectionTitle: matchTitle,
      excerpt: body,
      fileName: COMPENDIO_FILE_NAME,
    };
  }

  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = esc.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { success: false, message: "Query non valida." };
  }
  const re = new RegExp(parts.join("\\s+"), "i");
  const m = re.exec(raw);
  if (!m) {
    return {
      success: false,
      message: `Nessun risultato in ${COMPENDIO_FILE_NAME} per questa ricerca.`,
    };
  }
  const rawStart = m.index;

  const padBefore = 500;
  const padAfter = 4500;
  const lo = Math.max(0, rawStart - padBefore);
  const hi = Math.min(raw.length, rawStart + q.length + padAfter);
  let excerpt = raw.slice(lo, hi).trim();
  if (lo > 0) excerpt = `…\n\n${excerpt}`;
  if (hi < raw.length) excerpt = `${excerpt}\n\n…`;

  return {
    success: true,
    mode: "phrase",
    sectionTitle: null,
    excerpt,
    fileName: COMPENDIO_FILE_NAME,
  };
}
