"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";
import { generateRagEmbedding } from "@/lib/ai/huggingface-client";
import { readExcludedManualBookKeysFromAiContextJson } from "@/lib/campaign-ai-context";
import { wikiManualBookLabel } from "@/lib/manual-book-catalog";
import { mmNormalizeHeadingTitle } from "@/lib/manuals/monster-manual-chunks";
import {
  bestiaryListItemId,
  extractStatblockSlice,
  findBestChunkIdForStatblock,
  parseBestiaryListItemId,
  parseStatblocksFromBestiaryContent,
  resolveStatblockFromRowContents,
} from "@/lib/manuals/bestiary-statblock-parser";

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

export type BestiaryListItem = {
  id: string;
  monster_name: string;
  cr_value: string;
  cr_label: string;
  cr_sort: number;
  manual_book_key: string;
  manual_label: string;
};

export type BestiaryListGroup = {
  cr_value: string;
  cr_label: string;
  cr_sort: number;
  items: BestiaryListItem[];
};

type Row = {
  id: string | number;
  content: string | null;
  metadata: Record<string, unknown> | null;
  similarity?: number | null;
};

const CR_FRACTION_MAP: Record<string, number> = {
  "0": 0,
  "1/8": 0.125,
  "1/4": 0.25,
  "1/2": 0.5,
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

function statblockMatchesSearchQuery(
  statblockName: string,
  query: string,
  sectionHeading: string
): boolean {
  const q = normalizeLoose(query);
  if (!q) return true;
  const name = normalizeLoose(statblockName);
  const section = normalizeLoose(sectionHeading);
  if (name === q || name.includes(q)) return true;
  if (section === q || section.includes(q)) return true;
  return contentHeadingMatchesQuery(statblockName, q);
}

function contentHeadingMatchesQuery(heading: string, qNorm: string): boolean {
  const h = normalizeLoose(heading);
  return h === qNorm || h.includes(qNorm);
}

function rowToBestiaryHits(row: Row, query: string): BestiarySearchHit[] {
  const rowId = String(row.id ?? "").trim();
  const content = typeof row.content === "string" ? row.content.trim() : "";
  if (!content || !rowId) return [];

  const m = row.metadata;
  const mbk = metaStr(m, "manual_book_key");
  const sectionHeading = metaStr(m, "section_heading") ?? metaStr(m, "section_title") ?? "";
  const baseHit = {
    similarity: typeof row.similarity === "number" ? row.similarity : null,
    manual_book_key: mbk,
    manual_label: mbk ? wikiManualBookLabel(mbk) : "Manuale (non classificato)",
    chapter: metaStr(m, "chapter"),
  };

  const statblocks = parseStatblocksFromBestiaryContent(content);
  if (statblocks.length > 0) {
    const q = query.trim();
    const matched = q
      ? statblocks.filter((sb) => statblockMatchesSearchQuery(sb.name, q, sectionHeading))
      : statblocks;
    const entries = matched.length > 0 ? matched : statblocks;
    return entries.map((entry) => {
      const monsterName = normalizeMonsterName(entry.name);
      const slice = extractStatblockSlice(content, monsterName);
      const excerptSource = slice ?? content;
      return {
        ...baseHit,
        id: bestiaryListItemId(rowId, monsterName),
        excerpt: excerptFromContent(excerptSource),
        section_heading: monsterName,
      };
    });
  }

  return [
    {
      ...baseHit,
      id: rowId,
      excerpt: excerptFromContent(content),
      section_heading: sectionHeading || null,
    },
  ];
}

function rowsToBestiaryHits(rows: Row[], query = ""): BestiarySearchHit[] {
  const seen = new Set<string>();
  const hits: BestiarySearchHit[] = [];
  for (const r of rows) {
    for (const hit of rowToBestiaryHits(r, query)) {
      if (seen.has(hit.id)) continue;
      seen.add(hit.id);
      hits.push(hit);
      if (hits.length >= 16) break;
    }
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

function normalizeMonsterName(raw: string): string {
  return raw
    .replace(/^#+\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCrFromText(raw: string): string | null {
  const text = raw.replace(/\r\n/g, "\n");
  const direct =
    text.match(/\*\*Sfida\*\*\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)/i) ??
    text.match(/\b(?:Sfida|GS|CR)\b\s*[:\-]?\s*([0-9]+(?:\/[0-9]+)?(?:\.[0-9]+)?)/i);
  if (!direct?.[1]) return null;
  return direct[1].trim();
}

const EXCLUDED_BESTIARY_SECTION_HEADINGS = new Set(
  ["manuale dei mostri parte iniziale", "introduzione", "bestiario", "appendice"].map((s) =>
    mmNormalizeHeadingTitle(s)
  )
);

function metaNum(m: Record<string, unknown> | null | undefined, k: string): number {
  if (!m || typeof m !== "object" || Array.isArray(m) || !(k in m)) return 0;
  const v = m[k];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isExcludedBestiarySectionHeading(heading: string): boolean {
  const norm = mmNormalizeHeadingTitle(heading);
  if (EXCLUDED_BESTIARY_SECTION_HEADINGS.has(norm)) return true;
  return norm.includes("parte iniziale");
}

async function fetchBestiarySectionRows(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  meta: Record<string, unknown>
): Promise<Row[]> {
  const fileName = metaStr(meta, "file_name");
  const sectionHeading = metaStr(meta, "section_heading") ?? metaStr(meta, "section_title");
  const mbk = metaStr(meta, "manual_book_key");
  if (!fileName || !sectionHeading) return [];

  let query = admin
    .from("manuals_knowledge")
    .select("id, content, metadata")
    .eq("metadata->>file_name", fileName)
    .eq("metadata->>section_heading", sectionHeading);
  if (mbk) {
    query = query.eq("metadata->>manual_book_key", mbk);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[fetchBestiarySectionRows]", error);
    return [];
  }
  return [...((data ?? []) as Row[])].sort(
    (a, b) => metaNum(a.metadata, "section_part") - metaNum(b.metadata, "section_part")
  );
}

async function fetchAllBestiaryKnowledgeRows(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<Row[]> {
  const pageSize = 1000;
  const all: Row[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin
      .from("manuals_knowledge")
      .select("id, content, metadata")
      .in("metadata->>manual_book_key", [...BESTIARY_ALLOWED_BOOK_KEYS])
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    all.push(...(data as Row[]));
    if (data.length < pageSize) break;
  }
  return all;
}

function crToSort(crValue: string): number {
  const v = crValue.trim();
  if (v in CR_FRACTION_MAP) return CR_FRACTION_MAP[v];
  if (v.includes("/")) {
    const [a, b] = v.split("/");
    const num = Number(a);
    const den = Number(b);
    if (Number.isFinite(num) && Number.isFinite(den) && den > 0) return num / den;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
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
    return rowsToBestiaryHits(exact.length > 0 ? exact : ranked, q);
  }

  try {
    const exactRows = await findExactHeadingRows();
    if (exactRows.length > 0) {
      return { success: true, hits: rowsToBestiaryHits(rankBestiaryRows(exactRows, q), q) };
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

    const hits = rowsToBestiaryHits(rankBestiaryRows(merged, q), q);
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
  const rawId = String(chunkId ?? "").trim();
  if (!rawId) return { success: false, message: "Chunk non valido." };
  const { chunkId: id, statblockName } = parseBestiaryListItemId(rawId);
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

    if (statblockName) {
      let slice =
        extractStatblockSlice(text, statblockName) ??
        resolveStatblockFromRowContents([{ content: text }], statblockName);

      if (!slice) {
        const sectionRows = await fetchBestiarySectionRows(admin, meta);
        if (sectionRows.length > 0) {
          slice = resolveStatblockFromRowContents(sectionRows, statblockName);
        }
      }

      if (!slice) {
        return {
          success: false,
          message: `Statblock «${statblockName}» non trovato nel manuale indicizzato.`,
        };
      }
      text = sanitizeBestiaryStatblock(slice);
    } else {
      text = sanitizeBestiaryStatblock(text);
    }

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

/**
 * Lista mostri da Manuale dei Mostri + Mostri del Multiverso, raggruppati e ordinati per GS.
 */
export async function listBestiaryMonstersByCrAction(
  campaignId: string
): Promise<{ success: true; groups: BestiaryListGroup[] } | { success: false; message: string }> {
  const safeCampaignId = String(campaignId ?? "").trim();
  if (!safeCampaignId) return { success: false, message: "Campagna non valida." };
  if (!(await assertGmOrAdmin())) {
    return { success: false, message: "Solo GM e admin possono usare la lista bestiario." };
  }

  try {
    const supabaseUser = await createSupabaseServerClient();
    const { data: canRow } = await supabaseUser
      .from("campaigns")
      .select("id")
      .eq("id", safeCampaignId)
      .maybeSingle();
    if (!canRow) return { success: false, message: "Campagna non trovata o non accessibile." };

    const admin = createSupabaseAdminClient();
    const { data: camp } = await admin.from("campaigns").select("ai_context").eq("id", safeCampaignId).single();
    const excluded = readExcludedManualBookKeysFromAiContextJson(
      ((camp as { ai_context?: Json | null } | null)?.ai_context ?? null) as Json | null
    );

    let rows: Row[];
    try {
      rows = await fetchAllBestiaryKnowledgeRows(admin);
    } catch (fetchErr) {
      const message = fetchErr instanceof Error ? fetchErr.message : "Errore caricamento lista bestiario.";
      return { success: false, message: `Errore caricamento lista bestiario: ${message}` };
    }

    const filtered = filterExcludedRows(rows, excluded);
    const sectionGroups = new Map<string, Row[]>();

    for (const row of filtered) {
      const meta = row.metadata;
      const mbk = metaStr(meta, "manual_book_key");
      if (!mbk || !BESTIARY_ALLOWED_BOOK_KEY_SET.has(mbk)) continue;

      const sectionHeading = metaStr(meta, "section_heading") ?? metaStr(meta, "section_title");
      if (!sectionHeading || isExcludedBestiarySectionHeading(sectionHeading)) continue;

      const groupKey = `${mbk}::${mmNormalizeHeadingTitle(sectionHeading)}`;
      const bucket = sectionGroups.get(groupKey);
      if (bucket) bucket.push(row);
      else sectionGroups.set(groupKey, [row]);
    }

    const dedup = new Map<string, BestiaryListItem>();

    for (const groupRows of sectionGroups.values()) {
      const sortedRows = [...groupRows].sort(
        (a, b) => metaNum(a.metadata, "section_part") - metaNum(b.metadata, "section_part")
      );
      const meta = sortedRows[0]?.metadata;
      const mbk = metaStr(meta, "manual_book_key");
      if (!mbk) continue;

      const combined = sortedRows
        .map((row) => (typeof row.content === "string" ? row.content : ""))
        .filter(Boolean)
        .join("\n\n");
      if (!combined.trim()) continue;

      const statblocks = parseStatblocksFromBestiaryContent(combined);
      const entries =
        statblocks.length > 0
          ? statblocks
          : (() => {
              const sectionHeading = metaStr(meta, "section_heading") ?? metaStr(meta, "section_title");
              const monsterName = normalizeMonsterName(sectionHeading ?? "");
              const crValue = extractCrFromText(combined);
              if (!monsterName || !crValue) return [];
              return [{ name: monsterName, crValue }];
            })();

      for (const entry of entries) {
        const monsterName = normalizeMonsterName(entry.name);
        if (!monsterName) continue;

        const key = `${mbk}::${monsterName.toLowerCase()}`;
        if (dedup.has(key)) continue;

        const chunkId =
          findBestChunkIdForStatblock(sortedRows, monsterName) ?? String(sortedRows[0]?.id ?? "");
        if (!chunkId) continue;

        dedup.set(key, {
          id: bestiaryListItemId(chunkId, monsterName),
          monster_name: monsterName,
          cr_value: entry.crValue,
          cr_label: `GS ${entry.crValue}`,
          cr_sort: crToSort(entry.crValue),
          manual_book_key: mbk,
          manual_label: wikiManualBookLabel(mbk),
        });
      }
    }

    const groupsMap = new Map<string, BestiaryListGroup>();
    for (const item of dedup.values()) {
      const gKey = item.cr_value;
      const existing = groupsMap.get(gKey);
      if (existing) {
        existing.items.push(item);
      } else {
        groupsMap.set(gKey, {
          cr_value: item.cr_value,
          cr_label: item.cr_label,
          cr_sort: item.cr_sort,
          items: [item],
        });
      }
    }

    const groups = [...groupsMap.values()]
      .sort((a, b) => a.cr_sort - b.cr_sort || a.cr_value.localeCompare(b.cr_value, "it"))
      .map((g) => ({
        ...g,
        items: [...g.items].sort((a, b) => a.monster_name.localeCompare(b.monster_name, "it")),
      }));

    return { success: true, groups };
  } catch (e) {
    console.error("[listBestiaryMonstersByCrAction]", e);
    return {
      success: false,
      message: e instanceof Error ? e.message : "Errore nel caricamento lista bestiario.",
    };
  }
}
