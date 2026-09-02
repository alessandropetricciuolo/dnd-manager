import test from "node:test";
import assert from "node:assert/strict";

import {
  tokenizeQuestion,
  significantQuestionTokens,
  questionTermOverlapBoost,
  rerankMatches,
  deduplicateBySource,
  applyContextBudget,
  buildPreviewSources,
  sourceHref,
  sourceLabel,
} from "../campaign-memory-retriever";
import type { PreviewChunkRow } from "../campaign-memory-retriever";

function makeRow(overrides: Partial<PreviewChunkRow> & { source_type: PreviewChunkRow["source_type"] }): PreviewChunkRow {
  const { source_type, ...rest } = overrides;
  return {
    id: rest.id ?? "id-" + Math.random().toString(36).slice(2, 6),
    campaign_id: "camp-1",
    source_id: rest.source_id ?? "src-1",
    chunk_index: 0,
    title: rest.title ?? "Titolo",
    content: rest.content ?? "contenuto generico",
    summary: null,
    metadata: rest.metadata ?? { updated_at: new Date().toISOString() },
    similarity: rest.similarity ?? 0.5,
    source_type,
    ...rest,
  } as PreviewChunkRow;
}

test("tokenizeQuestion normalizza e filtra stopword corte", () => {
  assert.deepEqual(tokenizeQuestion("Chi governa Portico?"), ["chi", "governa", "portico"]);
  assert.deepEqual(tokenizeQuestion("a b c"), []);
  assert.deepEqual(tokenizeQuestion("  Città di Sotto  "), ["città", "sotto"]);
});

test("significantQuestionTokens filtra >=4", () => {
  assert.deepEqual(significantQuestionTokens("Chi governa Portico?"), ["governa", "portico"]);
});

test("questionTermOverlapBoost conta hit titolo/contenuto", () => {
  const row = makeRow({ source_type: "wiki", title: "Portico", content: "Il Concilio dei Mercanti governa" });
  assert.equal(questionTermOverlapBoost("Chi governa Portico?", row), 0.4);
  const noHit = makeRow({ source_type: "wiki", title: "Folki", content: "panettiere" });
  assert.equal(questionTermOverlapBoost("Chi governa Portico?", noHit), 0);
});

test("rerankMatches spinge pg / missione / mappa in base a intento", () => {
  const wiki = makeRow({ source_type: "wiki", similarity: 0.5, title: "Portico", content: "Portico..." });
  const pg = makeRow({ source_type: "character_background", similarity: 0.5, title: "Arioch", content: "background..." });
  const mission = makeRow({ source_type: "mission", similarity: 0.5, title: "Coccatrice", content: "missione..." });

  // Intent personaggio: pg deve salire
  const rankedPg = rerankMatches("Da dove proviene Arioch?", [wiki, pg]);
  assert.equal(rankedPg[0]!.source_type, "character_background");

  // Intent missione: mission deve salire
  const rankedMission = rerankMatches("Qual è lo stato della missione Coccatrice?", [wiki, mission]);
  assert.equal(rankedMission[0]!.source_type, "mission");

  // Intent mappa: map_description deve salire
  const map = makeRow({ source_type: "map_description", similarity: 0.5, title: "Pietraverde", content: "mappa..." });
  const rankedMap = rerankMatches("Dove si trova Pietraverde sulla mappa?", [wiki, map]);
  assert.equal(rankedMap[0]!.source_type, "map_description");

  // Whisper penalizzato senza intento segreto
  const whisper = makeRow({ source_type: "secret_whisper", similarity: 0.6, title: "Whisper", content: "segreto..." });
  const rankedDefault = rerankMatches("Chi governa Portico?", [whisper, wiki]);
  // wiki dovrebbe superare whisper nonostante similarity inferiore
  assert.equal(rankedDefault[0]!.source_type, "wiki");
});

test("deduplicateBySource tiene solo primo per source", () => {
  const a1 = makeRow({ source_type: "wiki", source_id: "same", title: "A1", content: "c1" });
  const a2 = makeRow({ source_type: "wiki", source_id: "same", title: "A2", content: "c2" });
  const b = makeRow({ source_type: "wiki", source_id: "other", title: "B", content: "c3" });
  const deduped = deduplicateBySource([a1, a2, b]);
  assert.equal(deduped.length, 2);
  assert.equal(deduped[0]!.title, "A1");
  assert.equal(deduped[1]!.title, "B");
});

test("applyContextBudget rispetta limite chunk e caratteri", () => {
  const rows = Array.from({ length: 20 }, (_, i) =>
    makeRow({ source_type: "wiki", source_id: `id-${i}`, title: `T${i}`, content: "x".repeat(1000) })
  );
  const budgeted = applyContextBudget(rows, 5000, 14);
  assert.ok(budgeted.length <= 14);
  assert.ok(budgeted.length <= 5); // 5000 / 1000 = 5
  // Primo chunk sempre incluso anche se supera budget da solo
  const huge = [makeRow({ source_type: "wiki", source_id: "huge", title: "H", content: "x".repeat(20000) })];
  assert.equal(applyContextBudget(huge, 12000, 14).length, 1);
});

test("buildPreviewSources genera E1..En e href coerenti", () => {
  const rows = [
    makeRow({ source_type: "wiki", source_id: "w1", title: "Portico" }),
    makeRow({ source_type: "mission", source_id: "m1", title: "Coccatrice" }),
  ];
  const sources = buildPreviewSources("camp-xyz", rows);
  assert.equal(sources[0]!.evidenceId, "E1");
  assert.equal(sources[1]!.evidenceId, "E2");
  assert.equal(sources[0]!.href, "/campaigns/camp-xyz/wiki/w1");
  assert.equal(sources[1]!.href, "/campaigns/camp-xyz?tab=missioni");
  assert.equal(sources[0]!.sourceType, "wiki");
});

test("sourceHref e sourceLabel mappano tutti i tipi canonici", () => {
  const types: Array<PreviewChunkRow["source_type"]> = [
    "wiki",
    "character_background",
    "session_summary",
    "session_note",
    "gm_note",
    "secret_whisper",
    "map_description",
    "campaign_description",
    "campaign_ai_context",
    "mission",
  ];
  for (const t of types) {
    const row = makeRow({ source_type: t, source_id: "sid" });
    const href = sourceHref("cid", row);
    assert.ok(href.startsWith("/campaigns/cid"), `href per ${t}`);
    assert.ok(sourceLabel(t).length > 0);
  }
});

test("retriever non inserisce blocco cronologico completo: budget limita", () => {
  // Simula 20 chunk wiki da 900 chars ciascuno -> 18000 chars > budget 12000
  const many = Array.from({ length: 20 }, (_, i) =>
    makeRow({ source_type: "wiki", source_id: `w-${i}`, title: `Wiki ${i}`, content: "x".repeat(900) })
  );
  const budgeted = applyContextBudget(many);
  // 12000 / 900 ≈ 13 chunk max
  assert.ok(budgeted.length <= 14);
  assert.ok(budgeted.length < 20);
  assert.ok(budgeted.reduce((acc, r) => acc + r.content.length, 0) <= 12000);
});
