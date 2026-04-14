"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";
import { generateRagEmbedding } from "@/lib/ai/huggingface-client";
import { readExcludedManualBookKeysFromAiContextJson } from "@/lib/campaign-ai-context";
import { wikiManualBookLabel } from "@/lib/manual-book-catalog";

const BESTIARY_ALLOWED_BOOK_KEYS = ["monster_manual", "mordenkainen_multiverse"] as const;
const BESTIARY_ALLOWED_BOOK_KEY_SET = new Set<string>(BESTIARY_ALLOWED_BOOK_KEYS);

export type BestiarySearchHit = {
  id: string;
  similarity: number | null;
  excerpt: string;
  manual_book_key: string | null;
  manual_label: string;
  chapter: string | null;
  section_heading: string | null;
};

type Row = {
  id: string | number;
  content: string | null;
  metadata: Record<string, unknown> | null;
  similarity?: number | null;
};

function metaStr(m: Record<string, unknown> | null | undefined, k: string): string | null {
  if (!m || typeof m !== "object" || Array.isArray(m) || !(k in m)) return null;
  const v = m[k];
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}

function filterExcludedRows(rows: Row[], excluded: string[]): Row[] {
  if (!excluded.length) return rows;
  const ex = new Set(excluded);
  return rows.filter((r) => {
    const k = metaStr(r.metadata, "manual_book_key");
    if (k == null) return true;
    return !ex.has(k);
  });
}

function filterAllowedBestiaryRows(rows: Row[]): Row[] {
  return rows.filter((r) => {
    const k = metaStr(r.metadata, "manual_book_key");
    if (!k) return false;
    return BESTIARY_ALLOWED_BOOK_KEY_SET.has(k);
  });
}

function excerptFromContent(s: string, max = 220): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

function rowsToBestiaryHits(rows: Row[]): BestiarySearchHit[] {
  const seen = new Set<string>();
  const hits: BestiarySearchHit[] = [];
  for (const r of rows) {
    const rowId = String(r.id ?? "").trim();
    const content = typeof r.content === "string" ? r.content.trim() : "";
    if (!content || !rowId) continue;
    if (seen.has(rowId)) continue;
    seen.add(rowId);
    const m = r.metadata;
    const mbk = metaStr(m, "manual_book_key");
    hits.push({
      id: rowId,
      similarity: typeof r.similarity === "number" ? r.similarity : null,
      excerpt: excerptFromContent(content),
      manual_book_key: mbk,
      manual_label: mbk ? wikiManualBookLabel(mbk) : "Manuale (non classificato)",
      chapter: metaStr(m, "chapter"),
      section_heading: metaStr(m, "section_heading") ?? metaStr(m, "section_title"),
    });
    if (hits.length >= 16) break;
  }
  return hits;
}

function rankBestiaryRows(rows: Row[], query: string): Row[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;

  const headingH2 = `## ${q}`;
  const headingH1 = `# ${q}`;
  const statblockHints = ["**classe armatura**", "**punti ferita**", "**sfida**", "### azioni"];

  const scored = rows.map((r, idx) => {
    const content = typeof r.content === "string" ? r.content.toLowerCase() : "";
    const sectionHeading = (metaStr(r.metadata, "section_heading") ?? metaStr(r.metadata, "section_title") ?? "")
      .trim()
      .toLowerCase();
    const chapter = (metaStr(r.metadata, "chapter") ?? "").trim().toLowerCase();

    let score = 0;
    const sim = typeof r.similarity === "number" ? r.similarity : 0;
    score += sim * 100;

    if (sectionHeading === q) score += 1200;
    if (sectionHeading.includes(q)) score += 500;
    if (chapter === q) score += 500;

    if (content.includes(headingH2)) score += 1600;
    if (content.includes(headingH1)) score += 1200;

    const qIdx = content.indexOf(q);
    if (qIdx >= 0) {
      score += 280;
      score += Math.max(0, 200 - Math.floor(qIdx / 8));
    }

    for (const hint of statblockHints) {
      if (content.includes(hint)) score += 180;
    }

    return { r, idx, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx;
  });
  return scored.map((x) => x.r);
}

function normalizeLoose(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isExactMonsterHeadingRow(row: Row, query: string): boolean {
  const q = normalizeLoose(query);
  if (!q) return false;
  const sectionHeading = normalizeLoose(
    metaStr(row.metadata, "section_heading") ?? metaStr(row.metadata, "section_title") ?? ""
  );
  const chapter = normalizeLoose(metaStr(row.metadata, "chapter") ?? "");
  if (sectionHeading === q || chapter === q) return true;
  const content = typeof row.content === "string" ? normalizeLoose(row.content) : "";
  return content.includes(`## ${q}`) || content.includes(`# ${q}`);
}

function convertFirstHtmlTableToMarkdown(input: string): string {
  const tableMatch = input.match(/<table[\s\S]*?<\/table>/i);
  if (!tableMatch) return input;
  const tableHtml = tableMatch[0];
  const rowMatches = Array.from(tableHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/gi));
  if (rowMatches.length === 0) return input;

  const rows: string[][] = [];
  for (const row of rowMatches) {
    const cells = Array.from(row[1].matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/gi)).map((m) =>
      m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
    );
    if (cells.length > 0) rows.push(cells);
  }
  if (rows.length < 2) return input;

  const header = rows[0];
  const body = rows.slice(1).filter((r) => r.length === header.length);
  if (body.length === 0) return input;

  const mdLines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ];
  return input.replace(tableHtml, mdLines.join("\n"));
}

