import type { WikiImageEntityKind } from "@/lib/ai/image-prompt-builder";
import { STANDARD_VISUAL_NEGATIVES } from "@/lib/ai/image-prompt-builder";
import { buildCreatureTechnicalLine } from "@/lib/ai/image-prompt-character-framing";

export type WikiImageChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function buildImageRefineInstructionText(
  entityType: WikiImageEntityKind,
  baseDescription: string,
  messages: WikiImageChatTurn[]
): string {
  const haystack = [baseDescription, ...messages.map((m) => m.content)].join("\n");
  const technical =
    entityType === "npc" || entityType === "monster"
      ? buildCreatureTechnicalLine(entityType, haystack)
      : "high detail, photorealistic, cinematic lighting, fantasy art";

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
    `Vincoli negativi: ${STANDARD_VISUAL_NEGATIVES}`,
    "",
    "Genera una nuova versione dell'immagine applicando l'ultima richiesta.",
  ].join("\n");
}
