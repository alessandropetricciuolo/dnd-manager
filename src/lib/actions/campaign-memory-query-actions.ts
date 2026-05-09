"use server";

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { generateAiText } from "@/lib/ai/huggingface-client";
import { generateOpenRouterEmbedding } from "@/lib/ai/openrouter-client";
import {
  countCampaignMemoryChunks,
  reindexCampaignMemory,
  type CampaignMemorySourceType,
} from "@/lib/campaign-memory-indexer";

type CampaignMemoryChunkRow = {
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

export type CampaignMemoryQuerySource = {
  id: string;
  sourceType: CampaignMemorySourceType;
  sourceLabel: string;
  sourceId: string;
  title: string;
  summary: string | null;
  href: string;
  similarity: number | null;
};

export type CampaignMemoryQueryResult =
  | {
      success: true;
      answer: string;
      sources: CampaignMemoryQuerySource[];
      chunkCount: number;
      usedFallback: boolean;
    }
  | {
      success: false;
      message: string;
      needsIndex?: boolean;
      chunkCount?: number;
    };

export type CampaignMemoryReindexResult =
  | { success: true; chunkCount: number; message: string }
  | { success: false; message: string };

function memorySchemaMissingMessage(): string {
  return "Lo schema della memoria interrogabile non è ancora disponibile su Supabase. Applica la migration della tabella `campaign_memory_chunks` e dell'RPC `match_campaign_memory`, poi riprova.";
}

function metaString(meta: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!meta || !(key in meta)) return null;
  const value = meta[key];
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function sourceLabel(sourceType: CampaignMemorySourceType): string {
  switch (sourceType) {
    case "wiki":
      return "Wiki";
    case "map_description":
      return "Mappa";
    case "character_background":
      return "PG";
    case "session_summary":
      return "Sessione";
    case "session_note":
      return "Nota sessione";
    case "gm_note":
      return "Nota GM";
    case "secret_whisper":
      return "Whisper";
  }
}

function sourceHref(campaignId: string, row: CampaignMemoryChunkRow): string {
  switch (row.source_type) {
    case "wiki":
      return `/campaigns/${campaignId}/wiki/${row.source_id}`;
    case "map_description":
      return `/campaigns/${campaignId}/maps/${row.source_id}`;
    case "character_background":
      return `/campaigns/${campaignId}?tab=pg&openEditCharacter=${row.source_id}`;
    case "session_summary":
    case "session_note":
      return `/campaigns/${campaignId}?tab=sessioni`;
    case "gm_note":
    case "secret_whisper":
      return `/campaigns/${campaignId}?tab=gm`;
  }
}

function excerpt(text: string, limit = 220): string {
  const normalized = text.replace(/\r/g, "").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit).trim()}…`;
}

function sanitizeIlikeFragment(raw: string): string {
  return raw.replace(/[%_\\]/g, " ").trim().slice(0, 160);
}

function tokenizeQuestion(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9àèéìòóù\s-]/gi, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function questionHasRecentIntent(question: string): boolean {
  return /\b(recente|recenti|ultimamente|ultima|ultime|successo|accaduto|accaduti|cronaca)\b/i.test(question);
}

function questionHasCharacterIntent(question: string): boolean {
  return /\b(pg|personaggi|personaggio|provengono|proviene|viene da|origine|origini|nato|natale)\b/i.test(
    question
  );
}

function questionHasSecretIntent(question: string): boolean {
  return /\b(segreto|sussurro|whisper|confidenziale|nascosto)\b/i.test(question);
}

function metadataDate(row: CampaignMemoryChunkRow): number {
  const iso =
    metaString(row.metadata, "updated_at") ??
    metaString(row.metadata, "scheduled_at") ??
    metaString(row.metadata, "created_at");
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/** Token della domanda utili per matching lessicale (evita stopword corte tipo "chi"). */
function significantQuestionTokens(question: string): string[] {
  return tokenizeQuestion(question).filter((t) => t.length >= 4);
}

/**
 * Spinge in alto i chunk che contengono termini distintivi della domanda nel titolo o nel testo
 * (es. nome NPC cercato), riducendo mismatch embedding vs intent.
 */
function questionTermOverlapBoost(question: string, row: CampaignMemoryChunkRow): number {
  const tokens = significantQuestionTokens(question);
  if (!tokens.length) return 0;
  const titleLower = row.title.toLowerCase();
  const contentLower = row.content.toLowerCase();
  let hits = 0;
  for (const t of tokens) {
    if (titleLower.includes(t) || contentLower.includes(t)) hits += 1;
  }
  return Math.min(0.48, hits * 0.2);
}

function rerankMatches(question: string, rows: CampaignMemoryChunkRow[]): CampaignMemoryChunkRow[] {
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
      if (/\b(mappa|mappe|continente|citta|città|regione|dungeon|luogo|dove)\b/i.test(question) && row.source_type === "map_description") {
        score += 0.12;
      }
      return { row, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.row);
}

function uniqueSources(campaignId: string, rows: CampaignMemoryChunkRow[]): CampaignMemoryQuerySource[] {
  const seen = new Set<string>();
  const sources: CampaignMemoryQuerySource[] = [];
  for (const row of rows) {
    const key = `${row.source_type}:${row.source_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      id: key,
      sourceType: row.source_type,
      sourceLabel: sourceLabel(row.source_type),
      sourceId: row.source_id,
      title: row.title,
      summary: row.summary ?? excerpt(row.content),
      href: sourceHref(campaignId, row),
      similarity: typeof row.similarity === "number" ? row.similarity : null,
    });
  }
  return sources;
}

