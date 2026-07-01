import {
  formatMissionDraftForChat,
  generateMissionDraftFromPrompt,
  missionHintsFromInput,
  refineMissionDraftFromPrompt,
  type MissionAiDraft,
} from "@/lib/ai/mission-text-generator";
import { previewAction } from "../actions";
import type { ChatMissionMeta } from "./draft-assistant.types";
import type { PreviewedProposal } from "./preview-proposals";

export function buildMissionCreateInput(
  campaignId: string,
  draft: MissionAiDraft
): Record<string, unknown> {
  return {
    campaignId,
    grade: draft.grade,
    title: draft.title,
    committente: draft.committente,
    ubicazione: draft.ubicazione,
    paga: draft.paga,
    urgenza: draft.urgenza,
    description: draft.description,
    pointsReward: draft.pointsReward,
  };
}

function formatMissionPreviewPayload(draft: MissionAiDraft): Record<string, unknown> {
  return {
    grade: draft.grade,
    title: draft.title,
    committente: draft.committente,
    ubicazione: draft.ubicazione,
    paga: draft.paga,
    urgenza: draft.urgenza,
    description: draft.description,
    pointsReward: draft.pointsReward,
    contentMarkdown: formatMissionDraftForChat(draft),
    assistantPreview: formatMissionDraftForChat(draft),
  };
}

export async function enrichMissionProposal(
  campaignId: string,
  userMessage: string,
  proposal: PreviewedProposal,
  options?: {
    refine?: boolean;
    missionMeta?: ChatMissionMeta | null;
  }
): Promise<
  | {
      ok: true;
      proposal: PreviewedProposal;
      missionMeta: ChatMissionMeta;
      assistantMessage: string;
    }
  | { ok: false; error: string }
> {
  const hints = missionHintsFromInput(proposal.input);
  const userPrompt = options?.missionMeta?.userPrompt?.trim() || userMessage.trim();
  if (!userPrompt) {
    return { ok: false, error: "Descrivi la missione che vuoi creare." };
  }

  const chatMessages = options?.refine
    ? [...(options.missionMeta?.chatMessages ?? []), { role: "user" as const, content: userMessage.trim() }]
    : [{ role: "user" as const, content: userMessage.trim() }];

  const generated =
    options?.refine && options.missionMeta?.draft
      ? await refineMissionDraftFromPrompt(campaignId, userMessage.trim(), options.missionMeta.draft)
      : await generateMissionDraftFromPrompt(campaignId, userPrompt, hints);

  if (!generated.ok) {
    return { ok: false, error: generated.error };
  }

  const draft = generated.draft;
  const input = buildMissionCreateInput(campaignId, draft);
  const previewResult = await previewAction("mission.create", input, { actorType: "ai" });
  const preview_payload = previewResult.success
    ? {
        ...formatMissionPreviewPayload(draft),
        ...(previewResult.data as Record<string, unknown>),
      }
    : { error: previewResult.error, ...formatMissionPreviewPayload(draft) };

  const missionMeta: ChatMissionMeta = {
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
      action_name: "mission.create",
      input,
      rationale: proposal.rationale,
      preview_payload,
    },
    missionMeta,
    assistantMessage: generated.assistantMessage,
  };
}
