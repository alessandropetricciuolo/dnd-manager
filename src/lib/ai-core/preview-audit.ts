import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import type {
  AiMemoryPreviewClassification,
  AiMemoryPreviewFeedbackRating,
  AiMemoryPreviewRetrieval,
  AiMemoryPreviewSourceRef,
  AiMemoryPreviewStatus,
  AiMemoryPreviewTimings,
} from "./contracts";

type AdminClient = SupabaseClient<Database>;

export type CreatePreviewRunInput = {
  campaignId: string;
  requestedBy: string;
  question: string;
  status: AiMemoryPreviewStatus;
  classification: AiMemoryPreviewClassification;
  answer: string;
  sourceRefs: AiMemoryPreviewSourceRef[];
  retrieval: AiMemoryPreviewRetrieval;
  timingsMs: AiMemoryPreviewTimings;
};

export type FeedbackInput = {
  rating: AiMemoryPreviewFeedbackRating;
  note: string | null;
};

/**
 * Persistenza audit M1: unica scrittura ammessa dalla preview.
 * Non salva mai il contenuto dei chunk, solo riferimenti.
 */
export async function createAiMemoryPreviewRun(
  admin: AdminClient,
  input: CreatePreviewRunInput
): Promise<{ id: string }> {
  const { data, error } = await (admin as unknown as {
    from: (table: string) => {
      insert: (values: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("ai_memory_preview_runs")
    .insert({
      campaign_id: input.campaignId,
      requested_by: input.requestedBy,
      mode: "preview",
      question: input.question,
      status: input.status,
      classification: input.classification,
      answer: input.answer,
      source_refs: input.sourceRefs as unknown as Database["public"]["Tables"]["ai_memory_preview_runs"]["Row"]["source_refs"],
      retrieval: input.retrieval as unknown as Database["public"]["Tables"]["ai_memory_preview_runs"]["Row"]["retrieval"],
      timings_ms: input.timingsMs as unknown as Database["public"]["Tables"]["ai_memory_preview_runs"]["Row"]["timings_ms"],
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`[preview-audit] insert failed: ${error?.message ?? "unknown"}`);
  }
  return { id: data.id };
}

export async function submitAiMemoryPreviewFeedback(
  admin: AdminClient,
  runId: string,
  requestedBy: string,
  feedback: FeedbackInput
): Promise<void> {
  // Verifica che il run appartenga al richiedente e non abbia già feedback
  const { data: existing, error: fetchError } = await (admin as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: { requested_by: string; feedback_rating: string | null } | null; error: { message: string } | null }>;
          maybeSingle: () => Promise<{ data: { requested_by: string; feedback_rating: string | null } | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("ai_memory_preview_runs")
    .select("requested_by, feedback_rating")
    .eq("id", runId)
    .single();

  if (fetchError || !existing) {
    throw new Error("Run non trovato.");
  }
  if (existing.requested_by !== requestedBy) {
    throw new Error("Non autorizzato a valutare questo run.");
  }
  if (existing.feedback_rating != null) {
    throw new Error("Feedback già registrato per questo run.");
  }

  const { error } = await (admin as unknown as {
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  })
    .from("ai_memory_preview_runs")
    .update({
      feedback_rating: feedback.rating,
      feedback_note: feedback.note,
      feedback_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) {
    throw new Error(`[preview-audit] feedback failed: ${error.message}`);
  }
}

export async function getAiMemoryPreviewRun(
  admin: AdminClient,
  runId: string
): Promise<Database["public"]["Tables"]["ai_memory_preview_runs"]["Row"] | null> {
  const { data, error } = await (admin.from("ai_memory_preview_runs") as unknown as {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: Database["public"]["Tables"]["ai_memory_preview_runs"]["Row"] | null; error: { message: string } | null }>;
      };
    };
  })
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (error) throw new Error(`[preview-audit] fetch failed: ${error.message}`);
  return data;
}
