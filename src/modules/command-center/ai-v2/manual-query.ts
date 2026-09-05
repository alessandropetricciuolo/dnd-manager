import { searchManualsSemanticAction } from "@/lib/actions/manual-search-actions";
import type { AiAssistantSourceRef } from "./contracts";

export function isExplicitManualQuestion(message: string): boolean {
  return /\b(manuale|manuali|regola|regole|secondo il manuale|secondo i manuali|fonte ufficiale|ufficiale|pagina|sezione)\b/i.test(message)
    || (/\b(d&d\s*5e|dnd\s*5e|dungeons\s*&\s*dragons)\b/i.test(message) && /\?|come|cosa|quale|quali|spiega|dice/i.test(message));
}

function sourceRef(hit: { fileName: string | null; sectionTitle: string | null; chunkIndex: number | null; sourceLabel: string | null; similarity: number | null }, index: number): AiAssistantSourceRef {
  const file = hit.fileName ?? hit.sourceLabel ?? "manuale D&D 5e";
  const suffix = hit.chunkIndex == null ? "" : ` · blocco ${hit.chunkIndex + 1}`;
  return { evidenceId: `M${index + 1}`, sourceType: "manual", sourceId: `${file}:${hit.chunkIndex ?? index}`, title: `${hit.sectionTitle ?? file}${suffix}`, href: "/admin/knowledge", similarity: hit.similarity };
}

export type ManualContext = { instruction: string; sources: AiAssistantSourceRef[] };

export async function loadManualQuestionContext(message: string): Promise<ManualContext | null> {
  if (!isExplicitManualQuestion(message)) return null;
  const result = await searchManualsSemanticAction(message);
  if (!result.success) return { instruction: `CONSULTAZIONE MANUALI D&D 5e: nessun passaggio ufficiale verificabile trovato (${result.message}). Dichiara chiaramente che la regola non è stata trovata; non ricostruire né presentare conoscenza del modello come testo ufficiale.`, sources: [] };
  const sources = result.hits.slice(0, 3).map(sourceRef);
  const sourceLines = result.hits.slice(0, 3).map((hit, i) => `[${sources[i].evidenceId}] ${[hit.fileName, hit.chapter, hit.sectionTitle].filter(Boolean).join(" · ") || sources[i].title}\n${hit.content.slice(0, 3500)}`).join("\n\n");
  return { instruction: `CONSULTAZIONE MANUALI D&D 5e (sola lettura): rispondi solo sulla base dei passaggi sotto. Stato: ufficiale per i passaggi del corpus manuali; se il risultato è assente dichiaralo. Non applicare regole a schede o artefatti e non inventare pagina/sezione: mostra manuale, capitolo o sezione solo quando presenti nei dati. Usa citazioni brevi [M#] accanto alle affermazioni pertinenti.\n${sourceLines}`, sources };
}