function fallbackAnswer(question: string, rows: CampaignMemoryChunkRow[]): string {
  const top = rows.slice(0, 3);
  const bullets = top.map((row, index) => {
    const summary = row.summary ?? excerpt(row.content, 180);
    return `- [${index + 1}] ${row.title}: ${summary}`;
  });
  return [
    `Non riesco ancora a sintetizzare meglio con sicurezza, ma queste sono le fonti più rilevanti per: "${question.trim()}".`,
    ...bullets,
  ].join("\n");
}

async function ensureGmOrAdminForCampaign(campaignId: string): Promise<
  | { ok: true; admin: ReturnType<typeof createSupabaseAdminClient> }
  | { ok: false; message: string }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, message: "Devi essere autenticato." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "gm" && profile?.role !== "admin") {
    return { ok: false, message: "Solo GM e Admin possono interrogare la memoria di campagna." };
  }

  const admin = createSupabaseAdminClient();
  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .select("type")
    .eq("id", campaignId)
    .maybeSingle();
  if (campaignError || !campaign) {
    return { ok: false, message: "Campagna non trovata." };
  }
  if ((campaign as { type?: string | null }).type !== "long") {
    return { ok: false, message: "La memoria interrogabile è disponibile solo per campagne lunghe." };
  }
  return { ok: true, admin };
}

async function semanticMatches(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  campaignId: string,
  question: string
): Promise<{ rows: CampaignMemoryChunkRow[]; usedFallback: boolean }> {
  const runRpc = admin.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;

  try {
    const embedding = await generateOpenRouterEmbedding(question, { dimensions: 384 });
    let lastRows: CampaignMemoryChunkRow[] = [];
    for (const threshold of [0.34, 0.28, 0.22, 0.16, 0.1]) {
      const res = await runRpc("match_campaign_memory", {
        p_campaign_id: campaignId,
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: 18,
      });
      if (res.error) throw new Error(res.error.message);
      const rows = (res.data ?? []) as CampaignMemoryChunkRow[];
      if (rows.length > 0) {
        lastRows = rows;
        break;
      }
      lastRows = rows;
    }
    if (lastRows.length > 0) return { rows: lastRows, usedFallback: false };
  } catch (error) {
    console.error("[queryCampaignMemoryAction] semantic match failed", error);
  }

  const tokens = tokenizeQuestion(question).slice(0, 5).map(sanitizeIlikeFragment).filter(Boolean);
  const dedup = Array.from(new Set(tokens));
  if (!dedup.length) return { rows: [], usedFallback: true };

  const orExpr = dedup
    .flatMap((token) => [`content.ilike.%${token}%`, `title.ilike.%${token}%`])
    .join(",");

  const { data, error } = await admin
    .from("campaign_memory_chunks")
    .select("id, campaign_id, source_type, source_id, chunk_index, title, content, summary, metadata, updated_at")
    .eq("campaign_id", campaignId)
    .or(orExpr)
    .limit(24);

  if (error) {
    console.error("[queryCampaignMemoryAction] text fallback failed", error);
    return { rows: [], usedFallback: true };
  }

  return {
    rows: ((data ?? []) as Array<CampaignMemoryChunkRow & { updated_at?: string }>).map((row) => ({
      ...row,
      similarity: null,
      metadata: {
        ...(row.metadata ?? {}),
        ...(row.updated_at ? { updated_at: row.updated_at } : {}),
      },
    })),
    usedFallback: true,
  };
}

