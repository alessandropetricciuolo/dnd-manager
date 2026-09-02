import test from "node:test";
import assert from "node:assert/strict";

import { buildGroundedPrompt, parseGroundedJson, generateGroundedAnswer } from "../grounded-answer";
import { AI_MEMORY_PREVIEW_MESSAGES } from "../policy";
import type { PreviewChunkRow } from "../campaign-memory-retriever";
import type { AiMemoryPreviewSource } from "../contracts";

function makeChunk(id: string, title: string, content: string, source_type: PreviewChunkRow["source_type"] = "wiki"): PreviewChunkRow {
  return {
    id,
    campaign_id: "camp-1",
    source_type,
    source_id: id,
    chunk_index: 0,
    title,
    content,
    summary: null,
    metadata: {},
    similarity: 0.8,
  };
}
function makeSource(evidenceId: string, title: string, type: PreviewChunkRow["source_type"] = "wiki"): AiMemoryPreviewSource {
  return { evidenceId, sourceType: type, sourceId: `src-${evidenceId}`, title, href: `/campaigns/c/c/${evidenceId}`, similarity: 0.9 };
}

test("buildGroundedPrompt include evidence numerata e richiesta JSON", () => {
  const prompt = buildGroundedPrompt("Chi governa Portico?", [
    { evidenceId: "E1", title: "Portico", sourceType: "wiki", content: "Il Concilio..." },
  ]);
  assert.match(prompt, /\[E1\]/);
  assert.match(prompt, /Portico/);
  assert.match(prompt, /Domanda del GM/);
  assert.match(prompt, /classification/);
  assert.match(prompt, /italiano/);
});

test("parseGroundedJson accetta JSON valido con claims", () => {
  const raw = JSON.stringify({
    classification: "fatto_canonico",
    answer: "Portico è governata dal Concilio [E1].",
    claims: [{ text: "Portico governata dal Concilio", evidenceIds: ["E1"] }],
  });
  const res = parseGroundedJson(raw, new Set(["E1", "E2"]));
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.value.classification, "fatto_canonico");
    assert.equal(res.value.claims.length, 1);
  }
});

test("parseGroundedJson accetta informazione_assente con 0 claims", () => {
  const raw = JSON.stringify({
    classification: "informazione_assente",
    answer: "Non trovato [E1].",
    claims: [],
  });
  const res = parseGroundedJson(raw, new Set(["E1"]));
  assert.equal(res.ok, true);
});

test("parseGroundedJson rifiuta evidenceId sconosciuto", () => {
  const raw = JSON.stringify({
    classification: "fatto_canonico",
    answer: "x",
    claims: [{ text: "x", evidenceIds: ["E99"] }],
  });
  const res = parseGroundedJson(raw, new Set(["E1"]));
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.reason, /sconosciuto/);
});

test("parseGroundedJson rifiuta classification invalida", () => {
  const raw = JSON.stringify({ classification: "inventata", answer: "x", claims: [] });
  assert.equal(parseGroundedJson(raw, new Set(["E1"])).ok, false);
});

test("parseGroundedJson rifiuta answer vuota e troppo lunga", () => {
  const empty = JSON.stringify({ classification: "fatto_canonico", answer: "   ", claims: [{ text: "x", evidenceIds: ["E1"] }] });
  assert.equal(parseGroundedJson(empty, new Set(["E1"])).ok, false);

  const longAns = "a".repeat(8001);
  const long = JSON.stringify({ classification: "fatto_canonico", answer: longAns, claims: [{ text: "x", evidenceIds: ["E1"] }] });
  const res = parseGroundedJson(long, new Set(["E1"]));
  assert.equal(res.ok, false);
  if (!res.ok) assert.match(res.reason, /troppo lunga/);
});

test("parseGroundedJson gestisce markdown fence e trailing comma", () => {
  const raw = '```json\n{ "classification": "fatto_canonico", "answer": "ok [E1]", "claims": [{ "text": "ok", "evidenceIds": ["E1"] },] }\n```';
  const res = parseGroundedJson(raw, new Set(["E1"]));
  assert.equal(res.ok, true);
});

test("parseGroundedJson richiede claim per fatto_canonico", () => {
  const raw = JSON.stringify({ classification: "fatto_canonico", answer: "x", claims: [] });
  assert.equal(parseGroundedJson(raw, new Set(["E1"])).ok, false);
});

test("parseGroundedJson richiede una citazione inline valida per fatto_canonico", () => {
  const missing = JSON.stringify({
    classification: "fatto_canonico",
    answer: "Portico è governata dal Concilio.",
    claims: [{ text: "Portico governata dal Concilio", evidenceIds: ["E1"] }],
  });
  assert.equal(parseGroundedJson(missing, new Set(["E1"])).ok, false);

  const unknown = JSON.stringify({
    classification: "fatto_canonico",
    answer: "Portico è governata dal Concilio [E99].",
    claims: [{ text: "Portico governata dal Concilio", evidenceIds: ["E1"] }],
  });
  assert.equal(parseGroundedJson(unknown, new Set(["E1"])).ok, false);
});

test("generateGroundedAnswer deterministica senza fonti non chiama provider", async () => {
  let called = false;
  const res = await generateGroundedAnswer("Chi è Vhalzar?", [], [], {
    generateText: async () => {
      called = true;
      return "{}";
    },
  });
  assert.equal(called, false);
  assert.equal(res.status, "insufficient_evidence");
  assert.equal(res.classification, "informazione_assente");
  assert.match(res.answer, new RegExp(AI_MEMORY_PREVIEW_MESSAGES.insufficientEvidence.slice(0, 20)));
  assert.equal(res.claims.length, 0);
});

