import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";
import type {
  AiMemoryPreviewFeedbackRating,
  AiPreviewTestClassification,
  AiPreviewTestKind,
  AiPreviewTestSourceRef,
  AiPreviewTestStatus,
  AiPreviewTestTimings,
} from "./contracts";

type AdminClient = SupabaseClient<Database>;

export type CreateAiPreviewTestRunInput = {
  campaignId: string | null;
  requestedBy: string;
  kind: AiPreviewTestKind;
  mode: string;
  inputNormalized: string;
  status: AiPreviewTestStatus;
  classification: AiPreviewTestClassification;
  outputText: string | null;
  outputRef: Record<string, unknown> | null;
  sources: AiPreviewTestSourceRef[];
  metadata: Record<string, unknown>;
  timingsMs: AiPreviewTestTimings;
};

export async function createAiPreviewTestRun(
  admin: AdminClient,
  input: CreateAiPreviewTestRunInput
): Promise<{ id: string }> {
  const { data, error } = await (admin as unknown as {
    from: (table: string) => {
      insert: (values: Record<string, unknown>) => {
        select: (columns: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("ai_preview_test_runs")
    .insert({
      campaign_id: input.campaignId,
      requested_by: input.requestedBy,
      kind: input.kind,
      mode: input.mode,
      input_normalized: input.inputNormalized,
      status: input.status,
      classification: input.classification,
      output_text: input.outputText,
      output_ref: input.outputRef as Json,
      sources: input.sources as unknown as Json,
      metadata: input.metadata as Json,
      timings_ms: input.timingsMs as unknown as Json,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`[preview-test-audit] insert failed: ${error?.message ?? "unknown"}`);
  return { id: data.id };
}

export async function submitAiPreviewTestFeedback(
  admin: AdminClient,
  runId: string,
  requestedBy: string,
  feedback: { rating: AiMemoryPreviewFeedbackRating; note: string | null }
): Promise<void> {
  // Aggiornamento condizionale: ownership e singola valutazione sono atomici.
  const { data, error } = await (admin as unknown as {
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: string) => {
          eq: (column: string, value: string) => {
            is: (column: string, value: null) => {
              select: (columns: string) => {
                maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
              };
            };
          };
        };
      };
    };
  })
    .from("ai_preview_test_runs")
    .update({
      feedback_rating: feedback.rating,
      feedback_note: feedback.note,
      feedback_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("requested_by", requestedBy)
    .is("feedback_rating", null)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(`[preview-test-audit] feedback failed: ${error.message}`);
  if (!data) throw new Error("Run non trovata, non autorizzata o feedback già registrato.");
}

export function toPreviewTestSourceRefs(
  sources: Array<{
    evidenceId: string;
    sourceType: "campaign_memory" | "manual" | "rules_catalog";
    sourceId: string;
    title: string;
    href?: string | null;
    sourceBook?: string | null;
    similarity?: number | null;
  }>
): AiPreviewTestSourceRef[] {
  return sources.map((source) => ({
    evidenceId: source.evidenceId,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    title: source.title,
    ...(source.sourceBook !== undefined ? { sourceBook: source.sourceBook } : {}),
    ...(source.similarity !== undefined ? { similarity: source.similarity } : {}),
  }));
}
