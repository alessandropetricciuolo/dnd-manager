import { generateAiText } from "@/lib/ai/huggingface-client";
import { parseJsonObjectFromLlm } from "@/lib/ai/json-extract";
import type {
  AiMemoryPreviewClaim,
  AiMemoryPreviewClassification,
  AiMemoryPreviewSource,
  AiMemoryPreviewStructuredOutput,
} from "./contracts";
import {
  AI_MEMORY_PREVIEW_ANSWER_MAX_LENGTH,
  buildInsufficientEvidenceAnswer,
  buildProviderFallbackAnswer,
  isValidClassification,
  validateClaims,
} from "./policy";
import type { PreviewChunkRow } from "./campaign-memory-retriever";

// ── Prompt ──

export function buildGroundedPrompt(question: string, evidence: Array<{ evidenceId: string; title: string; sourceType: string; content: string }>): string {
  const evidenceBlock = evidence
    .map((e) => `[${e.evidenceId}] Tipo: ${e.sourceType}\nTitolo: ${e.title}\nContenuto:\n${e.content}`)
    .join("\n\n---\n\n");

  return [
    "Sei l'archivista della memoria di una campagna lunga di D&D 5e. Rispondi SOLO usando le fonti sotto.",
    "Se le fonti non bastano, dichiara esplicitamente che l'informazione è assente. Non inventare fatti, nomi, luoghi o meccaniche.",
    "Se il titolo di una fonte contiene il soggetto della domanda, considera quella fonte pertinente e riassumi il contenuto.",
    "Obiettivo: aiutare il GM a mantenere coerenza narrativa, senza creare nuovo canone.",
    `Domanda del GM: ${question.trim()}`,
    "",
    "Fonti recuperate:",
    evidenceBlock || "(nessuna fonte)",
    "",
    "Istruzioni di output — rispondi SOLO con un oggetto JSON valido (nessun testo fuori dal JSON):",
    '{ "classification": "fatto_canonico" | "informazione_assente" | "conflitto",',
    '  "answer": "risposta in italiano, breve ma utile (3-6 bullet o 1 paragrafo + bullet). Usa citazioni [E1], [E2] quando citi un fatto.",',
    '  "claims": [ { "text": "singolo fatto affermato", "evidenceIds": ["E1"] } ] }',
    "Regole:",
    "- classification = fatto_canonico se le fonti rispondono direttamente;",
    "- classification = informazione_assente se le fonti non coprono la domanda;",
    "- classification = conflitto se le fonti si contraddicono (elenca le divergenze, non arbitrare);",
    "- ogni claim in 'claims' deve avere almeno un evidenceId tra quelli elencati;",
    "- non citare fonti non presenti nel contesto;",
    "- rispondi sempre in italiano;",
    "- indica lacune esplicitamente.",
  ].join("\n");
}

// ── Parser & validator ──

export type ParseResult =
  | { ok: true; value: AiMemoryPreviewStructuredOutput }
  | { ok: false; reason: string };

