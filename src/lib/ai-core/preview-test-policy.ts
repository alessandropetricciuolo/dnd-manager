import {
  AI_MEMORY_PREVIEW_FEEDBACK_RATINGS,
  type AiMemoryPreviewFeedbackRating,
} from "./contracts";
import { validateCampaignId } from "./policy";

export const AI_PREVIEW_TEST_INPUT_MIN_LENGTH = 3;
export const AI_PREVIEW_TEST_INPUT_MAX_LENGTH = 2000;
export const AI_PREVIEW_TEST_OUTPUT_MAX_LENGTH = 8000;
export const AI_PREVIEW_TEST_FEEDBACK_NOTE_MAX_LENGTH = 2000;

export const AI_PREVIEW_TEST_MESSAGES = {
  inputEmpty: "Inserisci un'istruzione o una domanda.",
  inputTooShort: `L'input deve avere almeno ${AI_PREVIEW_TEST_INPUT_MIN_LENGTH} caratteri.`,
  inputTooLong: `L'input è troppo lungo (max ${AI_PREVIEW_TEST_INPUT_MAX_LENGTH} caratteri).`,
  campaignInvalid: "Identificativo campagna non valido.",
  insufficientMemory: "Le fonti della memoria campagna non sono sufficienti per una preview grounded.",
  officialRuleNotFound: "Nessuna regola ufficiale indicizzata trovata. Non è stata inventata alcuna meccanica.",
  providerUnavailable: "Provider non disponibile: la preview non è stata generata.",
  invalidFeedback: "Valutazione non valida.",
  feedbackNoteTooLong: `La nota è troppo lunga (max ${AI_PREVIEW_TEST_FEEDBACK_NOTE_MAX_LENGTH} caratteri).`,
  runNotFound: "Run non trovata o non valutabile.",
  feedbackAlreadyGiven: "Feedback già registrato per questa run.",
} as const;

export function normalizePreviewTestInput(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function validatePreviewTestRequest(
  campaignId: string,
  input: string
): { ok: true; campaignId: string; input: string } | { ok: false; message: string } {
  const campaign = validateCampaignId(campaignId);
  if (!campaign.ok) return { ok: false, message: AI_PREVIEW_TEST_MESSAGES.campaignInvalid };
  const normalized = normalizePreviewTestInput(input);
  if (!normalized) return { ok: false, message: AI_PREVIEW_TEST_MESSAGES.inputEmpty };
  if (normalized.length < AI_PREVIEW_TEST_INPUT_MIN_LENGTH) {
    return { ok: false, message: AI_PREVIEW_TEST_MESSAGES.inputTooShort };
  }
  if (normalized.length > AI_PREVIEW_TEST_INPUT_MAX_LENGTH) {
    return { ok: false, message: AI_PREVIEW_TEST_MESSAGES.inputTooLong };
  }
  return { ok: true, campaignId: campaign.normalized, input: normalized };
}

export function validatePreviewTestFeedback(
  rating: string,
  note: string | null | undefined
): { ok: true; rating: AiMemoryPreviewFeedbackRating; note: string | null } | { ok: false; message: string } {
  if (!(AI_MEMORY_PREVIEW_FEEDBACK_RATINGS as readonly string[]).includes(rating)) {
    return { ok: false, message: AI_PREVIEW_TEST_MESSAGES.invalidFeedback };
  }
  const normalized = note?.trim() || null;
  if (normalized && normalized.length > AI_PREVIEW_TEST_FEEDBACK_NOTE_MAX_LENGTH) {
    return { ok: false, message: AI_PREVIEW_TEST_MESSAGES.feedbackNoteTooLong };
  }
  return { ok: true, rating: rating as AiMemoryPreviewFeedbackRating, note: normalized };
}

export function isSafePreviewImageOutput(value: string | undefined): boolean {
  return Boolean(value && /^(?:https?:\/\/|data:image\/)/i.test(value));
}

export function clampPreviewOutput(value: string): string {
  return value.trim().slice(0, AI_PREVIEW_TEST_OUTPUT_MAX_LENGTH);
}
