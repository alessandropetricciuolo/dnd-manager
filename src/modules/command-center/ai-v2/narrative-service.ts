import type { AssistantContext } from "./context-service";
export function groundedNarrativeInstruction(context: AssistantContext | null): string {
  if (!context || context.result.chunks.length === 0) return "Nessun fatto canonico disponibile: separa esplicitamente la lacuna da ogni proposta creativa.";
  return `Fatti canonici disponibili (usa solo questi e conserva gli evidence ID):\n${context.evidence}\nLe aggiunte non presenti nelle fonti devono essere marcate come proposta creativa.`;
}
