import type { WikiImageEntityKind } from "@/lib/ai/image-prompt-builder";
import { STANDARD_VISUAL_NEGATIVES } from "@/lib/ai/image-prompt-builder";
import { buildCreatureTechnicalLine } from "@/lib/ai/image-prompt-character-framing";
import { buildItemNegativeHints, buildItemTechnicalLine } from "@/lib/ai/image-prompt-item-lore";

export type WikiImageChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function refineTechnicalLine(entityType: WikiImageEntityKind, haystack: string): string {
  if (entityType === "npc" || entityType === "monster") {
    return buildCreatureTechnicalLine(entityType, haystack);
  }
  if (entityType === "item") {
    return buildItemTechnicalLine();
  }
  if (entityType === "lore") {
    return "follow the Master request and original brief; no forced subject framing";
  }
  return "high detail, photorealistic, cinematic lighting, fantasy art";
}

function refineNegativeLine(entityType: WikiImageEntityKind): string {
  if (entityType === "lore") {
    return "(solo stile campagna — nessun vincolo di soggetto aggiuntivo oltre alla richiesta del Master)";
  }
  if (entityType === "item") {
    return `${STANDARD_VISUAL_NEGATIVES}, ${buildItemNegativeHints()}`;
  }
  return STANDARD_VISUAL_NEGATIVES;
}

export function buildImageRefineInstructionText(
  entityType: WikiImageEntityKind,
  baseDescription: string,
  messages: WikiImageChatTurn[]
): string {
  const haystack = [baseDescription, ...messages.map((m) => m.content)].join("\n");
  const technical = refineTechnicalLine(entityType, haystack);

  const history =
    messages.length > 0
      ? messages
          .map((m) => `${m.role === "user" ? "Master" : "Assistente"}: ${m.content.trim()}`)
          .join("\n")
      : "(nessuna modifica precedente)";

  const latestUser = [...messages].reverse().find((m) => m.role === "user")?.content.trim() ?? "";

  return [
    "Modifica l'illustration fantasy allegata. Mantieni identità del soggetto, coerenza con il brief e ciò che non è esplicitamente richiesto di cambiare.",
    "",
    `Tipo soggetto: ${entityType}`,
    `Brief originale (coerenza narrativa): ${truncate(baseDescription, 2400)}`,
    "",
    "Cronologia modifiche:",
    history,
    "",
    `Ultima richiesta del Master (priorità massima): ${latestUser}`,
    "",
    `Vincoli tecnici: ${technical}`,
    `Vincoli negativi: ${refineNegativeLine(entityType)}`,
    "",
    "Genera una nuova versione dell'immagine applicando l'ultima richiesta.",
  ].join("\n");
}
