"use server";

import { createHash } from "crypto";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { generateRagEmbedding } from "@/lib/ai/huggingface-client";

export type ManualSearchHit = {
  content: string;
  similarity: number | null;
  sectionTitle: string | null;
  sourceLabel: string | null;
  fileName: string | null;
  chunkIndex: number | null;
};

export type ManualSearchMode = "phrase-focus" | "semantic" | "text-fallback";

export type ManualSearchResult =
  | {
      success: true;
      mode: ManualSearchMode;
      primaryText: string;
      hits: ManualSearchHit[];
    }
  | { success: false; message: string };

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

function rowToHit(r: MatchRow): ManualSearchHit {
  const md = (r.metadata ?? null) as Record<string, unknown> | null;
  return {
    content: typeof r.content === "string" ? r.content : "",
    similarity: typeof r.similarity === "number" && Number.isFinite(r.similarity) ? r.similarity : null,
    sectionTitle: metaString(md, "section_title"),
    sourceLabel: metaString(md, "source"),
    fileName: metaString(md, "file_name"),
    chunkIndex: metaInt(md, "chunk_index"),
  };
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

/**
 * Punteggio più alto = chunk più adatto a essere la “voce regola” per la frase.
 * Rifiuta (null) se non contiene la frase normalizzata.
 */
function scoreChunkForPhrase(content: string, query: string): number | null {
  const c = normalizeForMatch(content);
  const p = normalizeForMatch(query.trim());
  if (p.length < 3 || !c.includes(p)) return null;

  const idx = c.indexOf(p);
  const freq = c.split(p).length - 1;
  const tablePenalty = countTableLikeLines(content, 45) * 18 + (isTableHeavyChunk(content) ? 120 : 0);

  let score = 2000 - tablePenalty;
  score -= Math.min(idx, 1800) * 0.12;
  if (idx < 200) score += 100;
  else if (idx < 550) score += 55;
  if (freq === 1 && content.length > 2200) score -= 35;
  if (freq >= 4 && isTableHeavyChunk(content)) score -= 80;

  const beforeWindow = content.slice(Math.max(0, idx - 200), idx);
  if (/\n\n\s*[A-ZÀ-Ö][A-ZÀ-Ö0-9 '\u2019\-]{5,55}\s*$/.test(beforeWindow)) {
    score += 40;
  }
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

function scoreOccurrenceWindow(content: string, idx: number): number {
  const winStart = Math.max(0, idx - 520);
  const win = content.slice(winStart, Math.min(content.length, idx + 420));
  let score = -countTableLikeLines(win, 55) * 22;
  const beforePhrase = content.slice(winStart, idx);
  if (/\n[!A-ZÀ-ÖI][!A-ZÀ-ÖI0-9 '\u2019·•\-]{4,58}\s*$/m.test(beforePhrase)) score += 95;
  const right = content.slice(idx, Math.min(content.length, idx + 200));
  if (/Un bardo può|Per farlo usa un['’]azione bonus/i.test(right)) score += 55;
  return score;
}

/** Risale poche righe sopra la frase per includere un titolo sezione (maiuscole / OCR ! al posto di I). */
function scanTitleLineStartAbove(content: string, idx: number, phrase: string): number | null {
  const p0 = normalizeForMatch(phrase.trim().split(/\s+/)[0] ?? "");
  if (p0.length < 3) return null;
  let pos = idx;
  for (let n = 0; n < 36; n++) {
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
    if (!ln.includes(p0)) {
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
    let best = rawCandidates[0];
    let bestScore = scoreOccurrenceWindow(content, best);
    for (let k = 1; k < rawCandidates.length; k++) {
      const c = rawCandidates[k];
      const s = scoreOccurrenceWindow(content, c);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    idx = best;
  }

  let start = idx;
  const paraBreak = content.lastIndexOf("\n\n", idx);
  if (paraBreak !== -1 && idx - paraBreak < 380) {
    const afterBreak = content.slice(paraBreak + 2, idx);
    const firstLine = afterBreak.split("\n")[0]?.trim() ?? "";
    if (firstLine.length >= 6 && firstLine.length <= 72) {
      start = paraBreak + 2;
    }
  } else {
    start = content.lastIndexOf("\n", idx - 1) + 1;
    if (start < 0) start = 0;
  }

  const titleLine = scanTitleLineStartAbove(content, idx, phrase);
  if (titleLine !== null && titleLine < start) start = titleLine;

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
  let out = content.slice(start, end).trim();
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

/** Ricerca sui manuali (admin): ibrido frase + semantica, estrazione blocco regola. */
export async function searchManualsSemanticAction(query: string): Promise<ManualSearchResult> {
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
  if (profile?.role !== "admin") {
    return { success: false, message: "Solo gli amministratori possono consultare la knowledge base manuali." };
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
      .limit(45);
    if (error) {
      console.error("[searchManualsSemanticAction] phrase ilike", error);
      return [];
    }
    return (rows ?? []) as MatchRow[];
  }

  async function textFallback(): Promise<ManualSearchResult> {
    const list = await fetchPhraseRows();
    const hits = list.map(rowToHit).filter((h) => h.content.trim().length > 0);
    if (hits.length === 0) {
      return { success: false, message: "Nessun passaggio trovato nei manuali per questa ricerca." };
    }
    const scored = list
      .map((r) => ({ r, s: scoreChunkForPhrase(typeof r.content === "string" ? r.content : "", q) }))
      .filter((x): x is { r: MatchRow; s: number } => x.s != null)
      .sort((a, b) => b.s - a.s);
    const bestRow = scored[0]?.r;
    const primaryText = bestRow && typeof bestRow.content === "string"
      ? extractRuleBlockAroundPhrase(bestRow.content, q)
      : hits
          .map((h) => h.content.trim())
          .filter(Boolean)
          .join("\n\n— — —\n\n");
    return { success: true, mode: "text-fallback", primaryText, hits };
  }

  const phraseRows = await fetchPhraseRows();
  const phraseScored = phraseRows
    .map((r) => ({
      r,
      s: scoreChunkForPhrase(typeof r.content === "string" ? r.content : "", q),
    }))
    .filter((x): x is { r: MatchRow; s: number } => x.s != null)
    .sort((a, b) => b.s - a.s);

  const bestPhrase = phraseScored[0];
  const phraseScoreFloor = 300;
  const usePhraseFocus = bestPhrase && bestPhrase.s >= phraseScoreFloor;

  let list: MatchRow[] = [];
  let rpcError: { message: string } | null = null;

  try {
    const embedding = await generateRagEmbedding(q);
    for (const threshold of [0.38, 0.3, 0.24, 0.18, 0.12]) {
      const res = await runRpc("match_manuals_knowledge", {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: 14,
      });
      rpcError = res.error;
      const chunkList = (res.data ?? []) as MatchRow[];
      if (chunkList.some((c) => typeof c.content === "string" && c.content.trim().length > 80)) {
        list = chunkList;
        break;
      }
      list = chunkList;
    }
    if (rpcError) {
      console.error("[searchManualsSemanticAction] RPC", rpcError);
      if (phraseRows.length > 0) {
        const hits = phraseRows.map(rowToHit).filter((h) => h.content.trim().length > 0);
        const primaryText =
          usePhraseFocus && bestPhrase
            ? extractRuleBlockAroundPhrase(String(bestPhrase.r.content), q)
            : hits.map((h) => h.content).join("\n\n— — —\n\n");
        return { success: true, mode: "text-fallback", primaryText, hits };
      }
      return textFallback();
    }
  } catch (e) {
    console.error("[searchManualsSemanticAction] embedding", e);
    if (phraseRows.length > 0 && usePhraseFocus && bestPhrase && typeof bestPhrase.r.content === "string") {
      const hits = phraseRows.map(rowToHit).filter((h) => h.content.trim().length > 0);
      return {
        success: true,
        mode: "phrase-focus",
        primaryText: extractRuleBlockAroundPhrase(bestPhrase.r.content, q),
        hits,
      };
    }
    return textFallback();
  }

  const vectorHits = list.map(rowToHit).filter((h) => h.content.trim().length > 0);
  const phraseHits = phraseRows.map(rowToHit).filter((h) => h.content.trim().length > 0);

  if (usePhraseFocus && bestPhrase && typeof bestPhrase.r.content === "string") {
    const primaryText = extractRuleBlockAroundPhrase(bestPhrase.r.content, q);
    const hits = mergeHitsUnique(phraseHits, vectorHits);
    return { success: true, mode: "phrase-focus", primaryText, hits };
  }

  if (vectorHits.length === 0) {
    return textFallback();
  }

  const best = vectorHits[0];
  const qn = normalizeForMatch(q);
  const bestContainsPhrase = normalizeForMatch(best.content).includes(qn);
  let primaryText = best.content.trim();

  if (
    best.fileName != null &&
    best.chunkIndex != null &&
    bestContainsPhrase &&
    !isTableHeavyChunk(best.content)
  ) {
    const { data: neighbors, error: nErr } = await runRpc("manuals_knowledge_neighbors", {
      p_file_name: best.fileName,
      p_center_index: best.chunkIndex,
      p_radius: 1,
    });
    if (!nErr && Array.isArray(neighbors) && neighbors.length > 0) {
      const parts = (neighbors as Array<{ content?: string }>)
        .map((n) => (typeof n.content === "string" ? n.content.trim() : ""))
        .filter(Boolean);
      if (parts.length > 0) {
        const stitched = parts.join("\n\n");
        if (normalizeForMatch(stitched).includes(qn)) {
          primaryText = extractRuleBlockAroundPhrase(stitched, q);
        }
      }
    }
  } else if (bestContainsPhrase && !isTableHeavyChunk(primaryText)) {
    primaryText = extractRuleBlockAroundPhrase(primaryText, q);
  }

  const hits = mergeHitsUnique(vectorHits, phraseHits);
  return { success: true, mode: "semantic", primaryText, hits };
}
