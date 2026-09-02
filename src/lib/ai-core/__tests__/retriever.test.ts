import test from "node:test";
import assert from "node:assert/strict";

import {
  tokenizeQuestion,
  significantQuestionTokens,
  questionTermOverlapBoost,
  rerankMatches,
  applyContextBudget,
  selectContextChunks,
  buildPreviewSources,
  sourceHref,
  sourceLabel,
  retrievePreviewMemory,
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

test("selectContextChunks conserva il seguito pertinente della stessa fonte", () => {
  const rows = [
    makeRow({ source_type: "wiki", source_id: "cristallo", chunk_index: 0, title: "Cristallo di passaggio", content: "Il cristallo apre portali persistenti." }),
    makeRow({ source_type: "wiki", source_id: "cristallo", chunk_index: 1, title: "Cristallo di passaggio", content: "Il costo di ogni uso è 10 MO." }),
    makeRow({ source_type: "wiki", source_id: "cristallo", chunk_index: 2, title: "Cristallo di passaggio", content: "L'oggetto non richiede sintonia." }),
    makeRow({ source_type: "wiki", source_id: "altro", chunk_index: 0, title: "Cronaca", content: "Distrattore." }),
  ];

  const selected = selectContextChunks(rows, 12000, 14, 4, 4800);
  assert.deepEqual(selected.slice(0, 3).map((row) => row.chunk_index), [0, 1, 2]);
  assert.match(selected.slice(0, 3).map((row) => row.content).join(" "), /portali persistenti/);
  assert.match(selected.slice(0, 3).map((row) => row.content).join(" "), /10 MO/);
  assert.match(selected.slice(0, 3).map((row) => row.content).join(" "), /sintonia/);
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

function makeRetrieverAdmin(rows: PreviewChunkRow[], rpcResult: { data: unknown; error: unknown | null }) {
  return {
    from: (table: string) => {
      if (table !== "campaign_memory_chunks") throw new Error(`Unexpected table: ${table}`);
      return {
        select: (_columns: string, options?: { head?: boolean }) => ({
          eq: (_column: string, _value: string) => {
            if (options?.head) return Promise.resolve({ count: rows.length, error: null });
            return {
              or: (_expression: string) => ({
                limit: async (_limit: number) => ({ data: rows, error: null }),
              }),
            };
          },
        }),
      };
    },
    rpc: async () => rpcResult,
  } as any;
}

test("retrieval semantic success usa semantic e recupera Folki", async () => {
  const folki = makeRow({ source_type: "wiki", source_id: "folki", title: "Folki", content: "Folki è uno gnomo panettiere." });
  const result = await retrievePreviewMemory(
    makeRetrieverAdmin([], { data: [folki], error: null }),
    "camp-1",
    "Chi è Folki?",
    { generateEmbedding: async () => Array.from({ length: 384 }, () => 0.01) }
  );

  assert.equal(result.mode, "semantic");
  assert.equal(result.semantic.status, "success");
  assert.equal(result.chunks[0]?.title, "Folki");
});

test("retrieval semantic no-match usa fallback lessicale con titolo esatto prima del budget", async () => {
  const cases = [
    ["Chi è Folki?", "Folki"],
    ["Dove trovo il Cristallo di passaggio?", "Cristallo di passaggio"],
    ["Qual è lo stato della missione Coccatrice Scomparsa?", "Coccatrice Scomparsa"],
  ] as const;

  for (const [question, expectedTitle] of cases) {
    const target = makeRow({ source_type: expectedTitle.startsWith("Coccatrice") ? "mission" : "wiki", source_id: expectedTitle, title: expectedTitle, content: `${expectedTitle}: dettaglio canonico.` });
    const distractor = makeRow({ source_type: "wiki", source_id: `distractor-${expectedTitle}`, title: "Cronaca generale", content: "Dettaglio generico della campagna." });
    const result = await retrievePreviewMemory(
      makeRetrieverAdmin([distractor, target], { data: [], error: null }),
      "camp-1",
      question,
      { generateEmbedding: async () => Array.from({ length: 384 }, () => 0.01) }
    );

    assert.equal(result.mode, "lexical_fallback");
    assert.equal(result.semantic.status, "no_match");
    assert.equal(result.chunks[0]?.title, expectedTitle);
  }
});

test("retrieval semantic error registra causa sicura e usa fallback lessicale", async () => {
  const folki = makeRow({ source_type: "wiki", source_id: "folki", title: "Folki", content: "Folki è uno gnomo panettiere." });
  const result = await retrievePreviewMemory(
    makeRetrieverAdmin([folki], { data: null, error: { code: "42501", message: "provider details must not escape" } }),
    "camp-1",
    "Chi è Folki?",
    { generateEmbedding: async () => Array.from({ length: 384 }, () => 0.01) }
  );

  assert.equal(result.mode, "lexical_fallback");
  assert.deepEqual(result.semantic, {
    provider: "supabase",
    step: "rpc",
    status: "error",
    reason: "rpc_error",
    rpcCategory: "permission_or_schema_cache",
  });
  assert.equal(result.chunks[0]?.title, "Folki");
  assert.doesNotMatch(JSON.stringify(result.semantic), /provider details/);
});

test("retrieval RPC classifica funzione mancante senza conservare il messaggio raw", async () => {
  const folki = makeRow({ source_type: "wiki", source_id: "folki", title: "Folki", content: "Folki è uno gnomo panettiere." });
  const result = await retrievePreviewMemory(
    makeRetrieverAdmin([folki], { data: null, error: { code: "PGRST202", message: "private provider secret" } }),
    "camp-1",
    "Chi è Folki?",
    { generateEmbedding: async () => Array.from({ length: 384 }, () => 0.01) }
  );

  assert.equal(result.semantic.provider, "supabase");
  assert.equal(result.semantic.step, "rpc");
  assert.equal(result.semantic.reason, "rpc_error");
  assert.equal(result.semantic.rpcCategory, "function_missing");
  assert.doesNotMatch(JSON.stringify(result.semantic), /private provider secret/);
});

test("retrieval mantiene tre chunk della voce Cristallo nel contesto", async () => {
  const cristallo = [
    makeRow({ source_type: "wiki", source_id: "cristallo", chunk_index: 0, title: "Cristallo di passaggio", content: "Il Cristallo apre portali persistenti." }),
    makeRow({ source_type: "wiki", source_id: "cristallo", chunk_index: 1, title: "Cristallo di passaggio", content: "Il costo è 10 MO per uso." }),
    makeRow({ source_type: "wiki", source_id: "cristallo", chunk_index: 2, title: "Cristallo di passaggio", content: "Non richiede sintonia." }),
  ];
  const result = await retrievePreviewMemory(
    makeRetrieverAdmin([], { data: cristallo, error: null }),
    "camp-1",
    "Come funziona il Cristallo di passaggio?",
    { generateEmbedding: async () => Array.from({ length: 384 }, () => 0.01) }
  );

  assert.equal(result.mode, "semantic");
  assert.equal(result.contextChunkCount, 3);
  assert.deepEqual(result.chunks.map((row) => row.chunk_index), [0, 1, 2]);
  assert.match(result.chunks.map((row) => row.content).join(" "), /10 MO/);
  assert.match(result.chunks.map((row) => row.content).join(" "), /sintonia/);
});

test("retrieval senza configurazione OpenRouter non tenta il provider e registra missing_api_key", async () => {
  const previousKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  let rpcCalled = false;
  const folki = makeRow({ source_type: "wiki", source_id: "folki", title: "Folki", content: "Folki è uno gnomo panettiere." });
  const admin = makeRetrieverAdmin([folki], { data: [], error: null });
  admin.rpc = async () => {
    rpcCalled = true;
    return { data: [], error: null };
  };

  try {
    const result = await retrievePreviewMemory(admin, "camp-1", "Chi è Folki?");
    assert.equal(result.semantic.status, "error");
    assert.equal(result.semantic.reason, "missing_api_key");
    assert.equal(rpcCalled, false);
    assert.equal(result.chunks[0]?.title, "Folki");
  } finally {
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
  }
});
