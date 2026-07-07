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

/** Actions whose input carries entity IDs resolved against a specific campaign. */
const ACTIONS_WITH_RESOLVED_CAMPAIGN_ENTITIES = new Set([
  "session.close",
  "session.update",
  "wiki.relationship.create",
  "wiki.entity.update",
  "wiki.entity.delete",
]);

function proposalHasResolvedCampaignEntityIds(
  actionName: string,
  input: Record<string, unknown>
): boolean {
  switch (actionName) {
    case "session.close":
    case "session.update":
      return typeof input.sessionId === "string" && input.sessionId.trim().length > 0;
    case "wiki.relationship.create":
      return (
        (typeof input.sourceId === "string" && input.sourceId.trim().length > 0) ||
        (typeof input.targetId === "string" && input.targetId.trim().length > 0) ||
        (typeof input.targetMapId === "string" && input.targetMapId.trim().length > 0)
      );
    case "wiki.entity.update":
    case "wiki.entity.delete":
      return typeof input.entityId === "string" && input.entityId.trim().length > 0;
    default:
      return false;
  }
}

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

  const originalCampaignId =
    typeof out.campaignId === "string" ? out.campaignId.trim() : "";

  // Entity IDs (session, wiki, relationship) were resolved against the proposal
  // campaign; overriding campaignId would close the wrong session or corrupt graph data.
  if (
    originalCampaignId &&
    originalCampaignId !== filterCampaignId &&
    ACTIONS_WITH_RESOLVED_CAMPAIGN_ENTITIES.has(actionName) &&
    proposalHasResolvedCampaignEntityIds(actionName, out)
  ) {
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