export function parseGroundedJson(raw: string, validEvidenceIds: Set<string>): ParseResult {
  const parsed = parseJsonObjectFromLlm(raw);
  if (!parsed.ok) {
    return { ok: false, reason: "JSON non valido o non estraibile." };
  }
  const obj = parsed.value as Record<string, unknown>;

  const classification = obj["classification"];
  if (typeof classification !== "string" || !isValidClassification(classification)) {
    return { ok: false, reason: `classification non valida: ${String(classification)}` };
  }

  const answer = obj["answer"];
  if (typeof answer !== "string" || !answer.trim()) {
    return { ok: false, reason: "answer vuota o non stringa." };
  }
  if (answer.length > AI_MEMORY_PREVIEW_ANSWER_MAX_LENGTH) {
    return { ok: false, reason: `answer troppo lunga (${answer.length} > ${AI_MEMORY_PREVIEW_ANSWER_MAX_LENGTH}).` };
  }

  const claimsRaw = obj["claims"];
  if (!Array.isArray(claimsRaw)) {
    return { ok: false, reason: "claims non è un array." };
  }

  const claims: AiMemoryPreviewClaim[] = [];
  for (let i = 0; i < claimsRaw.length; i++) {
    const c = claimsRaw[i] as Record<string, unknown> | null;
    if (!c || typeof c !== "object") return { ok: false, reason: `claim ${i + 1} non è un oggetto.` };
    const text = c["text"];
    const eids = c["evidenceIds"];
    if (typeof text !== "string" || !text.trim()) return { ok: false, reason: `claim ${i + 1} text vuoto.` };
    if (!Array.isArray(eids) || eids.length === 0) return { ok: false, reason: `claim ${i + 1} evidenceIds vuoto.` };
    for (const id of eids) {
      if (typeof id !== "string" || !id.trim()) return { ok: false, reason: `claim ${i + 1} evidenceId non stringa.` };
      if (!validEvidenceIds.has(id)) return { ok: false, reason: `claim ${i + 1} evidenceId sconosciuto: ${id}` };
    }
    claims.push({ text: text.trim(), evidenceIds: eids as string[] });
  }

  // Guardrail aggiuntivo: se classificazione è fatto_canonico o conflitto deve avere almeno un claim
  if ((classification === "fatto_canonico" || classification === "conflitto") && claims.length === 0) {
    return { ok: false, reason: `classification ${classification} richiede almeno un claim.` };
  }
  // informazione_assente può avere 0 claim — consentito
  // validazione incrociata con policy.validateClaims se ci sono claim
  // (costruiamo sources fittizie per riusare la funzione)
  if (claims.length > 0) {
    const fakeSources: AiMemoryPreviewSource[] = Array.from(validEvidenceIds).map((id) => ({
      evidenceId: id,
      sourceType: "wiki" as const,
      sourceId: "dummy",
      title: "dummy",
      href: "/",
      similarity: null,
    }));
    const claimCheck = validateClaims(claims, fakeSources);
    if (!claimCheck.ok) return { ok: false, reason: claimCheck.reason };
  }

  return {
    ok: true,
    value: {
      classification: classification as AiMemoryPreviewClassification,
      answer: answer.trim(),
      claims,
    },
  };
}

// ── Generation (deterministic fallback included) ──

export type GroundedDeps = {
  generateText?: (prompt: string) => Promise<string>;
};

export type GroundedSuccess = {
  status: "answered" | "insufficient_evidence";
  classification: AiMemoryPreviewClassification;
  answer: string;
  claims: AiMemoryPreviewClaim[];
};

export type GroundedFailed = {
  status: "failed";
  classification: AiMemoryPreviewClassification;
  answer: string;
  claims: AiMemoryPreviewClaim[];
};

export type GroundedResult = GroundedSuccess | GroundedFailed;

/**
 * Se chunks vuoto -> risultato deterministico senza chiamare il modello.
 * Altrimenti chiama il provider, valida JSON e fallback grounded se invalido.
 */
export async function generateGroundedAnswer(
  question: string,
  chunks: PreviewChunkRow[],
  sources: AiMemoryPreviewSource[],
  deps: GroundedDeps = {}
): Promise<GroundedResult> {
  const trimmed = question.trim();
  // Assenza fonti -> deterministico, mai chiamata al modello
  if (chunks.length === 0 || sources.length === 0) {
    return {
      status: "insufficient_evidence",
      classification: "informazione_assente",
      answer: buildInsufficientEvidenceAnswer(trimmed),
      claims: [],
    };
  }

  const evidence = chunks.map((c, idx) => ({
    evidenceId: sources[idx]?.evidenceId ?? `E${idx + 1}`,
    title: c.title,
    sourceType: c.source_type,
    content: c.content,
  }));

  const prompt = buildGroundedPrompt(trimmed, evidence);
  const generateText = deps.generateText ?? ((p: string) => generateAiText(p));

  let raw: string;
  try {
    raw = await generateText(prompt);
  } catch (e) {
    // provider error -> fallback grounded con estratti, status failed
    const fallback = buildProviderFallbackAnswer(sources, trimmed);
    return {
      status: "failed",
      classification: "informazione_assente",
      answer: fallback,
      claims: [],
    };
  }

  const validIds = new Set(sources.map((s) => s.evidenceId));
  const parsed = parseGroundedJson(raw, validIds);

  if (!parsed.ok) {
    const fallback = buildProviderFallbackAnswer(sources, trimmed);
    return {
      status: "failed",
      classification: "informazione_assente",
      answer: `${fallback}\n\n[Dettaglio validazione: ${parsed.reason}]`,
      claims: [],
    };
  }

  const { classification, answer, claims } = parsed.value;

  // Mappatura classification -> status
  if (classification === "informazione_assente") {
    return {
      status: "insufficient_evidence",
      classification,
      answer,
      claims,
    };
  }

  // conflitto e fatto_canonico sono answered (con evidenza)
  return {
    status: "answered",
    classification,
    answer,
    claims,
  };
}