/** Chunk passati al modello e mostrati come fonti devono coincidere (evita fonti senza contesto in prompt). */
const GROUNDED_CONTEXT_CHUNK_LIMIT = 14;

async function groundedAnswer(question: string, rows: CampaignMemoryChunkRow[]): Promise<string> {
  const context = rows
    .map(
      (row, index) =>
        `[${index + 1}] Tipo: ${sourceLabel(row.source_type)}\nTitolo: ${row.title}\nContenuto:\n${row.content}`
    )
    .join("\n\n---\n\n");

  const prompt = [
    "Sei l'archivista della memoria di una campagna lunga di D&D 5e.",
    "Rispondi SOLO usando le fonti sotto. Se non bastano, dichiaralo chiaramente.",
    "Se il nome o il soggetto richiesto nella domanda compare nel Titolo di una fonte [n], quella fonte è pertinente: riassumi ciò che dice il Contenuto e non negare l'esistenza del soggetto solo perché il nome non è ripetuto nel corpo.",
    "Obiettivo: aiutare il GM a mantenere coerenza narrativa, senza inventare fatti.",
    `Domanda del GM: ${question.trim()}`,
    "",
    "Fonti recuperate:",
    context,
    "",
    "Istruzioni di output:",
    "- Rispondi in italiano.",
    "- Tieni la risposta breve ma utile (3-6 bullet oppure 1 breve paragrafo + bullet).",
    "- Quando citi un fatto, aggiungi il riferimento in forma [1], [2], ecc.",
    "- Non citare fonti che non sono nel contesto.",
    "- Se esistono versioni in conflitto o incomplete, segnalalo esplicitamente.",
  ].join("\n");

  const answer = await generateAiText(prompt);
  return answer.trim();
}

export async function queryCampaignMemoryAction(
  campaignId: string,
  question: string
): Promise<CampaignMemoryQueryResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return { success: false, message: "Inserisci una domanda." };
  }

  const access = await ensureGmOrAdminForCampaign(campaignId);
  if (!access.ok) return { success: false, message: access.message };
  const admin = access.admin;

  let chunkCount = 0;
  try {
    chunkCount = await countCampaignMemoryChunks(admin, campaignId);
  } catch (error) {
    console.error("[queryCampaignMemoryAction] schema/count failed", error);
    return {
      success: false,
      message: memorySchemaMissingMessage(),
      needsIndex: true,
    };
  }
  if (chunkCount === 0) {
    return {
      success: false,
      message:
        "La memoria della campagna non è ancora indicizzata. Premi \"Reindicizza memoria\" per costruire l'archivio interrogabile.",
      needsIndex: true,
      chunkCount,
    };
  }

  const { rows, usedFallback } = await semanticMatches(admin, campaignId, trimmed);
  if (!rows.length) {
    return {
      success: false,
      message: "Non ho trovato elementi abbastanza pertinenti nella memoria indicizzata della campagna.",
      chunkCount,
    };
  }

  const ranked = rerankMatches(trimmed, rows);
  const contextRows = ranked.slice(0, GROUNDED_CONTEXT_CHUNK_LIMIT);
  const sources = uniqueSources(campaignId, contextRows);
  let answer: string;
  try {
    answer = await groundedAnswer(trimmed, contextRows);
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Errore durante la sintesi AI.";
    console.error("[queryCampaignMemoryAction] answer generation failed", msg);
    answer = fallbackAnswer(trimmed, contextRows);
  }

  return {
    success: true,
    answer,
    sources,
    chunkCount,
    usedFallback,
  };
}

export async function reindexCampaignMemoryAction(
  campaignId: string
): Promise<CampaignMemoryReindexResult> {
  const access = await ensureGmOrAdminForCampaign(campaignId);
  if (!access.ok) return { success: false, message: access.message };

  try {
    await reindexCampaignMemory(access.admin, campaignId);
    const chunkCount = await countCampaignMemoryChunks(access.admin, campaignId);
    return {
      success: true,
      chunkCount,
      message: `Memoria reindicizzata con successo (${chunkCount} chunk).`,
    };
  } catch (error) {
    console.error("[reindexCampaignMemoryAction]", error);
    return {
      success: false,
      message:
        error instanceof Error && /campaign_memory_chunks|match_campaign_memory/i.test(error.message)
          ? memorySchemaMissingMessage()
          : error instanceof Error
            ? error.message
            : "Errore durante la reindicizzazione.",
    };
  }
}
