import {
  buildArchitectDescriptionFromDraft,
  formatCampaignDraftForChat,
  generateCampaignDraftFromPrompt,
  refineCampaignDraftFromPrompt,
  type CampaignAiDraft,
} from "@/lib/ai/campaign-text-generator";
import { isLongCampaignType } from "@/lib/campaign-type";
import { previewAction } from "../actions";
import type { PreviewedProposal } from "./preview-proposals";
import type { ChatCampaignMeta } from "./draft-assistant.types";
import { resolveRefineUserMessage, type PreviewTextSelection } from "./preview-text-selection";
import { isPlaceholderCampaignTitle } from "@/lib/ai/contextual-names";

export function supportsCampaignArchitect(draft: Pick<CampaignAiDraft, "type">): boolean {
  return isLongCampaignType(draft.type);
}

export function buildCampaignCreateInput(draft: CampaignAiDraft): Record<string, unknown> {
  return {
    title: draft.title,
    description: draft.description,
    type: draft.type,
    isPublic: draft.isPublic,
    playerPrimer: draft.playerPrimer,
    isLongCampaign: isLongCampaignType(draft.type),
  };
}

function formatCampaignPreviewPayload(draft: CampaignAiDraft): Record<string, unknown> {
  return {
    title: draft.title,
    type: draft.type,
    description: draft.description,
    playerPrimer: draft.playerPrimer,
    isPublic: draft.isPublic,
    contentMarkdown: formatCampaignDraftForChat(draft),
    assistantPreview: formatCampaignDraftForChat(draft),
    architectDescription: buildArchitectDescriptionFromDraft(draft),
  };
}

export async function enrichCampaignProposal(
  userMessage: string,
  proposal: PreviewedProposal,
  options?: {
    refine?: boolean;
    campaignMeta?: ChatCampaignMeta | null;
    previewTextSelection?: PreviewTextSelection | null;
  }
): Promise<
  | {
      ok: true;
      proposal: PreviewedProposal;
      campaignMeta: ChatCampaignMeta;
      assistantMessage: string;
    }
  | { ok: false; error: string }
> {
  const userPrompt = options?.campaignMeta?.userPrompt?.trim() || userMessage.trim();
  if (!userPrompt) {
    return { ok: false, error: "Descrivi la campagna che vuoi creare." };
  }

  const refineMessage = options?.refine
    ? resolveRefineUserMessage(userMessage, options.previewTextSelection)
    : userMessage.trim();

  const chatMessages = options?.refine
    ? [...(options.campaignMeta?.chatMessages ?? []), { role: "user" as const, content: refineMessage }]
    : [{ role: "user" as const, content: userMessage.trim() }];

  const proposedTitle =
    typeof proposal.input.title === "string" ? proposal.input.title.trim() : "";

  const generated = options?.refine && options.campaignMeta?.draft
    ? await refineCampaignDraftFromPrompt(refineMessage, options.campaignMeta.draft)
    : await generateCampaignDraftFromPrompt(userPrompt, {
        titleIsPlaceholder: isPlaceholderCampaignTitle(proposedTitle),
      });

  if (!generated.ok) {
    return { ok: false, error: generated.error };
  }

  const draft = generated.draft;
  const input = buildCampaignCreateInput(draft);
  const previewResult = await previewAction("campaign.create", input, { actorType: "ai" });
  const preview_payload = previewResult.success
    ? {
        ...formatCampaignPreviewPayload(draft),
        ...(previewResult.data as Record<string, unknown>),
      }
    : { error: previewResult.error, ...formatCampaignPreviewPayload(draft) };

  const campaignMeta: ChatCampaignMeta = {
    userPrompt,
    draft,
    chatMessages: [
      ...chatMessages,
      { role: "assistant", content: generated.assistantMessage },
    ],
  };

  return {
    ok: true,
    proposal: {
      action_name: "campaign.create",
      input,
      rationale: proposal.rationale,
      preview_payload,
    },
    campaignMeta,
    assistantMessage: generated.assistantMessage,
  };
}
