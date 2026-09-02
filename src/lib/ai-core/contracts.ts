import type { CampaignMemorySourceType } from "@/lib/campaign-memory-indexer";

// ── Input ──

export type AiMemoryPreviewRequest = {
  campaignId: string;
  question: string;
};

// ── Classificazione & stato ──

export const AI_MEMORY_PREVIEW_CLASSIFICATIONS = [
  "fatto_canonico",
  "informazione_assente",
  "conflitto",
] as const;

export type AiMemoryPreviewClassification = (typeof AI_MEMORY_PREVIEW_CLASSIFICATIONS)[number];

export const AI_MEMORY_PREVIEW_STATUSES = [
  "answered",
  "insufficient_evidence",
  "failed",
] as const;

export type AiMemoryPreviewStatus = (typeof AI_MEMORY_PREVIEW_STATUSES)[number];

export const AI_MEMORY_PREVIEW_RETRIEVAL_MODES = [
  "semantic",
  "lexical_fallback",
  "none",
] as const;

export type AiMemoryPreviewRetrievalMode = (typeof AI_MEMORY_PREVIEW_RETRIEVAL_MODES)[number];

export const AI_MEMORY_PREVIEW_SEMANTIC_STATUSES = [
  "success",
  "no_match",
  "error",
] as const;

export type AiMemoryPreviewSemanticStatus = (typeof AI_MEMORY_PREVIEW_SEMANTIC_STATUSES)[number];

export const AI_MEMORY_PREVIEW_SEMANTIC_FAILURE_REASONS = [
  "missing_api_key",
  "embedding_error",
  "invalid_embedding",
  "rpc_error",
  "invalid_response",
  "no_match",
  "unknown",
] as const;

export type AiMemoryPreviewSemanticFailureReason =
  (typeof AI_MEMORY_PREVIEW_SEMANTIC_FAILURE_REASONS)[number];

export const AI_MEMORY_PREVIEW_RPC_FAILURE_CATEGORIES = [
  "function_missing",
  "permission_or_schema_cache",
  "dimension_mismatch",
  "timeout_or_network",
  "unknown",
] as const;

export type AiMemoryPreviewRpcFailureCategory =
  (typeof AI_MEMORY_PREVIEW_RPC_FAILURE_CATEGORIES)[number];

export type AiMemoryPreviewSemanticDiagnostic = {
  provider: "openrouter" | "supabase";
  step: "embedding" | "rpc";
  status: AiMemoryPreviewSemanticStatus;
  reason: AiMemoryPreviewSemanticFailureReason | null;
  rpcCategory?: AiMemoryPreviewRpcFailureCategory;
};

// ── Feedback ──

export const AI_MEMORY_PREVIEW_FEEDBACK_RATINGS = [
  "approved",
  "needs_review",
  "incorrect",
] as const;

export type AiMemoryPreviewFeedbackRating = (typeof AI_MEMORY_PREVIEW_FEEDBACK_RATINGS)[number];

// ── Evidence & claim ──

export type AiMemoryPreviewSource = {
  evidenceId: string;
  sourceType: CampaignMemorySourceType;
  sourceId: string;
  title: string;
  href: string;
  similarity: number | null;
};

export type AiMemoryPreviewClaim = {
  text: string;
  evidenceIds: string[];
};

// ── Retrieval & timings ──

export type AiMemoryPreviewRetrieval = {
  mode: AiMemoryPreviewRetrievalMode;
  chunkCount: number;
  retrievedChunkCount: number;
  contextChunkCount: number;
  semantic: AiMemoryPreviewSemanticDiagnostic;
};

export type AiMemoryPreviewTimings = {
  retrieval: number;
  generation: number | null;
  total: number;
};

// ── Result ──

export type AiMemoryPreviewResult = {
  runId: string;
  status: AiMemoryPreviewStatus;
  classification: AiMemoryPreviewClassification;
  answer: string;
  claims: AiMemoryPreviewClaim[];
  sources: AiMemoryPreviewSource[];
  retrieval: AiMemoryPreviewRetrieval;
  timingsMs: AiMemoryPreviewTimings;
};

// ── Audit persistence (DB row shape) ──

export type AiMemoryPreviewSourceRef = {
  evidenceId: string;
  sourceType: CampaignMemorySourceType;
  sourceId: string;
  title: string;
  similarity: number | null;
};

export type AiMemoryPreviewRunRow = {
  id: string;
  campaign_id: string;
  requested_by: string;
  mode: string;
  question: string;
  status: AiMemoryPreviewStatus;
  classification: AiMemoryPreviewClassification;
  answer: string;
  source_refs: AiMemoryPreviewSourceRef[];
  retrieval: AiMemoryPreviewRetrieval;
  timings_ms: AiMemoryPreviewTimings;
  feedback_rating: AiMemoryPreviewFeedbackRating | null;
  feedback_note: string | null;
  created_at: string;
  feedback_at: string | null;
};

// ── Structured LLM output (raw) ──

export type AiMemoryPreviewStructuredOutput = {
  classification: AiMemoryPreviewClassification;
  answer: string;
  claims: AiMemoryPreviewClaim[];
};

// ── Laboratorio Admin: capacità aggiuntive ──

export const AI_PREVIEW_TEST_KINDS = ["narrative_text", "official_rules", "grounded_image"] as const;
export type AiPreviewTestKind = (typeof AI_PREVIEW_TEST_KINDS)[number];

export const AI_PREVIEW_TEST_STATUSES = ["completed", "insufficient_evidence", "failed"] as const;
export type AiPreviewTestStatus = (typeof AI_PREVIEW_TEST_STATUSES)[number];

export const AI_PREVIEW_TEST_CLASSIFICATIONS = [
  "grounded_proposal",
  "grounding_insufficient",
  "official_rule_found",
  "official_rule_not_found",
  "provider_unavailable",
] as const;
export type AiPreviewTestClassification = (typeof AI_PREVIEW_TEST_CLASSIFICATIONS)[number];

export type AiPreviewTestSource = {
  evidenceId: string;
  sourceType: "campaign_memory" | "manual" | "rules_catalog";
  sourceId: string;
  title: string;
  href: string | null;
  sourceBook?: string | null;
  similarity?: number | null;
};

export type AiPreviewTestTimings = {
  retrieval: number;
  generation: number | null;
  total: number;
};

export type AiPreviewTestResult = {
  runId: string;
  kind: AiPreviewTestKind;
  mode: string;
  status: AiPreviewTestStatus;
  classification: AiPreviewTestClassification;
  outputText: string;
  sources: AiPreviewTestSource[];
  timingsMs: AiPreviewTestTimings;
  auditPersisted: boolean;
  promptSent?: string;
  provider?: string;
  model?: string;
  imageUrl?: string;
  imageBase64?: string;
};

export type AiPreviewTestSourceRef = Omit<AiPreviewTestSource, "href">;

export type AiPreviewTestRunRow = {
  id: string;
  campaign_id: string | null;
  requested_by: string;
  kind: AiPreviewTestKind;
  mode: string;
  input_normalized: string;
  status: AiPreviewTestStatus;
  classification: AiPreviewTestClassification;
  output_text: string | null;
  output_ref: Record<string, unknown> | null;
  sources: AiPreviewTestSourceRef[];
  metadata: Record<string, unknown>;
  timings_ms: AiPreviewTestTimings;
  feedback_rating: AiMemoryPreviewFeedbackRating | null;
  feedback_note: string | null;
  feedback_at: string | null;
  created_at: string;
};
