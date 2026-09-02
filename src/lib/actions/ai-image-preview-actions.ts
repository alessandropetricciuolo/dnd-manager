"use server";

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { checkAiMemoryPreviewAccess } from "@/lib/ai-core/access";
import { retrievePreviewMemory } from "@/lib/ai-core/campaign-memory-retriever";
import { getSiteImageModel } from "@/lib/ai/openrouter-image-preview";
import { generateImageWithOpenRouter } from "@/lib/image-benchmark/providers/openrouter-provider";
import type { AiPreviewTestResult } from "@/lib/ai-core/contracts";
import { toPreviewTestSourceRefs } from "@/lib/ai-core/preview-test-audit";
import { persistPreviewTestRun } from "@/lib/ai-core/preview-test-action-helpers";
import { buildImagePreviewPrompt, buildInsufficientMemoryPreviewOutput, safeImageOutputReference, campaignMemorySources } from "@/lib/ai-core/preview-test-grounding";
import { AI_PREVIEW_TEST_MESSAGES, isSafePreviewImageOutput, validatePreviewTestRequest } from "@/lib/ai-core/preview-test-policy";

export type RunAiImagePreviewActionResult =
  | { success: true; data: AiPreviewTestResult }
  | { success: false; message: string };

export async function runAiImagePreviewAction(
  campaignId: string,
  brief: string
): Promise<RunAiImagePreviewActionResult> {
  const startedAt = Date.now();
  const validated = validatePreviewTestRequest(campaignId, brief);
  if (!validated.ok) return { success: false, message: validated.message };
  const access = await checkAiMemoryPreviewAccess(validated.campaignId);
  if (!access.ok) return { success: false, message: access.message };
  const admin = createSupabaseAdminClient();
  const model = getSiteImageModel();
  const retrievalStartedAt = Date.now();

  try {
    const retrieval = await retrievePreviewMemory(admin, validated.campaignId, validated.input);
    const retrievalMs = Date.now() - retrievalStartedAt;
    const sources = campaignMemorySources(validated.campaignId, retrieval.chunks, retrieval.sources);
    const sourceRefs = toPreviewTestSourceRefs(sources);
    if (!retrieval.chunks.length || !sources.length) {
      const outputText = buildInsufficientMemoryPreviewOutput();
      const timingsMs = { retrieval: retrievalMs, generation: null, total: Date.now() - startedAt } as const;
      const persisted = await persistPreviewTestRun(admin, {
        campaignId: validated.campaignId,
        requestedBy: access.userId,
        kind: "grounded_image",
        mode: retrieval.mode,
        inputNormalized: validated.input,
        status: "insufficient_evidence",
        classification: "grounding_insufficient",
        outputText,
        outputRef: safeImageOutputReference({ provider: "openrouter", model }),
        sources: sourceRefs,
        metadata: { sourceCount: 0, providerCalled: false, semantic: retrieval.semantic },
        timingsMs,
      });
      return { success: true, data: { runId: persisted.runId, kind: "grounded_image", mode: retrieval.mode, status: "insufficient_evidence", classification: "grounding_insufficient", outputText, sources, timingsMs, auditPersisted: persisted.auditPersisted, provider: "openrouter", model } };
    }

    const promptSent = buildImagePreviewPrompt(validated.input, retrieval.chunks, retrieval.sources);
    const generationStartedAt = Date.now();
    let generated: Awaited<ReturnType<typeof generateImageWithOpenRouter>>;
    try {
      generated = await generateImageWithOpenRouter({ model, prompt: promptSent, aspectRatio: "1:1" });
    } catch (error) {
      console.error("[runAiImagePreviewAction] provider threw", { reason: "image_provider_error" });
      generated = {
        success: false,
        rawResponse: null,
        durationMs: Date.now() - generationStartedAt,
        errorMessage: "Provider immagine non disponibile.",
      };
    }
    const generationMs = generated.durationMs || Date.now() - generationStartedAt;
    const timingsMs = { retrieval: retrievalMs, generation: generationMs, total: Date.now() - startedAt } as const;
    const imageUrl = isSafePreviewImageOutput(generated.imageUrl) ? generated.imageUrl : undefined;
    const imageBase64 = isSafePreviewImageOutput(generated.imageBase64) ? generated.imageBase64 : undefined;
    if (!generated.success || (!imageUrl && !imageBase64)) {
      const outputText = `${AI_PREVIEW_TEST_MESSAGES.providerUnavailable} Il provider non ha restituito un riferimento immagine valido.`;
      const persisted = await persistPreviewTestRun(admin, {
        campaignId: validated.campaignId,
        requestedBy: access.userId,
        kind: "grounded_image",
        mode: retrieval.mode,
        inputNormalized: validated.input,
        status: "failed",
        classification: "provider_unavailable",
        outputText,
        outputRef: safeImageOutputReference({ provider: "openrouter", model }),
        sources: sourceRefs,
        metadata: { sourceCount: sources.length, providerCalled: true, providerDurationMs: generated.durationMs },
        timingsMs,
      });
      return { success: true, data: { runId: persisted.runId, kind: "grounded_image", mode: retrieval.mode, status: "failed", classification: "provider_unavailable", outputText, sources, timingsMs, auditPersisted: persisted.auditPersisted, promptSent, provider: "openrouter", model } };
    }

    const outputText = "Preview immagine generata. Risultato di test non canonico e non salvato come asset di campagna.";
    const persisted = await persistPreviewTestRun(admin, {
      campaignId: validated.campaignId,
      requestedBy: access.userId,
      kind: "grounded_image",
      mode: retrieval.mode,
      inputNormalized: validated.input,
      status: "completed",
      classification: "grounded_proposal",
      outputText,
      outputRef: safeImageOutputReference({ provider: "openrouter", model, outputUrl: imageUrl, outputBase64: imageBase64 }),
      sources: sourceRefs,
      metadata: { sourceCount: sources.length, providerCalled: true, providerDurationMs: generated.durationMs, estimatedCostUsd: generated.estimatedCostUsd ?? null },
      timingsMs,
    });
    return { success: true, data: { runId: persisted.runId, kind: "grounded_image", mode: retrieval.mode, status: "completed", classification: "grounded_proposal", outputText, sources, timingsMs, auditPersisted: persisted.auditPersisted, promptSent, provider: "openrouter", model, ...(imageUrl ? { imageUrl } : {}), ...(imageBase64 ? { imageBase64 } : {}) } };
  } catch (error) {
    console.error("[runAiImagePreviewAction] image preview failed", { reason: "image_provider_or_retrieval_error" });
    const timingsMs = { retrieval: Date.now() - retrievalStartedAt, generation: null, total: Date.now() - startedAt } as const;
    const outputText = `${AI_PREVIEW_TEST_MESSAGES.providerUnavailable} Nessun payload immagine viene mostrato o persistito.`;
    const persisted = await persistPreviewTestRun(admin, {
      campaignId: validated.campaignId,
      requestedBy: access.userId,
      kind: "grounded_image",
      mode: "retrieval_error",
      inputNormalized: validated.input,
      status: "failed",
      classification: "provider_unavailable",
      outputText,
      outputRef: safeImageOutputReference({ provider: "openrouter", model }),
      sources: [],
      metadata: { sourceCount: 0, providerCalled: false },
      timingsMs,
    });
    return { success: true, data: { runId: persisted.runId, kind: "grounded_image", mode: "retrieval_error", status: "failed", classification: "provider_unavailable", outputText, sources: [], timingsMs, auditPersisted: persisted.auditPersisted, provider: "openrouter", model } };
  }
}
