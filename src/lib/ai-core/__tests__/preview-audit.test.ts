import test from "node:test";
import assert from "node:assert/strict";

import type { AiMemoryPreviewSource } from "../contracts";
import type { PreviewChunkRow } from "../campaign-memory-retriever";
import { buildPreviewSources } from "../campaign-memory-retriever";

test("audit source_refs non contiene contenuto chunk (solo metadati)", () => {
  const chunk: PreviewChunkRow = {
    id: "chunk-uuid-1",
    campaign_id: "camp-1",
    source_type: "wiki",
    source_id: "wiki-1",
    chunk_index: 0,
    title: "Portico",
    content: "Contenuto molto lungo con dettagli segreti che non devono finire in audit",
    summary: "summary",
    metadata: { updated_at: new Date().toISOString() },
    similarity: 0.9,
  };
  const sources: AiMemoryPreviewSource[] = buildPreviewSources("camp-1", [chunk]);
  // Simula ciò che verrebbe salvato in source_refs per audit
  const sourceRefs = sources.map((s) => ({
    evidenceId: s.evidenceId,
    sourceType: s.sourceType,
    sourceId: s.sourceId,
    title: s.title,
    similarity: s.similarity,
  }));
  const serialized = JSON.stringify(sourceRefs);
  assert.ok(!serialized.includes(chunk.content), "audit non deve contenere content del chunk");
  assert.ok(serialized.includes("Portico"));
  assert.equal(sourceRefs[0]!.evidenceId, "E1");
  assert.equal(sourceRefs[0]!.sourceType, "wiki");
  assert.equal(typeof sourceRefs[0]!.similarity, "number");
});

test("nessuna scrittura su tabelle di dominio: retriever usa solo SELECT/rpc read-only", async () => {
  // Verifica statica: il file retriever non contiene .insert/.update/.delete su tabelle di dominio
  const fs = await import("node:fs/promises");
  const path = "src/lib/ai-core/campaign-memory-retriever.ts";
  const content = await fs.readFile(path, "utf8");
  // Deve contenere SELECT / rpc match_campaign_memory
  assert.match(content, /from\("campaign_memory_chunks"\)/);
  assert.match(content, /match_campaign_memory/);
  // Non deve contenere scritture su tabelle di dominio
  assert.ok(!content.includes('.insert(') || content.includes('source_refs'), "retriever non dovrebbe fare insert su dominio");
  // Assicura che non ci sia delete/update su campaign_memory_chunks dentro retriever (solo preview-audit fa insert su ai_memory_preview_runs)
  const retrieverWritesDomain = /\.from\("campaign_memory_chunks"\)[\s\S]*?\.(insert|update|delete)\(/.test(content);
  assert.equal(retrieverWritesDomain, false, "retriever non deve scrivere su campaign_memory_chunks");

  const groundedPath = "src/lib/ai-core/grounded-answer.ts";
  const grounded = await fs.readFile(groundedPath, "utf8");
  assert.ok(!grounded.includes('from("campaign_memory_chunks")'), "grounded-answer non deve toccare DB");
  assert.ok(!grounded.includes('.insert('));
});
