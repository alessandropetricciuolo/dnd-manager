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

/** Fase 0 — normalizza campi missione e arricchisce l'anteprima (generazione AI in Fase 2). */
export async function enrichMissionProposal(
  campaignId: string,
  userMessage: string,
  proposal: PreviewedProposal
): Promise<EnrichProposalResult> {
  const input: Record<string, unknown> = { ...proposal.input, campaignId };
  input.grade = ensureString(input.grade, "C");
  input.title = ensureString(input.title, "Nuova missione");
  input.committente = ensureString(input.committente, "Da definire");
  input.ubicazione = ensureString(input.ubicazione, "Da definire");
  input.paga = ensureString(input.paga, "Da definire");
  input.urgenza = ensureString(input.urgenza, "Normale");
  input.description = ensureString(input.description, userMessage.trim() || "Da definire");
  if (typeof input.pointsReward !== "number") {
    input.pointsReward = 0;
  }

  const preview = await previewAction("mission.create", input, { actorType: "ai" });
  const assistantMessage = [
    `**${input.title}** (grado ${input.grade})`,
    `Committente: ${input.committente}`,
    `Ubicazione: ${input.ubicazione}`,
    `Paga: ${input.paga} · Urgenza: ${input.urgenza}`,
    "",
    String(input.description),
  ].join("\n");

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
    assistantMessage,
  };
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

/** Fase 0 — normalizza campi campagna (generazione descrizione/primer in Fase 1). */
export async function enrichCampaignProposal(
  userMessage: string,
  proposal: PreviewedProposal
): Promise<EnrichProposalResult> {
  const input: Record<string, unknown> = { ...proposal.input };
  input.title = ensureString(input.title, "Nuova campagna");
  input.description = ensureString(input.description, userMessage.trim() || "");
  if (typeof input.type !== "string" || !input.type.trim()) {
    input.type = "oneshot";
  }

  const preview = await previewAction("campaign.create", input, { actorType: "ai" });
  const assistantMessage = [
    `**${input.title}**`,
    `Tipo: ${input.type}`,
    "",
    input.description ? String(input.description) : "_Descrizione da completare in chat._",
  ].join("\n");

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
    assistantMessage,
  };
}

export async function enrichDomainProposal(
  actionName: string,
  campaignId: string | null,
  userMessage: string,
  proposal: PreviewedProposal
): Promise<EnrichProposalResult> {
  switch (actionName) {
    case "mission.create":
      if (!campaignId) {
        return { ok: false, error: "Seleziona una campagna per creare missioni." };
      }
      return enrichMissionProposal(campaignId, userMessage, proposal);
    case "character.create":
      if (!campaignId) {
        return { ok: false, error: "Seleziona una campagna per creare personaggi." };
      }
      return enrichCharacterProposal(campaignId, userMessage, proposal);
    case "campaign.create":
      return enrichCampaignProposal(userMessage, proposal);
    default:
      return { ok: true, proposal };
  }
}
