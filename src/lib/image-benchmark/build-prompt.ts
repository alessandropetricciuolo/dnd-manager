import type { WikiImageEntityKind } from "@/lib/ai/image-prompt-builder";
import { buildContextualImagePrompts } from "@/lib/ai/image-prompt-builder";
import type { ImageBenchmarkCategory } from "./types";
import { BENCHMARK_CAMPAIGN_NAME_PATTERN } from "./campaign";
import type { createSupabaseAdminClient } from "@/utils/supabase/admin";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

let cachedCampaignId: string | null = null;
let cachedCampaignName: string | null = null;

export async function resolveBenchmarkCampaign(
  admin: AdminClient
): Promise<{ id: string; name: string } | { error: string }> {
  if (cachedCampaignId && cachedCampaignName) {
    return { id: cachedCampaignId, name: cachedCampaignName };
  }

  const { data, error } = await admin
    .from("campaigns")
    .select("id, name")
    .ilike("name", BENCHMARK_CAMPAIGN_NAME_PATTERN)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  const row = data as { id: string; name: string } | null;
  if (!row?.id) {
    return {
      error: `Campagna benchmark non trovata (cerca nome simile a «Le Cronache di Eldaria»).`,
    };
  }

  cachedCampaignId = row.id;
  cachedCampaignName = row.name;
  return { id: row.id, name: row.name };
}

export function mapBenchmarkCategoryToEntityType(category: string): WikiImageEntityKind {
  switch (category as ImageBenchmarkCategory) {
    case "Mostro":
      return "monster";
    case "Luogo":
    case "Mappa / ambiente":
    case "Handout":
    case "Locandina":
      return "location";
    case "NPC fantasy":
    case "Token portrait":
    case "Oggetto magico":
    default:
      return "npc";
  }
}

export type BenchmarkAssembledPrompt = {
  userPrompt: string;
  assembledPrompt: string;
  positivePrompt: string;
  strictNegativePrompt: string;
  campaignId: string;
  campaignName: string;
  loreIncluded: boolean;
  loreSkipReason: string | null;
};

/**
 * Assembla il prompt come in produzione (wiki): paletti Architetto + memoria IA campagna + stile.
 */
export async function buildBenchmarkImagePrompt(
  admin: AdminClient,
  input: { category: string; userPrompt: string }
): Promise<BenchmarkAssembledPrompt | { error: string }> {
  const campaign = await resolveBenchmarkCampaign(admin);
  if ("error" in campaign) return { error: campaign.error };

  const userPrompt = input.userPrompt.trim();
  if (!userPrompt) return { error: "Prompt utente vuoto." };

  const built = await buildContextualImagePrompts(admin, {
    campaignId: campaign.id,
    charDescription: userPrompt,
    entityType: mapBenchmarkCategoryToEntityType(input.category),
    forceIncludeCampaignMemory: true,
  });

  if ("error" in built) {
    return { error: built.error };
  }

  const assembledPrompt = [built.positivePrompt, built.strictNegativePrompt].filter(Boolean).join("\n\n");

  return {
    userPrompt,
    assembledPrompt,
    positivePrompt: built.positivePrompt,
    strictNegativePrompt: built.strictNegativePrompt,
    campaignId: campaign.id,
    campaignName: campaign.name,
    loreIncluded: built.meta.loreIncluded,
    loreSkipReason: built.meta.loreSkipReason,
  };
}
