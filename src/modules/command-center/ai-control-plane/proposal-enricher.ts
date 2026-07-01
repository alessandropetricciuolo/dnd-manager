import { previewAction } from "../actions";
import type { PreviewedProposal } from "./preview-proposals";

export type EnrichProposalResult =
  | {
      ok: true;
      proposal: PreviewedProposal;
      assistantMessage?: string;
    }
  | { ok: false; error: string };

function ensureString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

/** Fase 0 — normalizza campi PG (generazione background in Fase 3). */
export async function enrichCharacterProposal(
  campaignId: string,
  userMessage: string,
  proposal: PreviewedProposal
): Promise<EnrichProposalResult> {
  const input: Record<string, unknown> = { ...proposal.input, campaignId };
  input.name = ensureString(input.name, "Nuovo personaggio");
  if (typeof input.level !== "number" || input.level < 1) {
    input.level = 1;
  }
  if (!input.background && userMessage.trim()) {
    input.background = null;
  }

  const preview = await previewAction("character.create", input, { actorType: "ai" });
  const lines = [
    `**${input.name}**`,
    input.characterClass ? `Classe: ${input.characterClass}` : null,
    input.raceSlug ? `Razza: ${input.raceSlug}` : null,
    `Livello: ${input.level}`,
    "",
    input.background
      ? String(input.background)
      : "_Background narrativo: verrà generato in una fase successiva. Puoi descrivere il personaggio in chat e chiedere modifiche._",
  ].filter((line) => line !== null);

  return {
    ok: true,
    proposal: {
      action_name: proposal.action_name,
      input,
      rationale: proposal.rationale,
      preview_payload: preview.success
        ? (preview.data as Record<string, unknown>)
        : { ...input, enrichPhase: "stub", error: preview.error },
    },
    assistantMessage: lines.join("\n"),
  };
}

export async function enrichDomainProposal(
  actionName: string,
  campaignId: string | null,
  userMessage: string,
  proposal: PreviewedProposal
): Promise<EnrichProposalResult> {
  switch (actionName) {
    case "character.create":
      if (!campaignId) {
        return { ok: false, error: "Seleziona una campagna per creare personaggi." };
      }
      return enrichCharacterProposal(campaignId, userMessage, proposal);
    default:
      return { ok: true, proposal };
  }
}
