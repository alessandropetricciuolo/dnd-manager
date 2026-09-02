"use server";

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { checkAiMemoryPreviewAccess, checkAiMemoryPreviewActorAccess } from "@/lib/ai-core/access";
import { retrievePreviewMemory } from "@/lib/ai-core/campaign-memory-retriever";
import { generateGroundedAnswer } from "@/lib/ai-core/grounded-answer";
import { createAiMemoryPreviewRun, submitAiMemoryPreviewFeedback } from "@/lib/ai-core/preview-audit";
import {
  validatePreviewRequest,
  validateFeedbackNote,
  isValidFeedbackRating,
  AI_MEMORY_PREVIEW_MESSAGES,
} from "@/lib/ai-core/policy";
import type {
  AiMemoryPreviewResult,
  AiMemoryPreviewSourceRef,
} from "@/lib/ai-core/contracts";

export type RunAiMemoryPreviewActionResult =
  | { success: true; data: AiMemoryPreviewResult }
  | { success: false; message: string };

export type SubmitPreviewFeedbackResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function runAiMemoryPreviewAction(
  campaignId: string,
  question: string
): Promise<RunAiMemoryPreviewActionResult> {
  const totalStart = Date.now();

  // 1) Validazione input pura — prima di qualsiasi I/O costoso
  const validated = validatePreviewRequest(campaignId, question);
  if (!validated.ok) {
    return { success: false, message: validated.message };
  }
  const { normalizedCampaignId, normalizedQuestion } = validated;

  // 2) Guard Admin + long — blocca prima di embedding/provider/audit
  const access = await checkAiMemoryPreviewAccess(normalizedCampaignId);
  if (!access.ok) {
    return { success: false, message: access.message };
  }

  const admin = createSupabaseAdminClient();

  // 3) Retrieval
  const retrievalStart = Date.now();
  let retrieve;
  try {
    retrieve = await retrievePreviewMemory(admin, normalizedCampaignId, normalizedQuestion);
  } catch {
    console.error("[runAiMemoryPreviewAction] retrieval failed", { reason: "retrieval_error" });
    return { success: false, message: "Errore durante il recupero delle fonti. Riprova." };
  }
  const retrievalMs = Date.now() - retrievalStart;
  console.info("[ai-memory-preview] semantic retrieval", {
    mode: retrieve.mode,
    provider: retrieve.semantic.provider,
    step: retrieve.semantic.step,
    status: retrieve.semantic.status,
    reason: retrieve.semantic.reason,
    rpcCategory: retrieve.semantic.rpcCategory,
  });

  // 4) Generazione grounded (deterministica se nessuna fonte)
  const generationStart = Date.now();
  let grounded;
  try {
    grounded = await generateGroundedAnswer(normalizedQuestion, retrieve.chunks, retrieve.sources);
  } catch {
    console.error("[runAiMemoryPreviewAction] grounded generation failed", { reason: "generation_error" });
    return { success: false, message: "Errore durante la generazione della risposta. Riprova." };
  }
  // Deterministico senza fonti -> generation null per contratto
  const finalGenerationMs: number | null =
    retrieve.chunks.length === 0 ? null : Date.now() - generationStart;

  const totalMs = Date.now() - totalStart;

  // 5) Audit — solo riferimenti, mai contenuto chunk
  const sourceRefs: AiMemoryPreviewSourceRef[] = retrieve.sources.map((s) => ({
    evidenceId: s.evidenceId,
    sourceType: s.sourceType,
    sourceId: s.sourceId,
    title: s.title,
    similarity: s.similarity,
  }));

  const retrievalPayload = {
    mode: retrieve.mode,
    chunkCount: retrieve.chunkCount,
    retrievedChunkCount: retrieve.retrievedChunkCount,
    contextChunkCount: retrieve.contextChunkCount,
    semantic: retrieve.semantic,
  };

  const timingsPayload = {
    retrieval: retrievalMs,
    generation: finalGenerationMs,
    total: totalMs,
  };

  let runId: string;
  try {
    const inserted = await createAiMemoryPreviewRun(admin, {
      campaignId: normalizedCampaignId,
      requestedBy: access.userId,
      question: normalizedQuestion,
      status: grounded.status,
      classification: grounded.classification,
      answer: grounded.answer,
      sourceRefs,
      retrieval: retrievalPayload,
      timingsMs: timingsPayload,
    });
    runId = inserted.id;
  } catch {
    console.error("[runAiMemoryPreviewAction] audit insert failed", { reason: "audit_insert_error" });
    // Anche se audit fallisce, restituiamo comunque il risultato con runId temporaneo per non bloccare l'Admin.
    runId = `preview-audit-failed-${Date.now()}`;
  }

  const result: AiMemoryPreviewResult = {
    runId,
    status: grounded.status,
    classification: grounded.classification,
    answer: grounded.answer,
    claims: grounded.claims,
    sources: retrieve.sources,
    retrieval: retrievalPayload,
    timingsMs: timingsPayload,
  };

  return { success: true, data: result };
}

export async function submitAiMemoryPreviewFeedbackAction(
  runId: string,
  rating: string,
  note: string | null
): Promise<SubmitPreviewFeedbackResult> {
  const trimmedRunId = runId.trim();
  if (!trimmedRunId) {
    return { success: false, message: AI_MEMORY_PREVIEW_MESSAGES.runNotFound };
  }
  if (!isValidFeedbackRating(rating)) {
    return { success: false, message: AI_MEMORY_PREVIEW_MESSAGES.invalidFeedbackRating };
  }
  const noteValidated = validateFeedbackNote(note);
  if (!noteValidated.ok) {
    return { success: false, message: noteValidated.message };
  }

  // Guard: solo Admin; il feedback non riesegue la domanda.
  // Verifichiamo auth/ruolo prima di interrogare l'audit per evitare leak su run esistenti.
  const actor = await checkAiMemoryPreviewActorAccess();
  if (!actor.ok) return { success: false, message: actor.message };

  const admin = createSupabaseAdminClient();
  try {
    await submitAiMemoryPreviewFeedback(admin, trimmedRunId, actor.userId, {
      rating: rating as import("@/lib/ai-core/contracts").AiMemoryPreviewFeedbackRating,
      note: noteValidated.normalized,
    });
    return { success: true, message: "Feedback registrato. Grazie!" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Errore durante il salvataggio del feedback.";
    console.error("[submitAiMemoryPreviewFeedbackAction]", e);
    // Messaggi sicuri
    if (msg.includes("Non autorizzato")) return { success: false, message: msg };
    if (msg.includes("già registrato")) return { success: false, message: AI_MEMORY_PREVIEW_MESSAGES.feedbackAlreadyGiven };
    if (msg.includes("Run non trovato")) return { success: false, message: AI_MEMORY_PREVIEW_MESSAGES.runNotFound };
    return { success: false, message: "Errore durante il salvataggio del feedback. Riprova." };
  }
}
