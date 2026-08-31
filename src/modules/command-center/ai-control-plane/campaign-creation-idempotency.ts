import type { ChatCampaignMeta, ChatPendingProposalPayload } from "./draft-assistant.types";

export type CampaignCreationResult =
  | { success: true; title: string; campaignId?: string }
  | { success: false; error: string; campaignId?: string };

export function resolveExistingCreatedCampaignId(
  meta: ChatCampaignMeta | null | undefined
): string | null {
  const id = meta?.createdCampaignId?.trim();
  return id || null;
}

export function attachCreatedCampaignId(
  pending: ChatPendingProposalPayload,
  campaignId: string | undefined
): ChatPendingProposalPayload {
  if (!campaignId?.trim() || !pending.campaignMeta) return pending;
  return {
    ...pending,
    campaignMeta: {
      ...pending.campaignMeta,
      createdCampaignId: campaignId.trim(),
    },
  };
}

export function pendingAfterPartialCampaignCreation(
  pending: ChatPendingProposalPayload,
  result: CampaignCreationResult
): ChatPendingProposalPayload {
  if (result.success || !result.campaignId) return pending;
  return attachCreatedCampaignId(pending, result.campaignId);
}
