"use server";

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { checkAiMemoryPreviewActorAccess } from "@/lib/ai-core/access";
import { submitAiPreviewTestFeedback } from "@/lib/ai-core/preview-test-audit";
import { AI_PREVIEW_TEST_MESSAGES, validatePreviewTestFeedback } from "@/lib/ai-core/preview-test-policy";

export type SubmitAiPreviewTestFeedbackResult =
  | { success: true; message: string }
  | { success: false; message: string };

export async function submitAiPreviewTestFeedbackAction(
  runId: string,
  rating: string,
  note: string | null
): Promise<SubmitAiPreviewTestFeedbackResult> {
  const normalizedRunId = runId.trim();
  if (!normalizedRunId) return { success: false, message: AI_PREVIEW_TEST_MESSAGES.runNotFound };
  const validated = validatePreviewTestFeedback(rating, note);
  if (!validated.ok) return { success: false, message: validated.message };
  const actor = await checkAiMemoryPreviewActorAccess();
  if (!actor.ok) return { success: false, message: actor.message };
  try {
    await submitAiPreviewTestFeedback(createSupabaseAdminClient(), normalizedRunId, actor.userId, validated);
    return { success: true, message: "Feedback registrato. Grazie!" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("già registrato")) return { success: false, message: AI_PREVIEW_TEST_MESSAGES.feedbackAlreadyGiven };
    return { success: false, message: AI_PREVIEW_TEST_MESSAGES.runNotFound };
  }
}
