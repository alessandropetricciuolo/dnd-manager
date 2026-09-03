import type { SupabaseClient } from "@supabase/supabase-js";
import { retrievePreviewMemory, type RetrieveResult } from "@/lib/ai-core/campaign-memory-retriever";
import type { Database } from "@/types/database.types";
export type AssistantContext = { campaignId: string; result: RetrieveResult; evidence: string };
export async function loadAssistantContext(supabase: SupabaseClient<Database>, campaignId: string | null, question: string): Promise<AssistantContext | null> {
  if (!campaignId) return null;
  const result = await retrievePreviewMemory(supabase, campaignId, question);
  // Il router riceve solo un contesto piccolo: il RAG è un vincolo narrativo,
  // non materiale da ricopiare in una voce wiki.
  const chunks = result.chunks.slice(0, 3);
  const sources = result.sources.slice(0, 3);
  return { campaignId, result: { ...result, chunks, sources }, evidence: chunks.map((c, i) => `[${sources[i]?.evidenceId}] ${c.title}: ${c.content}`).join("\n\n") };
}
