import type {
  AiMemoryPreviewClassification,
  AiMemoryPreviewClaim,
  AiMemoryPreviewFeedbackRating,
  AiMemoryPreviewSource,
} from "./contracts";
import { AI_MEMORY_PREVIEW_CLASSIFICATIONS, AI_MEMORY_PREVIEW_FEEDBACK_RATINGS } from "./contracts";

// ── Limiti ──

export const AI_MEMORY_PREVIEW_QUESTION_MIN_LENGTH = 3;
export const AI_MEMORY_PREVIEW_QUESTION_MAX_LENGTH = 2000;
export const AI_MEMORY_PREVIEW_FEEDBACK_NOTE_MAX_LENGTH = 2000;
export const AI_MEMORY_PREVIEW_ANSWER_MAX_LENGTH = 8000;
export const AI_MEMORY_PREVIEW_CONTEXT_CHAR_BUDGET = 12000;
export const AI_MEMORY_PREVIEW_CONTEXT_CHUNK_LIMIT = 14;

// ── Messaggi sicuri (non espongono segreti) ──

export const AI_MEMORY_PREVIEW_MESSAGES = {
  unauthenticated: "Devi essere autenticato.",
  forbiddenRole: "Solo gli Admin possono usare la preview della memoria.",
  campaignNotFound: "Campagna non trovata.",
  notLongCampaign: "La preview è disponibile solo per campagne lunghe.",
  featureDisabled: "La preview memoria è disattivata su questo ambiente.",
  emptyQuestion: "Inserisci una domanda.",
  questionTooShort: `La domanda deve avere almeno ${AI_MEMORY_PREVIEW_QUESTION_MIN_LENGTH} caratteri.`,
  questionTooLong: `La domanda è troppo lunga (max ${AI_MEMORY_PREVIEW_QUESTION_MAX_LENGTH} caratteri).`,
  invalidCampaignId: "Identificativo campagna non valido.",
  insufficientEvidence: "Non ho trovato elementi abbastanza pertinenti nella memoria indicizzata della campagna.",
  providerUnavailable:
    "Servizio AI temporaneamente non disponibile. Di seguito gli estratti più rilevanti trovati, senza sintesi non validata.",
  invalidFeedbackRating: "Valutazione non valida.",
  feedbackNoteTooLong: `La nota è troppo lunga (max ${AI_MEMORY_PREVIEW_FEEDBACK_NOTE_MAX_LENGTH} caratteri).`,
  runNotFound: "Run non trovato.",
  feedbackAlreadyGiven: "Feedback già registrato per questo run.",
} as const;

// ── Validazione input ──

export type PolicyValidationResult =
  | { ok: true; normalizedQuestion: string; normalizedCampaignId: string }
  | { ok: false; message: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCampaignId(campaignId: string): { ok: true; normalized: string } | { ok: false; message: string } {
  const trimmed = campaignId.trim();
  if (!trimmed || !UUID_RE.test(trimmed)) {
    return { ok: false, message: AI_MEMORY_PREVIEW_MESSAGES.invalidCampaignId };
  }
  return { ok: true, normalized: trimmed };
}

export function validateQuestion(question: string): { ok: true; normalized: string } | { ok: false; message: string } {
  const normalized = question.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { ok: false, message: AI_MEMORY_PREVIEW_MESSAGES.emptyQuestion };
  }
  if (normalized.length < AI_MEMORY_PREVIEW_QUESTION_MIN_LENGTH) {
    return { ok: false, message: AI_MEMORY_PREVIEW_MESSAGES.questionTooShort };
  }
  if (normalized.length > AI_MEMORY_PREVIEW_QUESTION_MAX_LENGTH) {
    return { ok: false, message: AI_MEMORY_PREVIEW_MESSAGES.questionTooLong };
  }
  return { ok: true, normalized };
}

export function validatePreviewRequest(
  campaignId: string,
  question: string
): PolicyValidationResult {
  const cid = validateCampaignId(campaignId);
  if (!cid.ok) return { ok: false, message: cid.message };
  const q = validateQuestion(question);
  if (!q.ok) return { ok: false, message: q.message };
  return { ok: true, normalizedCampaignId: cid.normalized, normalizedQuestion: q.normalized };
}

export function validateFeedbackNote(note: string | null | undefined): { ok: true; normalized: string | null } | { ok: false; message: string } {
  if (note == null || note.trim() === "") return { ok: true, normalized: null };
  const trimmed = note.trim();
  if (trimmed.length > AI_MEMORY_PREVIEW_FEEDBACK_NOTE_MAX_LENGTH) {
    return { ok: false, message: AI_MEMORY_PREVIEW_MESSAGES.feedbackNoteTooLong };
  }
  return { ok: true, normalized: trimmed };
}

export function isValidFeedbackRating(value: string): value is AiMemoryPreviewFeedbackRating {
  return (AI_MEMORY_PREVIEW_FEEDBACK_RATINGS as readonly string[]).includes(value);
}

export function isValidClassification(value: string): value is AiMemoryPreviewClassification {
  return (AI_MEMORY_PREVIEW_CLASSIFICATIONS as readonly string[]).includes(value);
}

// ── Guardrail: evidence ↔ claim ──

export type ClaimValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Ogni claim di una risposta `answered` deve avere almeno un evidenceId valido.
 * evidenceIds non presenti nella lista fonti -> fail.
 */
export function validateClaims(
  claims: AiMemoryPreviewClaim[],
  sources: AiMemoryPreviewSource[]
): ClaimValidationResult {
  if (!claims.length) return { ok: false, reason: "Nessun claim presente." };
  const validIds = new Set(sources.map((s) => s.evidenceId));
  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i]!;
    if (!claim.text?.trim()) {
      return { ok: false, reason: `Claim ${i + 1} vuoto.` };
    }
    if (!claim.evidenceIds?.length) {
      return { ok: false, reason: `Claim ${i + 1} senza evidenceId.` };
    }
    for (const eid of claim.evidenceIds) {
      if (!validIds.has(eid)) {
        return { ok: false, reason: `Claim ${i + 1} referenzia evidenceId sconosciuto: ${eid}.` };
      }
    }
  }
  return { ok: true };
}

/**
 * Totale caratteri di contesto ammesso. Oltre il budget si tronca.
 */
export function fitsContextBudget(totalChars: number): boolean {
  return totalChars <= AI_MEMORY_PREVIEW_CONTEXT_CHAR_BUDGET;
}

// ── Deterministic answers ──

export function buildInsufficientEvidenceAnswer(question: string): string {
  return `${AI_MEMORY_PREVIEW_MESSAGES.insufficientEvidence} Domanda: "${question.trim()}"`;
}

export function buildProviderFallbackAnswer(sources: AiMemoryPreviewSource[], question: string): string {
  const header = `${AI_MEMORY_PREVIEW_MESSAGES.providerUnavailable} Domanda: "${question.trim()}"`;
  if (!sources.length) return header;
  const bullets = sources.slice(0, 3).map((s, i) => `- [${i + 1}] ${s.title} (${s.sourceType})`);
  return [header, "", "Fonti recuperate:", ...bullets].join("\n");
}

// ── Feature flag ──

export function isPreviewEnabled(): boolean {
  return process.env.AI_MEMORY_PREVIEW_ENABLED?.trim().toLowerCase() === "true";
}
