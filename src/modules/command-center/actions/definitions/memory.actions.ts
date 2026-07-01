import { reindexCampaignMemoryAction } from "@/lib/actions/campaign-memory-query-actions";
import { registerAction } from "../registry";

export function registerMemoryActions(): void {
  registerAction({
    name: "memory.reindex",
    description: "Reindicizza la memoria RAG di una campagna long",
    category: "campaign",
    validate: (input) => {
      const campaignId = (input as Record<string, unknown>).campaignId;
      if (typeof campaignId !== "string" || !campaignId.trim()) {
        return { ok: false, error: "Campagna obbligatoria." };
      }
      return { ok: true, data: campaignId.trim() };
    },
    preview: async (_ctx, campaignId) => ({
      campaignId,
      operation: "reindex_campaign_memory",
      note: "Ricalcola i chunk da wiki, note GM, sessioni, ecc.",
    }),
    execute: async (_ctx, campaignId) => {
      const result = await reindexCampaignMemoryAction(campaignId);
      if (!result.success) throw new Error(result.message);
      return {
        campaignId,
        chunkCount: result.chunkCount,
        message: result.message,
      };
    },
    auditEntity: (_campaignId, result) => ({
      entityType: "campaign",
      entityId: result.campaignId,
    }),
    revalidatePaths: (campaignId) => [`/campaigns/${campaignId}`, "/command-center"],
  });
}
