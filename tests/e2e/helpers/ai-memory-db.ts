import { loadEnvLocal } from "../../../scripts/e2e-env";
import { createSupabaseAdminClient } from "../../../src/utils/supabase/admin";
import type { CampaignAiContext } from "../../../src/lib/campaign-ai-context";
import { parseCampaignAiContextFromDb } from "../../../src/lib/campaign-ai-context";

loadEnvLocal();

export type AiMemoryDbSnapshot = {
  aiContext: CampaignAiContext | null;
  chunkCount: number;
  sessionSummaryChunks: number;
  wikiChunks: number;
};

export async function fetchAiMemorySnapshot(campaignId: string): Promise<AiMemoryDbSnapshot> {
  const admin = createSupabaseAdminClient();

  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .select("ai_context")
    .eq("id", campaignId)
    .single();

  if (campaignError) throw new Error(campaignError.message);

  const { count: chunkCount, error: countError } = await admin
    .from("campaign_memory_chunks")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  if (countError) throw new Error(countError.message);

  const { count: sessionSummaryChunks } = await admin
    .from("campaign_memory_chunks")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("source_type", "session_summary");

  const { count: wikiChunks } = await admin
    .from("campaign_memory_chunks")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("source_type", "wiki");

  return {
    aiContext: parseCampaignAiContextFromDb(campaign?.ai_context ?? null),
    chunkCount: chunkCount ?? 0,
    sessionSummaryChunks: sessionSummaryChunks ?? 0,
    wikiChunks: wikiChunks ?? 0,
  };
}

export async function memoryChunkContainsToken(
  campaignId: string,
  token: string,
  sourceType?: string
): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  let query = admin
    .from("campaign_memory_chunks")
    .select("id, content, summary, source_type")
    .eq("campaign_id", campaignId)
    .or(`content.ilike.%${token}%,summary.ilike.%${token}%`)
    .limit(5);

  if (sourceType) {
    query = query.eq("source_type", sourceType);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

export async function waitForMemoryToken(
  campaignId: string,
  token: string,
  opts?: { sourceType?: string; timeoutMs?: number; intervalMs?: number }
): Promise<boolean> {
  const timeoutMs = opts?.timeoutMs ?? 120_000;
  const intervalMs = opts?.intervalMs ?? 4_000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (await memoryChunkContainsToken(campaignId, token, opts?.sourceType)) {
      return true;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}
