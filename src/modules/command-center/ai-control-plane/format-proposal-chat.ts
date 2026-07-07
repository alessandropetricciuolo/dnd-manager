import type { PreviewedProposal } from "./preview-proposals";
import type { ChatPendingPhase } from "./draft-assistant.types";

const ACTION_LABELS: Record<string, string> = {
  "workspace.task.create": "Nuovo task",
  "workspace.page.create": "Nuova pagina",
  "command.input.capture": "Registra input",
  "campaign.create": "Nuova campagna",
  "campaign.update": "Aggiorna campagna",
  "gm.note.create": "Nota GM",
  "gm.note.update": "Aggiorna nota GM",
  "session.create": "Nuova sessione",
  "session.update": "Aggiorna sessione",
  "session.close": "Chiudi sessione",
  "wiki.entity.create": "Entità wiki",
  "wiki.entity.update": "Aggiorna wiki",
  "wiki.entity.delete": "Elimina wiki",
  "mission.create": "Nuova missione",
  "mission.update": "Aggiorna missione",
  "character.create": "Nuovo personaggio",
  "character.update": "Aggiorna personaggio",
  "wiki.relationship.create": "Relazione wiki",
  "campaign.aiContext.generate": "Contesto AI campagna",
  "memory.reindex": "Reindicizza memoria",
};

function pickText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function formatPreviewBody(
  actionName: string,
  input: Record<string, unknown>,
  preview: Record<string, unknown>
): string[] {
  const lines: string[] = [];
  const title = pickText(preview.title, preview.name, input.title, input.name);
  if (title) lines.push(`Titolo: ${title}`);

  const type = pickText(preview.type, input.type);
  if (type) lines.push(`Tipo: ${type}`);

  const body = pickText(
    preview.content,
    preview.contentMarkdown,
    preview.contentPreview,
    preview.description,
    input.content,
    input.contentMarkdown,
    input.description
  );
  if (body) lines.push(`Contenuto:\n${body}`);

  if (actionName === "campaign.create" || actionName === "campaign.update") {
    const ctype = pickText(preview.type, input.type);
    if (ctype) lines.push(`Tipo campagna: ${ctype}`);
  }

  if (typeof preview.error === "string") {
    lines.push(`⚠ Anteprima: ${preview.error}`);
  }

  return lines;
}

function footerForPhase(phase?: ChatPendingPhase): string {
  if (phase === "awaiting_image") {
    return "Scrivi sì per generare l'immagine, no per continuare senza, oppure descrivi modifiche al testo; poi conferma per salvare.";
  }
  return "Scrivi conferma per approvare il testo, annulla per scartare, oppure descrivi le modifiche.";
}

export function formatProposalForChat(
  proposal: PreviewedProposal,
  options?: { phase?: ChatPendingPhase }
): string {
  const label = ACTION_LABELS[proposal.action_name] ?? proposal.action_name;
  const lines = [
    `📋 Proposta: ${label}`,
    ...formatPreviewBody(proposal.action_name, proposal.input, proposal.preview_payload),
  ];
  if (proposal.rationale) lines.push(`Perché: ${proposal.rationale}`);
  lines.push("");
  lines.push(footerForPhase(options?.phase));
  return lines.join("\n");
}
