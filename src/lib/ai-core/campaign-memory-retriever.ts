import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type { CampaignMemorySourceType } from "@/lib/campaign-memory-indexer";
import { generateOpenRouterEmbedding } from "@/lib/ai/openrouter-client";
import type {
  AiMemoryPreviewRetrievalMode,
  AiMemoryPreviewSource,
} from "./contracts";
import {
  AI_MEMORY_PREVIEW_CONTEXT_CHAR_BUDGET,
  AI_MEMORY_PREVIEW_CONTEXT_CHUNK_LIMIT,
} from "./policy";

type AdminClient = SupabaseClient<Database>;

export type PreviewChunkRow = {
  id: string;
  campaign_id: string;
  source_type: CampaignMemorySourceType;
  source_id: string;
  chunk_index: number;
  title: string;
  content: string;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  similarity?: number | null;
};

export type RetrieveResult = {
  mode: AiMemoryPreviewRetrievalMode;
  chunkCount: number;
  retrievedChunkCount: number;
  contextChunkCount: number;
  chunks: PreviewChunkRow[];
  sources: AiMemoryPreviewSource[];
};

// ── Pure helpers (exported for unit tests, no DB) ──

export function sanitizeIlikeFragment(raw: string): string {
  return raw.replace(/[%_\\]/g, " ").trim().slice(0, 160);
}

export function tokenizeQuestion(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9àèéìòóù\s-]/gi, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3);
}

