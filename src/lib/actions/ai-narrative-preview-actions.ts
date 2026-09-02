"use server";

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { checkAiMemoryPreviewAccess } from "@/lib/ai-core/access";
import { retrievePreviewMemory } from "@/lib/ai-core/campaign-memory-retriever";
import { generateAiText, MODELS } from "@/lib/ai/huggingface-client";
import { getOpenRouterModelForAiText, shouldUseOpenRouterForAiText } from "@/lib/ai/openrouter-client";
import type { AiPreviewTestResult } from "@/lib/ai-core/contracts";
import { toPreviewTestSourceRefs } from "@/lib/ai-core/preview-test-audit";
import { persistPreviewTestRun } from "@/lib/ai-core/preview-test-action-helpers";
import {
  buildInsufficientMemoryPreviewOutput,
  buildNarrativePreviewPrompt,
  buildProviderUnavailablePreviewOutput,
  campaignMemorySources,
  validateNarrativePreviewOutput,
} from "@/lib/ai-core/preview-test-grounding";
import { validatePreviewTestRequest } from "@/lib/ai-core/preview-test-policy";

export type RunAiNarrativePreviewActionResult =
  | { success: true; data: AiPreviewTestResult }
  | { success: false; message: string };

function textProviderInfo(): { provider: string; model: string } {
  const provider = process.env.AI_TEXT_PROVIDER?.trim().toLowerCase() || "huggingface";
  if (shouldUseOpenRouterForAiText()) {
    return { provider, model: getOpenRouterModelForAiText() };
  }
  return { provider, model: provider === "ollama" ? process.env.OLLAMA_MODEL?.trim() || "llama3" : MODELS.text };
}

