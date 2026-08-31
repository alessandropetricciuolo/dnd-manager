import type { ChatPendingProposalPayload } from "./draft-assistant.types";

export function getCreatedCampaignId(pending: ChatPendingProposalPayload): string | null {
  const id = pending.campaignMeta?.createdCampaignId;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function setCreatedCampaignId(
  pending: ChatPendingProposalPayload,
  campaignId: string
): ChatPendingProposalPayload {
  if (!pending.campaignMeta) return pending;
  return {
    ...pending,
    campaignMeta: {
      ...pending.campaignMeta,
      createdCampaignId: campaignId.trim(),
    },
  };
}