export function significantQuestionTokens(question: string): string[] {
  return tokenizeQuestion(question).filter((t) => t.length >= 4);
}

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!meta || !(key in meta)) return null;
  const v = meta[key];
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function metadataDate(row: PreviewChunkRow): number {
  const iso =
    metaString(row.metadata, "updated_at") ??
    metaString(row.metadata, "scheduled_at") ??
    metaString(row.metadata, "created_at");
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function questionHasRecentIntent(q: string): boolean {
  return /\b(recente|recenti|ultimamente|ultima|ultime|successo|accaduto|accaduti|cronaca)\b/i.test(q);
}
function questionHasCharacterIntent(q: string): boolean {
  return /\b(pg|personaggi|personaggio|provengono|proviene|viene da|origine|origini|nato|natale)\b/i.test(q);
}
function questionHasSecretIntent(q: string): boolean {
  return /\b(segreto|sussurro|whisper|confidenziale|nascosto)\b/i.test(q);
}

export function questionTermOverlapBoost(question: string, row: PreviewChunkRow): number {
  const tokens = significantQuestionTokens(question);
  if (!tokens.length) return 0;
  const titleLower = row.title.toLowerCase();
  const contentLower = row.content.toLowerCase();
  let hits = 0;
  for (const t of tokens) if (titleLower.includes(t) || contentLower.includes(t)) hits += 1;
  return Math.min(0.48, hits * 0.2);
}

export function rerankMatches(question: string, rows: PreviewChunkRow[]): PreviewChunkRow[] {
  const wantsRecent = questionHasRecentIntent(question);
  const wantsCharacters = questionHasCharacterIntent(question);
  const wantsSecrets = questionHasSecretIntent(question);
  const now = Date.now();
  return [...rows]
    .map((row) => {
      let score = typeof row.similarity === "number" ? row.similarity : 0;
      score += questionTermOverlapBoost(question, row);
      if (wantsCharacters && row.source_type === "character_background") score += 0.18;
      if (wantsRecent && (row.source_type === "session_summary" || row.source_type === "wiki" || row.source_type === "map_description")) {
        const ageMs = Math.max(0, now - metadataDate(row));
        const ageDays = ageMs / 86_400_000;
        score += Math.max(0, 0.2 - Math.min(ageDays, 30) * 0.005);
      }
      if (!wantsSecrets && row.source_type === "secret_whisper") score -= 0.1;
      if (wantsSecrets && row.source_type === "secret_whisper") score += 0.15;
      if (row.source_type === "gm_note" && !wantsSecrets && !wantsRecent) score += 0.04;
      if (/\b(mappa|mappe|continente|citta|città|regione|dungeon|luogo|dove)\b/i.test(question) && row.source_type === "map_description") score += 0.12;
      if (/\b(missione|missioni|gilda|incarico|quest)\b/i.test(question) && row.source_type === "mission") score += 0.18;
      if (/\b(campagna|ambientazione|tono|magia|paletti)\b/i.test(question) && (row.source_type === "campaign_description" || row.source_type === "campaign_ai_context")) score += 0.14;
      return { row, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.row);
}

export function sourceLabel(sourceType: CampaignMemorySourceType): string {
  switch (sourceType) {
    case "wiki": return "Wiki";
    case "map_description": return "Mappa";
    case "character_background": return "PG";
    case "session_summary": return "Sessione";
    case "session_note": return "Nota sessione";
    case "gm_note": return "Nota GM";
    case "secret_whisper": return "Whisper";
    case "campaign_description": return "Campagna";
    case "campaign_ai_context": return "Paletti IA";
    case "mission": return "Missione";
  }
}

export function sourceHref(campaignId: string, row: PreviewChunkRow): string {
  switch (row.source_type) {
    case "wiki": return `/campaigns/${campaignId}/wiki/${row.source_id}`;
    case "map_description": return `/campaigns/${campaignId}/maps/${row.source_id}`;
    case "character_background": return `/campaigns/${campaignId}?tab=pg&openEditCharacter=${row.source_id}`;
    case "session_summary":
    case "session_note": return `/campaigns/${campaignId}?tab=sessioni`;
    case "gm_note":
    case "secret_whisper": return `/campaigns/${campaignId}?tab=gm`;
    case "campaign_description":
    case "campaign_ai_context": return `/campaigns/${campaignId}`;
    case "mission": return `/campaigns/${campaignId}?tab=missioni`;
  }
}

export function deduplicateBySource(rows: PreviewChunkRow[]): PreviewChunkRow[] {
  const seen = new Set<string>();
  const out: PreviewChunkRow[] = [];
  for (const row of rows) {
    const key = `${row.source_type}:${row.source_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function applyContextBudget(rows: PreviewChunkRow[], budget = AI_MEMORY_PREVIEW_CONTEXT_CHAR_BUDGET, limit = AI_MEMORY_PREVIEW_CONTEXT_CHUNK_LIMIT): PreviewChunkRow[] {
  const out: PreviewChunkRow[] = [];
  let total = 0;
  for (const row of rows) {
    const len = row.content.length;
    if (out.length >= limit) break;
    if (total + len > budget) {
      // Se il singolo chunk supera da solo il budget, lo includiamo comunque se è il primo
      if (out.length === 0) {
        out.push(row);
      }
      break;
    }
    out.push(row);
    total += len;
  }
  return out;
}

export function buildPreviewSources(campaignId: string, chunks: PreviewChunkRow[]): AiMemoryPreviewSource[] {
  return chunks.map((row, idx) => ({
    evidenceId: `E${idx + 1}`,
    sourceType: row.source_type,
    sourceId: row.source_id,
    title: row.title,
    href: sourceHref(campaignId, row),
    similarity: typeof row.similarity === "number" ? row.similarity : null,
  }));
}

// ── Retrieval read-only (no writes) ──

const SEMANTIC_THRESHOLDS = [0.34, 0.28, 0.22, 0.16, 0.1] as const;
const SEMANTIC_MATCH_COUNT = 18;
const LEXICAL_LIMIT = 24;

export type RetrieverDeps = {
  generateEmbedding?: (text: string, opts: { dimensions: number }) => Promise<number[]>;
};

export async function retrievePreviewMemory(
  admin: AdminClient,
  campaignId: string,
  question: string,
  deps: RetrieverDeps = {}
): Promise<RetrieveResult> {
  const normalized = question.trim();
  const generateEmbedding = deps.generateEmbedding ?? ((t: string, opts: { dimensions: number }) => generateOpenRouterEmbedding(t, opts));

  // chunkCount per metriche (read-only)
  let chunkCount = 0;
  try {
    const { count } = await admin.from("campaign_memory_chunks").select("id", { count: "exact", head: true }).eq("campaign_id", campaignId);
    chunkCount = count ?? 0;
  } catch {
    chunkCount = 0;
  }

  // 1) semantic
  let semanticRows: PreviewChunkRow[] = [];
  let semanticSucceeded = false;
  try {
    const embedding = await generateEmbedding(normalized, { dimensions: 384 });
    const runRpc = admin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: unknown; error: { message: string } | null }>;

    for (const threshold of SEMANTIC_THRESHOLDS) {
      const res = await runRpc("match_campaign_memory", {
        p_campaign_id: campaignId,
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: SEMANTIC_MATCH_COUNT,
      });
      if (res.error) throw new Error(res.error.message);
      const rows = (res.data ?? []) as PreviewChunkRow[];
      if (rows.length > 0) {
        semanticRows = rows;
        semanticSucceeded = true;
        break;
      }
      semanticRows = rows;
    }
    if (semanticSucceeded && semanticRows.length > 0) {
      const ranked = rerankMatches(normalized, semanticRows);
      const deduped = deduplicateBySource(ranked);
      const budgeted = applyContextBudget(deduped);
      const sources = buildPreviewSources(campaignId, budgeted);
      return {
        mode: "semantic",
        chunkCount,
        retrievedChunkCount: semanticRows.length,
        contextChunkCount: budgeted.length,
        chunks: budgeted,
        sources,
      };
    }
  } catch (e) {
    console.error("[ai-core retriever] semantic match failed", e);
    // fall through to lexical
  }

  // 2) lexical fallback scoped to campaign
  const tokens = tokenizeQuestion(normalized).slice(0, 5).map(sanitizeIlikeFragment).filter(Boolean);
  const dedup = Array.from(new Set(tokens));
  if (!dedup.length) {
    return {
      mode: "none",
      chunkCount,
      retrievedChunkCount: 0,
      contextChunkCount: 0,
      chunks: [],
      sources: [],
    };
  }

  const orExpr = dedup.flatMap((token) => [`content.ilike.%${token}%`, `title.ilike.%${token}%`]).join(",");

  const { data, error } = await admin
    .from("campaign_memory_chunks")
    .select("id, campaign_id, source_type, source_id, chunk_index, title, content, summary, metadata, updated_at")
    .eq("campaign_id", campaignId)
    .or(orExpr)
    .limit(LEXICAL_LIMIT);

  if (error || !data || (data as unknown[]).length === 0) {
    return {
      mode: dedup.length ? "lexical_fallback" : "none",
      chunkCount,
      retrievedChunkCount: 0,
      contextChunkCount: 0,
      chunks: [],
      sources: [],
    };
  }

  const lexicalRows: PreviewChunkRow[] = ((data ?? []) as Array<PreviewChunkRow & { updated_at?: string }>).map((row) => ({
    ...row,
    similarity: null,
    metadata: {
      ...(row.metadata ?? {}),
      ...(row.updated_at ? { updated_at: row.updated_at } : {}),
    },
  }));

  const rankedLex = rerankMatches(normalized, lexicalRows);
  const dedupedLex = deduplicateBySource(rankedLex);
  const budgetedLex = applyContextBudget(dedupedLex);
  const sourcesLex = buildPreviewSources(campaignId, budgetedLex);

  // Se il lexical non ha prodotto chunk dopo budget, consideriamo comunque fallback (non none) ma con 0
  if (budgetedLex.length === 0) {
    return {
      mode: "lexical_fallback",
      chunkCount,
      retrievedChunkCount: lexicalRows.length,
      contextChunkCount: 0,
      chunks: [],
      sources: [],
    };
  }

  return {
    mode: "lexical_fallback",
    chunkCount,
    retrievedChunkCount: lexicalRows.length,
    contextChunkCount: budgetedLex.length,
    chunks: budgetedLex,
    sources: sourcesLex,
  };
}