export async function runAiNarrativePreviewAction(
  campaignId: string,
  instruction: string
): Promise<RunAiNarrativePreviewActionResult> {
  const startedAt = Date.now();
  const validated = validatePreviewTestRequest(campaignId, instruction);
  if (!validated.ok) return { success: false, message: validated.message };

  const access = await checkAiMemoryPreviewAccess(validated.campaignId);
  if (!access.ok) return { success: false, message: access.message };
  const admin = createSupabaseAdminClient();
  const providerInfo = textProviderInfo();
  const retrievalStartedAt = Date.now();

  try {
    const retrieval = await retrievePreviewMemory(admin, validated.campaignId, validated.input);
    const retrievalMs = Date.now() - retrievalStartedAt;
    const sources = campaignMemorySources(validated.campaignId, retrieval.chunks, retrieval.sources);
    const sourceRefs = toPreviewTestSourceRefs(sources);

    if (retrieval.chunks.length === 0 || sources.length === 0) {
      const timingsMs = { retrieval: retrievalMs, generation: null, total: Date.now() - startedAt } as const;
      const persisted = await persistPreviewTestRun(admin, {
        campaignId: validated.campaignId,
        requestedBy: access.userId,
        kind: "narrative_text",
        mode: retrieval.mode,
        inputNormalized: validated.input,
        status: "insufficient_evidence",
        classification: "grounding_insufficient",
        outputText: buildInsufficientMemoryPreviewOutput(),
        outputRef: null,
        sources: sourceRefs,
        metadata: { sourceCount: 0, semantic: retrieval.semantic },
        timingsMs,
      });
      return {
        success: true,
        data: {
          runId: persisted.runId,
          kind: "narrative_text",
          mode: retrieval.mode,
          status: "insufficient_evidence",
          classification: "grounding_insufficient",
          outputText: buildInsufficientMemoryPreviewOutput(),
          sources,
          timingsMs,
          auditPersisted: persisted.auditPersisted,
          provider: providerInfo.provider,
          model: providerInfo.model,
        },
      };
    }

    const prompt = buildNarrativePreviewPrompt(validated.input, retrieval.chunks, retrieval.sources);
    const generationStartedAt = Date.now();
    let outputText: string;
    try {
      outputText = await generateAiText(prompt);
    } catch (error) {
      console.error("[runAiNarrativePreviewAction] provider failed", { reason: "text_provider_error" });
      const timingsMs = { retrieval: retrievalMs, generation: Date.now() - generationStartedAt, total: Date.now() - startedAt } as const;
      const safeOutput = buildProviderUnavailablePreviewOutput();
      const persisted = await persistPreviewTestRun(admin, {
        campaignId: validated.campaignId,
        requestedBy: access.userId,
        kind: "narrative_text",
        mode: retrieval.mode,
        inputNormalized: validated.input,
        status: "failed",
        classification: "provider_unavailable",
        outputText: safeOutput,
        outputRef: null,
        sources: sourceRefs,
        metadata: { sourceCount: sources.length, semantic: retrieval.semantic },
        timingsMs,
      });
      return {
        success: true,
        data: {
          runId: persisted.runId,
          kind: "narrative_text",
          mode: retrieval.mode,
          status: "failed",
          classification: "provider_unavailable",
          outputText: safeOutput,
          sources,
          timingsMs,
          auditPersisted: persisted.auditPersisted,
          provider: providerInfo.provider,
          model: providerInfo.model,
        },
      };
    }

    const validation = validateNarrativePreviewOutput(outputText, new Set(sources.map((source) => source.evidenceId)));
    const generationMs = Date.now() - generationStartedAt;
    const timingsMs = { retrieval: retrievalMs, generation: generationMs, total: Date.now() - startedAt } as const;
    const valid = validation.ok;
    const safeOutput = valid ? validation.output : buildProviderUnavailablePreviewOutput();
    const status = valid ? "completed" : "failed";
    const classification = valid ? "grounded_proposal" : "provider_unavailable";
    if (!valid) console.warn("[runAiNarrativePreviewAction] invalid grounded output", { reason: validation.reason });
    const persisted = await persistPreviewTestRun(admin, {
      campaignId: validated.campaignId,
      requestedBy: access.userId,
      kind: "narrative_text",
      mode: retrieval.mode,
      inputNormalized: validated.input,
      status,
      classification,
      outputText: safeOutput,
      outputRef: null,
      sources: sourceRefs,
      metadata: { sourceCount: sources.length, semantic: retrieval.semantic },
      timingsMs,
    });
    return {
      success: true,
      data: {
        runId: persisted.runId,
        kind: "narrative_text",
        mode: retrieval.mode,
        status,
        classification,
        outputText: safeOutput,
        sources,
        timingsMs,
        auditPersisted: persisted.auditPersisted,
        promptSent: prompt,
        provider: providerInfo.provider,
        model: providerInfo.model,
      },
    };
  } catch (error) {
    console.error("[runAiNarrativePreviewAction] retrieval failed", { reason: "retrieval_error" });
    const timingsMs = { retrieval: Date.now() - retrievalStartedAt, generation: null, total: Date.now() - startedAt } as const;
    const outputText = "La memoria campagna non è disponibile per questa preview. Nessun provider è stato chiamato.";
    const persisted = await persistPreviewTestRun(admin, {
      campaignId: validated.campaignId,
      requestedBy: access.userId,
      kind: "narrative_text",
      mode: "retrieval_error",
      inputNormalized: validated.input,
      status: "failed",
      classification: "grounding_insufficient",
      outputText,
      outputRef: null,
      sources: [],
      metadata: { sourceCount: 0, providerCalled: false },
      timingsMs,
    });
    return {
      success: true,
      data: {
        runId: persisted.runId,
        kind: "narrative_text",
        mode: "retrieval_error",
        status: "failed",
        classification: "grounding_insufficient",
        outputText,
        sources: [],
        timingsMs,
        auditPersisted: persisted.auditPersisted,
        provider: providerInfo.provider,
        model: providerInfo.model,
      },
    };
  }
}
