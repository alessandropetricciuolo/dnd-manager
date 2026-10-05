import type { WikiImageEntityKind } from "@/lib/ai/image-prompt-builder";
import { STANDARD_VISUAL_NEGATIVES } from "@/lib/ai/image-prompt-builder";
import { buildCreatureTechnicalLine } from "@/lib/ai/image-prompt-character-framing";
import { buildItemNegativeHints, buildItemTechnicalLine } from "@/lib/ai/image-prompt-item-lore";

export type WikiImageChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export function getImageRefineAspectRatio(entityType: WikiImageEntityKind, messages: WikiImageChatTurn[]): string {
  const request = [...messages].reverse().find((m) => m.role === "user" && /figura\s+intera|corpo\s+intero|full[ -]body|head[ -]to[ -]toe|dalla\s+testa\s+ai\s+piedi|primo\s+piano|mezzo\s+busto|close[ -]up|portrait/i.test(m.content))?.content ?? "";
  if ((entityType === "npc" || entityType === "monster") && /figura\s+intera|corpo\s+intero|full[ -]body|head[ -]to[ -]toe|dalla\s+testa\s+ai\s+piedi/i.test(request)) return "3:4";
  return entityType === "location" ? "16:9" : "1:1";
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function refineTechnicalLine(entityType: WikiImageEntityKind, haystack: string): string {
  if (entityType === "npc" || entityType === "monster") {
    return /figura\s+intera|corpo\s+intero|full[ -]body|head[ -]to[ -]toe|dalla\s+testa\s+ai\s+piedi/i.test(haystack)
      ? buildCreatureTechnicalLine(entityType, haystack)
      : "preserve reference framing and pose unless the Master requests a change; photorealistic, cinematic lighting";
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
  messages: WikiImageChatTurn[],
  hasOriginalReference = false
): string {
  const latestRequest = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const haystack = latestRequest || baseDescription;
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
    hasOriginalReference
      ? "Riferimenti: immagine 1 = originale, autorità per identità e dettagli; immagine 2 = versione corrente da modificare. Conserva le modifiche già approvate della versione corrente, ma correggi eventuali derive di identità usando l'originale."
      : "L'immagine allegata è il riferimento autorevole per identità, abiti e oggetti; il brief serve come contesto, non per ridisegnarli.",
    ...(entityType === "npc" || entityType === "monster" ? [
      "Salvo modifiche esplicite del Master, conserva esattamente struttura e proporzioni del volto, forma e distanza degli occhi, naso, bocca, mascella, età apparente, pelle, rughe, cicatrici, attaccatura, colore e lunghezza dei capelli. Non abbellire, ringiovanire o sostituire il soggetto con un sosia. Conserva materiali, colori, usura, toppe e accessori dell'abito originale.",
    ] : []),
    "Gli oggetti sono solidi tridimensionali: conserva design e materiali, ricostruendo volume, spessore, scorcio, occlusioni e ombre coerenti con la nuova posa. Mani e impugnatura devono rispettare la geometria dell'oggetto; non copiare una sagoma piatta dal riferimento. Per liuti e strumenti simili, mostra una cassa bombata con profondità e spessore credibili.",
    ...(getImageRefineAspectRatio(entityType, messages) === "3:4" ? [
      "Inquadratura verticale a figura intera: testa, capelli, gambe e piedi interamente visibili, con margine sopra e sotto. Allontana la camera per includere tutto il corpo; non tagliare testa o piedi.",
    ] : []),
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
