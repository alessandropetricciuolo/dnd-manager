import type { ChatPendingPhase } from "./draft-assistant.types";

export type ConversationIntent =
  | "new"
  | "confirm"
  | "reject"
  | "refine"
  | "image_yes"
  | "image_no";

const CONFIRM_RE =
  /^(sì|si|ok|okay|va bene|perfetto|conferma|applica|vai|procedi|fallo|esegui|approvo|dai|certo)\b/i;

const REJECT_RE =
  /^(no|annulla|scarta|lascia stare|stop|cancel|non farlo|dimentica)\b/i;

const IMAGE_YES_RE =
  /^(sì|si|ok|okay|genera|immagine|vai|certo|dai|procedi)(\b|\s|$)/i;

const IMAGE_NO_RE =
  /^(no|senza|salta|solo testo|non serve|niente immagine|senza immagine)\b/i;

export function detectConversationIntent(
  message: string,
  hasPending: boolean,
  phase?: ChatPendingPhase | null
): ConversationIntent {
  const trimmed = message.trim();
  if (!hasPending) return "new";

  if (phase === "awaiting_image") {
    if (IMAGE_YES_RE.test(trimmed)) return "image_yes";
    if (IMAGE_NO_RE.test(trimmed)) return "image_no";
    if (REJECT_RE.test(trimmed)) return "reject";
    return "refine";
  }

  if (CONFIRM_RE.test(trimmed)) return "confirm";
  if (REJECT_RE.test(trimmed)) return "reject";
  return "refine";
}
