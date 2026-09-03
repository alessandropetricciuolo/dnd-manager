import type { SupabaseClient } from "@supabase/supabase-js";
import { retrievePreviewMemory, type RetrieveResult } from "@/lib/ai-core/campaign-memory-retriever";
import type { Database } from "@/types/database.types";
export type AssistantContext = { campaignId: string; result: RetrieveResult; evidence: string };
export async function loadAssistantContext(supabase: SupabaseClient<Database>, campaignId: string | null, question: string): Promise<AssistantContext | null> {
  if (!campaignId) return null;
  const result = await retrievePreviewMemory(supabase, campaignId, question);
  return { campaignId, result, evidence: result.chunks.map((c, i) => `[${result.sources[i]?.evidenceId}] ${c.title}: ${c.content}`).join("\n\n") };
}
