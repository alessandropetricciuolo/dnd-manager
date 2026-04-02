"use server";

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

export type ManualSearchResult =
  | {
      success: true;
      mode: "semantic" | "text-fallback";
      /** Testo principale (chunk espansi se disponibili). */
      primaryText: string;
      hits: ManualSearchHit[];
    }
  | { success: false; message: string };

type MatchRow = {
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

/** Ricerca semantica sui manuali indicizzati (admin). Espande chunk vicini per coprire testi lunghi. */
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

  async function textFallback(): Promise<ManualSearchResult> {
    const frag = sanitizeIlikeFragment(q);
    if (frag.length < 2) {
      return { success: false, message: "Query non valida per ricerca testuale." };
    }
    const { data: rows, error } = await admin
      .from("manuals_knowledge")
      .select("content, metadata")
      .ilike("content", `%${frag}%`)
      .limit(20);
    if (error) {
      return { success: false, message: error.message ?? "Errore ricerca testuale." };
    }
    const list = (rows ?? []) as MatchRow[];
    const hits = list.map(rowToHit).filter((h) => h.content.trim().length > 0);
    if (hits.length === 0) {
      return { success: false, message: "Nessun passaggio trovato nei manuali per questa ricerca." };
    }
    const primaryText = hits
      .map((h) => h.content.trim())
      .filter(Boolean)
      .join("\n\n— — —\n\n");
    return { success: true, mode: "text-fallback", primaryText, hits };
  }

  let list: MatchRow[] = [];
  try {
    const embedding = await generateRagEmbedding(q);
    let rpcError: { message: string } | null = null;
    for (const threshold of [0.38, 0.3, 0.24, 0.18, 0.12]) {
      const res = await runRpc("match_manuals_knowledge", {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: 16,
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
      return textFallback();
    }
  } catch (e) {
    console.error("[searchManualsSemanticAction] embedding", e);
    return textFallback();
  }

  const hits = list.map(rowToHit).filter((h) => h.content.trim().length > 0);
  if (hits.length === 0) {
    return textFallback();
  }

  const best = hits[0];
  let primaryText = best.content.trim();

  if (best.fileName != null && best.chunkIndex != null) {
    const { data: neighbors, error: nErr } = await runRpc("manuals_knowledge_neighbors", {
      p_file_name: best.fileName,
      p_center_index: best.chunkIndex,
      p_radius: 2,
    });
    if (!nErr && Array.isArray(neighbors) && neighbors.length > 0) {
      const parts = (neighbors as Array<{ content?: string }>)
        .map((n) => (typeof n.content === "string" ? n.content.trim() : ""))
        .filter(Boolean);
      if (parts.length > 0) {
        primaryText = parts.join("\n\n");
      }
    }
  }

  return { success: true, mode: "semantic", primaryText, hits };
}
