export type ConversationIntent = "new" | "confirm" | "reject" | "refine";

const CONFIRM_RE =
  /^(sì|si|ok|okay|va bene|perfetto|conferma|applica|vai|procedi|fallo|esegui|approvo|dai|certo)\b/i;

const REJECT_RE =
  /^(no|annulla|scarta|lascia stare|stop|cancel|non farlo|dimentica)\b/i;

export function detectConversationIntent(
  message: string,
  hasPending: boolean
): ConversationIntent {
  const trimmed = message.trim();
  if (!hasPending) return "new";
  if (CONFIRM_RE.test(trimmed)) return "confirm";
  if (REJECT_RE.test(trimmed)) return "reject";
  return "refine";
}
