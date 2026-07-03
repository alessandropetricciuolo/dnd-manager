import type { ChatPendingProposalPayload } from "./draft-assistant.types";
import { mergeCharacterInputFromSheet } from "./character-proposal-shared";

const CAMPAIGN_SCOPED_ACTIONS = new Set([
  "wiki.entity.create",
  "gm.note.create",
  "session.create",
  "workspace.task.create",
  "workspace.page.create",
  "mission.create",
  "mission.update",
  "wiki.entity.update",
  "wiki.entity.delete",
  "wiki.relationship.create",
  "character.create",
  "character.update",
  "campaign.aiContext.generate",
  "memory.reindex",
  "session.update",
  "session.close",
]);

export function normalizeProposalInput(
  actionName: string,
  input: Record<string, unknown>,
  campaignId: string | null
): Record<string, unknown> {
  const out = { ...input };
  const filterCampaignId = campaignId?.trim() || null;
  if (!filterCampaignId || !CAMPAIGN_SCOPED_ACTIONS.has(actionName)) {
    return out;
  }

  // Il filtro campagna attivo nel Command Center ha priorità sulla bozza.
  out.campaignId = filterCampaignId;
  return out;
}

/** Allinea input ed esecuzione: campagna attiva + scheda PDF da characterMeta. */
export function preparePendingInputForExecute(
  pending: ChatPendingProposalPayload,
  filterCampaignId: string | null
): Record<string, unknown> {
  let input = normalizeProposalInput(pending.action_name, { ...pending.input }, filterCampaignId);

  if (pending.action_name === "character.create" && pending.characterMeta?.generatedSheet) {
    const campaignId =
      (typeof input.campaignId === "string" && input.campaignId.trim()) ||
      filterCampaignId?.trim() ||
      (typeof pending.input.campaignId === "string" ? pending.input.campaignId.trim() : "");
    if (campaignId) {
      input = mergeCharacterInputFromSheet(input, campaignId, pending.characterMeta.generatedSheet);
    }
  }

  return input;
}
