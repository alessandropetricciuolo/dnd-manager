import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

import { isAllowedPreviewRole } from "../access";
import { buildImagePreviewPrompt, buildInsufficientMemoryPreviewOutput, safeImageOutputReference, validateNarrativePreviewOutput } from "../preview-test-grounding";
import { toPreviewTestSourceRefs } from "../preview-test-audit";
import { validatePreviewTestFeedback, validatePreviewTestRequest } from "../preview-test-policy";

const ACTION_FILES = [
  "src/lib/actions/ai-narrative-preview-actions.ts",
  "src/lib/actions/ai-rules-preview-actions.ts",
  "src/lib/actions/ai-image-preview-actions.ts",
];

test("nuove Server Actions: Admin sì, GM/player no prima del provider", async () => {
  assert.equal(isAllowedPreviewRole("admin"), true);
  assert.equal(isAllowedPreviewRole("gm"), false);
  assert.equal(isAllowedPreviewRole("player"), false);
  for (const file of ACTION_FILES) {
    const content = await fs.readFile(file, "utf8");
    assert.match(content, /checkAiMemoryPreviewAccess/);
    assert.match(content, /validatePreviewTestRequest/);
  }
});

test("input normalizzato e validato prima di retrieval/provider", () => {
  assert.equal(validatePreviewTestRequest("not-uuid", "brief valido").ok, false);
  const normalized = validatePreviewTestRequest("550e8400-e29b-41d4-a716-446655440000", "  scena   breve  ");
  assert.equal(normalized.ok, true);
  if (normalized.ok) assert.equal(normalized.input, "scena breve");
  assert.equal(validatePreviewTestRequest("550e8400-e29b-41d4-a716-446655440000", "ab").ok, false);
});

test("narrativa: fonti assenti e citazioni invalide non producono una proposta libera", () => {
  assert.match(buildInsufficientMemoryPreviewOutput(), /Nessun provider è stato chiamato/);
  assert.equal(validateNarrativePreviewOutput("PROPOSTA NON CANONICA: scena [E9]", new Set(["E1"])).ok, false);
  const valid = validateNarrativePreviewOutput("PROPOSTA NON CANONICA: scena grounded [E1]", new Set(["E1"]));
  assert.equal(valid.ok, true);
});

test("immagine: il prompt è grounded e l'errore non serializza payload o binari", () => {
  const prompt = buildImagePreviewPrompt("Una torre sul mare", [], []);
  assert.match(prompt, /TEST IMAGE PREVIEW/);
  assert.match(prompt, /Una torre sul mare/);
  const ref = safeImageOutputReference({ provider: "openrouter", model: "test-model", outputBase64: "data:image/png;base64,SENSITIVE_BINARY" });
  const serialized = JSON.stringify(ref);
  assert.doesNotMatch(serialized, /SENSITIVE_BINARY/);
  assert.equal(ref.outputKind, "data_url");
});

test("regole: il laboratorio dichiara il corpus ufficiale e non consulta house rule", async () => {
  const action = await fs.readFile("src/lib/actions/ai-rules-preview-actions.ts", "utf8");
  assert.match(action, /rules_catalog/);
  assert.match(action, /searchManualsSemanticAction/);
  assert.match(action, /houseRulesConsulted: false/);
});

test("audit: source refs senza chunk, ownership e singola valutazione", async () => {
  const refs = toPreviewTestSourceRefs([{
    evidenceId: "E1",
    sourceType: "campaign_memory",
    sourceId: "wiki-1",
    title: "Portico",
    href: "/campaigns/c/wiki/wiki-1",
    content: "SEGRETO-CHUNK-NON-AUDITATO",
  } as never]);
  assert.doesNotMatch(JSON.stringify(refs), /SEGRETO-CHUNK-NON-AUDITATO/);
  const audit = await fs.readFile("src/lib/ai-core/preview-test-audit.ts", "utf8");
  assert.match(audit, /eq\("requested_by", requestedBy\)/);
  assert.match(audit, /is\("feedback_rating", null\)/);
  assert.equal(validatePreviewTestFeedback("approved", "nota").ok, true);
  assert.equal(validatePreviewTestFeedback("approved", "x".repeat(2001)).ok, false);
  const feedbackAction = await fs.readFile("src/lib/actions/ai-preview-test-feedback-actions.ts", "utf8");
  assert.match(feedbackAction, /checkAiMemoryPreviewActorAccess/);
});

test("nessuna nuova capability scrive il canone o carica immagini come asset", async () => {
  for (const file of [...ACTION_FILES, "src/lib/ai-core/preview-test-grounding.ts"]) {
    const content = await fs.readFile(file, "utf8");
    assert.doesNotMatch(content, /uploadToTelegram|revalidatePath|from\("wiki_entities"\)|from\("missions"\)|from\("campaign_characters"\)/);
    assert.doesNotMatch(content, /from\("campaign_memory_chunks"\)[\s\S]*?\.(insert|update|delete)\(/);
  }
});

test("migration audit è service-role-only e output_ref non può contenere binary", async () => {
  const migration = await fs.readFile("supabase/migrations/20260902140000_ai_preview_test_runs.sql", "utf8");
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.ai_preview_test_runs/);
  assert.match(migration, /REVOKE ALL ON public\.ai_preview_test_runs FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT ALL ON public\.ai_preview_test_runs TO service_role/);
  assert.match(migration, /output_ref jsonb/);
  assert.match(migration, /Non contiene chunk di memoria né payload binari/);
});
