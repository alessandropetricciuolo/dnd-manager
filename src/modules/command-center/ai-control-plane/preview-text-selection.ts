export type PreviewTextSelectionField =
  | "wiki_description"
  | "wiki_statblock"
  | "character_story"
  | "content"
  | "player_primer"
  | "session_summary";

export type PreviewTextSelection = {
  field: PreviewTextSelectionField;
  selectedText: string;
  sectionLabel?: string;
};

const MIN_SELECTION_LENGTH = 3;
const MAX_SELECTION_LENGTH = 4000;

export function isValidPreviewTextSelection(
  selection: PreviewTextSelection | null | undefined
): selection is PreviewTextSelection {
  if (!selection) return false;
  const text = selection.selectedText?.trim() ?? "";
  return text.length >= MIN_SELECTION_LENGTH && text.length <= MAX_SELECTION_LENGTH;
}

export function truncateSelectionPreview(text: string, max = 120): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** Arricchisce il messaggio di refine con il frammento selezionato nell'anteprima. */
export function buildRefinePromptWithSelection(
  instruction: string,
  selection: PreviewTextSelection
): string {
  const label = selection.sectionLabel?.trim() || selection.field;
  return [
    instruction.trim(),
    "",
    "--- MODIFICA MIRATA (anteprima) ---",
    `Sezione: ${label}`,
    "Il Master ha selezionato questo frammento nell'anteprima. Modifica SOLO questa parte secondo l'istruzione; il resto del testo deve restare invariato salvo minimi aggiustamenti di coerenza.",
    '"""',
    selection.selectedText.trim(),
    '"""',
  ].join("\n");
}

export function selectionTargetsWikiStatblock(selection: PreviewTextSelection): boolean {
  return selection.field === "wiki_statblock";
}

export function selectionTargetsWikiDescription(selection: PreviewTextSelection): boolean {
  return selection.field === "wiki_description";
}

const SELECTION_BLOCKED_INTENTS = new Set(["confirm", "reject", "image_yes", "image_no"]);

const SELECTION_BLOCKED_PHASES = new Set([
  "awaiting_campaign_type",
  "awaiting_image",
  "awaiting_avatar",
  "awaiting_sheet",
  "awaiting_architect",
]);

/** Forza refine quando c'è una selezione nell'anteprima e il messaggio non è conferma/annulla. */
export function shouldTreatAsSelectionRefine(
  intent: string,
  selection: PreviewTextSelection | null | undefined,
  phase?: string | null
): boolean {
  if (!isValidPreviewTextSelection(selection)) return false;
  if (SELECTION_BLOCKED_INTENTS.has(intent)) return false;
  if (phase && SELECTION_BLOCKED_PHASES.has(phase)) return false;
  return true;
}

export function resolveRefineUserMessage(
  instruction: string,
  selection?: PreviewTextSelection | null
): string {
  const trimmed = instruction.trim();
  if (!isValidPreviewTextSelection(selection)) return trimmed;
  return buildRefinePromptWithSelection(trimmed, selection);
}
