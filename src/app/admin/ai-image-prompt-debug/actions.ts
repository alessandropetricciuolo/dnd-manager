"use server";

import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  buildContextualImagePrompts,
  type ImagePromptBuildResult,
  type WikiImageEntityKind,
} from "@/lib/ai/image-prompt-builder";
import {
  DEFAULT_OPENROUTER_IMAGE_MODEL,
  getOpenRouterPayloadForPreview,
} from "@/lib/ai/openrouter-image-preview";
import { generateImageWithOpenRouter } from "@/lib/image-benchmark/providers/openrouter-provider";
import { OPENROUTER_IMAGE_BENCHMARK_MODELS } from "@/lib/image-benchmark/models";

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
  model?: string;
  aspectRatio?: string;
};

export type PreviewImagePromptResult =
  | {
      success: true;
      result: ImagePromptBuildResult;
      model: string;
      aspectRatio: string;
      providerPreview: ReturnType<typeof getOpenRouterPayloadForPreview>;
    }
  | { success: false; message: string };

export type GenerateTestImageResult =
  | {
      success: true;
      imageUrl?: string;
      imageBase64?: string;
      durationMs: number;
      estimatedCostUsd?: number;
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
  { success: true; campaigns: AdminCampaignOption[]; models: string[] } | { success: false; message: string }
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

  return { success: true, campaigns, models: [...OPENROUTER_IMAGE_BENCHMARK_MODELS] };
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

  const model = input.model?.trim() || DEFAULT_OPENROUTER_IMAGE_MODEL;
  const aspectRatio = input.aspectRatio?.trim() || "1:1";
  const providerPreview = getOpenRouterPayloadForPreview(built, { model, aspectRatio });

  return {
    success: true,
    result: built,
    model,
    aspectRatio,
    providerPreview,
  };
}

export async function generateTestImageFromPromptAction(
  input: PreviewImagePromptInput
): Promise<GenerateTestImageResult> {
  const preview = await previewContextualImagePromptAction(input);
  if (!preview.success) {
    return { success: false, message: preview.message };
  }

  const content = preview.providerPreview.payload.messages[0]?.content ?? preview.result.positivePrompt;

  const generated = await generateImageWithOpenRouter({
    model: preview.model,
    prompt: content,
    aspectRatio: preview.aspectRatio,
  });

  if (!generated.success) {
    return { success: false, message: generated.errorMessage ?? "Generazione OpenRouter fallita." };
  }

  return {
    success: true,
    imageUrl: generated.imageUrl,
    imageBase64: generated.imageBase64,
    durationMs: generated.durationMs,
    estimatedCostUsd: generated.estimatedCostUsd,
  };
}
