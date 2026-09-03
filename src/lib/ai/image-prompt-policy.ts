import { buildContextualImagePrompts, type ImagePromptBuildResult, type WikiImageEntityKind } from "./image-prompt-builder";
import type { createSupabaseAdminClient } from "@/utils/supabase/admin";
export const IMAGE_PROMPT_POLICY_VERSION = "legacy-shared-v1";
export async function buildSharedImagePolicy(admin: ReturnType<typeof createSupabaseAdminClient>, input: { campaignId: string; description: string; entityType: WikiImageEntityKind; entityTitle?: string | null }): Promise<ImagePromptBuildResult> {
  const result = await buildContextualImagePrompts(admin, { campaignId: input.campaignId, charDescription: input.description, entityType: input.entityType, entityTitle: input.entityTitle });
  if ("error" in result) throw new Error(result.error);
  return result;
}
export function imagePolicyHash(result: ImagePromptBuildResult): string { let hash = 2166136261; for (const c of `${result.positivePrompt}\n${result.strictNegativePrompt}\n${IMAGE_PROMPT_POLICY_VERSION}`) { hash ^= c.charCodeAt(0); hash = Math.imul(hash, 16777619); } return `fnv1a-${(hash >>> 0).toString(16)}`; }