function sanitizeBestiaryStatblock(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return text;

  text = convertFirstHtmlTableToMarkdown(text);

  const lines = text.split("\n");
  const classArmorIdx = lines.findIndex((l) => /\*\*Classe Armatura\*\*/i.test(l));
  if (classArmorIdx > 0) {
    let start = 0;
    for (let i = classArmorIdx; i >= 0; i--) {
      if (/^\s{0,3}#{1,3}\s+/.test(lines[i])) {
        start = i;
        break;
      }
    }
    lines.splice(0, start);
  }

  const cleaned = lines
    .filter((line) => {
      const t = line.trim();
      if (!t) return true;
      if (/^\d+\s+[A-ZÀ-ÖØ-Ý][A-ZÀ-ÖØ-Ý'’ .-]*$/.test(t)) return false;
      if (/^!\[.*\]\(.*\)$/.test(t)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

async function assertGmOrAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return false;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "gm" || profile?.role === "admin";
}

/**
 * Ricerca semantica su `manuals_knowledge` per nominare un mostro nel flusso wiki AI (filtra manuali esclusi nei paletti campagna).
 */
export async function searchBestiaryChunksAction(
  campaignId: string,
  query: string
): Promise<{ success: true; hits: BestiarySearchHit[] } | { success: false; message: string }> {
  const q = query.trim();
  if (q.length < 2) {
    return { success: false, message: "Inserisci almeno 2 caratteri." };
  }
  if (!(await assertGmOrAdmin())) {
    return { success: false, message: "Solo GM e admin possono cercare nel bestiario." };
  }

  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) return { success: false, message: "Non autenticato." };
  const { data: canRow } = await supabaseUser
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!canRow) return { success: false, message: "Campagna non trovata o non accessibile." };

  const admin = createSupabaseAdminClient();
  const { data: camp } = await admin.from("campaigns").select("ai_context").eq("id", campaignId).single();
  const excluded = readExcludedManualBookKeysFromAiContextJson(
    ((camp as { ai_context?: Json | null } | null)?.ai_context ?? null) as Json | null
  );

  const runRpc = admin.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;

  async function findExactHeadingRows(): Promise<Row[]> {
    const safe = escapeLikePattern(q);
    const headingH2Pattern = `%## ${safe}%`;
    const headingH1Pattern = `%# ${safe}%`;
    const genericPattern = `%${safe}%`;

    const byH2 = await admin
      .from("manuals_knowledge")
      .select("id, content, metadata")
      .ilike("content", headingH2Pattern)
      .limit(24);
    const byH1 = await admin
      .from("manuals_knowledge")
      .select("id, content, metadata")
      .ilike("content", headingH1Pattern)
      .limit(24);
    const byGeneric = await admin
      .from("manuals_knowledge")
      .select("id, content, metadata")
      .ilike("content", genericPattern)
      .limit(32);
    const merged = [
      ...((byH2.data ?? []) as Row[]),
      ...((byH1.data ?? []) as Row[]),
      ...((byGeneric.data ?? []) as Row[]),
    ];
    const filtered = filterExcludedRows(filterAllowedBestiaryRows(merged), excluded);
    return filtered.filter((r) => isExactMonsterHeadingRow(r, q));
  }

  async function textFallbackSearch(): Promise<BestiarySearchHit[]> {
    const safe = escapeLikePattern(q);
    const pattern = `%${safe}%`;
    const { data: rows, error } = await admin
      .from("manuals_knowledge")
      .select("id, content, metadata")
      .ilike("content", pattern)
      .limit(80);
    if (error) {
      console.error("[searchBestiaryChunksAction] text fallback error", error);
      return [];
    }
    const filtered = filterExcludedRows(
      filterAllowedBestiaryRows((rows ?? []) as Row[]),
      excluded
    );
    const ranked = rankBestiaryRows(filtered, q);
    const exact = ranked.filter((r) => isExactMonsterHeadingRow(r, q));
    return rowsToBestiaryHits(exact.length > 0 ? exact : ranked);
  }

  try {
    const exactRows = await findExactHeadingRows();
    if (exactRows.length > 0) {
      return { success: true, hits: rowsToBestiaryHits(rankBestiaryRows(exactRows, q)) };
    }

    const embedding = await generateRagEmbedding(q);
    let merged: Row[] = [];
    let rpcError: { message: string } | null = null;
    for (const threshold of [0.35, 0.28, 0.22, 0.16, 0.1]) {
      const res = await runRpc("match_manuals_knowledge", {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: 28,
      });
      rpcError = res.error;
      if (rpcError) break;
      const list = (res.data ?? []) as Row[];
      const filtered = filterExcludedRows(filterAllowedBestiaryRows(list), excluded);
      if (filtered.some((c) => (c.content ?? "").trim().length > 0)) {
        merged = filtered;
        break;
      }
    }
    if (rpcError) {
      return { success: false, message: `Errore ricerca: ${rpcError.message}` };
    }

    const hits = rowsToBestiaryHits(rankBestiaryRows(merged, q));
    return { success: true, hits };
  } catch (e) {
    console.error("[searchBestiaryChunksAction]", e);
    const hits = await textFallbackSearch();
    if (hits.length > 0) {
      return { success: true, hits };
    }
    return {
      success: false,
      message:
        "Ricerca semantica non disponibile al momento e nessun risultato testuale trovato nel bestiario.",
    };
  }
}

/**
 * Ricostruisce il blocco testo attorno al chunk (vicini sullo stesso file) per avvicinarsi al testo completo del manuale.
 */
export async function fetchExpandedBestiaryChunkAction(
  campaignId: string,
  chunkId: string
): Promise<{ success: true; text: string } | { success: false; message: string }> {
  const safeCampaignId = String(campaignId ?? "").trim();
  const id = String(chunkId ?? "").trim();
  if (!id) return { success: false, message: "Chunk non valido." };
  if (!safeCampaignId) return { success: false, message: "Campagna non valida." };
  try {
    if (!(await assertGmOrAdmin())) {
      return { success: false, message: "Solo GM e admin." };
    }

    const supabaseUser = await createSupabaseServerClient();
    const { data: canRow } = await supabaseUser
      .from("campaigns")
      .select("id")
      .eq("id", safeCampaignId)
      .maybeSingle();
    if (!canRow) return { success: false, message: "Campagna non accessibile." };

    const admin = createSupabaseAdminClient();
    const { data: chunkRow, error } = await admin
      .from("manuals_knowledge")
      .select("content, metadata")
      .eq("id", id)
      .maybeSingle();
    if (error || !chunkRow) {
      return { success: false, message: error?.message ?? "Chunk non trovato." };
    }

    const chunkMeta = chunkRow as { content: string | null; metadata: Record<string, unknown> | null };

    let excluded: string[] = [];
    try {
      const { data: campaignRow } = await admin
        .from("campaigns")
        .select("ai_context")
        .eq("id", safeCampaignId)
        .single();
      excluded = readExcludedManualBookKeysFromAiContextJson(
        ((campaignRow as { ai_context?: Json | null } | null)?.ai_context ?? null) as Json | null
      );
    } catch (ctxErr) {
      console.error("[fetchExpandedBestiaryChunkAction] ai_context read failed", ctxErr);
    }
    const mbk = metaStr(chunkMeta.metadata, "manual_book_key");
    if (!mbk || !BESTIARY_ALLOWED_BOOK_KEY_SET.has(mbk)) {
      return { success: false, message: "Questo statblock non appartiene ai manuali bestiario consentiti." };
    }
    if (mbk && excluded.includes(mbk)) {
      return { success: false, message: "Questo manuale è escluso dai paletti della campagna." };
    }

    const meta = (chunkMeta.metadata ?? {}) as Record<string, unknown>;
    const fileName = metaStr(meta, "file_name");
    const idxRaw = meta["chunk_index"];
    const centerIdx =
      typeof idxRaw === "number"
        ? idxRaw
        : typeof idxRaw === "string"
          ? Number.parseInt(idxRaw, 10)
          : NaN;

    let text = typeof chunkMeta.content === "string" ? chunkMeta.content.trim() : "";
    if (fileName && Number.isFinite(centerIdx)) {
      try {
        const rpcNeighbors = admin.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
        const { data: neighbors, error: nErr } = await rpcNeighbors("manuals_knowledge_neighbors", {
          p_file_name: fileName,
          p_center_index: centerIdx,
          p_radius: 4,
        });
        if (!nErr && Array.isArray(neighbors) && neighbors.length > 0) {
          const pieces = (neighbors as Array<{ content?: string | null }>)
            .map((n) => (typeof n.content === "string" ? n.content.trim() : ""))
            .filter(Boolean);
          if (pieces.length) text = pieces.join("\n\n");
        }
      } catch (neighborErr) {
        // Fallback: usa almeno il chunk selezionato invece di fallire il click "Usa questo statblock".
        console.error("[fetchExpandedBestiaryChunkAction] neighbors expansion failed", neighborErr);
      }
    }

    text = sanitizeBestiaryStatblock(text);
    if (!text) {
      return { success: false, message: "Contenuto chunk vuoto." };
    }
    return { success: true, text };
  } catch (e) {
    console.error("[fetchExpandedBestiaryChunkAction]", e);
    const message = e instanceof Error ? e.message : "Errore sconosciuto nel caricamento statblock.";
    return { success: false, message };
  }
}
