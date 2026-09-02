import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { AI_MEMORY_PREVIEW_MESSAGES } from "./policy";

export type PreviewAccessSuccess = {
  ok: true;
  userId: string;
  campaignId: string;
  role: "admin";
};

export type PreviewAccessFailure = {
  ok: false;
  message: string;
};

export type PreviewAccessResult = PreviewAccessSuccess | PreviewAccessFailure;

// Pure helpers — testabili senza Supabase

export function isAllowedPreviewRole(role: string | null | undefined): boolean {
  return role === "admin";
}

export async function checkAiMemoryPreviewActorAccess(): Promise<
  { ok: true; userId: string } | PreviewAccessFailure
> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: AI_MEMORY_PREVIEW_MESSAGES.unauthenticated };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !isAllowedPreviewRole(profile.role)) {
    return { ok: false, message: AI_MEMORY_PREVIEW_MESSAGES.forbiddenRole };
  }
  return { ok: true, userId: user.id };
}

export function isLongCampaignTypeValue(type: string | null | undefined): boolean {
  return type === "long";
}

/**
 * Guard centralizzato M1: blocca richieste non autorizzate PRIMA di embedding/provider/audit.
 * Ordine volutamente fail-fast: input -> auth -> role -> campaign type.
 */
export async function checkAiMemoryPreviewAccess(
  campaignId: string
): Promise<PreviewAccessResult> {
  const normalizedId = campaignId.trim();
  if (!normalizedId) {
    return { ok: false, message: AI_MEMORY_PREVIEW_MESSAGES.invalidCampaignId };
  }

  const actor = await checkAiMemoryPreviewActorAccess();
  if (!actor.ok) return actor;

  const admin = createSupabaseAdminClient();
  const { data: campaign, error: campaignError } = await admin
    .from("campaigns")
    .select("id, type")
    .eq("id", normalizedId)
    .maybeSingle();

  if (campaignError || !campaign) {
    return { ok: false, message: AI_MEMORY_PREVIEW_MESSAGES.campaignNotFound };
  }

  if (!isLongCampaignTypeValue((campaign as { type: string | null }).type)) {
    return { ok: false, message: AI_MEMORY_PREVIEW_MESSAGES.notLongCampaign };
  }

  return {
    ok: true,
    userId: actor.userId,
    campaignId: normalizedId,
    role: "admin",
  };
}
