import test from "node:test";
import assert from "node:assert/strict";

import {
  validateCampaignId,
  validateQuestion,
  validatePreviewRequest,
  validateFeedbackNote,
  isValidFeedbackRating,
  isValidClassification,
  validateClaims,
  buildInsufficientEvidenceAnswer,
  buildProviderFallbackAnswer,
  isPreviewEnabled,
  AI_MEMORY_PREVIEW_QUESTION_MAX_LENGTH,
} from "../policy";
import type { AiMemoryPreviewSource, AiMemoryPreviewClaim } from "../contracts";

test("validateCampaignId rejects empty and non-uuid", () => {
  assert.equal(validateCampaignId("").ok, false);
  assert.equal(validateCampaignId("not-a-uuid").ok, false);
  assert.equal(validateCampaignId("123").ok, false);
});

test("validateCampaignId accepts uuid", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const res = validateCampaignId(uuid);
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.normalized, uuid);
});

test("validateQuestion rejects empty and too short", () => {
  assert.equal(validateQuestion("").ok, false);
  assert.equal(validateQuestion("  ").ok, false);
  assert.equal(validateQuestion("ab").ok, false);
});

test("validateQuestion rejects too long", () => {
  const long = "a".repeat(AI_MEMORY_PREVIEW_QUESTION_MAX_LENGTH + 1);
  const res = validateQuestion(long);
  assert.equal(res.ok, false);
});

test("validateQuestion normalizes whitespace", () => {
  const res = validateQuestion("  Chi  governa  Portico?  ");
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.normalized, "Chi governa Portico?");
});

test("validatePreviewRequest combines campaignId and question", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const ok = validatePreviewRequest(uuid, "Chi governa Portico?");
  assert.equal(ok.ok, true);
  const bad = validatePreviewRequest("bad-id", "Chi governa Portico?");
  assert.equal(bad.ok, false);
  const emptyQ = validatePreviewRequest(uuid, "");
  assert.equal(emptyQ.ok, false);
});

test("validateFeedbackNote allows null/empty and rejects too long", () => {
  assert.deepEqual(validateFeedbackNote(null), { ok: true, normalized: null });
  assert.deepEqual(validateFeedbackNote("   "), { ok: true, normalized: null });
  const ok = validateFeedbackNote(" utile ");
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.normalized, "utile");
  const long = "x".repeat(2001);
  assert.equal(validateFeedbackNote(long).ok, false);
});

test("isValidFeedbackRating and isValidClassification", () => {
  assert.equal(isValidFeedbackRating("approved"), true);
  assert.equal(isValidFeedbackRating("needs_review"), true);
  assert.equal(isValidFeedbackRating("incorrect"), true);
  assert.equal(isValidFeedbackRating("wrong"), false);
  assert.equal(isValidClassification("fatto_canonico"), true);
  assert.equal(isValidClassification("informazione_assente"), true);
  assert.equal(isValidClassification("conflitto"), true);
  assert.equal(isValidClassification("altro"), false);
});

test("validateClaims requires evidenceId valid and non-empty", () => {
  const sources: AiMemoryPreviewSource[] = [
    { evidenceId: "E1", sourceType: "wiki", sourceId: "s1", title: "Portico", href: "/c/1/wiki/s1", similarity: 0.9 },
    { evidenceId: "E2", sourceType: "wiki", sourceId: "s2", title: "Folki", href: "/c/1/wiki/s2", similarity: 0.8 },
  ];
  const good: AiMemoryPreviewClaim[] = [{ text: "Portico è governato dal Concilio", evidenceIds: ["E1"] }];
  assert.equal(validateClaims(good, sources).ok, true);

  const emptyClaims: AiMemoryPreviewClaim[] = [];
  assert.equal(validateClaims(emptyClaims, sources).ok, false);

  const missingEvidence: AiMemoryPreviewClaim[] = [{ text: "x", evidenceIds: [] }];
  assert.equal(validateClaims(missingEvidence, sources).ok, false);

  const unknownId: AiMemoryPreviewClaim[] = [{ text: "x", evidenceIds: ["E99"] }];
  const res2 = validateClaims(unknownId, sources);
  assert.equal(res2.ok, false);
  if (!res2.ok) assert.match(res2.reason, /sconosciuto/);

  const emptyText: AiMemoryPreviewClaim[] = [{ text: "   ", evidenceIds: ["E1"] }];
  assert.equal(validateClaims(emptyText, sources).ok, false);
});

test("buildInsufficientEvidenceAnswer and buildProviderFallbackAnswer", () => {
  const q = "Chi è Vhalzar?";
  const msg = buildInsufficientEvidenceAnswer(q);
  assert.match(msg, /Non ho trovato/);
  assert.match(msg, /Vhalzar/);
  const sources: AiMemoryPreviewSource[] = [
    { evidenceId: "E1", sourceType: "wiki", sourceId: "s1", title: "Portico", href: "/c/1/wiki/s1", similarity: 0.9 },
  ];
  const fallback = buildProviderFallbackAnswer(sources, q);
  assert.match(fallback, /temporaneamente non disponibile/);
  assert.match(fallback, /Portico/);
  const emptyFallback = buildProviderFallbackAnswer([], q);
  assert.match(emptyFallback, /temporaneamente non disponibile/);
});

test("isPreviewEnabled respects env", () => {
  const prev = process.env.AI_MEMORY_PREVIEW_ENABLED;
  process.env.AI_MEMORY_PREVIEW_ENABLED = "true";
  assert.equal(isPreviewEnabled(), true);
  process.env.AI_MEMORY_PREVIEW_ENABLED = "TRUE";
  assert.equal(isPreviewEnabled(), true);
  process.env.AI_MEMORY_PREVIEW_ENABLED = "false";
  assert.equal(isPreviewEnabled(), false);
  process.env.AI_MEMORY_PREVIEW_ENABLED = "";
  assert.equal(isPreviewEnabled(), false);
  delete process.env.AI_MEMORY_PREVIEW_ENABLED;
  assert.equal(isPreviewEnabled(), false);
  if (prev === undefined) delete process.env.AI_MEMORY_PREVIEW_ENABLED;
  else process.env.AI_MEMORY_PREVIEW_ENABLED = prev;
});