test("generateGroundedAnswer con provider valido -> answered", async () => {
  const chunks = [makeChunk("c1", "Portico", "Concilio dei Mercanti governa Portico con nove seggi.")];
  const sources = [makeSource("E1", "Portico")];
  const mock = async () =>
    JSON.stringify({
      classification: "fatto_canonico",
      answer: "Portico è governata dal Concilio dei Mercanti [E1].",
      claims: [{ text: "Portico governata dal Concilio", evidenceIds: ["E1"] }],
    });
  const res = await generateGroundedAnswer("Chi governa Portico?", chunks, sources, { generateText: mock });
  assert.equal(res.status, "answered");
  assert.equal(res.classification, "fatto_canonico");
  assert.match(res.answer, /Concilio/);
  assert.equal(res.claims[0]!.evidenceIds[0], "E1");
});

test("ogni claim mostrato ha fonte valida — validazione incrociata", async () => {
  const chunks = [makeChunk("c1", "Portico", "Contenuto Portico")];
  const sources = [makeSource("E1", "Portico")];
  const badMock = async () =>
    JSON.stringify({
      classification: "fatto_canonico",
      answer: "x",
      claims: [{ text: "x", evidenceIds: ["E2"] }], // E2 non esiste
    });
  const res = await generateGroundedAnswer("Chi governa Portico?", chunks, sources, { generateText: badMock });
  // Deve fallbackare a failed, non answered con claim invalido
  assert.equal(res.status, "failed");
  assert.match(res.answer, /temporaneamente non disponibile|Dettaglio validazione/);
});

test("generateGroundedAnswer provider error -> failed con estratti", async () => {
  const chunks = [makeChunk("c1", "Portico", "Contenuto Portico")];
  const sources = [makeSource("E1", "Portico")];
  const errMock = async () => {
    throw new Error("provider down");
  };
  const res = await generateGroundedAnswer("Chi governa Portico?", chunks, sources, { generateText: errMock });
  assert.equal(res.status, "failed");
  assert.match(res.answer, /temporaneamente non disponibile/);
  assert.match(res.answer, /Portico/);
});

test("generateGroundedAnswer JSON invalido -> failed con fonti", async () => {
  const chunks = [makeChunk("c1", "Portico", "Contenuto")];
  const sources = [makeSource("E1", "Portico")];
  const badJsonMock = async () => "non-json {]";
  const res = await generateGroundedAnswer("Chi governa Portico?", chunks, sources, { generateText: badJsonMock });
  assert.equal(res.status, "failed");
  assert.equal(res.classification, "informazione_assente");
  assert.match(res.answer, /Portico/);
  assert.match(res.answer, /\[E1\]/);
  assert.match(res.answer, /non ha superato la validazione grounded/);
});

test("JSON fatto canonico senza citazione inline produce fallback grounded con E#", async () => {
  const chunks = [makeChunk("c1", "Cristallo di passaggio", "Portali persistenti, costo 10 MO, senza sintonia.")];
  const sources = [makeSource("E1", "Cristallo di passaggio")];
  const res = await generateGroundedAnswer(
    "Come funziona il Cristallo di passaggio?",
    chunks,
    sources,
    {
      generateText: async () => JSON.stringify({
        classification: "fatto_canonico",
        answer: "Portali persistenti, costo 10 MO, senza sintonia.",
        claims: [{ text: "Regole del cristallo", evidenceIds: ["E1"] }],
      }),
    }
  );

  assert.equal(res.status, "failed");
  assert.match(res.answer, /\[E1\]/);
  assert.doesNotMatch(res.answer, /\[1\]/);
  assert.equal(res.claims.length, 0);
});

test("generateGroundedAnswer conflitto -> answered con classification conflitto", async () => {
  const chunks = [
    makeChunk("c1", "Portico", "Il Concilio governa."),
    makeChunk("c2", "Portico - nota GM", "Il Triumvirato governa."),
  ];
  const sources = [makeSource("E1", "Portico"), makeSource("E2", "Portico - nota GM")];
  const conflictMock = async () =>
    JSON.stringify({
      classification: "conflitto",
      answer: "Fonti in conflitto: [E1] dice Concilio, [E2] dice Triumvirato.",
      claims: [
        { text: "E1 afferma Concilio", evidenceIds: ["E1"] },
        { text: "E2 afferma Triumvirato", evidenceIds: ["E2"] },
      ],
    });
  const res = await generateGroundedAnswer("Chi governa Portico?", chunks, sources, { generateText: conflictMock });
  assert.equal(res.status, "answered");
  assert.equal(res.classification, "conflitto");
  assert.equal(res.claims.length, 2);
});

test("conflitto viene segnalato, non arbitrato — answer deve citare entrambe", async () => {
  const chunks = [makeChunk("c1", "Portico", "A"), makeChunk("c2", "Portico", "B")];
  const sources = [makeSource("E1", "P1"), makeSource("E2", "P2")];
  const mock = async () =>
    JSON.stringify({
      classification: "conflitto",
      answer: "Conflitto tra [E1] e [E2].",
      claims: [
        { text: "A", evidenceIds: ["E1"] },
        { text: "B", evidenceIds: ["E2"] },
      ],
    });
  const res = await generateGroundedAnswer("Chi governa Portico?", chunks, sources, { generateText: mock });
  assert.equal(res.classification, "conflitto");
  // Nessuna arbitraria scelta di una sola fonte
  assert.ok(res.claims.some((c) => c.evidenceIds.includes("E1")));
  assert.ok(res.claims.some((c) => c.evidenceIds.includes("E2")));
});
