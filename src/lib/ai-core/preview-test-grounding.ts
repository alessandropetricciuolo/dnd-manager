import type { AiPreviewTestSource } from "./contracts";
import { AI_PREVIEW_TEST_MESSAGES, clampPreviewOutput } from "./preview-test-policy";
import { validateInlineEvidenceCitations } from "./grounded-answer";
import type { PreviewChunkRow } from "./campaign-memory-retriever";

export function campaignMemorySources(
  _campaignId: string,
  chunks: PreviewChunkRow[],
  sources: Array<{ evidenceId: string; sourceType: string; sourceId: string; title: string; href: string; similarity: number | null }>
): AiPreviewTestSource[] {
  return sources.map((source) => ({
    evidenceId: source.evidenceId,
    sourceType: "campaign_memory",
    sourceId: source.sourceId,
    title: source.title,
    href: source.href,
    similarity: source.similarity,
  }));
}

export function buildNarrativePreviewPrompt(
  instruction: string,
  chunks: PreviewChunkRow[],
  sources: Array<{ evidenceId: string; title: string; sourceType: string }>
): string {
  const evidence = chunks
    .map((chunk, index) => {
      const source = sources[index];
      return `[${source?.evidenceId ?? `E${index + 1}`}] ${source?.title ?? chunk.title} (${source?.sourceType ?? chunk.source_type})\n${chunk.content}`;
    })
    .join("\n\n---\n\n");
  return [
    "Sei un autore di proposte narrative per il GM di una campagna D&D.",
    "Scrivi una PROPOSTA CREATIVA DI PREVIEW, non canonica: nulla di ciò che scrivi viene salvato o reso vero automaticamente.",
    "Usa la memoria sotto come contesto read-only. Non presentare come fatto canonico ciò che non è nelle fonti.",
    "Puoi aggiungere dettagli creativi per rendere la scena giocabile, ma devono essere chiaramente proposta/idea e non fatti già stabiliti.",
    "Cita le fonti usate nel testo con [E1], [E2]. Se il contesto non basta, dichiaralo esplicitamente invece di inventare storia canonica.",
    `Istruzione narrativa del GM: ${instruction.trim()}`,
    "",
    "Memoria campagna recuperata:",
    evidence || "(nessuna fonte)",
    "",
    "Rispondi in italiano, in modo utile e conciso. Inizia con 'PROPOSTA NON CANONICA'.",
  ].join("\n");
}

export function validateNarrativePreviewOutput(
  output: string,
  validEvidenceIds: Set<string>
): { ok: true; output: string } | { ok: false; reason: string } {
  const normalized = clampPreviewOutput(output);
  if (!normalized) return { ok: false, reason: "Output vuoto." };
  const citations = validateInlineEvidenceCitations(normalized, validEvidenceIds);
  if (!citations.ok) return citations;
  if (!/proposta\s+non\s+canonica/i.test(normalized)) {
    return { ok: false, reason: "Manca l'etichetta non canonica." };
  }
  return { ok: true, output: normalized };
}

export function buildInsufficientMemoryPreviewOutput(): string {
  return `${AI_PREVIEW_TEST_MESSAGES.insufficientMemory} Nessun provider è stato chiamato.`;
}

export function buildProviderUnavailablePreviewOutput(): string {
  return `${AI_PREVIEW_TEST_MESSAGES.providerUnavailable} Nessun output del provider viene mostrato o persistito.`;
}

export function buildImagePreviewPrompt(
  brief: string,
  chunks: PreviewChunkRow[],
  sources: Array<{ evidenceId: string; title: string; sourceType: string }>
): string {
  const context = chunks
    .map((chunk, index) => `[${sources[index]?.evidenceId ?? `E${index + 1}`}] ${chunk.title} (${chunk.source_type}): ${chunk.content}`)
    .join("\n\n")
    .slice(0, 10000);
  return [
    "TEST IMAGE PREVIEW — illustrazione grounded non canonica per il GM.",
    "Non creare testo, loghi o watermark. Non trasformare dettagli non presenti nelle fonti in fatti di campagna.",
    `Brief del GM: ${brief.trim()}`,
    "Contesto read-only della memoria campagna:",
    context || "(nessuna fonte)",
    "Riferimenti visivi da rispettare: usa solo il contesto come ancoraggio; l'immagine resta una bozza di test e non diventa un asset.",
  ].join("\n");
}

export function safeImageOutputReference(args: {
  provider: string;
  model: string;
  outputUrl?: string;
  outputBase64?: string;
}): Record<string, unknown> {
  return {
    provider: args.provider,
    model: args.model,
    outputKind: args.outputBase64 ? "data_url" : args.outputUrl ? "url" : "none",
    hasOutput: Boolean(args.outputBase64 || args.outputUrl),
  };
}
