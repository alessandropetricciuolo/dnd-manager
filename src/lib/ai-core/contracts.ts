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
