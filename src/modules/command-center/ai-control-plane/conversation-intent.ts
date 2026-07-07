import type { ChatPendingPhase } from "./draft-assistant.types";

export type ConversationIntent =
  | "new"
  | "confirm"
  | "reject"
  | "refine"
  | "image_yes"
  | "image_no"
  | "architect_yes"
  | "architect_no"
  | "batch_skip";

const BATCH_SKIP_RE = /^(salta|passa|prossimo|skip)\b/i;

const CONFIRM_RE =
  /^(sì|si|ok|okay|va bene|perfetto|conferma|applica|vai|procedi|fallo|esegui|approvo|dai|certo)\b/i;

const REJECT_RE =
  /^(no|annulla|scarta|lascia stare|stop|cancel|non farlo|dimentica)\b/i;

const IMAGE_YES_RE =
  /^(sì|si|ok|okay|genera|immagine|vai|certo|dai|procedi)(\b|\s|$)/i;

const IMAGE_NO_RE =
  /^(no|senza|salta|solo testo|non serve|niente immagine|senza immagine)\b/i;

export function isWikiImageRequestMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  return /^(genera\s+(un['']?\s*)?(immagine|ritratto)|immagine|ritratto)\b/i.test(trimmed);
}

export function detectConversationIntent(
  message: string,
  hasPending: boolean,
  phase?: ChatPendingPhase | null
): ConversationIntent {
  const trimmed = message.trim();
  if (!hasPending) return "new";

  if (phase === "awaiting_image") {
    if (BATCH_SKIP_RE.test(trimmed)) return "batch_skip";
    if (IMAGE_YES_RE.test(trimmed)) return "image_yes";
    if (IMAGE_NO_RE.test(trimmed)) return "image_no";
    if (REJECT_RE.test(trimmed)) return "reject";
    return "refine";
  }

  if (phase === "awaiting_avatar") {
    if (IMAGE_YES_RE.test(trimmed)) return "image_yes";
    if (IMAGE_NO_RE.test(trimmed)) return "image_no";
    if (REJECT_RE.test(trimmed)) return "reject";
    if (CONFIRM_RE.test(trimmed)) return "confirm";
    return "refine";
  }

  if (phase === "awaiting_architect") {
    if (IMAGE_YES_RE.test(trimmed)) return "architect_yes";
    if (IMAGE_NO_RE.test(trimmed)) return "architect_no";
    if (REJECT_RE.test(trimmed)) return "reject";
    return "refine";
  }

  if (phase === "awaiting_close_info") {
    if (REJECT_RE.test(trimmed)) return "reject";
    if (CONFIRM_RE.test(trimmed)) return "confirm";
    return "refine";
  }

  if (CONFIRM_RE.test(trimmed)) return "confirm";
  if (BATCH_SKIP_RE.test(trimmed)) return "batch_skip";
  if (REJECT_RE.test(trimmed)) return "reject";
  return "refine";
}
