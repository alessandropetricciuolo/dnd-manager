"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  buildContextualImagePrompts,
  getProviderPayloadForPreview,
  type ImagePromptBuildResult,
  type WikiImageEntityKind,
} from "@/lib/ai/image-prompt-builder";
import { getDefaultImageProvider, type ImageProviderId } from "@/lib/ai/image-provider";

export type AdminCampaignOption = {
  id: string;
  name: string;
  type: string;
};

export type PreviewImagePromptInput = {
  campaignId: string;
  userPrompt: string;
  entityType: WikiImageEntityKind;
  entityTitle?: string;
  provider?: ImageProviderId;
};

export type PreviewImagePromptResult =
  | {
      success: true;
      result: ImagePromptBuildResult;
      provider: ImageProviderId;
      providerPreview: ReturnType<typeof getProviderPayloadForPreview>;
    }
  | { success: false; message: string };

async function ensureAdmin(): Promise<{ ok: true; admin: ReturnType<typeof createSupabaseAdminClient> } | { ok: false; message: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Non autenticato." };

  const admin = createSupabaseAdminClient();
  const { data: profileRaw } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const profile = profileRaw as { role?: string } | null;
  if (profile?.role !== "admin") {
    return { ok: false, message: "Solo gli admin possono usare l'anteprima prompt immagine." };
  }
  return { ok: true, admin };
}

export async function listCampaignsForImagePromptDebugAction(): Promise<
  { success: true; campaigns: AdminCampaignOption[] } | { success: false; message: string }
> {
  const access = await ensureAdmin();
  if (!access.ok) return { success: false, message: access.message };

  const { data, error } = await access.admin
    .from("campaigns")
    .select("id, name, type")
    .order("name", { ascending: true });

  if (error) {
    return { success: false, message: error.message };
  }

  const campaigns = (data ?? []).map((row) => ({
    id: String((row as { id: string }).id),
    name: String((row as { name: string }).name ?? "Senza nome"),
    type: String((row as { type?: string }).type ?? ""),
  }));

  return { success: true, campaigns };
}

export async function previewContextualImagePromptAction(
  input: PreviewImagePromptInput
): Promise<PreviewImagePromptResult> {
  const access = await ensureAdmin();
  if (!access.ok) return { success: false, message: access.message };

  const built = await buildContextualImagePrompts(access.admin, {
    campaignId: input.campaignId,
    charDescription: input.userPrompt,
    entityType: input.entityType,
    entityTitle: input.entityTitle?.trim() || null,
  });

  if ("error" in built) {
    return { success: false, message: built.error };
  }

  const provider = input.provider ?? getDefaultImageProvider();
  const providerPreview = getProviderPayloadForPreview(provider, built);

  return {
    success: true,
    result: built,
    provider,
    providerPreview,
  };
}
