"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import type { Json } from "@/types/database.types";
import { generateRagEmbedding } from "@/lib/ai/huggingface-client";
import { readExcludedManualBookKeysFromAiContextJson } from "@/lib/campaign-ai-context";
import { wikiManualBookLabel } from "@/lib/manual-book-catalog";

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
  id: string;
  content: string | null;
  metadata: Record<string, unknown> | null;
  similarity?: number | null;
};

function metaStr(m: Record<string, unknown> | null | undefined, k: string): string | null {
  if (!m || !(k in m)) return null;
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

function excerptFromContent(s: string, max = 220): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
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

  try {
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
      const filtered = filterExcludedRows(list, excluded);
      if (filtered.some((c) => (c.content ?? "").trim().length > 0)) {
        merged = filtered;
        break;
      }
    }
    if (rpcError) {
      return { success: false, message: `Errore ricerca: ${rpcError.message}` };
    }

    const seen = new Set<string>();
    const hits: BestiarySearchHit[] = [];
    for (const r of merged) {
      const content = typeof r.content === "string" ? r.content.trim() : "";
      if (!content || !r.id) continue;
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      const m = r.metadata;
      const mbk = metaStr(m, "manual_book_key");
      hits.push({
        id: r.id,
        similarity: typeof r.similarity === "number" ? r.similarity : null,
        excerpt: excerptFromContent(content),
        manual_book_key: mbk,
        manual_label: mbk ? wikiManualBookLabel(mbk) : "Manuale (non classificato)",
        chapter: metaStr(m, "chapter"),
        section_heading: metaStr(m, "section_heading") ?? metaStr(m, "section_title"),
      });
      if (hits.length >= 16) break;
    }

    return { success: true, hits };
  } catch (e) {
    console.error("[searchBestiaryChunksAction]", e);
    return { success: false, message: "Errore durante la ricerca nel bestiario." };
  }
}

/**
 * Ricostruisce il blocco testo attorno al chunk (vicini sullo stesso file) per avvicinarsi al testo completo del manuale.
 */
export async function fetchExpandedBestiaryChunkAction(
  campaignId: string,
  chunkId: string
): Promise<{ success: true; text: string } | { success: false; message: string }> {
  const id = chunkId.trim();
  if (!id) return { success: false, message: "Chunk non valido." };
  if (!(await assertGmOrAdmin())) {
    return { success: false, message: "Solo GM e admin." };
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: canRow } = await supabaseUser
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
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

  const { data: campaignRow } = await admin.from("campaigns").select("ai_context").eq("id", campaignId).single();
  const excluded = readExcludedManualBookKeysFromAiContextJson(
    ((campaignRow as { ai_context?: Json | null } | null)?.ai_context ?? null) as Json | null
  );
  const mbk = metaStr(chunkMeta.metadata, "manual_book_key");
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
  }

  if (!text) {
    return { success: false, message: "Contenuto chunk vuoto." };
  }
  return { success: true, text };
}
