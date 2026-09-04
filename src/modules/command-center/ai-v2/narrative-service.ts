import type { AssistantContext } from "./context-service";
import { canonicalReferenceInstruction } from "./canonical-references";
export function groundedNarrativeInstruction(context: AssistantContext | null): string {
  if (!context || context.result.chunks.length === 0) return "Nessun fatto canonico disponibile: separa esplicitamente la lacuna da ogni proposta creativa. Usa al massimo due citazioni.";
  return `Fatti canonici disponibili (usa solo questi e conserva gli evidence ID):\n${context.evidence}\nLe aggiunte non presenti nelle fonti devono essere marcate come proposta creativa. Limite citazioni per questa richiesta: ${context.citationLimit}.${context.canonicalReferences.length ? `\n${canonicalReferenceInstruction(context.canonicalReferences)}` : ""}`;
}
